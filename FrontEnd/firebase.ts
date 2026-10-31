import { initializeApp, getApps, getApp } from "firebase/app";
import { createFirebaseAuth } from "./src/services/firebaseAuth";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

const auth = createFirebaseAuth(app);

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
