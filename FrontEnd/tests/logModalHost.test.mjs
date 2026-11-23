import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
const source = fs.readFileSync(new URL('../app/(tabs)/plants.js', import.meta.url), 'utf8');
const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
const elements = [];
function walk(node) { if (!node || typeof node !== 'object') return; if (node.type === 'JSXOpeningElement') elements.push(node); for (const value of Object.values(node)) for (const child of Array.isArray(value) ? value : [value]) walk(child); }
walk(ast);
test('log forms and alerts share exactly one native modal to avoid stacked presentations on iOS', () => {
  assert.equal(elements.filter((element) => element.name?.name === 'Modal').length, 1);
  const alert = elements.find((element) => element.name?.name === 'CustomAlert');
  assert.ok(alert.attributes.some((attribute) => attribute.name?.name === 'embedded'));
  const scrolls = elements.filter((element) => element.name?.name === 'ScrollView' && element.attributes.some((attribute) => attribute.name?.name === 'style' && source.slice(attribute.value.start, attribute.value.end).includes('styles.modalBody')));
  assert.equal(scrolls.length, 5);
  assert.ok(scrolls.every((element) => element.attributes.some((attribute) => attribute.name?.name === 'keyboardShouldPersistTaps')));
});
