import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAnnualSensorLogs,
  calculateAnnualStats,
  filterAnnualLogs,
  getSeasonForDate,
  ANNUAL_CROPS,
} from '../src/utils/annualSensorLogs.ts';

test('generateAnnualSensorLogs produces 52 weekly entries spanning 365 days', () => {
  const baseDate = new Date('2026-11-16T12:00:00Z');
  const logs = generateAnnualSensorLogs({
    userId: 'farmer-test',
    userEmail: 'farmer@hygrow.local',
    baseDate,
  });

  assert.equal(logs.length, 52);

  // Newest log should be close to baseDate
  const newestLogTime = new Date(logs[0].timestamp).getTime();
  assert.equal(Math.abs(newestLogTime - baseDate.getTime()) < 60000, true);

  // Oldest log should be approximately 51-52 weeks ago (~357 days)
  const oldestLogTime = new Date(logs[51].timestamp).getTime();
  const dayDifference = (baseDate.getTime() - oldestLogTime) / (24 * 60 * 60 * 1000);
  assert.equal(dayDifference >= 350 && dayDifference <= 365, true);
});

test('every annual sensor log contains valid telemetry within realistic biological bounds', () => {
  const logs = generateAnnualSensorLogs();

  for (const log of logs) {
    assert.equal(typeof log.id, 'string');
    assert.equal(typeof log.plantName, 'string');
    assert.equal(typeof log.stage, 'string');
    assert.equal(typeof log.imageUrl, 'string');
    assert.match(log.imageUrl, /^https?:\/\//);
    assert.equal(typeof log.notes, 'string');
    assert.equal(log.notes.length > 20, true);

    const r = log.readings;
    assert.notEqual(r, null);
    assert.equal(typeof r.temperature, 'number');
    assert.equal(r.temperature >= 18 && r.temperature <= 32, true);

    assert.equal(typeof r.humidity, 'number');
    assert.equal(r.humidity >= 45 && r.humidity <= 90, true);

    assert.equal(typeof r.ph, 'number');
    assert.equal(r.ph >= 5.5 && r.ph <= 6.8, true);

    assert.equal(typeof r.ec, 'number');
    assert.equal(r.ec >= 1.0 && r.ec <= 3.0, true);

    assert.equal(typeof r.tds, 'number');
    assert.equal(r.tds >= 500 && r.tds <= 1500, true);

    assert.equal(typeof r.waterTemp, 'number');
    assert.equal(r.waterTemp >= 17 && r.waterTemp <= 25, true);

    assert.equal(typeof r.waterLevel, 'number');
    assert.equal(r.waterLevel >= 60 && r.waterLevel <= 100, true);

    assert.equal(typeof r.lightIntensity, 'number');
    assert.equal(r.lightIntensity >= 8000 && r.lightIntensity <= 30000, true);

    assert.equal(typeof r.vpd, 'number');
    assert.equal(r.vpd >= 0.6 && r.vpd <= 1.8, true);
  }
});

test('seasonal temperature variations reflect climate differences', () => {
  const baseDate = new Date('2026-11-16T12:00:00Z');
  const logs = generateAnnualSensorLogs({ baseDate });

  const summerLogs = logs.filter((l) => getSeasonForDate(new Date(l.timestamp)) === 'Summer');
  const winterLogs = logs.filter((l) => getSeasonForDate(new Date(l.timestamp)) === 'Winter');

  assert.equal(summerLogs.length >= 10, true);
  assert.equal(winterLogs.length >= 10, true);

  const avgSummerTemp = summerLogs.reduce((sum, l) => sum + (l.readings?.temperature ?? 0), 0) / summerLogs.length;
  const avgWinterTemp = winterLogs.reduce((sum, l) => sum + (l.readings?.temperature ?? 0), 0) / winterLogs.length;

  // Summer average temperature should be significantly higher than winter
  assert.equal(avgSummerTemp > avgWinterTemp + 1.5, true);
});

test('calculateAnnualStats computes correct aggregates and stage breakdown', () => {
  const baseDate = new Date('2026-11-16T12:00:00Z');
  const logs = generateAnnualSensorLogs({ baseDate });
  const stats = calculateAnnualStats(logs);

  assert.equal(stats.totalLogs, 52);
  assert.equal(stats.avgTemp >= 20 && stats.avgTemp <= 28, true);
  assert.equal(stats.avgHumidity >= 50 && stats.avgHumidity <= 75, true);
  assert.equal(stats.avgPh >= 5.8 && stats.avgPh <= 6.3, true);
  assert.equal(stats.avgEc >= 1.3 && stats.avgEc <= 2.2, true);
  assert.equal(stats.avgWaterTemp >= 19 && stats.avgWaterTemp <= 23, true);

  // All 5 stages should be present in distribution
  assert.equal(typeof stats.stageDistribution['Seedling'], 'number');
  assert.equal(typeof stats.stageDistribution['Vegetative'], 'number');
  assert.equal(typeof stats.stageDistribution['Flowering'], 'number');
  assert.equal(typeof stats.stageDistribution['Fruiting'], 'number');
  assert.equal(typeof stats.stageDistribution['Harvest Ready'], 'number');
});

test('filterAnnualLogs handles time range cutoffs, season, stage, and sorting', () => {
  const baseDate = new Date('2026-11-16T12:00:00Z');
  const logs = generateAnnualSensorLogs({ baseDate });

  // 7-day filter should match 1 or 2 entries
  const last7d = filterAnnualLogs({ logs, timeRange: '7d', now: baseDate });
  assert.equal(last7d.length >= 1 && last7d.length <= 2, true);

  // 30-day filter should match 4 to 5 entries
  const last30d = filterAnnualLogs({ logs, timeRange: '30d', now: baseDate });
  assert.equal(last30d.length >= 4 && last30d.length <= 5, true);

  // 90-day filter should match 12 to 14 entries
  const last90d = filterAnnualLogs({ logs, timeRange: '90d', now: baseDate });
  assert.equal(last90d.length >= 12 && last90d.length <= 14, true);

  // Season filter
  const springOnly = filterAnnualLogs({ logs, seasonFilter: 'Spring', now: baseDate });
  for (const l of springOnly) {
    assert.equal(getSeasonForDate(new Date(l.timestamp)), 'Spring');
  }

  // Sort by oldest first
  const oldestFirst = filterAnnualLogs({ logs, sortBy: 'oldest', now: baseDate });
  assert.equal(
    new Date(oldestFirst[0].timestamp).getTime() < new Date(oldestFirst[oldestFirst.length - 1].timestamp).getTime(),
    true
  );

  // Sort by highest temperature
  const highestTemp = filterAnnualLogs({ logs, sortBy: 'highestTemp', now: baseDate });
  assert.equal(
    (highestTemp[0].readings?.temperature ?? 0) >= (highestTemp[highestTemp.length - 1].readings?.temperature ?? 0),
    true
  );
});
