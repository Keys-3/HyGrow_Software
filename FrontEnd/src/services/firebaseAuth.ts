import { getAuth } from "firebase/auth";
import type { FirebaseApp } from "firebase/app";
export const createFirebaseAuth = (app: FirebaseApp) => getAuth(app);
