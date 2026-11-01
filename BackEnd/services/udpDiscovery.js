import dgram from 'dgram';
import os from 'os';

const UDP_PORT = 39400;
const DISCOVERY_PROBES = [
  JSON.stringify({ cmd: 'discover', app: 'HyGrow' }),
  'HYGROW_DISCOVER',
  'DISCOVER'
];

// Map of discovered devices: key is deviceId or IP -> { deviceId, ip, port, lastSeen, info }
const discoveredDevices = new Map();

let socket = null;
let isListening = false;

/**
 * Calculate broadcast address from interface IPv4 address and netmask
 */
function getBroadcastAddress(ip, netmask) {
  try {
    const ipParts = ip.split('.').map(Number);
    const maskParts = netmask.split('.').map(Number);
    const broadcastParts = ipParts.map((part, i) => (part | (~maskParts[i] & 255)));
    return broadcastParts.join('.');
  } catch {
    return '255.255.255.255';
  }
}

/**
 * Get all available IPv4 broadcast addresses across network interfaces
 */
function getLocalBroadcastAddresses() {
  const addresses = new Set(['255.255.255.255']);
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          const broadcast = getBroadcastAddress(iface.address, iface.netmask);
          if (broadcast) addresses.add(broadcast);
        }
      }
    }
  } catch (err) {
    console.warn('[UDP Discovery] Could not detect all broadcast addresses:', err.message);
  }
  return Array.from(addresses);
}

/**
 * Parse an incoming UDP message from a device
 */
function parseDeviceMessage(rawString, rinfo) {
  const trimmed = rawString.trim();
  let deviceId = null;
  let ip = rinfo.address;
  let rawJson = null;

  // Attempt JSON parse
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      rawJson = JSON.parse(trimmed);
      deviceId = rawJson.deviceId || rawJson.device_id || rawJson.id || rawJson.name;
      if (rawJson.ip && typeof rawJson.ip === 'string') {
        ip = rawJson.ip;
      }
    } catch {
      // not JSON, fallback to text parsing
    }
  }

  // Fallback to text parsing (e.g. "HYGROW:esp32-farm-001:192.168.1.100" or "esp32-farm-001 192.168.1.100")
  if (!deviceId) {
    const colonMatch = trimmed.match(/^(?:HYGROW:)?([^:]+)(?::([^:]+))?$/i);
    const spaceMatch = trimmed.match(/^([^\s]+)(?:\s+([^\s]+))?$/);

    if (colonMatch) {
      deviceId = colonMatch[1];
      if (colonMatch[2] && colonMatch[2].includes('.')) {
        ip = colonMatch[2];
      }
    } else if (spaceMatch) {
      deviceId = spaceMatch[1];
      if (spaceMatch[2] && spaceMatch[2].includes('.')) {
        ip = spaceMatch[2];
      }
    }
  }

  if (!deviceId) {
    deviceId = `esp32-${rinfo.address.replace(/\./g, '_')}`;
  }

  return {
    deviceId,
    ip,
    port: rinfo.port,
    lastSeen: new Date().toISOString(),
    raw: rawJson || trimmed,
  };
}

/**
 * Initialize UDP socket to listen on port 39400
 */
export function startUdpListener() {
  if (isListening && socket) return;

  try {
    socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    socket.on('error', (err) => {
      console.error('[UDP Discovery Error]:', err.message);
    });

    socket.on('message', (msg, rinfo) => {
      try {
        const rawString = msg.toString('utf8');
        const deviceInfo = parseDeviceMessage(rawString, rinfo);

        discoveredDevices.set(deviceInfo.deviceId, deviceInfo);
        console.log(`[UDP Discovery] Found device ${deviceInfo.deviceId} at ${deviceInfo.ip}:${rinfo.port}`);
      } catch (err) {
        console.error('[UDP Discovery] Failed to process message:', err.message);
      }
    });

    socket.on('listening', () => {
      try {
        socket.setBroadcast(true);
      } catch (e) {
        console.warn('[UDP Discovery] setBroadcast warning:', e.message);
      }
      isListening = true;
      const addr = socket.address();
      console.log(`[UDP Discovery] Listening on UDP port ${addr.port}`);
    });

    socket.bind(UDP_PORT);
  } catch (err) {
    console.error('[UDP Discovery] Failed to bind socket:', err.message);
  }
}

/**
 * Broadcast discovery probe on UDP port 39400 across all local subnet broadcast addresses
 */
export async function sendDiscoveryBroadcast() {
  if (!socket) {
    startUdpListener();
  }

  const broadcastAddrs = getLocalBroadcastAddresses();

  for (const addr of broadcastAddrs) {
    for (const probe of DISCOVERY_PROBES) {
      try {
        const message = Buffer.from(probe);
        socket.send(message, 0, message.length, UDP_PORT, addr, (err) => {
          if (err) {
            // Ignore normal broadcast send errors on non-routed interfaces
          }
        });
      } catch (err) {
        // Continue with next probe
      }
    }
  }
}

/**
 * Return list of active discovered devices, filtering out any older than 2 minutes
 */
export function getDiscoveredDevices() {
  const now = Date.now();
  const maxAge = 2 * 60 * 1000;
  const result = [];

  for (const [key, dev] of discoveredDevices.entries()) {
    const age = now - new Date(dev.lastSeen).getTime();
    if (age <= maxAge) {
      result.push(dev);
    } else {
      discoveredDevices.delete(key);
    }
  }

  return result;
}

/**
 * Manually register a device (e.g. from manual IP ping)
 */
export function registerDevice(deviceId, ip) {
  const info = {
    deviceId: deviceId || `esp32-${ip.replace(/\./g, '_')}`,
    ip,
    port: UDP_PORT,
    lastSeen: new Date().toISOString(),
  };
  discoveredDevices.set(info.deviceId, info);
  return info;
}
