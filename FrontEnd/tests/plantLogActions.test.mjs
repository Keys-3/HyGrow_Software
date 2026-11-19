import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
const source = fs.readFileSync(new URL('../app/(tabs)/plants.js', import.meta.url), 'utf8');
const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
function findButton(node, handler) {
  if (!node || typeof node !== 'object') return null;
  if (node.type === 'JSXOpeningElement' && node.attributes.some((attr) => attr.name?.name === 'onPress' && attr.value?.expression?.name === handler)) return node;
  for (const value of Object.values(node)) {
    for (const child of Array.isArray(value) ? value : [value]) {
      const found = findButton(child, handler);
      if (found) return found;
    }
  }
  return null;
}
for (const handler of ['handleSyncTodayAverage', 'handleFetchTodayLogForOpenedPlant']) {
  test(handler + ' is clickable with sensors off and no live samples, and blocks duplicate saves', () => {
    const button = findButton(ast, handler);
    assert.ok(button);
    const condition = button.attributes.find((attr) => attr.name?.name === 'disabled').value.expression;
    const evaluate = (isSyncing) => vm.runInNewContext(source.slice(condition.start, condition.end), {
      dailyLogger: { isSyncing, sampleCount: 0, isOffline: true },
      isFetchingSinglePlant: false,
      openedPlant: { id: 'plant-methi' }, sensorPlant: { id: 'plant-methi' },
    });
    assert.equal(evaluate(false), false);
    assert.equal(evaluate(true), true);
  });
}
