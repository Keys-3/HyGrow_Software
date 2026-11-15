import { getBackendUrl } from '../utils/apiConfig';
import { requireBackendUrl } from '../utils/securityPolicy';
import { auth } from '../../firebase';

/**
 * Resolve a fresh Firebase token for each request; never persist bearer tokens.
 * @param {boolean} forceRefresh - whether to force exchange refresh token with Firebase Auth
 */
export async function getAuthHeaders(forceRefresh = false) {
  requireBackendUrl(getBackendUrl(), typeof __DEV__ !== 'undefined' && __DEV__);
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in to continue.');
  const token = await user.getIdToken(forceRefresh);
  if (auth.currentUser?.uid !== user.uid) throw new Error('Your session changed. Please retry.');
  return { Authorization: `Bearer ${token}` };
}

/**
 * Fetch wrapper that attaches Firebase auth headers.
 * If the remote service returns 401 Unauthorized, automatically triggers a token refresh
 * and retries the request once.
 */
export async function fetchWithAuth(url, options = {}) {
  const baseHeaders = options.headers || {};
  let authHeaders = await getAuthHeaders(false);

  let response = await fetch(url, {
    ...options,
    headers: {
      ...baseHeaders,
      ...authHeaders,
    },
  });

  if (response.status === 401) {
    try {
      const refreshedHeaders = await getAuthHeaders(true);
      response = await fetch(url, {
        ...options,
        headers: {
          ...baseHeaders,
          ...refreshedHeaders,
        },
      });
    } catch (_) {
      // Return original response if refresh attempt fails
    }
  }

  return response;
}

