import Razorpay from 'razorpay';
import { HttpError } from '../utils/errors.js';
import { identifier } from '../utils/validation.js';
import { getDatabase } from './firebase.js';
export function getGateway() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) throw new HttpError(503, 'Payments are not configured.');
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}
export async function getListing(id) {
  const snapshot = await (await getDatabase()).collection('market_listings').doc(identifier(id, 'listingId')).get();
  if (!snapshot.exists) throw new HttpError(404, 'Listing not found.');
  return snapshot.data();
}
export async function getCapturedPayment(gateway, paymentId, uid) {
  const payment = await gateway.payments.fetch(identifier(paymentId, 'payment id'));
  const order = await gateway.orders.fetch(identifier(payment.order_id, 'gateway order id'));
  if (order.notes?.uid !== uid) throw new HttpError(403, 'Payment does not belong to this account.');
  if (payment.status !== 'captured' || payment.amount_refunded > 0) throw new HttpError(409, 'Payment has not been captured or has been refunded.');
  if (payment.amount !== order.amount || payment.currency !== 'INR' || order.currency !== 'INR') throw new HttpError(409, 'Payment amount or currency does not match the order.');
  return { payment, order };
}
