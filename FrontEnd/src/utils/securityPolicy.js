export function requireBackendUrl(configuredUrl, development = false) {
  if (!configuredUrl || typeof configuredUrl !== 'string') throw new Error('Configure EXPO_PUBLIC_BACKEND_URL before using connected services.');
  let url;
  try { url = new URL(configuredUrl); } catch { throw new Error('EXPO_PUBLIC_BACKEND_URL is invalid.'); }
  if (url.username || url.password || !url.hostname || (url.protocol !== 'https:' && !(development && url.protocol === 'http:'))) {
    throw new Error('The backend must use HTTPS. Local HTTP is supported only in development.');
  }
  return configuredUrl;
}
