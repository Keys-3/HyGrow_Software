import { useMemo } from 'react';
import useAppStore from '../store/useAppStore';
import useEffectiveSensorData from './useEffectiveSensorData';
import {
  DEFAULT_SENSOR_SETS,
  SensorSet,
  SensorSetThresholds,
  SetAlert,
  getEffectiveSetTelemetry,
  evaluateSetAlerts,
} from '../utils/sensorSets';

export function useMultiSensorSets() {
  const sensorSets = useAppStore((state) => state.sensorSets) || DEFAULT_SENSOR_SETS;
  const activeSensorSetId = useAppStore((state) => state.activeSensorSetId) || 'set-main';
  const setActiveSensorSetId = useAppStore((state) => state.setActiveSensorSetId);
  const saveSensorSet = useAppStore((state) => state.saveSensorSet);
  const deleteSensorSet = useAppStore((state) => state.deleteSensorSet);
  const updateSensorSetThresholds = useAppStore((state) => state.updateSensorSetThresholds);

  const effectiveSensorData = useEffectiveSensorData();
  const { current: baseCurrent, rawHistory, loading, error, refresh, isOffline, isLastKnown } = effectiveSensorData;

  // Active sensor set
  const activeSet = useMemo(() => {
    return sensorSets.find((s) => s.id === activeSensorSetId) || sensorSets[0] || DEFAULT_SENSOR_SETS[0];
  }, [sensorSets, activeSensorSetId]);

  // Calibrated/routed telemetry for the active set
  const activeTelemetry = useMemo(() => {
    return getEffectiveSetTelemetry(baseCurrent, activeSet);
  }, [baseCurrent, activeSet]);

  // Set-specific alerts for the active set
  const activeSetAlerts = useMemo(() => {
    return evaluateSetAlerts(activeTelemetry, activeSet);
  }, [activeTelemetry, activeSet]);

  // Alert summary across all sets (to show alert status dots on inactive set pills)
  const allSetAlertSummaries = useMemo(() => {
    const map: Record<string, { count: number; hasCritical: boolean; alerts: SetAlert[] }> = {};
    sensorSets.forEach((set) => {
      const setTel = getEffectiveSetTelemetry(baseCurrent, set);
      const alerts = evaluateSetAlerts(setTel, set);
      map[set.id] = {
        count: alerts.length,
        hasCritical: alerts.some((a) => a.type === 'critical'),
        alerts,
      };
    });
    return map;
  }, [sensorSets, baseCurrent]);

  return {
    sensorSets,
    activeSensorSetId: activeSet.id,
    activeSet,
    activeTelemetry,
    activeSetAlerts,
    allSetAlertSummaries,
    rawHistory,
    loading,
    error,
    refresh,
    isOffline,
    isLastKnown,
    setActiveSensorSetId,
    saveSensorSet,
    deleteSensorSet,
    updateSensorSetThresholds,
  };
}
