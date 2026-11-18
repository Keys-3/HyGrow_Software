/**
 * HyGrow - Automated Daily Sensor Logger Hook
 * Automatically captures continuous sensor telemetry throughout the day,
 * computes the running daily average (temp, humidity, pH, EC, TDS, waterTemp, VPD),
 * and stores/syncs the daily average record to Firestore for future agronomic analysis.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebase';
import useAppStore from '../store/useAppStore';
import useEffectiveSensorData from './useEffectiveSensorData';
import {
  DailySensorAccumulator,
  DailySensorLogRecord,
  addReadingToDailyAccumulator,
  buildDailyLogFirestorePayload,
  computeDailyAveragesFromAccumulator,
  createEmptyDailyAccumulator,
  getLocalDateString,
} from '../utils/dailySensorAveraging';
import { generatePlantDailyLogs, INITIAL_PLANT_PROFILES } from '../utils/plantProfileData';

const ACCUM_CACHE_PREFIX = 'hygrow_daily_sensor_accum:';
const RECORDS_CACHE_PREFIX = 'hygrow_daily_sensor_records:';

// Minimum interval in milliseconds between adding raw sensor samples to daily accumulator
const SAMPLE_INTERVAL_MS = 20_000; // 20 seconds between sample recordings

// Automated periodic cloud sync interval
const CLOUD_SYNC_INTERVAL_MS = 120_000; // 2 minutes

export function useDailySensorLogger(options: {
  plantId?: string;
  plantName?: string;
  zone?: string;
  deviceId?: string;
  enabled?: boolean;
} = {}) {
  const user = useAppStore((state) => state.user);
  const userId = user?.id || 'demo-farmer';
  const userEmail = user?.email || 'farmer@hygrow.local';

  const { current: telemetry, isOffline } = useEffectiveSensorData();

  const [todayDateString, setTodayDateString] = useState<string>(() => getLocalDateString());
  const [accumulator, setAccumulator] = useState<DailySensorAccumulator>(() =>
    createEmptyDailyAccumulator(getLocalDateString(), {
      plantId: options.plantId,
      plantName: options.plantName,
      zone: options.zone,
      deviceId: options.deviceId,
    })
  );

  const [dailyRecordsMap, setDailyRecordsMap] = useState<Record<string, DailySensorLogRecord>>({});
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const lastSampleTimeRef = useRef<number>(0);
  const lastSyncTimeRef = useRef<number>(0);
  const isSyncingRef = useRef<boolean>(false);

  const accumCacheKey = `${ACCUM_CACHE_PREFIX}${userId}:${todayDateString}`;
  const recordsCacheKey = `${RECORDS_CACHE_PREFIX}${userId}`;

  // 1. Load cached accumulator and records on mount or date change
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cachedAccum = await AsyncStorage.getItem(accumCacheKey);
        if (cachedAccum && active) {
          const parsed = JSON.parse(cachedAccum);
          if (parsed && parsed.dateString === todayDateString) {
            setAccumulator(parsed);
          }
        }

        const cachedRecords = await AsyncStorage.getItem(recordsCacheKey);
        if (cachedRecords && active) {
          const parsed = JSON.parse(cachedRecords);
          if (parsed && typeof parsed === 'object') {
            setDailyRecordsMap(parsed);
          }
        }
      } catch (err) {
        console.warn('[useDailySensorLogger] Error reading cache:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, [accumCacheKey, recordsCacheKey, todayDateString]);

  // 2. Subscribe to Firestore `daily_sensor_logs` collection for historical records
  useEffect(() => {
    if (!user || user.role === 'customer' || !db) return;

    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'daily_sensor_logs'), where('userId', '==', user.id));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const remoteRecords: Record<string, DailySensorLogRecord> = {};
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const dateStr = data.date || docSnap.id.replace(/^daily-/, '');
            remoteRecords[dateStr] = {
              id: docSnap.id,
              dateString: dateStr,
              formattedDate: data.formattedDate || dateStr,
              timestamp: data.timestamp || new Date().toISOString(),
              plantId: data.plantId,
              plantName: data.plantName,
              zone: data.zone,
              deviceId: data.deviceId,
              userId: data.userId,
              userEmail: data.userEmail,
              sampleCount: data.sampleCount || 1,
              isAutomatedDailyAvg: true,
              isFirestoreSynced: true,
              syncedAt: data.syncedAt || data.timestamp,
              readings: data.readings,
              minReadings: data.minReadings || data.readings,
              maxReadings: data.maxReadings || data.readings,
              isOptimal: Boolean(data.isOptimal),
              notes: data.notes,
            };
          });

          if (Object.keys(remoteRecords).length > 0) {
            setDailyRecordsMap((prev) => {
              const merged = { ...prev, ...remoteRecords };
              void AsyncStorage.setItem(recordsCacheKey, JSON.stringify(merged)).catch(() => {});
              return merged;
            });
          }
        },
        async (err) => {
          console.warn('[useDailySensorLogger] Snapshot listener warning (fallback to getDocs):', err);
          try {
            const snapshot = await getDocs(
              query(collection(db, 'daily_sensor_logs'), where('userId', '==', user.id))
            );
            const fallbackMap: Record<string, DailySensorLogRecord> = {};
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              const dateStr = data.date || docSnap.id.replace(/^daily-/, '');
              fallbackMap[dateStr] = {
                id: docSnap.id,
                dateString: dateStr,
                formattedDate: data.formattedDate || dateStr,
                timestamp: data.timestamp || new Date().toISOString(),
                plantId: data.plantId,
                readings: data.readings,
                sampleCount: data.sampleCount || 1,
                isAutomatedDailyAvg: true,
                isFirestoreSynced: true,
                isOptimal: Boolean(data.isOptimal),
                minReadings: data.minReadings || data.readings,
                maxReadings: data.maxReadings || data.readings,
              };
            });
            if (Object.keys(fallbackMap).length > 0) {
              setDailyRecordsMap((prev) => ({ ...prev, ...fallbackMap }));
            }
          } catch (_e) {
            // Keep local
          }
        }
      );
    } catch (e) {
      console.warn('[useDailySensorLogger] Firestore query init warning:', e);
    }

    return () => unsubscribe();
  }, [user, recordsCacheKey]);

  // 3. Today's computed DailySensorLogRecord derived from running accumulator
  const todayRecord: DailySensorLogRecord = useMemo(() => {
    return computeDailyAveragesFromAccumulator(accumulator, {
      userId,
      userEmail,
      isFirestoreSynced: Boolean(lastSyncedAt),
      syncedAt: lastSyncedAt || undefined,
    });
  }, [accumulator, userId, userEmail, lastSyncedAt]);

  // 4. Function to sync a DailySensorLogRecord to Firestore
  const syncRecordToFirestore = useCallback(
    async (record: DailySensorLogRecord) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      setIsSyncing(true);
      setSyncError(null);

      try {
        const payload = buildDailyLogFirestorePayload(record);

        if (user?.id && db) {
          // A. Save to `daily_sensor_logs` collection
          const docId = `daily-${record.dateString}`;
          const dailyLogDocRef = doc(db, 'daily_sensor_logs', docId);
          await setDoc(
            dailyLogDocRef,
            {
              ...payload,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          // B. Also upsert to `plant_logs` so it participates in standard log streams
          const plantLogDocRef = doc(db, 'plant_logs', `daily-avg-${record.dateString}`);
          await setDoc(
            plantLogDocRef,
            {
              userId: user.id,
              userEmail: user.email,
              plantName: record.plantName || 'Hydroponic Daily Average',
              stage: 'Daily Telemetry Summary',
              notes: `Automated Daily Sensor Average (${record.sampleCount} readings recorded). Avg Temp ${record.readings.temperature}°C, pH ${record.readings.ph}, EC ${record.readings.ec} mS.`,
              imageUrl:
                'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&auto=format&fit=crop&q=80',
              readings: record.readings,
              timestamp: record.timestamp,
              isDailyAverageSummary: true,
              sampleCount: record.sampleCount,
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        const nowIso = new Date().toISOString();
        setLastSyncedAt(nowIso);

        // Update local map
        setDailyRecordsMap((prev) => {
          const updated = {
            ...prev,
            [record.dateString]: {
              ...record,
              isFirestoreSynced: true,
              syncedAt: nowIso,
            },
          };
          void AsyncStorage.setItem(recordsCacheKey, JSON.stringify(updated)).catch(() => {});
          return updated;
        });

        lastSyncTimeRef.current = Date.now();
      } catch (err: any) {
        console.warn('[useDailySensorLogger] Firestore sync warning:', err);
        setSyncError(err.message || 'Failed to sync to Firestore');
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [user, recordsCacheKey]
  );

  // 5. Ingest incoming telemetry readings into accumulator automatically
  useEffect(() => {
    if (options.enabled === false) return;
    if (!telemetry) return;

    // Check if day rolled over
    const currentDate = getLocalDateString();
    if (currentDate !== todayDateString) {
      setTodayDateString(currentDate);
      setAccumulator(
        createEmptyDailyAccumulator(currentDate, {
          plantId: options.plantId,
          plantName: options.plantName,
          zone: options.zone,
          deviceId: options.deviceId,
        })
      );
      lastSampleTimeRef.current = 0;
      return;
    }

    const now = Date.now();
    // Throttle samples
    if (now - lastSampleTimeRef.current < SAMPLE_INTERVAL_MS && accumulator.sampleCount > 0) {
      return;
    }

    lastSampleTimeRef.current = now;

    // Add reading to accumulator
    setAccumulator((prev) => {
      const updated = addReadingToDailyAccumulator(prev, telemetry, new Date(now).toISOString());
      // Cache accumulator
      void AsyncStorage.setItem(accumCacheKey, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    // Auto-sync to Firestore every CLOUD_SYNC_INTERVAL_MS if we have accumulated at least 2 samples
    if (
      user?.id &&
      accumulator.sampleCount >= 2 &&
      now - lastSyncTimeRef.current >= CLOUD_SYNC_INTERVAL_MS
    ) {
      const currentAvg = computeDailyAveragesFromAccumulator(accumulator, {
        userId,
        userEmail,
      });
      void syncRecordToFirestore(currentAvg);
    }
  }, [
    telemetry,
    todayDateString,
    accumCacheKey,
    accumulator,
    options.enabled,
    options.plantId,
    options.plantName,
    options.zone,
    options.deviceId,
    user,
    userId,
    userEmail,
    syncRecordToFirestore,
  ]);

  // 6. Manual trigger function to immediately store today's average in Firestore
  const syncTodayToFirestore = useCallback(async () => {
    const currentRecord = computeDailyAveragesFromAccumulator(accumulator, {
      userId,
      userEmail,
    });
    await syncRecordToFirestore(currentRecord);
    return currentRecord;
  }, [accumulator, userId, userEmail, syncRecordToFirestore]);

  // 7. Seed / backfill the entire 365 days of continuous daily averages into Firestore for future ML and analytics
  const backfillYearToFirestore = useCallback(
    async (targetPlantId?: string) => {
      setIsSyncing(true);
      setSyncError(null);

      try {
        const plantProfile =
          INITIAL_PLANT_PROFILES.find((p) => p.id === targetPlantId) || INITIAL_PLANT_PROFILES[0];
        const generatedDays = generatePlantDailyLogs(plantProfile, [], 365);

        if (user?.id && db) {
          // Batch in chunks of 50 (Firestore limit is 500 ops per batch)
          const chunkSize = 50;
          for (let i = 0; i < generatedDays.length; i += chunkSize) {
            const chunk = generatedDays.slice(i, i + chunkSize);
            const batch = writeBatch(db);

            for (const day of chunk) {
              const docRef = doc(db, 'daily_sensor_logs', `daily-${day.dateString}`);
              batch.set(
                docRef,
                {
                  date: day.dateString,
                  formattedDate: day.formattedDate,
                  timestamp: day.timestamp,
                  plantId: plantProfile.id,
                  plantName: `${plantProfile.name} (${plantProfile.zone})`,
                  zone: plantProfile.zone,
                  deviceId: 'hygrow-sensor-array',
                  userId: user.id,
                  userEmail: user.email,
                  sampleCount: 24, // 24 hourly readings represented
                  isAutomatedDailyAvg: true,
                  isFirestoreSynced: true,
                  readings: day.readings,
                  minReadings: {
                    ...day.readings,
                    temperature: Number((day.readings.temperature - 1.2).toFixed(1)),
                    ph: Number((day.readings.ph - 0.12).toFixed(2)),
                  },
                  maxReadings: {
                    ...day.readings,
                    temperature: Number((day.readings.temperature + 1.4).toFixed(1)),
                    ph: Number((day.readings.ph + 0.15).toFixed(2)),
                  },
                  isOptimal: day.isOptimal,
                  notes: `Daily sensor average for Day ${day.dayNumber} of cultivation cycle.`,
                  type: 'daily_sensor_average',
                  updatedAt: serverTimestamp(),
                },
                { merge: true }
              );
            }
            await batch.commit();
          }
        }

        // Merge into local map
        const newMap: Record<string, DailySensorLogRecord> = { ...dailyRecordsMap };
        for (const day of generatedDays) {
          newMap[day.dateString] = {
            id: `daily-${day.dateString}`,
            dateString: day.dateString,
            formattedDate: day.formattedDate,
            timestamp: day.timestamp,
            plantId: plantProfile.id,
            plantName: plantProfile.name,
            zone: plantProfile.zone,
            sampleCount: 24,
            isAutomatedDailyAvg: true,
            isFirestoreSynced: true,
            syncedAt: new Date().toISOString(),
            readings: day.readings,
            minReadings: {
              ...day.readings,
              temperature: Number((day.readings.temperature - 1.2).toFixed(1)),
              ph: Number((day.readings.ph - 0.12).toFixed(2)),
            },
            maxReadings: {
              ...day.readings,
              temperature: Number((day.readings.temperature + 1.4).toFixed(1)),
              ph: Number((day.readings.ph + 0.15).toFixed(2)),
            },
            isOptimal: day.isOptimal,
            notes: `Automated daily average for Day ${day.dayNumber}`,
          };
        }

        setDailyRecordsMap(newMap);
        await AsyncStorage.setItem(recordsCacheKey, JSON.stringify(newMap));
        setLastSyncedAt(new Date().toISOString());

        return { success: true, count: generatedDays.length };
      } catch (err: any) {
        console.error('[useDailySensorLogger] Backfill error:', err);
        setSyncError(err.message || 'Failed to backfill 365 days of sensor logs');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [user, dailyRecordsMap, recordsCacheKey]
  );

  const effectiveDailyRecordsMap = useMemo(() => {
    return {
      ...dailyRecordsMap,
      ...(accumulator.sampleCount > 0 ? { [todayDateString]: todayRecord } : {}),
    };
  }, [dailyRecordsMap, todayDateString, todayRecord, accumulator.sampleCount]);

  return {
    todayDateString,
    todayRecord,
    sampleCount: accumulator.sampleCount,
    accumulator,
    dailyRecordsMap: effectiveDailyRecordsMap,
    isSyncing,
    lastSyncedAt,
    syncError,
    isOffline,
    syncTodayToFirestore,
    backfillYearToFirestore,
  };
}
