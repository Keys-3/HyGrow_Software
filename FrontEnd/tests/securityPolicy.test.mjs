import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../src/utils/securityPolicy.js', import.meta.url), 'utf8');
const { requireBackendUrl } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('production bearer tokens require explicit HTTPS backend configuration', () => {
 for (const url of ['', undefined, 'http://example.test', 'javascript:alert(1)', 'https://user:pass@example.test']) assert.throws(() => requireBackendUrl(url, false));
 assert.equal(requireBackendUrl('https://api.example.test', false), 'https://api.example.test');
});
test('development supports local HTTP and still rejects malformed configuration', () => {
 assert.equal(requireBackendUrl('http://192.168.1.10:3000', true), 'http://192.168.1.10:3000');
 assert.throws(() => requireBackendUrl('', true));
 assert.throws(() => requireBackendUrl('file:///private', true));
});
