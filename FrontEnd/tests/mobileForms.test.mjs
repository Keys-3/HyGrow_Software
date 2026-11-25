import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
function stylesFor(path, width, os = 'android') {
  const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
  const declaration = ast.program.body.find((node) => node.type === 'VariableDeclaration' && node.declarations.some((item) => item.id.name === 'createStyles')).declarations.find((item) => item.id.name === 'createStyles');
  const factory = vm.runInNewContext('(' + source.slice(declaration.init.start, declaration.init.end) + ')', {
    StyleSheet: { create: (styles) => styles }, typography: {}, Platform: { OS: os, select: (values) => values[os] || values.default || {} },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 }, borderRadius: { sm: 8, md: 12, lg: 16, xl: 24 },
  });
  const colors = new Proxy({ adapt: (light) => light }, { get: (target, key) => target[key] ?? '#123456' });
  return factory(colors, path.includes('(auth)') ? width < 768 : width);
}
test('phone plant forms stack fields and keep nested grids within narrow modal widths', () => {
  for (const os of ['android', 'ios', 'web']) for (const width of [320, 360, 390, 430]) {
    const styles = stylesFor('../app/(tabs)/plants.js', width, os);
    assert.equal(styles.formRow.flexDirection, 'column');
    assert.equal(styles.formField.flex, undefined);
    assert.equal(styles.formField.flexBasis, 'auto');
    assert.equal(styles.formField.flexShrink, 0);
    assert.equal(styles.formInput.minWidth, 0);
    assert.equal(styles.modalFooter.flexDirection, 'row');
    assert.equal(styles.modalFooter.flexWrap, 'wrap');
    assert.equal(styles.submitBtn.minHeight, 44);
    assert.equal(styles.thresholdInput.minWidth, 0);
    if (width < 380) assert.equal(styles.thresholdCol.flexBasis, '100%');
  }
  assert.equal(stylesFor('../app/(tabs)/plants.js', 1024).formRow.flexDirection, 'row');
});
test('signup phone role cards and contact fields fit without horizontal expansion', () => {
  for (const os of ['android', 'ios', 'web']) for (const width of [320, 360, 390, 430]) {
    const styles = stylesFor('../app/(auth)/index.js', width, os);
    assert.equal(styles.roleCard.flexDirection, 'column');
    assert.equal(styles.roleCard.minWidth, 0);
    assert.equal(styles.inputWithIcon.minWidth, 0);
    assert.equal(styles.row.flexDirection, 'column');
  }
});


test('inventory and checkout fields retain natural height when stacked on narrow screens', () => {
  for (const path of ['../app/(tabs)/inventory/edit.js', '../app/(tabs)/market/[listingId].js']) {
    for (const width of [320, 360, 390, 430]) {
      const styles = stylesFor(path, width);
      assert.equal(styles.row.flexDirection, 'column');
      assert.equal(styles.formField.flexBasis, 'auto');
      assert.equal(styles.formField.flexGrow, 0);
      assert.equal(styles.formField.flexShrink, 0);
      assert.equal(styles.formField.width, '100%');
      assert.equal((styles.input || styles.textInput).minWidth, 0);
    }
  }
});
test('plant forms reference defined styles for every field and save action', () => {
  const source = fs.readFileSync(new URL('../app/(tabs)/plants.js', import.meta.url), 'utf8');
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
  const keys = new Set(), references = new Set();
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'CallExpression' && node.callee?.object?.name === 'StyleSheet' && node.callee?.property?.name === 'create') node.arguments[0]?.properties?.forEach((property) => keys.add(property.key?.name));
    if (node.type === 'MemberExpression' && node.object?.name === 'styles' && !node.computed) references.add(node.property.name);
    for (const value of Object.values(node)) for (const child of Array.isArray(value) ? value : [value]) walk(child);
  }
  walk(ast);
  assert.deepEqual([...references].filter((name) => !keys.has(name)), []);
});
