import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = fs.readFileSync(new URL('../src/components/PressableScale.tsx', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
function render(os, style) {
  const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }), useRef: (value) => ({ current: value }) };
  const modules = {
    react,
    'react-native': { Platform: { OS: os }, Pressable: 'Pressable', Animated: { Value: class {}, createAnimatedComponent: () => 'AnimatedPressable' } },
    'react-native-reanimated': { useReducedMotion: () => true },
  };
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => modules[name] });
  return module.exports.default({ style, children: 'Save', disabled: true });
}
test('native and browser buttons put sizing on the touch target rather than an inner wrapper', () => {
  const style = { flex: 1, width: '100%', minHeight: 44, padding: 12 };
  for (const os of ['android', 'ios', 'web']) {
    const element = render(os, style);
    const applied = typeof element.props.style === 'function' ? element.props.style({ pressed: false }) : element.props.style;
    assert.equal(applied[0], style);
    assert.equal(element.props.children[0], 'Save');
    assert.equal(element.props.disabled, true);
  }
});
