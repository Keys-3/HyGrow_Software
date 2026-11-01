/**
 * Farm Help — Local IoT Device Service
 * Handles UDP discovery (port 39400), direct HTTP status polling (http://<ip>/status),
 * and shared completed sensor snapshot mapping.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendUrl } from '../utils/apiConfig';
import { SensorData, LocalDeviceInfo } from '../store/slices/sensorSlice';

const STORAGE_KEY_LAST_IP = '@hygrow_active_iot_ip';
const UDP_PORT = 39400;

export interface FetchStatusResult {
  snapshot: SensorData;
  latencyMs: number;
  raw: any;
}

/**
 * Calculate Vapor Pressure Deficit (VPD) in kPa
 */
export function calculateVPD(tempC: number, rh: number): number {
  if (tempC === 0 && rh === 0) return 0;
  const svp = 0.61078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  const avp = svp * (rh / 100);
  return Number((svp - avp).toFixed(2));
}

/**
 * Normalize the one completed sensor snapshot shared between
 * IoT dashboard, local HTTP /status API, and Firebase.
 */
export function normalizeSensorSnapshot(data: any, fallbackDeviceId?: string): SensorData {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid sensor data snapshot');
  }

  const temp = Number(data.temp_c ?? data.temperature ?? data.air_temp_c ?? 0);
  const hum = Number(data.humidity ?? data.humidity_percent ?? 0);
  const ph = Number(data.ph_val ?? data.ph_value ?? data.ph ?? 0);
  const ec = Number(data.tds_ppm ?? data.ec ?? 0);
  const wl = Number(data.wl_percent ?? data.water_level_percent ?? data.waterLevel ?? 0);
  const lux = Number(data.lux ?? data.light_lux ?? data.lightIntensity ?? 0);
  const wTemp = Number(data.water_temp_c ?? data.waterTemp ?? 20);
  const co2 = Number(data.co2_ppm ?? data.co2 ?? 450);

  let vpd = data.vpd_kpa ?? data.vpd;
  if (vpd === undefined || vpd === null || isNaN(Number(vpd))) {
    vpd = calculateVPD(temp, hum);
  } else {
    vpd = Number(vpd);
  }

  // Pump status can be boolean, string, or 1/0
  let pumpStatus = false;
  if (typeof data.pumpStatus === 'boolean') {
    pumpStatus = data.pumpStatus;
  } else if (typeof data.pump_status === 'boolean') {
    pumpStatus = data.pump_status;
  } else if (data.pump_status === 1 || data.pump_status === '1' || data.pump_status === 'on' || data.pump_status === 'active') {
    pumpStatus = true;
  } else if (data.status === 'Online' || data.status === 'online') {
    pumpStatus = true;
  }

  // Auto mode
  let autoMode = true;
  if (typeof data.autoMode === 'boolean') {
    autoMode = data.autoMode;
  } else if (typeof data.auto_mode === 'boolean') {
    autoMode = data.auto_mode;
  }

  const deviceId =
    data.deviceId ||
    data.device_id ||
    data.id ||
    fallbackDeviceId ||
    'esp32-farm-001';

  let timestamp = data.lastUpdated || data.timestamp;
  if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
    timestamp = timestamp.toDate().toISOString();
  } else if (!timestamp || typeof timestamp !== 'string') {
    timestamp = new Date().toISOString();
  }

  return {
    deviceId,
    temperature: temp,
    humidity: hum,
    ph: ph,
    ec: ec,
    waterLevel: wl,
    lightIntensity: lux,
    vpd,
    waterTemp: wTemp,
    co2,
    pumpStatus,
    autoMode,
    lastSensorTimestamp: timestamp,
  };
}

class LocalIotService {
  private activeDeviceIp: string | null = null;

  constructor() {
    this.loadSavedIp();
  }

  /**
   * Load saved IP from AsyncStorage on app startup
   */
  async loadSavedIp(): Promise<string | null> {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY_LAST_IP);
      if (saved) {
        this.activeDeviceIp = saved;
        return saved;
      }
    } catch {
      // Ignore storage read error
    }
    return null;
  }

  /**
   * Set and persist active device IP
   */
  async setActiveDeviceIp(ip: string): Promise<void> {
    const cleanIp = this.cleanIp(ip);
    this.activeDeviceIp = cleanIp;
    try {
      await AsyncStorage.setItem(STORAGE_KEY_LAST_IP, cleanIp);
    } catch {
      // Ignore storage write error
    }
  }

  getActiveDeviceIp(): string | null {
    return this.activeDeviceIp;
  }

  cleanIp(ip: string): string {
    return String(ip).trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }

  /**
   * Fetch sensor snapshot from http://<device-ip>/status
   * Supports direct local connection and backend CORS proxy fallback
   */
  async fetchStatus(targetIp?: string): Promise<FetchStatusResult> {
    const ip = targetIp ? this.cleanIp(targetIp) : this.activeDeviceIp;
    if (!ip) {
      throw new Error('No device IP configured for local IoT connection');
    }

    const directUrl = `http://${ip}/status`;
    const startTime = Date.now();

    // 1. Attempt direct HTTP GET to device
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(directUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const rawJson = await response.json();
        const latencyMs = Date.now() - startTime;
        const snapshot = normalizeSensorSnapshot(rawJson, `esp32-${ip.replace(/\./g, '_')}`);
        this.setActiveDeviceIp(ip);
        return { snapshot, latencyMs, raw: rawJson };
      }
    } catch (directErr) {
      // Direct request failed (might be CORS on web platform or timeout)
      // If we are on web, try the backend proxy fallback
      if (Platform.OS === 'web') {
        try {
          const backendUrl = getBackendUrl();
          const proxyUrl = `${backendUrl}/api/iot/status?ip=${encodeURIComponent(ip)}`;
          const proxyRes = await fetch(proxyUrl);
          if (proxyRes.ok) {
            const result = await proxyRes.json();
            const latencyMs = result.latencyMs || (Date.now() - startTime);
            const snapshot = normalizeSensorSnapshot(result.data, `esp32-${ip.replace(/\./g, '_')}`);
            this.setActiveDeviceIp(ip);
            return { snapshot, latencyMs, raw: result.data };
          }
        } catch {
          // proxy also failed, re-throw direct error
        }
      }
      throw new Error(`Failed to reach ${directUrl}: ${directErr instanceof Error ? directErr.message : String(directErr)}`);
    }

    throw new Error(`Device at ${ip} returned non-200 status code`);
  }

  /**
   * Discover devices on local network using UDP discovery on port 39400
   * (via backend gateway and common IP probing)
   */
  async discoverDevices(): Promise<LocalDeviceInfo[]> {
    const discovered: Map<string, LocalDeviceInfo> = new Map();

    // Strategy 1: Check backend UDP discovery service (running on port 39400)
    try {
      const backendUrl = getBackendUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${backendUrl}/api/iot/discover?wait=1200`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json.devices && Array.isArray(json.devices)) {
          for (const dev of json.devices) {
            discovered.set(dev.ip, {
              ip: dev.ip,
              deviceId: dev.deviceId || `esp32-${dev.ip.replace(/\./g, '_')}`,
              port: dev.port || UDP_PORT,
              lastSeen: dev.lastSeen || new Date().toISOString(),
              isReachable: true,
            });
          }
        }
      }
    } catch {
      // Backend not running or unreachable, fallback to direct probes
    }

    // Strategy 2: Fast ping probe on common local IoT addresses
    // (e.g. 192.168.4.1 for ESP32 Access Point mode, and currently saved IP)
    const probeIps = new Set<string>();
    if (this.activeDeviceIp) probeIps.add(this.activeDeviceIp);
    probeIps.add('192.168.4.1'); // standard ESP32 softAP IP

    const probePromises = Array.from(probeIps).map(async (ip) => {
      if (discovered.has(ip)) return;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const startTime = Date.now();
        const res = await fetch(`http://${ip}/status`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const latencyMs = Date.now() - startTime;
          const data = await res.json();
          const deviceId = data.deviceId || data.device_id || `esp32-${ip.replace(/\./g, '_')}`;
          discovered.set(ip, {
            ip,
            deviceId,
            port: UDP_PORT,
            lastSeen: new Date().toISOString(),
            isReachable: true,
            latencyMs,
          });
        }
      } catch {
        // unreachable
      }
    });

    await Promise.allSettled(probePromises);

    return Array.from(discovered.values());
  }

  /**
   * Send actuator command directly to local device (pump on/off)
   */
  async sendActuatorCommand(ip: string, action: 'PUMP_ON' | 'PUMP_OFF', deviceId?: string): Promise<boolean> {
    const cleanIp = this.cleanIp(ip);

    // 1. Try direct POST http://<ip>/actuator
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`http://${cleanIp}/actuator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          deviceId: deviceId || 'esp32-farm',
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) return true;
    } catch {
      // direct post failed
    }

    // 2. Try direct GET http://<ip>/pump?state=on/off
    try {
      const state = action === 'PUMP_ON' ? 'on' : 'off';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`http://${cleanIp}/pump?state=${state}`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) return true;
    } catch {
      // get failed
    }

    // 3. Fallback to backend proxy if available
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/iot/actuator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: cleanIp, action, deviceId }),
      });
      if (res.ok) return true;
    } catch {
      // backend proxy failed
    }

    return false;
  }
}

export const localIotService = new LocalIotService();
export default localIotService;
