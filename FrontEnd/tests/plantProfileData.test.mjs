import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_PLANT_PROFILES,
  generatePlantAnnualSensorReadings,
  generatePlantGrowthPhotos,
  generatePlantDailyLogs,
  filterPlantDailyLogs,
  calculatePlantProfileStats,
  getSeasonFromDate,
} from '../src/utils/plantProfileData.ts';

test('INITIAL_PLANT_PROFILES contains 8 valid agricultural plant profiles', () => {
  assert.equal(INITIAL_PLANT_PROFILES.length, 8);

  for (const plant of INITIAL_PLANT_PROFILES) {
    assert.equal(typeof plant.id, 'string');
    assert.equal(typeof plant.name, 'string');
    assert.equal(typeof plant.zone, 'string');
    assert.equal(typeof plant.category, 'string');
    assert.equal(typeof plant.plantingDate, 'string');
    assert.equal(typeof plant.currentStage, 'string');
    assert.match(plant.imageUrl, /^https?:\/\//);

    const thresh = plant.optimalThresholds;
    assert.notEqual(thresh, null);
    assert.equal(thresh.temperature.min < thresh.temperature.max, true);
    assert.equal(thresh.ph.min < thresh.ph.max, true);
    assert.equal(thresh.ec.min < thresh.ec.max, true);
  }
});

test('generatePlantAnnualSensorReadings creates 52 weekly sensor records for a specific plant', () => {
  const lettuce = INITIAL_PLANT_PROFILES[0];
  const readings = generatePlantAnnualSensorReadings(lettuce, new Date('2026-11-16T12:00:00Z'));

  assert.equal(readings.length, 52);

  // Newest reading should be close to base date
  assert.equal(readings[0].weekNumber, 52);
  assert.equal(readings[0].plantId, lettuce.id);

  // Oldest reading should be week 1
  assert.equal(readings[51].weekNumber, 1);
  assert.equal(readings[51].plantId, lettuce.id);

  // Every reading must contain all 9 sensor metrics
  for (const r of readings) {
    assert.equal(r.plantId, lettuce.id);
    assert.equal(typeof r.temperature, 'number');
    assert.equal(typeof r.humidity, 'number');
    assert.equal(typeof r.ph, 'number');
    assert.equal(typeof r.ec, 'number');
    assert.equal(typeof r.tds, 'number');
    assert.equal(typeof r.waterTemp, 'number');
    assert.equal(typeof r.waterLevel, 'number');
    assert.equal(typeof r.lightIntensity, 'number');
    assert.equal(typeof r.vpd, 'number');
    assert.equal(typeof r.isOptimal, 'boolean');
  }
});

test('generatePlantGrowthPhotos provides chronological progression with matching sensor telemetry', () => {
  const basil = INITIAL_PLANT_PROFILES[1];
  const photos = generatePlantGrowthPhotos(basil);

  assert.equal(photos.length >= 4, true);

  // Verify all photos have valid readings and notes
  for (const p of photos) {
    assert.equal(p.plantId, basil.id);
    assert.match(p.imageUrl, /^https?:\/\//);
    assert.equal(typeof p.notes, 'string');
    assert.equal(p.notes.length > 20, true);

    const r = p.readings;
    assert.notEqual(r, null);
    assert.equal(typeof r.temperature, 'number');
    assert.equal(typeof r.humidity, 'number');
    assert.equal(typeof r.ph, 'number');
    assert.equal(typeof r.ec, 'number');
    assert.equal(typeof r.waterTemp, 'number');
  }

  // Stages should include Seedling, Vegetative, Flowering
  const stages = photos.map((p) => p.stage);
  assert.equal(stages.includes('Seedling'), true);
  assert.equal(stages.includes('Vegetative'), true);
  assert.equal(stages.includes('Flowering'), true);
});

test('calculatePlantProfileStats computes summary for plant item profile', () => {
  const tomato = INITIAL_PLANT_PROFILES[2];
  const readings = generatePlantAnnualSensorReadings(tomato);
  const photos = generatePlantGrowthPhotos(tomato);
  const stats = calculatePlantProfileStats(readings, photos, tomato);

  assert.equal(stats.totalReadings, 52);
  assert.equal(stats.totalPhotos, photos.length);
  assert.equal(stats.avgTemp >= 20 && stats.avgTemp <= 28, true);
  assert.equal(stats.avgPh >= 5.8 && stats.avgPh <= 6.3, true);
  assert.equal(stats.avgEc >= 1.6 && stats.avgEc <= 2.5, true);
  assert.equal(stats.optimalCompliancePercent >= 60, true);
  assert.equal(stats.daysGrown >= 300, true);
});

test('generatePlantDailyLogs creates 365 day-wise continuous records with photos attached to matching days', () => {
  const lettuce = INITIAL_PLANT_PROFILES[0];
  const photos = generatePlantGrowthPhotos(lettuce, new Date('2026-11-16T12:00:00Z'));
  const dailyLogs = generatePlantDailyLogs(lettuce, photos, 365, new Date('2026-11-16T12:00:00Z'));

  assert.equal(dailyLogs.length, 365);

  // Newest day is Day 365, oldest is Day 1
  assert.equal(dailyLogs[0].dayNumber, 365);
  assert.equal(dailyLogs[0].dateString, '2026-11-16');
  assert.equal(dailyLogs[364].dayNumber, 1);

  // Check that every day contains complete sensor telemetry readings
  for (const day of dailyLogs) {
    assert.equal(day.plantId, lettuce.id);
    assert.equal(typeof day.dayNumber, 'number');
    assert.equal(typeof day.dateString, 'string');
    assert.equal(typeof day.readings.temperature, 'number');
    assert.equal(typeof day.readings.humidity, 'number');
    assert.equal(typeof day.readings.ph, 'number');
    assert.equal(typeof day.readings.ec, 'number');
    assert.equal(typeof day.readings.waterTemp, 'number');
    assert.equal(typeof day.readings.lightIntensity, 'number');
    assert.equal(Array.isArray(day.photos), true);
  }

  // Some days must have milestone photos attached!
  const daysWithPhotos = dailyLogs.filter((d) => d.photos.length > 0);
  assert.equal(daysWithPhotos.length >= 3, true);

  // Verify photos attached to that day match the day's date
  for (const day of daysWithPhotos) {
    for (const p of day.photos) {
      assert.equal(p.timestamp.startsWith(day.dateString), true);
    }
  }
});

test('filterPlantDailyLogs filters by timeframe, onlyWithPhotos, and stage', () => {
  const lettuce = INITIAL_PLANT_PROFILES[0];
  const photos = generatePlantGrowthPhotos(lettuce);
  const dailyLogs = generatePlantDailyLogs(lettuce, photos, 365);

  const past7Days = filterPlantDailyLogs(dailyLogs, { timeRange: '7d' });
  assert.equal(past7Days.length <= 8, true);

  const past30Days = filterPlantDailyLogs(dailyLogs, { timeRange: '30d' });
  assert.equal(past30Days.length <= 31, true);

  const photoDaysOnly = filterPlantDailyLogs(dailyLogs, { onlyWithPhotos: true });
  for (const d of photoDaysOnly) {
    assert.equal(d.photos.length > 0, true);
  }

  const seedlingOnly = filterPlantDailyLogs(dailyLogs, { stageFilter: 'Seedling' });
  for (const d of seedlingOnly) {
    assert.equal(d.stage, 'Seedling');
  }
});

test('plant history only shows the matching average and preserves entries without photos', () => {
  const [plant, otherPlant] = INITIAL_PLANT_PROFILES;
  const baseDate = new Date('2026-11-16T12:00:00Z');
  const date = '2026-11-16';
  const entry = {
    plantId: plant.id,
    timestamp: baseDate.toISOString(),
    imageUrl: '',
    stage: 'Seedling',
    notes: 'First leaves emerged',
  };
  const averages = {
    [date]: { plantId: otherPlant.id, readings: { temperature: 42 } },
    [`${plant.id}_${date}`]: { plantId: plant.id, readings: { temperature: 27 } },
  };
  const [logged] = generatePlantDailyLogs(plant, [entry], 1, baseDate, averages);
  const [other] = generatePlantDailyLogs(otherPlant, [entry], 1, baseDate, {
    [date]: { readings: { temperature: 27 } },
  });

  assert.equal(logged.readings.temperature, 27);
  assert.equal(logged.notes, entry.notes);
  assert.equal(logged.stage, entry.stage);
  assert.deepEqual(logged.photos, []);
  assert.notEqual(other.readings.temperature, 27);
  assert.equal(other.notes, undefined);
});
