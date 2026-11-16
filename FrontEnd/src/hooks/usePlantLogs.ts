import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { db, storage } from '../../firebase';
import useAppStore from '../store/useAppStore';
import {
  INITIAL_DEMO_PLANT_LOGS,
  PlantLog,
  PlantLogReading,
  packagePlantLogEntry,
} from '../utils/plantLogUtils';

export { PlantLog, PlantLogReading, INITIAL_DEMO_PLANT_LOGS };

const CACHE_KEY_PREFIX = 'hygrow_plant_logs_cache:';

export function usePlantLogs() {
  const user = useAppStore((state) => state.user);
  const [logs, setLogs] = useState<PlantLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id || 'guest';
  const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;

  // Load cached logs on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && active) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLogs(parsed);
            setLoading(false);
          }
        }
      } catch (e) {
        console.warn('[usePlantLogs] Failed to read cache', e);
      }
    })();
    return () => {
      active = false;
    };
  }, [cacheKey]);

  // Subscribe to Firestore collection
  useEffect(() => {
    if (!user || user.role === 'customer') {
      setLogs(INITIAL_DEMO_PLANT_LOGS);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let unsubscribe = () => {};

    try {
      const q = query(
        collection(db, 'plant_logs'),
        where('userId', '==', user.id),
        orderBy('createdAt', 'desc')
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const firestoreLogs: PlantLog[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            firestoreLogs.push({
              id: docSnap.id,
              userId: data.userId,
              userEmail: data.userEmail,
              plantName: data.plantName || 'Unnamed Plant',
              stage: data.stage || 'Vegetative',
              notes: data.notes || '',
              imageUrl: data.imageUrl || '',
              storagePath: data.storagePath,
              readings: {
                temperature: data.readings?.temperature ?? null,
                humidity: data.readings?.humidity ?? null,
                ph: data.readings?.ph ?? null,
                ec: data.readings?.ec ?? null,
                tds: data.readings?.tds ?? null,
                waterTemp: data.readings?.waterTemp ?? null,
                waterLevel: data.readings?.waterLevel ?? null,
                lightIntensity: data.readings?.lightIntensity ?? null,
                vpd: data.readings?.vpd ?? null,
              },
              timestamp: data.timestamp || new Date().toISOString(),
              createdAt: data.createdAt,
            });
          });

          // If user has no logs in Firestore yet, provide demo guidance logs
          const mergedLogs = firestoreLogs.length > 0 ? firestoreLogs : INITIAL_DEMO_PLANT_LOGS;
          setLogs(mergedLogs);
          setLoading(false);
          void AsyncStorage.setItem(cacheKey, JSON.stringify(mergedLogs)).catch(() => {});
        },
        async (err) => {
          console.warn('[usePlantLogs] Firestore subscription error, trying simple query:', err);
          try {
            const fallbackQ = query(collection(db, 'plant_logs'), where('userId', '==', user.id));
            const snapshot = await getDocs(fallbackQ);
            const fallbackList: PlantLog[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              fallbackList.push({
                id: docSnap.id,
                userId: data.userId,
                plantName: data.plantName,
                stage: data.stage,
                notes: data.notes,
                imageUrl: data.imageUrl,
                readings: data.readings,
                timestamp: data.timestamp,
              });
            });
            fallbackList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const finalList = fallbackList.length > 0 ? fallbackList : INITIAL_DEMO_PLANT_LOGS;
            setLogs(finalList);
          } catch (fallbackErr) {
            console.warn('[usePlantLogs] Fallback query failed, showing cache/demo:', fallbackErr);
            setLogs(INITIAL_DEMO_PLANT_LOGS);
          } finally {
            setLoading(false);
          }
        }
      );
    } catch (e: any) {
      console.warn('[usePlantLogs] Init failed:', e);
      setLogs(INITIAL_DEMO_PLANT_LOGS);
      setLoading(false);
    }

    return () => unsubscribe();
  }, [user, cacheKey]);

  /**
   * Upload photo and store document in Firebase
   */
  const addPlantLog = useCallback(
    async ({
      plantName,
      stage,
      notes = '',
      imageUri,
      imageBase64,
      readings,
    }: {
      plantName: string;
      stage: string;
      notes?: string;
      imageUri: string;
      imageBase64?: string;
      readings: PlantLogReading;
    }): Promise<PlantLog> => {
      setUploading(true);
      setError(null);

      try {
        const currentUserId = user?.id || 'local-farmer';
        const currentUserEmail = user?.email || 'farmer@hygrow.local';
        let uploadedImageUrl = imageUri;
        let storagePath: string | undefined;

        // Attempt upload to Firebase Storage if we have data URL or base64
        const dataUrl = imageBase64
          ? `data:image/jpeg;base64,${imageBase64}`
          : imageUri.startsWith('data:')
          ? imageUri
          : null;

        if (dataUrl && user?.id) {
          try {
            storagePath = `plant_logs/${user.id}/${Date.now()}_photo.jpg`;
            const storageRef = ref(storage, storagePath);
            await uploadString(storageRef, dataUrl, 'data_url');
            uploadedImageUrl = await getDownloadURL(storageRef);
          } catch (storageErr) {
            console.warn('[usePlantLogs] Firebase storage upload failed; using data URL directly:', storageErr);
            uploadedImageUrl = dataUrl;
          }
        }

        const packagedData = packagePlantLogEntry({
          userId: currentUserId,
          userEmail: currentUserEmail,
          plantName,
          stage,
          notes,
          imageUrl: uploadedImageUrl,
          telemetry: readings,
        });

        const newDocData = {
          ...packagedData,
          ...(storagePath ? { storagePath } : {}),
          createdAt: serverTimestamp(),
        };

        let createdId = `local-${Date.now()}`;
        if (user?.id) {
          try {
            const docRef = await addDoc(collection(db, 'plant_logs'), newDocData);
            createdId = docRef.id;
          } catch (firestoreErr: any) {
            console.warn('[usePlantLogs] Firestore write failed, keeping locally:', firestoreErr);
          }
        }

        const createdLog: PlantLog = {
          id: createdId,
          ...packagedData,
          storagePath,
        };

        setLogs((prev) => [createdLog, ...prev.filter((item) => item.id !== createdId)]);
        void AsyncStorage.setItem(cacheKey, JSON.stringify([createdLog, ...logs])).catch(() => {});

        return createdLog;
      } catch (err: any) {
        console.error('[usePlantLogs] Error saving plant log:', err);
        setError(err.message || 'Failed to save plant photo log.');
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [user, logs, cacheKey]
  );

  /**
   * Delete a plant log
   */
  const deletePlantLog = useCallback(
    async (id: string) => {
      try {
        if (!id.startsWith('demo-') && !id.startsWith('local-')) {
          await deleteDoc(doc(db, 'plant_logs', id));
        }
        setLogs((prev) => {
          const updated = prev.filter((item) => item.id !== id);
          void AsyncStorage.setItem(cacheKey, JSON.stringify(updated)).catch(() => {});
          return updated;
        });
      } catch (err: any) {
        console.error('[usePlantLogs] Failed to delete log:', err);
        setError(err.message || 'Failed to delete log.');
        throw err;
      }
    },
    [cacheKey]
  );

  return {
    logs,
    loading,
    uploading,
    error,
    addPlantLog,
    deletePlantLog,
  };
}
