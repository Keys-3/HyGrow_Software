import express from 'express';
import crypto from 'node:crypto';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { HttpError } from '../utils/errors.js';
import { identifier, quantity, moneyInPaise } from '../utils/validation.js';
import { getGateway, getListing, getCapturedPayment } from '../services/payments.js';

export function createPaymentRouter(deps = {}) {
  const router = express.Router();
  const gateway = deps.getGateway || getGateway;

  // Hosted Razorpay Checkout page for Mobile WebBrowser & App fallbacks
  router.get('/pay', (req, res) => {
    const { order_id, amount, key_id, name, description } = req.query;

    if (!order_id || !amount) {
      return res.status(400).send('Missing order_id or amount');
    }

    const razorpayKey = key_id || (deps.keyId || (() => process.env.RAZORPAY_KEY_ID))() || 'rzp_test_TOnbUVLiX5gQi8';
    const displayAmount = (parseFloat(amount) / 100).toFixed(2);
    const checkoutName = name || 'HYGROW Marketplace';
    const checkoutDesc = description || 'Order Payment';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>HyGrow Checkout</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0f172a;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 32px 24px;
      width: 100%;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .desc {
      font-size: 14px;
      color: #94a3b8;
      margin-bottom: 24px;
    }
    .amount-box {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .amount-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .amount-val {
      font-size: 32px;
      font-weight: 800;
      color: #10b981;
    }
    .btn {
      width: 100%;
      padding: 14px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-pay {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #ffffff;
      margin-bottom: 12px;
    }
    .btn-pay:hover { opacity: 0.95; }
    .btn-cancel {
      background: transparent;
      color: #94a3b8;
      border: 1px solid #334155;
    }
    .btn-cancel:hover { background: #334155; color: #ffffff; }
    .spinner {
      display: none;
      width: 32px;
      height: 32px;
      margin: 16px auto;
      border: 3px solid rgba(255,255,255,0.1);
      border-top: 3px solid #10b981;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">SECURE GATEWAY</div>
    <h1>${checkoutName}</h1>
    <p class="desc">${checkoutDesc}</p>
    
    <div class="amount-box">
      <div class="amount-label">Total to Pay</div>
      <div class="amount-val">₹${displayAmount}</div>
    </div>

    <div id="spinner" class="spinner"></div>
    <button id="payBtn" class="btn btn-pay" onclick="openRazorpay()">Proceed to Pay</button>
    <button class="btn btn-cancel" onclick="cancelPay()">Cancel</button>
  </div>

  <script>
    function openRazorpay() {
      document.getElementById('payBtn').style.display = 'none';
      document.getElementById('spinner').style.display = 'block';

      const options = {
        key: "${razorpayKey}",
        amount: "${amount}",
        currency: "INR",
        name: "${checkoutName}",
        description: "${checkoutDesc}",
        order_id: "${order_id}",
        handler: function(response) {
          const redirect = "farmhelp://payment-success?razorpay_payment_id=" + 
            encodeURIComponent(response.razorpay_payment_id) +
            "&razorpay_order_id=" + encodeURIComponent(response.razorpay_order_id) +
            "&razorpay_signature=" + encodeURIComponent(response.razorpay_signature);
          window.location.href = redirect;
        },
        modal: {
          ondismiss: function() {
            document.getElementById('payBtn').style.display = 'block';
            document.getElementById('spinner').style.display = 'none';
          }
        },
        theme: { color: "#10b981" }
      };

      try {
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function(resp) {
          alert('Payment Failed: ' + (resp.error ? resp.error.description : 'Transaction was not successful'));
          document.getElementById('payBtn').style.display = 'block';
          document.getElementById('spinner').style.display = 'none';
        });
        rzp.open();
      } catch(e) {
        alert('Could not launch payment gateway: ' + e.message);
        document.getElementById('payBtn').style.display = 'block';
        document.getElementById('spinner').style.display = 'none';
      }
    }

    function cancelPay() {
      window.location.href = "farmhelp://payment-cancelled";
    }

    window.onload = function() {
      setTimeout(openRazorpay, 350);
    };
  </script>
</body>
</html>`;

    res.send(html);
  });

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
      amount,
      currency: 'INR',
      receipt: `hy_${crypto.randomUUID().replaceAll('-', '')}`,
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
