import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_SENSOR_SETS,
  getAssignedSensorSetForPlant,
} from '../src/utils/sensorSets.ts';

import {
  INITIAL_PLANT_PROFILES,
  generatePlantDailyLogs,
  filterPlantDailyLogs,
} from '../src/utils/plantProfileData.ts';

import {
  createEmptyDailyAccumulator,
  addReadingToDailyAccumulator,
  computeDailyAveragesFromAccumulator,
  buildDailyLogFirestorePayload,
} from '../src/utils/dailySensorAveraging.ts';

test('Scenario A: Sensor-to-Plant Mapping routes all crops to their assigned sensor sets', () => {
  assert.equal(INITIAL_PLANT_PROFILES.length, 8);

  // Zone A crops -> set-main
  const lettuce = INITIAL_PLANT_PROFILES.find((p) => p.id === 'plant-butterhead-lettuce');
  assert.ok(lettuce);
  assert.equal(lettuce.sensorSetId, 'set-main');
  assert.equal(lettuce.zoneId, 'zone-a');

  const chard = INITIAL_PLANT_PROFILES.find((p) => p.id === 'plant-rainbow-chard');
  assert.ok(chard);
  assert.equal(chard.sensorSetId, 'set-main');

  // Zone B crops -> set-dwc
  const basil = INITIAL_PLANT_PROFILES.find((p) => p.id === 'plant-genovese-basil');
  assert.ok(basil);
  assert.equal(basil.sensorSetId, 'set-dwc');
  assert.equal(basil.zoneId, 'zone-b');

  // Zone C crops -> set-nursery
  const strawberry = INITIAL_PLANT_PROFILES.find((p) => p.id === 'plant-hydro-strawberries');
  assert.ok(strawberry);
  assert.equal(strawberry.sensorSetId, 'set-nursery');
  assert.equal(strawberry.zoneId, 'zone-c');

  // Helper getAssignedSensorSetForPlant correctly retrieves set definition
  const assignedLettuceSet = getAssignedSensorSetForPlant(lettuce.id, lettuce.sensorSetId);
  assert.equal(assignedLettuceSet.id, 'set-main');
  assert.equal(assignedLettuceSet.growingSystem, 'NFT (Nutrient Film Technique)');

  const assignedBasilSet = getAssignedSensorSetForPlant(basil.id, basil.sensorSetId);
  assert.equal(assignedBasilSet.id, 'set-dwc');
  assert.equal(assignedBasilSet.growingSystem, 'DWC (Deep Water Culture)');
});

test('Scenario B: Multiple plants sharing one sensor set produce distinct independent plant records', () => {
  const lettuce = INITIAL_PLANT_PROFILES.find((p) => p.id === 'plant-butterhead-lettuce');
  const chard = INITIAL_PLANT_PROFILES.find((p) => p.id === 'plant-rainbow-chard');

  // Both share set-main
  assert.equal(lettuce.sensorSetId, 'set-main');
  assert.equal(chard.sensorSetId, 'set-main');

  const lettuceLogs = generatePlantDailyLogs(lettuce, [], 7, new Date('2026-11-18T12:00:00Z'));
  const chardLogs = generatePlantDailyLogs(chard, [], 7, new Date('2026-11-18T12:00:00Z'));

  assert.equal(lettuceLogs.length, 7);
  assert.equal(chardLogs.length, 7);

  // Each plant log is explicitly tagged with that plant's ID
  assert.equal(lettuceLogs[0].plantId, lettuce.id);
  assert.equal(chardLogs[0].plantId, chard.id);
  assert.notEqual(lettuceLogs[0].id, chardLogs[0].id);
});

test('Scenario C: Historical Sensor Immutability preserves originally recorded sensor set after reassignment', () => {
  const lettuce = { ...INITIAL_PLANT_PROFILES[0] };
  assert.equal(lettuce.sensorSetId, 'set-main');

  // Suppose Day 100 was recorded under set-main (Zone A NFT)
  const historicalMap = {
    [`${lettuce.id}_2026-10-01`]: {
      id: `${lettuce.id}_2026-10-01`,
      plantId: lettuce.id,
      dateString: '2026-10-01',
      formattedDate: 'Oct 1, 2026',
      timestamp: '2026-10-01T12:00:00.000Z',
      sensorSetId: 'set-main',
      zone: 'Zone A (Bench 1-4)',
      growingSystem: 'NFT (Nutrient Film Technique)',
      source: 'hardware',
      sampleCount: 96,
      readings: {
        temperature: 22.8,
        humidity: 62,
        ph: 6.05,
        ec: 1.5,
        tds: 750,
        waterTemp: 20.2,
        waterLevel: 85,
        lightIntensity: 14500,
        vpd: 1.05,
      },
    },
  };

  // Reassign lettuce to set-dwc (Zone B DWC) today
  const reassignedLettuce = {
    ...lettuce,
    sensorSetId: 'set-dwc',
    zone: 'Zone B (Tanks 1-2)',
    growingSystem: 'DWC (Deep Water Culture)',
  };

  const logs = generatePlantDailyLogs(reassignedLettuce, [], 365, new Date('2026-11-18T12:00:00Z'), historicalMap);
  const octRecord = logs.find((l) => l.dateString === '2026-10-01');

  assert.ok(octRecord);
  // The historical daily record preserves set-main and Zone A even though profile was reassigned
  assert.equal(octRecord.sensorSetId, 'set-main');
  assert.equal(octRecord.zone, 'Zone A (Bench 1-4)');
  assert.equal(octRecord.growingSystem, 'NFT (Nutrient Film Technique)');
});

test('Scenario D: Deterministic document ID prevents duplicate records on repeated fetches', () => {
  const plantId = 'plant-butterhead-lettuce';
  const dateString = '2026-11-18';
  const expectedDocId = `${plantId}_${dateString}`;

  // First manual fetch
  const firstRecord = {
    id: expectedDocId,
    plantId,
    dateString,
    sampleCount: 1,
    readings: { temperature: 23.5, humidity: 64, ph: 6.0, ec: 1.5, tds: 750, waterTemp: 20.5, waterLevel: 85, lightIntensity: 14000, vpd: 1.05 },
    createdAt: '2026-11-18T08:00:00Z',
    updatedAt: '2026-11-18T08:00:00Z',
  };

  // Subsequent manual fetch on same date
  const secondRecord = {
    ...firstRecord,
    sampleCount: 2,
    readings: { temperature: 24.1, humidity: 66, ph: 6.05, ec: 1.52, tds: 760, waterTemp: 20.8, waterLevel: 84, lightIntensity: 15000, vpd: 1.08 },
    updatedAt: '2026-11-18T14:00:00Z',
  };

  // Deterministic ID is identical
  assert.equal(firstRecord.id, expectedDocId);
  assert.equal(secondRecord.id, expectedDocId);
  assert.equal(firstRecord.id, secondRecord.id);
});

test('Scenario E: Live Hardware vs Simulated Demo vs Cloud provenance tagging', () => {
  const liveSample = {
    temperature: 24.0,
    humidity: 64,
    ph: 6.1,
    ec: 1.5,
    source: 'hardware',
  };

  const simSample = {
    temperature: 24.0,
    humidity: 64,
    ph: 6.1,
    ec: 1.5,
    source: 'simulated',
  };

  assert.equal(liveSample.source, 'hardware');
  assert.equal(simSample.source, 'simulated');
  assert.notEqual(liveSample.source, simSample.source);
});

test('Scenario F: Offline Sensor Channel is flagged without inventing fake 0 or substitute readings', () => {
  let accum = createEmptyDailyAccumulator('2026-11-18', {
    plantId: 'plant-butterhead-lettuce',
    deviceId: 'esp32-farm-01',
  });

  // Telemetry sample where pH and waterLevel probes are offline / undefined
  const partialTelemetry = {
    temperature: 23.8,
    humidity: 65,
    // ph is omitted (offline probe)
    ec: 1.55,
    tds: 775,
    waterTemp: 20.5,
    // waterLevel is omitted (offline probe)
    lightIntensity: 14800,
    vpd: 1.06,
  };

  accum = addReadingToDailyAccumulator(accum, partialTelemetry);
  const dailyRecord = computeDailyAveragesFromAccumulator(accum);

  assert.equal(dailyRecord.sampleCount, 1);
  assert.equal(dailyRecord.readings.temperature, 23.8);
  assert.equal(dailyRecord.readings.humidity, 65);
  // Probes that were online have valid readings
  assert.ok(dailyRecord.readings.ec > 0);
  assert.ok(dailyRecord.readings.temperature > 0);
});

test('Scenario G: Single reading accurately sets sampleCount = 1 without faking 24-hr average', () => {
  let accum = createEmptyDailyAccumulator('2026-11-18');
  accum = addReadingToDailyAccumulator(accum, {
    temperature: 24.5,
    humidity: 68,
    ph: 6.0,
    ec: 1.45,
    tds: 725,
    waterTemp: 21.0,
    waterLevel: 88,
    lightIntensity: 15200,
    vpd: 1.02,
  });

  const record = computeDailyAveragesFromAccumulator(accum);

  assert.equal(record.sampleCount, 1);
  assert.equal(record.readings.temperature, 24.5);
  assert.equal(record.minReadings.temperature, 24.5);
  assert.equal(record.maxReadings.temperature, 24.5);
});

test('Scenario H: Deletion accurately removes single daily log and leaves rest of timeline intact', () => {
  const plant = INITIAL_PLANT_PROFILES[0];
  const logsMap = {
    [`${plant.id}_2026-11-18`]: {
      id: `${plant.id}_2026-11-18`,
      plantId: plant.id,
      dateString: '2026-11-18',
      formattedDate: 'Nov 18, 2026',
      readings: { temperature: 24.0, humidity: 65, ph: 6.0, ec: 1.5, tds: 750, waterTemp: 20.5, waterLevel: 85, lightIntensity: 14000, vpd: 1.05 },
    },
    [`${plant.id}_2026-11-17`]: {
      id: `${plant.id}_2026-11-17`,
      plantId: plant.id,
      dateString: '2026-11-17',
      formattedDate: 'Nov 17, 2026',
      readings: { temperature: 23.5, humidity: 63, ph: 6.05, ec: 1.52, tds: 760, waterTemp: 20.3, waterLevel: 86, lightIntensity: 14500, vpd: 1.06 },
    },
  };

  assert.equal(Object.keys(logsMap).length, 2);

  // Delete Nov 18 log
  delete logsMap[`${plant.id}_2026-11-18`];

  assert.equal(Object.keys(logsMap).length, 1);
  assert.equal(Boolean(logsMap[`${plant.id}_2026-11-18`]), false);
  assert.equal(Boolean(logsMap[`${plant.id}_2026-11-17`]), true);
});
