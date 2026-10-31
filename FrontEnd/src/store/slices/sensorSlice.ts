import type { StateCreator } from 'zustand';
import type { Telemetry } from '../../utils/telemetry';

export type SensorData = Telemetry;
export interface SensorSlice {
  sensorData: SensorData | null;
  lastUpdated: string | null;
  isDeviceOnline: boolean;
  updateSensorData: (data: SensorData) => void;
  clearSensorData: () => void;
  setDeviceOnline: (online: boolean) => void;
  togglePump: () => void;
  toggleAutoMode: () => void;
}
export const createSensorSlice: StateCreator<SensorSlice> = (set) => ({
  sensorData: null,
  lastUpdated: null,
  isDeviceOnline: false,
  updateSensorData: (data) => set({sensorData:data,lastUpdated:data.lastSensorTimestamp}),
  clearSensorData: () => set({sensorData:null,lastUpdated:null,isDeviceOnline:false}),
  setDeviceOnline: (online) => set({isDeviceOnline:online}),
  // Firmware has no authenticated app actuator acknowledgement protocol.
  togglePump: () => { throw new Error('Physical pump control is unavailable.'); },
  toggleAutoMode: () => { throw new Error('Physical automation control is unavailable.'); },
});
