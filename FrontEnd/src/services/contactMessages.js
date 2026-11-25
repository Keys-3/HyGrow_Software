import { getContactBackendUrl } from '../utils/apiConfig';
import { requireBackendUrl } from '../utils/securityPolicy';

/** One request per submission; never retry automatically after an uncertain delivery. */
export async function sendContactMessage(payload) {
  const base = requireBackendUrl(getContactBackendUrl(), typeof __DEV__ !== 'undefined' && __DEV__);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(base + '/api/contact', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload), signal: controller.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success !== true) {
      if (response.status === 401 || response.status === 404) throw new Error('The contact service needs an update. Please try again later. Your message has been kept.');
      throw new Error(result?.message || 'Your message could not be sent. Please try again.');
    }
    return result;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Delivery could not be confirmed because the connection timed out. Your message has been kept; check before sending again.');
    if (error instanceof TypeError) throw new Error('Unable to reach the contact service. Check your internet connection and try again.');
    throw error;
  } finally { clearTimeout(timeout); }
}
