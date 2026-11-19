import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/hooks/useOrders.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function harness(role = 'admin') {
  const values = [], subscriptions = [];
  let index = 0, deps, cleanup, authListener, user = { id: 'reader', role };
  const auth = { currentUser: null };
  const module = { exports: {} };
  const store = { user, isAuthenticated: true };
  let detailFailure = false;
  const modules = {
    react: { useState: (initial) => { const i = index++; if (!(i in values)) values[i] = initial; return [values[i], (value) => { values[i] = typeof value === 'function' ? value(values[i]) : value; }]; }, useCallback: (fn) => fn, useEffect: (fn, next) => { if (deps && next.every((value, i) => value === deps[i])) return; cleanup?.(); deps = next; cleanup = fn(); } },
    'firebase/auth': { onAuthStateChanged: (_, fn) => { authListener = fn; return () => {}; } },
    'firebase/firestore': { collection: (_, path) => path, where: (...args) => args, query: (...args) => args, orderBy: (...args) => args, Timestamp: class {},
      onSnapshot: (query, success, error) => { const item = { query, success, error, closed: false }; subscriptions.push(item); return () => { item.closed = true; }; },
      getDocs: async () => { if (detailFailure) throw Object.assign(new Error('Denied'), { code: 'permission-denied' }); return { docs: [] }; } },
    '../../firebase': { auth, db: {} },
    '../store/useAppStore': { __esModule: true, default: Object.assign((selector) => selector(store), { getState: () => store }) },
    '../utils/apiConfig': { getBackendUrl: () => '' },
  };
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => { if (!modules[name]) throw new Error(name); return modules[name]; } });
  const render = () => { index = 0; return module.exports.default(); };
  render();
  return { values, subscriptions, render, authenticate: () => { auth.currentUser = { uid: user.id }; authListener(auth.currentUser); }, denyDetails: () => { detailFailure = true; }, close: () => cleanup?.() };
}
test('orders wait for Firebase auth and farmers query parent seller ownership without a ten-order limit', async () => {
  const h = harness('farmer'); assert.equal(h.subscriptions.length, 0); h.authenticate();
  assert.equal(h.subscriptions[0].query[1][0], 'seller_ids');
  assert.equal(h.subscriptions[0].query[1][1], 'array-contains');
  await h.subscriptions[0].success({ docs: [] });
  assert.equal(h.values[0].length, 0); assert.equal(h.values[1], false); h.close();
});
test('nested detail permission errors are caught and displayed without sample orders or rejected callbacks', async () => {
  const h = harness(); h.authenticate(); h.denyDetails();
  await h.subscriptions[0].success({ docs: [{ id: 'order', data: () => ({ customer_id: 'buyer', created_at: '2026-11-19' }) }] });
  assert.equal(h.values[0].length, 0); assert.match(h.values[2], /cannot access/); assert.equal(h.values[1], false); h.close();
});
