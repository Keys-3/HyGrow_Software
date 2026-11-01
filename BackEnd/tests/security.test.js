import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { readFile } from 'node:fs/promises';
import { IncomingMessage, ServerResponse } from 'node:http';
import { PassThrough } from 'node:stream';
import paymentRoutes from '../routes/payment.js';
import diseaseRoutes from '../routes/disease.js';
import growthRoutes from '../routes/growthPrediction.js';
import { saveTempImage, deleteTempImage, decodeImage, MAX_IMAGE_BYTES } from '../utils/tempFile.js';

async function request(app, path, body) {
  const req = new IncomingMessage(new PassThrough());
  req.method = 'POST'; req.url = path; req.headers = {}; req.body = body;
  const res = new ServerResponse(req);
  return await new Promise(resolve => {
    res.end = () => resolve({ status: res.statusCode });
    app.handle(req, res);
  });
}

test('unauthenticated requests cannot verify or refund payments or invoke paid models', async () => {
  const app = express();
  app.use('/api/payment', paymentRoutes);
  app.use('/api', diseaseRoutes);
  app.use('/growth', growthRoutes);
  for (const path of ['/api/payment/verify', '/api/payment/refund', '/api/disease-detect', '/growth']) {
    assert.equal((await request(app, path, {})).status, 401, path);
  }
});

const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

test('data URL images are decoded without treating the MIME header as image bytes', async () => {
  const file = await saveTempImage(`data:image/png;base64,${png.toString('base64')}`, 'leaf.png');
  try { assert.deepEqual(await readFile(file), png); }
  finally { await deleteTempImage(file); }
});

test('image upload rejects malformed base64 and non-image bytes', async () => {
  for (const value of ['@@not-base64', Buffer.from('hello').toString('base64')]) {
    let file;
    try {
      await assert.rejects(async () => { file = await saveTempImage(value, 'leaf.jpg'); });
    } finally { if (file) await deleteTempImage(file); }
  }
});

test('valid images at the size limit decode without a regular-expression stack overflow', () => {
  const image = Buffer.alloc(MAX_IMAGE_BYTES); png.copy(image);
  assert.equal(decodeImage(image.toString('base64')).length, MAX_IMAGE_BYTES);
  const tooLarge = Buffer.alloc(MAX_IMAGE_BYTES + 1); png.copy(tooLarge);
  assert.throws(() => decodeImage(tooLarge.toString('base64')), { status: 413 });
});
