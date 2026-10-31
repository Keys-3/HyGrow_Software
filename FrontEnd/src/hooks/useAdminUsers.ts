import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '../../firebase';
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
  const currentUser = useAppStore((state) => state.user);
  
  const fetchUsers = useCallback(async () => {
    if (currentUser?.role !== 'admin') { setUsers([]); return; }
    
    setLoading(true);
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      
      const fetchedUsers: AdminUser[] = [];
      for (const userDoc of snapshot.docs) {
        const data = userDoc.data();
        const email = (data.email || '').trim().toLowerCase();
        
        // Use the role from the database purely
        let role = (data.role || 'customer').toLowerCase();

        fetchedUsers.push({
          id: userDoc.id,
          name: data.name || 'Unknown',
          role: role,
          email: email,
          farm_name: data.farm_name,
        });
      }
      
      if (useAppStore.getState().user?.id === currentUser.id && useAppStore.getState().user?.role === 'admin') setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching admin users:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, fetchUsers };
}
