import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Bot, Leaf, TrendingUp, Sparkles, ChevronRight } from 'lucide-react-native';
import { useThemeColors, spacing, borderRadius, typography, shadows } from '../../../src/theme/theme';
import { GradientText } from '../../../src/components/GradientText';
import useAppStore from '../../../src/store/useAppStore';
import { PageScrollView } from '../../../src/components/layout/PageScrollView';
import { PressableScale } from '../../../src/components/PressableScale';
import { GlassCard } from '../../../src/components/GlassCard';
import { SagePageHero } from '../../../src/components/SagePageHero';
import { SageFeatureCards } from '../../../src/components/SageFeatureCards';

const AI_PAGE_DATA = { diseaseConfidence: 91, yieldForecastKg: 248 };

export default function AIToolsScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const farmerFeatures = useAppStore((state) => state.farmerFeatures);
  const featureCards = [
    farmerFeatures?.aiTools?.diseaseDetection !== false && {
      tag: 'Computer vision',
      title: 'Foliar Disease Scanner',
      description: 'Diagnostic recommendations, nutrient dosing recipes, and crop queries.',
      graphic: 'scan',
      metric: AI_PAGE_DATA.diseaseConfidence,
      unit: '%',
      onPress: () => router.push('/(tabs)/ai/disease'),
    },
    farmerFeatures?.aiTools?.yieldPrediction !== false && {
      tag: 'Predictive ML',
      title: 'Yield Forecast Engine',
      description: 'Deep learning models powered by Hugging Face, real-time farm sensor fusion & vision analysis.',
      graphic: 'yield',
      metric: AI_PAGE_DATA.yieldForecastKg,
      unit: ' kg',
      onPress: () => router.push('/(tabs)/ai/yield'),
    },
  ].filter(Boolean);

  return (
    <PageScrollView style={styles.container}>
      <SagePageHero
        eyebrow="Intelligent crop advisory"
        title="AI Agronomy"
        titleAccent="& Vision"
        subtitle="Diagnostic recommendations, nutrient dosing recipes, and crop queries."
        actionLabel="Ask AI Agronomist"
        actionIcon={<Bot color="#0E4F3B" size={24} strokeWidth={2.1} />}
        onAction={() => router.push('/(tabs)/ai/ask')}
        chips={['Diagnostics', 'Nutrient dosing', 'Crop queries']}
        scene="ai"
        tickerItems={['Hugging Face', 'Sensor fusion', 'Vision analysis']}
      />

      <View style={styles.divider} />
      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Specialized diagnostics</Text>
      <SageFeatureCards cards={featureCards} />
    </PageScrollView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      marginBottom: spacing.xl,
    },
    headerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.adapt('rgba(16, 185, 129, 0.12)', theme.primaryGlow),
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: theme.adapt('rgba(16, 185, 129, 0.25)', theme.border),
      marginBottom: 10,
    },
    headerBadgeText: {
      color: theme.adapt('#34D399', theme.primaryLight),
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.adapt('#F8FAF8', theme.text),
      letterSpacing: -0.8,
    },
    subtitle: {
      fontSize: 15,
      color: theme.adapt('#9CB0A2', theme.textSecondary),
      marginTop: 4,
      lineHeight: 20,
      maxWidth: 540,
    },
    askAiBtnWrap: {
      marginBottom: spacing.xl,
      borderRadius: 20,
      overflow: 'hidden',
      ...Platform.select({
        web: {
          boxShadow: theme.adapt('0 8px 24px rgba(0, 0, 0, 0.3)', '0 8px 24px rgba(105, 123, 91, 0.2)'),
        },
        default: {
          shadowColor: theme.adapt('#000000', theme.secondaryDark),
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 18,
          elevation: 6,
        },
      }),
    },
    askAiBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      borderRadius: 20,
    },
    btnIconContainer: {
      width: 54,
      height: 54,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    btnTextContainer: {
      flex: 1,
    },
    heroPill: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginBottom: 4,
    },
    heroPillText: {
      color: theme.adapt('#FFFFFF', theme.primaryDark),
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
    askAiBtnText: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.adapt('#FFFFFF', theme.primaryDark),
      letterSpacing: -0.3,
      marginBottom: 4,
    },
    askAiBtnSub: {
      fontSize: 14,
      color: theme.adapt('rgba(255, 255, 255, 0.85)', theme.primaryDark),
      lineHeight: 18,
    },
    arrowCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: spacing.sm,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: -0.2,
      marginBottom: spacing.md,
      textTransform: 'uppercase',
    },
    toolBtnWrap: {
      marginBottom: spacing.md,
      flexBasis: '100%',
    },
    toolBtnWrapWide: {
      flexBasis: '48.8%',
    },
    toolsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    toolCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      gap: spacing.md,
      ...Platform.select({
        web: {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        },
      }),
    },
    toolCardContent: {
      minHeight: 132,
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      gap: spacing.md,
    },
    toolGraphic: {
      width: 62,
      height: 62,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    forecastGraphic: {
      backgroundColor: 'rgba(168, 85, 247, 0.12)',
    },
    toolPillRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 3,
    },
    iconCircleSmall: {
      width: 20,
      height: 20,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolPillText: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.adapt('#34D399', theme.primaryLight),
      letterSpacing: 0.6,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    toolBtnText: {
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: -0.2,
      marginBottom: 2,
    },
    toolBtnSub: {
      fontSize: 13,
      lineHeight: 16,
    },
  });
