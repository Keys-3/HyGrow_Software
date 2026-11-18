import { DEFAULT_SENSOR_SETS } from '../utils/sensorSets';
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
      merge: (persisted, current) => {
        const saved = persisted as Partial<StoreState> | undefined;
        const legacyNames: Record<string, string> = {
          'set-main': 'Main NFT Bay',
          'set-dwc': 'DWC Raft System',
          'set-nursery': 'Germination Nursery',
        };
        const sensorSets = saved?.sensorSets?.map((sensorSet) => {
          const defaults = DEFAULT_SENSOR_SETS.find((item) => item.id === sensorSet.id);
          return defaults && sensorSet.name === legacyNames[sensorSet.id]
            ? { ...sensorSet, name: defaults.name, crop: defaults.crop, associatedPlantIds: defaults.associatedPlantIds }
            : sensorSet;
        });
        return { ...current, ...saved, sensorSets: sensorSets ?? current.sensorSets };
      },
      partialize: (state) => ({ 
        deviceIds: state.deviceIds,
        deviceIdsBySet: state.deviceIdsBySet,
        farmerFeatures: state.farmerFeatures,
        isDarkMode: state.isDarkMode,
        connectionMode: state.connectionMode,
        localDevice: state.localDevice,
        sensorSets: state.sensorSets,
        activeSensorSetId: state.activeSensorSetId,
      }),
    }
  )
);

export default useAppStore;
