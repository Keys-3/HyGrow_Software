import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/store/slices/authSlice.ts', import.meta.url), 'utf8');
const settings = await readFile(new URL('../src/store/slices/settingsSlice.ts', import.meta.url), 'utf8');
const defaults = settings.slice(settings.indexOf('export const createDefaultFarmerFeatures'), settings.indexOf('export const createSettingsSlice'));
const standalone = source.replace("import { createDefaultFarmerFeatures } from './settingsSlice';", '') + '\n' + defaults;
const compiled = ts.transpileModule(standalone, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { createAuthSlice } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
function makeStore() {
 let state = { sensorData: { temperature: 27 }, lastUpdated: 'today', isDeviceOnline: true,
   activeAlerts: [{ message: 'Alice sensor alert' }], adminSelectedFarmerId: 'alice', adminSelectedCustomerId: 'customer-a' };
 const set = update => Object.assign(state, typeof update === 'function' ? update(state) : update);
 Object.assign(state, createAuthSlice(set, () => state, {}));
 return state;
}
test('logout clears private telemetry, alerts, and admin selection', () => {
 const state = makeStore();
 state.logout();
 assert.equal(state.sensorData, null);
 assert.equal(state.farmerFeatures.sensors.enabled, true);
 assert.equal(state.lastUpdated, null);
 assert.equal(state.isDeviceOnline, false);
 assert.deepEqual(state.activeAlerts, []);
 assert.equal(state.adminSelectedFarmerId, null);
 assert.equal(state.adminSelectedCustomerId, null);
});
test('account switching clears old session data while profile refresh preserves current session', () => {
 const state = makeStore();
 state.login({ id: 'alice', name: 'Alice', role: 'farmer', email: 'alice@example.test' });
 state.sensorData = { temperature: 21 };
 state.login({ id: 'alice', name: 'Updated Alice', role: 'farmer', email: 'alice@example.test' });
 assert.deepEqual(state.sensorData, { temperature: 21 });
 state.login({ id: 'bob', name: 'Bob', role: 'customer', email: 'bob@example.test' });
 assert.equal(state.sensorData, null);
 assert.deepEqual(state.activeAlerts, []);
});
