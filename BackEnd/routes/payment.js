import express from 'express';
import crypto from 'node:crypto';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { HttpError } from '../utils/errors.js';
import { identifier, quantity, moneyInPaise } from '../utils/validation.js';
import { getGateway, getListing, getCapturedPayment } from '../services/payments.js';
export function createPaymentRouter(deps = {}) {
  const router = express.Router();
  const gateway = deps.getGateway || getGateway;
  router.use(deps.authenticate || requireAuth);
  router.post('/create-order', async (req, res) => {
    const listingId = identifier(req.body?.listingId, 'listingId');
    const count = quantity(req.body?.quantity);
    const listing = await (deps.getListing || getListing)(listingId);
    if (listing.is_active !== true) throw new HttpError(409, 'Listing is no longer available.');
    if (!Number.isFinite(listing.stock) || listing.stock < count) throw new HttpError(409, 'Insufficient stock.');
    const amount = moneyInPaise(listing.price) * count;
    if (!Number.isSafeInteger(amount) || amount > 1000000000) throw new HttpError(400, 'Order total is too large.');
    const order = await gateway().orders.create({
      amount, currency: 'INR', receipt: `hy_${crypto.randomUUID().replaceAll('-', '')}`,
      notes: { uid: req.user.uid, listingId, quantity: String(count) },
    });
    res.json({ success: true, order, keyId: (deps.keyId || (() => process.env.RAZORPAY_KEY_ID))() });
  });
  router.post('/verify', async (req, res) => {
    const orderId = identifier(req.body?.razorpay_order_id, 'gateway order id');
    const paymentId = identifier(req.body?.razorpay_payment_id, 'payment id');
    const signature = req.body?.razorpay_signature;
    if (typeof signature !== 'string' || !/^[a-fA-F0-9]{64}$/.test(signature)) throw new HttpError(400, 'Invalid payment signature.');
    const secret = (deps.getSecret || (() => process.env.RAZORPAY_KEY_SECRET))();
    if (!secret) throw new HttpError(503, 'Payments are not configured.');
    const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest();
    if (!crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'))) throw new HttpError(400, 'Invalid payment signature.');
    const client = gateway();
    const order = await client.orders.fetch(orderId);
    if (order.notes?.uid !== req.user.uid) throw new HttpError(403, 'Payment does not belong to this account.');
    const checked = await getCapturedPayment(client, paymentId, req.user.uid);
    if (checked.payment.order_id !== orderId) throw new HttpError(400, 'Payment does not match this order.');
    res.json({ success: true, message: 'Payment verified successfully.' });
  });
  // Refund and fulfilment must be reconciled together by an administrator.
  router.post('/refund', requireAdmin, (req, res) => {
    res.status(409).json({ success: false, message: 'Refunds must be processed and reconciled by an administrator in the Razorpay dashboard.' });
  });
  return router;
}
export default createPaymentRouter();
