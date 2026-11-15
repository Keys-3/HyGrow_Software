import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Receipt,
  Search,
  Lock,
  ShoppingBag,
  CreditCard,
  Smartphone,
  Banknote,
  Clock,
  User,
  Store,
  ChevronRight,
  PackageCheck,
  X,
  AlertCircle,
  Sparkles,
  Truck,
} from 'lucide-react-native';

import useOrders from '../../../src/hooks/useOrders';
import useAdminUsers from '../../../src/hooks/useAdminUsers';
import useAppStore from '../../../src/store/useAppStore';
import { useThemeColors, spacing, borderRadius, typography } from '../../../src/theme/theme';
import { formatDate, formatTime, getDefaultImage } from '../../../src/utils/helpers';
import PressableScale from '../../../src/components/PressableScale';
import StatusBadge from '../../../src/components/StatusBadge';

const getStatusBadgeType = (status) => {
  switch (status) {
    case 'delivered':
      return 'success';
    case 'confirmed':
    case 'processing':
    case 'shipped':
      return 'info';
    case 'pending':
      return 'warning';
    case 'cancelled':
      return 'danger';
    default:
      return 'neutral';
  }
};

function OrderCard({ order, onPress }) {
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const itemCount = order.items?.length || 0;
  const totalItems = order.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;
  const statusType = getStatusBadgeType(order.status);

  const renderPaymentBadge = () => {
    if (order.payment_method === 'ONLINE') {
      return (
        <View style={styles.paymentBadge}>
          <CreditCard size={12} color={themeColors.primary} />
          <Text style={styles.paymentText}>Razorpay ({order.transaction_id ? 'Captured' : 'Online'})</Text>
        </View>
      );
    }
    if (order.payment_method === 'UPI') {
      return (
        <View style={styles.paymentBadge}>
          <Smartphone size={12} color={themeColors.primary} />
          <Text style={styles.paymentText}>UPI {order.transaction_id ? `· ${order.transaction_id.slice(-6)}` : 'Pending'}</Text>
        </View>
      );
    }
    return (
      <View style={styles.paymentBadge}>
        <Banknote size={12} color={themeColors.textSecondary} />
        <Text style={styles.paymentText}>Cash on Delivery</Text>
      </View>
    );
  };

  return (
    <PressableScale style={styles.cardWrap} onPress={onPress}>
      <View style={styles.card}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.orderIdGroup}>
            <View style={styles.orderPill}>
              <Text style={styles.orderIdText}>#{order.id.slice(0, 8).toUpperCase()}</Text>
            </View>
            <View style={styles.dateRow}>
              <Clock size={11} color={themeColors.textMuted} />
              <Text style={styles.orderDate}>
                {formatDate(order.created_at)} at {formatTime(order.created_at)}
              </Text>
            </View>
          </View>

          <StatusBadge
            label={(order.status || 'pending').toUpperCase()}
            status={statusType}
            size="sm"
          />
        </View>

        {/* Buyer & Seller info if present */}
        {(order.buyer_name || order.seller_name) && (
          <View style={styles.partiesRow}>
            {order.buyer_name && (
              <View style={styles.partyItem}>
                <User size={12} color={themeColors.textMuted} />
                <Text style={styles.partyLabel}>Buyer:</Text>
                <Text style={styles.partyName} numberOfLines={1}>{order.buyer_name}</Text>
              </View>
            )}
            {order.seller_name && (
              <View style={styles.partyItem}>
                <Store size={12} color={themeColors.textMuted} />
                <Text style={styles.partyLabel}>Seller:</Text>
                <Text style={styles.partyName} numberOfLines={1}>{order.seller_name}</Text>
              </View>
            )}
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Card Body - Items */}
        <View style={styles.cardBody}>
          <View style={styles.itemsSummaryRow}>
            <PackageCheck size={14} color={themeColors.primary} />
            <Text style={styles.itemsSummaryText}>
              {itemCount} distinct item{itemCount !== 1 ? 's' : ''} ({totalItems} total quantity)
            </Text>
          </View>

          {order.items?.slice(0, 3).map((item, i) => {
            const itemImg = item.image_url || getDefaultImage(item.category || '', item.product_name);
            return (
              <View key={i} style={styles.itemRow}>
                <Image source={{ uri: itemImg }} style={styles.itemThumb} resizeMode="cover" />
                <View style={styles.itemInfoWrap}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.product_name}
                  </Text>
                  <Text style={styles.itemQty}>Qty: {item.quantity} {item.unit ? `· ${item.unit}` : ''}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  ₹{(item.total_price || (item.price_per_unit * item.quantity) || 0).toFixed(2)}
                </Text>
              </View>
            );
          })}

          {itemCount > 3 && (
            <Text style={styles.moreItems}>
              +{itemCount - 3} more item{itemCount - 3 !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Text style={styles.paymentMethodLabel}>Payment</Text>
            {renderPaymentBadge()}
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>₹{order.total_amount?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const { orders, loading, error, fetchOrders } = useOrders();
  const { users: adminUsers } = useAdminUsers();
  const user = useAppStore((state) => state.user);
  const adminSelectedFarmerId = useAppStore((state) => state.adminSelectedFarmerId);
  const adminSelectedCustomerId = useAppStore((state) => state.adminSelectedCustomerId);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const navigateToDetail = (orderId) => {
    router.push(`/(tabs)/orders/${orderId}`);
  };

  const STATUS_TABS = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
  ];

  const filteredOrders = useMemo(() => {
    let items = orders;

    // Search filter
    if (search.trim()) {
      const searchTerm = search.toLowerCase();
      items = items.filter((o) => {
        const orderIdMatch = (o.id || '').toLowerCase().includes(searchTerm);
        const buyerNameMatch = (o.buyer_name || '').toLowerCase().includes(searchTerm);
        const sellerNameMatch = (o.seller_name || '').toLowerCase().includes(searchTerm);
        return orderIdMatch || buyerNameMatch || sellerNameMatch;
      });
    }

    // Status filter
    if (selectedStatus !== 'all') {
      items = items.filter((o) => (o.status || 'pending').toLowerCase() === selectedStatus);
    }

    if (user?.role === 'admin') {
      if (adminSelectedFarmerId) {
        items = items.filter(
          (o) =>
            o.seller_id === adminSelectedFarmerId ||
            (o.items && o.items.some((i) => i.seller_id === adminSelectedFarmerId))
        );
      }
      if (adminSelectedCustomerId) {
        items = items.filter((o) => o.customer_id === adminSelectedCustomerId);
      }
    }

    if (user?.role === 'admin') {
      return items.map((o) => {
        const sellerId =
          o.seller_id || (o.items && o.items.length > 0 ? o.items[0].seller_id : null);
        const buyer = adminUsers.find((u) => u.id === o.customer_id);
        const seller = adminUsers.find((u) => u.id === sellerId);
        return {
          ...o,
          buyer_name: buyer ? buyer.farm_name || buyer.name : 'Unknown Buyer',
          seller_name: seller ? seller.farm_name || seller.name : 'Unknown Seller',
        };
      });
    }

    return items;
  }, [orders, user, adminSelectedFarmerId, adminSelectedCustomerId, adminUsers, search, selectedStatus]);

  if (!user) {
    return (
      <View style={styles.restrictedContainer}>
        <View style={styles.restrictedIconCircle}>
          <Lock size={32} color={themeColors.warning} />
        </View>
        <Text style={styles.emptyTitle}>Sign in to view orders</Text>
        <Text style={styles.emptySubtitle}>
          Log into your verified HyGrow account to manage live orders, view dispatch receipts, and track shipments.
        </Text>
        <PressableScale style={styles.shopBtn} onPress={() => router.push('/(auth)')}>
          <Text style={styles.shopBtnText}>Sign In</Text>
        </PressableScale>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerBadge}>
                <Receipt size={12} color="#10B981" />
                <Text style={styles.headerBadgeText}>COMMERCE & DISPATCH</Text>
              </View>
              <Text style={styles.title}>
                {user?.role === 'admin' ? 'All System ' : 'My '}
                <Text style={{ color: themeColors.primary }}>Orders</Text>
              </Text>
              <Text style={styles.subtitle}>
                Track live fulfillment pipelines, payment settlements, and delivery tracking.
              </Text>
            </View>

            {/* Visual Hero Feature Banner */}
            <View style={styles.heroBanner}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80' }}
                style={styles.heroBannerImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['rgba(6, 15, 10, 0.25)', 'rgba(6, 15, 10, 0.92)']}
                style={styles.heroBannerOverlay}
              />
              <View style={styles.heroBannerContent}>
                <View style={styles.heroPill}>
                  <Truck size={11} color="#34D399" />
                  <Text style={styles.heroPillText}>FARM-TO-TABLE FULFILLMENT</Text>
                </View>
                <Text style={styles.heroBannerTitle}>Live Order & Harvest Tracking</Text>
                <Text style={styles.heroBannerSub}>
                  Cold-chain dispatch · Real-time courier milestones · Secure digital settlements
                </Text>
              </View>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Search size={16} color={themeColors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by order ID, buyer, or seller..."
                placeholderTextColor={themeColors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <PressableScale onPress={() => setSearch('')}>
                  <X size={16} color={themeColors.textMuted} />
                </PressableScale>
              )}
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterTabsRow}>
              {STATUS_TABS.map((tab) => {
                const isActive = selectedStatus === tab.key;
                return (
                  <PressableScale
                    key={tab.key}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setSelectedStatus(tab.key)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isActive && styles.filterChipTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <AlertCircle size={16} color={themeColors.danger} />
                <Text style={styles.errorText}>{error}</Text>
                <PressableScale style={styles.retryBtn} onPress={fetchOrders}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </PressableScale>
              </View>
            ) : null}

            {/* Loading Indicator */}
            {loading && orders.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={themeColors.primary} />
                <Text style={styles.loadingText}>Loading orders...</Text>
              </View>
            ) : null}
          </>
        }
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={() => navigateToDetail(item.id)} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchOrders}
            tintColor={themeColors.primary}
            colors={[themeColors.primary]}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <ShoppingBag size={36} color={themeColors.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptySubtitle}>
                {search || selectedStatus !== 'all'
                  ? 'No orders match your filter criteria. Try clearing filters.'
                  : 'Orders placed through the marketplace will be tracked and displayed here.'}
              </Text>
              <PressableScale style={styles.shopBtn} onPress={() => router.push('/(tabs)/market')}>
                <Text style={styles.shopBtnText}>Browse Marketplace</Text>
              </PressableScale>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    listContent: {
      padding: spacing.lg,
      paddingTop: 56,
      paddingBottom: 48,
    },
    header: {
      marginBottom: spacing.lg,
    },
    headerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.25)',
      alignSelf: 'flex-start',
      marginBottom: 8,
    },
    headerBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: '#34D399',
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: '#F8FAF8',
      letterSpacing: -0.8,
    },
    subtitle: {
      fontSize: 14,
      color: '#9CB0A2',
      marginTop: 4,
      lineHeight: 20,
    },
    heroBanner: {
      marginBottom: spacing.lg,
      height: 130,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      position: 'relative',
      borderWidth: 1,
      borderColor: 'rgba(52, 211, 153, 0.25)',
    },
    heroBannerImage: {
      width: '100%',
      height: '100%',
    },
    heroBannerOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    heroBannerContent: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      bottom: spacing.md,
    },
    heroPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 9999,
      alignSelf: 'flex-start',
      marginBottom: 6,
      borderWidth: 1,
      borderColor: 'rgba(52, 211, 153, 0.35)',
    },
    heroPillText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#34D399',
      letterSpacing: 0.6,
    },
    heroBannerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#F8FAF8',
      letterSpacing: -0.3,
    },
    heroBannerSub: {
      fontSize: 12,
      color: '#A7F3D0',
      marginTop: 2,
      fontWeight: '500',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#0E1A13',
      marginBottom: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: 'rgba(52, 211, 153, 0.22)',
      gap: spacing.sm,
      ...Platform.select({
        web: {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        },
      }),
    },
    searchInput: {
      flex: 1,
      paddingVertical: spacing.md,
      ...typography.body,
      color: theme.text,
    },
    filterTabsRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.lg,
    },
    filterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: borderRadius.full,
      backgroundColor: '#0E1A13',
      borderWidth: 1,
      borderColor: 'rgba(52, 211, 153, 0.22)',
    },
    filterChipActive: {
      backgroundColor: '#10B981',
      borderColor: '#10B981',
    },
    filterChipText: {
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    filterChipTextActive: {
      color: '#0B130E',
      fontWeight: '800',
    },
    cardWrap: {
      marginBottom: spacing.md,
    },
    card: {
      backgroundColor: '#0E1A13',
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: 'rgba(52, 211, 153, 0.22)',
      overflow: 'hidden',
      ...Platform.select({
        web: {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        },
      }),
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: spacing.lg,
      paddingBottom: spacing.sm,
    },
    orderIdGroup: {
      gap: 4,
    },
    orderPill: {
      backgroundColor: theme.surfaceLight,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    orderIdText: {
      fontSize: 13,
      fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
      fontWeight: '700',
      color: theme.text,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    orderDate: {
      ...typography.caption,
      color: theme.textMuted,
    },
    partiesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    partyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    partyLabel: {
      ...typography.caption,
      color: theme.textMuted,
    },
    partyName: {
      ...typography.caption,
      color: theme.text,
      fontWeight: '600',
    },
    divider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginHorizontal: spacing.lg,
    },
    cardBody: {
      padding: spacing.lg,
      paddingVertical: spacing.md,
      gap: 4,
    },
    itemsSummaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    itemsSummaryText: {
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
    },
    itemThumb: {
      width: 38,
      height: 38,
      borderRadius: borderRadius.sm,
      marginRight: spacing.sm,
      backgroundColor: theme.surfaceLight,
    },
    itemInfoWrap: {
      flex: 1,
      marginRight: spacing.sm,
    },
    itemName: {
      ...typography.bodySmall,
      color: theme.text,
      fontWeight: '600',
    },
    itemQty: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: 2,
    },
    itemPrice: {
      ...typography.bodySmall,
      color: theme.primary,
      fontWeight: '700',
    },
    moreItems: {
      ...typography.caption,
      color: theme.primary,
      fontWeight: '600',
      marginTop: 4,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.surfaceLight + '70',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderColor: theme.borderLight,
    },
    footerLeft: {
      gap: 2,
    },
    paymentMethodLabel: {
      fontSize: 10,
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: '600',
    },
    paymentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 2,
    },
    paymentText: {
      ...typography.caption,
      color: theme.text,
      fontWeight: '600',
    },
    footerRight: {
      alignItems: 'flex-end',
      gap: 2,
    },
    totalLabel: {
      fontSize: 10,
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: '600',
    },
    totalAmount: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.primary,
      letterSpacing: -0.5,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: theme.danger + '15',
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: theme.danger + '30',
    },
    errorText: {
      ...typography.bodySmall,
      color: theme.danger,
      flex: 1,
    },
    retryBtn: {
      backgroundColor: theme.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: borderRadius.sm,
    },
    retryBtnText: {
      ...typography.caption,
      color: '#FFFFFF',
      fontWeight: '700',
    },
    loadingContainer: {
      alignItems: 'center',
      padding: spacing.xl,
      gap: spacing.sm,
    },
    loadingText: {
      ...typography.bodySmall,
      color: theme.textSecondary,
    },
    emptyContainer: {
      alignItems: 'center',
      padding: spacing.xxl,
      marginTop: spacing.xl,
    },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    emptyTitle: {
      ...typography.h2,
      color: theme.text,
      marginBottom: 4,
    },
    emptySubtitle: {
      ...typography.body,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 340,
      marginBottom: spacing.lg,
    },
    shopBtn: {
      backgroundColor: theme.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: 12,
      borderRadius: borderRadius.md,
    },
    shopBtnText: {
      ...typography.bodySmall,
      color: '#FFFFFF',
      fontWeight: '700',
    },
    restrictedContainer: {
      flex: 1,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xxl,
    },
    restrictedIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.warning + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
  });
