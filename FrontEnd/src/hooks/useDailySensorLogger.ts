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
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebase';
import useAppStore from '../store/useAppStore';
import useSensorData from './useSensorData';
import {
  DailySensorAccumulator,
  DailySensorLogRecord,
  addReadingToDailyAccumulator,
  buildDailyLogFirestorePayload,
  computeDailyAveragesFromAccumulator,
  createEmptyDailyAccumulator,
  getLocalDateString,
} from '../utils/dailySensorAveraging';

const ACCUM_CACHE_PREFIX = 'hygrow_daily_sensor_accum:v2:';
const RECORDS_CACHE_PREFIX = 'hygrow_daily_sensor_records:';

// Minimum interval in milliseconds between adding raw sensor samples to daily accumulator
const SAMPLE_INTERVAL_MS = 20_000; // 20 seconds between sample recordings

// Automated periodic cloud sync interval
const CLOUD_SYNC_INTERVAL_MS = 120_000; // 2 minutes

const recordKey = (plantId: string, date: string) => `${plantId}_${date}`;

export function useDailySensorLogger(options: {
  plantId?: string;
  plantName?: string;
  zone?: string;
  sensorSetId?: string;
  enabled?: boolean;
} = {}) {
  const user = useAppStore((state) => state.user);
  const thresholds = useAppStore((state) => state.sensorSets.find((set) => set.id === options.sensorSetId)?.thresholds);
  const userId = user?.id || 'demo-farmer';
  const userEmail = user?.email || 'farmer@hygrow.local';

  const { current: telemetry, stale, deviceId, cloudAvailable, localAvailable, error } = useSensorData(options.sensorSetId);
  const isOffline = stale || !telemetry || telemetry.deviceId !== deviceId;

  const [todayDateString, setTodayDateString] = useState<string>(() => getLocalDateString());
  const [accumulator, setAccumulator] = useState<DailySensorAccumulator>(() =>
    createEmptyDailyAccumulator(getLocalDateString(), {
      plantId: options.plantId,
      plantName: options.plantName,
      zone: options.zone,
      deviceId,
    })
  );

  const [dailyRecordsMap, setDailyRecordsMap] = useState<Record<string, DailySensorLogRecord>>({});
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [loadedAccumulatorKey, setLoadedAccumulatorKey] = useState<string | null>(null);
  const lastSampleIdentity = useRef<string | null>(null);
  const lastSampleTimeRef = useRef<number>(0);
  const lastSyncTimeRef = useRef<number>(0);
  const isSyncingRef = useRef<boolean>(false);

  const accumCacheKey = `${ACCUM_CACHE_PREFIX}${userId}:${options.plantId}:${deviceId}:${todayDateString}`;
  const recordsCacheKey = `${RECORDS_CACHE_PREFIX}${userId}`;

  // 1. Load cached accumulator and records on mount or date change
  useEffect(() => {
    let active = true;
    setAccumulator(createEmptyDailyAccumulator(todayDateString, {
      plantId: options.plantId,
      plantName: options.plantName,
      zone: options.zone,
      deviceId,
    }));
    lastSampleTimeRef.current = 0;
    lastSampleIdentity.current = null;
    lastSyncTimeRef.current = 0;
    setLastSyncedAt(null);
    (async () => {
      try {
        const cachedAccum = await AsyncStorage.getItem(accumCacheKey);
        if (cachedAccum && active) {
          const parsed = JSON.parse(cachedAccum);
          if (parsed?.dateString === todayDateString && parsed.plantId === options.plantId) {
            setAccumulator(parsed);
          }
        }

        const cachedRecords = await AsyncStorage.getItem(recordsCacheKey);
        if (cachedRecords && active) {
          const parsed = JSON.parse(cachedRecords);
          if (parsed && typeof parsed === 'object') {
            setDailyRecordsMap((previous) => ({ ...parsed, ...previous }));
          }
        }
      } catch (err) {
        console.warn('[useDailySensorLogger] Error reading cache:', err);
      } finally {
        if (active) setLoadedAccumulatorKey(accumCacheKey);
      }
    })();
    return () => {
      active = false;
    };
  }, [accumCacheKey, recordsCacheKey, todayDateString, options.plantId, options.plantName, options.zone, deviceId]);

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
            if (!data.plantId) return;
            const key = recordKey(data.plantId, dateStr);
            if (remoteRecords[key]?.id === `${user.id}_${key}`) return;
            remoteRecords[key] = {
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
              if (!data.plantId) return;
              fallbackMap[recordKey(data.plantId, dateStr)] = {
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
      thresholds,
      isFirestoreSynced: Boolean(lastSyncedAt),
      syncedAt: lastSyncedAt || undefined,
    });
  }, [accumulator, userId, userEmail, lastSyncedAt, thresholds]);

  // 4. Function to sync a DailySensorLogRecord to Firestore
  const syncRecordToFirestore = useCallback(
    async (record: DailySensorLogRecord) => {
      if (!record.plantId || !record.sampleCount) throw new Error('Waiting for a fresh sensor reading.');
      const plantId = record.plantId;
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      setIsSyncing(true);
      setSyncError(null);

      try {
        const payload = buildDailyLogFirestorePayload(record);

        if (user?.id && db) {
          // A. Save to `daily_sensor_logs` and `plant_daily_logs` collections
          const docId = `${user.id}_${recordKey(plantId, record.dateString)}`;
          const dailyLogDocRef = doc(db, 'daily_sensor_logs', docId);
          const plantDailyLogDocRef = doc(db, 'plant_daily_logs', docId);
          const batch = writeBatch(db);
          batch.set(
            dailyLogDocRef,
            {
              ...payload,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          batch.set(
            plantDailyLogDocRef,
            {
              ...payload,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          // B. Also upsert to `plant_logs` so it participates in standard log streams
          const plantLogDocRef = doc(db, 'plant_logs', `daily-avg-${docId}`);
          batch.set(
            plantLogDocRef,
            {
              userId: user.id,
              userEmail: user.email,
              plantName: record.plantName || 'Hydroponic Daily Average',
              stage: 'Daily Telemetry Summary',
              notes: `Automated Daily Sensor Average (${record.sampleCount} readings recorded). Avg Temp ${record.readings.temperature}°C, pH ${record.readings.ph}, EC ${record.readings.ec} mS.`,
              plantId,
              readings: record.readings,
              timestamp: record.timestamp,
              isDailyAverageSummary: true,
              sampleCount: record.sampleCount,
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );
          await batch.commit();
        }

        const nowIso = new Date().toISOString();
        if (user?.id && db) setLastSyncedAt(nowIso);

        // Update local map
        setDailyRecordsMap((prev) => {
          const updated = {
            ...prev,
            [recordKey(plantId, record.dateString)]: {
              ...record,
              isFirestoreSynced: Boolean(user?.id && db),
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
        throw err;
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
    if (!telemetry || isOffline || loadedAccumulatorKey !== accumCacheKey ||
      accumulator.plantId !== options.plantId) return;

    // Check if day rolled over
    const currentDate = getLocalDateString();
    if (currentDate !== todayDateString) {
      setTodayDateString(currentDate);
      setAccumulator(
        createEmptyDailyAccumulator(currentDate, {
          plantId: options.plantId,
          plantName: options.plantName,
          zone: options.zone,
          deviceId,
        })
      );
      lastSampleTimeRef.current = 0;
      return;
    }

    const identity = `${telemetry.hardwareId}:${telemetry.bootId}:${telemetry.sampleSequence}`;
    if (lastSampleIdentity.current === identity) return;
    const now = Date.now();
    // Throttle samples
    if (now - lastSampleTimeRef.current < SAMPLE_INTERVAL_MS && accumulator.sampleCount > 0) {
      return;
    }

    lastSampleTimeRef.current = now;
    lastSampleIdentity.current = identity;

    // Add reading to accumulator
    setAccumulator((prev) => {
      const updated = addReadingToDailyAccumulator({ ...prev, deviceId: telemetry.deviceId }, telemetry, new Date(now).toISOString());
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
        thresholds,
      });
      void syncRecordToFirestore(currentAvg).catch(() => {});
    }
  }, [
    telemetry,
    isOffline,
    loadedAccumulatorKey,
    todayDateString,
    accumCacheKey,
    accumulator,
    options.enabled,
    options.plantId,
    options.plantName,
    options.zone,
    deviceId,
    user,
    userId,
    userEmail,
    syncRecordToFirestore,
    thresholds,
  ]);

  // 6. Manual trigger function to immediately store today's average in Firestore
  const syncTodayToFirestore = useCallback(async () => {
    if (options.enabled === false || loadedAccumulatorKey !== accumCacheKey ||
      accumulator.plantId !== options.plantId || accumulator.dateString !== getLocalDateString()) {
      throw new Error('Waiting for the plant sensor log to load.');
    }
    const currentRecord = computeDailyAveragesFromAccumulator(accumulator, {
      userId,
      userEmail,
      thresholds,
    });
    await syncRecordToFirestore(currentRecord);
    return currentRecord;
  }, [accumulator, userId, userEmail, syncRecordToFirestore, options.enabled, options.plantId, loadedAccumulatorKey, accumCacheKey, thresholds]);

  const effectiveDailyRecordsMap = useMemo(() => {
    return {
      ...Object.fromEntries(Object.entries(dailyRecordsMap).filter(([, record]) => record.userId === userId)),
      ...(accumulator.sampleCount > 0 && accumulator.plantId && loadedAccumulatorKey === accumCacheKey
        ? { [recordKey(accumulator.plantId, todayDateString)]: todayRecord } : {}),
    };
  }, [dailyRecordsMap, todayDateString, todayRecord, accumulator, loadedAccumulatorKey, accumCacheKey, userId]);

  return {
    todayDateString,
    todayRecord,
    liveReading: isOffline ? null : telemetry,
    sampleCount: options.enabled === false ? 0 : accumulator.sampleCount,
    accumulator,
    dailyRecordsMap: effectiveDailyRecordsMap,
    isSyncing,
    lastSyncedAt,
    syncError,
    isOffline,
    connectionStatus: cloudAvailable || localAvailable ? 'connected' : 'waiting',
    connectionError: error,
    syncTodayToFirestore,
  };
}
