import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../src/services/contactMessages.js', import.meta.url), 'utf8').replace(/^import .*;$/gm, '').replace('export async function', 'async function');
function harness(fetch) {
 let timer; let cleared = 0;
 const send = vm.runInNewContext(source + ';sendContactMessage', { getContactBackendUrl: () => 'https://contact.example.com', requireBackendUrl: url => url, __DEV__: false, fetch, AbortController, TypeError, setTimeout: callback => { timer = callback; return 1; }, clearTimeout: () => { cleared++; } });
 return { send, abort: () => timer(), cleared: () => cleared };
}
test('mobile submissions send one JSON request without a Firebase token', async () => {
 let calls = 0;
 const h = harness(async (url, options) => { calls++; assert.equal(url, 'https://contact.example.com/api/contact'); assert.equal(options.headers.Authorization, undefined); assert.equal(JSON.parse(options.body).replyTo, 'user@example.com'); return { ok: true, json: async () => ({ success: true }) }; });
 assert.equal((await h.send({ subject: 'Hi', text: 'Hello', replyTo: 'user@example.com' })).success, true);
 assert.equal(calls, 1); assert.equal(h.cleared(), 1);
});
test('old hosted backend and unsuccessful responses never display false success', async () => {
 for (const status of [401, 404, 429, 503, 200]) {
  const h = harness(async () => ({ ok: status === 200, status, json: async () => ({ success: false }) }));
  await assert.rejects(h.send({}), /contact service|could not be sent/); assert.equal(h.cleared(), 1);
 }
});
test('timeout preserves uncertain delivery and does not retry the submission', async () => {
 let calls = 0;
 const h = harness(async (_, options) => { calls++; return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(Object.assign(new Error(), { name: 'AbortError' })))); });
 const pending = h.send({}); h.abort(); await assert.rejects(pending, /could not be confirmed/); assert.equal(calls, 1); assert.equal(h.cleared(), 1);
});
