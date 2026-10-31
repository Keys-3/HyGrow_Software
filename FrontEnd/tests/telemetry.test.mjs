import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTelemetry, freshness, appendHistory, selectTelemetry, sensorNote, chartPoints, alertEligible } from '../src/utils/telemetry.ts';

const sample = (extra = {}) => ({ schemaVersion: 1, deviceId: 'grow-01', hardwareId: 'esp32-aabbccddeeff', bootId: 'boot-a', sampleSequence: 1, sampledUptimeMs: 2000, sampleAgeMs: 20, readIntervalMs: 2000,
  temp_c: 0, humidity: null, ph_val: 6, tds_ppm: 950, wl_percent: 0, lux: null, vpd_kpa: null, water_temp_c: 22,
  sensorStatus: Object.fromEntries(['dht','ph','tds','water_level','light','water_temp'].map(key => [key, { enabled: true, simulated: key === 'ph', state: 'healthy' }])),
  tds_comp_using_fake_water_temp: true, ...extra });
const read = (extra = {}, source = 'local', now = 100000) => normalizeTelemetry(sample(extra), 'grow-01', source, now);

test('canonical readings preserve null and zero without inventing EC, CO2 or actuators', () => {
  const result = read();
  assert.equal(result.temperature, 0); assert.equal(result.waterLevel, 0); assert.equal(result.humidity, null);
  assert.equal(result.tds, 950); assert.equal(result.ec, null); assert.equal(result.co2, null);
  assert.equal(result.pumpStatus, null); assert.equal(result.autoMode, null);
  assert.equal(read({temp_c: Infinity}).temperature, null);
  assert.equal(read({sensorStatus: {...sample().sensorStatus, dht: {enabled:true,simulated:false,state:'failing'}}}).temperature, null);
});
test('rejects another device, unsupported schema and malformed identities or sequencing', () => {
  for (const extra of [{ deviceId:'other' }, {schemaVersion:2}, {hardwareId:''}, {bootId:''}, {sampleSequence:-1}, {sampleSequence:1.5}, {sampleAgeMs:-1}, {readIntervalMs:0}, {readIntervalMs:3e20}]) {
    assert.throws(() => read(extra));
  }
});
test('cloud age includes elapsed server timestamp time and stale changes without another snapshot', () => {
  const cloud = read({lastUpdated:{toMillis: () => 95000}}, 'cloud');
  assert.equal(freshness(cloud,100000).sampleAgeMs,5020);
  assert.equal(freshness(cloud,106000).stale,true);
  assert.equal(freshness(read({lastUpdated:null},'cloud'),100000).stale,true);
  assert.equal(freshness(read({lastUpdated:{toMillis:()=>200000}},'cloud'),100000).stale,true);
});
test('startup and sensor failure are separate from reachable transport', () => {
  const f = freshness(read({sampleSequence:0,sampledUptimeMs:0,sampleAgeMs:null}),100000);
  assert.equal(f.stale,true); assert.equal(f.reachable,true);
  assert.equal(appendHistory([],read({sampleSequence:0,sampledUptimeMs:0,sampleAgeMs:null})).length,0);
});
test('history deduplicates same sample, ignores regressions, bounds observations and resets boot/provenance', () => {
  let history = appendHistory([],read());
  history = appendHistory(history,read({sampleAgeMs:100})); assert.equal(history.length,1);
  history = appendHistory(history,read({sampleSequence:0,sampledUptimeMs:0,sampleAgeMs:null})); assert.equal(history.length,1);
  for(let i=2;i<110;i++) history = appendHistory(history,read({sampleSequence:i}));
  assert.equal(history.length,100);
  assert.equal(appendHistory(history,read({sampleSequence:2})).length,100);
  history=appendHistory(history,read({bootId:'boot-b'})); assert.equal(history.length,1);
  history=appendHistory(history,read({bootId:'boot-b',sampleSequence:2,sensorStatus:{...sample().sensorStatus,ph:{enabled:true,simulated:false,state:'healthy'}}})); assert.equal(history.length,1);
});
test('local fresh sample wins, stale local falls back to cloud without cross-device selection', () => {
  const local=read(); const cloud=read({lastUpdated:{toMillis:()=>110000},sampleSequence:2},'cloud',110000);
  assert.equal(selectTelemetry(local,cloud,100000),local);
  assert.equal(selectTelemetry(local,cloud,111000),cloud);
  assert.equal(selectTelemetry(null,null,100000),null);
});
test('provenance labels simulation, fallback compensation and unsupported measurements', () => {
  const data=read(); assert.match(sensorNote(data,'ph'),/Simulated/);
  assert.match(sensorNote(data,'tds'),/25/); assert.match(sensorNote(data,'ec'),/Unsupported/);
});
test('chart points preserve missing positions and never coerce null to zero', () => {
  assert.deepEqual(chartPoints([null,0,'4',NaN,5]),[null,0,null,null,5]);
});
test('a reboot at startup clears the previous observation window', () => {
  assert.equal(appendHistory(appendHistory([],read()),read({bootId:'boot-b',sampleSequence:0,sampledUptimeMs:0,sampleAgeMs:null})).length,0);
});
test('alerts exclude stale, unavailable, simulated and fallback-compensated measurements', () => {
  assert.equal(alertEligible(read(),'temperature',100000),true);
  assert.equal(alertEligible(read(),'temperature',111000),false);
  assert.equal(alertEligible(read(),'humidity',100000),false);
  assert.equal(alertEligible(read(),'ph',100000),false);
  assert.equal(alertEligible(read(),'tds',100000),false);
});
