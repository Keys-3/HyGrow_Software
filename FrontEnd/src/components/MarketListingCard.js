import React from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, MapPin, User, Package } from 'lucide-react-native';
import { useThemeColors, spacing, borderRadius, typography, shadows } from '../theme/theme';
import { getDefaultImage } from '../utils/helpers';
import PressableScale from './PressableScale';

export default function MarketListingCard({ listing, onPress }) {
  const theme = useThemeColors();
  const styles = createStyles(theme);

  const imageUrl =
    listing.imageUrl || listing.image_url || getDefaultImage(listing.category, listing.title);

  return (
    <PressableScale onPress={onPress} style={styles.cardContainer}>
      <View style={styles.card}>
        {/* Product Image with Gradient Overlay */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.image} />
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.45)']}
            style={styles.imageGradient}
          />
          {listing.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{listing.category}</Text>
            </View>
          )}
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {listing.title}
          </Text>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {listing.currency || '₹'}
              {listing.price}
            </Text>
            <Text style={styles.unit}>/{listing.unit || 'unit'}</Text>
          </View>

          {/* Seller & Rating */}
          <View style={styles.sellerRow}>
            <View style={styles.sellerNameWrap}>
              <User size={13} color={theme.textMuted} style={styles.sellerIcon} />
              <Text style={styles.sellerName} numberOfLines={1}>
                {listing.seller?.name || 'Local Farm'}
              </Text>
            </View>

            {listing.seller?.rating !== undefined && (
              <View style={styles.ratingBadge}>
                <Star size={11} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.ratingText}>{Number(listing.seller.rating).toFixed(1)}</Text>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Location & Stock */}
          <View style={styles.footerRow}>
            <View style={styles.locationWrap}>
              <MapPin size={12} color={theme.textMuted} />
              <Text style={styles.locationText} numberOfLines={1}>
                {listing.seller?.location || 'Direct Harvest'}
              </Text>
            </View>

            <View style={styles.stockBadge}>
              <Package size={11} color={theme.primary} />
              <Text style={styles.stockText}>{listing.stock} in stock</Text>
            </View>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    cardContainer: {
      marginBottom: spacing.md,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
      ...shadows.card,
    },
    imageContainer: {
      height: 150,
      width: '100%',
      position: 'relative',
      backgroundColor: theme.surfaceLight,
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    imageGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 60,
    },
    categoryBadge: {
      position: 'absolute',
      top: 10,
      left: 10,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    categoryText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    content: {
      padding: spacing.md,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 6,
      letterSpacing: -0.2,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: spacing.sm,
    },
    price: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.primary,
      letterSpacing: -0.4,
    },
    unit: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.textMuted,
      marginLeft: 3,
    },
    sellerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    sellerNameWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 8,
    },
    sellerIcon: {
      marginRight: 5,
    },
    sellerName: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    ratingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.warningLight,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: borderRadius.xs,
      gap: 3,
    },
    ratingText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.warningDark,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: spacing.sm,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    locationWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flex: 1,
      marginRight: 8,
    },
    locationText: {
      fontSize: 11,
      color: theme.textMuted,
    },
    stockBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.successLight,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
    },
    stockText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.primary,
    },
  });
