import { create } from 'zustand';
import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createSettingsSlice, SettingsSlice } from './slices/settingsSlice';
import { createSensorSlice, SensorSlice } from './slices/sensorSlice';
import { createAlertsSlice, AlertsSlice } from './slices/alertsSlice';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Combine slices into a single store type
export type StoreState = AuthSlice & SettingsSlice & SensorSlice & AlertsSlice;

const useAppStore = create<StoreState>()(
  persist(
    (...a) => {
      const sensor = createSensorSlice(...a);
      return {
        ...createAuthSlice(...a),
        ...createSettingsSlice(...a),
        ...sensor,
        ...createAlertsSlice(...a),
        clearSensorData: sensor.clearSensorData ?? (() => {
          (a[0] as any)({ sensorData: null, lastUpdated: null, isDeviceOnline: false });
        }),
      };
    },
    {
      name: 'hygrow-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        deviceIds: state.deviceIds,
        farmerFeatures: state.farmerFeatures,
        isDarkMode: state.isDarkMode,
        connectionMode: state.connectionMode,
        localDevice: state.localDevice,
      }),
    }
  )
);

export default useAppStore;
