import React, { type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { ArrowRight, Leaf } from 'lucide-react-native';
import { PressableScale } from './PressableScale';
import { borderRadius, spacing, useThemeColors } from '../theme/theme';

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
}: SagePageHeroProps) {
  const theme = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const showPlant = width >= 760;
  const styles = createStyles(theme, compact, showPlant);

  return (
    <View style={styles.shell}>
      <LinearGradient
        colors={theme.isDarkMode ? ['#191C1E', '#222628'] : ['#A9BD9B', '#8FA881']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.copy}>
          <View style={styles.eyebrow}>
            <Leaf size={14} color={theme.isDarkMode ? theme.primary : '#0E4F3B'} />
            <Text style={styles.eyebrowText}>{eyebrow}</Text>
          </View>

          <Text style={styles.title}>
            {title}
            {titleAccent ? <Text style={styles.titleAccent}>{`\n${titleAccent}`}</Text> : null}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {onAction && actionLabel ? (
            <PressableScale
              accessibilityRole="button"
              onPress={onAction}
              activeScale={0.98}
              style={styles.actionButton}
            >
              <View style={styles.actionIcon}>
                {actionIcon || <Leaf size={21} color="#0E4F3B" />}
              </View>
              <Text style={styles.actionText}>{actionLabel}</Text>
              <ArrowRight size={17} color="#A9BD9B" />
            </PressableScale>
          ) : null}

          {chips.length > 0 ? (
            <View style={styles.chips}>
              {chips.map((chip) => (
                <View key={chip} style={styles.chip}>
                  <Text style={styles.chipText}>{chip}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {children}
        </View>

        {actions ? <View style={styles.actions}>{actions}</View> : null}
        {showPlant ? (
          <View style={styles.plant} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Svg width="100%" height="100%" viewBox="0 0 300 440" fill="none">
              <Path d="M150 345C148 280 145 193 151 75" stroke={theme.isDarkMode ? '#A9BD9B' : '#0E4F3B'} strokeWidth="7" strokeLinecap="round" />
              <G stroke={theme.isDarkMode ? '#91AF99' : '#0E4F3B'} strokeWidth="2">
                <Path d="M149 293C107 293 78 265 72 230c42-1 72 23 77 63Z" fill="#2F9E6B" />
                <Path d="M151 262c42 0 72-27 78-61-42-2-72 21-78 61Z" fill="#3FB67F" />
                <Path d="M148 217c-36-2-61-24-67-53 37-1 63 18 67 53Z" fill="#1F7A53" />
                <Path d="M152 184c37 0 62-23 68-52-38-1-64 18-68 52Z" fill="#2F9E6B" />
                <Path d="M150 141c-28-1-46-19-50-42 28 0 47 14 50 42Z" fill="#3FB67F" />
                <Path d="M151 115c27-1 44-18 48-40-27 0-45 13-48 40Z" fill="#1F7A53" />
                <Path d="M151 82c-17-16-17-41 0-61 17 20 17 45 0 61Z" fill="#2F9E6B" />
              </G>
              <Path d="M150 345c-17 29-36 47-42 81m42-81c0 36 4 56 8 85m-8-85c18 29 39 44 50 78" stroke="#F6F4EF" strokeWidth="3" strokeLinecap="round" opacity=".9" />
              <Rect x="60" y="332" width="180" height="116" rx="32" fill="#F6F4EF" fillOpacity=".22" stroke="#F6F4EF" strokeOpacity=".75" strokeWidth="2.5" />
              <Path d="M48 365q20-11 40 0t40 0 40 0 40 0 40 0 40 0v92H48z" fill="#2F9E6B" fillOpacity=".45" />
              <Circle cx="112" cy="412" r="5" fill="#F6F4EF" fillOpacity=".8" />
              <Circle cx="190" cy="390" r="7" fill="#F6F4EF" fillOpacity=".5" />
            </Svg>
          </View>
        ) : null}

        <View style={styles.ticker} accessibilityElementsHidden>
          <Text style={styles.tickerText}>SENSOR FUSION     ·     VISION ANALYSIS     ·     HYDROPONIC INTELLIGENCE     ·     SENSOR FUSION     ·     VISION ANALYSIS</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const createStyles = (theme: any, compact: boolean, showPlant: boolean) => StyleSheet.create({
  shell: {
    marginBottom: spacing.lg,
    ...Platform.select({
      web: { boxShadow: theme.isDarkMode ? '0 24px 48px -38px rgba(0,0,0,.8)' : '0 32px 60px -42px rgba(14,79,59,.55)' },
      default: { elevation: 3 },
    }),
  },
  hero: {
    minHeight: compact ? 450 : 470,
    paddingTop: compact ? spacing.lg : 44,
    paddingHorizontal: compact ? spacing.lg : 48,
    paddingBottom: 76,
    justifyContent: 'center',
    borderRadius: compact ? 40 : 56,
    borderBottomLeftRadius: compact ? 100 : 190,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: theme.isDarkMode ? 1 : 0,
    borderColor: theme.border,
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
  eyebrowText: {
    color: theme.isDarkMode ? theme.primary : '#0E4F3B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.75,
    textTransform: 'uppercase',
  },
  title: {
    color: theme.isDarkMode ? theme.text : '#0E4F3B',
    fontFamily: Platform.OS === 'web' ? 'Georgia' : 'serif',
    fontSize: compact ? 45 : 66,
    lineHeight: compact ? 48 : 68,
    fontWeight: '700',
    letterSpacing: compact ? -1.8 : -2.4,
    maxWidth: showPlant ? 650 : '100%',
    marginBottom: spacing.sm,
  },
  titleAccent: {
    fontStyle: 'italic',
    fontWeight: '500',
  },
  subtitle: {
    maxWidth: 500,
    color: theme.isDarkMode ? theme.textSecondary : '#244B3B',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  actionButton: {
    minHeight: 68,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 20,
    marginTop: 2,
    borderRadius: borderRadius.full,
    backgroundColor: theme.isDarkMode ? '#292E30' : '#0E4F3B',
    ...Platform.select({
      web: { boxShadow: '0 16px 28px -15px rgba(14,79,59,.9)' },
      default: { elevation: 5 },
    }),
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A9BD9B',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: theme.isDarkMode ? theme.borderStrong : 'rgba(14,79,59,.38)',
    backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.12)',
  },
  chipText: {
    color: theme.isDarkMode ? theme.textSecondary : '#164A38',
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    position: 'absolute',
    top: 20,
    right: 24,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  plant: {
    position: 'absolute',
    width: 300,
    height: 440,
    right: compact ? -60 : 22,
    bottom: -12,
    opacity: compact ? 0.3 : 1,
    zIndex: 1,
  },
  ticker: {
    height: 46,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0E4F3B',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  tickerText: {
    color: theme.isDarkMode ? theme.primary : '#D9E6E0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
