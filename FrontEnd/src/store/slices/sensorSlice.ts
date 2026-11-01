import { StateCreator } from 'zustand';

export interface SensorData {
  deviceId: string;
  temperature: number;
  humidity: number;
  ph: number;
  ec: number;
  waterLevel: number;
  lightIntensity: number;
  vpd: number;
  waterTemp: number;
  co2: number;
  pumpStatus: boolean;
  autoMode: boolean;
  lastSensorTimestamp: string;
}

export type ConnectionMode = 'auto' | 'cloud' | 'local';
export type ActiveSource = 'cloud' | 'local' | 'mock' | 'none';

export interface LocalDeviceInfo {
  ip: string;
  deviceId: string;
  port?: number;
  lastSeen: string;
  isReachable: boolean;
  latencyMs?: number;
}

export interface SensorSlice {
  sensorData: SensorData | null;
  lastUpdated: string | null;
  isDeviceOnline: boolean;
  connectionMode: ConnectionMode;
  activeSource: ActiveSource;
  localDevice: LocalDeviceInfo | null;
  discoveredDevices: LocalDeviceInfo[];
  isSearchingLocal: boolean;
  updateSensorData: (data: SensorData) => void;
  setDeviceOnline: (online: boolean) => void;
  setConnectionMode: (mode: ConnectionMode) => void;
  setActiveSource: (source: ActiveSource) => void;
  setLocalDevice: (device: LocalDeviceInfo | null) => void;
  setDiscoveredDevices: (devices: LocalDeviceInfo[]) => void;
  setIsSearchingLocal: (searching: boolean) => void;
  togglePump: () => void;
  toggleAutoMode: () => void;
}

export const createSensorSlice: StateCreator<SensorSlice> = (set) => ({
  sensorData: {
    deviceId: 'MOCK_ESP32_01',
    temperature: 24.5,
    humidity: 65.2,
    ph: 6.0,
    ec: 1.5,
    waterLevel: 82,
    lightIntensity: 15500,
    vpd: 0.95,
    waterTemp: 20,
    co2: 450,
    pumpStatus: true,
    autoMode: true,
    lastSensorTimestamp: new Date().toISOString(),
  },
  lastUpdated: new Date().toISOString(),
  isDeviceOnline: false,
  connectionMode: 'auto',
  activeSource: 'none',
  localDevice: null,
  discoveredDevices: [],
  isSearchingLocal: false,

  updateSensorData: (data) =>
    set({
      sensorData: data,
      lastUpdated: new Date().toISOString(),
    }),

  setDeviceOnline: (online) =>
    set({
      isDeviceOnline: online,
    }),

  setConnectionMode: (mode) =>
    set({
      connectionMode: mode,
    }),

  setActiveSource: (source) =>
    set({
      activeSource: source,
    }),

  setLocalDevice: (device) =>
    set({
      localDevice: device,
    }),

  setDiscoveredDevices: (devices) =>
    set({
      discoveredDevices: devices,
    }),

  setIsSearchingLocal: (searching) =>
    set({
      isSearchingLocal: searching,
    }),

  togglePump: () =>
    set((state) => ({
      sensorData: state.sensorData
        ? {
            ...state.sensorData,
            pumpStatus: !state.sensorData.pumpStatus,
          }
        : null,
    })),

  toggleAutoMode: () =>
    set((state) => ({
      sensorData: state.sensorData
        ? {
            ...state.sensorData,
            autoMode: !state.sensorData.autoMode,
          }
        : null,
    })),
});