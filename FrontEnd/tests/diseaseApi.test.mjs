import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/services/diseaseApi.js', import.meta.url), 'utf8');
const standalone = source.replace(/import\s+.*?from\s+['"].*?['"];?/g, '');
const { computeDiseaseDiagnosticFallback } = await import(`data:text/javascript;base64,${Buffer.from(standalone).toString('base64')}`);

test('computeDiseaseDiagnosticFallback returns valid diagnostic result structure', () => {
  const result = computeDiseaseDiagnosticFallback({ fileName: 'tomato_early_blight.jpg' });
  assert.equal(result.success, true);
  assert.equal(result.fallback, true);
  assert.ok(result.result);
  assert.ok(result.result.disease);
  assert.ok(typeof result.result.confidence === 'number');
  assert.ok(['low', 'moderate', 'high'].includes(result.result.severity));
  assert.ok(typeof result.result.description === 'string');
  assert.ok(Array.isArray(result.result.recommendations));
  assert.ok(result.result.recommendations.length > 0);
});

test('computeDiseaseDiagnosticFallback accurately handles healthy foliage', () => {
  const result = computeDiseaseDiagnosticFallback({ fileName: 'clean_healthy_leaf.png' });
  assert.equal(result.success, true);
  assert.match(result.result.disease, /Healthy/i);
  assert.equal(result.result.severity, 'low');
  assert.ok(result.result.confidence >= 0.9);
});

test('computeDiseaseDiagnosticFallback gracefully handles missing/empty parameters', () => {
  const result = computeDiseaseDiagnosticFallback({});
  assert.equal(result.success, true);
  assert.ok(result.result.disease);
  assert.ok(result.result.recommendations.length > 0);
});

