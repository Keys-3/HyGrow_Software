import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as photoData from '../src/utils/logPhotoData.ts';
const code = ts.transpileModule(fs.readFileSync(new URL('../src/services/plantLogPhotos.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function service(records = new Map()) {
  let fail = false;
  const modules = {
    'firebase/firestore': {
      doc: (...args) => args.filter((value) => typeof value === 'string').join('/'), collection: (...args) => args.filter((value) => typeof value === 'string').join('/'), serverTimestamp: () => 'SERVER',
      getDoc: async (ref) => ({ exists: () => records.has(ref), data: () => records.get(ref) }),
      getDocs: async (path) => ({ docs: [...records].filter(([ref]) => ref.startsWith(path + '/')).map(([ref, data]) => ({ ref, data: () => data })) }),
      writeBatch: () => { const writes = []; return { set: (ref, data) => writes.push(() => records.set(ref, data)), delete: (ref) => writes.push(() => records.delete(ref)), commit: async () => { if (fail) throw new Error('Upload failed'); writes.forEach((write) => write()); } }; },
    },
    '../../firebase': { db: {}, auth: { currentUser: { uid: 'farmer' } } },
    '../utils/logPhotoData': photoData,
    './logPhotoFiles': { readPhotoBase64: async () => 'QUJD', cacheLogPhoto: async (_, base64, type) => 'data:' + type + ';base64,' + base64, removeCachedLogPhoto: async () => {}, readCachedLogPhoto: async () => null },
  };
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => modules[name] });
  return { ...module.exports, records, fail: () => { fail = true; } };
}
test('photos survive a fresh service instance and are removed only by explicit deletion', async () => {
  const first = service();
  const uri = await first.persistLogPhoto('farmer', 'photo-1', 'blob:temporary', 'QUJD');
  assert.equal(uri, 'hygrow-photo:farmer/photo-1');
  assert.ok([...first.records.values()].every((value) => !JSON.stringify(value).includes('blob:')));
  const afterRefresh = service(first.records);
  assert.equal(await afterRefresh.resolveLogPhoto(uri), 'data:image/jpeg;base64,QUJD');
  await afterRefresh.deleteLogPhoto(uri);
  assert.equal(first.records.size, 0);
  await assert.rejects(service(first.records).resolveLogPhoto(uri), /removed/);
});
test('large photos are split below the document limit and failures never report a saved image', async () => {
  const image = 'AAAA'.repeat(200000);
  const app = service(); const uri = await app.persistLogPhoto('farmer', 'large', 'file://cache/image.jpg', image);
  assert.equal(app.records.get('plant_log_photos/farmer/images/large').chunkCount, 2);
  assert.equal(await service(app.records).resolveLogPhoto(uri), 'data:image/jpeg;base64,' + image);
  const failed = service(); failed.fail(); await assert.rejects(failed.persistLogPhoto('farmer', 'failed', 'blob:temporary', 'QUJD'), /Upload failed/);
  assert.equal(failed.records.size, 0);
  assert.throws(() => photoData.splitLogPhoto('A'.repeat(7000004)), /smaller/);
});
