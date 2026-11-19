/**
 * Farm Help — IoT Bridge Service
 */

import api from './api';
import localIotService from './localIotService';
import useAppStore from '../store/useAppStore';

export interface TelemetryPayload {
  device_id: string;
  temperature: number;
  humidity: number;
  ph: number;
  ec: number;
  water_level: number;
  pump_status: boolean;
  timestamp: string;
}

/**
 * Send an actuator command to the ESP32.
 * If connected to local IoT device on LAN, sends direct command to http://<ip>/actuator.
 * Otherwise falls back to cloud API bridge.
 */
export async function sendActuatorCommand(deviceId: string, action: 'PUMP_ON' | 'PUMP_OFF') {
  const store = useAppStore.getState();
  const configuredUrl = process.env.EXPO_PUBLIC_LOCAL_STATUS_URL?.trim();
  const ip = store.localDevice?.ip || (configuredUrl ? new URL(configuredUrl).host : null);
  if (!ip) throw new Error('Connect this ESP32 on the local network to control its pump.');
  const snapshot = await localIotService.fetchStatus(ip);
  const actualHardware = snapshot.raw.device?.hardwareId || snapshot.raw.hardwareId;
  const selectedHardware = store.sensorData?.deviceId === deviceId ? store.sensorData.hardwareId : null;
  const sameDevice = snapshot.raw.deviceId === deviceId || snapshot.raw.device?.deviceId === deviceId;
  const sameHardware = actualHardware && selectedHardware && actualHardware === selectedHardware;
  if (!sameDevice && !sameHardware) {
    throw new Error('The local ESP32 does not match the selected sensor set.');
  }
  const ok = await localIotService.sendActuatorCommand(ip, action, deviceId);
  if (!ok) throw new Error('The ESP32 did not accept the pump command.');
  return { success: true, action, deviceId, mode: 'local' };

}

/**
 * Check if an ESP32 device is online.
 */
export async function getDeviceStatus(deviceId: string): Promise<boolean> {
  try {
    const response: any = await api.get(`/api/v1/device/${deviceId}/status`);
    return response.online;
  } catch (error) {
    return false;
  }
}

/**
 * Parse and validate telemetry data from ESP32.
 */
export function parseTelemetry(rawData: any) {
  return {
    temperature: clampValue(rawData.temperature, -10, 60),
    humidity: clampValue(rawData.humidity, 0, 100),
    ph: clampValue(rawData.ph, 0, 14),
    ec: clampValue(rawData.ec, 0, 10),
    waterLevel: clampValue(rawData.waterLevel, 0, 100),
    pumpStatus: Boolean(rawData.pumpStatus),
    timestamp: rawData.timestamp || new Date().toISOString(),
    deviceId: rawData.deviceId || rawData.device_id || 'unknown',
  };
}

function clampValue(value: any, min: number, max: number): number | null {
  if (typeof value !== 'number' || isNaN(value)) return null;
  return Math.min(Math.max(value, min), max);
}
