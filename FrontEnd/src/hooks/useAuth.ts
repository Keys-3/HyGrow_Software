import { useCallback, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import useAppStore from '../store/useAppStore';
import { auth, db } from '../../firebase';
import { User, UserRole } from '../store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineFarmer, isOfflineFailure, profileDeadline } from '../utils/offlineProfile';

export interface SignupData {
  name: string;
  email: string;
  password: string;
  role: Exclude<UserRole, 'admin'>;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  farm_name?: string;
  farm_location?: string;
  upi_id?: string;
}

const AUTH_INIT_TIMEOUT_MS = 8000;

export default function useAuth() {
  const user = useAppStore((state) => state.user);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const loading = useAppStore((state) => state.loading);
  const storeLogin = useAppStore((state) => state.login);
  const storeLogout = useAppStore((state) => state.logout);
  const setLoading = useAppStore((state) => state.setLoading);

  // Track if we've already initialized auth state
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {

    let mounted = true;
    let authCheckCompleted = false;

    // Set a timeout to ensure we don't hang forever
    const timeoutId = setTimeout(() => {
      if (!authCheckCompleted && mounted) {
        console.warn('[Auth] Auth initialization timed out');
        storeLogout();
        setAuthInitialized(true);
      }
    }, AUTH_INIT_TIMEOUT_MS);

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (!mounted) return;

      authCheckCompleted = true;
      clearTimeout(timeoutId);

      if (firebaseUser) {
        if (useAppStore.getState().user?.id !== firebaseUser.uid) storeLogout();
        // User is signed in, fetch their profile
        try {
          const [userDoc, tokenResult] = await profileDeadline(Promise.all([
            getDoc(doc(db, 'users', firebaseUser.uid)), firebaseUser.getIdTokenResult(),
          ]));

          if (!mounted || auth.currentUser?.uid !== firebaseUser.uid) return;
          const claims = tokenResult.claims;
          if (!mounted || auth.currentUser?.uid !== firebaseUser.uid) return;

          if (userDoc.exists()) {
            const data = userDoc.data();
            const userData: User = {
              id: firebaseUser.uid,
              email: data.email || firebaseUser.email || '',
              name: data.name || '',
              role: claims.admin === true ? 'admin' : data.role === 'customer' ? 'customer' : 'farmer',
              phone: data.phone,
              address: data.address,
              city: data.city,
              state: data.state,
              pincode: data.pincode,
              farm_name: data.farm_name,
              farm_location: data.farm_location,
              upi_id: data.upi_id,
              created_at: data.createdAt?.toDate?.()?.toISOString?.(),
              preferences: data.preferences,
            };
            storeLogin(userData);
            const cachedFarmer = offlineFarmer(userData, firebaseUser.uid, firebaseUser.email);
            if (cachedFarmer) {
              void AsyncStorage.setItem(`hygrow-offline-farmer:${firebaseUser.uid}`, JSON.stringify(cachedFarmer)).catch(() => {});
            } else {
              void AsyncStorage.removeItem(`hygrow-offline-farmer:${firebaseUser.uid}`).catch(() => {});
            }

            if (data.preferences) {
              useAppStore.setState({
                ...(data.preferences.farmerFeatures && { farmerFeatures: data.preferences.farmerFeatures }),
                ...(data.preferences.isDarkMode !== undefined && { isDarkMode: data.preferences.isDarkMode })
              });
            }
          } else {
            // User exists in Firebase Auth but not in Firestore
            // Create a basic profile
            const basicUser: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'User',
              role: claims.admin === true ? 'admin' : 'farmer',
            };
            storeLogin(basicUser);
          }
        } catch (error) {
          let cachedFarmer: User | null = null;
          if (isOfflineFailure(error)) {
            try {
              const cached = await AsyncStorage.getItem(`hygrow-offline-farmer:${firebaseUser.uid}`);
              cachedFarmer = offlineFarmer(cached ? JSON.parse(cached) : null, firebaseUser.uid, firebaseUser.email);
            } catch { /* Missing or damaged local profiles cannot authenticate a session. */ }
          }
          if (mounted && auth.currentUser?.uid === firebaseUser.uid) {
            if (cachedFarmer) storeLogin(cachedFarmer);
            else storeLogout();
          }
        }
      } else {
        // User is signed out
        storeLogout();
      }

      setAuthInitialized(true);
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [storeLogin, storeLogout]);

  const signup = useCallback(async (data: SignupData) => {
    if (data.role !== 'farmer' && data.role !== 'customer') throw new Error('Invalid signup role');
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const firebaseUser = userCredential.user;

      const profile = {
        uid: firebaseUser.uid,
        email: data.email,
        name: data.name,
        role: data.role,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
        farm_name: data.role === 'farmer' ? data.farm_name || null : null,
        farm_location: data.role === 'farmer' ? data.farm_location || null : null,
        upi_id: data.role === 'farmer' ? data.upi_id || null : null,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), profile);

      const userData: User = {
        id: firebaseUser.uid,
        email: data.email,
        name: data.name,
        role: data.role,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        farm_name: data.farm_name,
        farm_location: data.farm_location,
        upi_id: data.upi_id,
      };

      storeLogin(userData);
      return firebaseUser;
    } catch (error: any) {
      setLoading(false);
      throw new Error(getFriendlyErrorMessage(error.code));
    }
  }, [storeLogin, setLoading]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Fetch profile after successful login
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const claims = (await userCredential.user.getIdTokenResult()).claims;
      if (auth.currentUser?.uid !== userCredential.user.uid) throw new Error('Session changed');

      if (userDoc.exists()) {
        const data = userDoc.data();
        const userData: User = {
          id: userCredential.user.uid,
          email: data.email || userCredential.user.email || '',
          name: data.name || '',
          role: claims.admin === true ? 'admin' : data.role === 'customer' ? 'customer' : 'farmer',
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          farm_name: data.farm_name,
          farm_location: data.farm_location,
          upi_id: data.upi_id,
          created_at: data.createdAt?.toDate?.()?.toISOString?.(),
          preferences: data.preferences,
        };
        storeLogin(userData);

        if (data.preferences) {
          useAppStore.setState({
            ...(data.preferences.farmerFeatures && { farmerFeatures: data.preferences.farmerFeatures }),
            ...(data.preferences.isDarkMode !== undefined && { isDarkMode: data.preferences.isDarkMode })
          });
        }
      } else {
        const userData: User = {
          id: userCredential.user.uid,
          email: userCredential.user.email || email,
          name: userCredential.user.displayName || 'User',
          role: claims.admin === true ? 'admin' : 'farmer',
        };
        storeLogin(userData);
      }

      return userCredential.user;
    } catch (error: any) {
      setLoading(false);
      throw new Error(getFriendlyErrorMessage(error.code));
    }
  }, [storeLogin, setLoading]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      storeLogout();
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      storeLogout();
    }
  }, [storeLogout]);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!user || auth.currentUser?.uid !== user.id) throw new Error('Not authenticated');
    const allowed = ['name', 'phone', 'address', 'city', 'state', 'pincode', 'farm_name', 'farm_location', 'farm_size', 'crops', 'experience', 'upi_id', 'avatar_url', 'preferences'];
    if (Object.keys(updates).some(key => !allowed.includes(key))) throw new Error('Profile identity and permissions cannot be edited');
    try {
      await setDoc(doc(db, 'users', user.id), updates, { merge: true });
      useAppStore.getState().updateUser(updates);
    } catch (error: any) {
      throw new Error(error.message || 'Update failed');
    }
  }, [user]);

  return {
    user,
    isAuthenticated,
    loading: loading || !authInitialized,
    authInitialized,
    signup,
    login,
    logout,
    updateProfile
  };
}

function getFriendlyErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters';
    case 'auth/invalid-credential':
      return 'Invalid email or password';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Try again later';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection';
    default:
      return 'Authentication failed. Please try again';
  }
}
