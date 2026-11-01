import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const router = express.Router();

router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency, receipt } = req.body;

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_mock_secret',
    });

    const options = {
      amount: Math.round(amount * 100), // amount in paise
      currency: currency || 'INR',
      receipt: receipt || `rcptid_${Date.now()}`
    };

    const order = await instance.orders.create(options);
    
    if (!order) {
      return res.status(500).json({ success: false, message: 'Failed to create Razorpay order' });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('Razorpay Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/verify', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'rzp_test_mock_secret')
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      return res.json({ success: true, message: "Payment verified successfully" });
    } else {
      return res.status(400).json({ success: false, message: "Invalid signature sent!" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/refund', async (req, res) => {
  try {
    const { payment_id, amount } = req.body;
    
    if (!payment_id) {
      return res.status(400).json({ success: false, message: "payment_id is required for a refund" });
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_mock_secret',
    });

    const refund = await instance.payments.refund(payment_id);
    
    res.json({ success: true, refund });
  } catch (error) {
    console.error('Razorpay Refund Error:', error);
    const errorMsg = error.message || (error.error && error.error.description) || 'An unknown error occurred during refund processing';
    res.status(500).json({ success: false, message: errorMsg });
  }
});

// Hosted Razorpay Checkout page for Mobile WebBrowser & App fallbacks
router.get('/pay', (req, res) => {
  const { order_id, amount, key_id, name, description } = req.query;

  if (!order_id || !amount) {
    return res.status(400).send('Missing order_id or amount');
  }

  const razorpayKey = key_id || process.env.RAZORPAY_KEY_ID || 'rzp_test_TOnbUVLiX5gQi8';
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

export default router;
