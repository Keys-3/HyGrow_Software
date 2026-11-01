import { StateCreator } from 'zustand';
import type { Telemetry } from '../../utils/telemetry';

export type SensorData = Telemetry | {
  deviceId: string;
  temperature: number | null;
  humidity: number | null;
  ph: number | null;
  ec?: number | null;
  tds?: number | null;
  waterLevel: number | null;
  lightIntensity: number | null;
  vpd: number | null;
  waterTemp: number | null;
  co2?: number | null;
  pumpStatus: boolean | null;
  autoMode: boolean | null;
  lastSensorTimestamp: string | null;
  [key: string]: any;
};

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
  clearSensorData: () => void;
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
  sensorData: null,
  lastUpdated: null,
  isDeviceOnline: false,
  connectionMode: 'auto',
  activeSource: 'none',
  localDevice: null,
  discoveredDevices: [],
  isSearchingLocal: false,

  updateSensorData: (data) =>
    set({
      sensorData: data,
      lastUpdated: data.lastSensorTimestamp || new Date().toISOString(),
    }),

  clearSensorData: () =>
    set({
      sensorData: null,
      lastUpdated: null,
      isDeviceOnline: false,
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
