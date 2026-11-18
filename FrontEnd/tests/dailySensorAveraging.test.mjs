import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyDailyAccumulator,
  addReadingToDailyAccumulator,
  computeDailyAveragesFromAccumulator,
  mergeDailyAveragesIntoPlantDailyLogs,
  buildDailyLogFirestorePayload,
  extractSampleReadings,
  getLocalDateString,
} from '../src/utils/dailySensorAveraging.ts';
import { generatePlantDailyLogs, INITIAL_PLANT_PROFILES } from '../src/utils/plantProfileData.ts';

test('createEmptyDailyAccumulator initializes zeroed accumulator with correct date', () => {
  const acc = createEmptyDailyAccumulator('2026-11-18', {
    plantId: 'plant-butterhead-lettuce',
    plantName: 'Butterhead Lettuce',
    zone: 'NFT Bay 1',
  });

  assert.equal(acc.dateString, '2026-11-18');
  assert.equal(acc.plantId, 'plant-butterhead-lettuce');
  assert.equal(acc.sampleCount, 0);
  assert.equal(acc.sums.temperature, 0);
  assert.equal(acc.sums.humidity, 0);
  assert.equal(acc.sums.ph, 0);
  assert.equal(acc.sums.ec, 0);
});

test('extractSampleReadings extracts numerical sensor telemetry and applies safe bounds', () => {
  const telemetry = {
    temperature: 24.2,
    humidity: 65,
    ph: 6.12,
    ec: 1.55,
    tds: 775,
    waterTemp: 20.8,
    waterLevel: 88,
    lightIntensity: 15200,
    vpd: 1.08,
  };

  const sample = extractSampleReadings(telemetry);

  assert.equal(sample.temperature, 24.2);
  assert.equal(sample.humidity, 65);
  assert.equal(sample.ph, 6.12);
  assert.equal(sample.ec, 1.55);
  assert.equal(sample.tds, 775);
  assert.equal(sample.waterTemp, 20.8);
  assert.equal(sample.waterLevel, 88);
  assert.equal(sample.lightIntensity, 15200);
  assert.equal(sample.vpd, 1.08);
});

test('addReadingToDailyAccumulator accumulates samples, maintains min/max, and updates sums', () => {
  let acc = createEmptyDailyAccumulator('2026-11-18');

  // Sample 1
  acc = addReadingToDailyAccumulator(
    acc,
    {
      temperature: 22.0,
      humidity: 60,
      ph: 5.9,
      ec: 1.4,
      waterTemp: 19.5,
    },
    '2026-11-18T08:00:00Z'
  );

  assert.equal(acc.sampleCount, 1);
  assert.equal(acc.firstSampleAt, '2026-11-18T08:00:00Z');
  assert.equal(acc.mins.temperature, 22.0);
  assert.equal(acc.maxs.temperature, 22.0);

  // Sample 2
  acc = addReadingToDailyAccumulator(
    acc,
    {
      temperature: 26.0,
      humidity: 70,
      ph: 6.1,
      ec: 1.6,
      waterTemp: 21.5,
    },
    '2026-11-18T14:00:00Z'
  );

  assert.equal(acc.sampleCount, 2);
  assert.equal(acc.lastSampleAt, '2026-11-18T14:00:00Z');
  assert.equal(acc.mins.temperature, 22.0);
  assert.equal(acc.maxs.temperature, 26.0);
  assert.equal(acc.mins.humidity, 60);
  assert.equal(acc.maxs.humidity, 70);
  assert.equal(acc.sums.temperature, 48.0);
});

test('computeDailyAveragesFromAccumulator calculates daily averages and formats log record', () => {
  let acc = createEmptyDailyAccumulator('2026-11-18', {
    plantId: 'plant-butterhead-lettuce',
    plantName: 'Butterhead Lettuce',
    zone: 'NFT Bay 1',
  });

  // Add 3 samples
  acc = addReadingToDailyAccumulator(acc, { temperature: 21.0, humidity: 60, ph: 6.0, ec: 1.4 });
  acc = addReadingToDailyAccumulator(acc, { temperature: 23.0, humidity: 65, ph: 6.1, ec: 1.5 });
  acc = addReadingToDailyAccumulator(acc, { temperature: 25.0, humidity: 70, ph: 6.2, ec: 1.6 });

  const record = computeDailyAveragesFromAccumulator(acc, {
    userId: 'farmer-alice',
    userEmail: 'alice@example.com',
  });

  assert.equal(record.dateString, '2026-11-18');
  assert.equal(record.plantId, 'plant-butterhead-lettuce');
  assert.equal(record.sampleCount, 3);
  assert.equal(record.isAutomatedDailyAvg, true);

  // Averages:
  // Temp: (21 + 23 + 25) / 3 = 23.0
  assert.equal(record.readings.temperature, 23.0);
  // Humidity: (60 + 65 + 70) / 3 = 65
  assert.equal(record.readings.humidity, 65);
  // pH: (6.0 + 6.1 + 6.2) / 3 = 6.10
  assert.equal(record.readings.ph, 6.1);
  // EC: (1.4 + 1.5 + 1.6) / 3 = 1.50
  assert.equal(record.readings.ec, 1.5);

  // Min / Max
  assert.equal(record.minReadings.temperature, 21.0);
  assert.equal(record.maxReadings.temperature, 25.0);
  assert.equal(record.minReadings.ph, 6.0);
  assert.equal(record.maxReadings.ph, 6.2);
});

test('mergeDailyAveragesIntoPlantDailyLogs merges real daily average records into plant logs', () => {
  const lettuce = INITIAL_PLANT_PROFILES[0];
  const baseDate = new Date('2026-11-18T12:00:00Z');
  const initialLogs = generatePlantDailyLogs(lettuce, [], 10, baseDate);

  const todayStr = '2026-11-18';
  const customAverage = {
    id: `daily-${todayStr}`,
    dateString: todayStr,
    formattedDate: 'Nov 18, 2026',
    timestamp: baseDate.toISOString(),
    sampleCount: 42,
    isAutomatedDailyAvg: true,
    isFirestoreSynced: true,
    readings: {
      temperature: 24.7,
      humidity: 66,
      ph: 6.02,
      ec: 1.58,
      tds: 790,
      waterTemp: 21.1,
      waterLevel: 85,
      lightIntensity: 16000,
      vpd: 1.06,
    },
    minReadings: {
      temperature: 22.1,
      humidity: 58,
      ph: 5.92,
      ec: 1.45,
      tds: 725,
      waterTemp: 19.8,
      waterLevel: 80,
      lightIntensity: 13000,
      vpd: 0.95,
    },
    maxReadings: {
      temperature: 26.3,
      humidity: 72,
      ph: 6.15,
      ec: 1.68,
      tds: 840,
      waterTemp: 22.0,
      waterLevel: 90,
      lightIntensity: 18500,
      vpd: 1.18,
    },
    isOptimal: true,
    notes: 'Real-time sensor telemetry continuous average across 42 samples.',
  };

  const mergedLogs = mergeDailyAveragesIntoPlantDailyLogs(initialLogs, {
    [todayStr]: customAverage,
  });

  const todayLog = mergedLogs.find((l) => l.dateString === todayStr);
  assert.notEqual(todayLog, undefined);
  assert.equal(todayLog?.readings.temperature, 24.7);
  assert.equal(todayLog?.readings.ph, 6.02);
  assert.equal(todayLog?.readings.ec, 1.58);
  assert.equal(todayLog?.isAutomatedDailyAvg, true);
  assert.equal(todayLog?.sampleCount, 42);
  assert.equal(todayLog?.isFirestoreSynced, true);
});

test('buildDailyLogFirestorePayload prepares valid payload for Firestore', () => {
  const record = {
    id: 'daily-2026-11-18',
    dateString: '2026-11-18',
    formattedDate: 'Nov 18, 2026',
    timestamp: '2026-11-18T12:00:00Z',
    plantId: 'plant-butterhead-lettuce',
    plantName: 'Butterhead Lettuce',
    zone: 'NFT Bay 1',
    deviceId: 'esp32-greenhouse-01',
    userId: 'farmer-alice',
    userEmail: 'alice@example.com',
    sampleCount: 16,
    isAutomatedDailyAvg: true,
    isFirestoreSynced: true,
    readings: {
      temperature: 23.5,
      humidity: 64,
      ph: 6.05,
      ec: 1.5,
      tds: 750,
      waterTemp: 20.4,
      waterLevel: 84,
      lightIntensity: 14500,
      vpd: 1.05,
    },
    minReadings: {
      temperature: 21.0,
      humidity: 58,
      ph: 5.9,
      ec: 1.4,
      tds: 700,
      waterTemp: 19.5,
      waterLevel: 80,
      lightIntensity: 12000,
      vpd: 0.95,
    },
    maxReadings: {
      temperature: 25.5,
      humidity: 70,
      ph: 6.2,
      ec: 1.6,
      tds: 800,
      waterTemp: 21.5,
      waterLevel: 88,
      lightIntensity: 17000,
      vpd: 1.15,
    },
    isOptimal: true,
  };

  const payload = buildDailyLogFirestorePayload(record);

  assert.equal(payload.date, '2026-11-18');
  assert.equal(payload.userId, 'farmer-alice');
  assert.equal(payload.isAutomatedDailyAvg, true);
  assert.equal(payload.type, 'daily_sensor_average');
  assert.equal(payload.sampleCount, 16);
  assert.equal(payload.readings.temperature, 23.5);
  assert.equal(payload.minReadings.temperature, 21.0);
  assert.equal(payload.maxReadings.temperature, 25.5);
});
