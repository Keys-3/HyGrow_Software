import { HttpError } from './errors.js';
export function identifier(value, name = 'id') {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new HttpError(400, `Invalid ${name}.`);
  return value;
}
export function quantity(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 10000) throw new HttpError(400, 'Quantity must be an integer between 1 and 10000.');
  return value;
}
export function moneyInPaise(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 10000000) throw new HttpError(409, 'Invalid listing price.');
  const amount = Math.round(value * 100);
  if (Math.abs(value * 100 - amount) > 0.000001) throw new HttpError(409, 'Listing prices support at most two decimal places.');
  return amount;
}
export function text(value, name, max, optional = false) {
  if (optional && (value === undefined || value === null || value === '')) return '';
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new HttpError(400, `Invalid ${name}.`);
  return value.trim();
}
