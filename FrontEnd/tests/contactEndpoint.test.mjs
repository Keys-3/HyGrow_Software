import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../src/utils/apiConfig.js', import.meta.url), 'utf8');
const factory = source.slice(source.indexOf('export const getContactBackendUrl =')).replace('export const ', '') + '; getContactBackendUrl();';
test('contact override applies only to local web development', () => {
 const evaluate = (development, platform) => vm.runInNewContext(factory, { URL, __DEV__: development, Platform: { OS: platform }, process: { env: { EXPO_PUBLIC_CONTACT_BACKEND_URL: 'http://localhost:3000/' } }, getBackendUrl: () => 'https://hygrow.onrender.com' });
 assert.equal(evaluate(true, 'web'), 'http://localhost:3000');
 assert.equal(evaluate(false, 'web'), 'https://hygrow.onrender.com');
 assert.equal(evaluate(false, 'android'), 'https://hygrow.onrender.com');
 assert.equal(evaluate(true, 'ios'), 'https://hygrow.onrender.com');
});

test('already-running Metro uses local contact service when its environment is stale', () => {
 const evaluate = (development, hostname) => vm.runInNewContext(factory, { URL, __DEV__: development, Platform: { OS: 'web' }, process: { env: {} }, window: { location: { hostname } }, getBackendUrl: () => 'https://hygrow.onrender.com' });
 assert.equal(evaluate(true, 'localhost'), 'http://localhost:3000');
 assert.equal(evaluate(true, '127.0.0.1'), 'http://127.0.0.1:3000');
 assert.equal(evaluate(true, 'example.com'), 'https://hygrow.onrender.com');
 assert.equal(evaluate(false, 'localhost'), 'https://hygrow.onrender.com');
});

test('dedicated HTTPS contact endpoints work in Android and iOS releases', () => {
 for (const platform of ['android', 'ios', 'web']) {
  const result = vm.runInNewContext(factory, { URL, __DEV__: false, Platform: { OS: platform }, process: { env: { EXPO_PUBLIC_CONTACT_BACKEND_URL: 'https://contact.example.com/' } }, getBackendUrl: () => 'https://hygrow.onrender.com' });
  assert.equal(result, 'https://contact.example.com');
 }
});
