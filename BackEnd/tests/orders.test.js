import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { request, authenticated } from './helpers.js';
import { errorHandler } from '../utils/errors.js';
let orders;
try { orders = await import('../routes/orders.js'); } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }

function database(initial) {
  const data = new Map(Object.entries(initial));
  let queue = Promise.resolve(); let next = 0;
  const ref = path => ({ path, id: path.split('/').at(-1) });
  const db = { data, collection: name => ({ doc: id => ref(`${name}/${id || `id${++next}`}`) }),
    runTransaction: callback => {
      const run = queue.then(async () => {
        const pending = [];
        const result = await callback({
          get: async document => ({ exists: data.has(document.path), data: () => structuredClone(data.get(document.path)), id: document.id }),
          set: (document, value) => pending.push(() => data.set(document.path, structuredClone(value))),
          update: (document, value) => pending.push(() => data.set(document.path, { ...data.get(document.path), ...structuredClone(value) })),
        });
        pending.forEach(write => write()); return result;
      });
      queue = run.catch(() => {}); return run;
    },
  }; return db;
}

const body = { items: [{ listing_id: 'leaf', quantity: 2, price_per_unit: 0.01 }], payment_method: 'COD', shipping_address: '1 Main Street', shipping_city: 'Delhi', shipping_state: 'Delhi', shipping_pincode: '110001' };
function appFor(db, deps = {}) {
  assert.equal(typeof orders?.createOrdersRouter, 'function', 'Orders must be created through the authenticated server.');
  const app = express(); app.use(orders.createOrdersRouter({ authenticate: authenticated, getDatabase: async () => db, ...deps })); app.use(errorHandler); return app;
}
const listing = { price: 25, stock: 3, farmer_id: 'seller', title: 'Lettuce', unit: 'kg', is_active: true };

test('checkout cannot purchase a delisted listing even with a known document id', async () => {
  const db = database({ 'market_listings/leaf': { ...listing, is_active: false } });
  assert.equal((await request(appFor(db), '/', body)).status, 409);
  assert.equal(db.data.get('market_listings/leaf').stock, 3);
});

test('order creation derives price and seller from listing and decrements stock atomically', async () => {
  const db = database({ 'market_listings/leaf': listing });
  const response = await request(appFor(db), '/', body);
  assert.equal(response.status, 200);
  assert.equal(response.body.order.total_amount, 50);
  assert.deepEqual(response.body.order.seller_ids, ['seller']);
  assert.equal(db.data.get('market_listings/leaf').stock, 1);
  assert.equal([...db.data.keys()].filter(key => key.startsWith('order_items/')).length, 1);
});

test('two purchases cannot oversell the same stock', async () => {
  const db = database({ 'market_listings/leaf': listing }); const app = appFor(db);
  const results = await Promise.all([request(app, '/', body), request(app, '/', body)]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  assert.equal(db.data.get('market_listings/leaf').stock, 1);
});

test('online payment can be consumed once and retry returns the same order', async () => {
  const db = database({ 'market_listings/leaf': listing });
  const checked = { payment: { id: 'pay_test', amount: 5000 }, order: { notes: { uid: 'buyer', listingId: 'leaf', quantity: '2' } } };
  const app = appFor(db, { verifyPayment: async () => checked });
  const online = { ...body, payment_method: 'ONLINE', transaction_id: 'pay_test' };
  const first = await request(app, '/', online); const second = await request(app, '/', online);
  assert.equal(first.status, 200); assert.equal(second.status, 200);
  assert.equal(first.body.order.id, second.body.order.id);
  assert.equal(db.data.get('market_listings/leaf').stock, 1);
});

test('cancel retries restore stock once and buyers cannot mark orders delivered', async () => {
  const db = database({ 'market_listings/leaf': listing }); const app = appFor(db);
  const created = await request(app, '/', body); const id = created.body.order.id;
  assert.equal((await request(app, `/${id}/status`, { status: 'delivered' }, { method: 'PATCH' })).status, 403);
  assert.equal((await request(app, `/${id}/status`, { status: 'cancelled' }, { method: 'PATCH' })).status, 200);
  assert.equal((await request(app, `/${id}/status`, { status: 'cancelled' }, { method: 'PATCH' })).status, 200);
  assert.equal(db.data.get('market_listings/leaf').stock, 3);
});

test('checkout and cancellation keep linked inventory quantity synchronized', async () => {
  const db = database({ 'market_listings/leaf': {...listing, inventory_id:'batch'}, 'inventory/batch':{quantity:3,farmer_id:'seller'} });
  const app = appFor(db);
  const created = await request(app, '/', body);
  assert.equal(created.status,200);
  assert.equal(db.data.get('inventory/batch').quantity,1);
  await request(app, `/${created.body.order.id}/status`, {status:'cancelled'}, {method:'PATCH'});
  assert.equal(db.data.get('inventory/batch').quantity,3);
});
