/**
 * HyGrow — Fallback & Simulated Sensor Telemetry
 * Provides realistic agronomic sensor observations and historical time-series
 * when physical ESP32 hardware is offline or awaiting cloud broadcast.
 */

import type { Telemetry, HistoryPoint, SensorHealth } from './telemetry';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY_TELEMETRY = '@hygrow_last_known_telemetry';
const CACHE_KEY_HISTORY = '@hygrow_last_known_history';

const HEALTHY_STATUS: Record<string, SensorHealth> = {
  dht: { enabled: true, simulated: true, state: 'healthy' },
  ph: { enabled: true, simulated: true, state: 'healthy' },
  tds: { enabled: true, simulated: true, state: 'healthy' },
  water_level: { enabled: true, simulated: true, state: 'healthy' },
  light: { enabled: true, simulated: true, state: 'healthy' },
  water_temp: { enabled: true, simulated: true, state: 'healthy' },
};

/** Default calibrated baseline telemetry */
export const DEFAULT_FALLBACK_TELEMETRY: Telemetry = {
  deviceId: 'simulated-node',
  hardwareId: 'sim-esp32-v2',
  bootId: 'sim-boot-01',
  sampleSequence: 120,
  sampledUptimeMs: 3600000,
  sampleAgeMs: 50,
  readIntervalMs: 2000,
  source: 'local',
  receivedAt: Date.now(),
  uploadedAt: Date.now(),
  lastSensorTimestamp: new Date().toISOString(),
  sensorStatus: HEALTHY_STATUS,
  temperature: 23.4,
  humidity: 64.5,
  ph: 6.1,
  tds: 380,
  waterLevel: 78,
  lightIntensity: 2450,
  vpd: 0.95,
  waterTemp: 20.2,
  co2: 650,
  ec: 1.4 as any,
  pumpStatus: false as any,
  autoMode: true as any,
  tdsCompensationFallback: false,
};

/**
 * Generate 24 hourly time-series points with realistic diurnal cycles
 */
export function generateFallbackHistory(count = 24, now = Date.now()): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  const oneHour = 60 * 60 * 1000;

  for (let i = count - 1; i >= 0; i--) {
    const observedAt = now - i * oneHour;
    const dateObj = new Date(observedAt);
    const hour = dateObj.getHours();

    // Diurnal variation curves
    // Temperature peaks around 14:00 (2 PM) and dips around 04:00 (4 AM)
    const solarFactor = Math.sin(((hour - 8) / 24) * 2 * Math.PI); // -1 to +1
    const tempNoise = ((i * 13) % 7 - 3) * 0.1;
    const humNoise = ((i * 17) % 7 - 3) * 0.4;
    const phNoise = ((i * 19) % 5 - 2) * 0.03;

    const temperature = Number((23.0 + solarFactor * 2.2 + tempNoise).toFixed(1));
    const humidity = Number((65.0 - solarFactor * 7.0 + humNoise).toFixed(1));
    const ph = Number((6.12 + Math.sin(i * 0.4) * 0.15 + phNoise).toFixed(2));
    const tds = Math.round(380 + Math.sin(i * 0.3) * 20);
    // Water level gradually drops over the day
    const waterLevel = Math.round(84 - ((count - 1 - i) / count) * 6);
    // Light is high between 7 AM and 7 PM (photosynthetic photoperiod)
    const isDaylight = hour >= 7 && hour <= 19;
    const lightFactor = isDaylight ? Math.sin(((hour - 7) / 12) * Math.PI) : 0;
    const lightIntensity = Math.round(isDaylight ? 800 + lightFactor * 3200 + ((i * 23) % 100) : 0);
    const vpd = Number((0.92 + solarFactor * 0.22).toFixed(2));
    const waterTemp = Number((20.0 + solarFactor * 0.8).toFixed(1));
    const co2 = Math.round(650 - (isDaylight ? lightFactor * 120 : -60));

    points.push({
      deviceId: 'simulated-node',
      hardwareId: 'sim-esp32-v2',
      bootId: 'sim-boot-01',
      sampleSequence: 100 + (count - i),
      sampledUptimeMs: 3600000 + (count - i) * 60000,
      sampleAgeMs: 50,
      readIntervalMs: 2000,
      source: 'local',
      receivedAt: observedAt,
      uploadedAt: observedAt,
      lastSensorTimestamp: dateObj.toISOString(),
      sensorStatus: HEALTHY_STATUS,
      temperature,
      humidity,
      ph,
      tds,
      waterLevel,
      lightIntensity,
      vpd,
      waterTemp,
      co2,
      ec: 1.4 as any,
      pumpStatus: (i % 6 === 0) as any,
      autoMode: true as any,
      tdsCompensationFallback: false,
      observedAt,
      time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }),
    });
  }

  return points;
}

/**
 * Generate 7 daily time-series points for the weekly tab
 */
export function generateFallbackWeekly(count = 7, now = Date.now()): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  const oneDay = 24 * 60 * 60 * 1000;

  for (let i = count - 1; i >= 0; i--) {
    const observedAt = now - i * oneDay;
    const dateObj = new Date(observedAt);

    const dayFactor = Math.sin(i * 0.8);
    const temperature = Number((23.2 + dayFactor * 1.1).toFixed(1));
    const humidity = Number((64.0 - dayFactor * 3.5).toFixed(1));
    const ph = Number((6.1 + Math.sin(i * 0.5) * 0.1).toFixed(2));
    const tds = Math.round(385 + dayFactor * 15);
    const waterLevel = Math.round(92 - (count - 1 - i) * 2.2);
    const lightIntensity = Math.round(2600 + dayFactor * 400);
    const vpd = Number((0.94 + dayFactor * 0.1).toFixed(2));
    const waterTemp = Number((20.1 + dayFactor * 0.5).toFixed(1));
    const co2 = Math.round(640 + dayFactor * 30);

    points.push({
      deviceId: 'simulated-node',
      hardwareId: 'sim-esp32-v2',
      bootId: 'sim-boot-01',
      sampleSequence: 1000 + (count - i),
      sampledUptimeMs: 3600000 + (count - i) * 3600000,
      sampleAgeMs: 50,
      readIntervalMs: 2000,
      source: 'local',
      receivedAt: observedAt,
      uploadedAt: observedAt,
      lastSensorTimestamp: dateObj.toISOString(),
      sensorStatus: HEALTHY_STATUS,
      temperature,
      humidity,
      ph,
      tds,
      waterLevel,
      lightIntensity,
      vpd,
      waterTemp,
      co2,
      ec: 1.4 as any,
      pumpStatus: false as any,
      autoMode: true as any,
      tdsCompensationFallback: false,
      observedAt,
      time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }),
    });
  }

  return points;
}

/** In-memory cache for fast sync access */
let inMemoryLastKnownTelemetry: Telemetry | null = null;
let inMemoryLastKnownHistory: HistoryPoint[] = [];

/** Save last recorded live telemetry to storage */
export async function persistLastKnownTelemetry(data: Telemetry, historyPoints?: HistoryPoint[]) {
  try {
    inMemoryLastKnownTelemetry = data;
    await AsyncStorage.setItem(CACHE_KEY_TELEMETRY, JSON.stringify(data));
    if (historyPoints && historyPoints.length > 0) {
      inMemoryLastKnownHistory = historyPoints;
      await AsyncStorage.setItem(CACHE_KEY_HISTORY, JSON.stringify(historyPoints.slice(-50)));
    }
  } catch (_e) {
    // Non-fatal caching error
  }
}

/** Retrieve last recorded telemetry from cache */
export async function loadLastKnownTelemetry(): Promise<{
  telemetry: Telemetry | null;
  history: HistoryPoint[];
}> {
  if (inMemoryLastKnownTelemetry) {
    return {
      telemetry: inMemoryLastKnownTelemetry,
      history: inMemoryLastKnownHistory,
    };
  }
  try {
    const rawTele = await AsyncStorage.getItem(CACHE_KEY_TELEMETRY);
    const rawHist = await AsyncStorage.getItem(CACHE_KEY_HISTORY);
    if (rawTele) {
      inMemoryLastKnownTelemetry = JSON.parse(rawTele);
    }
    if (rawHist) {
      inMemoryLastKnownHistory = JSON.parse(rawHist);
    }
    return {
      telemetry: inMemoryLastKnownTelemetry,
      history: inMemoryLastKnownHistory,
    };
  } catch (_e) {
    return { telemetry: null, history: [] };
  }
}

export function getCachedLastKnownTelemetry(): {
  telemetry: Telemetry | null;
  history: HistoryPoint[];
} {
  return {
    telemetry: inMemoryLastKnownTelemetry,
    history: inMemoryLastKnownHistory,
  };
}

