import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import * as telemetry from '../src/utils/telemetry.ts';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const source=fs.readFileSync(new URL('../src/hooks/useSensorData.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const sample=(extra={})=>({schemaVersion:1,deviceId:'grow-01',hardwareId:'esp32-aabb',bootId:'boot-a',sampleSequence:1,sampledUptimeMs:2000,sampleAgeMs:20,readIntervalMs:2000,temp_c:24,humidity:60,ph_val:6,tds_ppm:950,wl_percent:0,lux:null,vpd_kpa:1,water_temp_c:22,sensorStatus:Object.fromEntries(['dht','ph','tds','water_level','light','water_temp'].map(key=>[key,{enabled:true,simulated:false,state:'healthy'}])),tds_comp_using_fake_water_temp:false,...extra});
const flush=async()=>{for(let i=0;i<15;i++) await Promise.resolve();};
function harness({deviceId='grow-01',localUrl='',fetcher=async()=>({ok:true,json:async()=>sample()})}={}) {
  let now=100000,id=0,snapshot,appListener,authListener;
  const timers=new Map(),effects=[],paths=[],cloudSubscriptions=[],requests=[];
  let store={sensorData:null,isDeviceOnline:false};
  const settingsListeners = new Set();
  const settingsListener = () => settingsListeners.forEach(fn => fn());
  const storeApi={subscribe:fn=>{settingsListeners.add(fn);return()=>settingsListeners.delete(fn);},getState:()=>({...store,updateSensorData:data=>{store.sensorData=data;},clearSensorData:()=>{store.sensorData=null;store.isDeviceOnline=false;},setDeviceOnline:online=>{store.isDeviceOnline=online;}})};
  const modules={
    react:{useSyncExternalStore:(_subscribe,get)=>{snapshot=get;return get();},useEffect:fn=>effects.push(fn())},
    'firebase/firestore':{doc:(_db,...path)=>{paths.push(path);return path;},onSnapshot:(path,_options,success,error)=>{const subscription={path,success,error,closed:false};cloudSubscriptions.push(subscription);return()=>{subscription.closed=true;};}},
    'firebase/auth':{onAuthStateChanged:(_auth,callback)=>{authListener=callback;return()=>{};}},
    'react-native':{AppState:{currentState:'active',addEventListener:(_event,callback)=>{appListener=callback;return{remove(){}};}}},
    '../../firebase':{auth:{currentUser:{uid:'owner'}},db:{}},
    '../store/useAppStore':{default:storeApi,__esModule:true},
    '../utils/telemetry':telemetry,
  };
  class Clock extends Date { constructor(...args){super(...(args.length?args:[now]));} static now(){return now;} }
  const setTimer=(fn,delay,repeat=false)=>{const key=++id;timers.set(key,{fn,at:now+delay,delay,repeat});return key;};
  const module={exports:{}};
  vm.runInNewContext(code,{module,exports:module.exports,require:name=>{if(!(name in modules))throw new Error(`Unexpected import ${name}`);return modules[name];},Date:Clock,URL,AbortController,process:{env:{EXPO_PUBLIC_DEVICE_ID:deviceId,EXPO_PUBLIC_LOCAL_STATUS_URL:localUrl}},fetch:(url,options)=>{requests.push({url,options});return fetcher(url,options);},setTimeout:(fn,delay)=>setTimer(fn,delay),clearTimeout:key=>timers.delete(key),setInterval:(fn,delay)=>setTimer(fn,delay,true),clearInterval:key=>timers.delete(key),console});
  const mount=(setId)=>module.exports.default(setId);mount();
  return {resolve: module.exports.resolveSensorDeviceId,
    configureSets: (activeSensorSetId) => {
      store.activeSensorSetId = activeSensorSetId;
      store.deviceIdsBySet = { owner: { 'set-main': 'methi-esp', 'set-dwc': 'basil-esp' } };
      settingsListener();
    },
    selectDevice:(id,uid="owner")=>{store.deviceIds={...store.deviceIds,[uid]:id};settingsListener();},snapshot:()=>snapshot(),mount,paths,cloudSubscriptions,requests,store,
    emit:(raw,metadata={hasPendingWrites:false,fromCache:false})=>cloudSubscriptions.findLast(sub=>!sub.closed)?.success({exists:()=>raw!==null,data:()=>raw,metadata}),
    auth:uid=>authListener(uid?{uid}:null),app:next=>appListener(next),
    async advance(ms){const until=now+ms;while(true){const entry=[...timers].filter(([,timer])=>timer.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)break;const[key,timer]=entry;now=timer.at;if(timer.repeat)timer.at+=timer.delay;else timers.delete(key);timer.fn();await flush();}now=until;await flush();},
    unmount:()=>effects.pop()?.(),close:()=>{while(effects.length)effects.pop()?.();},
  };
}

test('one shared subscription selects only the configured devices document',()=>{
  const h=harness();h.mount();
  assert.equal(h.cloudSubscriptions.length,1);assert.deepEqual(h.paths[0],['devices','grow-01']);
  h.emit(sample({lastUpdated:{toMillis:()=>100000}}));
  assert.equal(h.snapshot().current.tds,950);assert.equal(h.snapshot().history.length,1);
  h.unmount();assert.equal(h.cloudSubscriptions[0].closed,false);h.close();assert.equal(h.cloudSubscriptions[0].closed,false);
});
test('missing configuration produces an actionable error and no global query',()=>{
  const h=harness({deviceId:''});assert.equal(h.paths.length,0);assert.match(h.snapshot().error,/Settings/);assert.equal(h.snapshot().current,null);h.close();
});
test('cloud history stays empty for missing documents and null stays null',()=>{
  const h=harness();h.emit(null);assert.equal(h.snapshot().history.length,0);assert.match(h.snapshot().error,/No telemetry document/);
  h.emit(sample({temp_c:null,lastUpdated:{toMillis:()=>100000}}));assert.equal(h.snapshot().current.temperature,null);h.close();
});
test('stale timer advances without a new cloud snapshot; duplicate uploads do not invent samples',async()=>{
  const h=harness();h.emit(sample({lastUpdated:{toMillis:()=>100000}}));
  h.emit(sample({lastUpdated:{toMillis:()=>100000}}));assert.equal(h.snapshot().history.length,1);
  await h.advance(31000);assert.equal(h.snapshot().stale,true);await h.advance(80000);assert.equal(h.store.isDeviceOnline,false);h.close();
});
test('configured HTTP is preferred; lifecycle pauses polling and resumes immediately',async()=>{
  const h=harness({localUrl:'http://192.168.0.42/status'});await flush();
  h.emit(sample({temp_c:29,lastUpdated:{toMillis:()=>100000}}));assert.equal(h.snapshot().source,'local');assert.equal(h.snapshot().current.temperature,24);
  h.app('background');const count=h.requests.length;await h.advance(30000);assert.equal(h.requests.length,count);
  h.app('active');await flush();assert.equal(h.requests.length,count+1);h.close();
});
test('HTTP timeout keeps one request in flight and falls back to authenticated cloud',async()=>{
  const h=harness({localUrl:'http://192.168.0.42/status',fetcher:()=>new Promise(()=>{})});
  h.emit(sample({lastUpdated:{toMillis:()=>100000}}));await h.advance(1999);assert.equal(h.requests.length,1);
  await h.advance(1);assert.match(h.snapshot().localError,/timed out/);assert.equal(h.snapshot().source,'cloud');assert.equal(h.requests[0].options.signal.aborted,true);
  await h.advance(1999);assert.equal(h.requests.length,1);await h.advance(1);assert.equal(h.requests.length,2);h.close();
});
test('wrong local identity never replaces selected cloud data; auth change clears session history',async()=>{
  const h=harness({localUrl:'http://192.168.0.42/status',fetcher:async()=>({ok:true,json:async()=>sample({deviceId:'other'})})});await flush();
  assert.equal(h.snapshot().current,null);assert.match(h.snapshot().localError,/identity/);
  h.emit(sample({lastUpdated:{toMillis:()=>100000}}));assert.equal(h.snapshot().source,'cloud');
  h.auth('new-owner');assert.equal(h.snapshot().history.length,0);assert.equal(h.snapshot().current,null);h.close();
});
test('foreground resume retries immediately after cancelling an in-flight request',async()=>{
  const h=harness({localUrl:'http://192.168.0.42/status',fetcher:(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted'))))});
  h.app('background');h.app('active');await flush();await h.advance(0);
  assert.equal(h.requests.length,2);h.close();
});
test('unmounting the final consumer releases its connection after navigation grace period',async()=>{
  const h=harness();h.emit(sample({lastUpdated:{toMillis:()=>100000}}));assert.equal(h.snapshot().history.length,1);
  h.close();await h.advance(1000);assert.equal(h.snapshot().current,null);assert.equal(h.snapshot().history.length,0);
});
test('late cloud errors from a previous account cannot alter the new account state',()=>{
  const h=harness();const previous=h.cloudSubscriptions[0];h.auth('new-owner');
  previous.error(new Error('permission denied for previous owner'));
  assert.equal(h.snapshot().cloudError,null);h.close();
});
test('successful HTTP polling respects the configured sensor interval and deduplicates identical samples',async()=>{
  const h=harness({localUrl:'http://192.168.0.42/status',fetcher:async()=>({ok:true,json:async()=>sample({readIntervalMs:5000})})});await flush();
  await h.advance(4999);assert.equal(h.requests.length,1);await h.advance(1);assert.equal(h.requests.length,2);assert.equal(h.snapshot().history.length,1);h.close();
});

 test('changing the selected device clears history and rejects late old-device callbacks',()=>{
 const h=harness();h.emit(sample());const previous=h.cloudSubscriptions.at(-1);
 h.selectDevice('grow-02');assert.deepEqual(h.paths.at(-1),['devices','grow-02']);assert.equal(h.snapshot().current,null);assert.equal(h.snapshot().history.length,0);
 previous.success({exists:()=>true,data:()=>sample(),metadata:{hasPendingWrites:false}});assert.equal(h.snapshot().current,null);
 h.emit(sample({deviceId:'grow-02',hardwareId:'esp32-second'}));assert.equal(h.snapshot().current.deviceId,'grow-02');
 h.selectDevice('someone-elses-device','other-user');assert.deepEqual(h.paths.at(-1),['devices','grow-02']);h.close();
 });

test('the selected Firestore listener retries after a terminal error and resumes readings', async () => {
  const h = harness();
  h.cloudSubscriptions[0].error(new Error('Connection interrupted'));
  assert.equal(h.cloudSubscriptions[0].closed, true);
  await h.advance(1000);
  assert.equal(h.cloudSubscriptions.length, 2);
  assert.deepEqual(h.paths[1], ['devices', 'grow-01']);
  h.emit(sample({lastUpdated:{toMillis:()=>101000}}));
  assert.equal(h.snapshot().cloudError, null);
  assert.equal(h.snapshot().current.temperature, 24);
  h.close();
});

test('device assignments resolve independently for the selected dashboard set and Methi logs', () => {
  const h = harness();
  const store = {
    activeSensorSetId: 'set-dwc',
    deviceIds: { owner: 'legacy-methi' },
    deviceIdsBySet: { owner: { 'set-main': 'methi-esp', 'set-dwc': 'basil-esp' } },
  };
  assert.equal(h.resolve(store, 'owner'), 'basil-esp');
  assert.equal(h.resolve(store, 'owner', 'set-main'), 'methi-esp');
  assert.equal(h.resolve({ ...store, deviceIdsBySet: {} }, 'owner', 'set-main'), 'legacy-methi');
  assert.equal(h.resolve({ user: { id: 'owner', preferences: { deviceIdsBySet: { 'set-main': 'cloud-methi' } } } }, 'owner', 'set-main'), 'cloud-methi');
  h.close();
});

test('a scoped log listener stays on the Methi assignment when the dashboard changes sets', () => {
  const h = harness();
  h.configureSets('set-main');
  h.mount('set-main');
  const methi = h.cloudSubscriptions.at(-1);
  h.configureSets('set-dwc');
  assert.equal(methi.closed, false);
  assert.deepEqual(methi.path, ['devices', 'methi-esp']);
  assert.deepEqual(h.cloudSubscriptions.at(-1).path, ['devices', 'basil-esp']);
  h.close();
});

test('background and foreground transitions retain the Firestore listener', () => {
  const h = harness();
  h.app('background');
  h.app('active');
  assert.equal(h.cloudSubscriptions.length, 1);
  assert.equal(h.cloudSubscriptions[0].closed, false);
  h.close();
});

test('Firestore telemetry stays fresh between regular uploads slower than the sensor read interval', async () => {
  const h = harness();
  h.emit(sample({ lastUpdated: { toMillis: () => 100000 } }));
  await h.advance(20000);
  h.emit(sample({ sampleSequence: 2, lastUpdated: { toMillis: () => 120000 } }));
  await h.advance(18000);
  assert.equal(h.snapshot().stale, false);
  await h.advance(43000);
  assert.equal(h.snapshot().stale, true);
  h.close();
});


test('initial cloud reads tolerate the upload interval and a delayed upload does not permanently inflate freshness', async () => {
 const h = harness();
 h.emit(sample({ lastUpdated: { toMillis: () => 100000 } }));
 await h.advance(12000);
 assert.equal(h.snapshot().stale, false);
 assert.equal(h.snapshot().current.temperature, 24);
 h.emit(sample({ sampleSequence: 2, lastUpdated: { toMillis: () => 112000 } }));
 await h.advance(12000);
 h.emit(sample({ sampleSequence: 3, lastUpdated: { toMillis: () => 124000 } }));
 await h.advance(120000);
 h.emit(sample({ sampleSequence: 4, lastUpdated: { toMillis: () => 244000 } }));
 assert.equal(h.snapshot().current.uploadIntervalMs, 12000);
 await h.advance(37000);
 assert.equal(h.snapshot().stale, true);
 assert.equal(h.snapshot().current.temperature, 24);
 h.close();
});


test('switching sets preserves each device history without mixing readings', () => {
 const h = harness();
 h.emit(sample({ lastUpdated: { toMillis: () => 100000 } }));
 assert.equal(h.snapshot().history.length, 1);
 h.selectDevice('grow-02');
 assert.equal(h.snapshot().history.length, 0);
 h.emit(sample({ deviceId: 'grow-02', hardwareId: 'esp32-bbcc', bootId: 'boot-b', temp_c: 29, lastUpdated: { toMillis: () => 100000 } }));
 assert.equal(h.snapshot().current.temperature, 29);
 h.selectDevice('grow-01');
 assert.equal(h.snapshot().current.temperature, 24);
 assert.equal(h.snapshot().history.length, 1);
 assert.equal(h.snapshot().history[0].deviceId, 'grow-01');
 h.close();
});


test('unchanged freshness ticks keep a stable snapshot instead of rerendering log forms every second', async () => {
  const h = harness();
  h.emit(sample({ lastUpdated: { toMillis: () => 100000 } }));
  const before = h.snapshot();
  await h.advance(2000);
  assert.equal(h.snapshot(), before);
  await h.advance(90000);
  assert.equal(h.snapshot().stale, true);
  assert.notEqual(h.snapshot(), before);
  h.close();
});
