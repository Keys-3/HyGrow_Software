import * as FileSystem from 'expo-file-system/legacy';
export const readPhotoBase64 = (uri: string) => FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
export async function cacheLogPhoto(key: string, base64: string, mimeType: string) {
  if (!FileSystem.documentDirectory) throw new Error('Photo storage is unavailable on this device.');
  const directory = FileSystem.documentDirectory + 'plant-log-photos/';
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const uri = directory + key.replace(/[^A-Za-z0-9_-]/g, '_') + (mimeType === 'image/png' ? '.png' : mimeType === 'image/webp' ? '.webp' : '.jpg');
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return uri;
}

export async function removeCachedLogPhoto(key: string) {
  if (!FileSystem.documentDirectory) return;
  const prefix = FileSystem.documentDirectory + 'plant-log-photos/' + key.replace(/[^A-Za-z0-9_-]/g, '_');
  await Promise.all(['.jpg', '.png', '.webp'].map((extension) => FileSystem.deleteAsync(prefix + extension, { idempotent: true })));
}

export async function readCachedLogPhoto(key: string): Promise<string | null> {
  if (!FileSystem.documentDirectory) return null;
  const prefix = FileSystem.documentDirectory + 'plant-log-photos/' + key.replace(/[^A-Za-z0-9_-]/g, '_');
  for (const extension of ['.jpg', '.png', '.webp']) {
    const uri = prefix + extension;
    if ((await FileSystem.getInfoAsync(uri)).exists) return uri;
  }
  return null;
}
