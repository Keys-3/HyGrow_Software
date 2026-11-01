// Run against a LOCAL emulator only: FIRESTORE_EMULATOR_HOST=127.0.0.1:8787 node --test tests/firebaseRules.emulator.mjs
import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, collection, query, where, orderBy, limit, setDoc, updateDoc, deleteDoc, getDoc, getDocs, serverTimestamp, deleteField, terminate } from 'firebase/firestore';
const address = process.env.FIRESTORE_EMULATOR_HOST;
if (!/^127\.0\.0\.1:\d+$/.test(address || '')) throw new Error('Set FIRESTORE_EMULATOR_HOST to a local 127.0.0.1 port. Live Firebase access is forbidden in these tests.');
const project = 'demo-hygrow-security';
const base = `http://${address}`;
const root = `projects/${project}/databases/(default)/documents`;
const users = {};
function client(uid, claims = {}) {
 const app = initializeApp({ projectId: project, apiKey: 'emulator-only' }, `${uid}-${Object.keys(users).length}`);
 const db = getFirestore(app);
 const [host, port] = address.split(':');
 connectFirestoreEmulator(db, host, Number(port), uid ? { mockUserToken: { sub: uid, user_id: uid, email: `${uid}@example.test`, ...claims } } : {});
 users[uid || 'guest'] = { app, db };
 return db;
}
const alice = client('alice');
const bob = client('bob');
const device = client('device-auth');
const admin = client('administrator', { admin: true });
const guest = client(null);
const deny = promise => assert.rejects(promise, error => error.code === 'permission-denied');
const now = () => new Date();
function value(v) {
 if (v === null) return { nullValue: null };
 if (v instanceof Date) return { timestampValue: v.toISOString() };
 if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } };
 if (typeof v === 'object') return { mapValue: { fields: fields(v) } };
 if (typeof v === 'boolean') return { booleanValue: v };
 if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
 return { stringValue: v };
}
const fields = data => Object.fromEntries(Object.entries(data).map(([k, v]) => [k, value(v)]));
async function seed(path, data) {
 const response = await fetch(`${base}/v1/${root}:commit`, { method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ writes: [{ update: { name: `${root}/${path}`, fields: fields(data) } }] }) });
 assert.equal(response.ok, true, await response.text());
}
const profile = (uid, role = 'farmer') => ({ uid, email: `${uid}@example.test`, name: uid, role, createdAt: now() });
const inventory = (extra = {}) => ({ farmer_id: 'alice', name: 'Lettuce', description: null, category: 'vegetables', quantity: 10, unit: 'kg', price_per_unit: 20, currency: 'INR', is_listed: false, image_url: null, created_at: now(), updated_at: now(), ...extra });
const listing = (extra = {}) => ({ inventory_id: 'stock', farmer_id: 'alice', title: 'Lettuce', description: null, category: 'vegetables', price: 20, currency: 'INR', unit: 'per kg', stock: 10, image_url: null, is_active: true, farmer_name: 'Alice Farm', farmer_location: 'Town', farmer_rating: 4.5, created_at: now(), updated_at: now(), ...extra });
const telemetry = () => ({ schemaVersion: 1, deviceId: 'farm-1', hardwareId: 'ESP32-test', bootId: 'boot-1', firmwareVersion: 'test', sampleSequence: 1, sampledUptimeMs: 1000, sampleAgeMs: 0, readIntervalMs: 5000, uptime_s: 1, tds_ppm: 750, temp_c: 24, humidity: 65, water_temp_c: 20, lux: 10000, wl_percent: 80, ph_val: 6.1, ph_voltage_mv: 1400, vpd_kpa: 1, tds_comp_using_fake_water_temp: false, sensorStatus: Object.fromEntries(['water_level','light','tds','dht','ph','water_temp'].map(k => [k, { enabled: true, simulated: false, state: 'healthy' }])), status: 'Online', lastUpdated: serverTimestamp() });

beforeEach(async () => {
 const response = await fetch(`${base}/emulator/v1/${root}`, { method: 'DELETE' });
 assert.equal(response.ok, true);
 await seed('users/alice', profile('alice'));
 await seed('users/bob', profile('bob', 'customer'));
});
after(async () => { for (const { app, db } of Object.values(users)) { await terminate(db); await deleteApp(app); } });

test('private profiles allow self and signed admin; deny other accounts and unauthenticated list', async () => {
 assert.equal((await getDoc(doc(alice, 'users/alice'))).exists(), true);
 assert.equal((await getDoc(doc(admin, 'users/alice'))).exists(), true);
 await deny(getDoc(doc(bob, 'users/alice')));
 await deny(getDocs(collection(alice, 'users')));
 await deny(getDocs(collection(guest, 'users')));
});

test('signup cannot claim admin, spoof uid or add privilege fields', async () => {
 const fresh = { ...profile('device-auth'), createdAt: serverTimestamp() };
 await deny(setDoc(doc(device, 'users/device-auth'), { ...fresh, role: 'admin' }));
 await deny(setDoc(doc(device, 'users/device-auth'), { ...fresh, uid: 'alice' }));
 await deny(setDoc(doc(device, 'users/device-auth'), { ...fresh, isAdmin: true }));
 await setDoc(doc(device, 'users/device-auth'), fresh);
});

test('profile updates reject privilege changes, deleted required fields, type juggling and oversized strings', async () => {
 const ref = doc(alice, 'users/alice');
 await updateDoc(ref, { name: 'Alice Updated', preferences: { isDarkMode: true } });
 for (const update of [{ role: 'admin' }, { uid: 'bob' }, { email: 'bob@example.test' }, { createdAt: serverTimestamp() }, { name: deleteField() }, { name: 123 }, { name: 'x'.repeat(1000) }, { preferences: { farmerFeatures: { sensors: { temperature: 'yes' } } } }, { extraData: true }]) await deny(updateDoc(ref, update));
 await deny(deleteDoc(ref));
});

test('inventory enforces owner, immutable identity and bounded schema on create and update', async () => {
 const data = inventory({ created_at: serverTimestamp(), updated_at: serverTimestamp() });
 await setDoc(doc(alice, 'inventory/stock'), data);
 await updateDoc(doc(alice, 'inventory/stock'), { name: 'Fresh lettuce', updated_at: serverTimestamp() });
 await deny(getDoc(doc(bob, 'inventory/stock')));
 await deny(setDoc(doc(bob, 'inventory/hijacked'), data));
 for (const update of [{ farmer_id: 'bob' }, { quantity: -1 }, { price_per_unit: 0 }, { name: deleteField() }, { extraData: true }]) await deny(updateDoc(doc(alice, 'inventory/stock'), { ...update, updated_at: serverTimestamp() }));
});

test('marketplace queries use active denormalized listings and customers cannot mutate stock', async () => {
 await seed('inventory/stock', inventory());
 await setDoc(doc(alice, 'market_listings/leaf'), listing({ created_at: serverTimestamp(), updated_at: serverTimestamp() }));
 await seed('market_listings/private', listing({ is_active: false }));
 assert.equal((await getDocs(query(collection(bob, 'market_listings'), where('is_active','==',true), orderBy('created_at','desc')))).size, 1);
 await deny(getDocs(collection(bob, 'market_listings')));
 await deny(getDoc(doc(guest, 'market_listings/leaf')));
 await deny(updateDoc(doc(bob, 'market_listings/leaf'), { stock: 1, updated_at: serverTimestamp() }));
 await deny(updateDoc(doc(alice, 'market_listings/leaf'), { farmer_id: 'bob', updated_at: serverTimestamp() }));
 await deny(updateDoc(doc(alice, 'market_listings/leaf'), { stock: -1, updated_at: serverTimestamp() }));
});

test('orders, paid state, child records and payment consumption are server-owned', async () => {
 await seed('orders/order', { customer_id: 'bob', seller_ids: ['alice'], status: 'pending', payment_method: 'ONLINE', total_amount: 20 });
 await seed('order_items/item', { order_id: 'order', seller_id: 'alice' });
 await seed('order_tracking/track', { order_id: 'order' });
 assert.equal((await getDocs(query(collection(alice, 'orders'), where('seller_ids','array-contains','alice')))).size, 1);
 assert.equal((await getDocs(query(collection(bob, 'orders'), where('customer_id','==','bob')))).size, 1);
 assert.equal((await getDocs(query(collection(alice, 'order_items'), where('order_id','==','order')))).size, 1);
 await getDoc(doc(bob, 'order_tracking/track'));
 await deny(getDoc(doc(device, 'orders/order')));
 await deny(getDoc(doc(device, 'order_items/item')));
 for (const db of [alice,bob,admin]) {
  await deny(updateDoc(doc(db, 'orders/order'), { status: 'cancelled', payment_method: 'ONLINE', total_amount: 1 }));
  await deny(setDoc(doc(db, 'orders/fake'), { customer_id: 'bob', seller_ids: ['alice'], status: 'delivered', total_amount: 0 }));
  await deny(setDoc(doc(db, 'order_items/fake'), { order_id: 'order' }));
  await deny(setDoc(doc(db, 'order_tracking/fake'), { order_id: 'order' }));
  await deny(setDoc(doc(db, 'payment_consumptions/fake'), { paid: true }));
 }
});

test('device credential only patches provisioned device; ownership and app writes are denied', async () => {
 await seed('devices/farm-1', { owner_uid: 'alice', device_auth_uid: 'device-auth' });
 await seed('devices/farm-2', { owner_uid: 'bob', device_auth_uid: 'other-device' });
 await updateDoc(doc(device, 'devices/farm-1'), telemetry());
 await getDoc(doc(alice, 'devices/farm-1'));
 await deny(getDoc(doc(bob, 'devices/farm-1')));
 await deny(updateDoc(doc(alice, 'devices/farm-1'), { temp_c: 99, lastUpdated: serverTimestamp() }));
 await deny(updateDoc(doc(device, 'devices/farm-1'), { owner_uid: 'bob', lastUpdated: serverTimestamp() }));
 await deny(updateDoc(doc(device, 'devices/farm-1'), { device_auth_uid: 'other-device', lastUpdated: serverTimestamp() }));
 await deny(updateDoc(doc(device, 'devices/farm-2'), { ...telemetry(), deviceId: 'farm-2' }));
 await deny(setDoc(doc(device, 'devices/unprovisioned'), { owner_uid: 'alice', device_auth_uid: 'device-auth', ...telemetry() }));
 await deny(updateDoc(doc(device, 'devices/farm-1'), { ...telemetry(), sensorStatus: { tds: { enabled: true, simulated: false, state: 'healthy' } } }));
 await deny(updateDoc(doc(device, 'devices/farm-1'), { ...telemetry(), humidity: 200 }));
});

test('AI result queries must be account-scoped; clients cannot forge results', async () => {
 await seed('disease_detections/a', { owner_uid: 'alice', timestamp: now(), result: 'private' });
 await seed('disease_detections/b', { owner_uid: 'bob', timestamp: now(), result: 'private-b' });
 assert.equal((await getDocs(query(collection(alice,'disease_detections'),where('owner_uid','==','alice'),orderBy('timestamp','desc'),limit(1)))).size,1);
 await deny(getDocs(query(collection(alice,'disease_detections'),orderBy('timestamp','desc'),limit(1))));
 await deny(setDoc(doc(alice,'yield_predictions/forged'),{owner_uid:'alice',paid:true}));
 await deny(getDoc(doc(alice,'unknown/private')));
});
