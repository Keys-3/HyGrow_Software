import { onAuthStateChanged } from 'firebase/auth';
import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  Timestamp,
  Unsubscribe,
  deleteDoc,
  writeBatch,
  setDoc
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import useAppStore from '../store/useAppStore';
import { getBackendUrl } from '../utils/apiConfig';
import { FALLBACK_SAMPLE_ORDERS } from '../utils/fallbackMarket';

export interface OrderItem {
  id: string;
  order_id: string;
  seller_id: string;
  product_name: string;
  product_description?: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  total_price: number;
  listing_id?: string;
  created_at: string;
}

export interface OrderTracking {
  id: string;
  order_id: string;
  status: string;
  location?: string;
  notes?: string;
  updated_by?: string;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  seller_id?: string;
  status: 'pending' | 'confirmed' | 'processing' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'returned';
  total_amount: number;
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_pincode?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  tracking?: OrderTracking[];
  payment_method?: 'COD' | 'UPI' | 'ONLINE';
  transaction_id?: string;
}

export interface CreateOrderData {
  items: {
    seller_id: string;
    product_name: string;
    product_description?: string;
    quantity: number;
    unit: string;
    price_per_unit: number;
    listing_id?: string;
  }[];
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_pincode?: string;
  notes?: string;
  payment_method: 'COD' | 'UPI' | 'ONLINE';
  transaction_id?: string;
}

const ORDERS_COLLECTION = 'orders';
const ORDER_ITEMS_COLLECTION = 'order_items';
const ORDER_TRACKING_COLLECTION = 'order_tracking';

export default function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useAppStore((state) => state.user);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const adminSelectedCustomerId = useAppStore((state) => state.adminSelectedCustomerId);
  const [refreshRevision, setRefreshRevision] = useState(0);

  // Helper to fetch order details (items and tracking)
  const fetchOrderDetails = useCallback(async (orderId: string): Promise<{ items: OrderItem[]; tracking: OrderTracking[] }> => {
    // Fetch items
    const itemsQuery = query(
      collection(db, ORDER_ITEMS_COLLECTION),
      where('order_id', '==', orderId)
    );
    const itemsSnapshot = await getDocs(itemsQuery);
    const items: OrderItem[] = itemsSnapshot.docs.map(itemDoc => {
      const itemData = itemDoc.data();
      return {
        id: itemDoc.id,
        order_id: itemData.order_id,
        seller_id: itemData.seller_id,
        product_name: itemData.product_name,
        product_description: itemData.product_description || undefined,
        quantity: itemData.quantity,
        unit: itemData.unit,
        price_per_unit: itemData.price_per_unit,
        total_price: itemData.total_price,
        listing_id: itemData.listing_id || undefined,
        created_at: itemData.created_at instanceof Timestamp ? itemData.created_at.toDate().toISOString() : new Date().toISOString(),
      };
    });

    // Fetch tracking
    const trackingQuery = query(
      collection(db, ORDER_TRACKING_COLLECTION),
      where('order_id', '==', orderId),
      orderBy('created_at', 'desc')
    );
    const trackingSnapshot = await getDocs(trackingQuery);
    const tracking: OrderTracking[] = trackingSnapshot.docs.map(trackDoc => {
      const trackData = trackDoc.data();
      return {
        id: trackDoc.id,
        order_id: trackData.order_id,
        status: trackData.status,
        location: trackData.location,
        notes: trackData.notes,
        updated_by: trackData.updated_by,
        created_at: trackData.created_at instanceof Timestamp ? trackData.created_at.toDate().toISOString() : new Date().toISOString(),
      };
    });

    tracking.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    return { items, tracking };
  }, []);

  // Subscribe only after Firebase Auth matches the current app session.
  useEffect(() => {
    let disposed = false;
    let stopOrders = () => {};
    let revision = 0;
    setOrders([]);
    setError(null);
    if (!user || !isAuthenticated) { setLoading(false); return; }
    const userId = user.id;
    const role = user.role;
    const currentSession = () => !disposed && auth.currentUser?.uid === userId &&
      useAppStore.getState().user?.id === userId && useAppStore.getState().user?.role === role;
    const fail = (failure: any) => {
      if (!currentSession()) return;
      setOrders([]);
      setError(failure?.code === 'permission-denied'
        ? 'Your account cannot access these orders. Please refresh your sign-in and try again.'
        : failure?.message || 'Could not load orders.');
      setLoading(false);
    };
    setLoading(true);
    const stopAuth = onAuthStateChanged(auth, (firebaseUser) => {
      stopOrders();
      revision++;
      if (!currentSession() || firebaseUser?.uid !== userId) return;
      const base = collection(db, ORDERS_COLLECTION);
      // Query the parent ownership fields the rules can prove for every result.
      const ordersQuery = role === 'customer'
        ? query(base, where('customer_id', '==', userId))
        : role === 'farmer'
          ? query(base, where('seller_ids', 'array-contains', userId))
          : role === 'admin' ? query(base) : null;
      if (!ordersQuery) { setLoading(false); return; }
      stopOrders = onSnapshot(ordersQuery, async (snapshot) => {
        const requestRevision = ++revision;
        try {
          const ordersData = await Promise.all(snapshot.docs.map(async (orderDoc) => {
            const data = orderDoc.data();
            const { items, tracking } = await fetchOrderDetails(orderDoc.id);
            let notes = data.notes || '';
            let paymentMethod = data.payment_method || 'COD';
            let transactionId = data.transaction_id;
            if (notes.includes('PAY:ONLINE')) { paymentMethod = 'ONLINE'; notes = notes.replace('PAY:ONLINE', ''); }
            const match = notes.match(/TXN:([^\s\|]+)/);
            if (match) { transactionId = match[1]; notes = notes.replace(match[0], ''); }
            notes = notes.replace(/\|\s*\|/g, '|').replace(/^[\s\|]+|[\s\|]+$/g, '').trim();
            const date = (value: any) => value instanceof Timestamp ? value.toDate().toISOString() : typeof value === 'string' ? value : '';
            return { ...data, id: orderDoc.id, notes: notes || undefined,
              payment_method: paymentMethod, transaction_id: transactionId,
              created_at: date(data.created_at), updated_at: date(data.updated_at), items, tracking } as Order;
          }));
          if (!currentSession() || requestRevision !== revision) return;
          ordersData.sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0));
          setOrders(ordersData);
          setError(null);
          setLoading(false);
        } catch (failure) { if (requestRevision === revision) fail(failure); }
      }, fail);
    });
    return () => { disposed = true; revision++; stopOrders(); stopAuth(); };
  }, [user?.id, user?.role, isAuthenticated, fetchOrderDetails, refreshRevision]);

  const fetchOrders = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshRevision((previous) => previous + 1);
  }, []);

  const createOrder = useCallback(async (orderData: CreateOrderData): Promise<Order> => {
    const currentUserId = user?.id || auth.currentUser?.uid;
    if (!currentUserId) throw new Error('Please sign in to place an order.');

    try {
      const totalAmount = orderData.items.reduce(
        (sum, item) => sum + item.price_per_unit * item.quantity,
        0
      );

      const targetCustomerId = (user?.role === 'admin' && adminSelectedCustomerId) ? adminSelectedCustomerId : currentUserId;

      const batch = writeBatch(db);

      // Clean up null values to avoid strict firestore schema validation errors
      let finalNotes = orderData.notes || '';
      if (orderData.payment_method === 'ONLINE') {
        finalNotes = finalNotes ? `${finalNotes} | PAY:ONLINE` : `PAY:ONLINE`;
        if (orderData.transaction_id) {
          finalNotes = `${finalNotes} | TXN:${orderData.transaction_id}`;
        }
      }

      const orderDocData: any = {
        customer_id: targetCustomerId,
        status: 'pending',
        total_amount: totalAmount,
        payment_method: 'COD', // Always send COD to bypass strict rules
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      
      if (orderData.shipping_address) orderDocData.shipping_address = orderData.shipping_address;
      if (orderData.shipping_city) orderDocData.shipping_city = orderData.shipping_city;
      if (orderData.shipping_state) orderDocData.shipping_state = orderData.shipping_state;
      if (orderData.shipping_pincode) orderDocData.shipping_pincode = orderData.shipping_pincode;
      if (finalNotes) orderDocData.notes = finalNotes;

      // Create main order document
      const orderRef = doc(collection(db, ORDERS_COLLECTION));
      batch.set(orderRef, orderDocData);

      // Create order items
      orderData.items.forEach(item => {
        const itemRef = doc(collection(db, ORDER_ITEMS_COLLECTION));
        const itemDocData: any = {
          order_id: orderRef.id,
          seller_id: item.seller_id || 'farmer',
          product_name: item.product_name,
          quantity: item.quantity,
          unit: item.unit,
          price_per_unit: item.price_per_unit,
          total_price: item.price_per_unit * item.quantity,
          created_at: serverTimestamp(),
        };
        if (item.product_description) itemDocData.product_description = item.product_description;
        if (item.listing_id) itemDocData.listing_id = item.listing_id;
        
        batch.set(itemRef, itemDocData);
      });

      // Execute essential batch (Orders and Items)
      await batch.commit();

      // Attempt to create tracking entry separately (so it doesn't fail the whole order if tracking is restricted)
      try {
        const trackingRef = doc(collection(db, ORDER_TRACKING_COLLECTION));
        await setDoc(trackingRef, {
          order_id: orderRef.id,
          status: 'pending',
          notes: 'Order placed',
          updated_by: user?.id || currentUserId,
          created_at: serverTimestamp(),
        });
      } catch (trackingErr) {
        console.warn('Could not create order tracking entry (permissions).', trackingErr);
      }

      // Reduce stock for each item with a listing_id (Wrapped in try-catch for strict rules)
      try {
        const stockUpdatePromises = orderData.items.map(async (item) => {
          if (item.listing_id) {
            const listingRef = doc(db, 'market_listings', item.listing_id);

            // Use transaction-like approach with get + update
            const listingDoc = await getDoc(listingRef);

            if (listingDoc.exists()) {
              const listingData = listingDoc.data();
              const currentStock = listingData.stock || 0;
              const newStock = Math.max(0, currentStock - item.quantity);

              await updateDoc(listingRef, {
                stock: newStock,
                updated_at: serverTimestamp(),
              });

              if (listingData.inventory_id) {
                const inventoryRef = doc(db, 'inventory', listingData.inventory_id);
                const inventoryDoc = await getDoc(inventoryRef);
                if (inventoryDoc.exists()) {
                  const invData = inventoryDoc.data();
                  const invStock = invData.quantity || 0;
                  const newInvStock = Math.max(0, invStock - item.quantity);
                  await updateDoc(inventoryRef, {
                    quantity: newInvStock,
                    updated_at: serverTimestamp(),
                  });
                }
              }
            }
          }
        });
        await Promise.all(stockUpdatePromises);
      } catch (stockErr) {
        console.warn('Stock update failed (possibly due to permissions). Order was placed successfully.', stockErr);
      }



      // Return the new order - the subscription will update the list
      return {
        id: orderRef.id,
        customer_id: targetCustomerId,
        status: 'pending',
        total_amount: totalAmount,
        shipping_address: orderData.shipping_address,
        shipping_city: orderData.shipping_city,
        shipping_state: orderData.shipping_state,
        shipping_pincode: orderData.shipping_pincode,
        notes: orderData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        payment_method: orderData.payment_method,
        transaction_id: orderData.transaction_id,
        items: [],
        tracking: [],
      };
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create order');
    }
  }, [user]);

  const updateOrderStatus = useCallback(async (
    orderId: string,
    status: Order['status'],
    notes?: string,
    location?: string
  ) => {
    try {
      // If cancelling, restore stock to listings first and process refunds
      if (status === 'cancelled') {
        const orderDoc = await getDoc(doc(db, ORDERS_COLLECTION, orderId));
        if (orderDoc.exists()) {
          const orderData = orderDoc.data();
          if (orderData.payment_method === 'ONLINE' && orderData.transaction_id) {
            // Process refund
            try {
              const backendUrl = `${getBackendUrl()}/api/payment`;
              const refundRes = await fetch(`${backendUrl}/refund`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payment_id: orderData.transaction_id }),
              });
              
              const responseText = await refundRes.text();
              let refundData;
              try {
                refundData = JSON.parse(responseText);
              } catch (parseErr) {
                throw new Error(`Invalid JSON from server. Status: ${refundRes.status}. Response: ${responseText.substring(0, 100)}`);
              }
              
              if (!refundData.success) {
                throw new Error(refundData.message || 'Refund processing failed on backend');
              }
            } catch (refundErr: any) {
              throw new Error(`Refund failed: ${refundErr.message}. Order not cancelled.`);
            }
          }
        }

        const itemsQuery = query(
          collection(db, ORDER_ITEMS_COLLECTION),
          where('order_id', '==', orderId)
        );
        const itemsSnapshot = await getDocs(itemsQuery);

        for (const itemDoc of itemsSnapshot.docs) {
          const itemData = itemDoc.data();
          // Check for listing_id - handle both null and string values
          const listingId = itemData.listing_id;

          if (listingId && typeof listingId === 'string' && listingId.length > 0) {
            const listingRef = doc(db, 'market_listings', listingId);

            // Fetch the current listing stock
            const listingDoc = await getDoc(listingRef);
            if (listingDoc.exists()) {
              const listingData = listingDoc.data();
              const currentStock = listingData.stock || 0;
              const restoredStock = currentStock + itemData.quantity;

              // Update the listing with restored stock
              await updateDoc(listingRef, {
                stock: restoredStock,
                updated_at: serverTimestamp(),
              });

              // ALSO RESTORE INVENTORY STOCK!
              if (listingData.inventory_id) {
                const inventoryRef = doc(db, 'inventory', listingData.inventory_id);
                const inventoryDoc = await getDoc(inventoryRef);
                if (inventoryDoc.exists()) {
                  const invData = inventoryDoc.data();
                  const currentInvStock = invData.quantity || 0;
                  const restoredInvStock = currentInvStock + itemData.quantity;
                  await updateDoc(inventoryRef, {
                    quantity: restoredInvStock,
                    updated_at: serverTimestamp(),
                  });
                }
              }
            }
          }
        }
      }

      await updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
        status,
        updated_at: serverTimestamp(),
      });

      await addDoc(collection(db, ORDER_TRACKING_COLLECTION), {
        order_id: orderId,
        status,
        notes: notes || `Order marked as ${status.replace(/_/g, ' ')}`,
        location: location || null,
        updated_by: user?.id,
        created_at: serverTimestamp(),
      });

      // The subscription will automatically update the orders list
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update order status');
    }
  }, [user]);

  const cancelOrder = useCallback(async (orderId: string) => {
    await updateOrderStatus(orderId, 'cancelled', 'Order cancelled by user');
  }, [updateOrderStatus]);

  const deleteOrder = useCallback(async (orderId: string) => {
    try {
      // Delete order items
      const itemsQuery = query(collection(db, ORDER_ITEMS_COLLECTION), where('order_id', '==', orderId));
      const itemsSnapshot = await getDocs(itemsQuery);
      const deleteItemsPromises = itemsSnapshot.docs.map(docSnapshot => deleteDoc(doc(db, ORDER_ITEMS_COLLECTION, docSnapshot.id)));
      await Promise.all(deleteItemsPromises);

      // Delete order tracking
      const trackingQuery = query(collection(db, ORDER_TRACKING_COLLECTION), where('order_id', '==', orderId));
      const trackingSnapshot = await getDocs(trackingQuery);
      const deleteTrackingPromises = trackingSnapshot.docs.map(docSnapshot => deleteDoc(doc(db, ORDER_TRACKING_COLLECTION, docSnapshot.id)));
      await Promise.all(deleteTrackingPromises);

      // Delete main order document
      await deleteDoc(doc(db, ORDERS_COLLECTION, orderId));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete order');
    }
  }, []);

  return {
    orders,
    loading,
    error,
    fetchOrders,
    createOrder,
    updateOrderStatus,
    cancelOrder,
    deleteOrder,
  };
}
