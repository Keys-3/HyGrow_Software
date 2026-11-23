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

test('grouped telemetry matches the legacy sample and only the device can publish it', async () => {
 await seed('devices/farm-1', { owner_uid: 'alice', device_auth_uid: 'device-auth' });
 const flat = telemetry();
 const group = (key, readings) => ({ health: flat.sensorStatus[key], readings });
 const grouped = {
  schemaVersion: 2,
  uploadedAt: serverTimestamp(),
  sample: { bootId: flat.bootId, sequence: flat.sampleSequence, sampledUptimeMs: flat.sampledUptimeMs, ageMs: flat.sampleAgeMs, readIntervalMs: flat.readIntervalMs },
  sensors: {
   air: group('dht', { temperatureC: flat.temp_c, humidityPercent: flat.humidity, vpdKpa: flat.vpd_kpa }),
   tds: { ...group('tds', { ppm: flat.tds_ppm }), usesFallbackWaterTemperature: false },
   ph: group('ph', { value: flat.ph_val, voltageMv: flat.ph_voltage_mv }),
   waterTemperature: group('water_temp', { temperatureC: flat.water_temp_c }),
   waterLevel: group('water_level', { percent: flat.wl_percent }),
   light: group('light', { lux: flat.lux })
  }
 };
 const ref = doc(device, 'devices/farm-1');
 const upload = { ...flat, telemetry: grouped };
 await deny(updateDoc(doc(alice, 'devices/farm-1'), upload));
 await deny(updateDoc(ref, { ...upload, telemetry: { ...grouped, unexpected: true } }));
 await deny(updateDoc(ref, { ...upload, telemetry: { ...grouped, uploadedAt: new Date(0) } }));
 await deny(updateDoc(ref, { ...upload, temp_c: 99 }));
 await deny(updateDoc(ref, { ...upload, device_auth_uid: 'bob' }));
 await updateDoc(ref, upload);
 const ownerRef = doc(alice, 'devices/farm-1');
 const saved = (await getDoc(ownerRef)).data();
 assert.equal(saved.lastUpdated.isEqual(saved.telemetry.uploadedAt), true);
 assert.equal(saved.telemetry.sensors.air.readings.temperatureC, saved.temp_c);
 await deny(updateDoc(ref, { ...flat, telemetry: deleteField() }));
 // Legacy firmware can still publish after a rollback. Its update leaves the
 // grouped sample timestamp untouched, so readers can tell it is older.
 await new Promise(resolve => setTimeout(resolve, 5));
 await updateDoc(ref, { ...flat, sampleSequence: flat.sampleSequence + 1 });
 const legacy = (await getDoc(ownerRef)).data();
 assert.equal(legacy.telemetry.sample.sequence, flat.sampleSequence);
 assert.ok(legacy.lastUpdated.toMillis() > legacy.telemetry.uploadedAt.toMillis());
});

test('AI result queries must be account-scoped; clients cannot forge results', async () => {
 await seed('disease_detections/a', { owner_uid: 'alice', timestamp: now(), result: 'private' });
 await seed('disease_detections/b', { owner_uid: 'bob', timestamp: now(), result: 'private-b' });
 assert.equal((await getDocs(query(collection(alice,'disease_detections'),where('owner_uid','==','alice'),orderBy('timestamp','desc'),limit(1)))).size,1);
 await deny(getDocs(query(collection(alice,'disease_detections'),orderBy('timestamp','desc'),limit(1))));
 await deny(setDoc(doc(alice,'yield_predictions/forged'),{owner_uid:'alice',paid:true}));
 await deny(getDoc(doc(alice,'unknown/private')));
});


test('farmers can save device assignments, edit zones, and remove sensor sets', async () => {
 const ref = doc(alice, 'users/alice');
 await updateDoc(ref, {
  'preferences.deviceIdsBySet': { 'set-main': 'ESP32S3_001' },
  'preferences.sensorSets': [{ id: 'set-main', name: 'Methi', zone: 'Fenugreek bed', deviceId: 'ESP32S3_001', thresholds: { tds: { min: 600, max: 900 } } }],
 });
 assert.equal((await getDoc(ref)).data().preferences.sensorSets[0].zone, 'Fenugreek bed');
 await updateDoc(ref, { 'preferences.sensorSets': [] });
 assert.deepEqual((await getDoc(ref)).data().preferences.sensorSets, []);
 await deny(updateDoc(doc(bob, 'users/alice'), { 'preferences.sensorSets': [] }));
});

test('plant records are owned, fetchable and deletable without transferring ownership', async () => {
 for (const name of ['plant_profiles', 'plant_daily_logs', 'daily_sensor_logs', 'plant_logs']) {
  const ref = doc(alice, name, 'alice_plant-methi_2026-11-19');
  await setDoc(ref, { userId: 'alice', plantId: 'plant-methi', date: '2026-11-19' });
  assert.equal((await getDocs(query(collection(alice, name), where('userId', '==', 'alice'), where('plantId', '==', 'plant-methi')))).size, 1);
  await deny(updateDoc(ref, { userId: 'bob' }));
  await deny(deleteDoc(doc(bob, name, ref.id)));
  await deleteDoc(ref);
 }
});


test('firmware 3.1.7 nested telemetry is writable by its UID owner', async () => {
 const health = { simulated: false, state: 'healthy' };
 const payload = {
  name: 'Methi', status: 'Online', lastUpdated: new Date(Date.now() - 100),
  device: { hardwareId: 'esp32-test', firmwareVersion: '3.1.7' },
  sample: { ageMs: 100, sequence: 5, readIntervalMs: 2000, bootId: 'boot-test', sampledUptimeMs: 10000 },
  sensors: {
   dht: { ...health, temperatureC: 24, humidityPercent: 60, vpdKpa: 1.2 },
   ph: { simulated: false, state: 'disabled', value: null },
   tds: { ...health, ppm: 230 }, waterTemperature: { ...health, temperatureC: 21 },
   waterLevel: { ...health, percent: 13 }, light: { ...health, lux: 30 },
  },
 };
 const ref = doc(device, 'devices/device-auth');
 await setDoc(ref, payload);
 await updateDoc(ref, { 'sample.sequence': 6, lastUpdated: new Date() });
 assert.equal((await getDoc(ref)).data().sample.sequence, 6);
 await deny(getDoc(doc(bob, 'devices/device-auth')));
 await deny(setDoc(doc(bob, 'devices/device-auth'), payload));
});



test('signed-in farmers and admins read telemetry while customers and anonymous users are denied', async () => {
 await seed('devices/device-auth', { name: 'Methi' });
 await seed('users/farm-admin', profile('farm-admin', 'admin'));
 const farmAdmin = client('farm-admin');
 assert.equal((await getDoc(doc(alice, 'devices/device-auth'))).exists(), true);
 assert.equal((await getDoc(doc(farmAdmin, 'devices/device-auth'))).exists(), true);
 await deny(getDoc(doc(bob, 'devices/device-auth')));
 await deny(getDoc(doc(guest, 'devices/device-auth')));
 await deny(updateDoc(doc(alice, 'devices/device-auth'), { name: 'Changed by reader' }));
});


test('a managed admin profile can subscribe to the user directory without a custom claim', async () => {
 await seed('users/profile-admin', profile('profile-admin', 'admin'));
 const profileAdmin = client('profile-admin');
 assert.ok((await getDocs(collection(profileAdmin, 'users'))).size >= 3);
 await deny(getDocs(collection(alice, 'users')));
 await deny(getDocs(collection(bob, 'users')));
 await deny(updateDoc(doc(alice, 'users/alice'), { role: 'admin' }));
});


test('managed admins read all inventory and maintain farmer inventory without a custom claim', async () => {
 await seed('users/inventory-admin', profile('inventory-admin', 'admin'));
 const inventoryAdmin = client('inventory-admin');
 await seed('inventory/legacy-stock', inventory({ currency: '₹' }));
 assert.equal((await getDocs(query(collection(inventoryAdmin, 'inventory'), orderBy('created_at', 'desc')))).size, 1);
 const ref = doc(inventoryAdmin, 'inventory/new-stock');
 await setDoc(ref, inventory({ created_at: serverTimestamp(), updated_at: serverTimestamp() }));
 await updateDoc(ref, { quantity: 8, updated_at: serverTimestamp() });
 await updateDoc(doc(inventoryAdmin, 'inventory/legacy-stock'), { quantity: 7, updated_at: serverTimestamp() });
 await deny(getDocs(collection(bob, 'inventory')));
 await deny(updateDoc(ref, { farmer_id: 'bob', updated_at: serverTimestamp() }));
 await deleteDoc(ref);
});


test('managed profile admins query orders and details while customer and seller access stays scoped', async () => {
  await seed('users/order-admin', profile('order-admin', 'admin'));
  const manager = client('order-admin');
  await seed('orders/owned', { customer_id: 'bob', seller_ids: ['alice'], created_at: now(), total_amount: 100 });
  await seed('orders/private', { customer_id: 'someone-else', seller_ids: ['another-seller'], created_at: now(), total_amount: 200 });
  await seed('order_items/line', { order_id: 'owned', seller_id: 'alice' });
  await seed('order_tracking/event', { order_id: 'owned', created_at: now() });
  assert.equal((await getDocs(collection(manager, 'orders'))).size, 2);
  assert.equal((await getDocs(query(collection(manager, 'order_items'), where('order_id', '==', 'owned')))).size, 1);
  assert.equal((await getDocs(query(collection(manager, 'order_tracking'), where('order_id', '==', 'owned')))).size, 1);
  assert.equal((await getDocs(query(collection(alice, 'orders'), where('seller_ids', 'array-contains', 'alice')))).size, 1);
  assert.equal((await getDocs(query(collection(bob, 'orders'), where('customer_id', '==', 'bob')))).size, 1);
  await deny(getDocs(collection(bob, 'orders')));
  await deny(getDocs(collection(alice, 'orders')));
  await deny(getDoc(doc(bob, 'orders/private')));
  await deny(updateDoc(doc(manager, 'orders/owned'), { total_amount: 1 }));
});


test('permanent log photo chunks are private, immutable, bounded and explicitly deletable', async () => {
  const image = doc(alice, 'plant_log_photos/alice/images/photo');
  const chunk = doc(alice, 'plant_log_photos/alice/images/photo/chunks/0');
  await setDoc(image, { userId: 'alice', mimeType: 'image/jpeg', chunkCount: 1, createdAt: serverTimestamp() });
  await setDoc(chunk, { index: 0, data: 'QUJD' });
  assert.equal((await getDoc(image)).exists(), true);
  assert.equal((await getDocs(collection(alice, 'plant_log_photos/alice/images/photo/chunks'))).size, 1);
  await deny(getDoc(doc(bob, 'plant_log_photos/alice/images/photo/chunks/0')));
  await deny(setDoc(doc(bob, 'plant_log_photos/alice/images/hijack'), { userId: 'bob', mimeType: 'image/jpeg', chunkCount: 1, createdAt: serverTimestamp() }));
  await deny(updateDoc(chunk, { data: 'replacement' }));
  await deny(setDoc(doc(alice, 'plant_log_photos/alice/images/photo/chunks/1'), { index: 1, data: 'A'.repeat(700001) }));
  await deleteDoc(chunk); await deleteDoc(image);
  assert.equal((await getDoc(image)).exists(), false);
});
