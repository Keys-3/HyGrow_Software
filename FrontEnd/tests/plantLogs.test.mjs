import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_DEMO_PLANT_LOGS,
  packagePlantLogEntry,
  filterPlantLogs,
} from '../src/utils/plantLogUtils.ts';

test('initial demo plant logs have valid structure, photos, and matching readings', () => {
  assert.equal(INITIAL_DEMO_PLANT_LOGS.length >= 3, true);

  for (const log of INITIAL_DEMO_PLANT_LOGS) {
    assert.equal(typeof log.id, 'string');
    assert.equal(typeof log.plantName, 'string');
    assert.equal(typeof log.stage, 'string');
    assert.equal(typeof log.imageUrl, 'string');
    assert.match(log.imageUrl, /^https?:\/\//);
    assert.equal(typeof log.timestamp, 'string');
    assert.equal(isNaN(Date.parse(log.timestamp)), false);

    // Matching readings validation
    assert.equal(typeof log.readings, 'object');
    assert.notEqual(log.readings, null);
    assert.equal(typeof log.readings.temperature, 'number');
    assert.equal(typeof log.readings.humidity, 'number');
    assert.equal(typeof log.readings.ph, 'number');
    assert.equal(typeof log.readings.ec, 'number');
    assert.equal(typeof log.readings.waterTemp, 'number');
  }
});

test('telemetry packaging locks valid readings with an ISO timestamp', () => {
  const sampleTelemetry = {
    temperature: 24.3,
    humidity: 65,
    ph: 6.15,
    ec: 1.5,
    tds: 750,
    waterTemp: 20.8,
    waterLevel: 85,
    lightIntensity: 13000,
    vpd: 1.1,
  };

  const packaged = packagePlantLogEntry({
    userId: 'user-123',
    userEmail: 'farmer@hygrow.local',
    plantName: 'Genovese Basil',
    stage: 'Vegetative',
    notes: 'Optimal internodal spacing and healthy roots',
    imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    telemetry: sampleTelemetry,
  });

  assert.equal(packaged.plantName, 'Genovese Basil');
  assert.equal(packaged.stage, 'Vegetative');
  assert.equal(packaged.readings.temperature, 24.3);
  assert.equal(packaged.readings.humidity, 65);
  assert.equal(packaged.readings.ph, 6.15);
  assert.equal(packaged.readings.ec, 1.5);
  assert.equal(packaged.readings.waterTemp, 20.8);
  assert.equal(typeof packaged.timestamp, 'string');
  assert.equal(isNaN(Date.parse(packaged.timestamp)), false);
});

test('packagePlantLogEntry requires a plant name and accepts a log without a photo', () => {
  assert.throws(
    () =>
      packagePlantLogEntry({
        userId: 'user-123',
        plantName: '',
        imageUrl: 'http://example.com/img.jpg',
        telemetry: {},
      }),
    /Plant name is required/
  );

  const log = packagePlantLogEntry({
    userId: 'user-123',
    plantName: 'Methi',
    notes: 'First leaves emerged',
    telemetry: {},
  });
  assert.equal(log.imageUrl, '');
  assert.equal(log.notes, 'First leaves emerged');
});

test('search and growth stage filtering selects matching logs', () => {
  const logs = [
    {
      id: '1',
      userId: 'u1',
      plantName: 'Romaine Lettuce Bay 1',
      stage: 'Vegetative',
      notes: 'rapid growth',
      imageUrl: 'http://img1.jpg',
      readings: { temperature: 24, humidity: 60, ph: 6.0, ec: 1.4, tds: 700, waterTemp: 20, waterLevel: 80, lightIntensity: 12000, vpd: 1.0 },
      timestamp: new Date().toISOString(),
    },
    {
      id: '2',
      userId: 'u1',
      plantName: 'Genovese Basil',
      stage: 'Flowering',
      notes: 'sweet aroma',
      imageUrl: 'http://img2.jpg',
      readings: { temperature: 25, humidity: 65, ph: 6.2, ec: 1.6, tds: 800, waterTemp: 21, waterLevel: 82, lightIntensity: 15000, vpd: 1.1 },
      timestamp: new Date().toISOString(),
    },
    {
      id: '3',
      userId: 'u1',
      plantName: 'Cherry Tomatoes',
      stage: 'Fruiting',
      notes: 'cluster set',
      imageUrl: 'http://img3.jpg',
      readings: { temperature: 24.5, humidity: 58, ph: 5.9, ec: 2.0, tds: 1000, waterTemp: 20.5, waterLevel: 78, lightIntensity: 20000, vpd: 1.2 },
      timestamp: new Date().toISOString(),
    },
  ];

  assert.equal(filterPlantLogs(logs, 'lettuce', 'All').length, 1);
  assert.equal(filterPlantLogs(logs, 'lettuce', 'All')[0].id, '1');

  assert.equal(filterPlantLogs(logs, '', 'Flowering').length, 1);
  assert.equal(filterPlantLogs(logs, '', 'Flowering')[0].plantName, 'Genovese Basil');

  assert.equal(filterPlantLogs(logs, 'basil', 'Vegetative').length, 0);
  assert.equal(filterPlantLogs(logs, 'cluster', 'Fruiting').length, 1);
});
