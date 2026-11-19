import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { isInventoryMarketListing } from '../src/utils/marketListings.ts';
const source = fs.readFileSync(new URL('../src/hooks/useInventory.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function harness() {
  const values = [], writes = []; let index = 0, listener, docs = [], missingInventory = false;
  const farmer = { id: 'farmer', role: 'farmer', name: 'Farm' };
  const snapshot = () => ({ docs: docs.map((data, index) => ({ id: 'listing-' + index, ref: 'market_listings/listing-' + index, data: () => data })) });
  const canonical = { id: 'stock', farmer_id: 'farmer', name: 'Real harvest', description: '', category: 'Herbs', price_per_unit: 30, quantity: 5, unit: 'kg' };
  const modules = {
    react: { useState: (initial) => { const i = index++; values[i] = initial; return [initial, (value) => { values[i] = value; }]; }, useCallback: (fn) => fn, useEffect() {} },
    'firebase/auth': { onAuthStateChanged: () => () => {} },
    'firebase/firestore': { Timestamp: class {}, collection: (_, path) => path, query: (...args) => args, where: (...args) => args, orderBy: (...args) => args,
      doc: (...args) => args.filter((value) => typeof value === 'string').join('/') || 'market_listings/new', serverTimestamp: () => 'SERVER',
      onSnapshot: (_, success, error) => { listener = { success, error }; return () => {}; }, getDocs: async () => snapshot(),
      getDoc: async () => ({ exists: () => !missingInventory, id: 'stock', data: () => canonical }),
      writeBatch: () => { const changes = []; return { set: (...args) => changes.push(['set', ...args]), update: (...args) => changes.push(['update', ...args]), delete: (...args) => changes.push(['delete', ...args]), commit: async () => writes.push(changes) }; } },
    '../../firebase': { db: {}, auth: { currentUser: { uid: 'farmer' } } },
    '../store/useAppStore': { __esModule: true, default: (selector) => selector({ user: farmer, isAuthenticated: true }) },
    '../utils/marketListings': { isInventoryMarketListing }, '../utils/produceImages': { getProduceImageUrl: () => 'image' },
  };
  const module = { exports: {} }; vm.runInNewContext(code, { module, exports: module.exports, require: (name) => { if (!modules[name]) throw new Error(name); return modules[name]; }, console });
  const hook = module.exports.default();
  return { hook, values, writes, records: (records) => { docs = records; }, emit: async () => listener.success(snapshot()), fail: () => listener.error(new Error('Unavailable')), missing: () => { missingInventory = true; } };
}
test('market stays empty without published inventory and excludes plant records', async () => {
  const h = harness(); h.hook.subscribeToMarketListings(); await h.emit(); assert.equal(h.values[1].length, 0);
  h.records([{ title: 'Methi', plantId: 'plant-methi', is_active: true }, { title: 'Published Methi', inventory_id: 'stock', farmer_id: 'farmer', is_active: true }, { inventory_id: 'stock', farmer_id: 'farmer', is_active: false }]);
  await h.emit(); assert.equal(h.values[1].length, 1); assert.equal(h.values[1][0].title, 'Published Methi');
  await h.hook.fetchMarketListings(); assert.equal(h.values[1].length, 1);
  h.fail(); assert.equal(h.values[1].length, 0); assert.equal(h.values[3], 'Unavailable');
});
test('publishing uses actual saved inventory and commits its listed flag with the listing', async () => {
  const h = harness(); await h.hook.listItemToMarket({ id: 'stock', name: 'Plant-log title' });
  assert.equal(h.writes.length, 1); assert.equal(h.writes[0].length, 2);
  assert.equal(h.writes[0][0][2].title, 'Real harvest'); assert.equal(h.writes[0][1][2].is_listed, true);
  await h.hook.unlistItemFromMarket('listing', 'stock'); assert.equal(h.writes[1].length, 2);
  h.missing(); await assert.rejects(h.hook.listItemToMarket({ id: 'plant-methi' }), /inventory item/);
});


test('deleting inventory deactivates its market listings in the same commit', async () => {
  const h = harness(); h.records([{ inventory_id: 'stock', farmer_id: 'farmer', is_active: true }]);
  await h.hook.deleteInventoryItem('stock');
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0][0][2].is_active, false);
  assert.equal(h.writes[0][1][0], 'delete');
  assert.equal(h.writes[0][1][1], 'inventory/stock');
});
