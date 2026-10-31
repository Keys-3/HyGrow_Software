/** One shared, selected-device telemetry subscription for all mounted screens. */
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { auth, db } from '../../firebase';
import useAppStore from '../store/useAppStore';
import { appendHistory, freshness, normalizeTelemetry, selectTelemetry } from '../utils/telemetry';
import type { HistoryPoint, Telemetry } from '../utils/telemetry';

const defaultDeviceId = process.env.EXPO_PUBLIC_DEVICE_ID?.trim() || '';
let deviceId = defaultDeviceId;
const configuredUrl = process.env.EXPO_PUBLIC_LOCAL_STATUS_URL?.trim() || '';
const configuredHardware = process.env.EXPO_PUBLIC_HARDWARE_ID?.trim() || '';
const listeners = new Set<() => void>();
let consumers = 0;
let stop: (() => void) | null = null;
let restart: (() => void) | null = null;
let local: Telemetry | null = null;
let cloud: Telemetry | null = null;
let history: HistoryPoint[] = [];
let cloudError: string | null = null;
let localError: string | null = null;
let pinnedHardware = configuredHardware;
type TelemetryState = { current: Telemetry | null; history: HistoryPoint[]; weekly: HistoryPoint[]; loading: boolean; error: string | null;
  stale: boolean; source: 'local' | 'cloud' | null; localAvailable: boolean; cloudAvailable: boolean; localError: string | null; cloudError: string | null };
let state: TelemetryState = { current:null,history,weekly:history,loading:false,error:null,
  stale:true,source:null,localAvailable:false,cloudAvailable:false,localError,cloudError };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const getSnapshot = () => state;
const message = (error: unknown) => error instanceof Error ? error.message : String(error);

function publish() {
  const now = Date.now();
  let current = selectTelemetry(local,cloud,now);
  // A delayed cloud copy of an older boot must not reopen the previous graph window.
  if (local && current === cloud && cloud && cloud.bootId !== local.bootId && (cloud.uploadedAt ?? 0) < local.receivedAt) current = local;
  if (current) {
    history = appendHistory(history,current);
    useAppStore.getState().updateSensorData(current);
  } else useAppStore.getState().clearSensorData();
  const status = current ? freshness(current,now) : {stale:true,reachable:false};
  useAppStore.getState().setDeviceOnline(status.reachable);
  state = {...state,current,history,weekly:history,stale:status.stale,source:current?.source ?? null,
    localAvailable:!!local && freshness(local,now).reachable,
    cloudAvailable:!!cloud && freshness(cloud,now).reachable,localError,cloudError,
    error: !deviceId ? 'Open Settings and save the Device ID shown in your firmware settings.' :
      deviceId.includes('/') ? 'EXPO_PUBLIC_DEVICE_ID must be one Firestore document ID.' :
      !current || status.stale ? [localError,cloudError].filter(Boolean).join(' · ') || (current ? 'The last sensor sample is stale.' : null) : null };
  listeners.forEach(listener => listener());
}

function start() {
  let disposed = false;
  let generation = 0;
  let foreground = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
  let cloudUnsubscribe: (() => void) | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let ticker: ReturnType<typeof setInterval> | null = null;
  let controller: AbortController | null = null;
  let inFlight = false;
  let failures = 0;
  let identity = auth.currentUser?.uid ?? null;
  let localUrl: string | null = null;
  if (configuredUrl) {
    try {
      const url = new URL(configuredUrl);
      if (url.protocol !== 'http:' || url.pathname !== '/status' || url.username || url.password || url.search || url.hash) throw new Error('Use an explicit http://<device-ip>/status URL for EXPO_PUBLIC_LOCAL_STATUS_URL.');
      localUrl = url.toString();
    } catch (error) { localError = message(error); }
  }
  const accept = (raw: unknown, source: 'local' | 'cloud') => {
    const data = normalizeTelemetry(raw,deviceId,source,Date.now());
    if (pinnedHardware && data.hardwareId !== pinnedHardware) throw new Error('Telemetry hardware identity changed; check the selected device configuration.');
    pinnedHardware = data.hardwareId;
    const previous = source === 'local' ? local : cloud;
    if (previous?.bootId === data.bootId && data.sampleSequence < previous.sampleSequence) throw new Error('Received out-of-order telemetry.');
    if (source === 'local') { local=data;localError=null; } else { cloud=data;cloudError=null; }
    state={...state,loading:false};
    publish();
    return data;
  };
  const poll = async () => {
    if (!localUrl || inFlight || disposed || !foreground) return;
    inFlight=true;
    const requestGeneration=generation;
    const abort = new AbortController(); controller=abort;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let interval=2000;
    try {
      const deadline = new Promise<never>((_,reject) => { timeout=setTimeout(() => {abort.abort();reject(new Error('Local telemetry request timed out after 2 seconds.'));},2000); });
      const request = (async () => {
        const response = await fetch(localUrl!,{signal:abort.signal,headers:{Accept:'application/json'},cache:'no-store'});
        if (!response.ok) throw new Error(`Local telemetry HTTP ${response.status}.`);
        return response.json();
      })();
      const raw = await Promise.race([request,deadline]);
      if (disposed || !foreground || requestGeneration !== generation) return;
      const data=accept(raw,'local'); failures=0;
      interval=Math.max(2000,data.readIntervalMs);
    } catch(error) {
      if (disposed || !foreground || requestGeneration !== generation) return;
      localError=`Local unavailable: ${message(error)}`;
      failures++; interval=Math.min(15000,2000 * 2 ** Math.min(failures-1,3));
      state={...state,loading:false}; publish();
    } finally {
      if (timeout) clearTimeout(timeout);
      if (controller === abort) controller=null;
      inFlight=false;
      if (!disposed && foreground) pollTimer=setTimeout(poll,requestGeneration !== generation ? 0 : interval);
    }
  };
  const pause = () => {
    generation++;
    cloudUnsubscribe?.();cloudUnsubscribe=null;
    if (pollTimer) clearTimeout(pollTimer);pollTimer=null;
    if (ticker) clearInterval(ticker);ticker=null;
    controller?.abort();
  };
  const resume = () => {
    if (disposed || !foreground) return;
    pause();
    const selected = (identity && useAppStore.getState().deviceIds?.[identity]) || defaultDeviceId;
    if (selected !== deviceId) {
      deviceId=selected;local=null;cloud=null;history=[];localError=null;cloudError=null;pinnedHardware=configuredHardware;
      useAppStore.getState().clearSensorData();
    }
    if (!deviceId || deviceId.includes('/')) {state={...state,loading:false};publish();return;}
    state={...state,loading:!local && !cloud};publish();
    if (identity) {
      const subscriptionGeneration=generation;
      cloudUnsubscribe=onSnapshot(doc(db,'devices',deviceId),{includeMetadataChanges:true},snapshot => {
        if (disposed || subscriptionGeneration !== generation) return;
        try {
          if (!snapshot.exists()) { cloud=null;throw new Error(`No telemetry document exists at devices/${deviceId}. Check firmware uploads to the devices collection and device ownership is provisioned.`); }
          if (snapshot.metadata.hasPendingWrites) throw new Error('Waiting for a confirmed device upload.');
          accept(snapshot.data(),'cloud');
        } catch(error) {cloudError=`Cloud telemetry: ${message(error)}`;state={...state,loading:false};publish();}
      },error => {
        if (disposed || subscriptionGeneration !== generation) return;
        cloudError=`Cloud telemetry: ${error.message}`;state={...state,loading:false};publish();
      });
    } else {cloudError='Sign in to read the selected device from Firestore.';state={...state,loading:!!localUrl};publish();}
    ticker=setInterval(publish,1000);
    void poll();
  };
  const authUnsubscribe=onAuthStateChanged(auth,user => {
    if (disposed) return;
    const next=user?.uid ?? null;
    if (identity !== next) {
      identity=next;local=null;cloud=null;history=[];pinnedHardware=configuredHardware;
      cloudError=null;useAppStore.getState().clearSensorData();publish();
    }
    resume();
  });
  const appSubscription=AppState.addEventListener('change',next => {
    foreground=next === 'active';
    if (foreground) resume(); else pause();
  });
  restart=resume;
  const settingsUnsubscribe=useAppStore.subscribe(() => {
    const selected=(identity && useAppStore.getState().deviceIds?.[identity]) || defaultDeviceId;
    if (selected !== deviceId) resume();
  });
  resume();
  return () => {
    disposed=true;pause();authUnsubscribe();settingsUnsubscribe();appSubscription.remove();restart=null;
    local=null;cloud=null;history=[];localError=null;cloudError=null;pinnedHardware=configuredHardware;
    state={...state,loading:false};publish();
  };
}
const refresh = () => restart?.();
export default function useSensorData() {
  const snapshot=useSyncExternalStore(subscribe,getSnapshot,getSnapshot);
  useEffect(() => {
    consumers++;
    if (consumers === 1) stop=start();
    return () => {consumers--;if (!consumers) {stop?.();stop=null;}};
  },[]);
  return {...snapshot,refresh};
}
