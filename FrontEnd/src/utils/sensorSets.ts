import type { Telemetry } from './telemetry';

export interface SensorSetThresholds {
  temperature?: { min: number; max: number };
  humidity?: { min: number; max: number };
  ph?: { min: number; max: number };
  ec?: { min: number; max: number };
  tds?: { min: number; max: number };
  waterTemp?: { min: number; max: number };
  waterLevel?: { min: number; max: number };
  lightIntensity?: { min: number; max: number };
  vpd?: { min: number; max: number };
  co2?: { min: number; max: number };
  [key: string]: { min: number; max: number } | undefined;
}

export interface SensorSet {
  id: string;
  name: string;
  zone: string;
  zoneId?: string;
  crop: string;
  growingSystem?: string;
  deviceId: string;
  isPrimary?: boolean;
  status?: 'active' | 'offline' | 'calibrated';
  associatedPlantIds?: string[];
  sensorIds?: string[];
  sensorTypes?: string[];
  lastReadingAt?: string;
  thresholds: SensorSetThresholds;
  calibrationOffsets?: {
    temperature?: number;
    humidity?: number;
    ph?: number;
    ec?: number;
    tds?: number;
    waterTemp?: number;
    waterLevel?: number;
    lightIntensity?: number;
    vpd?: number;
    co2?: number;
    [key: string]: number | undefined;
  };
}

export interface SetAlert {
  id: string;
  setId: string;
  setName: string;
  sensorKey: string;
  sensorLabel: string;
  type: 'warning' | 'critical';
  value: number;
  threshold: number;
  unit: string;
  message: string;
  timestamp: string;
}

export const SENSOR_SET_KEYS = [
  'temperature',
  'humidity',
  'ph',
  'ec',
  'tds',
  'waterTemp',
  'waterLevel',
  'lightIntensity',
  'vpd',
  'co2',
] as const;

export const SENSOR_METRIC_CONFIG: Record<
  string,
  { label: string; unit: string; min: number; max: number }
> = {
  temperature: { label: 'Air Temperature', unit: '°C', min: 20, max: 26 },
  humidity: { label: 'Relative Humidity', unit: '%', min: 55, max: 70 },
  ph: { label: 'Nutrient pH', unit: 'pH', min: 5.6, max: 6.4 },
  ec: { label: 'Electroconductivity', unit: 'mS/cm', min: 1.2, max: 1.8 },
  tds: { label: 'TDS Concentration', unit: 'ppm', min: 600, max: 900 },
  waterTemp: { label: 'Water Temp', unit: '°C', min: 18, max: 22 },
  waterLevel: { label: 'Reservoir Level', unit: '%', min: 40, max: 100 },
  lightIntensity: { label: 'Light Intensity', unit: 'Lux', min: 8000, max: 20000 },
  vpd: { label: 'VPD Deficit', unit: 'kPa', min: 0.8, max: 1.2 },
  co2: { label: 'Carbon Dioxide', unit: 'ppm', min: 400, max: 1200 },
};

export const DEFAULT_SENSOR_SETS: SensorSet[] = [
  {
    id: 'set-main',
    name: 'Methi',
    zone: 'Zone A (Bench 1-4)',
    zoneId: 'zone-a',
    crop: 'Methi',
    growingSystem: 'NFT (Nutrient Film Technique)',
    deviceId: 'esp32-farm-01',
    isPrimary: true,
    status: 'active',
    associatedPlantIds: [
      'plant-methi',
      'plant-butterhead-lettuce',
      'plant-rainbow-chard',
      'plant-cherry-tomatoes',
      'plant-crisp-peppers',
    ],
    sensorIds: ['temp-a-01', 'humidity-a-01', 'ph-a-01', 'ec-a-01', 'water-a-01', 'lux-a-01'],
    sensorTypes: ['DHT22 Air Temp/RH', 'Glass pH Electrode', 'Toroidal EC Probe', 'Submersible Temp', 'BH1750 Lux'],
    thresholds: {
      temperature: { min: 20.0, max: 25.5 },
      humidity: { min: 55.0, max: 68.0 },
      ph: { min: 5.6, max: 6.4 },
      ec: { min: 1.2, max: 1.8 },
      tds: { min: 600, max: 900 },
      waterTemp: { min: 18.0, max: 22.0 },
      waterLevel: { min: 40.0, max: 100.0 },
      lightIntensity: { min: 8000, max: 18000 },
      vpd: { min: 0.8, max: 1.2 },
    },
    calibrationOffsets: {
      temperature: 0,
      humidity: 0,
      ph: 0,
      ec: 0,
      tds: 0,
      waterTemp: 0,
      waterLevel: 0,
      lightIntensity: 0,
      vpd: 0,
    },
  },
  {
    id: 'set-dwc',
    name: 'Genovese Basil',
    zone: 'Zone B (Tanks 1-2)',
    zoneId: 'zone-b',
    crop: 'Genovese Basil',
    growingSystem: 'DWC (Deep Water Culture)',
    deviceId: 'esp32-farm-02',
    isPrimary: false,
    status: 'active',
    associatedPlantIds: ['plant-genovese-basil', 'plant-spearmint'],
    sensorIds: ['temp-b-02', 'humidity-b-02', 'ph-b-02', 'ec-b-02', 'water-b-02', 'lux-b-02'],
    sensorTypes: ['DHT22 Air Temp/RH', 'Glass pH Electrode', 'Toroidal EC Probe', 'Submersible Temp', 'BH1750 Lux'],
    thresholds: {
      temperature: { min: 21.0, max: 27.0 },
      humidity: { min: 60.0, max: 72.0 },
      ph: { min: 5.8, max: 6.6 },
      ec: { min: 1.4, max: 2.2 },
      tds: { min: 700, max: 1100 },
      waterTemp: { min: 19.0, max: 23.5 },
      waterLevel: { min: 50.0, max: 100.0 },
      lightIntensity: { min: 10000, max: 22000 },
      vpd: { min: 0.9, max: 1.3 },
    },
    calibrationOffsets: {
      temperature: 1.4,
      humidity: 5,
      ph: 0.22,
      ec: 0.25,
      tds: 125,
      waterTemp: 0.8,
      waterLevel: -6,
      lightIntensity: 3500,
      vpd: 0.08,
    },
  },
  {
    id: 'set-nursery',
    name: 'Baby Spinach',
    zone: 'Zone C (Rack Enclosure)',
    zoneId: 'zone-c',
    crop: 'Baby Spinach',
    growingSystem: 'Vertical Aeroponic Column & Plug Trays',
    deviceId: 'esp32-farm-03',
    isPrimary: false,
    status: 'active',
    associatedPlantIds: ['plant-hydro-strawberries', 'plant-baby-spinach'],
    sensorIds: ['temp-c-03', 'humidity-c-03', 'ph-c-03', 'ec-c-03', 'water-c-03', 'lux-c-03'],
    sensorTypes: ['DHT22 Air Temp/RH', 'Glass pH Electrode', 'Toroidal EC Probe', 'Submersible Temp', 'BH1750 Lux'],
    thresholds: {
      temperature: { min: 23.0, max: 28.5 },
      humidity: { min: 68.0, max: 82.0 },
      ph: { min: 5.5, max: 6.2 },
      ec: { min: 0.6, max: 1.3 },
      tds: { min: 300, max: 650 },
      waterTemp: { min: 21.0, max: 25.0 },
      waterLevel: { min: 60.0, max: 100.0 },
      lightIntensity: { min: 4000, max: 12000 },
      vpd: { min: 0.6, max: 1.0 },
    },
    calibrationOffsets: {
      temperature: 2.8,
      humidity: 12,
      ph: -0.28,
      ec: -0.55,
      tds: -275,
      waterTemp: 2.1,
      waterLevel: 5,
      lightIntensity: -4500,
      vpd: -0.22,
    },
  },
];

/**
 * Find assigned sensor set for a plant with fallback to matching zone or primary set
 */
export function getAssignedSensorSetForPlant(
  plantId: string,
  preferredSetId?: string,
  availableSets: SensorSet[] = DEFAULT_SENSOR_SETS
): SensorSet {
  if (preferredSetId) {
    const directMatch = availableSets.find((s) => s.id === preferredSetId);
    if (directMatch) return directMatch;
  }

  // Check if plantId is explicitly associated in set definition
  const mappedSet = availableSets.find((s) => s.associatedPlantIds?.includes(plantId));
  if (mappedSet) return mappedSet;

  // Fallback to primary or first available
  return availableSets.find((s) => s.isPrimary) || availableSets[0] || DEFAULT_SENSOR_SETS[0];
}

/**
 * Apply set-specific environmental calibrations to base telemetry
 */
export function getEffectiveSetTelemetry(
  base: Telemetry | null,
  sensorSet: SensorSet
): Telemetry | null {
  if (!base) return null;

  const offsets = sensorSet.calibrationOffsets || {};

  const applyOffset = (val: number | null, offset = 0) => {
    if (val === null || typeof val !== 'number') return null;
    return Number((val + offset).toFixed(2));
  };

  const temp = applyOffset(base.temperature, offsets.temperature || 0);
  const hum = applyOffset(base.humidity, offsets.humidity || 0);
  const ph = applyOffset(base.ph, offsets.ph || 0);
  const ec = applyOffset(base.ec, offsets.ec || 0);
  const tds = applyOffset(base.tds, offsets.tds || 0);
  const waterTemp = applyOffset(base.waterTemp, offsets.waterTemp || 0);
  const waterLevel = applyOffset(base.waterLevel, offsets.waterLevel || 0);
  const light = applyOffset(base.lightIntensity, offsets.lightIntensity || 0);
  const vpd = applyOffset(base.vpd, offsets.vpd || 0);

  return {
    ...base,
    deviceId: base.deviceId,
    temperature: temp,
    humidity: hum,
    ph,
    ec,
    tds,
    waterTemp,
    waterLevel,
    lightIntensity: light,
    vpd,
  };
}

/**
 * Format a sensor reading according to its precision requirements
 */
function formatSetSensorValue(key: string, val: number): string {
  if (key === 'ph' || key === 'ec') return val.toFixed(2);
  if (key === 'temperature' || key === 'waterTemp' || key === 'vpd') return val.toFixed(1);
  return String(Math.round(val));
}

/**
 * Generate alerts based on a sensor set's configured thresholds
 */
export function evaluateSetAlerts(
  sensorData: Telemetry | null,
  sensorSet: SensorSet
): SetAlert[] {
  if (!sensorData) return [];

  const alerts: SetAlert[] = [];
  const setThresholds = sensorSet.thresholds || {};

  SENSOR_SET_KEYS.forEach((key) => {
    const rawVal = (sensorData as any)[key];
    if (rawVal === null || typeof rawVal !== 'number' || !Number.isFinite(rawVal)) {
      return;
    }

    const config = SENSOR_METRIC_CONFIG[key];
    if (!config) return;

    const limits = setThresholds[key] || { min: config.min, max: config.max };
    const isLow = rawVal < limits.min;
    const isHigh = rawVal > limits.max;

    if (isLow || isHigh) {
      const limit = isHigh ? limits.max : limits.min;
      const deviation = Math.abs(rawVal - limit);
      const span = Math.max(1, Math.abs(limits.max - limits.min));
      const isCritical = deviation / span > 0.25;

      const type: 'warning' | 'critical' = isCritical ? 'critical' : 'warning';
      const formattedVal = formatSetSensorValue(key, rawVal);
      const formattedLimit = formatSetSensorValue(key, limit);

      alerts.push({
        id: `alert-${sensorSet.id}-${key}-${type}`,
        setId: sensorSet.id,
        setName: sensorSet.name,
        sensorKey: key,
        sensorLabel: config.label,
        type,
        value: rawVal,
        threshold: limit,
        unit: config.unit,
        message: `[${sensorSet.name}] ${config.label} is ${isHigh ? 'above' : 'below'} threshold: ${formattedVal} ${config.unit} (Limit: ${formattedLimit} ${config.unit})`,
        timestamp: sensorData.lastSensorTimestamp || new Date().toISOString(),
      });
    }
  });

  return alerts;
}
