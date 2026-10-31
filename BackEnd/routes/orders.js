import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDatabase } from '../services/firebase.js';
import { getGateway, getCapturedPayment } from '../services/payments.js';
import { identifier, quantity, moneyInPaise, text } from '../utils/validation.js';
import { HttpError } from '../utils/errors.js';

function orderInput(body = {}) {
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 20) throw new HttpError(400, 'An order must contain 1 to 20 items.');
  const items = body.items.map(item => ({ listing_id: identifier(item?.listing_id, 'listing id'), quantity: quantity(item?.quantity) }));
  if (new Set(items.map(item => item.listing_id)).size !== items.length) throw new HttpError(400, 'Duplicate listings are not allowed.');
  if (!['COD', 'ONLINE'].includes(body.payment_method)) throw new HttpError(400, 'Use COD or verified online payment.');
  if (body.payment_method === 'ONLINE' && items.length !== 1) throw new HttpError(400, 'Online checkout currently supports one listing.');
  return { items, payment_method: body.payment_method,
    transaction_id: body.payment_method === 'ONLINE' ? identifier(body.transaction_id, 'payment id') : null,
    shipping_address: text(body.shipping_address, 'shipping address', 500),
    shipping_city: text(body.shipping_city, 'shipping city', 100),
    shipping_state: text(body.shipping_state, 'shipping state', 100),
    shipping_pincode: text(body.shipping_pincode, 'shipping pincode', 20),
    notes: text(body.notes, 'notes', 2000, true) };
}

export function createOrdersRouter(deps = {}) {
  const router = express.Router();
  const database = deps.getDatabase || getDatabase;
  router.use(deps.authenticate || requireAuth);
  router.post('/', async (req, res) => {
    const input = orderInput(req.body);
    const checked = input.transaction_id ? await (deps.verifyPayment || ((id, uid) => getCapturedPayment(getGateway(), id, uid)))(input.transaction_id, req.user.uid) : null;
    if (checked && (checked.order.notes?.uid !== req.user.uid || checked.order.notes?.listingId !== input.items[0].listing_id || Number(checked.order.notes?.quantity) !== input.items[0].quantity)) throw new HttpError(409, 'Payment does not match this purchase.');
    const db = await database();
    const orderRef = db.collection('orders').doc();
    const paymentRef = input.transaction_id ? db.collection('payment_consumptions').doc(input.transaction_id) : null;
    const order = await db.runTransaction(async tx => {
      // Read the payment marker first: a retry after success must return the original order.
      if (paymentRef) {
        const consumed = await tx.get(paymentRef);
        if (consumed.exists) {
          if (consumed.data().uid !== req.user.uid) throw new HttpError(409, 'Payment was already used.');
          const previous = await tx.get(db.collection('orders').doc(consumed.data().order_id));
          if (!previous.exists) throw new HttpError(409, 'Payment requires reconciliation.');
          return { id: consumed.data().order_id, ...previous.data() };
        }
      }
      const listings = [];
      const inventories = new Map();
      for (const item of input.items) {
        const ref = db.collection('market_listings').doc(item.listing_id);
        const snapshot = await tx.get(ref);
        if (!snapshot.exists) throw new HttpError(404, 'Listing not found.');
        const listing = snapshot.data();
        if (listing.is_active !== true) throw new HttpError(409, 'Listing is no longer available.');
        if (!Number.isFinite(listing.stock) || listing.stock < item.quantity) throw new HttpError(409, 'Insufficient stock.');
        const price = moneyInPaise(listing.price);
        if (!listing.farmer_id) throw new HttpError(409, 'Listing has no seller.');
        if (listing.inventory_id) {
          const id = identifier(listing.inventory_id, 'inventory id');
          let inventory = inventories.get(id);
          if (!inventory) {
            const inventoryRef = db.collection('inventory').doc(id);
            const snapshot = await tx.get(inventoryRef);
            if (!snapshot.exists || snapshot.data().farmer_id !== listing.farmer_id || !Number.isFinite(snapshot.data().quantity)) throw new HttpError(409, 'Inventory requires reconciliation.');
            inventory = {ref:inventoryRef, quantity:snapshot.data().quantity};
            inventories.set(id, inventory);
          }
          if (inventory.quantity < item.quantity) throw new HttpError(409, 'Insufficient inventory.');
          inventory.quantity -= item.quantity;
        }
        listings.push({ ref, listing, item, price });
      }
      const total = listings.reduce((sum, row) => sum + row.price * row.item.quantity, 0);
      if (!Number.isSafeInteger(total) || total > 1000000000) throw new HttpError(400, 'Order total is too large.');
      if (checked && checked.payment.amount !== total) throw new HttpError(409, 'Listing price changed. Contact support to reconcile the payment.');
      const now = new Date();
      const items = listings.map(({ listing, item, price }) => ({
        order_id: orderRef.id, seller_id: listing.farmer_id, product_name: listing.title || 'Produce',
        product_description: listing.description || '', quantity: item.quantity,
        unit: listing.unit || '', price_per_unit: price / 100, total_price: price * item.quantity / 100,
        listing_id: item.listing_id, inventory_id: listing.inventory_id || null, created_at: now,
      }));
      const saved = { ...input, items, customer_id: req.user.uid, seller_ids: [...new Set(items.map(item => item.seller_id))],
        status: 'pending', total_amount: total / 100, created_at: now, updated_at: now };
      tx.set(orderRef, saved);
      for (const inventory of inventories.values()) tx.update(inventory.ref, {quantity:inventory.quantity, updated_at:now});
      for (const row of listings) tx.update(row.ref, { stock: row.listing.stock - row.item.quantity });
      for (const item of items) tx.set(db.collection('order_items').doc(), item);
      tx.set(db.collection('order_tracking').doc(), { order_id: orderRef.id, status: 'pending', updated_by: req.user.uid, created_at: now, notes: 'Order placed.' });
      if (paymentRef) tx.set(paymentRef, { uid: req.user.uid, order_id: orderRef.id, created_at: now });
      return { id: orderRef.id, ...saved };
    });
    res.json({ success: true, order });
  });

  router.patch('/:id/status', async (req, res) => {
    const id = identifier(req.params.id, 'order id');
    const status = text(req.body?.status, 'status', 30);
    const notes = text(req.body?.notes, 'notes', 2000, true);
    const location = text(req.body?.location, 'location', 200, true);
    const db = await database();
    const result = await db.runTransaction(async tx => {
      const ref = db.collection('orders').doc(id);
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) throw new HttpError(404, 'Order not found.');
      const order = snapshot.data();
      const admin = req.user.admin === true;
      const seller = order.seller_ids?.length === 1 && order.seller_ids[0] === req.user.uid;
      const customer = order.customer_id === req.user.uid;
      if (!admin && !seller && !customer) throw new HttpError(403, 'Order access denied.');
      if (!admin && !seller && !(customer && status === 'cancelled')) throw new HttpError(403, 'Order update denied.');
      if (status === order.status) return { id, ...order };
      const next = { pending: ['confirmed', 'cancelled'], confirmed: ['processing', 'cancelled'], processing: ['out_for_delivery', 'cancelled'], out_for_delivery: ['delivered'], delivered: ['returned'] };
      if (!next[order.status]?.includes(status)) throw new HttpError(409, 'Invalid order status transition.');
      if (status === 'returned' && !admin) throw new HttpError(403, 'Only an administrator can process a return.');
      if (customer && !admin && !seller && order.status !== 'pending') throw new HttpError(403, 'Only pending orders can be cancelled by the customer.');
      if (status === 'cancelled' && !admin && order.status !== 'pending') throw new HttpError(403, 'Contact an administrator to cancel this order.');
      if (['cancelled', 'returned'].includes(status) && order.payment_method === 'ONLINE') throw new HttpError(409, 'Paid orders require administrator refund reconciliation; contact support.');
      const restore = [];
      const inventoryRestore = new Map();
      if (status === 'cancelled') {
        if (!Array.isArray(order.items) || !order.items.length) throw new HttpError(409, 'Legacy order requires administrator stock reconciliation.');
        for (const item of order.items) {
          const listingRef = db.collection('market_listings').doc(identifier(item.listing_id, 'listing id'));
          const listing = await tx.get(listingRef);
          if (!listing.exists || !Number.isFinite(listing.data().stock)) throw new HttpError(409, 'Listing requires stock reconciliation.');
          restore.push({ ref: listingRef, stock: listing.data().stock + item.quantity });
          if (item.inventory_id) {
            const id = identifier(item.inventory_id, 'inventory id');
            let inventory = inventoryRestore.get(id);
            if (!inventory) {
              const inventoryRef = db.collection('inventory').doc(id);
              const snapshot = await tx.get(inventoryRef);
              if (!snapshot.exists || snapshot.data().farmer_id !== item.seller_id || !Number.isFinite(snapshot.data().quantity)) throw new HttpError(409, 'Inventory requires reconciliation.');
              inventory = {ref:inventoryRef, quantity:snapshot.data().quantity};
              inventoryRestore.set(id, inventory);
            }
            inventory.quantity += item.quantity;
          }
        }
      }
      const now = new Date();
      tx.update(ref, { status, updated_at: now });
      for (const inventory of inventoryRestore.values()) tx.update(inventory.ref, {quantity:inventory.quantity, updated_at:now});
      for (const listing of restore) tx.update(listing.ref, { stock: listing.stock });
      tx.set(db.collection('order_tracking').doc(), { order_id: id, status, notes, location, updated_by: req.user.uid, created_at: now });
      return { id, ...order, status, updated_at: now };
    });
    res.json({ success: true, order: result });
  });
  return router;
}
export default createOrdersRouter();
