import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, RefreshControl, ActivityIndicator, Pressable, ScrollView, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ShoppingBag, Search, Sparkles, AlertCircle, RefreshCw, ArrowRight, PackageOpen } from 'lucide-react-native';
import { useThemeColors, spacing, borderRadius, typography } from '../../../src/theme/theme';
import MarketListingCard from '../../../src/components/MarketListingCard';
import { PressableScale } from '../../../src/components/PressableScale';
import useInventory from '../../../src/hooks/useInventory';
import useAdminUsers from '../../../src/hooks/useAdminUsers';
import useAppStore from '../../../src/store/useAppStore';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase';

export default function MarketScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const { listings, loading, error, subscribeToMarketListings, fetchMarketListings } = useInventory();
  const { users: adminUsers } = useAdminUsers();
  const user = useAppStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const adminSelectedFarmerId = useAppStore((state) => state.adminSelectedFarmerId);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToMarketListings();
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [subscribeToMarketListings]);

  // Dynamic cleanup for orphaned listings (farmer no longer exists)
  useEffect(() => {
    if (user?.role === 'admin' && listings.length > 0 && adminUsers.length > 0) {
      const validIds = adminUsers.map(u => u.id);
      const orphanedListings = listings.filter(l => !l.id.startsWith('prod-') && !validIds.includes(l.farmer_id));
      
      orphanedListings.forEach(async (listing) => {
        try {
          console.log('Cleaning up orphaned listing:', listing.id);
          await deleteDoc(doc(db, 'market_listings', listing.id));
        } catch (e) {
          console.error('Failed to delete orphaned listing:', e);
        }
      });
    }
  }, [listings, user, adminUsers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMarketListings();
    setRefreshing(false);
  }, [fetchMarketListings]);

  const filteredListings = listings.filter((l) => {
    const searchTerm = search.toLowerCase();
    const matchesSearch = (l.title || '').toLowerCase().includes(searchTerm) ||
                          (l.category || '').toLowerCase().includes(searchTerm) ||
                          (l.farmer_name || '').toLowerCase().includes(searchTerm);
    const matchesCategory = activeCategory === 'All' || (l.category || '').toLowerCase() === activeCategory.toLowerCase();
    const matchesFarmer = user?.role === 'admin' && adminSelectedFarmerId ? l.farmer_id === adminSelectedFarmerId : true;
    return matchesSearch && matchesCategory && matchesFarmer;
  });

  const farmersList = adminUsers.filter(u => u.role === 'farmer' || u.role === 'admin');

  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  const navigateToDetail = (id) => {
    if (!isAuthenticated) {
      router.push('/(auth)');
      return;
    }
    router.push(`/(tabs)/market/${id}`);
  };

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={(
          <>
            <View style={styles.header}>
              <View style={styles.headerTopRow}>
                <View style={styles.headerTextContainer}>
                  <View style={styles.headerBadge}>
                    <ShoppingBag size={12} color={themeColors.primary} />
                    <Text style={styles.headerBadgeText}>HYPERLOCAL PRODUCE EXCHANGE</Text>
                  </View>
                  <Text style={styles.title}>
                    Fresh Harvest & <Text style={{ color: themeColors.primary }}>Market</Text>
                  </Text>
                  <Text style={styles.subtitle}>
                    Directly sourced from verified closed-loop hydroponic farms with zero synthetic pesticides.
                  </Text>
                </View>
                {!isAuthenticated && (
                  <View style={styles.authActions}>
                    <PressableScale
                      style={[styles.authBtn, { marginRight: spacing.sm, backgroundColor: 'transparent', borderWidth: 0 }]}
                      onPress={() => router.push('/home')}
                      activeScale={0.96}
                    >
                      <Text style={styles.authBtnText}>Home</Text>
                    </PressableScale>
                    <PressableScale
                      style={styles.authBtn}
                      onPress={() => router.push('/(auth)')}
                      activeScale={0.96}
                    >
                      <Text style={styles.authBtnText}>Sign In</Text>
                    </PressableScale>
                  </View>
                )}
              </View>
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
                  <Sparkles size={11} color={themeColors.primaryLight} />
                  <Text style={styles.heroPillText}>HARVESTED TODAY</Text>
                </View>
                <Text style={styles.heroBannerTitle}>Clean, Hydroponic Superfoods</Text>
                <Text style={styles.heroBannerSub}>
                  Zero soil pathogens · 90% less water · Farm-to-door in under 12 hours
                </Text>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <Search size={18} color={themeColors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search crops, produce, varieties..."
                placeholderTextColor={themeColors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow} contentContainerStyle={styles.categoriesContent}>
              {['All', 'Vegetables', 'Fruits', 'Herbs', 'Microgreens'].map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <PressableScale
                    key={cat}
                    onPress={() => setActiveCategory(cat)}
                    style={[
                      styles.categoryPill,
                      isActive && styles.categoryPillActive,
                    ]}
                    activeScale={0.96}
                  >
                    <Text style={[styles.categoryPillText, isActive && styles.categoryPillTextActive]}>{cat}</Text>
                  </PressableScale>
                );
              })}
            </ScrollView>

            {loading && listings.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={themeColors.primary} />
                <Text style={styles.loadingText}>Syncing fresh farm produce...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <AlertCircle size={44} color={themeColors.danger} style={{ marginBottom: 12 }} />
                <Text style={styles.errorText}>{error}</Text>
                <PressableScale style={styles.retryBtn} onPress={fetchMarketListings} activeScale={0.96}>
                  <Text style={styles.retryBtnText}>Retry Sync</Text>
                </PressableScale>
              </View>
            ) : null}
          </>
        )}
        data={loading && listings.length === 0 ? [] : filteredListings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MarketListingCard
              listing={{
                id: item.id,
                title: item.title,
                description: item.description,
                price: item.price,
                currency: item.currency,
                unit: item.unit,
                category: item.category,
                stock: item.stock,
                image_url: item.image_url,
                imageUrl: item.image_url,
                createdAt: item.created_at,
                seller: {
                  name: item.farmer_name || 'Unknown Farm',
                  rating: item.farmer_rating || 4.5,
                  location: item.farmer_location || 'Unknown',
                },
              }}
              onPress={() => navigateToDetail(item.id)}
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
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🌾</Text>
              <Text style={styles.emptyTitle}>No listings available</Text>
              <Text style={styles.emptySubtitle}>
                Check back soon for fresh produce from local farms
              </Text>
            </View>
          }
        />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  authActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authBtn: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary + '50',
    flexDirection: 'row',
    alignItems: 'center',
  },
  authBtnText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.adapt('rgba(16, 185, 129, 0.12)', colors.primaryGlow),
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.adapt('rgba(16, 185, 129, 0.25)', colors.border),
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  headerBadgeText: {
    color: colors.adapt('#34D399', colors.primaryLight),
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.adapt('#F8FAF8', colors.text),
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.adapt('#9CB0A2', colors.textSecondary),
    marginTop: 4,
    lineHeight: 20,
  },
  heroBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    height: 140,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.adapt('rgba(52, 211, 153, 0.25)', colors.border),
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
    backgroundColor: colors.adapt('rgba(16, 185, 129, 0.2)', colors.primaryGlow),
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
    color: colors.adapt('#34D399', colors.primaryLight),
    letterSpacing: 0.6,
  },
  heroBannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.adapt('#F8FAF8', colors.text),
    letterSpacing: -0.3,
  },
  heroBannerSub: {
    fontSize: 12,
    color: colors.primaryLight,
    marginTop: 2,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.adapt('#0E1A13', colors.surface),
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.adapt('rgba(52, 211, 153, 0.22)', colors.border),
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  categoriesRow: {
    marginBottom: spacing.md,
    minHeight: 50,
    flexGrow: 0,
  },
  categoriesContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
  },
  categoryPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillPressed: {
    opacity: 0.8,
  },
  categoryPillText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categoryPillTextActive: {
    color: colors.background,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  retryBtn: {
    backgroundColor: colors.action,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryBtnText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.actionText,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
