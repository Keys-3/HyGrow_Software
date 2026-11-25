/** Global notifications share the same plant schedule as the dashboard. */
import { useEffect, useMemo } from 'react';
import { evaluateSetAlerts, DEFAULT_SENSOR_SETS } from '../utils/sensorSets';
import { alertEligible, freshness } from '../utils/telemetry';
import type { Telemetry } from '../utils/telemetry';
import useAppStore from '../store/useAppStore';
import { usePlantTargets } from './usePlantTargets';
export default function useAlerts(sensorData: Telemetry | null, stale = sensorData ? freshness(sensorData).stale : true) {
  const set = useAppStore(state => state.sensorSets.find(item => item.id === state.activeSensorSetId)) || DEFAULT_SENSOR_SETS[0];
  const preferences = useAppStore(state => state.farmerFeatures.sensors);
  const activeAlerts = useAppStore(state => state.activeAlerts);
  const addAlert = useAppStore(state => state.addAlert);
  const removeAlert = useAppStore(state => state.removeAlert);
  const context = usePlantTargets(set);
  const currentAlerts = useMemo(() => {
    if (!sensorData || stale || preferences.enabled === false) return [];
    return evaluateSetAlerts(sensorData, set).filter(alert => alertEligible(sensorData, alert.sensorKey) && (preferences as any)[alert.sensorKey] !== false);
  }, [sensorData, stale, set, context, preferences]);
  useEffect(() => {
    const ids = new Set(currentAlerts.map(alert => alert.id));
    activeAlerts.forEach(alert => { if (alert.id.startsWith('alert-') && !ids.has(alert.id)) removeAlert(alert.id); });
    currentAlerts.forEach(alert => {
      const old = activeAlerts.find(item => item.id === alert.id);
      if (!old) addAlert(alert);
    });
  }, [currentAlerts, activeAlerts, addAlert, removeAlert]);
  return { currentAlerts, activeAlerts, hasAlerts: currentAlerts.length > 0 };
}
