/** Canonical firmware schema 1. No unit conversion or synthetic measurements. */
export type SensorHealth = { enabled: boolean; simulated: boolean; state: 'disabled' | 'waiting' | 'healthy' | 'failing' };
export const SENSOR_HEALTH_KEYS: Record<string, string> = { temperature:'dht', humidity:'dht', vpd:'dht', ph:'ph', tds:'tds', waterLevel:'water_level', lightIntensity:'light', waterTemp:'water_temp' };
const FIELDS: Record<string, string> = { temperature:'temp_c', humidity:'humidity', ph:'ph_val', tds:'tds_ppm', waterLevel:'wl_percent', lightIntensity:'lux', vpd:'vpd_kpa', waterTemp:'water_temp_c' };
export type Telemetry = {
  deviceId: string; hardwareId: string; bootId: string; sampleSequence: number;
  sampledUptimeMs: number; sampleAgeMs: number | null; readIntervalMs: number;
  source: 'local' | 'cloud'; receivedAt: number; uploadedAt: number | null;
  lastSensorTimestamp: string | null; sensorStatus: Record<string, SensorHealth>;
  temperature: number | null; humidity: number | null; ph: number | null; tds: number | null;
  waterLevel: number | null; lightIntensity: number | null; vpd: number | null; waterTemp: number | null;
  ec: null; co2: null; pumpStatus: null; autoMode: null; tdsCompensationFallback: boolean;
};
export type HistoryPoint = Telemetry & { time: string; date: string; observedAt: number };
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const nonnegative = (value: unknown): value is number => finite(value) && value >= 0;

export function normalizeTelemetry(raw: any, deviceId: string, source: 'local' | 'cloud', now = Date.now()): Telemetry {
  if (!deviceId || raw?.deviceId !== deviceId) throw new Error('Telemetry device identity does not match EXPO_PUBLIC_DEVICE_ID.');
  if (raw.schemaVersion !== 1) throw new Error('Unsupported telemetry schema; firmware schemaVersion 1 is required.');
  if (typeof raw.hardwareId !== 'string' || !raw.hardwareId || typeof raw.bootId !== 'string' || !raw.bootId) throw new Error('Telemetry hardwareId/bootId is missing.');
  if (!Number.isSafeInteger(raw.sampleSequence) || raw.sampleSequence < 0 || !nonnegative(raw.sampledUptimeMs) || !Number.isSafeInteger(raw.readIntervalMs) || raw.readIntervalMs <= 0 || raw.readIntervalMs > 2147483647 || (raw.sampleAgeMs !== null && !nonnegative(raw.sampleAgeMs))) throw new Error('Invalid telemetry sequence or timing.');
  const sensorStatus: Record<string, SensorHealth> = {};
  for (const key of Object.values(SENSOR_HEALTH_KEYS)) {
    const health = raw.sensorStatus?.[key];
    if (!health || typeof health.enabled !== 'boolean' || typeof health.simulated !== 'boolean' || !['disabled','waiting','healthy','failing'].includes(health.state)) throw new Error(`Invalid sensorStatus.${key}.`);
    sensorStatus[key] = { enabled:health.enabled, simulated:health.simulated, state:health.state };
  }
  let uploadedAt: number | null = null;
  if (source === 'cloud') {
    const stamp = raw.lastUpdated?.toMillis?.();
    if (finite(stamp) && stamp <= now && stamp > 0) uploadedAt = stamp;
  }
  const baseAt = source === 'local' ? now : uploadedAt;
  const sampledAt = baseAt !== null && nonnegative(raw.sampleAgeMs) ? baseAt - raw.sampleAgeMs : null;
  const data: Telemetry = { deviceId, hardwareId:raw.hardwareId, bootId:raw.bootId,
    sampleSequence:raw.sampleSequence, sampledUptimeMs:raw.sampledUptimeMs, sampleAgeMs:raw.sampleAgeMs, readIntervalMs:raw.readIntervalMs,
    source, receivedAt:now, uploadedAt, lastSensorTimestamp:sampledAt !== null ? new Date(sampledAt).toISOString() : null,
    sensorStatus, temperature:null, humidity:null, ph:null, tds:null, waterLevel:null, lightIntensity:null, vpd:null, waterTemp:null,
    ec:null, co2:null, pumpStatus:null, autoMode:null, tdsCompensationFallback:raw.tds_comp_using_fake_water_temp === true };
  for (const [key, field] of Object.entries(FIELDS)) {
    const health = sensorStatus[SENSOR_HEALTH_KEYS[key]];
    (data as any)[key] = raw.sampleSequence > 0 && health.enabled && health.state === 'healthy' && finite(raw[field]) ? raw[field] : null;
  }
  return data;
}

export function freshness(data: Telemetry, now = Date.now()) {
  const threshold = Math.max(10000,3 * data.readIntervalMs);
  const baseAt = data.source === 'local' ? data.receivedAt : data.uploadedAt;
  const elapsed = baseAt === null ? Infinity : Math.max(0,now-baseAt);
  const sampleAgeMs = data.sampleAgeMs === null ? Infinity : data.sampleAgeMs + elapsed;
  return { sampleAgeMs, stale:data.sampleSequence === 0 || sampleAgeMs > threshold, reachable:elapsed <= (data.source === 'cloud' ? Math.max(30000,threshold) : threshold) };
}

const signature = (data: Telemetry) => Object.entries(data.sensorStatus).map(([key,value]) => `${key}:${value.simulated}`).sort().join('|');
export function appendHistory(history: HistoryPoint[], data: Telemetry): HistoryPoint[] {
  const last = history.at(-1);
  const sameBoot = last && last.hardwareId === data.hardwareId && last.deviceId === data.deviceId && last.bootId === data.bootId;
  if (!data.sampleSequence) return sameBoot ? history : [];
  if (sameBoot && data.sampleSequence <= last.sampleSequence) return history;
  const previous = sameBoot && signature(last) === signature(data) ? history : [];
  const observedAt = data.receivedAt;
  const date = new Date(observedAt);
  return [...previous,{...data,observedAt,time:date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),date:date.toLocaleDateString([], {month:'short',day:'numeric'})}].slice(-100);
}

export function selectTelemetry(local: Telemetry | null, cloud: Telemetry | null, now = Date.now()): Telemetry | null {
  if (local && !freshness(local,now).stale && freshness(local,now).reachable) return local;
  if (cloud && !freshness(cloud,now).stale && freshness(cloud,now).reachable) return cloud;
  if (!local) return cloud;
  if (!cloud) return local;
  return freshness(local,now).sampleAgeMs <= freshness(cloud,now).sampleAgeMs ? local : cloud;
}

export function sensorNote(data: Telemetry | null, key: string, stale = false): string {
  if (key === 'ec' || key === 'co2') return 'Unsupported by device';
  if (!data) return 'Waiting for telemetry';
  const health = data.sensorStatus[SENSOR_HEALTH_KEYS[key]];
  const notes = [stale ? 'Stale' : '', health?.simulated ? 'Simulated' : '', health?.state !== 'healthy' ? health?.state : '', (data as any)[key] === null && health?.state === 'healthy' ? 'Unavailable' : '', key === 'tds' && data.tdsCompensationFallback ? '25°C fallback compensation' : ''];
  return notes.filter(Boolean).join(' · ') || 'Measured';
}

export function chartPoints(values: unknown[]): (number | null)[] { return values.map(value => finite(value) ? value : null); }
export function alertEligible(data: Telemetry | null, key: string, now = Date.now()): boolean {
  if (!data || freshness(data,now).stale || !finite((data as any)[key])) return false;
  const health=data.sensorStatus[SENSOR_HEALTH_KEYS[key]];
  return !!health?.enabled && health.state === 'healthy' && !health.simulated && !(key === 'tds' && data.tdsCompensationFallback);
}
