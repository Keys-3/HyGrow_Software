/**
 * Farm Help — useSensorData Hook
 * Supports Cloud (Firestore Real-Time) and Offline Direct IoT (UDP 39400 / HTTP /status)
 */

import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../../firebase';
import { SensorData, LocalDeviceInfo } from '../store/slices/sensorSlice';
import useAppStore from '../store/useAppStore';
import localIotService, { calculateVPD } from '../services/localIotService';

const SENSOR_COLLECTION = 'sensor_readings';
const LOCAL_POLL_INTERVAL_MS = 3000;

export type HistoryPoint = {
  time: string;
  date?: string;
  temperature: number;
  humidity: number;
  ph: number;
  ec: number;
  waterLevel: number;
  lightIntensity: number;
  vpd: number;
  waterTemp: number;
  co2: number;
};

export default function useSensorData() {
  const storeSensorData = useAppStore((state) => state.sensorData);
  const updateSensorData = useAppStore((state) => state.updateSensorData);
  const setDeviceOnline = useAppStore((state) => state.setDeviceOnline);
  const connectionMode = useAppStore((state) => state.connectionMode);
  const localDevice = useAppStore((state) => state.localDevice);
  const setLocalDevice = useAppStore((state) => state.setLocalDevice);
  const activeSource = useAppStore((state) => state.activeSource);
  const setActiveSource = useAppStore((state) => state.setActiveSource);
  const setDiscoveredDevices = useAppStore((state) => state.setDiscoveredDevices);

  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [weekly, setWeekly] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localPollTimerRef = useRef<any>(null);
  const consecutiveLocalFailuresRef = useRef<number>(0);

  // Helper to append a new live reading into history state
  const appendHistoryPoint = useCallback((reading: SensorData) => {
    const ts = new Date(reading.lastSensorTimestamp || Date.now());
    const newPoint: HistoryPoint = {
      time: ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: ts.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      temperature: reading.temperature,
      humidity: reading.humidity,
      ph: reading.ph,
      ec: reading.ec,
      waterLevel: reading.waterLevel,
      lightIntensity: reading.lightIntensity,
      vpd: reading.vpd,
      waterTemp: reading.waterTemp,
      co2: reading.co2,
    };

    setHistory((prev) => {
      // Avoid duplicate consecutive timestamps
      if (prev.length > 0 && prev[prev.length - 1].time === newPoint.time) {
        const updated = [...prev];
        updated[updated.length - 1] = newPoint;
        return updated;
      }
      return [...prev.slice(-19), newPoint];
    });

    setWeekly((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].time === newPoint.time) {
        const updated = [...prev];
        updated[updated.length - 1] = newPoint;
        return updated;
      }
      return [...prev.slice(-99), newPoint];
    });
  }, []);

  // Poll local IoT device HTTP endpoint (http://<device-ip>/status)
  const pollLocalDevice = useCallback(async (ipToUse?: string) => {
    const ip = ipToUse || localDevice?.ip || localIotService.getActiveDeviceIp();
    if (!ip) return false;

    try {
      const { snapshot, latencyMs } = await localIotService.fetchStatus(ip);

      consecutiveLocalFailuresRef.current = 0;
      updateSensorData(snapshot);
      appendHistoryPoint(snapshot);
      setDeviceOnline(true);
      setActiveSource('local');
      setError(null);

      // Update local device telemetry status
      setLocalDevice({
        ip,
        deviceId: snapshot.deviceId,
        lastSeen: new Date().toISOString(),
        isReachable: true,
        latencyMs,
      });

      return true;
    } catch (err: any) {
      consecutiveLocalFailuresRef.current += 1;
      const isPersistentFailure = consecutiveLocalFailuresRef.current >= 3;

      if (localDevice) {
        setLocalDevice({
          ...localDevice,
          isReachable: false,
        });
      }

      if (isPersistentFailure) {
        if (connectionMode === 'local') {
          setDeviceOnline(false);
          setActiveSource('none');
          setError(`Local device unreachable at ${ip}`);
        }
      }
      return false;
    }
  }, [localDevice, connectionMode, updateSensorData, appendHistoryPoint, setDeviceOnline, setActiveSource, setLocalDevice]);

  // Manual trigger to refresh or re-discover
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (connectionMode === 'local' || connectionMode === 'auto') {
      // First attempt polling known IP
      const polled = await pollLocalDevice();
      if (!polled) {
        // Run discovery if known IP failed or is absent
        try {
          const devices = await localIotService.discoverDevices();
          setDiscoveredDevices(devices);
          if (devices.length > 0) {
            await pollLocalDevice(devices[0].ip);
          }
        } catch {
          // ignore discovery errors
        }
      }
    }

    setLoading(false);
  }, [connectionMode, pollLocalDevice, setDiscoveredDevices]);

  // Main lifecycle effect: manages Firestore sync vs Local polling loop
  useEffect(() => {
    let unsubLatest = () => { };
    let unsubHistory = () => { };
    let isMounted = true;

    // Clear any previous polling timer
    if (localPollTimerRef.current) {
      clearInterval(localPollTimerRef.current);
      localPollTimerRef.current = null;
    }

    // Generate beautiful initial mock history if none exists yet
    setHistory((prev) => {
      if (prev.length > 0) return prev;
      return Array.from({ length: 20 }).map((_, i) => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - (19 - i) * 5);
        const sinVal = Math.sin(i / 2);
        return {
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: now.toLocaleDateString([], { month: 'short', day: 'numeric' }),
          temperature: 24 + sinVal * 1.5,
          humidity: 65 + sinVal * 3,
          ph: 6.0 + sinVal * 0.2,
          ec: 1.5 + sinVal * 0.1,
          waterLevel: 82 + sinVal * 2,
          lightIntensity: 15500 + sinVal * 1000,
          vpd: 0.9 + sinVal * 0.1,
          waterTemp: 20 + sinVal * 0.5,
          co2: 450 + sinVal * 50,
        };
      });
    });

    // 1. Setup Local IoT polling if in 'local' or 'auto' mode
    if (connectionMode === 'local' || connectionMode === 'auto') {
      // Immediate poll
      pollLocalDevice();

      localPollTimerRef.current = setInterval(() => {
        if (!isMounted) return;
        pollLocalDevice();
      }, LOCAL_POLL_INTERVAL_MS);
    }

    // 2. Setup Firestore sync if NOT in strict 'local' mode
    if (connectionMode !== 'local') {
      try {
        const qLatest = query(
          collection(db, SENSOR_COLLECTION),
          orderBy('lastUpdated', 'desc'),
          limit(1)
        );

        const qHistory = query(
          collection(db, SENSOR_COLLECTION),
          orderBy('lastUpdated', 'desc'),
          limit(100)
        );

        unsubHistory = onSnapshot(
          qHistory,
          (snapshot) => {
            if (!isMounted) return;
            if (!snapshot.empty) {
              const fetchedHistory: HistoryPoint[] = snapshot.docs.map((doc) => {
                const data = doc.data();
                const ts = data.lastUpdated?.toDate?.() || new Date();
                return {
                  time: ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  date: ts.toLocaleDateString([], { month: 'short', day: 'numeric' }),
                  temperature: data.temp_c ?? 0,
                  humidity: data.humidity ?? 0,
                  ph: data.ph_val ?? 0,
                  ec: data.tds_ppm ?? 0,
                  waterLevel: data.wl_percent ?? 0,
                  lightIntensity: data.lux ?? 0,
                  vpd: data.vpd_kpa !== undefined ? data.vpd_kpa : calculateVPD(data.temp_c ?? 0, data.humidity ?? 0),
                  waterTemp: data.water_temp_c ?? 20,
                  co2: data.co2_ppm ?? 450,
                };
              }).reverse();

              setHistory(fetchedHistory.slice(-20));
              setWeekly(fetchedHistory);
            }
          },
          (err) => {
            console.warn('Firestore history subscription error:', err.message);
          }
        );

        unsubLatest = onSnapshot(
          qLatest,
          (snapshot) => {
            if (!isMounted) return;

            // In 'auto' mode, if local device is currently active and healthy, prefer local
            if (connectionMode === 'auto' && activeSource === 'local' && consecutiveLocalFailuresRef.current === 0) {
              return;
            }

            if (snapshot.empty) {
              if (connectionMode === 'cloud') {
                setLoading(false);
              }
              return;
            }

            const doc = snapshot.docs[0];
            const data = doc.data();
            const sensorTimestamp = data.lastUpdated?.toDate?.()?.toISOString?.() ?? new Date().toISOString();

            const mapped: SensorData = {
              deviceId: data.deviceId ?? 'Unknown Device',
              temperature: data.temp_c ?? 0,
              humidity: data.humidity ?? 0,
              ph: data.ph_val ?? 0,
              ec: data.tds_ppm ?? 0,
              waterLevel: data.wl_percent ?? 0,
              lightIntensity: data.lux ?? 0,
              vpd: data.vpd_kpa !== undefined && data.vpd_kpa !== null
                ? data.vpd_kpa
                : calculateVPD(data.temp_c ?? 0, data.humidity ?? 0),
              waterTemp: data.water_temp_c ?? 20,
              co2: data.co2_ppm ?? 450,
              pumpStatus: data.status === 'Online',
              autoMode: true,
              lastSensorTimestamp: sensorTimestamp,
            };

            updateSensorData(mapped);
            setActiveSource('cloud');

            const now = Date.now();
            const lastSeen = new Date(sensorTimestamp).getTime();
            setDeviceOnline(now - lastSeen <= 2 * 60 * 1000);
            setLoading(false);
            setError(null);
          },
          (err) => {
            if (!isMounted) return;
            console.warn('Firebase sync warning:', err.message);
            if (connectionMode === 'cloud') {
              setError(err.message);
              setDeviceOnline(false);
              setActiveSource('none');
            }
            setLoading(false);
          }
        );
      } catch (err: any) {
        if (connectionMode === 'cloud') {
          setError(err.message);
        }
      }
    }

    return () => {
      isMounted = false;
      unsubLatest();
      unsubHistory();
      if (localPollTimerRef.current) {
        clearInterval(localPollTimerRef.current);
      }
    };
  }, [connectionMode, pollLocalDevice, updateSensorData, setDeviceOnline, setActiveSource]);

  return {
    current: storeSensorData,
    history,
    weekly,
    loading,
    error,
    refresh,
    activeSource,
    connectionMode,
    localDevice,
  };
}