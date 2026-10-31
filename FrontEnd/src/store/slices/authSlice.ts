import { createDefaultFarmerFeatures } from './settingsSlice';
import type { StateCreator } from 'zustand';
import type { StoreState } from '../useAppStore';

export type UserRole = 'farmer' | 'customer' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  farm_name?: string;
  farm_location?: string;
  farm_size?: string;
  crops?: string;
  experience?: string;
  upi_id?: string;
  created_at?: string;
  preferences?: {
    isDarkMode?: boolean;
    farmerFeatures?: any;
  };
}

export interface AuthSlice {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;

  login: (user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}

const clearedSession = () => ({
  farmerFeatures: createDefaultFarmerFeatures(),
  sensorData: null, lastUpdated: null, isDeviceOnline: false,
  activeAlerts: [], adminSelectedFarmerId: null, adminSelectedCustomerId: null,
});

export const createAuthSlice: StateCreator<StoreState, [], [], AuthSlice> = (set) => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  login: (user: User) => set(state => ({
    ...(state.user?.id !== user.id ? clearedSession() : {}),
    user, isAuthenticated: true, loading: false,
  })),
  logout: () => set({ ...clearedSession(), user: null, isAuthenticated: false, loading: false }),
  setUser: (user: User | null) => set(state => ({
    ...(state.user?.id !== user?.id || !user ? clearedSession() : {}),
    user, isAuthenticated: !!user, loading: false,
  })),
  updateUser: (updates: Partial<User>) => set(state => ({
    user: state.user ? { ...state.user, ...updates, id: state.user.id, role: state.user.role, email: state.user.email } : null,
  })),
  setLoading: (loading: boolean) => set({ loading }),
});
