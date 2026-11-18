/** A shared dashboard stream and independent streams for fixed sensor sets. */
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { auth, db } from '../../firebase';
import useAppStore from '../store/useAppStore';
import { appendHistory, freshness, normalizeTelemetry, selectTelemetry } from '../utils/telemetry';
import type { HistoryPoint, Telemetry } from '../utils/telemetry';

const configuredUrl = process.env.EXPO_PUBLIC_LOCAL_STATUS_URL?.trim() || '';
const configuredHardware = process.env.EXPO_PUBLIC_HARDWARE_ID?.trim() || '';
type TelemetryState = { current: Telemetry | null; history: HistoryPoint[]; weekly: HistoryPoint[]; loading: boolean; error: string | null;
  stale: boolean; source: 'local' | 'cloud' | null; localAvailable: boolean; cloudAvailable: boolean; localError: string | null; cloudError: string | null };

export function resolveSensorDeviceId(
  store: ReturnType<typeof useAppStore.getState>,
  uid: string | undefined,
  sensorSetId?: string,
): string {
  const setId = sensorSetId || store.activeSensorSetId || 'set-main';
  const user = store.user?.id === uid ? store.user : undefined;
  const assigned = uid ? store.deviceIdsBySet?.[uid]?.[setId] : undefined;
  const cloudAssignment = user?.preferences?.deviceIdsBySet?.[setId];
  const savedSetDevice = store.sensorSets?.find((set) => set.id === setId)?.deviceId;
  if (setId === 'set-main') {
    return (assigned || cloudAssignment || (uid && store.deviceIds?.[uid]) ||
      user?.preferences?.deviceId || process.env.EXPO_PUBLIC_DEVICE_ID ||
      (savedSetDevice !== 'esp32-farm-01' ? savedSetDevice : '') || '').trim();
  }
  return (assigned || cloudAssignment || savedSetDevice || '').trim();
}

function createSensorStream(sensorSetId?: string) {
  const listeners = new Set<() => void>();
  let consumers = 0;
  let stop: (() => void) | null = null;
  let restart: (() => void) | null = null;
  let local: Telemetry | null = null;
  let cloud: Telemetry | null = null;
  let history: HistoryPoint[] = [];
  let cloudError: string | null = null;
  let localError: string | null = null;
  const initialHardwarePin = () => {
    const setId = sensorSetId || useAppStore.getState().activeSensorSetId || 'set-main';
    const defaultId = process.env.EXPO_PUBLIC_DEVICE_ID?.trim();
    return setId === 'set-main' && (!defaultId || getActiveDeviceId() === defaultId) ? configuredHardware : '';
  };
  let pinnedHardware = initialHardwarePin();
  let state: TelemetryState = { current:null,history,weekly:history,loading:false,error:null,
    stale:true,source:null,localAvailable:false,cloudAvailable:false,localError,cloudError };
  const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
  const getSnapshot = () => state;
  const message = (error: unknown) => error instanceof Error ? error.message : String(error);

  function getActiveDeviceId(): string {
    return resolveSensorDeviceId(useAppStore.getState(), auth.currentUser?.uid, sensorSetId);
  }

  function safeClearSensorData() {
    if (sensorSetId) return;
    try {
      const store = useAppStore.getState() as any;
      if (typeof store?.clearSensorData === 'function') {
        store.clearSensorData();
      } else {
        if (typeof store?.updateSensorData === 'function') {
          store.sensorData = null;
          store.lastUpdated = null;
        }
        if (typeof store?.setDeviceOnline === 'function') {
          store.setDeviceOnline(false);
        }
      }
    } catch (_e) {
      // Prevent unhandled exceptions from breaking UI mounting
    }
  }

  function publish() {
    const now = Date.now();
    const deviceId = getActiveDeviceId();
    let current = selectTelemetry(local,cloud,now);
    // A delayed cloud copy of an older boot must not reopen the previous graph window.
    if (local && current === cloud && cloud && cloud.bootId !== local.bootId && (cloud.uploadedAt ?? 0) < local.receivedAt) current = local;
    if (current) {
      history = appendHistory(history,current);
      const store = useAppStore.getState() as any;
      if (!sensorSetId && typeof store?.updateSensorData === 'function') {
        store.updateSensorData(current);
      }
    } else safeClearSensorData();
    const status = current ? freshness(current,now) : {stale:true,reachable:false};
    const store = useAppStore.getState() as any;
    if (!sensorSetId && typeof store?.setDeviceOnline === 'function') {
      store.setDeviceOnline(status.reachable);
    }
    state = {...state,current,history,weekly:history,stale:status.stale,source:current?.source ?? null,
      localAvailable:!!local && freshness(local,now).reachable,
      cloudAvailable:!!cloud && freshness(cloud,now).reachable,localError,cloudError,
      error: !deviceId ? 'Configure a device in Settings or set EXPO_PUBLIC_DEVICE_ID to select a device.' :
        deviceId.includes('/') ? 'EXPO_PUBLIC_DEVICE_ID must be one Firestore document ID.' :
        !current || status.stale ? [localError,cloudError].filter(Boolean).join(' · ') || (current ? 'The last sensor sample is stale.' : null) : null };
    listeners.forEach(listener => listener());
  }

  function start() {
    let disposed = false;
    let generation = 0;
    let localGeneration = 0;
    let foreground = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    let cloudUnsubscribe: (() => void) | null = null;
    let cloudRetry: ReturnType<typeof setTimeout> | null = null;
    let cloudFailures = 0;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let ticker: ReturnType<typeof setInterval> | null = null;
    let controller: AbortController | null = null;
    let inFlight = false;
    let failures = 0;
    let identity = auth.currentUser?.uid ?? null;
    let localUrl: string | null = null;
    let currentDeviceId = getActiveDeviceId();

    if (configuredUrl) {
      try {
        const url = new URL(configuredUrl);
        if (url.protocol !== 'http:' || url.pathname !== '/status' || url.username || url.password || url.search || url.hash) throw new Error('Use an explicit http://<device-ip>/status URL for EXPO_PUBLIC_LOCAL_STATUS_URL.');
        localUrl = url.toString();
      } catch (error) { localError = message(error); }
    }
    const accept = (raw: unknown, source: 'local' | 'cloud', targetDeviceId: string) => {
      const data = normalizeTelemetry(raw,targetDeviceId,source,Date.now());
      if (source === 'cloud' && cloud?.bootId === data.bootId && cloud.uploadedAt && data.uploadedAt) {
        const gap = data.uploadedAt - cloud.uploadedAt;
        data.uploadIntervalMs ??= gap > 0 && gap <= 60_000 ? gap : cloud.uploadIntervalMs;
      }
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
      const requestGeneration=localGeneration;
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
        if (disposed || !foreground || requestGeneration !== localGeneration) return;
        const deviceId = getActiveDeviceId();
        const data=accept(raw,'local',deviceId); failures=0;
        interval=Math.max(2000,data.readIntervalMs);
      } catch(error) {
        if (disposed || !foreground || requestGeneration !== localGeneration) return;
        localError=`Local unavailable: ${message(error)}`;
        failures++; interval=Math.min(15000,2000 * 2 ** Math.min(failures-1,3));
        state={...state,loading:false}; publish();
      } finally {
        if (timeout) clearTimeout(timeout);
        if (controller === abort) controller=null;
        inFlight=false;
        if (!disposed && foreground) pollTimer=setTimeout(poll,requestGeneration !== localGeneration ? 0 : interval);
      }
    };
    const pauseLocal = () => {
      localGeneration++;
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = null;
      controller?.abort();
    };
    const pause = () => {
      generation++;
      pauseLocal();
      cloudUnsubscribe?.();cloudUnsubscribe=null;
      if (cloudRetry) clearTimeout(cloudRetry);
      cloudRetry=null;
      if (ticker) clearInterval(ticker);ticker=null;
    };
    const resume = () => {
      if (disposed) return;
      pause();
      const deviceId = getActiveDeviceId();
      if (!deviceId || deviceId.includes('/')) {state={...state,loading:false};publish();return;}
      state={...state,loading:!local && !cloud};publish();
      const subscribeCloud = () => {
        const subscriptionGeneration=generation;
        cloudUnsubscribe=onSnapshot(doc(db,'devices',deviceId),{includeMetadataChanges:true},snapshot => {
          if (disposed || subscriptionGeneration !== generation) return;
          try {
            if (!snapshot.exists()) { cloud=null;throw new Error(`No telemetry document exists at devices/${deviceId}.`); }
            if (snapshot.metadata.hasPendingWrites) throw new Error('Waiting for a confirmed device upload.');
            accept(snapshot.data(),'cloud',deviceId);
            if (!snapshot.metadata.fromCache) cloudFailures = 0;
          } catch(error) {cloudError=`Cloud telemetry: ${message(error)}`;state={...state,loading:false};publish();}
        },error => {
          if (disposed || subscriptionGeneration !== generation) return;
          cloudError=`Cloud telemetry: ${error.message}`;state={...state,loading:false};publish();
          cloudUnsubscribe?.();
          cloudUnsubscribe = null;
          const delay = Math.min(30_000, 1_000 * 2 ** Math.min(cloudFailures++, 5));
          cloudRetry = setTimeout(() => {
            cloudRetry = null;
            if (!disposed && subscriptionGeneration === generation) subscribeCloud();
          }, delay);
        });
      };
      if (identity) subscribeCloud();
      else {cloudError='Sign in to read the selected device from Firestore.';state={...state,loading:!!localUrl};publish();}
      ticker=setInterval(publish,1000);
      void poll();
    };
    const authUnsubscribe=onAuthStateChanged(auth,user => {
      if (disposed) return;
      const next=user?.uid ?? null;
      if (identity !== next) {
        identity=next;currentDeviceId=getActiveDeviceId();local=null;cloud=null;history=[];pinnedHardware=initialHardwarePin();
        cloudError=null;safeClearSensorData();publish();
        resume();
      }
    });
    const appSubscription=AppState.addEventListener('change',next => {
      foreground=next === 'active';
      if (foreground) {
        publish();
        void poll();
      } else pauseLocal();
    });
    const storeUnsubscribe = useAppStore.subscribe(() => {
      if (disposed) return;
      const nextDeviceId = getActiveDeviceId();
      if (nextDeviceId !== currentDeviceId) {
        currentDeviceId = nextDeviceId;
        local = null;
        cloud = null;
        history = [];
        pinnedHardware = initialHardwarePin();
        cloudError = null;
        safeClearSensorData();
        publish();
        resume();
      }
    });
    restart=resume;
    resume();
    return () => {
      disposed=true;pause();authUnsubscribe();appSubscription.remove();storeUnsubscribe();restart=null;
      local=null;cloud=null;history=[];localError=null;cloudError=null;pinnedHardware=initialHardwarePin();
      state={...state,loading:false};publish();
    };
  }
  const refresh = () => restart?.();
  return {
    subscribe, getSnapshot, refresh,
    retain() {
      consumers++;
      if (consumers === 1) stop = start();
      return () => {
        consumers--;
        if (!consumers) { stop?.(); stop = null; }
      };
    },
  };
}

const dashboardStream = createSensorStream();
const scopedStreams = new Map<string, ReturnType<typeof createSensorStream>>();

export default function useSensorData(sensorSetId?: string) {
  let stream = dashboardStream;
  if (sensorSetId) {
    stream = scopedStreams.get(sensorSetId) || createSensorStream(sensorSetId);
    scopedStreams.set(sensorSetId, stream);
  }
  const snapshot = useSyncExternalStore(stream.subscribe, stream.getSnapshot, stream.getSnapshot);
  useEffect(() => stream.retain(), [stream]);
  const deviceId = resolveSensorDeviceId(useAppStore.getState(), auth.currentUser?.uid, sensorSetId);
  return { ...snapshot, deviceId, refresh: stream.refresh };
}
