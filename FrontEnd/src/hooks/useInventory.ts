import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import useAppStore from '../store/useAppStore';
import { FALLBACK_MARKET_LISTINGS } from '../utils/fallbackMarket';
import { getProduceImageUrl } from '../utils/produceImages';

interface InventoryItem {
  id: string;
  farmer_id: string;
  name: string;
  description: string | null;
  category: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  currency: string;
  is_listed: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

interface MarketListing {
  id: string;
  inventory_id: string | null;
  farmer_id: string;
  title: string;
  description: string | null;
  category: string;
  price: number;
  currency: string;
  unit: string;
  stock: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  farmer_name?: string;
  farmer_rating?: number;
  farmer_location?: string;
}

interface CreateInventoryData {
  name: string;
  description?: string;
  category: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  image_url?: string | null;
}

const INVENTORY_COLLECTION = 'inventory';
const MARKET_LISTINGS_COLLECTION = 'market_listings';
const USERS_COLLECTION = 'users';

function useInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useAppStore((state) => state.user);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const adminSelectedFarmerId = useAppStore((state) => state.adminSelectedFarmerId);

  // Fetch farmer's inventory with real-time updates
  const fetchInventory = useCallback(() => {
    if (!user || !isAuthenticated || (user.role !== 'farmer' && user.role !== 'admin')) {
      setInventory([]);
      setLoading(false);
      return () => {};
    }

    setInventory([]);
    setLoading(true);
    setError(null);

    let disposed = false;
    let unsubscribe = () => {};
    const isCurrentSession = () => !disposed && auth.currentUser?.uid === user.id &&
      useAppStore.getState().user?.id === user.id;
    const inventoryQuery = user.role === 'admin' && !adminSelectedFarmerId
      ? query(collection(db, INVENTORY_COLLECTION), orderBy('created_at', 'desc'))
      : query(collection(db, INVENTORY_COLLECTION), where('farmer_id', '==', user.role === 'admin' ? adminSelectedFarmerId : user.id), orderBy('created_at', 'desc'));

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribe();
      if (disposed) return;
      if (firebaseUser?.uid !== user.id) {
        setInventory([]);
        setLoading(false);
        return;
      }
      unsubscribe = onSnapshot(
        inventoryQuery,
        (snapshot) => {
          if (!isCurrentSession()) return;
          const items: InventoryItem[] = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              farmer_id: data.farmer_id,
              name: data.name,
              description: data.description || null,
              category: data.category,
              quantity: data.quantity,
              unit: data.unit,
              price_per_unit: data.price_per_unit,
              currency: data.currency || '₹',
              is_listed: data.is_listed || false,
              image_url: data.image_url || null,
              created_at: data.created_at instanceof Timestamp ? data.created_at.toDate().toISOString() : new Date().toISOString(),
              updated_at: data.updated_at instanceof Timestamp ? data.updated_at.toDate().toISOString() : new Date().toISOString(),
            };
          });
          setError(null);
          setInventory(items);
          setLoading(false);
        },
        (err) => {
          if (!isCurrentSession()) return;
          if (err.code === 'permission-denied') setInventory([]);
          setError(err.code === 'permission-denied' ? 'Your account does not have permission to view this inventory.' : err.message);
          setLoading(false);
        }
      );

    });
    return () => {
      disposed = true;
      unsubscribe();
      unsubscribeAuth();
    };
  }, [user?.id, user?.role, isAuthenticated, adminSelectedFarmerId]);

  // Fetch all active market listings with real-time updates
  const subscribeToMarketListings = useCallback(() => {
    setLoading(true);
    setError(null);

    const listingsQuery = query(
      collection(db, MARKET_LISTINGS_COLLECTION),
      where('is_active', '==', true),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(
      listingsQuery,
      async (snapshot) => {
        const listingsData: MarketListing[] = [];

        // Get farmer profiles
        const farmerIds = [...new Set(snapshot.docs.map((d) => d.data().farmer_id))];
        const farmerProfiles: Record<string, { name: string; rating: number; location: string }> = {};

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          listingsData.push({
            id: doc.id,
            inventory_id: data.inventory_id || null,
            farmer_id: data.farmer_id,
            title: data.title,
            description: data.description || null,
            category: data.category,
            price: data.price,
            currency: data.currency || '₹',
            unit: data.unit,
            stock: data.stock,
            image_url: data.image_url || null,
            is_active: data.is_active,
            created_at: data.created_at instanceof Timestamp ? data.created_at.toDate().toISOString() : new Date().toISOString(),
            updated_at: data.updated_at instanceof Timestamp ? data.updated_at.toDate().toISOString() : new Date().toISOString(),
            farmer_name: data.farmer_name || farmerProfiles[data.farmer_id]?.name || 'Unknown Farm',
            farmer_rating: data.farmer_rating || farmerProfiles[data.farmer_id]?.rating || 4.5,
            farmer_location: data.farmer_location || farmerProfiles[data.farmer_id]?.location || 'Unknown',
          });
        });

        if (listingsData.length === 0) {
          setListings(FALLBACK_MARKET_LISTINGS as any);
        } else {
          setListings(listingsData);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching market listings:', err);
        setListings(FALLBACK_MARKET_LISTINGS as any);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // Fetch market listings once (for backward compatibility)
  const fetchMarketListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const listingsQuery = query(
        collection(db, MARKET_LISTINGS_COLLECTION),
        where('is_active', '==', true),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(listingsQuery);
      const listingsData: MarketListing[] = [];

      // Get farmer profiles
      const farmerIds = [...new Set(snapshot.docs.map((d) => d.data().farmer_id))];
      const farmerProfiles: Record<string, { name: string; rating: number; location: string }> = {};

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        listingsData.push({
          id: doc.id,
          inventory_id: data.inventory_id || null,
          farmer_id: data.farmer_id,
          title: data.title,
          description: data.description || null,
          category: data.category,
          price: data.price,
          currency: data.currency || '₹',
          unit: data.unit,
          stock: data.stock,
          image_url: data.image_url || null,
          is_active: data.is_active,
          created_at: data.created_at instanceof Timestamp ? data.created_at.toDate().toISOString() : new Date().toISOString(),
          updated_at: data.updated_at instanceof Timestamp ? data.updated_at.toDate().toISOString() : new Date().toISOString(),
          farmer_name: data.farmer_name || farmerProfiles[data.farmer_id]?.name || 'Unknown Farm',
          farmer_rating: data.farmer_rating || farmerProfiles[data.farmer_id]?.rating || 4.5,
          farmer_location: data.farmer_location || farmerProfiles[data.farmer_id]?.location || 'Unknown',
        });
      });

      if (listingsData.length === 0) {
        setListings(FALLBACK_MARKET_LISTINGS as any);
      } else {
        setListings(listingsData);
      }
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching market listings:', err);
      setListings(FALLBACK_MARKET_LISTINGS as any);
      setLoading(false);
    }
  }, []);

  // Add new inventory item
  const addInventoryItem = useCallback(async (itemData: CreateInventoryData): Promise<InventoryItem> => {
    if (!user) throw new Error('Not authenticated');

    const targetFarmerId = (user.role === 'admin' && adminSelectedFarmerId) ? adminSelectedFarmerId : user.id;
    const finalImageUrl = itemData.image_url || getProduceImageUrl(itemData.name, itemData.category);

    const docRef = await addDoc(collection(db, INVENTORY_COLLECTION), {
      farmer_id: targetFarmerId,
      name: itemData.name,
      description: itemData.description || null,
      category: itemData.category,
      quantity: itemData.quantity,
      unit: itemData.unit,
      price_per_unit: itemData.price_per_unit,
      currency: 'INR',
      is_listed: false,
      image_url: finalImageUrl,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    return {
      id: docRef.id,
      farmer_id: targetFarmerId,
      name: itemData.name,
      description: itemData.description || null,
      category: itemData.category,
      quantity: itemData.quantity,
      unit: itemData.unit,
      price_per_unit: itemData.price_per_unit,
      currency: 'INR',
      is_listed: false,
      image_url: finalImageUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }, [user, adminSelectedFarmerId]);

  // Update inventory item
  const updateInventoryItem = useCallback(async (
    itemId: string,
    updates: Partial<InventoryItem>
  ): Promise<void> => {
    if (!user) throw new Error('Not authenticated');

    const targetFarmerId = (user.role === 'admin' && adminSelectedFarmerId) ? adminSelectedFarmerId : user.id;

    await updateDoc(doc(db, INVENTORY_COLLECTION, itemId), {
      ...updates,
      updated_at: serverTimestamp(),
    });

    // Sync updates to active market listings
    if (updates.quantity !== undefined || updates.price_per_unit !== undefined || updates.name !== undefined || updates.category !== undefined || updates.unit !== undefined || updates.description !== undefined || updates.image_url !== undefined) {
      try {
        // Avoid composite index issues by querying by farmer_id and filtering in memory
        const listingsQuery = query(
          collection(db, MARKET_LISTINGS_COLLECTION),
          where('farmer_id', '==', targetFarmerId)
        );
        const snapshot = await getDocs(listingsQuery);
        
        // Find the matching active listing (fallback to title if inventory_id is missing on older items)
        const activeListings = snapshot.docs.filter((d) => {
          const data = d.data();
          return data.is_active === true && (data.inventory_id === itemId || data.title === updates.name);
        });

        const marketUpdates: any = {};
        if (updates.quantity !== undefined) marketUpdates.stock = updates.quantity;
        if (updates.price_per_unit !== undefined) marketUpdates.price = updates.price_per_unit;
        if (updates.name !== undefined) marketUpdates.title = updates.name;
        if (updates.category !== undefined) marketUpdates.category = updates.category;
        if (updates.unit !== undefined) marketUpdates.unit = `per ${updates.unit}`;
        if (updates.description !== undefined) marketUpdates.description = updates.description;
        if (updates.image_url !== undefined) marketUpdates.image_url = updates.image_url;

        if (Object.keys(marketUpdates).length > 0) {
          const updatePromises = activeListings.map((listingDoc) =>
            updateDoc(doc(db, MARKET_LISTINGS_COLLECTION, listingDoc.id), {
              ...marketUpdates,
              updated_at: serverTimestamp(),
            })
          );
          await Promise.all(updatePromises);
        }
      } catch (err) {
        console.warn('Could not sync updates to market listings:', err);
      }
    }
  }, [user, adminSelectedFarmerId]);

  // Delete inventory item and associated market listings
  const deleteInventoryItem = useCallback(async (itemId: string): Promise<void> => {
    if (!user) throw new Error('Not authenticated');

    // Find and deactivate any active market listings for this inventory item
    try {
      const listingsQuery = query(
        collection(db, MARKET_LISTINGS_COLLECTION),
        where('inventory_id', '==', itemId),
        where('is_active', '==', true)
      );
      const snapshot = await getDocs(listingsQuery);

      // Set all active listings as inactive
      const updatePromises = snapshot.docs.map((listingDoc) =>
        updateDoc(doc(db, MARKET_LISTINGS_COLLECTION, listingDoc.id), {
          is_active: false,
          updated_at: serverTimestamp(),
        })
      );
      await Promise.all(updatePromises);
    } catch (err) {
      console.warn('Could not update associated listings:', err);
    }

    // Delete the inventory item
    await deleteDoc(doc(db, INVENTORY_COLLECTION, itemId));
  }, [user, adminSelectedFarmerId]);

  // List item to market
  const listItemToMarket = useCallback(async (inventoryItem: InventoryItem): Promise<MarketListing> => {
    if (!user) throw new Error('Not authenticated');

    const targetFarmerId = inventoryItem.farmer_id;
    // We should ideally fetch the farmer's actual name/location if admin is doing this, 
    // but for now we fallback to 'Unknown Farm' if it's admin, or their profile if it's the farmer.
    const farmerName = user.role === 'admin' ? 'Unknown Farm' : (user.farm_name || user.name || 'Unknown Farm');
    const farmerLocation = user.role === 'admin' ? 'Unknown' : (user.farm_location || 'Unknown');
    const listingImageUrl = inventoryItem.image_url || getProduceImageUrl(inventoryItem.name, inventoryItem.category);

    // Create market listing
    const listingRef = await addDoc(collection(db, MARKET_LISTINGS_COLLECTION), {
      inventory_id: inventoryItem.id,
      farmer_id: targetFarmerId,
      title: inventoryItem.name,
      description: inventoryItem.description,
      category: inventoryItem.category,
      price: inventoryItem.price_per_unit,
      currency: 'INR',
      unit: `per ${inventoryItem.unit}`,
      stock: inventoryItem.quantity,
      image_url: listingImageUrl,
      is_active: true,
      farmer_name: farmerName,
      farmer_location: farmerLocation,
      farmer_rating: 4.5,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    // Update inventory item as listed
    await updateInventoryItem(inventoryItem.id, { is_listed: true });

    return {
      id: listingRef.id,
      inventory_id: inventoryItem.id,
      farmer_id: targetFarmerId,
      title: inventoryItem.name,
      description: inventoryItem.description,
      category: inventoryItem.category,
      price: inventoryItem.price_per_unit,
      currency: 'INR',
      unit: `per ${inventoryItem.unit}`,
      stock: inventoryItem.quantity,
      image_url: listingImageUrl,
      is_active: true,
      farmer_name: farmerName,
      farmer_location: farmerLocation,
      farmer_rating: 4.5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }, [user, updateInventoryItem]);

  // Unlist item from market
  const unlistItemFromMarket = useCallback(async (listingId: string, inventoryId: string): Promise<void> => {
    if (!user) throw new Error('Not authenticated');

    // Set listing as inactive
    await updateDoc(doc(db, MARKET_LISTINGS_COLLECTION, listingId), {
      is_active: false,
      updated_at: serverTimestamp(),
    });

    // Update inventory item as not listed
    await updateInventoryItem(inventoryId, { is_listed: false });
  }, [user, updateInventoryItem]);

  // Update market listing stock
  const updateMarketListingStock = useCallback(async (
    listingId: string,
    newStock: number
  ): Promise<void> => {
    await updateDoc(doc(db, MARKET_LISTINGS_COLLECTION, listingId), {
      stock: newStock,
      updated_at: serverTimestamp(),
    });
  }, []);

  // (Subscriptions are now managed directly by UI components)

  return {
    inventory,
    listings,
    loading,
    error,
    fetchInventory,
    fetchMarketListings,
    subscribeToMarketListings,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    listItemToMarket,
    unlistItemFromMarket,
    updateMarketListingStock,
  };
}


export default useInventory