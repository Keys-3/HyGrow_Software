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
import { db } from '../../firebase';
import useAppStore from '../store/useAppStore';
import {
  INITIAL_PLANT_PROFILES,
  METHI_PROFILE,
  withMethiProfile,
  PlantProfile,
  PlantSensorReadingRecord,
  PlantGrowthPhotoRecord,
  PlantDailyLogRecord,
  generatePlantAnnualSensorReadings,
  generatePlantDailyLogs,
  filterPlantDailyLogs,
  generatePlantGrowthPhotos,
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

export function usePlantProfiles(options: { dailyAveragesMap?: Record<string, any> } = {}) {
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
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(profilesCacheKey);
        const cachedDeleted = await AsyncStorage.getItem(deletedPlantIdsKey);
        const curDeleted: Record<string, boolean> = cachedDeleted ? JSON.parse(cachedDeleted) : {};

        if (cached && active) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
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
    sensorSetId: sensorPlant.sensorSetId,
    zone: sensorPlant.zone,
    enabled: !loading && deletedDaysLoaded && user?.role !== 'customer' && !deletedDays[sensorPlant.id + '_' + getLocalDateString()] && !deletedDays[sensorPlant.id + '_all'],
  });

  // Active plant profile
  const activeProfile = useMemo(() => {
    return profiles.find((p) => p.id === activePlantId) || profiles[0] || INITIAL_PLANT_PROFILES[0];
  }, [profiles, activePlantId]);

  // 1-Year sensor readings generated specifically for activeProfile
  const activePlantAnnualReadings = useMemo(() => {
    return generatePlantAnnualSensorReadings(activeProfile);
  }, [activeProfile]);

  // Growth photos for activeProfile (curated milestones + any user custom uploads)
  const activePlantGrowthPhotos = useMemo(() => {
    const baseMilestones = activeProfile.id === sensorPlant.id ? [] : generatePlantGrowthPhotos(activeProfile);
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

  // Day-wise continuous sensor telemetry records (365 days) with photos attached to matching days
  const activePlantDailyLogs = useMemo(() => {
    return generatePlantDailyLogs(
      activeProfile,
      activePlantGrowthPhotos,
      365,
      new Date(),
      mergedDailyLogsMap
    ).filter((record) => !deletedDays[record.plantId + '_all'] && !deletedDays[record.id]);
  }, [activeProfile, activePlantGrowthPhotos, mergedDailyLogsMap, deletedDays]);

  // Active plant statistics
  const activePlantStats: PlantProfileSummaryStats = useMemo(() => {
    return calculatePlantProfileStats(activePlantAnnualReadings, activePlantGrowthPhotos.filter((entry) => entry.imageUrl), activeProfile);
  }, [activePlantAnnualReadings, activePlantGrowthPhotos, activeProfile]);

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

      return true;
    },
    [profiles, profilesCacheKey, user, sensorSets]
  );

  const deletePlantRecords = useCallback(async (plantId: string, dateString?: string) => {
    if (user?.id && db) {
      for (const name of ['plant_daily_logs', 'daily_sensor_logs', 'plant_logs']) {
        const snapshot = await getDocs(query(collection(db, name), where('userId', '==', user.id), where('plantId', '==', plantId)));
        const matches = snapshot.docs.filter((entry) => {
          const data = entry.data();
          return !dateString || (data.dateString || data.date || data.timestamp?.slice(0, 10)) === dateString;
        });
        for (let offset = 0; offset < matches.length; offset += 400) {
          const batch = writeBatch(db);
          matches.slice(offset, offset + 400).forEach((entry) => batch.delete(entry.ref));
          await batch.commit();
        }
      }
    }
    const key = plantId + '_' + (dateString || 'all');
    const deleted = { ...deletedDays, [key]: true };
    await AsyncStorage.setItem(deletedDaysKey, JSON.stringify(deleted));
    setDeletedDays(deleted);
    setCustomPhotos((previous) => {
      const updated = { ...previous, [plantId]: (previous[plantId] || []).filter((entry) => dateString && !entry.timestamp.startsWith(dateString)) };
      void AsyncStorage.setItem(PLANT_PHOTOS_CACHE_PREFIX + userId, JSON.stringify(updated));
      return updated;
    });
    return true;
  }, [user, userId, deletedDays, deletedDaysKey]);

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

      return true;
    },
    [profiles, profilesCacheKey, user]
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

      return true;
    },
    [deletedPlantIds, deletedPlantIdsKey, profiles, profilesCacheKey, user]
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
        const unDeleteKeys: string[] = [];

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
          if (data.plantId && data.dateString) {
            unDeleteKeys.push(`${data.plantId}_${data.dateString}`);
          }
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
                unDeleteKeys.push(compositeKey);
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

        if (unDeleteKeys.length > 0) {
          const updatedDeleted = { ...deletedDays };
          unDeleteKeys.forEach((k) => delete updatedDeleted[k]);
          if (targetPlantId) delete updatedDeleted[`${targetPlantId}_all`];
          setDeletedDays(updatedDeleted);
          await AsyncStorage.setItem(deletedDaysKey, JSON.stringify(updatedDeleted));
        }

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
      notes = '',
      readings,
      timestamp,
    }: {
      plantId: string;
      stage: string;
      imageUrl?: string;
      notes?: string;
      readings?: PlantLogReading;
      timestamp?: string;
    }): Promise<PlantGrowthPhotoRecord> => {
      const targetPlant = profiles.find((p) => p.id === plantId);
      if (!targetPlant) throw new Error('Select a plant before saving the log.');

      const restored = { ...deletedDays };
      delete restored[targetPlant.id + '_all'];
      delete restored[targetPlant.id + '_' + (timestamp || new Date().toISOString()).slice(0, 10)];
      setDeletedDays(restored);
      await AsyncStorage.setItem(deletedDaysKey, JSON.stringify(restored));
      const newPhoto: PlantGrowthPhotoRecord = {
        id: `photo-${Date.now()}`,
        plantId: targetPlant.id,
        plantName: `${targetPlant.name} (${targetPlant.zone})`,
        stage,
        timestamp: timestamp || new Date().toISOString(),
        imageUrl,
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

      // Commit the local entry before queuing the cloud write.
      const updatedPhotosMap = {
        ...customPhotos,
        [targetPlant.id]: [newPhoto, ...(customPhotos[targetPlant.id] || [])],
      };
      setCustomPhotos(updatedPhotosMap);
      await AsyncStorage.setItem(`${PLANT_PHOTOS_CACHE_PREFIX}${userId}`, JSON.stringify(updatedPhotosMap));

      // Firestore queues the write while the connection is unavailable.
      if (user?.id && db) {
        void addDoc(collection(db, 'plant_logs'), {
          userId: user.id,
          userEmail: user.email,
          plantId: targetPlant.id,
          plantName: targetPlant.name,
          stage,
          notes: notes.trim(),
          imageUrl,
          readings: newPhoto.readings,
          timestamp: newPhoto.timestamp,
          createdAt: serverTimestamp(),
        }).catch((error) => console.warn('[usePlantProfiles] Could not sync the plant log:', error));
      }

      return newPhoto;
    },
    [profiles, activeProfile, customPhotos, user, userId, deletedDays, deletedDaysKey]
  );

  // Seed all plant profiles and their 1-year sensor data into Firestore database
  const seedProfilesToDatabase = useCallback(async () => {
    setSyncing(true);
    try {
      if (user?.id && db) {
        const batch = writeBatch(db);

        // Seed plant_profiles collection
        for (const prof of profiles) {
          const profileDoc = doc(db, 'plant_profiles', user.id + '_' + prof.id);
          batch.set(
            profileDoc,
            {
              id: prof.id,
              userId: user.id,
              userEmail: user.email,
              name: prof.name,
              variety: prof.variety,
              zone: prof.zone,
              zoneId: prof.zoneId,
              category: prof.category,
              growingSystem: prof.growingSystem,
              sensorSetId: prof.sensorSetId,
              sensorIds: prof.sensorIds,
              plantingDate: prof.plantingDate,
              currentStage: prof.currentStage,
              harvestCycleDays: prof.harvestCycleDays,
              imageUrl: prof.imageUrl,
              notes: prof.notes,
              optimalThresholds: prof.optimalThresholds,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        // Seed 1-year sensor readings for active profile to plant_logs
        const annualLogs = activeProfile.id === sensorPlant.id ? [] : generatePlantAnnualSensorReadings(activeProfile);
        for (const reading of annualLogs.slice(0, 52)) {
          const readingDoc = doc(collection(db, 'plant_logs'));
          batch.set(readingDoc, {
            userId: user.id,
            userEmail: user.email,
            plantId: activeProfile.id,
            plantName: `${activeProfile.name} (${activeProfile.zone})`,
            stage: reading.stage,
            notes: `Week ${reading.weekNumber} (${reading.season}) continuous cultivation sensor telemetry for ${activeProfile.name}.`,
            imageUrl: activeProfile.imageUrl,
            readings: {
              temperature: reading.temperature,
              humidity: reading.humidity,
              ph: reading.ph,
              ec: reading.ec,
              tds: reading.tds,
              waterTemp: reading.waterTemp,
              waterLevel: reading.waterLevel,
              lightIntensity: reading.lightIntensity,
              vpd: reading.vpd,
            },
            timestamp: reading.timestamp,
            createdAt: serverTimestamp(),
          });
        }

        // Also seed activePlantDailyLogs (recent 30 days) to plant_daily_logs so firestore has real logs
        for (const dLog of activePlantDailyLogs.slice(0, 30)) {
          const dailyDoc = doc(db, 'plant_daily_logs', `${user.id}_${dLog.id}`);
          batch.set(
            dailyDoc,
            {
              userId: user.id,
              userEmail: user.email,
              plantId: dLog.plantId,
              cropName: dLog.cropName,
              variety: dLog.variety,
              dayNumber: dLog.dayNumber,
              dateString: dLog.dateString,
              formattedDate: dLog.formattedDate,
              timestamp: dLog.timestamp,
              season: dLog.season,
              stage: dLog.stage,
              sensorSetId: dLog.sensorSetId,
              zone: dLog.zone,
              zoneId: dLog.zoneId,
              growingSystem: dLog.growingSystem,
              source: dLog.source,
              loggingStatus: dLog.loggingStatus,
              isSimulated: dLog.isSimulated,
              sampleCount: dLog.sampleCount,
              sensorStatuses: dLog.sensorStatuses || null,
              missingMetrics: dLog.missingMetrics || [],
              readings: dLog.readings,
              minReadings: dLog.minReadings || dLog.readings,
              maxReadings: dLog.maxReadings || dLog.readings,
              isOptimal: dLog.isOptimal,
              photos: dLog.photos || [],
              notes: dLog.notes || '',
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        await batch.commit();
      }

      await AsyncStorage.setItem(profilesCacheKey, JSON.stringify(profiles));
      return { success: true, count: profiles.length };
    } catch (e: any) {
      console.warn('[usePlantProfiles] Seeding warning:', e);
      throw e;
    } finally {
      setSyncing(false);
    }
  }, [user, profiles, activeProfile, profilesCacheKey, sensorPlant.id, activePlantDailyLogs]);

  return {
    dailyLogger,
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
