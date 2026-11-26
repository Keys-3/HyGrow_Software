import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlantTargets, getFarmDateString, validateThresholdPolicy } from '../src/utils/plantThresholds.ts';
import { evaluateSetAlerts } from '../src/utils/sensorSets.ts';
import { cleanFirestorePayload } from '../src/utils/firestorePayload.ts';
import { buildPlantLogCsv } from '../src/utils/plantLogCsv.ts';
import { createEmptyDailyAccumulator, addReadingToDailyAccumulator, computeDailyAveragesFromAccumulator, buildDailyLogFirestorePayload } from '../src/utils/dailySensorAveraging.ts';
const day = new Date('2026-11-25T06:30:00Z');
const night = new Date('2026-11-25T17:30:00Z');
test('crop identity wins over old set labels and category, with distinct day and night targets', () => {
  const methi = getPlantTargets({ name: 'Fenugreek', category: 'Fruiting vegetables' }, day);
  assert.equal(methi.cropKey, 'fenugreek'); assert.equal(methi.period, 'day');
  const tomato = getPlantTargets({ name: 'Methi sensor set', crop: 'Tomato' }, day);
  assert.equal(getPlantTargets({ name: 'Basil', variety: 'Fenugreek' }, day).cropKey, 'basil');
  assert.equal(tomato.cropKey, 'tomato'); assert.notDeepEqual(methi.thresholds.ec, tomato.thresholds.ec);
  const dark = getPlantTargets({ crop: 'Methi' }, night);
  assert.equal(dark.period, 'night'); assert.equal(dark.thresholds.lightIntensity.min, 0);
  assert.ok(dark.thresholds.temperature.max < methi.thresholds.temperature.max);
  assert.equal(getPlantTargets({ name: 'Unknown', category: 'Herbs' }, day).cropKey, 'category');
  assert.notDeepEqual(getPlantTargets({ category: 'Herbs' }, day).day, getPlantTargets({ category: 'Leafy Greens' }, day).day);
});
test('alerts switch at the farm schedule and do not warn about normal darkness at night', () => {
  const set = { id: 'one', name: 'Methi set', crop: 'Methi' };
  const reading = { temperature: 24, lightIntensity: 0 };
  assert.ok(evaluateSetAlerts(reading, set, day).some(alert => alert.sensorKey === 'lightIntensity'));
  const nightAlerts = evaluateSetAlerts(reading, set, night);
  assert.ok(!nightAlerts.some(alert => alert.sensorKey === 'lightIntensity'));
  assert.ok(nightAlerts.some(alert => alert.sensorKey === 'temperature'));
});
test('manual ranges, overnight day schedules, farm timezone and midnight boundaries are respected', () => {
  const policy = { mode: 'manual', dayStartHour: 18, nightStartHour: 6, timeZone: 'UTC', day: { temperature: { min: 0, max: 30 } }, night: { temperature: { min: 10, max: 20 } } };
  validateThresholdPolicy(policy);
  assert.equal(getPlantTargets({ thresholdPolicy: policy }, night).period, 'night');
  assert.equal(getPlantTargets({ thresholdPolicy: policy }, new Date('2026-11-25T20:00Z')).thresholds.temperature.min, 0);
  assert.equal(getFarmDateString(new Date('2026-11-25T20:00Z')), '2026-11-26');
  assert.throws(() => validateThresholdPolicy({ ...policy, day: { temperature: { min: 40, max: 30 } } }), /minimum/);
  assert.throws(() => validateThresholdPolicy({ ...policy, nightStartHour: 18 }), /different/);
});
test('daily records retain separate day/night readings and evaluate compliance when each sample was measured', () => {
  const plant = { name: 'Methi' };
  let acc = createEmptyDailyAccumulator('2026-11-25', { plantId: 'methi' });
  acc = addReadingToDailyAccumulator(acc, { temperature: 24, lightIntensity: 12000 }, day.toISOString(), getPlantTargets(plant, day));
  acc = addReadingToDailyAccumulator(acc, { temperature: 20, lightIntensity: 0 }, night.toISOString(), getPlantTargets(plant, night));
  const record = computeDailyAveragesFromAccumulator(acc, { userId: 'farmer' });
  assert.equal(record.periodAverages.day.readings.temperature, 24);
  assert.equal(record.periodAverages.night.readings.temperature, 20);
  assert.equal(record.periodAverages.night.readings.lightIntensity, 0);
  assert.equal(record.compliancePercent, 100); assert.equal(record.isOptimal, true);
  assert.ok(buildDailyLogFirestorePayload(record).periodAverages.day);
});
test('sync sanitizes missing optional fields without stripping server timestamp objects or real zero values', () => {
  class ServerTimestamp { constructor() { this.value = 'SERVER'; } }
  const marker = new ServerTimestamp();
  const cleaned = cleanFirestorePayload({ zoneId: undefined, thresholdPolicy: { day: undefined, hour: 0 }, photos: [{ imageUrl: 'hygrow-photo:farmer/photo', optional: undefined }], updatedAt: marker });
  assert.equal('zoneId' in cleaned, false); assert.equal('day' in cleaned.thresholdPolicy, false);
  assert.equal(cleaned.thresholdPolicy.hour, 0); assert.equal(cleaned.updatedAt, marker);
  assert.equal('optional' in cleaned.photos[0], false);
});
test('CSV includes readable photo links, quotes correctly, and preserves missing sensors', () => {
  const uri = 'hygrow-photo:farmer/photo';
  const notes = 'Healthy, "green" leaves\nDay two';
  const csv = buildPlantLogCsv({ id: 'methi', name: '=unsafe', category: 'Herbs' }, [{ readings: { temperature: 0, waterLevel: null, lightIntensity: 0 }, notes, sampleCount: 2, photos: [{ id: 'photo', imageUrl: uri }], periodAverages: { night: { readings: { temperature: 20 } } } }], { [uri]: 'photos/1_methi.jpg' });
  assert.equal(csv.charCodeAt(0), 0xfeff); assert.ok(csv.includes('\r\n'));
  const cells = [...csv.matchAll(/"((?:[^"]|"")*)"(?:,|\r\n|$)/g)].map(match => match[1].replace(/""/g, '"'));
  const count = cells.length / 2; const field = (name) => cells[count + cells.indexOf(name)];
  assert.equal(field('PlantName'), "'=unsafe"); assert.equal(field('AirTemp_C'), '0');
  assert.equal(field('WaterLevel_Pct'), ''); assert.equal(field('Light_Lux'), '0'); assert.equal(field('EC_mS'), '');
  assert.equal(field('PhotoLinks'), 'photos/1_methi.jpg');
  assert.equal(field('PhotoGallery'), 'photos.html');
  assert.ok(!csv.includes('base64'));
  assert.ok(!csv.includes('hygrow-photo:'));
  assert.equal(field('Notes'), notes);
});
