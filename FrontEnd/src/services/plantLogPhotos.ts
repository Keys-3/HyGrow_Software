import { collection, doc, getDoc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { LOG_PHOTO_PREFIX, parseLogPhotoUri, splitLogPhoto } from '../utils/logPhotoData';
import { readPhotoBase64, cacheLogPhoto, removeCachedLogPhoto, readCachedLogPhoto } from './logPhotoFiles';

export async function persistLogPhoto(userId: string, imageId: string, uri: string, base64?: string, mimeType = 'image/jpeg') {
  if (!uri) return '';
  if (/^https:\/\//.test(uri) || uri.startsWith(LOG_PHOTO_PREFIX)) return uri;
  if (auth.currentUser?.uid !== userId) throw new Error('Sign in before saving a log photo.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) throw new Error('Choose a JPEG, PNG or WebP photo.');
  const image = doc(db, 'plant_log_photos', userId, 'images', imageId);
  if ((await getDoc(image)).exists()) return LOG_PHOTO_PREFIX + userId + '/' + imageId;
  const chunks = splitLogPhoto(base64 || await readPhotoBase64(uri));
  const batch = writeBatch(db);
  batch.set(image, { userId, mimeType, chunkCount: chunks.length, createdAt: serverTimestamp() });
  chunks.forEach((data, index) => batch.set(doc(collection(image, 'chunks'), String(index)), { index, data }));
  await batch.commit();
  return LOG_PHOTO_PREFIX + userId + '/' + imageId;
}
const loading = new Map<string, Promise<string>>();
const resolved = new Map<string, string>();
export async function resolveLogPhoto(uri: string): Promise<string> {
  const key = parseLogPhotoUri(uri);
  if (!key) return uri;
  if (auth.currentUser?.uid !== key.userId) throw new Error('Sign in to view this private log photo.');
  if (resolved.has(uri)) return resolved.get(uri)!;
  if (loading.has(uri)) return loading.get(uri)!;
  const request = (async () => {
    const cached = await readCachedLogPhoto(key.userId + '_' + key.imageId);
    if (cached) return cached;
    const image = doc(db, 'plant_log_photos', key.userId, 'images', key.imageId);
    const metadata = await getDoc(image);
    if (!metadata.exists()) throw new Error('This photo has been removed.');
    const { mimeType, chunkCount } = metadata.data();
    const snapshot = await getDocs(collection(image, 'chunks'));
    const chunks = snapshot.docs.map((entry) => entry.data()).sort((a, b) => a.index - b.index);
    if (chunks.length !== chunkCount || chunks.some((chunk, index) => chunk.index !== index)) throw new Error('The photo could not be fully loaded. Retry when connected.');
    const result = await cacheLogPhoto(key.userId + '_' + key.imageId, chunks.map((chunk) => chunk.data).join(''), mimeType);
    resolved.set(uri, result);
    if (resolved.size > 12) resolved.delete(resolved.keys().next().value!);
    return result;
  })();
  loading.set(uri, request);
  try { return await request; } finally { loading.delete(uri); }
}
export async function deleteLogPhoto(uri: string) {
  const key = parseLogPhotoUri(uri);
  if (!key) return;
  const image = doc(db, 'plant_log_photos', key.userId, 'images', key.imageId);
  const chunks = await getDocs(collection(image, 'chunks'));
  const batch = writeBatch(db);
  chunks.docs.forEach((chunk) => batch.delete(chunk.ref));
  batch.delete(image);
  await batch.commit();
  resolved.delete(uri);
  await removeCachedLogPhoto(key.userId + '_' + key.imageId);
}
