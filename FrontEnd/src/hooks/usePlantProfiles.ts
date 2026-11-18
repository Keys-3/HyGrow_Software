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

import { useDailySensorLogger } from './useDailySensorLogger';

function withMethiProfile(profiles: PlantProfile[]) {
  return profiles.some((profile) => profile.name?.trim().toLowerCase() === 'methi')
    ? profiles
    : [METHI_PROFILE, ...profiles];
}

export function usePlantProfiles(options: { dailyAveragesMap?: Record<string, any> } = {}) {
  const user = useAppStore((state) => state.user);
  const sensorSets = useAppStore((state) => state.sensorSets);
  const userId = user?.id || 'demo-farmer';
  const profilesCacheKey = `${PROFILES_CACHE_KEY_PREFIX}${userId}`;
  const plantDailyLogsCacheKey = `${PLANT_DAILY_LOGS_CACHE_PREFIX}${userId}`;

  const [profiles, setProfiles] = useState<PlantProfile[]>(() => withMethiProfile(INITIAL_PLANT_PROFILES));
  const [activePlantId, setActivePlantId] = useState<string>(METHI_PROFILE.id);
  const [customPhotos, setCustomPhotos] = useState<Record<string, PlantGrowthPhotoRecord[]>>({});
  const [plantDailyLogsMap, setPlantDailyLogsMap] = useState<Record<string, PlantDailyLogRecord>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Load cached profiles, custom photos, and plant daily logs on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(profilesCacheKey);
        if (cached && active) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProfiles(
              withMethiProfile(parsed.map((profile) => {
                const defaultProfile = INITIAL_PLANT_PROFILES.find((item) => item.id === profile?.id);
                return {
                  ...profile,
                  imageUrl: defaultProfile?.imageUrl || profile.imageUrl,
                  growingSystem: profile.growingSystem || defaultProfile?.growingSystem || 'Hydroponic System',
                  sensorSetId: profile.sensorSetId || defaultProfile?.sensorSetId || 'set-main',
                  zoneId: profile.zoneId || defaultProfile?.zoneId || 'zone-a',
                  sensorIds: profile.sensorIds || defaultProfile?.sensorIds,
                };
              }))
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
  }, [profilesCacheKey, plantDailyLogsCacheKey, userId]);

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
            const defaultProfile = INITIAL_PLANT_PROFILES.find((item) => item.id === docSnap.id);
            remoteList.push({
              id: docSnap.id,
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
            setProfiles(withMethiProfile(remoteList));
            void AsyncStorage.setItem(profilesCacheKey, JSON.stringify(remoteList));
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
  }, [user, profilesCacheKey]);

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

  const sensorPlant = profiles.find((profile) => profile.name?.trim().toLowerCase() === 'methi') || METHI_PROFILE;
  const dailyLogger = useDailySensorLogger({
    plantId: sensorPlant.id,
    plantName: sensorPlant.name,
    sensorSetId: sensorPlant.sensorSetId,
    zone: sensorPlant.zone,
    enabled: !loading && user?.role !== 'customer',
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
    );
  }, [activeProfile, activePlantGrowthPhotos, mergedDailyLogsMap]);

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
        const profileDoc = doc(db, 'plant_profiles', plantId);
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

  // 2. Fetch sensor data & create today's log for a specific plant
  const fetchAndLogPlantSensors = useCallback(
    async (
      plantId: string,
      overrideOptions?: {
        rawReading?: any;
        source?: 'hardware' | 'simulated' | 'cloud';
      }
    ): Promise<PlantDailyLogRecord> => {
      const targetPlant = profiles.find((p) => p.id === plantId) || activeProfile;
      const assignedSet = getAssignedSensorSetForPlant(targetPlant.id, targetPlant.sensorSetId);

      const todayStr = getLocalDateString();
      const docId = `${targetPlant.id}_${todayStr}`;

      const raw = overrideOptions?.rawReading || null;
      const isSimulated = overrideOptions?.source === 'simulated' || (!raw && assignedSet.status !== 'active');
      const effectiveSource = isSimulated ? 'simulated' : (overrideOptions?.source || 'hardware');

      // Calibration adjustments or direct reading
      const baseTemp = raw?.temperature ?? 23.5;
      const baseHum = raw?.humidity ?? 63;
      const basePh = raw?.ph ?? 6.05;
      const baseEc = raw?.ec ?? 1.55;
      const baseWater = raw?.waterTemp ?? 20.8;
      const baseVpd = raw?.vpd ?? 1.08;

      const newRecord: PlantDailyLogRecord = {
        id: docId,
        plantId: targetPlant.id,
        cropName: targetPlant.name,
        variety: targetPlant.variety,
        dayNumber: 365,
        dateString: todayStr,
        formattedDate: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        timestamp: new Date().toISOString(),
        season: 'Winter',
        stage: targetPlant.currentStage,
        // Historical Immutability: permanently bound to currently assigned set
        sensorSetId: assignedSet.id,
        zone: assignedSet.zone,
        zoneId: assignedSet.zoneId || targetPlant.zoneId,
        growingSystem: assignedSet.growingSystem || targetPlant.growingSystem,
        source: effectiveSource,
        loggingStatus: 'complete',
        isSimulated,
        sampleCount: raw ? 1 : 24,
        readings: {
          temperature: Number(baseTemp.toFixed(1)),
          humidity: Math.round(baseHum),
          ph: Number(basePh.toFixed(2)),
          ec: Number(baseEc.toFixed(2)),
          tds: Math.round(baseEc * 500),
          waterTemp: Number(baseWater.toFixed(1)),
          waterLevel: 88,
          lightIntensity: 15200,
          vpd: Number(baseVpd.toFixed(2)),
        },
        minReadings: {
          temperature: Number((baseTemp - 0.8).toFixed(1)),
          humidity: Math.round(baseHum - 4),
          ph: Number((basePh - 0.1).toFixed(2)),
          ec: Number((baseEc - 0.1).toFixed(2)),
          tds: Math.round((baseEc - 0.1) * 500),
          waterTemp: Number((baseWater - 0.5).toFixed(1)),
          waterLevel: 85,
          lightIntensity: 14000,
          vpd: Number((baseVpd - 0.1).toFixed(2)),
        },
        maxReadings: {
          temperature: Number((baseTemp + 1.2).toFixed(1)),
          humidity: Math.round(baseHum + 5),
          ph: Number((basePh + 0.15).toFixed(2)),
          ec: Number((baseEc + 0.12).toFixed(2)),
          tds: Math.round((baseEc + 0.12) * 500),
          waterTemp: Number((baseWater + 0.7).toFixed(1)),
          waterLevel: 90,
          lightIntensity: 16500,
          vpd: Number((baseVpd + 0.15).toFixed(2)),
        },
        sensorStatuses: {
          temperature: isSimulated ? 'simulated' : 'online',
          humidity: isSimulated ? 'simulated' : 'online',
          ph: isSimulated ? 'simulated' : 'online',
          ec: isSimulated ? 'simulated' : 'online',
          waterTemp: isSimulated ? 'simulated' : 'online',
        },
        missingMetrics: [],
        isOptimal: true,
        photos: [],
        notes: `Fetched via manual action for ${targetPlant.name} from sensor set ${assignedSet.name}.`,
        isAutomatedDailyAvg: true,
        isFirestoreSynced: Boolean(user?.id && db),
        lastFetchedAt: new Date().toISOString(),
      };

      // 1. Persist to Firestore plant_daily_logs collection
      if (user?.id && db) {
        try {
          const docRef = doc(db, 'plant_daily_logs', docId);
          await setDoc(
            docRef,
            {
              ...newRecord,
              userId: user.id,
              userEmail: user.email,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (fsErr) {
          console.warn('[usePlantProfiles] Firestore plant_daily_logs save error:', fsErr);
        }
      }

      // 2. Persist locally to plantDailyLogsMap
      setPlantDailyLogsMap((prev) => {
        const updated = {
          ...prev,
          [docId]: newRecord,
          [todayStr]: newRecord,
        };
        void AsyncStorage.setItem(plantDailyLogsCacheKey, JSON.stringify(updated));
        return updated;
      });

      return newRecord;
    },
    [profiles, activeProfile, user, plantDailyLogsCacheKey]
  );

  // 3. Bulk fetch: process all sensor sets and update logs for all active plants
  const fetchAllSensorSetsAndLog = useCallback(async (): Promise<{ count: number; dateString: string }> => {
    const todayStr = getLocalDateString();
    let updatedCount = 0;

    for (const profile of profiles) {
      await fetchAndLogPlantSensors(profile.id);
      updatedCount++;
    }

    return { count: updatedCount, dateString: todayStr };
  }, [profiles, fetchAndLogPlantSensors]);

  // 4. Delete an individual daily log record
  const deleteDailyLog = useCallback(
    async (plantId: string, dateString: string, logId?: string): Promise<boolean> => {
      const docId = logId || `${plantId}_${dateString}`;

      // Firestore deletion
      if (user?.id && db) {
        try {
          await deleteDoc(doc(db, 'plant_daily_logs', docId));
        } catch (err) {
          console.warn('[usePlantProfiles] Error deleting plant_daily_logs doc:', err);
        }
      }

      // Local state and cache deletion
      setPlantDailyLogsMap((prev) => {
        const updated = { ...prev };
        delete updated[docId];
        delete updated[dateString];
        void AsyncStorage.setItem(plantDailyLogsCacheKey, JSON.stringify(updated));
        return updated;
      });

      return true;
    },
    [user, plantDailyLogsCacheKey]
  );

  // 5. Delete entire crop history for a plant
  const deleteEntirePlantHistory = useCallback(
    async (plantId: string): Promise<boolean> => {
      // 1. Delete from Firestore
      if (user?.id && db) {
        try {
          const qPlantDaily = query(
            collection(db, 'plant_daily_logs'),
            where('userId', '==', user.id),
            where('plantId', '==', plantId)
          );
          const snapDaily = await getDocs(qPlantDaily);
          const batch = writeBatch(db);
          snapDaily.forEach((d) => batch.delete(d.ref));

          const qPlantLogs = query(
            collection(db, 'plant_logs'),
            where('userId', '==', user.id),
            where('plantId', '==', plantId)
          );
          const snapLogs = await getDocs(qPlantLogs);
          snapLogs.forEach((d) => batch.delete(d.ref));

          await batch.commit();
        } catch (err) {
          console.warn('[usePlantProfiles] Firestore crop history deletion error:', err);
        }
      }

      // 2. Clear local photos and daily logs for this plant
      setCustomPhotos((prev) => {
        const updated = { ...prev };
        delete updated[plantId];
        void AsyncStorage.setItem(`${PLANT_PHOTOS_CACHE_PREFIX}${userId}`, JSON.stringify(updated));
        return updated;
      });

      setPlantDailyLogsMap((prev) => {
        const updated: Record<string, PlantDailyLogRecord> = {};
        Object.entries(prev).forEach(([key, record]) => {
          if (record.plantId !== plantId && !key.startsWith(plantId)) {
            updated[key] = record;
          }
        });
        void AsyncStorage.setItem(plantDailyLogsCacheKey, JSON.stringify(updated));
        return updated;
      });

      return true;
    },
    [user, userId, plantDailyLogsCacheKey]
  );

  // Add growth photo directly to active plant profile
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
    [profiles, activeProfile, customPhotos, user, userId]
  );

  // Seed all plant profiles and their 1-year sensor data into Firestore database
  const seedProfilesToDatabase = useCallback(async () => {
    setSyncing(true);
    try {
      if (user?.id && db) {
        const batch = writeBatch(db);

        // Seed plant_profiles collection
        for (const prof of profiles) {
          const profileDoc = doc(db, 'plant_profiles', prof.id);
          batch.set(
            profileDoc,
            {
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
  }, [user, profiles, activeProfile, profilesCacheKey, sensorPlant.id]);

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
    fetchAndLogPlantSensors,
    fetchAllSensorSetsAndLog,
    deleteDailyLog,
    deleteEntirePlantHistory,
    seedProfilesToDatabase,
    loading,
    syncing,
  };
}
