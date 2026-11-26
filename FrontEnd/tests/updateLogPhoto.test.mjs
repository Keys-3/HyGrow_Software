import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), ts = require('typescript');
const source = fs.readFileSync(new URL('../src/services/updateLogPhoto.ts', import.meta.url), 'utf8');
function harness({ owner = 'farmer', fail = false } = {}) {
 const stored = { userId: owner, plantId: 'methi', timestamp: '2026-11-26T10:00:00Z', readings: { ph: 6.1 }, imageUrl: 'hygrow-photo:farmer/old', notes: 'before' };
 const writes = [], uploads = [];
 const exports = {};
 const modules = {
  'firebase/firestore': { collection: () => 'logs', doc: (...args) => args.length === 1 ? { id: 'replacement' } : { id: args[2] }, getDoc: async () => ({ exists: () => true, data: () => stored }), setDoc: async (ref, patch, options) => { if(fail) throw Error('Write failed'); writes.push({ref, patch, options}); Object.assign(stored, patch); } },
  '../../firebase': { auth: { currentUser: { uid: 'farmer' } }, db: {} },
  './plantLogPhotos': { persistLogPhoto: async (...args) => { uploads.push(args); return 'hygrow-photo:farmer/replacement'; } },
 };
 vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {exports, require: name => modules[name]});
 return { update: exports.updateLogPhoto, stored, writes, uploads };
}
test('editing a photo replaces its image without changing its identity, day or sensor readings', async () => {
 const h = harness(); const result = await h.update('farmer', 'original', { imageUrl: 'file:///new.jpg', imageBase64: 'abc', notes: ' after ', stage: 'Harvest' });
 assert.equal(result.id, 'original'); assert.equal(result.imageUrl, 'hygrow-photo:farmer/replacement');
 assert.equal(result.timestamp, '2026-11-26T10:00:00Z'); assert.equal(result.readings.ph, 6.1); assert.equal(result.plantId, 'methi');
 assert.equal(h.writes[0].options.merge, true); assert.equal(Object.keys(h.writes[0].patch).sort().join(','), 'imageUrl,notes,stage');
 assert.equal(result.notes, 'after'); assert.equal(h.uploads.length, 1);
});
test('notes-only edits keep the existing durable image and do not re-upload it', async () => {
 const h = harness(); await h.update('farmer', 'original', { imageUrl: h.stored.imageUrl, notes: 'new note', stage: 'Vegetative' });
 assert.equal(h.uploads.length, 0); assert.equal(h.stored.imageUrl, 'hygrow-photo:farmer/old');
});
test('editing another owner or a failed save never reports a successful update', async () => {
 const other = harness({ owner: 'other' }); await assert.rejects(other.update('farmer', 'original', { notes: '', stage: 'Harvest' }), /own log photos/); assert.equal(other.writes.length, 0);
 const failed = harness({fail:true}); await assert.rejects(failed.update('farmer','original',{notes:'new',stage:'Harvest'}), /Write failed/); assert.equal(failed.stored.notes, 'before');
});
