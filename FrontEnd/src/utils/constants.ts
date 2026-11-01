/**
 * Farm Help — Constants
 */

export interface Threshold {
  min: number;
  max: number;
  unit: string;
  criticalMin: number;
  criticalMax: number;
}

export type SensorKey =
  | 'temperature'
  | 'humidity'
  | 'ph'
  | 'ec'
  | 'tds'
  | 'waterLevel'
  | 'lightIntensity'
  | 'vpd'
  | 'waterTemp'
  | 'co2';

export const SENSOR_THRESHOLDS: Record<SensorKey, Threshold> = {
  temperature: {
    min: 18,
    max: 28,
    unit: '°C',
    criticalMin: 10,
    criticalMax: 35,
  },
  humidity: {
    min: 50,
    max: 80,
    unit: '%',
    criticalMin: 30,
    criticalMax: 95,
  },
  ph: {
    min: 5.5,
    max: 6.5,
    unit: '',
    criticalMin: 4.0,
    criticalMax: 8.0,
  },
  ec: { min: 1.0, max: 2.5, unit: 'mS/cm', criticalMin: 0.5, criticalMax: 4 },
  tds: { min: 150, max: 500, unit: 'ppm', criticalMin: 50, criticalMax: 1000 },
  waterLevel: {
    min: 20,
    max: 100,
    unit: '%',
    criticalMin: 10,
    criticalMax: 100,
  },
  lightIntensity: {
    min: 500,
    max: 5000,
    unit: 'lux',
    criticalMin: 100,
    criticalMax: 10000,
  },
  vpd: {
    min: 0.8,
    max: 1.2,
    unit: 'kPa',
    criticalMin: 0.4,
    criticalMax: 1.6,
  },
  waterTemp: {
    min: 18,
    max: 22,
    unit: '°C',
    criticalMin: 15,
    criticalMax: 26,
  },
  co2: {
    min: 400,
    max: 1200,
    unit: 'ppm',
    criticalMin: 300,
    criticalMax: 2000,
  },
};

export const SENSOR_CONFIG: Record<
  SensorKey,
  {
    label: string;
    unit: string;
    color: string;
    icon: string;
    description?: string;
  }
> = {
  temperature: {
    label: 'Temperature',
    unit: '°C',
    color: '#EF4444',
    icon: '🌡️',
    description: 'Ambient air temperature around the crop environment.',
  },
  humidity: {
    label: 'Humidity',
    unit: '%',
    color: '#3B82F6',
    icon: '💧',
    description: 'Relative humidity of the surrounding air.',
  },
  ph: {
    label: 'pH',
    unit: '',
    color: '#10B981',
    icon: '🧪',
    description: 'Acidity / alkalinity of the nutrient solution or water.',
  },
  ec: { label: 'EC', unit: 'mS/cm', color: '#F59E0B', icon: '?', description: 'Not supplied by this device firmware.' },
  tds: { label: 'TDS', unit: 'ppm', color: '#F59E0B', icon: '?', description: 'Total dissolved solids measured in ppm; no EC conversion is assumed.' },
  waterLevel: {
    label: 'Water Level',
    unit: '%',
    color: '#06B6D4',
    icon: '🪣',
    description: 'Tank or reservoir fill level percentage.',
  },
  lightIntensity: {
    label: 'Light Intensity',
    unit: 'lux',
    color: '#FACC15',
    icon: '☀️',
    description: 'Current light exposure measured in lux.',
  },
  vpd: {
    label: 'VPD',
    unit: 'kPa',
    color: '#D946EF',
    icon: '☁️',
    description: 'Vapor Pressure Deficit for measuring plant transpiration potential.',
  },
  waterTemp: {
    label: 'Water Temp',
    unit: '°C',
    color: '#0284C7',
    icon: '🧊',
    description: 'Temperature of the hydroponic nutrient solution.',
  },
  co2: {
    label: 'CO2 Levels',
    unit: 'ppm',
    color: '#0D9488',
    icon: '💨',
    description: 'Carbon Dioxide concentration in the grow area.',
  },
};

export const SENSOR_KEYS: SensorKey[] = [
  'temperature',
  'humidity',
  'ph',
  'tds',
  'waterLevel',
  'lightIntensity',
  'vpd',
  'waterTemp',
  'co2',
];

export const AUTO_CONTROL_RULES = {
  pump: {
    onCondition: 'Water level below 30%',
    offCondition: 'Water level above 80%',
    minWaterLevel: 30,
    maxWaterLevel: 80,
  },
};

export const DEVICE_CONFIG = {
  postIntervalMs: 30000,
  apiEndpoint: '/api/v1/telemetry/ingest',
  deviceIdPrefix: 'esp32-farm-',
};

export const ACTUATOR_STATES = {
  PUMP_ON: 'PUMP_ON',
  PUMP_OFF: 'PUMP_OFF',
} as const;

export const APP_CONSTANTS = {
  HISTORY_LIMIT: 100,
  REFRESH_INTERVAL: 30000,
  MAX_ALERTS: 20,
};

export const ALERT_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
} as const;

// No measurements are available before the first validated device sample.
export const DEFAULT_SENSOR_DATA = null;
