import { Router } from 'express';
import {
  sendDiscoveryBroadcast,
  getDiscoveredDevices,
  registerDevice,
} from '../services/udpDiscovery.js';

const router = Router();

/**
 * Trigger UDP discovery broadcast on port 39400 and return discovered devices
 */
router.get('/discover', async (req, res) => {
  try {
    await sendDiscoveryBroadcast();

    // Allow time for UDP responses to arrive
    const waitMs = Number(req.query.wait) || 1200;
    await new Promise((resolve) => setTimeout(resolve, waitMs));

    const devices = getDiscoveredDevices();
    res.json({
      success: true,
      count: devices.length,
      devices,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * Get cached discovered devices
 */
router.get('/devices', (req, res) => {
  const devices = getDiscoveredDevices();
  res.json({
    success: true,
    count: devices.length,
    devices,
  });
});

/**
 * Proxy fetch http://<device-ip>/status
 * Solves browser CORS restrictions when testing from web frontends
 */
router.get('/status', async (req, res) => {
  const { ip } = req.query;
  if (!ip) {
    return res.status(400).json({
      success: false,
      error: 'Query parameter "ip" is required (e.g. /api/iot/status?ip=192.168.1.50)',
    });
  }

  const cleanIp = String(ip).trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const url = `http://${cleanIp}/status`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const startTime = Date.now();
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Device responded with HTTP ${response.status}`,
      });
    }

    const data = await response.json();

    // Register device in discovered list if not already there
    const deviceId = data.deviceId || data.device_id || `esp32-${cleanIp.replace(/\./g, '_')}`;
    registerDevice(deviceId, cleanIp);

    res.json({
      success: true,
      ip: cleanIp,
      latencyMs,
      data,
    });
  } catch (err) {
    res.status(502).json({
      success: false,
      ip: cleanIp,
      error: `Could not reach ${url}: ${err.message}`,
    });
  }
});

/**
 * Send actuator command to local device http://<device-ip>/actuator or /pump
 */
router.post('/actuator', async (req, res) => {
  const { ip, action, deviceId } = req.body;
  if (!ip) {
    return res.status(400).json({
      success: false,
      error: 'Body parameter "ip" is required',
    });
  }

  const cleanIp = String(ip).trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const endpoints = [
    `http://${cleanIp}/actuator`,
    `http://${cleanIp}/pump`,
    `http://${cleanIp}/control`,
  ];

  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          deviceId: deviceId || 'unknown',
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const result = await response.json().catch(() => ({ status: 'ok' }));
        return res.json({
          success: true,
          action,
          endpoint,
          result,
        });
      }
    } catch (err) {
      lastError = err;
    }
  }

  // Fallback to GET query param command if POST is not implemented by device firmware
  try {
    const isPumpOn = action === 'PUMP_ON';
    const fallbackUrl = `http://${cleanIp}/pump?state=${isPumpOn ? 'on' : 'off'}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const getRes = await fetch(fallbackUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (getRes.ok) {
      return res.json({
        success: true,
        action,
        method: 'GET',
        endpoint: fallbackUrl,
      });
    }
  } catch (err) {
    lastError = err;
  }

  res.status(502).json({
    success: false,
    error: `Failed to send actuator command to ${cleanIp}: ${lastError?.message || 'Unreachable'}`,
  });
});

/**
 * Manually register a device IP
 */
router.post('/register', (req, res) => {
  const { ip, deviceId } = req.body;
  if (!ip) {
    return res.status(400).json({ success: false, error: 'IP is required' });
  }
  const cleanIp = String(ip).trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const info = registerDevice(deviceId, cleanIp);
  res.json({ success: true, device: info });
});

export default router;
