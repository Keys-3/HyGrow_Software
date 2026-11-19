import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/hooks/useAdminUsers.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness() {
  let user = { id: 'admin-one', role: 'admin' };
  const auth = { currentUser: { uid: user.id } };
  const values = [];
  const subscriptions = [];
  let stateIndex = 0;
  let lastDeps;
  let cleanup;
  let authListener;
  const module = { exports: {} };
  const modules = {
    react: {
      useState(initial) {
        const index = stateIndex++;
        if (!(index in values)) values[index] = initial;
        return [values[index], (value) => { values[index] = typeof value === 'function' ? value(values[index]) : value; }];
      },
      useCallback: (fn) => fn,
      useEffect(fn, deps) {
        if (lastDeps && deps.every((value, index) => value === lastDeps[index])) return;
        cleanup?.();
        lastDeps = deps;
        cleanup = fn();
      },
    },
    'firebase/firestore': {
      collection: (_db, path) => path,
      onSnapshot(path, success, error) {
        const subscription = { path, success, error, closed: false };
        subscriptions.push(subscription);
        return () => { subscription.closed = true; };
      },
    },
    'firebase/auth': { onAuthStateChanged: (_auth, fn) => { authListener = fn; return () => {}; } },
    '../../firebase': { auth, db: {} },
    '../store/useAppStore': { __esModule: true, default: Object.assign((selector) => selector({ user }), { getState: () => ({ user }) }) },
  };
  vm.runInNewContext(compiled, { module, exports: module.exports, require: (name) => modules[name], setTimeout, clearTimeout });
  const render = () => { stateIndex = 0; return module.exports.default(); };
  render();
  return {
    values, subscriptions, render,
    authenticate(uid = user.id) { auth.currentUser = uid ? { uid } : null; authListener(auth.currentUser); },
    replaceProfile() { user = { ...user, name: 'Updated profile' }; render(); },
    emit(entries) { subscriptions.at(-1).success({ docs: entries.map((entry) => ({ id: entry.id, data: () => entry })) }); },
    close() { cleanup?.(); },
  };
}

test('admin directory listens after authentication and updates without a manual fetch', () => {
  const h = harness();
  assert.equal(h.subscriptions.length, 0);
  h.authenticate();
  h.emit([{ id: 'farmer-a', name: 'Farmer A', role: 'farmer', email: 'A@EXAMPLE.TEST' }]);
  assert.equal(h.values[0][0].email, 'a@example.test');
  h.emit([{ id: 'farmer-b', name: 'Farmer B', role: 'farmer' }]);
  assert.equal(h.values[0][0].id, 'farmer-b');
  assert.equal(h.values[1], false);
  h.replaceProfile();
  assert.equal(h.subscriptions.length, 1);
  h.close();
});

test('logout clears the admin directory and rejects late data from the previous session', () => {
  const h = harness();
  h.authenticate();
  const old = h.subscriptions[0];
  h.emit([{ id: 'farmer-a', role: 'farmer' }]);
  h.authenticate(null);
  assert.equal(old.closed, true);
  old.success({ docs: [{ id: 'private', data: () => ({ name: 'Late result' }) }] });
  assert.equal(h.values[0].length, 0);
  h.close();
});

test('permission failures are returned to the screen with loading cleared', () => {
  const h = harness();
  h.authenticate();
  h.emit([{ id: 'farmer-a', role: 'farmer' }]);
  h.subscriptions[0].error({ code: 'permission-denied', message: 'Missing or insufficient permissions.' });
  assert.match(h.values[2], /permission/);
  assert.equal(h.values[0].length, 0);
  assert.equal(h.values[1], false);
  h.close();
});
