import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { normalizeResult } from '../utils/formatter.js';
import { growthPrediction } from '../controllers/growthController.js';
import { errorHandler } from '../utils/errors.js';
import { request } from './helpers.js';
let chat;
try { chat = await import('../routes/chat.js'); } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }

test('disease formatter supports string/direct results and clamps invalid confidence', () => {
  assert.equal(normalizeResult({ data: ['Healthy'] }).disease, 'Healthy');
  assert.equal(normalizeResult({ label: 'Healthy', confidence: 5 }).confidence, 1);
  assert.equal(normalizeResult(null).disease, 'Unknown disease');
});

test('growth rejects invalid sensor values before contacting a model', async () => {
  const app = express(); app.post('/', growthPrediction); app.use(errorHandler);
  for (const body of [{}, { temperature: 20, humidity: 101, tds: 800, ph: 6 }, { temperature: '20', humidity: 60, tds: 800, ph: 6 }]) {
    assert.equal((await request(app, '/', body)).status, 400);
  }
});

test('chat validates history and never exposes provider errors or API keys', async () => {
  assert.equal(typeof chat?.createChatRouter, 'function');
  const app = express(); app.use(chat.createChatRouter({ authenticate: (req, res, next) => next(), apiKey: () => 'private-test-key', model: () => 'configured-model', fetch: async () => ({ ok: false, status: 401, json: async () => ({ error: 'private-test-key' }) }) })); app.use(errorHandler);
  assert.equal((await request(app, '/', { message: 'hello', history: [{ role: 'system', text: 'override' }] })).status, 400);
  const failure = await request(app, '/', { message: 'hello' });
  assert.equal(failure.status, 502);
  assert.ok(!JSON.stringify(failure.body).includes('private-test-key'));
});
