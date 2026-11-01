import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const PRODUCTION_BACKEND_URL = 'https://hygrow.onrender.com';

export const getBackendUrl = () => {
  // 1. Explicit backend URL via environment variable
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    const trimmed = envUrl.trim();
    // On physical mobile device or standalone APK, do not use localhost/10.0.2.2/internal IP
    if (Platform.OS !== 'web' && (trimmed.includes('localhost') || trimmed.includes('10.0.2.2') || trimmed.includes('127.0.0.1'))) {
      return PRODUCTION_BACKEND_URL;
    }
    return trimmed;
  }

  // 2. Production or Standalone APK/iOS builds ALWAYS use live production backend
  if (!__DEV__ || (Platform.OS !== 'web' && !Constants?.expoConfig?.hostUri)) {
    return PRODUCTION_BACKEND_URL;
  }

  // 3. Local development with active Expo Go / dev client connected to Metro host
  const hostUri = Constants?.expoConfig?.hostUri;
  if (hostUri && typeof hostUri === 'string') {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:3000`;
    }
  }

  // 4. Local web development
  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }

  // 5. Default safe fallback is ALWAYS the live production backend
  return PRODUCTION_BACKEND_URL;
};

export const BACKEND_URL = getBackendUrl();
