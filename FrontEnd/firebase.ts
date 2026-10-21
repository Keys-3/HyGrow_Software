import { initializeApp, getApps, getApp } from "firebase/app";
import {
  Auth,
  browserLocalPersistence,
  initializeAuth,
  getReactNativePersistence,
  getAuth
} from "firebase/auth";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyAsW3UdiapN41zCfAd5Wi_kQNzLzojeORk",
  authDomain: "farm-help-383f1.firebaseapp.com",
  projectId: "farm-help-383f1",
  storageBucket: "farm-help-383f1.appspot.com",
  messagingSenderId: "149037929627",
  appId: "1:149037929627:web:eee26088fc7342420f623e",
  measurementId: "G-45ERXPGKTZ"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
try {
  if (Platform.OS === "web") {
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence
    });
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
} catch (error: any) {
  // During fast refresh, auth might already be initialized
  auth = getAuth(app);
}

export { auth };
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    experimentalForceLongPolling: true
  });
} catch (e) {
  firestoreDb = getFirestore(app);
}
export const db = firestoreDb;
export const storage = getStorage(app);

export default app;
