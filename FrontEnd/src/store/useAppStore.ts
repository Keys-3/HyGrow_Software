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
    (...a) => ({
      ...createAuthSlice(...a),
      ...createSettingsSlice(...a),
      ...createSensorSlice(...a),
      ...createAlertsSlice(...a),
    }),
    {
      name: 'hygrow-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        deviceIds: state.deviceIds,
        farmerFeatures: state.farmerFeatures,
        isDarkMode: state.isDarkMode
      }),
    }
  )
);

export default useAppStore;
