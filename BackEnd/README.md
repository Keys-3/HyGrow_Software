# HyGrow backend

Express APIs for disease and growth inference, server-side chat, seller contact and marketplace checkout.

## Run and verify

Use Node 22.13 or newer. From this directory run `npm ci`, copy `.env.example` to `.env`, configure the services you use, then run `npm start`. Development uses `npm run dev`; regression tests use `npm test`. Tests exercise handlers in process without sockets, payments, emails or live model requests.

The Firebase Admin SDK uses Application Default Credentials and `FIREBASE_PROJECT_ID` (default `farm-help-383f1`). Configure your host's service identity or an ignored service-account file through `GOOGLE_APPLICATION_CREDENTIALS`. Firebase CLI login alone does not configure Admin SDK credentials. Never place service credentials or Gemini/SMTP/Razorpay secrets in Expo public configuration.

All routes below except health require `Authorization: Bearer <Firebase ID token>`. Tokens are verified for the configured project, revocation and disabled users. Administrative authorization requires the trusted custom claim `admin: true`; editable profile roles do not grant it. Web origins must appear in `ALLOWED_ORIGINS`; native clients can omit Origin.

## APIs

| Route | Body / behavior |
| --- | --- |
| GET / | Public health JSON |
| POST /api/disease-detect | `{imageBase64,fileName?}`; raw base64 or image data URL; returns `{success,result}` |
| POST /growth | Numeric `temperature` (-20..80), `humidity` (0..100), `tds` (0..10000), `ph` (0..14); returns `{success,prediction}` |
| POST /api/chat | `{message,history?}`; returns `{success,reply}`. /chat is an alias. |
| POST /api/email/send | `{listingId,subject,text,attachments?}` contacts that listing's seller; omit listingId to contact configured support only. |
| POST /api/payment/create-order | `{listingId,quantity}`; returns Razorpay `order` and public `keyId`. Price and INR total are derived from Firestore. |
| POST /api/payment/verify | Razorpay `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`; verifies HMAC, buyer, captured amount, currency and refund state with Razorpay. |
| POST /api/orders | Authoritative checkout described below |
| PATCH /api/orders/:id/status | `{status,notes?,location?}`; checks actor and transition and writes tracking atomically |
| POST /api/payment/refund | Administrator only; responds 409 directing the operator to manual gateway reconciliation. |

Chat requires `GEMINI_API_KEY` and an available `GEMINI_MODEL`. History contains at most 20 alternating `{role:'user'|'model',text}` messages, starting with user and ending with model. Send complete pairs; the new user message is separate. Individual messages are limited to 4000 characters. The backend calls the fixed Google Generative Language host and aborts chat after 30 seconds.

Images accept PNG, JPEG and WebP signatures, at most 5 MiB decoded, inside a 7 MiB JSON request. Original filenames never choose server paths. Temporary images use random names under the OS temporary directory and are removed in a finally block; inference times out after 45 seconds. Signature checks identify supported image types; the model still validates image contents.

Email requires explicit SMTP configuration; no fallback test accounts or credentials exist. Seller addresses are resolved through the listing and Firebase Authentication. The reply address comes from the authenticated account. Only one image attachment is accepted, shaped as `{filename,content:<base64>,encoding:'base64'}`; arbitrary Nodemailer options, local paths and URLs are rejected and file/URL access is disabled. The support destination defaults to the project contact address and can be changed through `SUPPORT_EMAIL`.

## Authoritative orders

POST /api/orders accepts:

```json
{
  "items": [{"listing_id": "listing-id", "quantity": 2}],
  "payment_method": "COD",
  "shipping_address": "1 Main Street",
  "shipping_city": "Delhi",
  "shipping_state": "Delhi",
  "shipping_pincode": "110001",
  "notes": ""
}
```

ONLINE additionally requires `transaction_id` containing a captured Razorpay payment ID and currently supports one listing per checkout. COD permits up to 20 distinct listings. Server transactions read active listings (`is_active: true`), validate stock, derive seller/price/total, decrement stock, and write `orders`, `order_items` and `order_tracking`. Client prices, totals, seller IDs and order status are ignored. The order stores `seller_ids` and an immutable item snapshot for authorization and cancellation. Listing prices must be positive numbers with at most two decimal places; quantities are integers from 1 to 10000.

ONLINE payments must match the authenticated buyer, listing, quantity and current total. A private `payment_consumptions` document binds each payment to one order atomically; retries return that order without decrementing stock again. A price/stock change after payment may require administrator reconciliation instead of creating an invalid order.

Statuses progress pending → confirmed → processing → out_for_delivery → delivered. A single seller or administrator can advance fulfilment; multi-seller orders require administrator updates. Customers can cancel their pending COD orders; sellers can cancel pending COD orders; administrators can cancel COD orders before dispatch. Cancellation restores stock once and records tracking. Only administrators can mark delivered COD orders returned. Older orders without the immutable item snapshot require manual stock reconciliation.

Automatic refunds, paid-order cancellation/returns and order deletion are disabled. An administrator must reconcile payment and fulfilment in the Razorpay dashboard and trusted administrative tooling. Failed verification does not imply an automatic refund. Payments captured while stock/prices changed also require this reconciliation. Deploy the accompanying Firestore rules to deny client writes to orders/items/tracking and payment consumption records.

## Operational limits

The backend enforces 60 authenticated requests per minute and five email requests per hour per account in each process. Limits are process-local; multi-instance deployments should add shared quotas at an API gateway. Gradio requests time out locally; the upstream provider may continue computation. A timed-out inference cannot refer to the removed local file because its bytes are buffered before submission. Restarting the service clears in-memory counters. Run the backend behind HTTPS; the app needs the deployed backend URL and its Firebase login configuration.

No live email, gateway, Gemini or Hugging Face calls run during the regression suite. Production credentials, provider capture settings, Firestore rule deployment and live end-to-end checkout remain deployment checks.
