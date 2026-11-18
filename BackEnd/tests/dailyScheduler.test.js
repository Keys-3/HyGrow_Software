import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_BACKEND_SENSOR_SETS,
  getDateStringInTimezone,
  aggregateSensorTelemetry,
  dailyScheduler,
} from '../services/dailyScheduler.js';

function createMockDb(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    collection: (collName) => ({
      doc: (docId) => ({
        id: docId,
        path: `${collName}/${docId}`,
        get: async () => ({
          exists: store.has(`${collName}/${docId}`),
          data: () => structuredClone(store.get(`${collName}/${docId}`)),
        }),
        set: async (val, options = {}) => {
          const path = `${collName}/${docId}`;
          if (options.merge && store.has(path)) {
            store.set(path, { ...store.get(path), ...structuredClone(val) });
          } else {
            store.set(path, structuredClone(val));
          }
        },
        delete: async () => {
          store.delete(`${collName}/${docId}`);
        },
      }),
    }),
  };
}

test('getDateStringInTimezone formats dates in YYYY-MM-DD pattern for Asia/Kolkata', () => {
  const testDate = new Date('2026-11-18T18:30:00Z'); // 00:00 on Nov 19 in UTC+5:30
  const kolkataDate = getDateStringInTimezone('Asia/Kolkata', testDate);
  assert.equal(kolkataDate, '2026-11-19');

  const utcDate = getDateStringInTimezone('UTC', testDate);
  assert.equal(utcDate, '2026-11-18');
});

test('aggregateSensorTelemetry computes accurate mathematical averages, min, and max for multiple samples', () => {
  const samples = [
    {
      readings: {
        temperature: 22.0,
        humidity: 60,
        ph: 6.0,
        ec: 1.4,
        tds: 700,
        waterTemp: 20.0,
        waterLevel: 80,
        lightIntensity: 14000,
        vpd: 1.0,
      },
      source: 'hardware',
      timestamp: '2026-11-18T08:00:00Z',
    },
    {
      readings: {
        temperature: 26.0,
        humidity: 70,
        ph: 6.2,
        ec: 1.6,
        tds: 800,
        waterTemp: 22.0,
        waterLevel: 84,
        lightIntensity: 16000,
        vpd: 1.2,
      },
      source: 'hardware',
      timestamp: '2026-11-18T16:00:00Z',
    },
  ];

  const result = aggregateSensorTelemetry(samples, { fallbackSource: 'hardware' });

  assert.equal(result.sampleCount, 2);
  assert.equal(result.readings.temperature, 24.0);
  assert.equal(result.minReadings.temperature, 22.0);
  assert.equal(result.maxReadings.temperature, 26.0);
  assert.equal(result.readings.humidity, 65);
  assert.equal(result.minReadings.humidity, 60);
  assert.equal(result.maxReadings.humidity, 70);
  assert.equal(result.readings.ph, 6.1);
  assert.equal(result.readings.ec, 1.5);
  assert.equal(result.source, 'hardware');
  assert.equal(result.isSimulated, false);
  assert.equal(result.loggingStatus, 'complete');
  assert.equal(result.sensorStatuses.temperature, 'online');
  assert.equal(result.sensorStatuses.humidity, 'online');
  assert.equal(result.missingMetrics.length, 0);
});

test('aggregateSensorTelemetry accurately handles single sample as 1 sample without faking 24-hr average', () => {
  const singleSample = [
    {
      readings: {
        temperature: 23.5,
        humidity: 63,
        ph: 6.05,
        ec: 1.55,
        tds: 775,
        waterTemp: 20.8,
        waterLevel: 88,
        lightIntensity: 15000,
        vpd: 1.07,
      },
      source: 'hardware',
      timestamp: '2026-11-18T12:00:00Z',
    },
  ];

  const result = aggregateSensorTelemetry(singleSample);

  assert.equal(result.sampleCount, 1);
  assert.equal(result.readings.temperature, 23.5);
  assert.equal(result.minReadings.temperature, 23.5);
  assert.equal(result.maxReadings.temperature, 23.5);
  assert.equal(result.source, 'hardware');
  assert.equal(result.isSimulated, false);
});

test('aggregateSensorTelemetry flags offline sensor metrics and marks partial status', () => {
  // pH and waterLevel sensor channels offline (undefined/missing)
  const partialSample = [
    {
      readings: {
        temperature: 24.0,
        humidity: 65,
        ec: 1.5,
        tds: 750,
        waterTemp: 20.5,
        lightIntensity: 14500,
        vpd: 1.05,
      },
      source: 'hardware',
    },
  ];

  const setA = DEFAULT_BACKEND_SENSOR_SETS[0];
  const result = aggregateSensorTelemetry(partialSample, { sensorSet: setA });

  assert.equal(result.loggingStatus, 'partial');
  assert.equal(result.sensorStatuses.ph, 'offline');
  assert.equal(result.sensorStatuses.waterLevel, 'offline');
  assert.equal(result.sensorStatuses.temperature, 'online');
  assert(result.missingMetrics.includes('ph'));
  assert(result.missingMetrics.includes('waterLevel'));
});

test('aggregateSensorTelemetry distinguishes simulated fallback data', () => {
  const simulatedSample = [
    {
      readings: {
        temperature: 24.0,
        humidity: 65,
        ph: 6.0,
        ec: 1.5,
      },
      source: 'simulated',
    },
  ];

  const result = aggregateSensorTelemetry(simulatedSample);
  assert.equal(result.isSimulated, true);
  assert.equal(result.source, 'simulated');
});

test('fetchAndLogSinglePlant routes to assigned sensor set with deterministic docId', async () => {
  const mockDb = createMockDb();
  const result = await dailyScheduler.fetchAndLogSinglePlant({
    plantId: 'plant-butterhead-lettuce',
    date: '2026-11-18',
    timezone: 'Asia/Kolkata',
    db: mockDb,
  });

  assert.equal(result.success, true);
  assert.equal(result.id, 'plant-butterhead-lettuce_2026-11-18');
  assert.equal(result.sensorSetId, 'set-main');
  assert.equal(result.record.cropName, 'Butterhead Lettuce');
  assert.equal(result.record.growingSystem, 'NFT (Nutrient Film Technique)');
  assert.equal(result.record.dateString, '2026-11-18');
  assert(mockDb.store.has('plant_daily_logs/plant-butterhead-lettuce_2026-11-18'));
});

test('executeDailyPlantLogging creates records for all active sensor sets and associated crops', async () => {
  const mockDb = createMockDb();
  const result = await dailyScheduler.executeDailyPlantLogging({
    date: '2026-11-18',
    timezone: 'Asia/Kolkata',
    source: 'automated-test',
    triggeredBy: 'test-runner',
    db: mockDb,
  });

  assert.equal(result.success, true);
  assert.equal(result.sensorSetsProcessed, 3);
  // Total associated plants: 4 (set-main) + 2 (set-dwc) + 2 (set-nursery) = 8
  assert.equal(result.recordsLogged, 8);
  assert.equal(result.date, '2026-11-18');

  // Verify Zone B crop (Genovese Basil) is routed to set-dwc
  const basil = result.records.find((r) => r.plantId === 'plant-genovese-basil');
  assert.ok(basil);
  assert.equal(basil.sensorSetId, 'set-dwc');
  assert.equal(basil.growingSystem, 'DWC (Deep Water Culture)');

  // Verify Zone C crop (Hydro Strawberries) is routed to set-nursery
  const strawberry = result.records.find((r) => r.plantId === 'plant-hydro-strawberries');
  assert.ok(strawberry);
  assert.equal(strawberry.sensorSetId, 'set-nursery');

  // Verify audit record was created in logging_history
  assert(mockDb.store.has(`logging_history/${result.executionId}`));
});
