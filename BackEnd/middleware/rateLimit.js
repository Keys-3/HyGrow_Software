export function createRateLimit({ max = 60, windowMs = 60000 } = {}) {
  const clients = new Map();
  return (req, res, next) => {
    const now = Date.now(); const key = req.user.uid;
    for (const [uid, entry] of clients) if (entry.expires <= now) clients.delete(uid);
    const current = clients.get(key) || { count: 0, expires: now + windowMs };
    if (current.count >= max) return res.status(429).json({ success: false, message: 'Too many requests. Try again later.' });
    if (clients.size >= 10000 && !clients.has(key)) return res.status(503).json({ success: false, message: 'Service is busy.' });
    current.count++; clients.set(key, current); next();
  };
}
