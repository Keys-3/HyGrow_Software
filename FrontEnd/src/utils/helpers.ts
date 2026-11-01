/**
 * Farm Help — Helper Utilities
 */

import { SENSOR_THRESHOLDS, SensorKey } from './constants';

export function getSensorStatus(sensorKey: SensorKey, value: number | null | undefined) {
  const threshold = SENSOR_THRESHOLDS[sensorKey];
  if (!threshold || value === null || value === undefined || !Number.isFinite(value)) {
    return 'unknown';
  }

  if (value <= threshold.criticalMin || value >= threshold.criticalMax) {
    return 'critical';
  }

  if (value < threshold.min || value > threshold.max) {
    return 'warning';
  }

  return 'normal';
}

export function getStatusColor(status: string, themeColors: any) {
  switch (status) {
    case 'critical':
      return themeColors.danger;
    case 'warning':
      return themeColors.warning;
    case 'normal':
      return themeColors.success;
    default:
      return themeColors.textMuted;
  }
}

export function formatSensorValue(
  sensorKey: SensorKey,
  value: number | null | undefined
) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--';
  }

  switch (sensorKey) {
    case 'temperature':
      return value.toFixed(1);

    case 'humidity':
      return value.toFixed(1);

    case 'ph':
      return value.toFixed(2);

    case 'ec':
      return value.toFixed(1);

    case 'waterLevel':
      return value.toFixed(1);

    case 'lightIntensity':
      return Math.round(value).toString();

    default:
      return value.toString();
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case 'critical':
      return 'Critical';
    case 'warning':
      return 'Warning';
    case 'normal':
      return 'Normal';
    default:
      return 'Unknown';
  }
}

export function formatTime(timestamp: string | number | Date) {
  if (!timestamp) return '--';

  const date = new Date(timestamp);

  if (isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(timestamp: string | number | Date) {
  if (!timestamp) return '--';

  const date = new Date(timestamp);

  if (isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleDateString();
}

export function calcStats(values: number[]) {
  if (!values || values.length === 0) {
    return {
      min: null,
      max: null,
      avg: null,
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg =
    values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    min,
    max,
    avg,
  };
}

export function timeAgo(timestamp: string | number | Date) {
  if (!timestamp) return '--';

  const now = new Date();
  const date = new Date(timestamp);

  if (isNaN(date.getTime())) {
    return '--';
  }

  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}

export function getDefaultImage(category: string, title?: string) {
  const normalizedCategory = (category || '').toLowerCase();
  const normalizedTitle = (title || '').toLowerCase();
  
  // Specific Item Checks
  if (normalizedTitle.includes('tomato')) {
    return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&q=80';
  }
  if (normalizedTitle.includes('lettuce')) {
    return 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=500&q=80';
  }
  if (normalizedTitle.includes('spinach')) {
    return 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500&q=80';
  }
  if (normalizedTitle.includes('basil') || normalizedTitle.includes('herb')) {
    return 'https://images.unsplash.com/photo-1606103920295-9a091573f160?w=500&q=80';
  }
  if (normalizedTitle.includes('strawberry')) {
    return 'https://images.unsplash.com/photo-1518131672697-611ec571bb15?w=500&q=80';
  }
  if (normalizedTitle.includes('cucumber')) {
    return 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500&q=80';
  }
  if (normalizedTitle.includes('mint')) {
    return 'https://images.unsplash.com/photo-1628151025530-68194a287a91?w=500&q=80';
  }
  if (normalizedTitle.includes('kale')) {
    return 'https://images.unsplash.com/photo-1528659587421-2a62edceac2c?w=500&q=80';
  }

  // Category Fallbacks
  if (normalizedCategory.includes('vegetable')) {
    return 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=500&q=80';
  }
  if (normalizedCategory.includes('fruit')) {
    return 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500&q=80';
  }
  if (normalizedCategory.includes('herb')) {
    return 'https://images.unsplash.com/photo-1606103920295-9a091573f160?w=500&q=80';
  }
  if (normalizedCategory.includes('microgreen')) {
    return 'https://images.unsplash.com/photo-1515589654516-7243c5b8b981?w=500&q=80';
  }
  
  // Generic farm/produce image fallback
  return 'https://images.unsplash.com/photo-1595858273617-e4318ee47683?w=500&q=80';
}