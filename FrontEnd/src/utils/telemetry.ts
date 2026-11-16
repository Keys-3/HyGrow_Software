/** Normalize both the legacy flat device payload and the current nested Firebase document. */
export type SensorHealth = { enabled: boolean; simulated: boolean; state: 'disabled' | 'waiting' | 'healthy' | 'error' | 'failing' };
export const SENSOR_HEALTH_KEYS: Record<string, string> = { temperature:'dht', humidity:'dht', vpd:'dht', ph:'ph', tds:'tds', waterLevel:'water_level', lightIntensity:'light', waterTemp:'water_temp' };
const LEGACY_FIELDS: Record<string, string> = { temperature:'temp_c', humidity:'humidity', ph:'ph_val', tds:'tds_ppm', waterLevel:'wl_percent', lightIntensity:'lux', vpd:'vpd_kpa', waterTemp:'water_temp_c' };
const NESTED_FIELDS: Record<string, [string, string]> = {
  temperature:['dht','temperatureC'], humidity:['dht','humidityPercent'], vpd:['dht','vpdKpa'],
  ph:['ph','value'], tds:['tds','ppm'], waterLevel:['waterLevel','percent'],
  lightIntensity:['light','lux'], waterTemp:['waterTemperature','temperatureC'],
};
const isRecord = (value: unknown): value is Record<string, any> => typeof value === 'object' && value !== null && !Array.isArray(value);
const normalizedHealthState = (value: unknown): SensorHealth['state'] => {
  if (value === 'healthy') return 'healthy';
  if (value === 'disabled') return 'disabled';
  if (value === 'error') return 'error';
  if (value === 'failing') return 'failing';
  return 'waiting';
};
export type Telemetry = {
  deviceId: string; hardwareId: string; bootId: string; sampleSequence: number;
  sampledUptimeMs: number; sampleAgeMs: number | null; readIntervalMs: number;
  source: 'local' | 'cloud'; receivedAt: number; uploadedAt: number | null;
  lastSensorTimestamp: string | null; sensorStatus: Record<string, SensorHealth>;
  temperature: number | null; humidity: number | null; ph: number | null; tds: number | null;
  waterLevel: number | null; lightIntensity: number | null; vpd: number | null; waterTemp: number | null;
  ec: null | number; co2: null | number; pumpStatus: null | boolean; autoMode: null | boolean; tdsCompensationFallback: boolean;
};
export type HistoryPoint = Telemetry & { time: string; date: string; observedAt: number };
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const nonnegative = (value: unknown): value is number => finite(value) && value >= 0;

export function normalizeTelemetry(raw: any, deviceId: string, source: 'local' | 'cloud', now = Date.now()): Telemetry {
  if (!isRecord(raw) || !deviceId || (typeof raw.deviceId === 'string' && raw.deviceId !== deviceId)) throw new Error('Telemetry device identity does not match the selected Firestore device.');
  const nestedSchema = isRecord(raw.device) && isRecord(raw.sample);
  if (!nestedSchema && raw.schemaVersion !== 1) throw new Error('Unsupported telemetry schema.');

  const device = nestedSchema ? raw.device : raw;
  const sample = nestedSchema ? raw.sample : raw;
  const hardwareId = device.hardwareId;
  const bootId = sample.bootId;
  const sampleSequence = sample.sequence ?? sample.sampleSequence;
  const sampledUptimeMs = sample.sampledUptimeMs ?? sample.uptimeMs;
  const sampleAgeMs = sample.ageMs ?? sample.sampleAgeMs ?? raw.sampleAgeMs ?? null;
  const readIntervalMs = sample.readIntervalMs ?? raw.readIntervalMs;
  if (typeof hardwareId !== 'string' || !hardwareId || typeof bootId !== 'string' || !bootId) throw new Error('Telemetry hardwareId/bootId is missing.');
  if (!Number.isSafeInteger(sampleSequence) || sampleSequence < 0 || !nonnegative(sampledUptimeMs) || !Number.isSafeInteger(readIntervalMs) || readIntervalMs <= 0 || readIntervalMs > 2147483647 || (sampleAgeMs !== null && !nonnegative(sampleAgeMs))) throw new Error('Invalid telemetry sequence or timing.');

  const sensorStatus: Record<string, SensorHealth> = {};
  const sensors = nestedSchema && isRecord(raw.sensors) ? raw.sensors : {};
  for (const key of new Set(Object.values(SENSOR_HEALTH_KEYS))) {
    const nestedKey = key === 'water_level' ? 'waterLevel' : key === 'water_temp' ? 'waterTemperature' : key;
    const health = nestedSchema ? sensors[nestedKey] : raw.sensorStatus?.[key];
    const state = normalizedHealthState(health?.state);
    sensorStatus[key] = {
      enabled: typeof health?.enabled === 'boolean' ? health.enabled : isRecord(health) && state !== 'disabled',
      simulated: health?.simulated === true,
      state,
    };
  }

  let uploadedAt: number | null = null;
  if (source === 'cloud') {
    const lastUpdated = raw.lastUpdated;
    let stamp: unknown = lastUpdated?.toMillis?.();
    if (!finite(stamp) && lastUpdated instanceof Date) stamp = lastUpdated.getTime();
    if (!finite(stamp) && typeof lastUpdated === 'string') stamp = Date.parse(lastUpdated);
    if (!finite(stamp) && finite(lastUpdated?.seconds ?? lastUpdated?._seconds)) stamp = (lastUpdated.seconds ?? lastUpdated._seconds) * 1000;
    if (finite(stamp) && stamp <= now && stamp > 0) uploadedAt = stamp;
  }
  const baseAt = source === 'local' ? now : uploadedAt;
  const sampledAt = baseAt !== null && nonnegative(sampleAgeMs) ? baseAt - sampleAgeMs : null;
  const data: Telemetry = { deviceId, hardwareId, bootId,
    sampleSequence, sampledUptimeMs, sampleAgeMs, readIntervalMs,
    source, receivedAt:now, uploadedAt, lastSensorTimestamp:sampledAt !== null ? new Date(sampledAt).toISOString() : null,
    sensorStatus, temperature:null, humidity:null, ph:null, tds:null, waterLevel:null, lightIntensity:null, vpd:null, waterTemp:null,
    ec:null, co2:null, pumpStatus:null, autoMode:null,
    tdsCompensationFallback: nestedSchema ? sensors.tds?.usesFallbackWaterTemperature === true : raw.tds_comp_using_fake_water_temp === true };
  for (const [key, field] of Object.entries(LEGACY_FIELDS)) {
    const health = sensorStatus[SENSOR_HEALTH_KEYS[key]];
    const nestedField = NESTED_FIELDS[key];
    const reading = nestedSchema ? sensors[nestedField[0]]?.[nestedField[1]] : raw[field];
    (data as any)[key] = sampleSequence > 0 && health.enabled && health.state === 'healthy' && finite(reading) ? reading : null;
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
