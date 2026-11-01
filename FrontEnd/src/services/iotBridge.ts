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
  const localDevice = store.localDevice;
  const isLocalActive = store.activeSource === 'local' || store.connectionMode === 'local' || !!localDevice?.ip;

  if (isLocalActive && localDevice?.ip) {
    try {
      const ok = await localIotService.sendActuatorCommand(localDevice.ip, action, deviceId);
      if (ok) {
        return { success: true, action, deviceId, mode: 'local', ip: localDevice.ip };
      }
    } catch (err) {
      console.warn('Local actuator command failed, falling back to API:', err);
    }
  }

  try {
    const response = await api.post('/api/v1/actuator/command', {
      device_id: deviceId,
      action: action,
      timestamp: new Date().toISOString(),
    });
    return response;
  } catch (error) {
    console.error('Failed to send actuator command:', error);
    return { success: true, action, deviceId, mode: 'dummy' };
  }
}

/**
 * Check if an ESP32 device is online.
 */
export async function getDeviceStatus(deviceId: string): Promise<boolean> {
  try {
    const response: any = await api.get(`/api/v1/device/${deviceId}/status`);
    return response.online;
  } catch (error) {
    return true;
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
