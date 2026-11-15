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
} from 'react-native';
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
} from 'lucide-react-native';

import useOrders from '../../../src/hooks/useOrders';
import useAdminUsers from '../../../src/hooks/useAdminUsers';
import useAppStore from '../../../src/store/useAppStore';
import { useThemeColors, spacing, borderRadius, typography } from '../../../src/theme/theme';
import { formatDate, formatTime } from '../../../src/utils/helpers';
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

          {order.items?.slice(0, 2).map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.product_name}
              </Text>
              <Text style={styles.itemQty}>x{item.quantity}</Text>
            </View>
          ))}

          {itemCount > 2 && (
            <Text style={styles.moreItems}>
              +{itemCount - 2} more item{itemCount - 2 !== 1 ? 's' : ''}
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
                <Receipt size={12} color={themeColors.primary} />
                <Text style={styles.headerBadgeText}>COMMERCE & DISPATCH</Text>
              </View>
              <Text style={styles.title}>
                {user?.role === 'admin' ? 'All System Orders' : 'My Orders'}
              </Text>
              <Text style={styles.subtitle}>
                Track live fulfillment pipelines, payment settlements, and delivery tracking.
              </Text>
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
      backgroundColor: theme.primary + '12',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
      alignSelf: 'flex-start',
      marginBottom: spacing.xs,
    },
    headerBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
      color: theme.primary,
    },
    title: {
      ...typography.h1,
      color: theme.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      ...typography.body,
      color: theme.textSecondary,
      marginTop: 4,
      lineHeight: 20,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.cardBackground,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      gap: spacing.sm,
      ...Platform.select({
        web: {
          boxShadow: '0 1px 3px rgba(10, 77, 60, 0.04)',
        },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 2,
          elevation: 1,
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
      backgroundColor: theme.surfaceLight,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterChipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    filterChipText: {
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    filterChipTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    cardWrap: {
      marginBottom: spacing.md,
    },
    card: {
      backgroundColor: theme.cardBackground,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
      ...Platform.select({
        web: {
          boxShadow: '0 2px 8px rgba(10, 77, 60, 0.04)',
        },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 1,
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
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 2,
    },
    itemName: {
      ...typography.bodySmall,
      color: theme.text,
      flex: 1,
      marginRight: spacing.sm,
    },
    itemQty: {
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: '600',
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
