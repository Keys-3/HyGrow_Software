import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as profiles from '../src/utils/plantProfileData.ts';
import * as sets from '../src/utils/sensorSets.ts';
import * as averages from '../src/utils/dailySensorAveraging.ts';
import * as targets from '../src/utils/plantThresholds.ts';
import * as payload from '../src/utils/firestorePayload.ts';
const code = ts.transpileModule(fs.readFileSync(new URL('../src/hooks/usePlantProfiles.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
test('sync saves all real plant histories in bounded batches with no undefined optional fields', async () => {
  const records = {};
  for (let i = 0; i < 450; i++) {
    const plant = profiles.INITIAL_PLANT_PROFILES[i < 300 ? 0 : 1];
    const date = new Date(Date.UTC(2025, 0, i + 1)).toISOString().slice(0, 10);
    records[plant.id + '_' + date] = { plantId: plant.id, dateString: date, readings: { temperature: 24, ph: null }, source: 'cloud', timestamp: date + 'T12:00:00Z' };
  }
  const batches = [], user = { id: 'farmer', role: 'farmer', email: 'farmer@example.test' };
  const validate = (data) => { assert.notEqual(data, undefined); if (Array.isArray(data)) data.forEach(validate); else if (data && data.constructor?.name === 'Object') Object.values(data).forEach(validate); };
  class Stamp {}
  const modules = {
    react: { useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}], useEffect() {}, useMemo: (fn) => fn(), useCallback: (fn) => fn },
    '@react-native-async-storage/async-storage': { __esModule: true, default: { setItem: async () => {} } },
    'firebase/auth': { onAuthStateChanged() {} },
    'firebase/firestore': { doc: (_, ...path) => path.join('/'), serverTimestamp: () => new Stamp(), writeBatch: () => { const writes = []; return { set: (ref, data) => { validate(data); writes.push({ ref, data }); }, commit: async () => { assert.ok(writes.length <= 400); batches.push(writes); } }; } },
    '../../firebase': { auth: { currentUser: { uid: user.id } }, db: {} },
    '../store/useAppStore': { __esModule: true, default: Object.assign((selector) => selector({ user, sensorSets: sets.DEFAULT_SENSOR_SETS }), { getState: () => ({ user, sensorSets: sets.DEFAULT_SENSOR_SETS }) }) },
    '../utils/plantProfileData': profiles, '../utils/sensorSets': sets, '../utils/dailySensorAveraging': averages,
    '../utils/plantThresholds': targets, '../utils/firestorePayload': payload,
    '../services/plantLogPhotos': {}, './useDailySensorLogger': { useDailySensorLogger: () => ({ dailyRecordsMap: {} }) },
  };
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => { if (!modules[name]) throw new Error(name); return modules[name]; }, console });
  const hook = module.exports.usePlantProfiles({ dailyAveragesMap: records });
  const result = await hook.seedProfilesToDatabase();
  assert.equal(result.records, 450); assert.equal(batches.length, 2);
  const daily = batches.flat().filter((write) => write.ref.startsWith('plant_daily_logs/'));
  assert.equal(daily.length, 450);
  assert.equal(new Set(daily.map((write) => write.data.plantId)).size, 2);
});
