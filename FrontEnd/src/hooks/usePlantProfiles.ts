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
} from 'firebase/firestore';
import { db } from '../../firebase';
import useAppStore from '../store/useAppStore';
import {
  INITIAL_PLANT_PROFILES,
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

const PROFILES_CACHE_KEY_PREFIX = 'hygrow_plant_profiles_cache:';
const PLANT_PHOTOS_CACHE_PREFIX = 'hygrow_plant_photos_cache:';

export function usePlantProfiles(options: { dailyAveragesMap?: Record<string, any> } = {}) {
  const user = useAppStore((state) => state.user);
  const userId = user?.id || 'demo-farmer';
  const profilesCacheKey = `${PROFILES_CACHE_KEY_PREFIX}${userId}`;

  const [profiles, setProfiles] = useState<PlantProfile[]>(INITIAL_PLANT_PROFILES);
  const [activePlantId, setActivePlantId] = useState<string>('plant-butterhead-lettuce');
  const [customPhotos, setCustomPhotos] = useState<Record<string, PlantGrowthPhotoRecord[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Load cached profiles and custom photos on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(profilesCacheKey);
        if (cached && active) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProfiles(parsed.map((profile) => {
              const defaultProfile = INITIAL_PLANT_PROFILES.find((item) => item.id === profile?.id);
              return defaultProfile ? { ...profile, imageUrl: defaultProfile.imageUrl } : profile;
            }));
          }
        }
        const cachedPhotos = await AsyncStorage.getItem(`${PLANT_PHOTOS_CACHE_PREFIX}${userId}`);
        if (cachedPhotos && active) {
          setCustomPhotos(JSON.parse(cachedPhotos));
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
  }, [profilesCacheKey, userId]);

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
              category: data.category || 'Produce',
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
            setProfiles(remoteList);
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
    const baseMilestones = generatePlantGrowthPhotos(activeProfile);
    const added = customPhotos[activeProfile.id] || [];
    return [...added, ...baseMilestones].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [activeProfile, customPhotos]);

  // Day-wise continuous sensor telemetry records (365 days) with photos attached to matching days
  const activePlantDailyLogs = useMemo(() => {
    return generatePlantDailyLogs(
      activeProfile,
      activePlantGrowthPhotos,
      365,
      new Date(),
      options.dailyAveragesMap || {}
    );
  }, [activeProfile, activePlantGrowthPhotos, options.dailyAveragesMap]);

  // Active plant statistics
  const activePlantStats: PlantProfileSummaryStats = useMemo(() => {
    return calculatePlantProfileStats(activePlantAnnualReadings, activePlantGrowthPhotos, activeProfile);
  }, [activePlantAnnualReadings, activePlantGrowthPhotos, activeProfile]);

  // Add growth photo directly to active plant profile
  const addGrowthPhotoToPlant = useCallback(
    async ({
      plantId,
      stage,
      imageUrl,
      notes = '',
      readings,
      timestamp,
    }: {
      plantId: string;
      stage: string;
      imageUrl: string;
      notes?: string;
      readings: PlantLogReading;
      timestamp?: string;
    }): Promise<PlantGrowthPhotoRecord> => {
      const targetPlant = profiles.find((p) => p.id === plantId) || activeProfile;

      const newPhoto: PlantGrowthPhotoRecord = {
        id: `photo-${Date.now()}`,
        plantId: targetPlant.id,
        plantName: `${targetPlant.name} (${targetPlant.zone})`,
        stage,
        timestamp: timestamp || new Date().toISOString(),
        imageUrl,
        notes: notes.trim(),
        readings: {
          temperature: readings.temperature ?? 24.0,
          humidity: readings.humidity ?? 64,
          ph: readings.ph ?? 6.05,
          ec: readings.ec ?? 1.5,
          tds: readings.tds ?? Math.round((readings.ec ?? 1.5) * 500),
          waterTemp: readings.waterTemp ?? 20.5,
          waterLevel: readings.waterLevel ?? 85,
          lightIntensity: readings.lightIntensity ?? 14500,
          vpd: readings.vpd ?? 1.05,
        },
      };

      // 1. If signed in, store to Firestore collection 'plant_logs'
      if (user?.id && db) {
        try {
          await addDoc(collection(db, 'plant_logs'), {
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
          });
        } catch (fsErr) {
          console.warn('[usePlantProfiles] Firestore photo save warning:', fsErr);
        }
      }

      // 2. Persist locally
      const updatedPhotosMap = {
        ...customPhotos,
        [targetPlant.id]: [newPhoto, ...(customPhotos[targetPlant.id] || [])],
      };
      setCustomPhotos(updatedPhotosMap);
      await AsyncStorage.setItem(`${PLANT_PHOTOS_CACHE_PREFIX}${userId}`, JSON.stringify(updatedPhotosMap));

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
              category: prof.category,
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
        const annualLogs = generatePlantAnnualSensorReadings(activeProfile);
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
  }, [user, profiles, activeProfile, profilesCacheKey]);

  return {
    profiles,
    activePlantId,
    activeProfile,
    setActivePlantId,
    activePlantAnnualReadings,
    activePlantDailyLogs,
    activePlantGrowthPhotos,
    activePlantStats,
    addGrowthPhotoToPlant,
    seedProfilesToDatabase,
    loading,
    syncing,
  };
}
