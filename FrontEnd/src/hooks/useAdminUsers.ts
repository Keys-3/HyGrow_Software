import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase';
import useAppStore from '../store/useAppStore';

export interface AdminUser {
  id: string;
  name: string;
  role: string;
  email: string;
  farm_name?: string;
}

export default function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const userId = useAppStore((state) => state.user?.id);
  const role = useAppStore((state) => state.user?.role);
  const fetchUsers = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    let retry: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    setUsers([]);
    setError(null);
    setLoading(role === 'admin');
    if (role !== 'admin' || !userId) return;

    const isCurrentAdmin = () => active && auth.currentUser?.uid === userId &&
      useAppStore.getState().user?.id === userId && useAppStore.getState().user?.role === 'admin';

    const listen = () => {
      unsubscribe();
      if (!isCurrentAdmin()) return;
      unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        if (!isCurrentAdmin()) return;
        setUsers(snapshot.docs.map((entry) => {
          const data = entry.data();
          return {
            id: entry.id,
            name: data.name || 'Unknown',
            role: String(data.role || 'customer').toLowerCase(),
            email: String(data.email || '').trim().toLowerCase(),
            farm_name: data.farm_name,
          };
        }));
        failures = 0;
        setLoading(false);
        setError(null);
      }, (failure) => {
        if (!isCurrentAdmin()) return;
        setLoading(false);
        if (failure.code === 'permission-denied' || failure.code === 'unauthenticated') setUsers([]);
        setError(failure.code === 'permission-denied'
          ? 'Your account does not have permission to view the admin user list.'
          : failure.message);
        if (failure.code !== 'permission-denied' && failure.code !== 'unauthenticated') {
          retry = setTimeout(listen, Math.min(30_000, 1000 * 2 ** Math.min(failures++, 5)));
        }
      });
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribe();
      if (retry) clearTimeout(retry);
      if (firebaseUser?.uid === userId) listen();
      else if (active) {
        setUsers([]);
        setLoading(false);
      }
    });
    return () => {
      active = false;
      unsubscribe();
      unsubscribeAuth();
      if (retry) clearTimeout(retry);
    };
  }, [userId, role, revision]);

  return { users, loading, error, fetchUsers };
}
