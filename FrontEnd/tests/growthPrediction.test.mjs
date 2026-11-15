import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/services/growthPrediction.js', import.meta.url), 'utf8');
const standalone = source.replace(/import\s+.*?from\s+['"].*?['"];?/g, '');
const { computeAgronomicGrowthFallback } = await import(`data:text/javascript;base64,${Buffer.from(standalone).toString('base64')}`);

test('computeAgronomicGrowthFallback returns expected structure for optimal conditions', () => {
  const result = computeAgronomicGrowthFallback({
    crop: 'Butterhead Lettuce',
    temperature: 23,
    humidity: 65,
    ph: 6.0,
    tds: 850,
    vpd: 0.95,
    waterTemp: 20,
    co2: 800,
    lightIntensity: 18000,
  });

  assert.equal(result.success, true);
  assert.equal(result.localSimulation, true);
  assert.ok(result.prediction);
  assert.ok(typeof result.prediction.harvestTime === 'string');
  assert.ok(typeof result.prediction.growthStatus === 'string');
  assert.ok(Array.isArray(result.prediction.recommendations));
  assert.ok(result.prediction.recommendations.length > 0);
  assert.match(result.prediction.growthStatus, /Optimal/i);
});

test('computeAgronomicGrowthFallback detects sub-optimal microclimates and provides guidance', () => {
  const result = computeAgronomicGrowthFallback({
    crop: 'Roma Tomato',
    temperature: 32, // high
    humidity: 40,   // low
    ph: 7.2,        // alkaline
    tds: 300,       // depleted
    waterTemp: 26,  // warm water
    co2: 400,
  });

  assert.equal(result.success, true);
  assert.ok(result.prediction);
  assert.match(result.prediction.growthStatus, /Stress|Active Growth/i);

  const recs = result.prediction.recommendations.join(' ');
  // Should warn on pH, temperature, TDS, VPD
  assert.match(recs, /pH/i);
  assert.match(recs, /temperature/i);
  assert.match(recs, /TDS/i);
});

test('computeAgronomicGrowthFallback safely handles empty/missing inputs with defaults', () => {
  const result = computeAgronomicGrowthFallback({});
  assert.equal(result.success, true);
  assert.ok(result.prediction.harvestTime);
  assert.ok(result.prediction.growthStatus);
  assert.ok(result.prediction.recommendations.length > 0);
});
