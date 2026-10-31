const Busboy = require('busboy');
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
function httpError(status, message) { return Object.assign(new Error(message), { status }); }
function imageType(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'image/png';
  if (buffer.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) return 'image/jpeg';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  throw httpError(400, 'Only PNG, JPEG and WebP images are supported.');
}
function normalizeResult(raw) {
  let data = raw?.data ?? raw;
  if (Array.isArray(data)) data = data[0];
  const value = typeof data === 'string' ? data : data?.label || data?.class || data?.disease || data?.prediction;
  const disease = typeof value === 'string' && value.trim() ? value.slice(0, 200) : 'Unknown disease';
  const score = data?.confidences?.find?.(item => item.label === disease)?.confidence ?? data?.confidence ?? data?.score ?? 0;
  const confidence = typeof score === 'number' && Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : 0;
  return { disease, confidence, severity: confidence > 0.9 ? 'high' : confidence > 0.7 ? 'moderate' : 'low',
    description: `Detected ${disease}`, recommendations: ['Inspect nearby plants.', 'Confirm the diagnosis before treatment.', 'Monitor humidity, nutrients, pH and airflow.'] };
}
function readImage(req) {
  if (!Buffer.isBuffer(req.rawBody) || req.rawBody.length > 7 * 1024 * 1024) throw httpError(413, 'Request exceeds the image upload limit.');
  return new Promise((resolve, reject) => {
    let parser;
    try { parser = Busboy({ headers: req.headers, limits: { files: 1, fields: 0, parts: 2, fileSize: MAX_IMAGE_BYTES } }); }
    catch { reject(httpError(400, 'Invalid multipart form.')); return; }
    let image; let failure; let files = 0;
    parser.on('file', (field, file, info) => {
      files++;
      if (field !== 'image' || !['image/png', 'image/jpeg', 'image/webp'].includes(info.mimeType)) {
        failure = httpError(400, 'Supply one PNG, JPEG or WebP file in the image field.'); file.resume(); return;
      }
      const chunks = [];
      file.on('limit', () => { failure = httpError(413, 'Image exceeds the 5 MB limit.'); });
      file.on('data', chunk => chunks.push(chunk));
      file.on('error', () => reject(httpError(400, 'Invalid image upload.')));
      file.on('end', () => { if (!file.truncated) image = Buffer.concat(chunks); });
    });
    parser.on('filesLimit', () => { failure = httpError(400, 'Only one image is allowed.'); });
    parser.on('fieldsLimit', () => { failure = httpError(400, 'Unexpected form field.'); });
    parser.on('partsLimit', () => { failure = httpError(400, 'Only one image is allowed.'); });
    parser.on('error', () => reject(httpError(400, 'Invalid multipart form.')));
    parser.on('close', () => {
      if (failure) return reject(failure);
      if (files !== 1 || !image?.length) return reject(httpError(400, 'No image supplied.'));
      try { imageType(image); resolve(image); } catch (error) { reject(error); }
    });
    parser.end(req.rawBody);
  });
}
async function verifyToken(token) {
  const { getApps, initializeApp } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');
  const app = getApps()[0] || initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'farm-help-383f1' });
  return getAuth(app).verifyIdToken(token, true);
}
let connection;
async function predict(image) {
  const { Client, handle_file } = await import('@gradio/client');
  if (!connection) connection = Client.connect(process.env.HF_SPACE || 'sam120904/hydro-disease-detector').catch(error => { connection = null; throw error; });
  const client = await connection;
  return client.predict('/predict', { image: handle_file(new Blob([image], { type: imageType(image) })) });
}
function createDiseaseHandler(deps = {}) {
  const requests = new Map();
  return async (req, res) => {
    const allowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:8081,http://localhost:19006').split(',').map(value => value.trim());
    const origin = req.headers.origin;
    if (origin && !allowed.includes(origin)) return res.status(403).json({ success: false, message: 'Origin is not allowed.' });
    if (origin) { res.set('Access-Control-Allow-Origin', origin); res.set('Vary', 'Origin'); }
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Use POST.' });
    const bearer = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '');
    if (!bearer) return res.status(401).json({ success: false, message: 'Authentication required.' });
    let user;
    try { user = await (deps.verifyToken || verifyToken)(bearer[1]); if (!user?.uid) throw new Error('Invalid identity'); }
    catch { return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' }); }
    try {
      const now = Date.now(); const previous = requests.get(user.uid);
      if (previous && previous.expires > now && previous.count >= 10) throw httpError(429, 'Too many requests. Try again later.');
      for (const [key, entry] of requests) if (entry.expires <= now) requests.delete(key);
      if (requests.size >= 10000 && !requests.has(user.uid)) throw httpError(503, 'Service is busy.');
      requests.set(user.uid, previous?.expires > now ? { ...previous, count: previous.count + 1 } : { count: 1, expires: now + 60000 });
      const image = await readImage(req);
      let timer;
      let result;
      try {
        result = await Promise.race([(deps.predict || predict)(image), new Promise((resolve, reject) => { timer = setTimeout(() => reject(httpError(502, 'Disease detection timed out.')), 45000); })]);
      } finally { clearTimeout(timer); }
      return res.status(200).json({ success: true, result: normalizeResult(result) });
    } catch (error) {
      const status = error.status || 502;
      return res.status(status).json({ success: false, message: status >= 500 ? 'Disease detection is unavailable. Please try again later.' : error.message });
    }
  };
}
module.exports = { createDiseaseHandler, normalizeResult };
