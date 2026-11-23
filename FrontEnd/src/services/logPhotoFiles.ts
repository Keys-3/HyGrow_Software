export async function readPhotoBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Could not read the selected image. Choose it again.');
  const blob = await response.blob();
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('Could not read the image.')); reader.readAsDataURL(blob); });
}
export async function cacheLogPhoto(_key: string, base64: string, mimeType: string) { return 'data:' + mimeType + ';base64,' + base64; }

export async function removeCachedLogPhoto(_key: string) {}

export async function readCachedLogPhoto(_key: string): Promise<string | null> { return null; }
