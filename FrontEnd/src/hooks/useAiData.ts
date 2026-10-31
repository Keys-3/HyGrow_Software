import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../firebase';
import useAppStore from '../store/useAppStore';

export interface DiseaseResult {
  id: string;
  detected: boolean;
  disease: string;
  confidence: number;
  description: string;
  recommendations: string[];
  severity: 'low' | 'moderate' | 'high' | 'critical';
  timestamp: string;
}

export interface YieldPrediction {
  id: string;
  crop: string;
  predictedYield: number;
  unit: string;
  timeToHarvest: number;
  timeUnit: string;
  growthStage: string;
  healthScore: number;
  factors: Array<{ name: string; status: 'optimal' | 'good' | 'moderate' | 'poor'; impact: string }>;
  timestamp: string;
}

export default function useAiData() {
  const [diseaseResults, setDiseaseResults] = useState<DiseaseResult | null>(null);
  const [yieldPrediction, setYieldPrediction] = useState<YieldPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const user = useAppStore((state) => state.user);

  const subscribeToAiData = useCallback(() => {
    if (!user) {
      setDiseaseResults(null);
      setYieldPrediction(null);
      setLoading(false);
      return () => {};
    }

    setDiseaseResults(null);
    setYieldPrediction(null);
    setLoading(true);
    setError(null);

    // Assuming we have collections: 'disease_detections' and 'yield_predictions'
    const diseaseQuery = query(
      collection(db, 'disease_detections'),
      where('owner_uid', '==', user.id),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const yieldQuery = query(
      collection(db, 'yield_predictions'),
      where('owner_uid', '==', user.id),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    let diseaseUnsub = () => {};
    let yieldUnsub = () => {};

    try {
      diseaseUnsub = onSnapshot(diseaseQuery, (snapshot) => {
        if (useAppStore.getState().user?.id !== user.id) return;
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setDiseaseResults({
            id: snapshot.docs[0].id,
            ...data
          } as DiseaseResult);
        } else {
          setDiseaseResults(null);
        }
      }, (err) => {
        console.warn('Could not fetch disease results:', err);
      });

      yieldUnsub = onSnapshot(yieldQuery, (snapshot) => {
        if (useAppStore.getState().user?.id !== user.id) return;
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setYieldPrediction({
            id: snapshot.docs[0].id,
            ...data
          } as YieldPrediction);
        } else {
          setYieldPrediction(null);
        }
        setLoading(false);
      }, (err) => {
        console.warn('Could not fetch yield predictions:', err);
        setLoading(false);
      });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }

    return () => {
      diseaseUnsub();
      yieldUnsub();
    };
  }, [user]);

  useEffect(() => {
    const unsubscribe = subscribeToAiData();
    return () => unsubscribe();
  }, [subscribeToAiData]);

  return {
    diseaseResults,
    yieldPrediction,
    loading,
    error,
    refresh: () => setError(null),
  };
}
