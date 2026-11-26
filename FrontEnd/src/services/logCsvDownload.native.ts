import * as FileSystem from 'expo-file-system/legacy';
export async function downloadLogCsv(filename: string, contents: string) {
  const Sharing = await import('expo-sharing');
  if (!FileSystem.cacheDirectory) throw new Error('File export is unavailable on this device.');
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
  const uri = FileSystem.cacheDirectory + filename.replace(/[^A-Za-z0-9_.-]/g, '_');
  await FileSystem.writeAsStringAsync(uri, contents, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'Save plant readings and photos' });
}

export async function downloadLogArchive(filename: string, contents: Uint8Array) {
  const Sharing = await import('expo-sharing');
  if (!FileSystem.cacheDirectory || !await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
  const uri = FileSystem.cacheDirectory + filename.replace(/[^A-Za-z0-9_.-]/g, '_');
  const parts: string[] = [];
  for (let offset = 0; offset < contents.length; offset += 8192) parts.push(String.fromCharCode(...contents.subarray(offset, offset + 8192)));
  await FileSystem.writeAsStringAsync(uri, btoa(parts.join('')), { encoding: FileSystem.EncodingType.Base64 });
  await Sharing.shareAsync(uri, { mimeType: 'application/zip', UTI: 'public.zip-archive', dialogTitle: 'Save plant logs and photo gallery' });
}
