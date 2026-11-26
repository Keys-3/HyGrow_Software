import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { persistLogPhoto } from './plantLogPhotos';
export async function updateLogPhoto(userId: string, id: string, change: { imageUrl?: string; imageBase64?: string; imageMimeType?: string; notes: string; stage: string }) {
  if (auth.currentUser?.uid !== userId) throw new Error('Sign in before editing a log photo.');
  const reference = doc(db, 'plant_logs', id);
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) throw new Error('This photo record is no longer available.');
  const original = snapshot.data();
  if (original.userId !== userId) throw new Error('You can edit only your own log photos.');
  const imageUrl = change.imageUrl && change.imageUrl !== original.imageUrl
    ? await persistLogPhoto(userId, doc(collection(db, 'plant_logs')).id, change.imageUrl, change.imageBase64, change.imageMimeType)
    : original.imageUrl || '';
  if (auth.currentUser?.uid !== userId) throw new Error('Your session changed. Please sign in again.');
  const patch = { imageUrl, notes: change.notes.trim(), stage: change.stage };
  await setDoc(reference, patch, { merge: true });
  return { ...original, ...patch, id };
}
