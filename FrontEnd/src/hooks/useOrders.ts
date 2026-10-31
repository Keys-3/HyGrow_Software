import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import useAppStore from '../store/useAppStore';
import api from '../services/api';

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


const iso = (value: any) => value?.toDate?.()?.toISOString?.() || value || '';

export default function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const user = useAppStore(state => state.user);
  const selectedCustomer = useAppStore(state => state.adminSelectedCustomerId);

  useEffect(() => {
    let active = true;
    let sequence = 0;
    setOrders([]);
    setError(null);
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const filters = user.role === 'admin'
      ? (selectedCustomer ? [where('customer_id', '==', selectedCustomer)] : [])
      : [where(user.role === 'farmer' ? 'seller_ids' : 'customer_id', user.role === 'farmer' ? 'array-contains' : '==', user.id)];
    const unsubscribe = onSnapshot(query(collection(db, 'orders'), ...filters), async snapshot => {
      const request = ++sequence;
      try {
        const data = await Promise.all(snapshot.docs.map(async orderDoc => {
          const order = orderDoc.data();
          const [items, tracking] = await Promise.all(['order_items', 'order_tracking'].map(name =>
            getDocs(query(collection(db, name), where('order_id', '==', orderDoc.id)))));
          return {
            ...order, id: orderDoc.id, created_at: iso(order.created_at), updated_at: iso(order.updated_at),
            items: items.docs.map(d => ({ ...d.data(), id: d.id, created_at: iso(d.data().created_at) })),
            tracking: tracking.docs.map(d => ({ ...d.data(), id: d.id, created_at: iso(d.data().created_at) }))
              .sort((a, b) => b.created_at.localeCompare(a.created_at)),
          } as Order;
        }));
        if (active && request === sequence) {
          setOrders(data.sort((a, b) => b.created_at.localeCompare(a.created_at)));
          setLoading(false);
        }
      } catch (err: any) {
        if (active && request === sequence) { setError(err.message); setLoading(false); }
      }
    }, err => { if (active) { setError(err.message); setLoading(false); } });
    return () => { active = false; unsubscribe(); };
  }, [user?.id, user?.role, selectedCustomer, revision]);

  const fetchOrders = useCallback(async (forceRefresh = false) => { if (forceRefresh) setRevision(v => v + 1); }, []);
  const createOrder = useCallback(async (data: CreateOrderData): Promise<Order> => {
    if (!user) throw new Error('Not authenticated');
    // Prices, seller identity, stock and payment state are authoritative on the server.
    const result = await api.post<unknown, { success: boolean; order: Order }>('/api/orders', {
      items: data.items.map(item => ({ listing_id: item.listing_id, quantity: item.quantity })),
      shipping_address: data.shipping_address, shipping_city: data.shipping_city,
      shipping_state: data.shipping_state, shipping_pincode: data.shipping_pincode,
      notes: data.notes, payment_method: data.payment_method, transaction_id: data.transaction_id,
    });
    return result.order;
  }, [user]);
  const updateOrderStatus = useCallback(async (orderId: string, status: Order['status'], notes?: string, location?: string) => {
    await api.patch(`/api/orders/${encodeURIComponent(orderId)}/status`, { status, notes, location });
  }, []);
  const cancelOrder = useCallback(async (orderId: string) => {
    await updateOrderStatus(orderId, 'cancelled', 'Order cancelled by user');
  }, [updateOrderStatus]);
  const deleteOrder = useCallback(async (_orderId: string) => {
    throw new Error('Order records cannot be deleted. Cancel an eligible order instead.');
  }, []);
  return { orders, loading, error, fetchOrders, createOrder, updateOrderStatus, cancelOrder, deleteOrder };
}
