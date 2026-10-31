import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import crypto from 'node:crypto';
import * as payment from '../routes/payment.js';
import * as email from '../routes/email.js';
import { errorHandler } from '../utils/errors.js';
import { request, authenticated } from './helpers.js';

function appFor(router) { const app = express(); app.use(router); app.use(errorHandler); return app; }

test('gateway orders use listing price and bind the authenticated buyer', async () => {
  assert.equal(typeof payment.createPaymentRouter, 'function');
  let created;
  const gateway = { orders: { create: async options => { created = options; return { id: 'order_test', ...options }; } } };
  const app = appFor(payment.createPaymentRouter({ authenticate: authenticated,
    getGateway: () => gateway, getListing: async () => ({ price: 25, stock: 5, farmer_id: 'seller', is_active: true }), keyId: () => 'test-key' }));
  const response = await request(app, '/create-order', { listingId: 'leaf', quantity: 2, amount: 0.01 });
  assert.equal(response.status, 200);
  assert.equal(created.amount, 5000);
  assert.equal(created.notes.uid, 'buyer');
  assert.equal(response.body.keyId, 'test-key');
});

test('gateway rejects invalid quantity without contacting the provider', async () => {
  assert.equal(typeof payment.createPaymentRouter, 'function');
  const app = appFor(payment.createPaymentRouter({ authenticate: authenticated, getGateway: () => { throw new Error('provider must not be called'); } }));
  for (const quantity of [0, -1, 1.2, '2', 10001]) {
    assert.equal((await request(app, '/create-order', { listingId: 'leaf', quantity })).status, 400);
  }
});

test('gateway cannot take payment for a delisted listing', async () => {
  const app = appFor(payment.createPaymentRouter({ authenticate: authenticated,
    getListing: async () => ({ price: 25, stock: 5, is_active: false }),
    getGateway: () => { throw new Error('Inactive listing must not reach the gateway'); } }));
  assert.equal((await request(app, '/create-order', { listingId: 'leaf', quantity: 1 })).status, 409);
});

test('valid signatures cannot verify another buyer payment or an uncaptured payment', async () => {
  assert.equal(typeof payment.createPaymentRouter, 'function');
  const key = 'only-a-test-key';
  const body = { razorpay_order_id: 'order_test', razorpay_payment_id: 'pay_test',
    razorpay_signature: crypto.createHmac('sha256', key).update('order_test|pay_test').digest('hex') };
  const order = { id: 'order_test', amount: 5000, currency: 'INR', notes: { uid: 'other' } };
  const gateway = { orders: { fetch: async () => order }, payments: { fetch: async () => ({ order_id: 'order_test', amount: 5000, currency: 'INR', status: 'authorized' }) } };
  const app = appFor(payment.createPaymentRouter({ authenticate: authenticated, getGateway: () => gateway, getSecret: () => key }));
  assert.equal((await request(app, '/verify', body)).status, 403);
  order.notes.uid = 'buyer';
  assert.equal((await request(app, '/verify', body)).status, 409);
});

test('only administrators can request refunds', async () => {
  assert.equal(typeof payment.createPaymentRouter, 'function');
  const app = appFor(payment.createPaymentRouter({ authenticate: authenticated }));
  assert.equal((await request(app, '/refund', { payment_id: 'pay_test' })).status, 403);
});

test('email rejects filesystem and remote URL attachments and arbitrary recipients', async () => {
  assert.equal(typeof email.createEmailRouter, 'function');
  let sent = 0;
  const app = appFor(email.createEmailRouter({ authenticate: authenticated, getTransport: () => ({ sendMail: async () => { sent++; } }), supportEmail: 'support@example.com' }));
  for (const attachment of [{ path: 'C:\\private.txt' }, { href: 'http://127.0.0.1/private' }, { raw: 'raw mail' }]) {
    assert.equal((await request(app, '/send', { to: 'support@example.com', subject: 'hello', text: 'hello', attachments: [attachment] })).status, 400);
  }
  assert.equal((await request(app, '/send', { to: 'attacker@example.com', subject: 'hello', text: 'hello' })).status, 400);
  assert.equal(sent, 0);
});

test('email sends validated in-memory images with a trusted reply address', async () => {
  assert.equal(typeof email.createEmailRouter, 'function');
  let sent;
  const app = appFor(email.createEmailRouter({ authenticate: authenticated, getTransport: () => ({ sendMail: async mail => { sent = mail; return { messageId: 'test' }; } }), supportEmail: 'support@example.com' }));
  const response = await request(app, '/send', { to: 'support@example.com', subject: 'hello', text: 'hello', replyTo: 'spoof@example.com', attachments: [{ filename: '../leaf.png', encoding: 'base64', content: Buffer.from('89504e470d0a1a0a', 'hex').toString('base64') }] });
  assert.equal(response.status, 200);
  assert.equal(sent.replyTo, 'buyer@example.com');
  assert.ok(Buffer.isBuffer(sent.attachments[0].content));
  assert.equal(sent.attachments[0].filename, 'leaf.png');
  assert.equal(sent.disableFileAccess, true);
  assert.equal(sent.disableUrlAccess, true);
});
