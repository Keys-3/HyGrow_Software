import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, RefreshControl, ActivityIndicator, Pressable, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, AlertCircle, RefreshCw, ArrowRight, PackageOpen } from 'lucide-react-native';
import { useThemeColors, spacing, borderRadius, typography } from '../../../src/theme/theme';
import MarketListingCard from '../../../src/components/MarketListingCard';
import { PressableScale } from '../../../src/components/PressableScale';
import useInventory from '../../../src/hooks/useInventory';
import useAdminUsers from '../../../src/hooks/useAdminUsers';
import useAppStore from '../../../src/store/useAppStore';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { SagePageHero } from '../../../src/components/SagePageHero';
import { SageFeatureCards } from '../../../src/components/SageFeatureCards';
import { useNavigationTransition } from '../../../src/components/transitions/ScreenTransitionProvider';

export default function MarketScreen() {
  const router = useRouter();
  const navigateWithTransition = useNavigationTransition();
  const { width: viewportWidth } = useWindowDimensions();
  const isMobile = viewportWidth < 768;
  const marketColumns = viewportWidth >= 1000 ? 2 : 1;
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors, isMobile), [themeColors, isMobile]);
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
      navigateWithTransition('/(auth)', 'Sign In', 'section');
      return;
    }
    router.push(`/(tabs)/market/${id}`);
  };

  return (
    <View style={styles.container}>
      <FlatList
        key={`market-columns-${marketColumns}`}
        numColumns={marketColumns}
        columnWrapperStyle={marketColumns > 1 ? styles.listRow : undefined}
        style={styles.list}
        ListHeaderComponent={(
          <View style={styles.webListHeader}>
            <SagePageHero
              eyebrow="Hyperlocal produce exchange"
              title="Fresh Harvest &"
              titleAccent="Market"
              subtitle="Shop verified hydroponic produce from local farms, grown with less water and no synthetic pesticides."
              actionLabel="Refresh market"
              actionIcon={<RefreshCw color="#0E4F3B" size={21} />}
              onAction={onRefresh}
              scene="market"
              sceneData={{
                priceLabel: listings.length
                  ? `₹${listings[0].price_per_unit ?? listings[0].price ?? '--'}/per ${listings[0].unit || 'kg'}`
                  : 'No listed items',
              }}
              tickerItems={listings.slice(0, 4).map((listing) => listing.title || listing.name || 'Fresh harvest')}
              chips={[`${listings.length} fresh listings`, 'Verified local farms', 'Harvested to order']}
              actions={!isAuthenticated ? (
                <View style={styles.authActions}>
                  <PressableScale
                    style={[styles.authBtn, { marginRight: spacing.sm, backgroundColor: 'transparent', borderWidth: 0 }]}
                    onPress={() => navigateWithTransition('/home', 'Home', 'section')}
                    activeScale={0.96}
                  >
                    <Text style={styles.authBtnText}>Home</Text>
                  </PressableScale>
                  <PressableScale
                    style={styles.authBtn}
                    onPress={() => navigateWithTransition('/(auth)', 'Sign In', 'section')}
                    activeScale={0.96}
                  >
                    <Text style={styles.authBtnText}>Sign In</Text>
                  </PressableScale>
                </View>
              ) : null}
            />

            <SageFeatureCards variant="market" cards={[
              { tag: 'Fresh produce', title: 'Browse harvests', description: 'Find seasonal hydroponic produce from nearby growers.', graphic: 'market', onPress: () => setActiveCategory('All') },
              { tag: 'Farm network', title: 'Verified growers', description: 'Explore listings from farms verified by HyGrow.', graphic: 'inventory', onPress: () => setActiveCategory('Vegetables') },
            ]} />

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
          </View>
        )}
        data={loading && listings.length === 0 ? [] : filteredListings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.listingCell, marketColumns > 1 && styles.listingCellColumn]}>
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
            </View>
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

const createStyles = (colors, isMobile = false) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    flex: 1,
  },
  header: {
    padding: isMobile ? 16 : spacing.lg,
    paddingTop: isMobile ? 16 : spacing.lg,
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
    fontSize: 12,
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
    fontSize: 15,
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
    fontSize: 12,
    fontWeight: '800',
    color: '#E8F3E6',
    letterSpacing: 0.6,
  },
  heroBannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroBannerSub: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.86)',
    marginTop: 2,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.adapt('#191C1E', colors.surface),
    marginHorizontal: isMobile ? 16 : spacing.lg,
    marginBottom: isMobile ? 12 : spacing.lg,
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
    fontSize: 18,
  },
  categoriesRow: {
    marginBottom: spacing.md,
    minHeight: 50,
    flexGrow: 0,
  },
  categoriesContent: {
    paddingHorizontal: isMobile ? 16 : spacing.lg,
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
    paddingHorizontal: isMobile ? 16 : spacing.lg,
    paddingTop: isMobile ? 16 : spacing.lg,
    paddingBottom: isMobile ? 60 : 40,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  webListHeader: {
    width: '100%',
  },
  listingCell: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: isMobile ? 0 : spacing.xs,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listingCellColumn: {
    width: '50%',
    alignItems: 'stretch',
    paddingHorizontal: spacing.sm,
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
