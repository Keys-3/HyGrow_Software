import * as FileSystem from 'expo-file-system/legacy';
export async function downloadLogCsv(filename: string, contents: string) {
  const Sharing = await import('expo-sharing');
  if (!FileSystem.cacheDirectory) throw new Error('File export is unavailable on this device.');
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
  const uri = FileSystem.cacheDirectory + filename.replace(/[^A-Za-z0-9_.-]/g, '_');
  await FileSystem.writeAsStringAsync(uri, contents, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'Save plant readings and photos' });
}
