import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SENSOR_SETS,
  getEffectiveSetTelemetry,
  evaluateSetAlerts as evaluateAlerts,
} from '../src/utils/sensorSets.ts';

// Explicit manual set limits; automatic crop schedules have separate coverage.
const evaluateSetAlerts = (reading, set) => evaluateAlerts(reading, { ...set, thresholdPolicy: { mode: 'manual', dayStartHour: 6, nightStartHour: 18, timeZone: 'UTC', day: set.thresholds, night: set.thresholds } }, new Date('2026-11-25T12:00:00Z'));

test('default sensor sets have valid configuration, zones, and threshold ranges', () => {
  assert.equal(DEFAULT_SENSOR_SETS.length >= 3, true);

  for (const set of DEFAULT_SENSOR_SETS) {
    assert.equal(typeof set.id, 'string');
    assert.equal(typeof set.name, 'string');
    assert.equal(typeof set.zone, 'string');
    assert.equal(typeof set.crop, 'string');
    assert.equal(typeof set.deviceId, 'string');
    assert.equal(typeof set.thresholds, 'object');

    // Thresholds must have min < max
    const { temperature, humidity, ph, ec } = set.thresholds;
    if (temperature) assert.ok(temperature.min < temperature.max);
    if (humidity) assert.ok(humidity.min < humidity.max);
    if (ph) assert.ok(ph.min < ph.max);
    if (ec) assert.ok(ec.min < ec.max);
  }
});

test('getEffectiveSetTelemetry applies calibration while preserving the actual hardware device ID', () => {
  const baseTelemetry = {
    deviceId: 'esp32-farm-01',
    hardwareId: 'hw-1',
    bootId: 'boot-1',
    sampleSequence: 10,
    sampledUptimeMs: 5000,
    sampleAgeMs: 0,
    readIntervalMs: 5000,
    source: 'cloud',
    receivedAt: Date.now(),
    uploadedAt: Date.now(),
    lastSensorTimestamp: new Date().toISOString(),
    sensorStatus: {},
    temperature: 24.0,
    humidity: 60.0,
    ph: 6.0,
    ec: 1.5,
    tds: 750,
    waterLevel: 80,
    lightIntensity: 12000,
    vpd: 1.0,
    waterTemp: 20.0,
    co2: 450,
    pumpStatus: false,
    autoMode: true,
    tdsCompensationFallback: false,
  };

  const nurserySet = DEFAULT_SENSOR_SETS.find((s) => s.id === 'set-nursery');
  assert.ok(nurserySet);

  const calibrated = getEffectiveSetTelemetry(baseTelemetry, nurserySet);
  assert.ok(calibrated);
  assert.equal(calibrated.deviceId, baseTelemetry.deviceId);
  // Nursery set has positive temperature and humidity offsets
  assert.ok(calibrated.temperature > baseTelemetry.temperature);
  assert.ok(calibrated.humidity > baseTelemetry.humidity);
});

test('evaluateSetAlerts generates alerts based on that specific set thresholds', () => {
  const testSet = {
    id: 'set-test',
    name: 'Strawberry Tower',
    zone: 'Zone D',
    crop: 'Strawberries',
    deviceId: 'esp32-strawberries',
    thresholds: {
      temperature: { min: 18.0, max: 24.0 }, // max is 24°C
      ph: { min: 5.5, max: 6.2 },
    },
  };

  const normalTelemetry = {
    temperature: 21.0,
    humidity: 60,
    ph: 5.8,
    ec: 2.0,
    tds: 1000,
    waterTemp: 19.0,
    waterLevel: 80,
    lightIntensity: 15000,
    vpd: 1.0,
  };

  const alertsNone = evaluateSetAlerts(normalTelemetry, testSet);
  assert.equal(alertsNone.length, 0);

  // Overheating Strawberry Tower (temp = 28°C > limit 24°C)
  const hotTelemetry = {
    ...normalTelemetry,
    temperature: 28.0,
  };

  const alertsHot = evaluateSetAlerts(hotTelemetry, testSet);
  assert.equal(alertsHot.length, 1);
  assert.equal(alertsHot[0].setId, 'set-test');
  assert.equal(alertsHot[0].setName, 'Strawberry Tower');
  assert.equal(alertsHot[0].sensorKey, 'temperature');
  assert.match(alertsHot[0].message, /Strawberry Tower/);
  assert.match(alertsHot[0].message, /above threshold/);
});

test('switching sets triggers distinct alerts for differing crop requirements', () => {
  // Same ambient pH of 6.5
  const sampleTelemetry = {
    temperature: 24.0,
    humidity: 65,
    ph: 6.5,
    ec: 1.4,
    tds: 700,
    waterTemp: 20.0,
    waterLevel: 80,
    lightIntensity: 14000,
    vpd: 1.0,
  };

  // Nursery requires acidic pH 5.5 - 6.2 (so 6.5 is HIGH!)
  const nurserySet = DEFAULT_SENSOR_SETS.find((s) => s.id === 'set-nursery');
  // DWC Raft allows pH up to 6.6 (so 6.5 is IN SPEC!)
  const dwcSet = DEFAULT_SENSOR_SETS.find((s) => s.id === 'set-dwc');

  assert.ok(nurserySet);
  assert.ok(dwcSet);

  const nurseryAlerts = evaluateSetAlerts(sampleTelemetry, nurserySet);
  const dwcAlerts = evaluateSetAlerts(sampleTelemetry, dwcSet);

  const nurseryPhAlert = nurseryAlerts.find((a) => a.sensorKey === 'ph');
  const dwcPhAlert = dwcAlerts.find((a) => a.sensorKey === 'ph');

  assert.ok(nurseryPhAlert, 'Nursery should flag pH 6.5 as above its maximum limit 6.2');
  assert.equal(dwcPhAlert, undefined, 'DWC Raft should accept pH 6.5 as within its 5.8 - 6.6 range');
});
