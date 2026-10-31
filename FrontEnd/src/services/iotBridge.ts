/** Firmware exposes telemetry only; commands require an implemented acknowledgement path. */
import { normalizeTelemetry } from '../utils/telemetry';

export async function sendActuatorCommand(_deviceId: string, _action: 'PUMP_ON' | 'PUMP_OFF'): Promise<never> {
  throw new Error('Physical actuator control is unavailable for this firmware.');
}
export async function getDeviceStatus(_deviceId: string): Promise<boolean | null> {
  // Unknown is distinct from a confirmed online/offline result.
  return null;
}
export function parseTelemetry(rawData: unknown, deviceId: string, source: 'local' | 'cloud' = 'local') {
  return normalizeTelemetry(rawData, deviceId, source);
}
