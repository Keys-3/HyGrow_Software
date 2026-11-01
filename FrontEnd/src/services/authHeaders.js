import { getBackendUrl } from '../utils/apiConfig';
import { requireBackendUrl } from '../utils/securityPolicy';
import { auth } from '../../firebase';

// Resolve a fresh Firebase token for each request; never persist bearer tokens.
export async function getAuthHeaders() {
  requireBackendUrl(getBackendUrl(), typeof __DEV__ !== 'undefined' && __DEV__);
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in to continue.');
  const token = await user.getIdToken();
  if (auth.currentUser?.uid !== user.uid) throw new Error('Your session changed. Please retry.');
  return { Authorization: `Bearer ${token}` };
}
