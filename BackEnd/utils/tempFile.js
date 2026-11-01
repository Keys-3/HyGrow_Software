import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { HttpError } from './errors.js';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const uploadDir = path.join(tmpdir(), 'hygrow-images');

export function imageType(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'png';
  if (buffer.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) return 'jpeg';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  throw new HttpError(400, 'Only PNG, JPEG and WebP images are supported.');
}

export function decodeImage(base64) {
  if (typeof base64 !== 'string' || !base64) throw new HttpError(400, 'No image supplied.');
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,([\s\S]+)$/i.exec(base64);
  const encoded = match ? match[2] : base64;
  if (encoded.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw new HttpError(413, 'Image exceeds the 5 MB limit.');
  // A repeated four-character capture can overflow V8's regex stack on multi-MB uploads.
  if (encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) throw new HttpError(400, 'Invalid base64 image.');
  const buffer = Buffer.from(encoded, 'base64');
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'Image exceeds the 5 MB limit.');
  imageType(buffer);
  return buffer;
}

export async function saveTempImage(base64) {
  const buffer = decodeImage(base64);
  const filePath = path.join(uploadDir, `${randomUUID()}.${imageType(buffer)}`);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, buffer, { flag: 'wx', mode: 0o600 });
  return filePath;
}

export async function deleteTempImage(filePath) {
  if (!filePath) return;
  try { await unlink(filePath); }
  catch (error) { if (error.code !== 'ENOENT') console.error('Temporary image cleanup failed.'); }
}
