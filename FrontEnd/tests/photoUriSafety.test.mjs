import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
test('web photo reader rejects device-only paths before making a browser request', async () => {
 const source = fs.readFileSync(new URL('../src/services/logPhotoFiles.ts', import.meta.url), 'utf8');
 let requests = 0;
 const exports = {};
 vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, fetch: () => { requests++; throw Error('unexpected fetch'); } });
 for (const uri of ['file:///data/user/0/com.prithvi.hygrow/cache/ImagePicker/photo.jpeg', 'content://media/1', 'ph://photo', 'assets-library://photo']) {
  await assert.rejects(exports.readPhotoBase64(uri), /original device/);
 }
 assert.equal(requests, 0);
});
