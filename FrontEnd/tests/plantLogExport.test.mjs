import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { buildPlantLogCsv } from '../src/utils/plantLogCsv.ts';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const fflate = require('fflate');
const source = fs.readFileSync(new URL('../src/utils/plantLogExport.ts', import.meta.url), 'utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: name => name === 'fflate' ? fflate : { buildPlantLogCsv }, Uint8Array, atob });
const { buildPlantLogExport } = exports;
const uri = 'hygrow-photo:farmer/one';
const data = 'data:image/png;base64,iVBORw0KGgo=';
const plant = { id: 'methi', name: '<Methi & herbs>' };
const record = { dateString: '2026-11-26', readings: { temperature: 24 }, photos: [{ id: '../one', timestamp: '2026-11-26T08:00:00Z', imageUrl: uri, notes: '<script>bad()</script>' }] };
test('export archive contains readable CSV links, real photo bytes and escaped offline gallery', () => {
 const result = buildPlantLogExport(plant, [record], { [uri]: data });
 const files = fflate.unzipSync(result.archive);
 const image = Object.keys(files).find(path => path.startsWith('photos/'));
 assert.ok(image); assert.ok(!image.includes('..'));
 assert.deepEqual([...files[image]], [...Uint8Array.from(atob(data.split(',')[1]), c => c.charCodeAt(0))]);
 assert.ok(result.csv.includes(image)); assert.ok(!result.csv.includes('base64')); assert.ok(!result.csv.includes('hygrow-photo:'));
 assert.deepEqual([...files['plant_logs.csv']], [...fflate.strToU8(result.csv)]);
 const gallery = fflate.strFromU8(files['photos.html']);
 assert.ok(gallery.includes('src="' + image + '"')); assert.ok(gallery.includes('&lt;script&gt;')); assert.ok(!gallery.includes('<script>'));
});
test('duplicate photo references export once and HTTPS photo links remain usable', () => {
 const result = buildPlantLogExport(plant, [record, { ...record, photos: [...record.photos, { id: 'online', imageUrl: 'https://example.com/image.jpg' }] }], { [uri]: data });
 const files = fflate.unzipSync(result.archive);
 assert.equal(Object.keys(files).filter(path => path.startsWith('photos/')).length, 1);
 assert.ok(result.csv.includes('https://example.com/image.jpg'));
});
test('missing photo bytes cannot silently produce a broken private link', () => {
 assert.throws(() => buildPlantLogExport(plant, [record], {}), /has not loaded/);
});
