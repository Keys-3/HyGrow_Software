export const LOG_PHOTO_PREFIX = 'hygrow-photo:';
export const PHOTO_CHUNK_SIZE = 700_000;
export function splitLogPhoto(base64: string) {
  const data = base64.replace(/^data:image\/[^;]+;base64,/, '').replace(/\s/g, '');
  if (!data || !/^[A-Za-z0-9+/]*={0,2}$/.test(data) || data.length > 7_000_000) {
    throw new Error('Choose an image smaller than 5 MB.');
  }
  return Array.from({ length: Math.ceil(data.length / PHOTO_CHUNK_SIZE) }, (_, index) => data.slice(index * PHOTO_CHUNK_SIZE, (index + 1) * PHOTO_CHUNK_SIZE));
}
export function parseLogPhotoUri(uri: string) {
  if (!uri.startsWith(LOG_PHOTO_PREFIX)) return null;
  const [userId, imageId] = uri.slice(LOG_PHOTO_PREFIX.length).split('/');
  if (!userId || !imageId || !/^[A-Za-z0-9_-]+$/.test(userId) || !/^[A-Za-z0-9_-]+$/.test(imageId)) throw new Error('Invalid saved photo reference.');
  return { userId, imageId };
}
