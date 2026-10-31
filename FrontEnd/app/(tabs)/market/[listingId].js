import { getAuthHeaders } from '../../../src/services/authHeaders';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Image, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Constants from 'expo-constants';

let RazorpayCheckout;
let loadRazorpayScript = () => Promise.resolve(false);

if (Platform.OS !== 'web') {
  try {
    RazorpayCheckout = require('react-native-razorpay').default;
  } catch (e) {
    console.warn("Razorpay not linked yet. Rebuild required.");
  }
} else {
  loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };
}

import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useThemeColors, spacing, borderRadius, typography } from '../../../src/theme/theme';
import { formatDate, getDefaultImage } from '../../../src/utils/helpers';
import useOrders from '../../../src/hooks/useOrders';
import useAppStore from '../../../src/store/useAppStore';
import CustomAlert from '../../../src/components/CustomAlert';
import { getBackendUrl } from '../../../src/utils/apiConfig';

export default function ListingDetailScreen() {
  const { listingId } = useLocalSearchParams();
  const router = useRouter();
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const user = useAppStore((state) => state.user);
  const { createOrder } = useOrders();

  const [isBuyModalVisible, setIsBuyModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [pincode, setPincode] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', buttons: [] });

  useEffect(() => {
    if (user) {
      setAddress(user.address || '');
      setCity(user.city || '');
      setStateVal(user.state || '');
      setPincode(user.pincode || '');
    }
  }, [user, isBuyModalVisible]);

  // Subscribe to listing changes in real-time
  useEffect(() => {
    if (!listingId) return;

    setLoading(true);

    const listingRef = doc(db, 'market_listings', listingId);

    const unsubscribe = onSnapshot(
      listingRef,
      (listingDoc) => {
        if (!listingDoc.exists()) {
          setError('Listing not found');
          setLoading(false);
          return;
        }

        const listingData = listingDoc.data();

        setListing({
          id: listingDoc.id,
          title: listingData.title,
          description: listingData.description,
          price: listingData.price,
          currency: listingData.currency || '₹',
          unit: listingData.unit,
          category: listingData.category,
          stock: listingData.stock,
          createdAt: listingData.created_at?.toDate?.()?.toISOString?.() || new Date().toISOString(),
          seller: {
            name: listingData.farmer_name || 'Unknown Farm',
            rating: listingData.farmer_rating || 4.5,
            location: listingData.farmer_location || 'Unknown',
          },
          farmer_id: listingData.farmer_id,
        });
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to listing:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [listingId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading listing...</Text>
      </View>
    );
  }

  if (error || !listing) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>😕</Text>
        <Text style={styles.errorText}>{error || 'Listing not found'}</Text>
        <Pressable style={styles.errorBackBtn} onPress={() => router.back()}>
          <Text style={styles.errorBackBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const handleContact = () => {
    router.push({
      pathname: '/(tabs)/market/contact',
      params: { 
        listingId: listing.id,
        farmerId: listing.farmer_id,
        listingTitle: listing.title,
        farmerName: listing.seller.name
      }
    });
  };

  const handleInitiateOrder = async () => {
    if (placingOrder) return;
    if (!user) { Alert.alert('Sign in', 'Please sign in before placing an order.'); return; }
    if (!Number.isInteger(buyQuantity) || buyQuantity < 1 || buyQuantity > listing.stock) { Alert.alert('Invalid quantity', 'Choose an available whole quantity.'); return; }
    if (!address.trim() || !city.trim() || !stateVal.trim() || !pincode.trim()) {
      setCustomAlert({
        visible: true,
        title: 'Error',
        message: 'Please fill in all shipping details.',
        buttons: [{ text: 'OK', onPress: () => setCustomAlert(prev => ({ ...prev, visible: false })) }]
      });
      return;
    }

    if (paymentMethod === 'ONLINE') {
      if (Platform.OS !== 'web' && !RazorpayCheckout) {
        setCustomAlert({
           visible: true, title: 'Rebuild Required', message: 'Please rebuild the app (npx expo run:android) to use online payments. Use COD for now.',
           buttons: [{ text: 'OK', onPress: () => setCustomAlert(prev => ({ ...prev, visible: false })) }]
        });
        return;
      }
      
      const amount = (listing.price * buyQuantity).toFixed(2);
      
      try {
        setPlacingOrder(true);
        const backendUrl = `${getBackendUrl()}/api/payment`;

        // 1. Create order on backend
        const orderRes = await fetch(`${backendUrl}/create-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
          body: JSON.stringify({
            listingId: listing.id,
            quantity: buyQuantity
          })
        });
        const orderData = await orderRes.json();
        
        if (!orderData.success) {
          throw new Error(orderData.message || 'Failed to initialize payment gateway.');
        }

        const options = {
          description: `Payment for ${listing.title}`,
          image: imageUrl || 'https://via.placeholder.com/150',
          currency: 'INR',
          key: orderData.keyId,
          amount: orderData.order.amount,
          name: 'HYGROW Marketplace',
          order_id: orderData.order.id,
          theme: { color: themeColors.primary }
        };

        if (Platform.OS === 'web') {
          // 2a. Open Razorpay Gateway (Web)
          const isLoaded = await loadRazorpayScript();
          if (!isLoaded) {
            throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
          }

          options.handler = async function (response) {
            try {
              // 3. Verify signature
              const verifyRes = await fetch(`${backendUrl}/verify`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
                 body: JSON.stringify(response)
              });
              const verifyData = await verifyRes.json();
              
              if (verifyData.success) {
                await handlePlaceOrder(response.razorpay_payment_id);
              } else {
                throw new Error("Payment verification failed. Please contact support with your payment reference if money was deducted.");
              }
            } catch (err) {
              setCustomAlert({
                visible: true, title: 'Verification Failed', message: err.message,
                buttons: [{ text: 'OK', onPress: () => setCustomAlert(prev => ({ ...prev, visible: false })) }]
              });
              setPlacingOrder(false);
            }
          };

          options.modal = {
            ondismiss: function() {
              setPlacingOrder(false);
            }
          };
          
          const rzpWithModal = new window.Razorpay(options);
          rzpWithModal.on('payment.failed', function (response){
            setCustomAlert({
              visible: true, title: 'Payment Failed', message: response.error.description || 'Unknown error',
              buttons: [{ text: 'OK', onPress: () => setCustomAlert(prev => ({ ...prev, visible: false })) }]
            });
            setPlacingOrder(false);
          });
          rzpWithModal.open();

        } else {
          // 2b. Open Razorpay Gateway (Mobile)
          const paymentData = await RazorpayCheckout.open(options);
          
          // 3. Verify signature
          const verifyRes = await fetch(`${backendUrl}/verify`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
             body: JSON.stringify(paymentData)
          });
          const verifyData = await verifyRes.json();
          
          if (verifyData.success) {
            await handlePlaceOrder(paymentData.razorpay_payment_id);
          } else {
            throw new Error("Payment verification failed. Please contact support with your payment reference if money was deducted.");
          }
        }
      } catch (err) {
        console.error("Payment Error:", err);
        const errorMsg = err.description || err.message || 'Payment cancelled or could not connect to gateway.';
        setCustomAlert({
          visible: true, title: 'Payment Failed', message: errorMsg,
          buttons: [{ text: 'OK', onPress: () => setCustomAlert(prev => ({ ...prev, visible: false })) }]
        });
      } finally {
        setPlacingOrder(false);
      }
    } else {
      // COD Flow
      handlePlaceOrder(null);
    }
  };

  const handlePlaceOrder = async (transactionId = null) => {
    try {
      setPlacingOrder(true);

      const orderData = {
        items: [{
          seller_id: listing.farmer_id || '',
          product_name: listing.title,
          product_description: listing.description || '',
          quantity: buyQuantity,
          unit: listing.unit,
          price_per_unit: listing.price,
          listing_id: listing.id, // Important: pass listing_id for stock management
        }],
        shipping_address: address.trim(),
        shipping_city: city.trim(),
        shipping_state: stateVal.trim(),
        shipping_pincode: pincode.trim(),
        notes: "Placed via Marketplace Buy Now",
        payment_method: paymentMethod,
        transaction_id: transactionId,
      };

      // Create order (stock is updated inside createOrder)
      const newOrder = await createOrder(orderData);

      setCustomAlert({
        visible: true,
        title: 'Success',
        message: 'Your order has been placed successfully!',
        buttons: [{
          text: 'OK',
          onPress: () => {
            setCustomAlert(prev => ({ ...prev, visible: false }));
            setIsBuyModalVisible(false);
            router.push('/(tabs)/orders');
          }
        }]
      });
    } catch (err) {
      console.error('Order creation failed:', err);
      setCustomAlert({
        visible: true,
        title: 'Error',
        message: err.message || 'Failed to place order. Please try again.',
        buttons: [{ text: 'OK', onPress: () => setCustomAlert(prev => ({ ...prev, visible: false })) }]
      });
    } finally {
      setPlacingOrder(false);
    }
  };

  const imageUrl = listing.imageUrl || listing.image_url || getDefaultImage(listing.category, listing.title);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Image source={{ uri: imageUrl }} style={styles.image} />

      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{listing.category}</Text>
        </View>
        <Text style={styles.title}>{listing.title}</Text>
        <Text style={styles.price}>
          {listing.currency}
          {listing.price} <Text style={styles.unit}>{listing.unit}</Text>
        </Text>
      </View>

      <View style={styles.sellerCard}>
        <View style={styles.sellerHeader}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {listing.seller.name.charAt(0)}
            </Text>
          </View>
          <View style={styles.sellerInfo}>
            <Text style={styles.sellerName}>{listing.seller.name}</Text>
            <Text style={styles.sellerLocation}>
              📍 {listing.seller.location}
            </Text>
          </View>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>⭐ {listing.seller.rating}</Text>
          </View>
        </View>
      </View>

      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>
          {listing.description || 'No description available.'}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Available Stock:</Text>
          <Text style={styles.metaValue}>
            {listing.stock} {listing.unit.replace('per ', '')}s
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Listed On:</Text>
          <Text style={styles.metaValue}>
            {formatDate(listing.createdAt)}
          </Text>
        </View>
      </View>

      {/* Button Row / Actions */}
      {user?.role === 'customer' || user?.role === 'admin' ? (
        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [
              styles.contactBtnHalf,
              pressed && styles.pressed,
            ]}
            onPress={handleContact}
          >
            <Text style={styles.contactBtnHalfText}>Contact Seller</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              listing.stock > 0 ? styles.buyBtn : styles.disabledBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              if (listing.stock > 0) {
                setIsBuyModalVisible(true);
                setPaymentMethod('COD');
              }
            }}
            disabled={listing.stock <= 0}
          >
            <Text style={styles.buyBtnText}>
              {listing.stock > 0 ? 'Buy Now' : 'Out of Stock'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.contactBtn,
            pressed && styles.pressed,
          ]}
          onPress={handleContact}
        >
          <Text style={styles.contactBtnText}>Contact Seller</Text>
        </Pressable>
      )}

      {/* Checkout Modal */}
      <Modal
        visible={isBuyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsBuyModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <ScrollView 
            style={styles.modalContainer}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.modalTitle}>Checkout produce</Text>
            
            <View style={styles.modalItemDetails}>
              <Text style={styles.modalItemTitle}>{listing.title}</Text>
              <Text style={styles.modalItemSub}>Price: {listing.currency}{listing.price} {listing.unit}</Text>
              <Text style={styles.modalItemSub}>Available Stock: {listing.stock} {listing.unit.replace('per ', '')}s</Text>
            </View>

            {/* Quantity Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Select Quantity</Text>
              <View style={styles.qtyContainer}>
                <Pressable 
                  style={styles.qtyBtn} 
                  onPress={() => setBuyQuantity(q => Math.max(1, q - 1))}
                >
                  <Text style={styles.qtyBtnText}>-</Text>
                </Pressable>
                <Text style={styles.qtyText}>{buyQuantity}</Text>
                <Pressable 
                  style={styles.qtyBtn} 
                  onPress={() => setBuyQuantity(q => Math.min(listing.stock, q + 1))}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </Pressable>
              </View>
            </View>

            {/* Shipping details */}
            <Text style={styles.modalSectionTitle}>Shipping Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Street address, apartment, sector..."
                placeholderTextColor={themeColors.textMuted}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>City *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. New Delhi"
                placeholderTextColor={themeColors.textMuted}
                value={city}
                onChangeText={setCity}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.inputLabel}>State *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Delhi"
                  placeholderTextColor={themeColors.textMuted}
                  value={stateVal}
                  onChangeText={setStateVal}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Pincode *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 110001"
                  placeholderTextColor={themeColors.textMuted}
                  value={pincode}
                  onChangeText={setPincode}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Payment Method */}
            <Text style={styles.modalSectionTitle}>Payment Method</Text>
            
            <View style={styles.paymentMethodContainer}>
              <Pressable
                style={[styles.paymentOption, paymentMethod === 'COD' && styles.paymentOptionActive]}
                onPress={() => setPaymentMethod('COD')}
              >
                <Text style={styles.paymentOptionEmoji}>💵</Text>
                <Text style={[styles.paymentOptionText, paymentMethod === 'COD' && styles.paymentOptionTextActive]}>Cash on Delivery</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.paymentOption, 
                  paymentMethod === 'ONLINE' && styles.paymentOptionActive,
                ]}
                onPress={() => setPaymentMethod('ONLINE')}
              >
                <Text style={styles.paymentOptionEmoji}>💳</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paymentOptionText, paymentMethod === 'ONLINE' && styles.paymentOptionTextActive]}>Pay Online (Razorpay)</Text>
                  <Text style={styles.upiInfoText}>Secure online payment via credit/debit card, net banking, or UPI</Text>
                </View>
              </Pressable>
            </View>

            {/* Order Summary */}
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items total:</Text>
                <Text style={styles.summaryValue}>{listing.currency}{(listing.price * buyQuantity).toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery charges:</Text>
                <Text style={[styles.summaryValue, { color: themeColors.success }]}>FREE</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Order Total:</Text>
                <Text style={styles.summaryTotalValue}>{listing.currency}{(listing.price * buyQuantity).toFixed(2)}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <Pressable 
                style={({ pressed }) => [styles.modalCancelBtn, pressed && styles.pressed]}
                onPress={() => setIsBuyModalVisible(false)}
                disabled={placingOrder}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable 
                style={({ pressed }) => [styles.modalConfirmBtn, pressed && styles.pressed]}
                onPress={handleInitiateOrder}
                disabled={placingOrder}
              >
                {placingOrder ? (
                  <ActivityIndicator color={themeColors.background} size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Place Order</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>



      <CustomAlert 
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        buttons={customAlert.buttons}
        onDismiss={() => setCustomAlert(prev => ({ ...prev, visible: false }))}
      />

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  errorBackBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  errorBackBtnText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: 60,
  },
  backBtn: {
    marginBottom: spacing.md,
  },
  backText: {
    color: colors.primary,
    ...typography.body,
    fontWeight: '600',
  },
  image: {
    height: 250,
    width: '100%',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    resizeMode: 'cover',
  },
  header: {
    marginBottom: spacing.lg,
  },
  badge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  badgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
    color: colors.text,
  },
  price: {
    ...typography.h2,
    color: colors.primary,
  },
  unit: {
    ...typography.body,
    color: colors.textSecondary,
  },
  sellerCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 2,
    color: colors.text,
  },
  sellerLocation: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  ratingBadge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  ratingText: {
    ...typography.caption,
    fontWeight: '600',
  },
  detailsSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h2,
    marginBottom: spacing.md,
    color: colors.text,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metaLabel: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  metaValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  contactBtn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  contactBtnText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.background,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  contactBtnHalf: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  contactBtnHalfText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  buyBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  buyBtnText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.background,
  },
  disabledBtn: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  centerOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  modalContent: {
    padding: spacing.lg,
    paddingBottom: 50,
  },
  modalTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  modalItemDetails: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalItemTitle: {
    ...typography.h3,
    marginBottom: 4,
    color: colors.text,
  },
  modalItemSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalSectionTitle: {
    ...typography.h3,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  qtyBtn: {
    backgroundColor: colors.surfaceLight,
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  qtyText: {
    ...typography.h3,
    color: colors.text,
    marginHorizontal: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
    color: colors.text,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
  },
  summaryContainer: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentMethodContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  paymentOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  paymentOptionDisabled: {
    opacity: 0.5,
  },
  paymentOptionEmoji: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  paymentOptionText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  paymentOptionTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  upiInfoText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summaryTitle: {
    ...typography.body,
    fontWeight: '700',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  summaryLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
  },
  summaryTotalLabel: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  summaryTotalValue: {
    ...typography.h3,
    color: colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelBtnText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    ...typography.body,
    fontWeight: '600',
    color: '#ffffff',
  },
  utrModalContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
  },
  utrInstructions: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
});
