import { getAuth } from '../services/firebase.js';

export function createRequireAuth(verify = async token => (await getAuth()).verifyIdToken(token, true)) {
  return async function requireAuth(req, res, next) {
    if (req.user?.uid) return next();
    const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '');
    if (!match) return res.status(401).json({ success: false, message: 'Authentication required.' });
    try {
      const user = await verify(match[1]);
      if (!user?.uid) throw new Error('Invalid identity');
      req.user = user;
      next();
    } catch {
      res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
    }
  };
}

export const requireAuth = createRequireAuth();

export function requireAdmin(req, res, next) {
  if (req.user?.admin !== true) return res.status(403).json({ success: false, message: 'Administrator access required.' });
  next();
}
