import type { PlantGrowthPhotoRecord } from './plantProfileData';
export type LogPhotoMap = Record<string, PlantGrowthPhotoRecord[]>;
export function logPhotoTimestamp(value: any): string | null {
  try {
    const date = typeof value === 'string' ? new Date(value) : value?.toDate ? value.toDate() : typeof value?.seconds === 'number' ? new Date(value.seconds * 1000) : null;
    return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
  } catch { return null; }
}
export function restoreLogPhotos(previous: LogPhotoMap, documents: { id: string; data: () => any }[], fromCache: boolean): LogPhotoMap {
  // An empty memory-cache snapshot says nothing about cloud records. Never save
  // it over the durable, account-scoped references loaded from AsyncStorage.
  const next: LogPhotoMap = fromCache ? Object.fromEntries(Object.entries(previous).map(([plantId, photos]) => [plantId, [...photos]])) : {};
  for (const document of documents) {
    const data = document.data();
    if (!data.plantId || data.isDailyAverageSummary) continue;
    const timestamp = logPhotoTimestamp(data.timestamp) || logPhotoTimestamp(data.createdAt) || logPhotoTimestamp(data.dateString ? data.dateString + 'T12:00:00Z' : null);
    if (!timestamp) continue;
    const photo: PlantGrowthPhotoRecord = { id: document.id, plantId: data.plantId, plantName: data.plantName || data.plantId,
      stage: data.stage || 'Vegetative', timestamp, imageUrl: data.imageUrl || '', notes: data.notes || '', readings: data.readings || {},
      thresholdContext: data.thresholdContext, periodAverages: data.periodAverages, compliancePercent: data.compliancePercent };
    const entries = next[data.plantId] ||= [];
    const index = entries.findIndex(entry => entry.id === document.id);
    if (index < 0) entries.push(photo); else entries[index] = photo;
  }
  return next;
}
