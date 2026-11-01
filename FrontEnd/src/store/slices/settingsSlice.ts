import type { StateCreator } from 'zustand';
import { StoreState } from '../useAppStore';
import { db } from '../../../firebase';
import { doc, updateDoc } from 'firebase/firestore';

export interface SettingsSlice {
  deviceIds: Record<string, string>;
  setDeviceId: (id: string) => Promise<void>;
  isDarkMode: boolean;
  toggleTheme: () => void;
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
  isDarkMode: false, // Default to light mode (Aztec theme)
  toggleTheme: async () => {
    set((state) => ({ isDarkMode: !state.isDarkMode }));
    const userId = get().user?.id;
    if (userId) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          'preferences.isDarkMode': get().isDarkMode
        });
      } catch (err) {
        console.error('Failed to sync theme preference:', err);
      }
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
