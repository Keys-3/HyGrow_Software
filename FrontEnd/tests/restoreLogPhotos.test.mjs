import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { restoreLogPhotos, logPhotoTimestamp } from '../src/utils/restoreLogPhotos.ts';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = fs.readFileSync(new URL('../src/hooks/usePlantProfiles.ts', import.meta.url), 'utf8');
const ast = ts.createSourceFile('hook.ts', source, ts.ScriptTarget.Latest, true);
let effect;
function visit(node) { if(ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0]?.getText(ast).includes('const migrating =')) effect=node.arguments[0].getText(ast); ts.forEachChild(node, visit); }
visit(ast);
function session(initial = {}) {
 let photos = initial, stored = JSON.stringify(initial), snapshot, authListener, stopped = 0;
 const state = { user: { id: 'owner' } };
 const context = { loading: false, user: { id: 'owner', role: 'farmer' }, options: {}, auth: { currentUser: { uid: 'owner' } }, db: {},
  restoreLogPhotos, useAppStore: { getState: () => state },
  onAuthStateChanged: (_, listener) => { authListener=listener; listener({uid:'owner'}); return () => { stopped++; }; },
  query: (...args) => args, collection: () => 'logs', where: () => {},
  onSnapshot: (_, options, next) => { assert.equal(options.includeMetadataChanges, true); snapshot = next; return () => { stopped++; }; },
  setCustomPhotos: update => { photos = update(photos); },
  AsyncStorage: { setItem: async (key, value) => { stored = value; } }, PLANT_PHOTOS_CACHE_PREFIX: 'photos:', console,
 };
 const code = ts.transpileModule('const effect = ' + effect + ';effect();', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
 const cleanup = vm.runInNewContext(code, context);
 return { emit: (documents, fromCache) => snapshot({ docs: documents, metadata: { fromCache } }), get: () => photos, cache: () => JSON.parse(stored), cleanup, state, stopped: () => stopped };
}
const photo = { id: 'photo-one', plantId: 'plant-methi', timestamp: '2026-11-26T08:00:00.000Z', imageUrl: 'hygrow-photo:owner/photo-one', readings: {}, stage: 'Vegetative' };
const document = { id: photo.id, data: () => photo };
test('photo references survive refresh and sign-in before the server snapshot arrives', () => {
 let current = session({ 'plant-methi': [photo] });
 current.emit([], true); assert.equal(current.get()['plant-methi'].length, 1);
 current.emit([document], false); assert.equal(current.get()['plant-methi'][0].imageUrl, photo.imageUrl);
 const saved = current.cache(); current.cleanup();
 current = session(saved); current.emit([], true); assert.equal(current.get()['plant-methi'].length, 1);
 current.emit([document], false); assert.equal(current.get()['plant-methi'].length, 1);
 current.cleanup();
});
test('server-confirmed removal clears references, while cache misses do not', () => {
 const current = session({ 'plant-methi': [photo] });
 current.emit([], true); assert.equal(current.get()['plant-methi'].length, 1);
 current.emit([], false); assert.equal(Object.keys(current.get()).length, 0);
 current.cleanup();
});
test('late snapshots cannot overwrite another signed-in account or a disposed screen', () => {
 const current = session({ 'plant-methi': [photo] });
 current.state.user = { id: 'other' }; current.emit([], false);
 assert.equal(current.get()['plant-methi'].length, 1);
 current.state.user = { id: 'owner' }; current.cleanup(); current.emit([], false);
 assert.equal(current.get()['plant-methi'].length, 1); assert.ok(current.stopped() >= 2);
});
test('cloud Timestamp and serialized Timestamp photos retain valid daily-log timestamps', () => {
 const restored = restoreLogPhotos({}, [{ id: 'one', data: () => ({ ...photo, timestamp: { seconds: 1795680000 } }) }, { id: 'two', data: () => ({ ...photo, timestamp: { toDate: () => new Date(photo.timestamp) } }) }], false);
 assert.equal(restored['plant-methi'].length, 2);
 assert.equal(restored['plant-methi'][1].timestamp, photo.timestamp);
 assert.equal(logPhotoTimestamp({ seconds: 1795680000 }), new Date(1795680000000).toISOString());
});
