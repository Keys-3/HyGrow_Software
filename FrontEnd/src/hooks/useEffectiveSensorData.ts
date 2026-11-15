/**
 * HyGrow — Effective Sensor Data Hook
 * Combines live hardware telemetry with automatic offline fallback to last-available
 * or calibrated agronomic dummy data so dashboards, charts, and analytics remain
 * fully populated and functional even when physical sensors are disconnected.
 */

import { useState, useEffect, useMemo } from 'react';
import useSensorData from './useSensorData';
import {
  DEFAULT_FALLBACK_TELEMETRY,
  generateFallbackHistory,
  generateFallbackWeekly,
  persistLastKnownTelemetry,
  loadLastKnownTelemetry,
  getCachedLastKnownTelemetry,
} from '../utils/fallbackTelemetry';
import type { Telemetry, HistoryPoint } from '../utils/telemetry';

export interface EffectiveSensorState {
  current: Telemetry;
  history: HistoryPoint[];
  weekly: HistoryPoint[];
  rawCurrent: Telemetry | null;
  rawHistory: HistoryPoint[];
  rawWeekly: HistoryPoint[];
  loading: boolean;
  error: string | null;
  stale: boolean;
  isOffline: boolean;
  isFallback: boolean;
  isLastKnown: boolean;
  source: 'local' | 'cloud' | 'last_known' | 'simulated';
  refresh: () => void;
}

export default function useEffectiveSensorData(): EffectiveSensorState {
  const {
    current: rawCurrent,
    history: rawHistory,
    weekly: rawWeekly,
    loading,
    error,
    stale,
    source: rawSource,
    refresh,
  } = useSensorData();

  const [cachedData, setCachedData] = useState<{
    telemetry: Telemetry | null;
    history: HistoryPoint[];
  }>(getCachedLastKnownTelemetry);

  // Load any previously persisted telemetry from AsyncStorage on mount
  useEffect(() => {
    let active = true;
    loadLastKnownTelemetry().then((loaded) => {
      if (active && (loaded.telemetry || loaded.history.length > 0)) {
        setCachedData(loaded);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // When live telemetry arrives, persist it for future offline sessions
  useEffect(() => {
    if (rawCurrent && typeof rawCurrent.temperature === 'number') {
      persistLastKnownTelemetry(rawCurrent, rawHistory);
    }
  }, [rawCurrent, rawHistory]);

  // Memoize stable fallback history series (refreshed only hourly if still offline)
  const defaultHistory = useMemo(() => generateFallbackHistory(24), []);
  const defaultWeekly = useMemo(() => generateFallbackWeekly(7), []);

  const hasLiveCurrent = Boolean(
    rawCurrent &&
    (typeof rawCurrent.temperature === 'number' ||
      typeof rawCurrent.humidity === 'number' ||
      typeof rawCurrent.ph === 'number' ||
      typeof rawCurrent.tds === 'number')
  );

  const hasCachedCurrent = Boolean(
    cachedData.telemetry &&
    (typeof cachedData.telemetry.temperature === 'number' ||
      typeof cachedData.telemetry.humidity === 'number' ||
      typeof cachedData.telemetry.ph === 'number' ||
      typeof cachedData.telemetry.tds === 'number')
  );

  // Resolve effective current
  let current: Telemetry;
  let isFallback = false;
  let isLastKnown = false;
  let isOffline = !hasLiveCurrent;
  let effectiveSource: 'local' | 'cloud' | 'last_known' | 'simulated' = 'simulated';

  if (hasLiveCurrent && rawCurrent) {
    current = {
      ...DEFAULT_FALLBACK_TELEMETRY,
      ...rawCurrent,
      // If firmware schema returns null for ec or co2, provide fallback estimates
      ec: rawCurrent.ec ?? 1.4,
      co2: rawCurrent.co2 ?? 650,
      pumpStatus: rawCurrent.pumpStatus ?? false,
      autoMode: rawCurrent.autoMode ?? true,
    };
    effectiveSource = (rawSource as any) || 'local';
    isFallback = false;
    isLastKnown = false;
  } else if (hasCachedCurrent && cachedData.telemetry) {
    current = {
      ...DEFAULT_FALLBACK_TELEMETRY,
      ...cachedData.telemetry,
      ec: cachedData.telemetry.ec ?? 1.4,
      co2: cachedData.telemetry.co2 ?? 650,
    };
    effectiveSource = 'last_known';
    isFallback = true;
    isLastKnown = true;
  } else {
    current = DEFAULT_FALLBACK_TELEMETRY;
    effectiveSource = 'simulated';
    isFallback = true;
    isLastKnown = false;
  }

  // Resolve effective history
  let history: HistoryPoint[];
  if (rawHistory && rawHistory.length > 0) {
    history = rawHistory;
  } else if (cachedData.history && cachedData.history.length > 0) {
    history = cachedData.history;
  } else {
    history = defaultHistory;
  }

  // Resolve effective weekly
  let weekly: HistoryPoint[];
  if (rawWeekly && rawWeekly.length > 0) {
    weekly = rawWeekly;
  } else {
    weekly = defaultWeekly;
  }

  return {
    current,
    history,
    weekly,
    rawCurrent,
    rawHistory,
    rawWeekly,
    loading,
    error,
    stale: isOffline ? false : stale,
    isOffline,
    isFallback,
    isLastKnown,
    source: effectiveSource,
    refresh,
  };
}

