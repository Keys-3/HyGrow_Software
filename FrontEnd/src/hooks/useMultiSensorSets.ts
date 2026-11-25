import { usePlantTargets } from './usePlantTargets';
import { useMemo } from 'react';
import useAppStore from '../store/useAppStore';
import { getVisibleSensorKeys, alertEligible } from '../utils/telemetry';
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

  const sensorPreferences = useAppStore((state) => state.farmerFeatures?.sensors);
  const effectiveSensorData = useEffectiveSensorData();
  const { rawCurrent: baseCurrent, rawHistory, loading, error, refresh, stale, isOffline, isLastKnown } = effectiveSensorData;

  // Active sensor set
  const configuredSet = useMemo(() => {
    return sensorSets.find((s) => s.id === activeSensorSetId) || sensorSets[0] || DEFAULT_SENSOR_SETS[0];
  }, [sensorSets, activeSensorSetId]);

  const targetContext = usePlantTargets(configuredSet);
  const activeSet = useMemo(() => ({ ...configuredSet, thresholds: targetContext.thresholds }), [configuredSet, targetContext]);

  // Calibrated/routed telemetry for the active set
  const activeTelemetry = useMemo(() => {
    return getEffectiveSetTelemetry(baseCurrent, activeSet);
  }, [baseCurrent, activeSet]);

  const history = useMemo(() => rawHistory.map((point) => ({
    ...point, ...getEffectiveSetTelemetry(point, activeSet),
  })), [rawHistory, activeSet]);
  const visibleSensorKeys = useMemo(() => getVisibleSensorKeys(activeTelemetry, sensorPreferences), [activeTelemetry, sensorPreferences]);

  // Set-specific alerts for the active set
  const activeSetAlerts = useMemo(() => {
    return isOffline || stale ? [] : evaluateSetAlerts(activeTelemetry, activeSet).filter(alert => alertEligible(activeTelemetry, alert.sensorKey));
  }, [activeTelemetry, activeSet, isOffline, stale]);

  // Alert summary across all sets (to show alert status dots on inactive set pills)
  const allSetAlertSummaries = useMemo(() => {
    const map: Record<string, { count: number; hasCritical: boolean; alerts: SetAlert[] }> = {};
    sensorSets.forEach((set) => {
      const setTel = set.id === activeSet.id && !isOffline && !stale ? activeTelemetry : null;
      const alerts = evaluateSetAlerts(setTel, set).filter(alert => alertEligible(setTel, alert.sensorKey));
      map[set.id] = {
        count: alerts.length,
        hasCritical: alerts.some((a) => a.type === 'critical'),
        alerts,
      };
    });
    return map;
  }, [sensorSets, activeSet.id, activeTelemetry, isOffline, stale]);

  return {
    sensorSets,
    activeSensorSetId: activeSet.id,
    activeSet,
    targetContext,
    activeTelemetry,
    visibleSensorKeys,
    history,
    activeSetAlerts,
    allSetAlertSummaries,
    rawHistory,
    loading,
    error,
    refresh,
    isOffline,
    stale,
    isLastKnown,
    setActiveSensorSetId,
    saveSensorSet,
    deleteSensorSet,
    updateSensorSetThresholds,
  };
}
