import React, { type ReactNode } from 'react';
import { ScrollView, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Text as SvgText, TextPath } from 'react-native-svg';
import { ArrowRight, Leaf, Sparkles } from 'lucide-react-native';
import { PressableScale } from './PressableScale';
import { borderRadius, spacing, useThemeColors } from '../theme/theme';
import { SagePageScene, type SageSceneName } from './SagePageScene';

type SagePageHeroProps = {
  eyebrow: string;
  title: string;
  titleAccent?: string;
  subtitle: string;
  chips?: string[];
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  scene?: SageSceneName;
  tickerItems?: string[];
  sceneData?: Record<string, string | number>;
};

/** Shared editorial hero inspired by the HyGrow AI Tools redesign. */
export function SagePageHero({
  eyebrow,
  title,
  titleAccent,
  subtitle,
  chips = [],
  actionLabel,
  onAction,
  actionIcon,
  actions,
  children,
  scene = 'ai',
  tickerItems,
  sceneData,
}: SagePageHeroProps) {
  const theme = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const showPlant = width >= 620;
  const isMarketHero = scene === 'market';
  const isInventoryHero = scene === 'inventory';
  const styles = createStyles(theme, compact, showPlant, width, isMarketHero);
  const ticker = tickerItems?.length ? tickerItems : defaultTicker[scene];

  return (
    <View style={styles.shell}>
      <LinearGradient
        colors={theme.isDarkMode ? ['#121212', '#121212'] : isInventoryHero ? ['#C2CEB9', '#B5C5AA'] : ['#A9BD9B', '#8FA881']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
        {...(isMarketHero ? ({ className: 'hg-market-hero' } as any) : {})}
      >
        <View style={styles.copy}>
          <View style={styles.heroTopRow}>
            <View style={[styles.eyebrow, isMarketHero && styles.marketEyebrow]}>
              <Sparkles size={14} color={theme.isDarkMode ? theme.primary : '#0E4F3B'} {...({ className: 'hg-motion-sparkle' } as any)} />
              <Text style={styles.eyebrowText}>{eyebrow}</Text>
            </View>
            {actions ? <View style={styles.actions}>{actions}</View> : null}
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.title}>{title}</Text>
            {titleAccent ? <Text style={styles.titleAccent}>{titleAccent}</Text> : null}
          </View>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {onAction && actionLabel ? (
            <PressableScale
              accessibilityRole="button"
              onPress={onAction}
              activeScale={0.98}
              style={[styles.actionButton, isMarketHero && styles.marketActionButton]}
              {...({ className: 'hg-cta' } as any)}
            >
              <View style={styles.actionIcon}>
                <View style={styles.actionRingOne} {...({ className: 'hg-action-ring' } as any)} />
                <View style={styles.actionRingTwo} {...({ className: 'hg-action-ring hg-action-ring-delayed' } as any)} />
                {actionIcon || <Leaf size={21} color="#0E4F3B" />}
              </View>
              <Text style={[styles.actionText, isMarketHero && styles.marketActionText]}>{actionLabel}</Text>
              <View style={styles.equalizer} accessibilityElementsHidden>
                {[8, 18, 12, 16].map((height, index) => <View key={index} style={[styles.equalizerBar, { height }]} {...({ className: 'hg-equalizer-bar' } as any)} />)}
              </View>
              <ArrowRight size={17} color="#A9BD9B" />
              {!compact ? (
                <View style={[styles.sticker, isMarketHero && styles.marketSticker]} accessibilityElementsHidden>
                  <Svg width="92" height="92" viewBox="0 0 100 100" {...({ className: 'hg-motion-spin' } as any)}>
                    <Path id="hg-recommended-circle" d="M50 50m-36 0a36 36 0 1 1 72 0a36 36 0 1 1-72 0" fill="none" />
                    <SvgText fill="#0E4F3B" fontSize="12" fontWeight="800" letterSpacing=".9">
                      <TextPath href="#hg-recommended-circle" textLength="222">RECOMMENDED • RECOMMENDED •</TextPath>
                    </SvgText>
                  </Svg>
                  <Text style={styles.stickerStar}>★</Text>
                </View>
              ) : null}
            </PressableScale>
          ) : null}

          {chips.length > 0 ? (
            <View style={styles.chips}>
              {chips.map((chip) => (
                <View key={chip} style={[styles.chip, isMarketHero && styles.marketChip]} {...({ className: 'hg-chip' } as any)}>
                  <Text style={styles.chipText} {...({ className: 'hg-chip-text' } as any)}>{chip}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {children}
        </View>

        {showPlant ? (
          <View style={styles.plant} pointerEvents="none">
            <SagePageScene scene={scene} data={sceneData} />
          </View>
        ) : null}

        <View style={[styles.ticker, isMarketHero && styles.marketTicker]} accessibilityElementsHidden {...(isMarketHero ? ({ className: 'hg-market-ticker' } as any) : {})}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tickerTrack}>
            {ticker.map((item, index) => (
              <View key={index} style={styles.tickerItem}>
                <Text style={styles.tickerText}>{item}</Text>
                <View style={styles.tickerBullet} />
              </View>
            ))}
          </ScrollView>
        </View>
      </LinearGradient>
    </View>
  );
}

const defaultTicker: Record<SageSceneName, string[]> = {
  dashboard: ['pH', 'EC', 'Temperature', 'Humidity'],
  ai: ['Hugging Face', 'Sensor fusion', 'Vision analysis'],
  inventory: ['Seed trays', 'Nutrients', 'Harvest batches', 'Stock levels'],
  analytics: ['Sensor drift', 'Nutrient balance', 'Historical trends', 'Equilibrium'],
  market: ['Tomatoes', 'Leafy greens', 'Herbs', 'Local harvests'],
  orders: ['Pending', 'Confirmed', 'In transit', 'Delivered'],
  settings: ['Devices', 'Profile', 'Notifications', 'Security'],
};

const createStyles = (theme: any, compact: boolean, showPlant: boolean, width: number, isMarketHero: boolean) => {
  const isSmallMobile = width < 480;
  const titleSize = isSmallMobile ? 28 : compact ? 36 : Math.min(92, Math.max(44, width * 0.065));
  const titleLineHeight = isSmallMobile ? 33 : compact ? 40 : Math.min(88, Math.max(44, width * 0.062));
  const titleLetterSpacing = isSmallMobile ? -0.8 : compact ? -1.2 : -3.1;
  const accentMargin = isSmallMobile ? 6 : compact ? 12 : 44;

  return StyleSheet.create({
    shell: {
      marginBottom: spacing.lg,
    },
    hero: {
      minHeight: isSmallMobile ? 360 : compact ? 420 : 470,
      paddingTop: isSmallMobile ? 18 : compact ? spacing.lg : 44,
      paddingHorizontal: isSmallMobile ? 16 : compact ? spacing.lg : 48,
      paddingBottom: isSmallMobile ? 68 : compact ? 70 : 76,
      justifyContent: 'center',
      borderRadius: isSmallMobile ? 28 : compact ? 40 : 56,
      borderBottomLeftRadius: isSmallMobile ? 48 : compact ? 80 : 190,
      // Clip all hero content (including the moving ticker) to the rounded hero
      // shape on web as well as native. The web CSS class is only decorative and
      // must not be responsible for enforcing this layout boundary.
      overflow: 'hidden',
      position: 'relative',
      ...Platform.select({
        web: {
          isolation: 'isolate',
          boxShadow: theme.isDarkMode ? '0 24px 48px -38px rgba(0,0,0,.8)' : '0 32px 60px -42px rgba(14,79,59,.55)',
        } as any,
        default: { elevation: isMarketHero ? 6 : 3 },
      }),
      ...(isMarketHero ? {} : { borderWidth: theme.isDarkMode ? 1 : 0, borderColor: theme.border }),
      ...(isMarketHero ? Platform.select({ web: {}, default: { elevation: 6 } }) : {}),
    },
    copy: {
      maxWidth: showPlant ? 650 : '100%',
      zIndex: 2,
    },
    eyebrow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: borderRadius.full,
      backgroundColor: theme.isDarkMode ? 'rgba(169,189,155,.14)' : 'rgba(255,255,255,.52)',
      marginBottom: spacing.md,
    },
    marketEyebrow: { backgroundColor: theme.isDarkMode ? 'rgba(169,189,155,.14)' : 'rgba(217,230,224,.72)' },
    eyebrowText: {
      color: theme.isDarkMode ? theme.primary : '#0E4F3B',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.75,
      textTransform: 'uppercase',
    },
    titleBlock: {
      marginBottom: spacing.md,
      maxWidth: showPlant ? 650 : '100%',
    },
    title: {
      color: theme.isDarkMode ? theme.text : '#0E4F3B',
      fontFamily: Platform.OS === 'web' ? 'Fraunces' : 'serif',
      fontSize: titleSize,
      lineHeight: titleLineHeight,
      fontWeight: '700',
      letterSpacing: titleLetterSpacing,
      maxWidth: showPlant ? 650 : '100%',
      includeFontPadding: false,
    },
    titleAccent: {
      color: theme.isDarkMode ? theme.text : '#0E4F3B',
      fontFamily: Platform.OS === 'web' ? 'Fraunces' : 'serif',
      fontSize: titleSize,
      lineHeight: titleLineHeight,
      fontStyle: 'italic',
      fontWeight: '500',
      letterSpacing: titleLetterSpacing,
      marginLeft: accentMargin,
      includeFontPadding: false,
    },
    subtitle: {
      maxWidth: 500,
      color: theme.isDarkMode ? theme.textSecondary : '#244B3B',
      fontFamily: Platform.OS === 'web' ? 'Manrope' : undefined,
      fontSize: isSmallMobile ? 13 : 14,
      lineHeight: isSmallMobile ? 19 : 21,
      marginBottom: isSmallMobile ? 10 : spacing.md,
    },
    actionButton: {
      minHeight: isSmallMobile ? 54 : 68,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: isSmallMobile ? 8 : 12,
      paddingVertical: isSmallMobile ? 5 : 8,
      paddingLeft: isSmallMobile ? 6 : 8,
      paddingRight: isSmallMobile ? 16 : 20,
      marginTop: 2,
      borderRadius: borderRadius.full,
      backgroundColor: theme.isDarkMode ? '#292E30' : '#0E4F3B',
      position: 'relative',
      ...Platform.select({
        web: { boxShadow: '0 16px 28px -15px rgba(14,79,59,.9)' },
        default: { elevation: 5 },
      }),
    },
    marketActionButton: { paddingRight: isSmallMobile ? 24 : 34 },
    actionIcon: {
      width: isSmallMobile ? 42 : 52,
      height: isSmallMobile ? 42 : 52,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#A9BD9B',
      position: 'relative',
      zIndex: 2,
    },
    actionRingOne: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 999, borderWidth: 2, borderColor: '#A9BD9B' },
    actionRingTwo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 999, borderWidth: 2, borderColor: '#A9BD9B' },
    equalizer: { height: 20, flexDirection: 'row', alignItems: 'center', gap: 3 },
    equalizerBar: { width: 3, borderRadius: 3, backgroundColor: '#A9BD9B' },
    sticker: { position: 'absolute', width: 92, height: 92, right: -64, top: -40, borderRadius: 999, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', zIndex: 6 },
    marketSticker: { right: -34, top: -38, backgroundColor: theme.isDarkMode ? '#EAF2EC' : '#FFFFFF' },
    stickerStar: { position: 'absolute', color: '#A855F7', fontSize: 20, fontWeight: '800' },
    actionText: {
      color: '#FFFFFF',
      fontSize: isSmallMobile ? 14 : 16,
      fontWeight: '800',
    },
    marketActionText: { color: '#EAF6EF' },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: isSmallMobile ? 6 : spacing.sm,
      marginTop: isSmallMobile ? 10 : spacing.md,
    },
    chip: {
      paddingVertical: isSmallMobile ? 5 : 7,
      paddingHorizontal: isSmallMobile ? 10 : 13,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: theme.isDarkMode ? theme.borderStrong : 'rgba(14,79,59,.38)',
      backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.12)',
    },
    marketChip: { backgroundColor: theme.isDarkMode ? 'rgba(31,58,46,.7)' : 'rgba(217,230,224,.35)' },
    chipText: {
      color: theme.isDarkMode ? theme.textSecondary : '#164A38',
      fontSize: isSmallMobile ? 11 : 12,
      fontWeight: '700',
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 10,
      width: '100%',
      marginBottom: 2,
      zIndex: 3,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      zIndex: 3,
    },
    plant: {
      position: 'absolute',
      width: 300,
      height: 440,
      right: compact ? -60 : 22,
      bottom: -12,
      opacity: width < 1000 ? 0.35 : 1,
      zIndex: 1,
    },
    ticker: {
      height: 46,
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
      backgroundColor: theme.isDarkMode ? '#202923' : '#0E4F3B',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    marketTicker: { backgroundColor: '#0E4F3B' },
    tickerText: {
      color: isMarketHero ? '#D9E6E0' : theme.isDarkMode ? theme.primary : '#D9E6E0',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.4,
      textAlign: 'center',
      ...Platform.select({ web: { whiteSpace: 'nowrap' } as any }),
      fontFamily: Platform.OS === 'web' ? 'Manrope' : undefined,
    },
    tickerTrack: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
    tickerItem: { flexDirection: 'row', alignItems: 'center', gap: 36, paddingRight: 36 },
    tickerBullet: { width: 9, height: 9, borderTopRightRadius: 9, borderBottomLeftRadius: 9, backgroundColor: '#A9BD9B', transform: [{ rotate: '0deg' }] },
  });
};
