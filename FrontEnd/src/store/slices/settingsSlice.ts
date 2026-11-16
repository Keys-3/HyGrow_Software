import type { StateCreator } from 'zustand';
import { StoreState } from '../useAppStore';
import { db } from '../../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { DEFAULT_SENSOR_SETS, SensorSet, SensorSetThresholds } from '../../utils/sensorSets';

export interface SettingsSlice {
  deviceIds: Record<string, string>;
  setDeviceId: (id: string) => Promise<void>;
  sensorSets: SensorSet[];
  activeSensorSetId: string;
  setActiveSensorSetId: (id: string) => void;
  saveSensorSet: (sensorSet: SensorSet) => Promise<void>;
  deleteSensorSet: (id: string) => Promise<void>;
  updateSensorSetThresholds: (id: string, thresholds: SensorSetThresholds) => Promise<void>;
  isDarkMode: boolean;
  toggleTheme: () => Promise<void>;
  adminSelectedFarmerId: string | null;
  setAdminSelectedFarmerId: (id: string | null) => void;
  adminSelectedCustomerId: string | null;
  setAdminSelectedCustomerId: (id: string | null) => void;
  farmerFeatures: {
    sensors: {
      enabled: boolean;
      temperature: boolean;
      humidity: boolean;
      ph: boolean;
      ec: boolean;
      waterLevel: boolean;
      lightIntensity: boolean;
      vpd: boolean;
      waterTemp: boolean;
      co2: boolean;
    };
    aiTools: {
      enabled: boolean;
      diseaseDetection: boolean;
      yieldPrediction: boolean;
    };
    inventory: {
      enabled: boolean;
    };
    analytics: {
      enabled: boolean;
    };
  };
  toggleFarmerFeature: (category: keyof SettingsSlice['farmerFeatures']) => void;
  toggleFarmerSubFeature: (category: 'sensors' | 'aiTools', feature: string) => void;
}

export const createDefaultFarmerFeatures = (): SettingsSlice['farmerFeatures'] => ({
  sensors: {
    enabled: true,
    temperature: true,
    humidity: true,
    ph: true,
    ec: true,
    waterLevel: true,
    lightIntensity: true,
    vpd: true,
    waterTemp: true,
    co2: true,
  },
  aiTools: {
    enabled: true,
    diseaseDetection: true,
    yieldPrediction: true,
  },
  inventory: {
    enabled: true,
  },
  analytics: {
    enabled: true,
  },
});

export const createSettingsSlice: StateCreator<StoreState, [], [], SettingsSlice> = (set, get) => ({
  deviceIds: {},
  setDeviceId: async (id) => {
    const user = get().user;
    if (!user || !['farmer', 'admin'].includes(user.role)) return;
    const value = id.trim();
    if (!value || value.includes('/') || value === '.' || value === '..') throw new Error('Enter one device ID without slashes.');
    await updateDoc(doc(db, 'users', user.id), { 'preferences.deviceId': value });
    if (get().user?.id !== user.id) return;
    set(state => ({ deviceIds: { ...state.deviceIds, [user.id]: value } }));
  },
  sensorSets: DEFAULT_SENSOR_SETS,
  activeSensorSetId: 'set-main',
  setActiveSensorSetId: (id: string) => {
    const sets = get().sensorSets || DEFAULT_SENSOR_SETS;
    const targetSet = sets.find((s) => s.id === id);
    if (!targetSet) return;
    set({ activeSensorSetId: id });
    const user = get().user;
    if (user?.id && targetSet.deviceId) {
      set((state) => ({
        deviceIds: { ...state.deviceIds, [user.id]: targetSet.deviceId },
      }));
    }
  },
  saveSensorSet: async (newOrUpdatedSet: SensorSet) => {
    const currentSets = get().sensorSets || DEFAULT_SENSOR_SETS;
    const exists = currentSets.some((s) => s.id === newOrUpdatedSet.id);
    const updatedSets = exists
      ? currentSets.map((s) => (s.id === newOrUpdatedSet.id ? newOrUpdatedSet : s))
      : [...currentSets, newOrUpdatedSet];

    set({ sensorSets: updatedSets });

    const user = get().user;
    if (user?.id) {
      try {
        await updateDoc(doc(db, 'users', user.id), {
          'preferences.sensorSets': updatedSets,
        });
      } catch (err) {
        console.warn('Could not sync sensorSets to cloud:', err);
      }
    }
  },
  deleteSensorSet: async (id: string) => {
    const currentSets = get().sensorSets || DEFAULT_SENSOR_SETS;
    if (currentSets.length <= 1) {
      throw new Error('At least one sensor set must be maintained.');
    }
    const updatedSets = currentSets.filter((s) => s.id !== id);
    const nextActive = get().activeSensorSetId === id ? updatedSets[0].id : get().activeSensorSetId;
    set({ sensorSets: updatedSets, activeSensorSetId: nextActive });

    const user = get().user;
    if (user?.id) {
      try {
        await updateDoc(doc(db, 'users', user.id), {
          'preferences.sensorSets': updatedSets,
        });
      } catch (err) {
        console.warn('Could not sync sensorSets deletion to cloud:', err);
      }
    }
  },
  updateSensorSetThresholds: async (id: string, thresholds: SensorSetThresholds) => {
    const currentSets = get().sensorSets || DEFAULT_SENSOR_SETS;
    const updatedSets = currentSets.map((s) =>
      s.id === id ? { ...s, thresholds: { ...s.thresholds, ...thresholds } } : s
    );
    set({ sensorSets: updatedSets });

    const user = get().user;
    if (user?.id) {
      try {
        await updateDoc(doc(db, 'users', user.id), {
          'preferences.sensorSets': updatedSets,
        });
      } catch (err) {
        console.warn('Could not sync thresholds to cloud:', err);
      }
    }
  },
  isDarkMode: true, // Default to futuristic Nature-Tech dark mode
  toggleTheme: async () => {
    const nextIsDarkMode = !get().isDarkMode;
    const userId = get().user?.id;
    set({ isDarkMode: nextIsDarkMode });

    if (!userId) return;

    try {
      await updateDoc(doc(db, 'users', userId), {
        'preferences.isDarkMode': nextIsDarkMode,
      });
    } catch (err) {
      console.warn('Theme changed locally but could not sync the account preference:', err);
    }
  },
  adminSelectedFarmerId: null,
  setAdminSelectedFarmerId: (id) => set({ adminSelectedFarmerId: id }),
  adminSelectedCustomerId: null,
  setAdminSelectedCustomerId: (id) => set({ adminSelectedCustomerId: id }),
  farmerFeatures: createDefaultFarmerFeatures(),
  toggleFarmerFeature: async (category) => {
    set((state) => ({
      farmerFeatures: {
        ...state.farmerFeatures,
        [category]: {
          ...state.farmerFeatures[category],
          enabled: !state.farmerFeatures[category].enabled
        }
      }
    }));
    
    const userId = get().user?.id;
    if (userId) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          'preferences.farmerFeatures': get().farmerFeatures
        });
      } catch (err) {
        console.error('Failed to sync farmer features:', err);
      }
    }
  },
  toggleFarmerSubFeature: async (category, feature) => {
    if (!Object.hasOwn(get().farmerFeatures[category], feature)) return;
    set((state) => ({
      farmerFeatures: {
        ...state.farmerFeatures,
        [category]: {
          ...state.farmerFeatures[category],
          [feature]: !(state.farmerFeatures[category] as Record<string, boolean>)[feature]
        }
      }
    }));
    
    const userId = get().user?.id;
    if (userId) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          'preferences.farmerFeatures': get().farmerFeatures
        });
      } catch (err) {
        console.error('Failed to sync farmer features:', err);
      }
    }
  },
});
