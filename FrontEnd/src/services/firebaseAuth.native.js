import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
export function createFirebaseAuth(app) {
  try { return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }); }
  catch (error) { if (error.code === "auth/already-initialized") return getAuth(app); throw error; }
}
