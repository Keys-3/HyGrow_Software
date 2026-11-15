import React, { useState, useMemo, useEffect } from 'react';
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
  Boxes,
  Package,
  ShoppingBag,
  Layers,
  Plus,
  Search,
  Lock,
  PackageOpen,
  Clock,
  ChevronRight,
  UserCheck,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react-native';
import { deleteDoc, doc } from 'firebase/firestore';

import useInventory from '../../../src/hooks/useInventory';
import { db } from '../../../firebase';
import useAdminUsers from '../../../src/hooks/useAdminUsers';
import useAppStore from '../../../src/store/useAppStore';
import { useThemeColors, spacing, borderRadius, typography } from '../../../src/theme/theme';
import { formatDate } from '../../../src/utils/helpers';
import PressableScale from '../../../src/components/PressableScale';
import StatusBadge from '../../../src/components/StatusBadge';
import { getProduceImageUrl } from '../../../src/utils/produceImages';

function InventoryCard({ item, onPress, themeColors, styles }) {
  const isListed = Boolean(item.is_listed);
  const imageUrl = getProduceImageUrl(item.name || item.title, item.category, item.image_url);

  return (
    <PressableScale style={styles.cardWrap} onPress={onPress}>
      <View style={styles.card}>
        <View style={styles.cardMainRow}>
          {/* Produce Visual Thumbnail */}
          <View style={styles.cardThumbWrap}>
            <Image source={{ uri: imageUrl }} style={styles.cardThumb} resizeMode="cover" />
            <View style={styles.thumbBadgeWrap}>
              <StatusBadge
                label={isListed ? 'Listed' : 'Unlisted'}
                status={isListed ? 'success' : 'neutral'}
                size="sm"
              />
            </View>
          </View>

          {/* Details & Metrics */}
          <View style={styles.cardContent}>
            <View style={styles.categoryRow}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryText}>{item.category || 'Produce'}</Text>
              </View>
              {item.farmer_name && (
                <View style={styles.farmerPill}>
                  <UserCheck size={11} color={themeColors.textSecondary} />
                  <Text style={styles.farmerText} numberOfLines={1}>
                    {item.farmer_name}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.name || item.title || 'Untitled Produce'}
            </Text>

            <View style={styles.cardMetricsInline}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Stock: </Text>
                <Text style={styles.metricValue}>
                  {item.quantity} <Text style={styles.metricUnit}>{item.unit || 'units'}</Text>
                </Text>
              </View>
              <Text style={styles.metricBullet}>•</Text>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Price: </Text>
                <Text style={[styles.metricValue, { color: themeColors.primary }]}>
                  ₹{item.price_per_unit} <Text style={styles.metricUnit}>/{item.unit || 'unit'}</Text>
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.dateRow}>
            <Clock size={12} color={themeColors.textMuted} />
            <Text style={styles.cardDate}>Logged {formatDate(item.created_at)}</Text>
          </View>
          <View style={styles.editActionRow}>
            <Text style={styles.cardEdit}>Edit Batch</Text>
            <ChevronRight size={14} color={themeColors.primary} />
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

export default function InventoryScreen() {
  const router = useRouter();
  const { inventory, loading, error, fetchInventory } = useInventory();
  const { users: adminUsers } = useAdminUsers();
  const user = useAppStore((state) => state.user);
  const adminSelectedFarmerId = useAppStore((state) => state.adminSelectedFarmerId);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  useEffect(() => {
    if (user?.role === 'farmer' || user?.role === 'admin') {
      const unsubscribe = fetchInventory();
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, [fetchInventory, user]);

  // Dynamic cleanup for orphaned inventory
  useEffect(() => {
    if (user?.role === 'admin' && inventory.length > 0 && adminUsers.length > 0) {
      const validIds = adminUsers.map((u) => u.id);
      const orphanedInventory = inventory.filter((i) => !validIds.includes(i.farmer_id));

      orphanedInventory.forEach(async (item) => {
        try {
          console.log('Cleaning up orphaned inventory:', item.id);
          await deleteDoc(doc(db, 'inventory', item.id));
        } catch (e) {
          console.error('Failed to delete orphaned inventory:', e);
        }
      });
    }
  }, [inventory, user, adminUsers]);

  const navigateToEdit = (itemId = null) => {
    if (itemId) {
      router.push(`/(tabs)/inventory/edit?inventoryId=${itemId}`);
    } else {
      router.push('/(tabs)/inventory/edit');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const filteredInventory = useMemo(() => {
    let items = inventory;

    if (search.trim()) {
      const searchTerm = search.toLowerCase();
      items = items.filter(
        (i) =>
          (i.name || i.title || '').toLowerCase().includes(searchTerm) ||
          (i.category || '').toLowerCase().includes(searchTerm)
      );
    }

    if (user?.role === 'admin' && adminSelectedFarmerId) {
      items = items.filter((i) => i.farmer_id === adminSelectedFarmerId);
    }

    if (user?.role === 'admin') {
      return items.map((item) => {
        const farmer = adminUsers.find((u) => u.id === item.farmer_id);
        return {
          ...item,
          farmer_name: farmer?.farm_name || farmer?.name || 'Unknown Farmer',
        };
      });
    }

    return items;
  }, [inventory, user, adminSelectedFarmerId, adminUsers, search]);

  const totalItems = filteredInventory.length;
  const listedItems = filteredInventory.filter((i) => i.is_listed).length;
  const totalStock = filteredInventory.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  if (!user || (user.role !== 'farmer' && user.role !== 'admin')) {
    return (
      <View style={styles.restrictedContainer}>
        <View style={styles.restrictedIconCircle}>
          <Lock size={32} color={themeColors.warning} />
        </View>
        <Text style={styles.emptyTitle}>Access Restricted</Text>
        <Text style={styles.emptySubtitle}>
          Inventory management and harvest batch publishing are available exclusively for registered farmers and administrators.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            {/* Enterprise Header */}
            <View style={styles.header}>
              <View style={styles.headerBadge}>
                <Boxes size={12} color="#10B981" />
                <Text style={styles.headerBadgeText}>FARM INVENTORY MANAGEMENT</Text>
              </View>
              <Text style={styles.title}>
                Produce & Harvest <Text style={{ color: themeColors.primary }}>Stock</Text>
              </Text>
              <Text style={styles.subtitle}>
                Track live inventory batches, manage unit pricing, and publish directly to the buyer marketplace.
              </Text>
            </View>

            {/* Visual Hero Feature Banner */}
            <View style={styles.heroBanner}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1595858273617-e4318ee47683?w=800&q=80' }}
                style={styles.heroBannerImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['rgba(6, 15, 10, 0.25)', 'rgba(6, 15, 10, 0.92)']}
                style={styles.heroBannerOverlay}
              />
              <View style={styles.heroBannerContent}>
                <View style={styles.heroPill}>
                  <Sparkles size={11} color="#34D399" />
                  <Text style={styles.heroPillText}>CLOSED-LOOP LIVING INVENTORY</Text>
                </View>
                <Text style={styles.heroBannerTitle}>Fresh Harvest & Root Batches</Text>
                <Text style={styles.heroBannerSub}>
                  Zero soil pathogens · Direct sync to buyer marketplace · Verified fresh yields
                </Text>
              </View>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Search size={16} color={themeColors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by produce name or category..."
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

            {/* KPI Summary Cards */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <Package size={14} color={themeColors.textSecondary} />
                  <Text style={styles.statLabel}>Total Batches</Text>
                </View>
                <Text style={styles.statValue}>{totalItems}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <ShoppingBag size={14} color={themeColors.primary} />
                  <Text style={styles.statLabel}>Market Listed</Text>
                </View>
                <Text style={[styles.statValue, { color: themeColors.primary }]}>
                  {listedItems}
                </Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <Layers size={14} color={themeColors.textSecondary} />
                  <Text style={styles.statLabel}>Total Units</Text>
                </View>
                <Text style={styles.statValue}>{Math.round(totalStock)}</Text>
              </View>
            </View>

            {/* Add New Batch Button */}
            <PressableScale style={styles.addBtn} onPress={() => navigateToEdit()}>
              <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.addBtnText}>Add Harvest Batch</Text>
            </PressableScale>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorBanner}>
                <AlertCircle size={15} color={themeColors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Loading Indicator */}
            {loading && filteredInventory.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={themeColors.primary} />
                <Text style={styles.loadingText}>Fetching inventory batches...</Text>
              </View>
            ) : null}
          </>
        }
        data={loading && filteredInventory.length === 0 ? [] : filteredInventory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <InventoryCard
            item={item}
            onPress={() => navigateToEdit(item.id)}
            themeColors={themeColors}
            styles={styles}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
            colors={[themeColors.primary]}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <PackageOpen size={36} color={themeColors.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>No batches found</Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? `No inventory items match "${search}". Try adjusting your search query.`
                  : 'Start tracking your hydroponic harvests and publish yields to the local marketplace.'}
              </Text>
              {!search && (
                <PressableScale style={styles.emptyBtn} onPress={() => navigateToEdit()}>
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.emptyBtnText}>Add First Batch</Text>
                </PressableScale>
              )}
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
    statsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    statCard: {
      flex: 1,
      backgroundColor: '#0E1A13',
      borderRadius: 14,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: 'rgba(52, 211, 153, 0.22)',
      ...Platform.select({
        web: {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        },
      }),
    },
    statCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 11,
      color: theme.textMuted,
      fontWeight: '600',
    },
    statValue: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.text,
      letterSpacing: -0.5,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.primary,
      paddingVertical: 14,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.lg,
      ...Platform.select({
        web: {
          boxShadow: '0 4px 12px rgba(10, 77, 60, 0.25)',
        },
        default: {
          shadowColor: theme.primary,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 3,
        },
      }),
    },
    addBtnText: {
      ...typography.body,
      color: '#FFFFFF',
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    errorBanner: {
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
    loadingContainer: {
      alignItems: 'center',
      padding: spacing.xl,
      gap: spacing.sm,
    },
    loadingText: {
      ...typography.bodySmall,
      color: theme.textSecondary,
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
    cardMainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      gap: spacing.md,
    },
    cardThumbWrap: {
      width: 84,
      height: 84,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: '#050D08',
      borderWidth: 1,
      borderColor: 'rgba(52, 211, 153, 0.2)',
    },
    cardThumb: {
      width: '100%',
      height: '100%',
    },
    thumbBadgeWrap: {
      position: 'absolute',
      bottom: 4,
      left: 4,
      right: 4,
    },
    cardContent: {
      flex: 1,
      justifyContent: 'center',
    },
    cardMetricsInline: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      flexWrap: 'wrap',
      gap: 6,
    },
    metricItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    metricBullet: {
      color: '#4B5563',
      fontSize: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: spacing.lg,
      paddingBottom: spacing.sm,
    },
    cardTitleBlock: {
      flex: 1,
      marginRight: spacing.md,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    categoryPill: {
      backgroundColor: theme.surfaceLight,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: theme.border,
    },
    categoryText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    farmerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.surfaceLight,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
    },
    farmerText: {
      fontSize: 10,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    cardTitle: {
      ...typography.h3,
      color: theme.text,
      fontWeight: '700',
    },
    cardBody: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: theme.surfaceLight + '50',
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.borderLight,
    },
    metricBlock: {
      flex: 1,
    },
    metricDivider: {
      width: 1,
      height: 32,
      backgroundColor: theme.border,
      marginHorizontal: spacing.md,
    },
    metricLabel: {
      ...typography.caption,
      color: theme.textMuted,
      marginBottom: 2,
    },
    metricValue: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    metricUnit: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    cardDate: {
      ...typography.caption,
      color: theme.textMuted,
    },
    editActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    cardEdit: {
      ...typography.caption,
      color: theme.primary,
      fontWeight: '700',
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
    emptyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: 12,
      borderRadius: borderRadius.md,
    },
    emptyBtnText: {
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
