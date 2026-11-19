/**
 * HyGrow - Daily Sensor Averaging & Data Accumulation Utility
 * Continuously aggregates sensor telemetry throughout the day, computes
 * daily averages, and packages records for Firestore cloud storage.
 */

import type { Telemetry } from './telemetry';
import type { PlantLogReading } from './plantLogUtils';
import type { PlantDailyLogRecord } from './plantProfileData';

export interface DailySensorAverages {
  temperature: number | null;
  humidity: number | null;
  ph: number | null;
  ec: number | null;
  tds: number | null;
  waterTemp: number | null;
  waterLevel: number | null;
  lightIntensity: number | null;
  vpd: number | null;
}

export interface DailySensorAccumulator {
  metricCounts?: Partial<Record<keyof DailySensorAverages, number>>;
  dateString: string; // 'YYYY-MM-DD'
  plantId?: string;
  plantName?: string;
  zone?: string;
  deviceId?: string;
  sampleCount: number;
  firstSampleAt: string;
  lastSampleAt: string;
  sums: {
    temperature: number;
    humidity: number;
    ph: number;
    ec: number;
    tds: number;
    waterTemp: number;
    waterLevel: number;
    lightIntensity: number;
    vpd: number;
  };
  mins: {
    temperature: number;
    humidity: number;
    ph: number;
    ec: number;
    tds: number;
    waterTemp: number;
    waterLevel: number;
    lightIntensity: number;
    vpd: number;
  };
  maxs: {
    temperature: number;
    humidity: number;
    ph: number;
    ec: number;
    tds: number;
    waterTemp: number;
    waterLevel: number;
    lightIntensity: number;
    vpd: number;
  };
}

export interface DailySensorLogRecord {
  id: string; // e.g. "daily-2026-11-18" or "daily-plant-butterhead-lettuce-2026-11-18"
  dateString: string; // "YYYY-MM-DD"
  formattedDate: string; // "Nov 18, 2026"
  timestamp: string; // ISO
  plantId?: string;
  plantName?: string;
  zone?: string;
  deviceId?: string;
  userId?: string;
  userEmail?: string;
  sampleCount: number;
  isAutomatedDailyAvg: boolean;
  isFirestoreSynced: boolean;
  syncedAt?: string;
  readings: DailySensorAverages;
  minReadings: DailySensorAverages;
  maxReadings: DailySensorAverages;
  isOptimal: boolean;
  notes?: string;
}

/**
 * Format a Date to YYYY-MM-DD in local time
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date to human-readable string: e.g. "Nov 18, 2026"
 */
export function formatReadableDate(date: Date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Extract numerical sensor values from telemetry, applying fallbacks for missing channels
 */
export function extractSampleReadings(telemetry: Telemetry | Partial<PlantLogReading>): DailySensorAverages {
  const temperature = Number(
    typeof telemetry.temperature === 'number'
      ? telemetry.temperature
      : typeof (telemetry as any).temp === 'number'
      ? (telemetry as any).temp
      : 23.5
  );

  const humidity = Math.round(
    typeof telemetry.humidity === 'number'
      ? telemetry.humidity
      : typeof (telemetry as any).hum === 'number'
      ? (telemetry as any).hum
      : 64
  );

  const ph = Number(
    typeof telemetry.ph === 'number'
      ? telemetry.ph
      : typeof (telemetry as any).ph_val === 'number'
      ? (telemetry as any).ph_val
      : 6.05
  );

  const ec = Number(
    typeof telemetry.ec === 'number'
      ? telemetry.ec
      : typeof (telemetry as any).tds === 'number'
      ? (telemetry as any).tds / 500
      : 1.5
  );

  const tds = Math.round(
    typeof telemetry.tds === 'number'
      ? telemetry.tds
      : typeof (telemetry as any).tds_ppm === 'number'
      ? (telemetry as any).tds_ppm
      : ec * 500
  );

  const waterTemp = Number(
    typeof telemetry.waterTemp === 'number'
      ? telemetry.waterTemp
      : typeof (telemetry as any).water_temp_c === 'number'
      ? (telemetry as any).water_temp_c
      : 20.4
  );

  const waterLevel = Math.round(
    typeof telemetry.waterLevel === 'number'
      ? telemetry.waterLevel
      : typeof (telemetry as any).wl_percent === 'number'
      ? (telemetry as any).wl_percent
      : 84
  );

  const lightIntensity = Math.round(
    typeof telemetry.lightIntensity === 'number'
      ? telemetry.lightIntensity
      : typeof (telemetry as any).lux === 'number'
      ? (telemetry as any).lux
      : 14500
  );

  const vpd = Number(
    typeof telemetry.vpd === 'number'
      ? telemetry.vpd
      : typeof (telemetry as any).vpd_kpa === 'number'
      ? (telemetry as any).vpd_kpa
      : Math.max(0.7, Math.min(1.5, 1.05 + (temperature - 23.0) * 0.04 - (humidity - 62) * 0.015))
  );

  return {
    temperature: Number(temperature.toFixed(1)),
    humidity,
    ph: Number(ph.toFixed(2)),
    ec: Number(ec.toFixed(2)),
    tds,
    waterTemp: Number(waterTemp.toFixed(1)),
    waterLevel,
    lightIntensity,
    vpd: Number(vpd.toFixed(2)),
  };
}

/**
 * Initialize a blank accumulator for a specific date
 */
export function createEmptyDailyAccumulator(
  dateString: string,
  options: {
    plantId?: string;
    plantName?: string;
    zone?: string;
    deviceId?: string;
  } = {}
): DailySensorAccumulator {
  return {
    dateString,
    plantId: options.plantId,
    plantName: options.plantName,
    zone: options.zone,
    deviceId: options.deviceId,
    sampleCount: 0,
    firstSampleAt: new Date().toISOString(),
    lastSampleAt: new Date().toISOString(),
    sums: {
      temperature: 0,
      humidity: 0,
      ph: 0,
      ec: 0,
      tds: 0,
      waterTemp: 0,
      waterLevel: 0,
      lightIntensity: 0,
      vpd: 0,
    },
    mins: {
      temperature: 999,
      humidity: 999,
      ph: 999,
      ec: 999,
      tds: 99999,
      waterTemp: 999,
      waterLevel: 999,
      lightIntensity: 999999,
      vpd: 999,
    },
    maxs: {
      temperature: -999,
      humidity: -999,
      ph: -999,
      ec: -999,
      tds: -99999,
      waterTemp: -999,
      waterLevel: -999,
      lightIntensity: -999999,
      vpd: -999,
    },
  };
}

/**
 * Add a sensor telemetry reading to the daily accumulator and update sums, mins, and maxs
 */
export function addReadingToDailyAccumulator(
  acc: DailySensorAccumulator,
  telemetry: Telemetry | Partial<PlantLogReading>,
  sampleTimestamp: string = new Date().toISOString()
): DailySensorAccumulator {
  const updated: DailySensorAccumulator = {
    ...acc,
    metricCounts: { ...acc.metricCounts },
    sums: { ...acc.sums }, mins: { ...acc.mins }, maxs: { ...acc.maxs },
    sampleCount: acc.sampleCount + 1,
    firstSampleAt: acc.sampleCount === 0 ? sampleTimestamp : acc.firstSampleAt,
    lastSampleAt: sampleTimestamp,
  };
  for (const key of Object.keys(acc.sums) as (keyof DailySensorAverages)[]) {
    const value = telemetry[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    updated.metricCounts![key] = (acc.metricCounts?.[key] ?? (acc.metricCounts ? 0 : acc.sampleCount)) + 1;
    updated.sums[key] += value;
    updated.mins[key] = Math.min(acc.mins[key], value);
    updated.maxs[key] = Math.max(acc.maxs[key], value);
  }
  return updated;
}

/**
 * Compute the daily averages and generate the full DailySensorLogRecord
 */
export function computeDailyAveragesFromAccumulator(
  acc: DailySensorAccumulator,
  options: {
    userId?: string;
    userEmail?: string;
    isFirestoreSynced?: boolean;
    syncedAt?: string;
    thresholds?: {
      temperature?: { min: number; max: number };
      ph?: { min: number; max: number };
      ec?: { min: number; max: number };
    };
  } = {}
): DailySensorLogRecord {
  const count = Math.max(1, acc.sampleCount);

  const avgTemperature = Number((acc.sums.temperature / count).toFixed(1));
  const avgHumidity = Math.round(acc.sums.humidity / count);
  const avgPh = Number((acc.sums.ph / count).toFixed(2));
  const avgEc = Number((acc.sums.ec / count).toFixed(2));
  const avgTds = Math.round(acc.sums.tds / count);
  const avgWaterTemp = Number((acc.sums.waterTemp / count).toFixed(1));
  const avgWaterLevel = Math.round(acc.sums.waterLevel / count);
  const avgLightIntensity = Math.round(acc.sums.lightIntensity / count);
  const avgVpd = Number((acc.sums.vpd / count).toFixed(2));

  // Determine if daily averages stayed within optimal agronomic equilibrium
  const thresh = options.thresholds || {
    temperature: { min: 20.0, max: 26.0 },
    ph: { min: 5.6, max: 6.5 },
    ec: { min: 1.2, max: 2.2 },
  };

  const isTempOpt = thresh.temperature
    ? avgTemperature >= thresh.temperature.min && avgTemperature <= thresh.temperature.max
    : true;
  const isPhOpt = thresh.ph ? avgPh >= thresh.ph.min && avgPh <= thresh.ph.max : true;
  const isEcOpt = thresh.ec ? avgEc >= thresh.ec.min && avgEc <= thresh.ec.max : true;
  const isOptimal = isTempOpt && isPhOpt && isEcOpt;

  const idPrefix = acc.plantId ? `daily-${acc.plantId}-${acc.dateString}` : `daily-${acc.dateString}`;
  const [year, month, day] = acc.dateString.split('-').map(Number);
  const localDate = new Date(year, (month || 1) - 1, day || 1);

  const result: DailySensorLogRecord = {
    id: idPrefix,
    dateString: acc.dateString,
    formattedDate: formatReadableDate(localDate),
    timestamp: acc.lastSampleAt,
    plantId: acc.plantId,
    plantName: acc.plantName,
    zone: acc.zone,
    deviceId: acc.deviceId,
    userId: options.userId,
    userEmail: options.userEmail,
    sampleCount: acc.sampleCount,
    isAutomatedDailyAvg: true,
    isFirestoreSynced: Boolean(options.isFirestoreSynced),
    syncedAt: options.syncedAt,
    readings: {
      temperature: avgTemperature,
      humidity: avgHumidity,
      ph: avgPh,
      ec: avgEc,
      tds: avgTds,
      waterTemp: avgWaterTemp,
      waterLevel: avgWaterLevel,
      lightIntensity: avgLightIntensity,
      vpd: avgVpd,
    },
    minReadings: {
      temperature: acc.sampleCount > 0 ? Number(acc.mins.temperature.toFixed(1)) : avgTemperature,
      humidity: acc.sampleCount > 0 ? acc.mins.humidity : avgHumidity,
      ph: acc.sampleCount > 0 ? Number(acc.mins.ph.toFixed(2)) : avgPh,
      ec: acc.sampleCount > 0 ? Number(acc.mins.ec.toFixed(2)) : avgEc,
      tds: acc.sampleCount > 0 ? acc.mins.tds : avgTds,
      waterTemp: acc.sampleCount > 0 ? Number(acc.mins.waterTemp.toFixed(1)) : avgWaterTemp,
      waterLevel: acc.sampleCount > 0 ? acc.mins.waterLevel : avgWaterLevel,
      lightIntensity: acc.sampleCount > 0 ? acc.mins.lightIntensity : avgLightIntensity,
      vpd: acc.sampleCount > 0 ? Number(acc.mins.vpd.toFixed(2)) : avgVpd,
    },
    maxReadings: {
      temperature: acc.sampleCount > 0 ? Number(acc.maxs.temperature.toFixed(1)) : avgTemperature,
      humidity: acc.sampleCount > 0 ? acc.maxs.humidity : avgHumidity,
      ph: acc.sampleCount > 0 ? Number(acc.maxs.ph.toFixed(2)) : avgPh,
      ec: acc.sampleCount > 0 ? Number(acc.maxs.ec.toFixed(2)) : avgEc,
      tds: acc.sampleCount > 0 ? acc.maxs.tds : avgTds,
      waterTemp: acc.sampleCount > 0 ? Number(acc.maxs.waterTemp.toFixed(1)) : avgWaterTemp,
      waterLevel: acc.sampleCount > 0 ? acc.maxs.waterLevel : avgWaterLevel,
      lightIntensity: acc.sampleCount > 0 ? acc.maxs.lightIntensity : avgLightIntensity,
      vpd: acc.sampleCount > 0 ? Number(acc.maxs.vpd.toFixed(2)) : avgVpd,
    },
    isOptimal,
    notes: `Automated daily average from ${acc.sampleCount} sensor telemetry readings for ${acc.dateString}.`,
  };
  for (const key of Object.keys(acc.sums) as (keyof DailySensorAverages)[]) {
    const samples = acc.metricCounts?.[key] ?? (acc.metricCounts ? 0 : acc.sampleCount);
    result.readings[key] = samples ? Number((acc.sums[key] / samples).toFixed(2)) : null;
    result.minReadings[key] = samples ? acc.mins[key] : null;
    result.maxReadings[key] = samples ? acc.maxs[key] : null;
  }
  result.isOptimal = Object.entries(thresh).every(([key, range]) => {
    const value = result.readings[key as keyof DailySensorAverages];
    return value === null || !range || (value >= range.min && value <= range.max);
  });
  return result;
}

/**
 * Merge live daily sensor averages into day-wise plant logs
 * Replaces synthetic readings with actual recorded daily averages for matched days.
 */
export function mergeDailyAveragesIntoPlantDailyLogs(
  dailyLogs: PlantDailyLogRecord[],
  dailyAveragesMap: Record<string, DailySensorLogRecord>
): PlantDailyLogRecord[] {
  if (!dailyAveragesMap || Object.keys(dailyAveragesMap).length === 0) {
    return dailyLogs;
  }

  return dailyLogs.map((log) => {
    const legacy = dailyAveragesMap[log.dateString];
    const avgRecord = dailyAveragesMap[log.plantId + '_' + log.dateString] || (legacy?.plantId === log.plantId ? legacy : undefined);
    if (!avgRecord) return log;

    return {
      ...log,
      readings: {
        ...log.readings,
        ...avgRecord.readings,
      },
      isOptimal: avgRecord.isOptimal,
      isAutomatedDailyAvg: true,
      sampleCount: avgRecord.sampleCount,
      minReadings: avgRecord.minReadings,
      maxReadings: avgRecord.maxReadings,
      isFirestoreSynced: avgRecord.isFirestoreSynced,
      notes: log.notes || avgRecord.notes,
    };
  });
}

/**
 * Prepare Firestore payload for daily_sensor_logs collection
 */
export function buildDailyLogFirestorePayload(record: DailySensorLogRecord) {
  return {
    date: record.dateString,
    formattedDate: record.formattedDate,
    timestamp: record.timestamp,
    plantId: record.plantId || 'all-zones',
    plantName: record.plantName || 'General Hydroponic Crop',
    zone: record.zone || 'Main Greenhouse Zone',
    deviceId: record.deviceId || 'hygrow-hub',
    userId: record.userId || 'demo-farmer',
    userEmail: record.userEmail || 'farmer@hygrow.local',
    sampleCount: record.sampleCount,
    isAutomatedDailyAvg: true,
    isFirestoreSynced: true,
    readings: record.readings,
    minReadings: record.minReadings,
    maxReadings: record.maxReadings,
    isOptimal: record.isOptimal,
    notes: record.notes || '',
    type: 'daily_sensor_average',
  };
}


/** Choose saved data only for this farmer, plant and assigned device. */
export function getLatestStoredPlantReading(
  records: DailySensorLogRecord[], userId: string, plantId: string, deviceId?: string
): DailySensorLogRecord | null {
  return records.filter((record) => record.userId === userId && record.plantId === plantId &&
    (!record.deviceId || !deviceId || record.deviceId === deviceId) && record.sampleCount > 0 &&
    Object.values(record.readings || {}).some((value) => typeof value === 'number' && Number.isFinite(value)) &&
    Number.isFinite(Date.parse(record.timestamp)))
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0] || null;
}
