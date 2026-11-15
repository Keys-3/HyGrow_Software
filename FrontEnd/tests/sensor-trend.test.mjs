import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSensorTrend } from '../src/utils/sensorTrend.ts';

test('sensor trends preserve zero, position samples by time, and break at missing readings', () => {
  const trend = buildSensorTrend([
    { timeMs: 1000, value: 0 },
    { timeMs: 2000, value: -2 },
    { timeMs: 3000, value: null },
    { timeMs: 5000, value: 4 },
  ]);

  assert.equal(trend.durationMs, 4000);
  assert.equal(trend.min, -2);
  assert.equal(trend.max, 4);
  assert.deepEqual(trend.segments.map(points => points.map(point => point.x)), [[0, 0.25], [1]]);
});

test('steady recent readings are centered and missing readings produce no points', () => {
  const trend = buildSensorTrend([{ timeMs: 0, value: 0 }, { timeMs: 2000, value: 0 }]);
  assert.deepEqual(trend.segments[0].map(point => point.y), [0.5, 0.5]);
  assert.equal(buildSensorTrend([{ timeMs: 0, value: null }]), null);
});
