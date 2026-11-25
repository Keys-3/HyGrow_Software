import { getPlantTargets, validateThresholdPolicy } from '../utils/plantThresholds';
import { cleanFirestorePayload } from '../utils/firestorePayload';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
  addDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { persistLogPhoto, deleteLogPhoto } from '../services/plantLogPhotos';
import { onAuthStateChanged } from 'firebase/auth';
import useAppStore from '../store/useAppStore';
import {
  INITIAL_PLANT_PROFILES,
  METHI_PROFILE,
  withMethiProfile,
  PlantProfile,
  PlantSensorReadingRecord,
  PlantGrowthPhotoRecord,
  PlantDailyLogRecord,
  buildRecordedPlantDailyLogs,
  filterPlantDailyLogs,
  calculatePlantProfileStats,
  PlantProfileSummaryStats,
} from '../utils/plantProfileData';
import { PlantLogReading } from '../utils/plantLogUtils';
import { DEFAULT_SENSOR_SETS, getAssignedSensorSetForPlant, SensorSet } from '../utils/sensorSets';
import { getLocalDateString } from '../utils/dailySensorAveraging';

const PROFILES_CACHE_KEY_PREFIX = 'hygrow_plant_profiles_cache:';
const PLANT_PHOTOS_CACHE_PREFIX = 'hygrow_plant_photos_cache:';
const PLANT_DAILY_LOGS_CACHE_PREFIX = 'hygrow_plant_daily_logs_cache:';
const DELETED_PLANT_IDS_KEY_PREFIX = 'hygrow_deleted_plant_ids:';

import { useDailySensorLogger } from './useDailySensorLogger';

export function usePlantProfiles(options: { dailyAveragesMap?: Record<string, any>; automaticLogging?: boolean } = {}) {
  const user = useAppStore((state) => state.user);
  const sensorSets = useAppStore((state) => state.sensorSets);
  const userId = user?.id || 'demo-farmer';
  const profilesCacheKey = `${PROFILES_CACHE_KEY_PREFIX}${userId}`;
  const plantDailyLogsCacheKey = `${PLANT_DAILY_LOGS_CACHE_PREFIX}${userId}`;
  const deletedPlantIdsKey = `${DELETED_PLANT_IDS_KEY_PREFIX}${userId}`;

  const [profiles, setProfiles] = useState<PlantProfile[]>(() => withMethiProfile(INITIAL_PLANT_PROFILES));
  const [activePlantId, setActivePlantId] = useState<string>(METHI_PROFILE.id);
  const [customPhotos, setCustomPhotos] = useState<Record<string, PlantGrowthPhotoRecord[]>>({});
  const [plantDailyLogsMap, setPlantDailyLogsMap] = useState<Record<string, PlantDailyLogRecord>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [deletedDaysLoaded, setDeletedDaysLoaded] = useState(false);
  const [deletedDays, setDeletedDays] = useState<Record<string, boolean>>({});
  const deletedDaysKey = 'hygrow_deleted_log_days:' + userId;

  const [deletedPlantIds, setDeletedPlantIds] = useState<Record<string, boolean>>({});
  const [deletedPlantIdsLoaded, setDeletedPlantIdsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(deletedPlantIdsKey)
      .then((val) => {
        if (active && val) {
          try {
            setDeletedPlantIds(JSON.parse(val));
          } catch (e) {
            console.warn('[usePlantProfiles] Error parsing deleted plant ids:', e);
          }
        }
      })
      .catch((err) => console.warn('[usePlantProfiles] Could not load deleted plant ids:', err))
      .finally(() => {
        if (active) setDeletedPlantIdsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [deletedPlantIdsKey]);

  useEffect(() => {
    let active = true;
    setDeletedDays({});
    setDeletedDaysLoaded(false);
    void AsyncStorage.getItem(deletedDaysKey).then((value) => {
      if (active && value) setDeletedDays(JSON.parse(value));
    }).catch((error) => console.warn('Could not load deleted log records:', error)).finally(() => {
      if (active) setDeletedDaysLoaded(true);
    });
    return () => { active = false; };
  }, [deletedDaysKey]);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Load cached profiles, custom photos, and plant daily logs on mount
  useEffect(() => {
    let active = true;
    setLoading(true);
    setCustomPhotos({});
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(profilesCacheKey);
        const cachedDeleted = await AsyncStorage.getItem(deletedPlantIdsKey);
        const curDeleted: Record<string, boolean> = cachedDeleted ? JSON.parse(cachedDeleted) : {};

        if (cached && active) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const nonDeleted = parsed.filter((p) => !curDeleted[p?.id]);
            setProfiles(
              withMethiProfile(
                nonDeleted.map((profile) => {
                  const defaultProfile = INITIAL_PLANT_PROFILES.find((item) => item.id === profile?.id);
                  return {
                    ...profile,
                    imageUrl: defaultProfile?.imageUrl || profile.imageUrl,
                    growingSystem: profile.growingSystem || defaultProfile?.growingSystem || 'Hydroponic System',
                    sensorSetId: profile.sensorSetId || defaultProfile?.sensorSetId || 'set-main',
                    zoneId: profile.zoneId || defaultProfile?.zoneId || 'zone-a',
                    sensorIds: profile.sensorIds || defaultProfile?.sensorIds,
                  };
                }),
                curDeleted
              )
            );
          }
        }

        const cachedPhotos = await AsyncStorage.getItem(`${PLANT_PHOTOS_CACHE_PREFIX}${userId}`);
        if (cachedPhotos && active) {
          setCustomPhotos(JSON.parse(cachedPhotos));
        }

        const cachedDailyLogs = await AsyncStorage.getItem(plantDailyLogsCacheKey);
        if (cachedDailyLogs && active) {
          const parsedLogs = JSON.parse(cachedDailyLogs);
          if (parsedLogs && typeof parsedLogs === 'object') {
            setPlantDailyLogsMap(parsedLogs);
          }
        }
      } catch (e) {
        console.warn('[usePlantProfiles] Cache read warning:', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [profilesCacheKey, plantDailyLogsCacheKey, deletedPlantIdsKey, userId]);

  useEffect(() => {
    if (loading || !user?.id || user.role === 'customer' || options.automaticLogging) return;
    let disposed = false;
    let stop = () => {};
    const currentUserId = user.id;
    const migrating = new Set<string>();
    const stopAuth = onAuthStateChanged(auth, (session) => {
      stop();
      if (session?.uid !== currentUserId || disposed) return;
      stop = onSnapshot(query(collection(db, 'plant_logs'), where('userId', '==', currentUserId)), (snapshot) => {
        if (disposed || useAppStore.getState().user?.id !== currentUserId) return;
        const photos: Record<string, PlantGrowthPhotoRecord[]> = {};
        snapshot.docs.forEach((entry) => {
          const data = entry.data();
          if (!data.plantId || data.isDailyAverageSummary) return;
          if (data.imageUrl && !/^https:\/\//.test(data.imageUrl) && !data.imageUrl.startsWith('hygrow-photo:') && !migrating.has(entry.id)) {
            migrating.add(entry.id);
            void persistLogPhoto(currentUserId, entry.id, data.imageUrl).then(async (imageUrl) => {
              if (!disposed && auth.currentUser?.uid === currentUserId) await setDoc(entry.ref, { imageUrl }, { merge: true });
            }).catch(() => { migrating.delete(entry.id); });
          }
          (photos[data.plantId] ||= []).push({ id: entry.id, plantId: data.plantId,
            plantName: data.plantName || data.plantId, stage: data.stage || 'Vegetative',
            timestamp: data.timestamp, thresholdContext: data.thresholdContext,
              periodAverages: data.periodAverages,
              compliancePercent: data.compliancePercent, imageUrl: data.imageUrl || '', notes: data.notes || '', readings: data.readings || {} });
        });
        setCustomPhotos(photos);
        void AsyncStorage.setItem(PLANT_PHOTOS_CACHE_PREFIX + currentUserId, JSON.stringify(photos)).catch((error) => console.warn('Could not cache photo references:', error));
      }, (error) => console.warn('Could not restore saved plant photos:', error));
    });
    return () => { disposed = true; stop(); stopAuth(); };
  }, [loading, user?.id, user?.role, options.automaticLogging]);

  // Firestore sync for plant_profiles
  useEffect(() => {
    if (!user || user.role === 'customer' || !db) return;

    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'plant_profiles'), where('userId', '==', user.id));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const remoteList: PlantProfile[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const profId = data.id || docSnap.id.replace(user.id + '_', '');
            if (deletedPlantIds[profId]) return;
            const defaultProfile = INITIAL_PLANT_PROFILES.find((item) => item.id === profId);
            remoteList.push({
              id: profId,
              name: data.name,
              variety: data.variety || '',
              zone: data.zone || '',
              zoneId: data.zoneId || defaultProfile?.zoneId || 'zone-a',
              category: data.category || 'Produce',
              growingSystem: data.growingSystem || defaultProfile?.growingSystem || 'NFT (Nutrient Film Technique)',
              sensorSetId: data.sensorSetId || defaultProfile?.sensorSetId || 'set-main',
              sensorIds: data.sensorIds || defaultProfile?.sensorIds,
              plantingDate: data.plantingDate || new Date().toISOString(),
              currentStage: data.currentStage || 'Vegetative',
              harvestCycleDays: data.harvestCycleDays || 45,
              imageUrl: defaultProfile?.imageUrl || data.imageUrl || '',
              notes: data.notes || '',
              thresholdPolicy: data.thresholdPolicy,
              optimalThresholds: data.optimalThresholds || {
                temperature: { min: 20, max: 25 },
                humidity: { min: 55, max: 70 },
                ph: { min: 5.8, max: 6.3 },
                ec: { min: 1.3, max: 1.8 },
                waterTemp: { min: 19, max: 22 },
              },
            });
          });

          if (remoteList.length > 0) {
            const normalizedProfiles = withMethiProfile(remoteList, deletedPlantIds);
            setProfiles(normalizedProfiles);
            void AsyncStorage.setItem(profilesCacheKey, JSON.stringify(normalizedProfiles));
          }
        },
        (err) => {
          console.warn('[usePlantProfiles] Firestore profiles error, using local:', err);
        }
      );
    } catch (e) {
      console.warn('[usePlantProfiles] Listener init warning:', e);
    }

    return () => unsubscribe();
  }, [user, profilesCacheKey, deletedPlantIds]);

  // Firestore sync for plant_daily_logs
  useEffect(() => {
    if (!user || user.role === 'customer' || !db) return;

    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'plant_daily_logs'), where('userId', '==', user.id));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const remoteRecords: Record<string, PlantDailyLogRecord> = {};
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const recKey = docSnap.id;
            remoteRecords[recKey] = {
              id: docSnap.id,
              plantId: data.plantId,
              cropName: data.cropName,
              variety: data.variety,
              dayNumber: data.dayNumber || 1,
              dateString: data.dateString,
              formattedDate: data.formattedDate,
              timestamp: data.timestamp || new Date().toISOString(),
              season: data.season || 'Winter',
              stage: data.stage || 'Vegetative',
              sensorSetId: data.sensorSetId,
              thresholdContext: data.thresholdContext,
              zone: data.zone,
              zoneId: data.zoneId,
              growingSystem: data.growingSystem,
              source: data.source || 'cloud',
              loggingStatus: data.loggingStatus || 'complete',
              isSimulated: Boolean(data.isSimulated),
              readings: data.readings,
              minReadings: data.minReadings,
              maxReadings: data.maxReadings,
              isOptimal: Boolean(data.isOptimal),
              photos: data.photos || [],
              notes: data.notes,
              isAutomatedDailyAvg: true,
              sampleCount: data.sampleCount || 1,
              sensorStatuses: data.sensorStatuses,
              missingMetrics: data.missingMetrics,
              isFirestoreSynced: true,
              lastFetchedAt: data.lastFetchedAt,
            };
          });

          if (Object.keys(remoteRecords).length > 0) {
            setPlantDailyLogsMap((prev) => {
              const updated = { ...prev, ...remoteRecords };
              void AsyncStorage.setItem(plantDailyLogsCacheKey, JSON.stringify(updated));
              return updated;
            });
          }
        },
        (err) => {
          console.warn('[usePlantProfiles] plant_daily_logs query warning:', err);
        }
      );
    } catch (e) {
      console.warn('[usePlantProfiles] plant_daily_logs listener warning:', e);
    }

    return () => unsubscribe();
  }, [user, plantDailyLogsCacheKey]);

  const sensorPlant =
    profiles.find((profile) => profile.id === activePlantId) ||
    profiles.find(
      (profile) =>
        profile.id === 'plant-methi' ||
        profile.name?.trim().toLowerCase().includes('methi') ||
        profile.name?.trim().toLowerCase().includes('fenugreek') ||
        profile.variety?.trim().toLowerCase().includes('fenugreek')
    ) ||
    profiles[0] ||
    METHI_PROFILE;
  const dailyLogger = useDailySensorLogger({
    plantId: sensorPlant.id,
    plantName: sensorPlant.name,
    plantCategory: sensorPlant.category,
    thresholdPolicy: sensorPlant.thresholdPolicy,
    sensorSetId: sensorPlant.sensorSetId,
    zone: sensorPlant.zone,
    enabled: options.automaticLogging === true && !loading && deletedDaysLoaded && user?.role !== 'customer' && !deletedDays[sensorPlant.id + '_' + getLocalDateString()] && !deletedDays[sensorPlant.id + '_all'],
  });

  // Active plant profile
  const activeProfile = useMemo(() => {
    return profiles.find((p) => p.id === activePlantId) || profiles[0] || INITIAL_PLANT_PROFILES[0];
  }, [profiles, activePlantId]);

  // Growth photos for activeProfile (curated milestones + any user custom uploads)
  const activePlantGrowthPhotos = useMemo(() => {
    const baseMilestones: PlantGrowthPhotoRecord[] = [];
    const added = customPhotos[activeProfile.id] || [];
    return [...added, ...baseMilestones].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [activeProfile, customPhotos, sensorPlant.id]);

  // Merged daily logs: combines options.dailyAveragesMap and plantDailyLogsMap
  const mergedDailyLogsMap = useMemo(() => {
    return {
      ...(options.dailyAveragesMap || {}),
      ...plantDailyLogsMap,
      ...dailyLogger.dailyRecordsMap,
    };
  }, [options.dailyAveragesMap, plantDailyLogsMap, dailyLogger.dailyRecordsMap]);

  // Saved daily readings and manual entries, with deletion markers applied.
  const activePlantDailyLogs = useMemo(() => {
    return buildRecordedPlantDailyLogs(activeProfile, activePlantGrowthPhotos, mergedDailyLogsMap, deletedDays);
  }, [activeProfile, activePlantGrowthPhotos, mergedDailyLogsMap, deletedDays]);

  const activePlantAnnualReadings = useMemo(() => activePlantDailyLogs.map((record, index) => ({
    ...record.readings,
    id: record.id,
    plantId: record.plantId,
    timestamp: record.timestamp,
    season: record.season,
    stage: record.stage,
    weekNumber: index + 1,
    isOptimal: record.isOptimal,
  } as PlantSensorReadingRecord)), [activePlantDailyLogs]);

  // Active plant statistics
  const activePlantStats: PlantProfileSummaryStats = useMemo(() => {
    return calculatePlantProfileStats(activePlantAnnualReadings, activePlantGrowthPhotos.filter((entry) => entry.imageUrl), activeProfile);
  }, [activePlantAnnualReadings, activePlantGrowthPhotos, activeProfile]);

  const syncPlantTargets = useCallback(async (profile: PlantProfile) => {
    if (profile.thresholdPolicy) validateThresholdPolicy(profile.thresholdPolicy);
    const store = useAppStore.getState();
    const set = store.sensorSets.find((item) => item.id === profile.sensorSetId);
    if (!set) return;
    const targets = getPlantTargets(profile);
    await store.saveSensorSet({ ...set, crop: profile.name, plantCategory: profile.category, activePlantId: profile.id,
      thresholdPolicy: profile.thresholdPolicy || { mode: 'automatic', dayStartHour: 6, nightStartHour: 18, timeZone: 'Asia/Kolkata' }, thresholds: targets.day });
  }, []);

  // 1. Assign or change sensor set on a plant profile (Preserves historical sensor assignments)
  const assignSensorSetToPlant = useCallback(
    async (plantId: string, newSensorSetId: string): Promise<boolean> => {
      const targetSet = sensorSets.find((s) => s.id === newSensorSetId);
      if (!targetSet) {
        console.warn(`[usePlantProfiles] Sensor set ${newSensorSetId} not found.`);
        return false;
      }

      const updatedProfiles = profiles.map((p) => {
        if (p.id === plantId) {
          return {
            ...p,
            sensorSetId: targetSet.id,
            zone: targetSet.zone,
            zoneId: targetSet.zoneId || 'zone-a',
            growingSystem: targetSet.growingSystem || p.growingSystem,
            sensorIds: targetSet.sensorIds || p.sensorIds,
          };
        }
        return p;
      });

      setProfiles(updatedProfiles);
      await AsyncStorage.setItem(profilesCacheKey, JSON.stringify(updatedProfiles));

      const updatedProfile = updatedProfiles.find((profile) => profile.id === plantId);
      if (user?.id && db && updatedProfile) {
        const profileDoc = doc(db, 'plant_profiles', user.id + '_' + plantId);
        const fields = Object.fromEntries(Object.entries(updatedProfile).filter(([, value]) => value !== undefined));
        void setDoc(profileDoc, {
          ...fields,
          userId: user.id,
          userEmail: user.email,
          updatedAt: serverTimestamp(),
        }, { merge: true }).catch((error) => console.warn('[usePlantProfiles] Could not sync the sensor set:', error));
      }

      if (updatedProfile) await syncPlantTargets(updatedProfile);
      return true;
    },
    [profiles, profilesCacheKey, user, sensorSets, syncPlantTargets]
  );

  const deletePlantRecords = useCallback(async (plantId: string, dateString?: string) => {
    const key = plantId + '_' + (dateString || 'all');
    const deleted = { ...deletedDays, [key]: true };
    await AsyncStorage.setItem(deletedDaysKey, JSON.stringify(deleted));
    setDeletedDays(deleted);
    if (user?.id && db) {
      for (const name of ['plant_daily_logs', 'daily_sensor_logs', 'plant_logs']) {
        const snapshot = await getDocs(query(collection(db, name), where('userId', '==', user.id), where('plantId', '==', plantId)));
        const matches = snapshot.docs.filter((entry) => {
          const data = entry.data();
          const timestamp = typeof data.timestamp === 'string' ? data.timestamp : data.timestamp?.toDate?.().toISOString();
          return !dateString || (data.dateString || data.date || timestamp?.slice(0, 10)) === dateString;
        });
        await Promise.all(matches.map((entry) => entry.data().imageUrl ? deleteLogPhoto(entry.data().imageUrl) : Promise.resolve()));
        for (let offset = 0; offset < matches.length; offset += 400) {
          const batch = writeBatch(db);
          matches.slice(offset, offset + 400).forEach((entry) => batch.delete(entry.ref));
          await batch.commit();
        }
      }
    }

    setPlantDailyLogsMap((previous) => {
      const updated = Object.fromEntries(Object.entries(previous).filter(([, record]) =>
        record.plantId !== plantId || (dateString && record.dateString !== dateString)));
      void AsyncStorage.setItem(plantDailyLogsCacheKey, JSON.stringify(updated));
      return updated;
    });
    setCustomPhotos((previous) => {
      const updated = { ...previous, [plantId]: (previous[plantId] || []).filter((entry) => dateString && !entry.timestamp.startsWith(dateString)) };
      void AsyncStorage.setItem(PLANT_PHOTOS_CACHE_PREFIX + userId, JSON.stringify(updated));
      return updated;
    });
    return true;
  }, [user, userId, deletedDays, deletedDaysKey, plantDailyLogsCacheKey]);

  const deleteDailyLog = useCallback((plantId: string, dateString: string, _logId?: string) =>
    deletePlantRecords(plantId, dateString), [deletePlantRecords]);
  const deleteEntirePlantHistory = useCallback((plantId: string) =>
    deletePlantRecords(plantId), [deletePlantRecords]);

  // 2. Delete plant profile entirely (from profiles list, Firestore, daily logs, annual data, and photos)
  const deletePlantProfileEntirely = useCallback(
    async (plantId: string): Promise<boolean> => {
      const updatedDeleted = { ...deletedPlantIds, [plantId]: true };
      setDeletedPlantIds(updatedDeleted);
      await AsyncStorage.setItem(deletedPlantIdsKey, JSON.stringify(updatedDeleted));

      await deletePlantRecords(plantId);

      if (user?.id && db) {
        try {
          await deleteDoc(doc(db, 'plant_profiles', `${user.id}_${plantId}`));
        } catch (e) {
          console.warn('[usePlantProfiles] Error deleting plant_profiles doc:', e);
        }
        try {
          await deleteDoc(doc(db, 'plant_profiles', plantId));
        } catch (e) {
          // ignore
        }
      }

      const remainingProfiles = profiles.filter((p) => p.id !== plantId);
      setProfiles(remainingProfiles);
      await AsyncStorage.setItem(profilesCacheKey, JSON.stringify(remainingProfiles));

      if (activePlantId === plantId && remainingProfiles.length > 0) {
        setActivePlantId(remainingProfiles[0].id);
      }

      setCustomPhotos((previous) => {
        const updated = { ...previous };
        delete updated[plantId];
        void AsyncStorage.setItem(`${PLANT_PHOTOS_CACHE_PREFIX}${userId}`, JSON.stringify(updated));
        return updated;
      });

      setPlantDailyLogsMap((previous) => {
        const updated = { ...previous };
        Object.keys(updated).forEach((key) => {
          if (key.startsWith(`${plantId}_`) || updated[key].plantId === plantId) {
            delete updated[key];
          }
        });
        void AsyncStorage.setItem(plantDailyLogsCacheKey, JSON.stringify(updated));
        return updated;
      });

      return true;
    },
    [deletedPlantIds, deletedPlantIdsKey, deletePlantRecords, user, profiles, profilesCacheKey, activePlantId, userId, plantDailyLogsCacheKey]
  );

  // 3. Update plant profile details (name, variety, zone, thresholds, notes, etc.)
  const updatePlantProfile = useCallback(
    async (plantId: string, updates: Partial<PlantProfile>): Promise<boolean> => {
      const updatedProfiles = profiles.map((p) => {
        if (p.id === plantId) {
          return {
            ...p,
            ...updates,
            optimalThresholds: updates.optimalThresholds
              ? { ...p.optimalThresholds, ...updates.optimalThresholds }
              : p.optimalThresholds,
          };
        }
        return p;
      });

      setProfiles(updatedProfiles);
      await AsyncStorage.setItem(profilesCacheKey, JSON.stringify(updatedProfiles));

      const updatedProfile = updatedProfiles.find((p) => p.id === plantId);
      if (user?.id && db && updatedProfile) {
        const profileDoc = doc(db, 'plant_profiles', `${user.id}_${plantId}`);
        const fields = Object.fromEntries(
          Object.entries(updatedProfile).filter(([, value]) => value !== undefined)
        );
        await setDoc(
          profileDoc,
          {
            ...fields,
            userId: user.id,
            userEmail: user.email,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      if (updatedProfile) await syncPlantTargets(updatedProfile);
      return true;
    },
    [profiles, profilesCacheKey, user, syncPlantTargets]
  );

  // 4. Add a new plant profile (e.g. newly planted crop)
  const addNewPlantProfile = useCallback(
    async (newProfile: PlantProfile): Promise<boolean> => {
      if (deletedPlantIds[newProfile.id]) {
        const updatedDeleted = { ...deletedPlantIds };
        delete updatedDeleted[newProfile.id];
        setDeletedPlantIds(updatedDeleted);
        await AsyncStorage.setItem(deletedPlantIdsKey, JSON.stringify(updatedDeleted));
      }

      const updatedProfiles = [newProfile, ...profiles.filter((p) => p.id !== newProfile.id)];
      setProfiles(updatedProfiles);
      await AsyncStorage.setItem(profilesCacheKey, JSON.stringify(updatedProfiles));

      if (user?.id && db) {
        const profileDoc = doc(db, 'plant_profiles', `${user.id}_${newProfile.id}`);
        const fields = Object.fromEntries(
          Object.entries(newProfile).filter(([, value]) => value !== undefined)
        );
        await setDoc(
          profileDoc,
          {
            ...fields,
            userId: user.id,
            userEmail: user.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      await syncPlantTargets(newProfile);
      return true;
    },
    [deletedPlantIds, deletedPlantIdsKey, profiles, profilesCacheKey, user, syncPlantTargets]
  );

  // 5. Fetch / Restore historical logs from Firestore database
  const fetchLogsFromDatabase = useCallback(
    async (targetPlantId?: string) => {
      if (!db || !user?.id) {
        return { success: false, count: 0, message: 'Database offline or user not logged in.' };
      }

      setSyncing(true);
      try {
        let qLogs = query(collection(db, 'plant_daily_logs'), where('userId', '==', user.id));
        if (targetPlantId) {
          qLogs = query(
            collection(db, 'plant_daily_logs'),
            where('userId', '==', user.id),
            where('plantId', '==', targetPlantId)
          );
        }
        const snap = await getDocs(qLogs);
        const restoredMap: Record<string, PlantDailyLogRecord> = {};


        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const recKey = docSnap.id;
          restoredMap[recKey] = {
            id: docSnap.id,
            plantId: data.plantId,
            cropName: data.cropName,
            variety: data.variety,
            dayNumber: data.dayNumber || 1,
            dateString: data.dateString,
            formattedDate: data.formattedDate,
            timestamp: data.timestamp || new Date().toISOString(),
            season: data.season || 'Winter',
            stage: data.stage || 'Vegetative',
            sensorSetId: data.sensorSetId,
              thresholdContext: data.thresholdContext,
            zone: data.zone,
            zoneId: data.zoneId,
            growingSystem: data.growingSystem,
            source: data.source || 'cloud',
            loggingStatus: data.loggingStatus || 'complete',
            isSimulated: Boolean(data.isSimulated),
            readings: data.readings,
            minReadings: data.minReadings,
            maxReadings: data.maxReadings,
            isOptimal: Boolean(data.isOptimal),
            photos: data.photos || [],
            notes: data.notes,
            isAutomatedDailyAvg: true,
            sampleCount: data.sampleCount || 1,
            sensorStatuses: data.sensorStatuses,
            missingMetrics: data.missingMetrics,
            isFirestoreSynced: true,
            lastFetchedAt: new Date().toISOString(),
          };
        });

        try {
          let qDaily = query(collection(db, 'daily_sensor_logs'), where('userId', '==', user.id));
          if (targetPlantId) {
            qDaily = query(
              collection(db, 'daily_sensor_logs'),
              where('userId', '==', user.id),
              where('plantId', '==', targetPlantId)
            );
          }
          const snapDaily = await getDocs(qDaily);
          snapDaily.forEach((docSnap) => {
            const data = docSnap.data();
            const pId = data.plantId || targetPlantId;
            const dStr = data.dateString || data.date;
            if (pId && dStr) {
              const compositeKey = `${pId}_${dStr}`;
              if (!restoredMap[compositeKey]) {
                restoredMap[compositeKey] = {
                  id: docSnap.id,
                  plantId: pId,
                  cropName: data.cropName || data.plantName,
                  variety: data.variety || '',
                  dayNumber: data.dayNumber || 1,
                  dateString: dStr,
                  formattedDate: data.formattedDate || dStr,
                  timestamp: data.timestamp || new Date().toISOString(),
                  season: data.season || 'Winter',
                  stage: data.stage || 'Vegetative',
                  sensorSetId: data.sensorSetId,
              thresholdContext: data.thresholdContext,
                  zone: data.zone,
                  zoneId: data.zoneId,
                  growingSystem: data.growingSystem,
                  source: data.source || 'cloud',
                  loggingStatus: data.loggingStatus || 'complete',
                  isSimulated: Boolean(data.isSimulated),
                  readings: data.readings,
                  minReadings: data.minReadings,
                  maxReadings: data.maxReadings,
                  isOptimal: Boolean(data.isOptimal),
                  photos: data.photos || [],
                  notes: data.notes,
                  isAutomatedDailyAvg: true,
                  sampleCount: data.sampleCount || 1,
                  sensorStatuses: data.sensorStatuses,
                  missingMetrics: data.missingMetrics,
                  isFirestoreSynced: true,
                  lastFetchedAt: new Date().toISOString(),
                };
              }
            }
          });
        } catch (e) {
          console.warn('[usePlantProfiles] daily_sensor_logs query warning:', e);
        }

        let qPlantLogs = query(collection(db, 'plant_logs'), where('userId', '==', user.id));
        if (targetPlantId) {
          qPlantLogs = query(
            collection(db, 'plant_logs'),
            where('userId', '==', user.id),
            where('plantId', '==', targetPlantId)
          );
        }
        const snapPlantLogs = await getDocs(qPlantLogs);
        const restoredPhotos: Record<string, PlantGrowthPhotoRecord[]> = { ...customPhotos };

        snapPlantLogs.forEach((docSnap) => {
          const data = docSnap.data();
          const pid = data.plantId;
          if (!pid) return;
          if (!restoredPhotos[pid]) restoredPhotos[pid] = [];
          const alreadyHas = restoredPhotos[pid].some(
            (p) => p.id === docSnap.id || (p.timestamp === data.timestamp && p.imageUrl === data.imageUrl)
          );
          if (!alreadyHas) {
            restoredPhotos[pid].push({
              id: docSnap.id,
              plantId: pid,
              plantName: data.plantName || pid,
              stage: data.stage || 'Vegetative',
              timestamp: data.timestamp || new Date().toISOString(),
              imageUrl: data.imageUrl || '',
              notes: data.notes || '',
              readings: data.readings,
            });
          }
        });

        const mergedMap = { ...plantDailyLogsMap, ...restoredMap };
        setPlantDailyLogsMap(mergedMap);
        await AsyncStorage.setItem(plantDailyLogsCacheKey, JSON.stringify(mergedMap));

        setCustomPhotos(restoredPhotos);
        await AsyncStorage.setItem(`${PLANT_PHOTOS_CACHE_PREFIX}${userId}`, JSON.stringify(restoredPhotos));

        return {
          success: true,
          count: Object.keys(restoredMap).length + snapPlantLogs.size,
          message: `Restored ${Object.keys(restoredMap).length} daily sensor logs and ${snapPlantLogs.size} growth photos from Firestore.`,
        };
      } catch (err: any) {
        console.warn('[usePlantProfiles] fetchLogsFromDatabase error:', err);
        throw err;
      } finally {
        setSyncing(false);
      }
    },
    [user, plantDailyLogsMap, customPhotos, deletedDays, deletedDaysKey, plantDailyLogsCacheKey, userId]
  );

  const addGrowthPhotoToPlant = useCallback(
    async ({
      plantId,
      stage,
      imageUrl = '',
      imageBase64,
      imageMimeType,
      notes = '',
      readings,
      timestamp,
    }: {
      plantId: string;
      stage: string;
      imageUrl?: string;
      imageBase64?: string;
      imageMimeType?: string;
      notes?: string;
      readings?: PlantLogReading;
      timestamp?: string;
    }): Promise<PlantGrowthPhotoRecord> => {
      const targetPlant = profiles.find((p) => p.id === plantId);
      if (!targetPlant) throw new Error('Select a plant before saving the log.');
      if (!user?.id || auth.currentUser?.uid !== user.id) throw new Error('Sign in before saving a plant log.');
      const logRef = doc(collection(db, 'plant_logs'));
      const savedImageUrl = await persistLogPhoto(user.id, logRef.id, imageUrl, imageBase64, imageMimeType);

      const newPhoto: PlantGrowthPhotoRecord = {
        id: logRef.id,
        thresholdContext: getPlantTargets(targetPlant, new Date(timestamp || Date.now())),
        plantId: targetPlant.id,
        plantName: `${targetPlant.name} (${targetPlant.zone})`,
        stage,
        timestamp: timestamp || new Date().toISOString(),
        imageUrl: savedImageUrl,
        notes: notes.trim(),
        readings: {
          temperature: readings?.temperature ?? null,
          humidity: readings?.humidity ?? null,
          ph: readings?.ph ?? null,
          ec: readings?.ec ?? null,
          tds: readings?.tds ?? null,
          waterTemp: readings?.waterTemp ?? null,
          waterLevel: readings?.waterLevel ?? null,
          lightIntensity: readings?.lightIntensity ?? null,
          vpd: readings?.vpd ?? null,
        },
      };

      // Report success only after the permanent photo and log are acknowledged.
      await setDoc(logRef, { ...newPhoto, userId: user.id, userEmail: user.email || '', createdAt: serverTimestamp() });

      const restored = { ...deletedDays };
      delete restored[targetPlant.id + '_all'];
      delete restored[targetPlant.id + '_' + (timestamp || new Date().toISOString()).slice(0, 10)];
      setDeletedDays(restored);
      await AsyncStorage.setItem(deletedDaysKey, JSON.stringify(restored));


      // Merge with the latest snapshot rather than replacing concurrently saved photos.
      setCustomPhotos((previous) => {
        const updated = { ...previous, [targetPlant.id]: [newPhoto, ...(previous[targetPlant.id] || []).filter((entry) => entry.id !== newPhoto.id)] };
        void AsyncStorage.setItem(PLANT_PHOTOS_CACHE_PREFIX + userId, JSON.stringify(updated))
          .catch((error) => console.warn('Photo is saved in the cloud; local cache could not be updated:', error));
        return updated;
      });

      return newPhoto;
    },
    [profiles, activeProfile, customPhotos, user, userId, deletedDays, deletedDaysKey]
  );

  // Sync plant profiles and recorded daily measurements to Firestore.
  const seedProfilesToDatabase = useCallback(async () => {
    if (!user?.id || auth.currentUser?.uid !== user.id) throw new Error('Sign in before syncing plant records.');
    setSyncing(true);
    try {
      const writes: { reference: ReturnType<typeof doc>; data: any }[] = [];
      const ownProfiles = profiles.filter((profile) => !deletedPlantIds[profile.id]);
      for (const profile of ownProfiles) {
        writes.push({ reference: doc(db, 'plant_profiles', user.id + '_' + profile.id), data: cleanFirestorePayload({
          ...profile, userId: user.id, userEmail: user.email || '', updatedAt: serverTimestamp(),
        }) });
        const records = buildRecordedPlantDailyLogs(profile, customPhotos[profile.id] || [], mergedDailyLogsMap, deletedDays);
        for (const record of records) writes.push({ reference: doc(db, 'plant_daily_logs', user.id + '_' + record.id), data: cleanFirestorePayload({
          ...record, userId: user.id, userEmail: user.email || '', updatedAt: serverTimestamp(),
        }) });
      }
      for (let offset = 0; offset < writes.length; offset += 400) {
        const batch = writeBatch(db);
        writes.slice(offset, offset + 400).forEach(({ reference, data }) => batch.set(reference, data, { merge: true }));
        await batch.commit();
      }
      await AsyncStorage.setItem(profilesCacheKey, JSON.stringify(ownProfiles));
      return { success: true, count: ownProfiles.length, records: writes.length - ownProfiles.length };
    } finally { setSyncing(false); }
  }, [user?.id, user?.email, profiles, customPhotos, mergedDailyLogsMap, deletedDays, deletedPlantIds, profilesCacheKey]);

  const saveTodayLog = useCallback(async () => {
    const record = await dailyLogger.syncTodayToFirestore();
    const updated = { ...deletedDays };
    if (updated[record.plantId + '_all']) {
      for (const previous of Object.values(mergedDailyLogsMap)) {
        if (previous.plantId === record.plantId && previous.dateString !== record.dateString) {
          updated[record.plantId + '_' + previous.dateString] = true;
        }
      }
    }
    delete updated[record.plantId + '_all'];
    delete updated[record.plantId + '_' + record.dateString];
    await AsyncStorage.setItem(deletedDaysKey, JSON.stringify(updated));
    setDeletedDays(updated);
    return record;
  }, [dailyLogger.syncTodayToFirestore, deletedDays, deletedDaysKey, mergedDailyLogsMap]);

  return {
    dailyLogger: { ...dailyLogger, syncTodayToFirestore: saveTodayLog },
    sensorPlant,
    sensorSets,
    profiles,
    activePlantId,
    activeProfile,
    setActivePlantId,
    activePlantAnnualReadings,
    activePlantDailyLogs,
    activePlantGrowthPhotos,
    activePlantStats,
    addGrowthPhotoToPlant,
    assignSensorSetToPlant,
    deleteDailyLog,
    deleteEntirePlantHistory,
    deletePlantProfileEntirely,
    updatePlantProfile,
    addNewPlantProfile,
    fetchLogsFromDatabase,
    seedProfilesToDatabase,
    loading,
    syncing,
  };
}
