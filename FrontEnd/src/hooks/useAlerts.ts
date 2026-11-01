/** Threshold notifications only use fresh, healthy, real measurements. */
import { useEffect, useMemo } from 'react';
import { SENSOR_THRESHOLDS, SENSOR_KEYS, SENSOR_CONFIG } from '../utils/constants';
import { getSensorStatus, formatSensorValue } from '../utils/helpers';
import { alertEligible, freshness } from '../utils/telemetry';
import type { Telemetry } from '../utils/telemetry';
import useAppStore from '../store/useAppStore';

export default function useAlerts(sensorData: Telemetry | null, stale = sensorData ? freshness(sensorData).stale : true) {
  const activeAlerts = useAppStore(state => state.activeAlerts);
  const addAlert = useAppStore(state => state.addAlert);
  const removeAlert = useAppStore(state => state.removeAlert);
  const currentAlerts = useMemo(() => {
    if (!sensorData || stale) return [];
    return SENSOR_KEYS.flatMap(key => {
      if (!alertEligible(sensorData,key)) return [];
      const value=sensorData[key] as number;
      const status=getSensorStatus(key,value);
      if (status !== 'warning' && status !== 'critical') return [];
      const threshold=SENSOR_THRESHOLDS[key];
      const isHigh=value > threshold.max;
      const label=SENSOR_CONFIG[key].label;
      const limit=isHigh ? threshold.max : threshold.min;
      return [{
        id:`alert-${sensorData.deviceId}-${sensorData.hardwareId}-${sensorData.bootId}-${key}-${status}`,
        sensorKey:key,sensorLabel:label,type:status,value,threshold:limit,unit:threshold.unit,
        message:`${label} is ${isHigh ? 'above' : 'below'} threshold: ${formatSensorValue(key,value)}${threshold.unit} (Limit: ${formatSensorValue(key,limit)}${threshold.unit})`,
        timestamp:sensorData.lastSensorTimestamp || new Date(sensorData.receivedAt).toISOString(),
      }];
    });
  },[sensorData,stale]);
  useEffect(() => {
    const ids=new Set(currentAlerts.map(alert => alert.id));
    activeAlerts.forEach(alert => { if (alert.id.startsWith('alert-') && !ids.has(alert.id)) removeAlert(alert.id); });
    currentAlerts.forEach(alert => { if (!activeAlerts.some(active => active.id === alert.id)) addAlert(alert); });
  },[currentAlerts,activeAlerts,addAlert,removeAlert]);
  return {currentAlerts,activeAlerts,hasAlerts:currentAlerts.length > 0};
}
