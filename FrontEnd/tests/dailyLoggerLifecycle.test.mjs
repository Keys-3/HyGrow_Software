import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import * as averages from '../src/utils/dailySensorAveraging.ts';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = fs.readFileSync(new URL('../src/hooks/useDailySensorLogger.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function harness({ deleted = false, fail = false } = {}) {
  let now = new Date(2026, 10, 19, 23, 59, 30).getTime();
  let cursor = 0, dirty = true, output, resume;
  const slots = [], effects = [], intervals = new Set(), writes = [], cache = new Map();
  const user = { id: 'farmer', email: 'farmer@example.test', role: 'farmer' };
  const date = averages.getLocalDateString(new Date(now));
  const accum = averages.addReadingToDailyAccumulator(averages.createEmptyDailyAccumulator(date, { plantId: 'plant-methi', deviceId: 'board' }), { temperature: 24, humidity: 60 }, new Date(now).toISOString());
  cache.set('hygrow_daily_sensor_accum:v2:farmer:plant-methi:board:' + date, JSON.stringify(accum));
  if (deleted) cache.set('hygrow_deleted_log_days:farmer', JSON.stringify({ ['plant-methi_' + date]: true }));
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    useState: (initial) => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], (value) => { const next = typeof value === 'function' ? value(slots[i]) : value; if (!Object.is(next, slots[i])) { slots[i] = next; dirty = true; } }]; },
    useRef: (initial) => { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useMemo: (fn, deps) => { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useCallback: (fn, deps) => react.useMemo(() => fn, deps),
    useEffect: (fn, deps) => { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { const previous = slots[i]; slots[i] = { deps }; effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = fn(); }); } },
  };
  const modules = {
    react,
    '@react-native-async-storage/async-storage': { default: { getItem: async (key) => cache.get(key) || null, setItem: async (key, value) => cache.set(key, value), getAllKeys: async () => [...cache.keys()] }, __esModule: true },
    'react-native': { AppState: { addEventListener: (_, listener) => { resume = listener; return { remove() {} }; } } },
    'firebase/firestore': { collection: (_, name) => name, doc: (_, ...path) => path.join('/'), query: (...args) => args, where: (...args) => args, onSnapshot: () => () => {}, getDocs: async () => ({ forEach() {} }), serverTimestamp: () => 'SERVER', writeBatch: () => { const changes = []; return { set: (...args) => changes.push(args), commit: async () => { if (fail) throw new Error('Network unavailable'); writes.push(changes); } }; } },
    '../../firebase': { db: {} },
    '../store/useAppStore': { default: (selector) => selector({ user, sensorSets: [] }), __esModule: true },
    './useSensorData': { default: () => ({ current: null, stale: true, deviceId: 'board' }), __esModule: true },
    '../utils/dailySensorAveraging': { ...averages, getLocalDateString: (date = new Clock()) => averages.getLocalDateString(date) },
  };
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => { if (!modules[name]) throw new Error(name); return modules[name]; }, Date: Clock, setInterval: (fn) => { intervals.add(fn); return fn; }, clearInterval: (fn) => intervals.delete(fn), console: { warn() {} } });
  async function settle() { for (let n = 0; n < 60; n++) { if (dirty) { dirty = false; cursor = 0; output = module.exports.useDailySensorLogger({ plantId: 'plant-methi', enabled: true }); while (effects.length) effects.shift()(); } await Promise.resolve(); } }
  return { settle, writes, cache, date, output: () => output, setOnline: () => { fail = false; }, advance: async (ms) => { now += ms; for (const fn of [...intervals]) fn(); await settle(); }, resume: async () => { resume?.('active'); await settle(); } };
}
test('automatic logger syncs cached samples with sensor off and rolls into the next local day', async () => {
  const h = harness(); await h.settle();
  assert.ok(h.writes.length > 0);
  assert.equal(h.writes[0].length, 3);
  assert.equal(h.writes[0][0][1].date, h.date);
  await h.advance(60_000);
  assert.notEqual(h.output().todayDateString, h.date);
});
test('automatic logger retries a failed save on resume and respects deleted daily records', async () => {
  const failed = harness({ fail: true }); await failed.settle(); assert.equal(failed.writes.length, 0);
  failed.setOnline(); await failed.resume(); assert.ok(failed.writes.length > 0);
  const deleted = harness({ deleted: true }); await deleted.settle(); assert.equal(deleted.writes.length, 0);
});


test('unfinished previous days are recovered without creating empty daily logs', async () => {
  const h = harness();
  const date = '2026-11-18';
  const old = averages.addReadingToDailyAccumulator(averages.createEmptyDailyAccumulator(date, { plantId: 'plant-methi', deviceId: 'board' }), { temperature: 22 }, date + 'T12:00:00Z');
  h.cache.set('hygrow_daily_sensor_accum:v2:farmer:plant-methi:board:' + date, JSON.stringify(old));
  await h.settle();
  assert.ok(h.writes.some((batch) => batch[0][1].date === date));
  await h.advance(60_000);
  assert.equal(h.output().todayRecord.sampleCount, 0);
  assert.ok(h.writes.every((batch) => batch[0][1].sampleCount > 0));
});
