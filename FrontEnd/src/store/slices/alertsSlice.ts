import type { StateCreator } from 'zustand';
import { notificationService } from '../../services/notificationService';

export interface Alert {
  id: string;
  sensorKey: string;
  sensorLabel: string;
  type: string;
  value: number;
  threshold: number;
  unit: string;
  message: string;
  timestamp: string;
}

export interface AlertsSlice {
  activeAlerts: Alert[];
  addAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;
  clearAlerts: () => void;
}

export const createAlertsSlice: StateCreator<AlertsSlice> = (set) => ({
  activeAlerts: [],

  addAlert: (alert) =>
    set((state) => {
      const exists = state.activeAlerts.some(
        (a) => a.sensorKey === alert.sensorKey && a.type === alert.type
      );
      if (exists) return state;

      // Trigger native local notification
      const isCritical = alert.type === 'critical';
      const title = `${isCritical ? '🚨 Critical' : '⚠️ Warning'} Sensor Alert`;
      notificationService.sendLocalNotification(
        title,
        alert.message,
        { sensorKey: alert.sensorKey, type: alert.type }
      );

      return { activeAlerts: [...state.activeAlerts, alert] };
    }),

  removeAlert: (id) =>
    set((state) => ({
      activeAlerts: state.activeAlerts.filter((a) => a.id !== id),
    })),

  clearAlerts: () => set({ activeAlerts: [] }),
});
