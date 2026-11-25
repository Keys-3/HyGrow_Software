export type TargetRanges = Record<string, { min: number; max: number }>;
export interface ThresholdPolicy {
  mode: 'automatic' | 'manual'; dayStartHour: number; nightStartHour: number; timeZone: string;
  day?: TargetRanges; night?: TargetRanges; tdsScale?: number;
}
// Nutrient presets: OKState HLA-6722. Fenugreek solution: Agriculture 13(10), 2009 (2023).
// Air, humidity, water and light bands are editable operating presets, not universal crop optima.
const presets = [
  { key: 'fenugreek', label: 'Fenugreek (Methi)', match: /methi|fenugreek|trigonella/i, ph: [5.8,6.4], ec: [1.8,2.0], day: [20,26], night: [16,22] },
  { key: 'lettuce', label: 'Lettuce', match: /lettuce/i, ph: [6,7], ec: [1.2,1.8], day: [20,25], night: [16,20] },
  { key: 'basil', label: 'Basil', match: /basil/i, ph: [5.5,6], ec: [1,1.6], day: [22,28], night: [18,23] },
  { key: 'spinach', label: 'Spinach', match: /spinach|palak/i, ph: [6,7], ec: [1.8,2.3], day: [18,24], night: [14,20] },
  { key: 'tomato', label: 'Tomato', match: /tomato/i, ph: [6,6.5], ec: [2,4], day: [22,28], night: [17,22] },
  { key: 'pepper', label: 'Pepper', match: /pepper|capsicum|chilli/i, ph: [5.5,6], ec: [0.8,1.8], day: [22,28], night: [18,23] },
  { key: 'strawberry', label: 'Strawberry', match: /strawberr/i, ph: [5.8,6.2], ec: [1.8,2.2], day: [18,25], night: [12,18] },
];
const range = (values: number[]) => ({ min: values[0], max: values[1] });
export function validateThresholdPolicy(policy: ThresholdPolicy) {
  if (![policy.dayStartHour, policy.nightStartHour].every((hour) => Number.isInteger(hour) && hour >= 0 && hour < 24) || policy.dayStartHour === policy.nightStartHour) throw new Error('Day and night must start at different hours between 0 and 23.');
  try { new Intl.DateTimeFormat('en', { timeZone: policy.timeZone }).format(new Date()); } catch { throw new Error('Enter a valid farm time zone.'); }
  for (const limits of [...Object.values(policy.day || {}), ...Object.values(policy.night || {})]) {
    if (!Number.isFinite(limits.min) || !Number.isFinite(limits.max) || limits.min >= limits.max) throw new Error('Every target needs a numeric minimum lower than its maximum.');
  }
}
export function getPlantTargets(plant: any, date = new Date()) {
  const policy = plant?.thresholdPolicy as ThresholdPolicy | undefined;
  const timeZone = policy?.timeZone || 'Asia/Kolkata';
  const dayStartHour = policy?.dayStartHour ?? 6, nightStartHour = policy?.nightStartHour ?? 18;
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone }).format(date));
  const isDay = dayStartHour < nightStartHour ? hour >= dayStartHour && hour < nightStartHour : hour >= dayStartHour || hour < nightStartHour;
  const primaryName = String(plant?.crop || plant?.name || '');
  const category = String(plant?.category || plant?.plantCategory || '').toLowerCase();
  const known = presets.find((preset) => preset.match.test(primaryName)) || presets.find((preset) => preset.match.test(String(plant?.variety || '')));
  const fallback = /fruit|vegetable/.test(category) && !/leaf/.test(category) ? presets[4] : /herb/.test(category) ? presets[2] : presets[1];
  const preset = known || fallback;
  const shared: TargetRanges = { ph: range(preset.ph), ec: range(preset.ec), tds: { min: preset.ec[0] * (policy?.tdsScale || 500), max: preset.ec[1] * (policy?.tdsScale || 500) }, waterTemp: { min: 18, max: 24 }, waterLevel: { min: 40, max: 100 } };
  const automaticDay: TargetRanges = { ...shared, temperature: range(preset.day), humidity: { min: 50, max: 75 }, vpd: { min: 0.6, max: 1.4 }, lightIntensity: { min: 8000, max: 22000 } };
  const automaticNight: TargetRanges = { ...shared, temperature: range(preset.night), humidity: { min: 55, max: 80 }, vpd: { min: 0.3, max: 1.1 }, lightIntensity: { min: 0, max: 500 } };
  const manual = policy?.mode === 'manual';
  const day = manual ? { ...automaticDay, ...(policy.day || plant?.optimalThresholds || plant?.thresholds) } : automaticDay;
  const night = manual ? { ...automaticNight, ...policy.night } : automaticNight;
  return { cropKey: known?.key || 'category', plantName: plant?.crop || plant?.name || preset.label,
    presetLabel: known ? preset.label : (category || 'Leafy greens') + ' category preset',
    period: isDay ? 'day' as const : 'night' as const, timeZone, dayStartHour, nightStartHour,
    mode: manual ? 'manual' as const : 'automatic' as const, day, night, thresholds: isDay ? day : night };
}
export function targetStatus(value: unknown, limits?: { min: number; max: number }) {
  if (typeof value !== 'number' || !Number.isFinite(value) || !limits) return 'unknown';
  if (value >= limits.min && value <= limits.max) return 'normal';
  const deviation = Math.max(limits.min - value, value - limits.max);
  return deviation > Math.max(0.01, limits.max - limits.min) * 0.25 ? 'critical' : 'warning';
}

export function getFarmDateString(date = new Date(), timeZone = 'Asia/Kolkata') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return get('year') + '-' + get('month') + '-' + get('day');
}
