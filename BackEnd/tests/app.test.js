import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from './helpers.js';
let module;
try { module = await import('../app.js'); } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
test('application exposes health and requires authentication on every sensitive API', async () => {
  assert.equal(typeof module?.createApp, 'function');
  const app = module.createApp();
  assert.equal((await request(app, '/', {}, { method: 'GET' })).status, 200);
  for (const path of ['/chat', '/api/chat', '/growth', '/api/disease-detect', '/api/email/send', '/api/payment/create-order', '/api/orders']) {
    assert.equal((await request(app, path)).status, 401, path);
  }
});
test('application rejects untrusted browser origins and returns JSON for unknown APIs', async () => {
  assert.equal(typeof module?.createApp, 'function');
  const app = module.createApp();
  assert.equal((await request(app, '/', {}, { method: 'GET', headers: { origin: 'https://attacker.invalid' } })).status, 403);
  const missing = await request(app, '/missing', {}, { method: 'GET' });
  assert.equal(missing.status, 404); assert.equal(missing.body.success, false);
});
