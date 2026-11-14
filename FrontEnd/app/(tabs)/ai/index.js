import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Bot, Leaf, TrendingUp, Sparkles, ChevronRight, BrainCircuit } from 'lucide-react-native';
import { useThemeColors, spacing, borderRadius, typography, shadows } from '../../../src/theme/theme';
import { GradientText } from '../../../src/components/GradientText';
import useAppStore from '../../../src/store/useAppStore';
import { PageScrollView } from '../../../src/components/layout/PageScrollView';
import { PressableScale } from '../../../src/components/PressableScale';
import { GlassCard } from '../../../src/components/GlassCard';

export default function AIToolsScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const farmerFeatures = useAppStore((state) => state.farmerFeatures);

  return (
    <PageScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Sparkles size={14} color={themeColors.primary} />
          <Text style={styles.headerBadgeText}>INTELLIGENT CROP ADVISORY</Text>
        </View>
        <GradientText colors={themeColors.gradients.primary} style={styles.title}>
          AI Agronomy Suite
        </GradientText>
        <Text style={styles.subtitle}>
          Deep learning models powered by Hugging Face, real-time farm sensor fusion & vision analysis
        </Text>
      </View>

      {/* Primary Hero Tool: Ask AI Assistant */}
      <PressableScale
        style={styles.askAiBtnWrap}
        onPress={() => router.push('/(tabs)/ai/ask')}
        activeScale={0.98}
      >
        <LinearGradient
          colors={['#6366F1', '#8B5CF6', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.askAiBtn}
        >
          <View style={styles.btnIconContainer}>
            <Bot color="#FFFFFF" size={30} strokeWidth={2.2} />
          </View>
          <View style={styles.btnTextContainer}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>RECOMMENDED</Text>
            </View>
            <Text style={styles.askAiBtnText}>Ask AI Agronomist</Text>
            <Text style={styles.askAiBtnSub}>
              Diagnostic recommendations, nutrient dosing recipes, and crop queries
            </Text>
          </View>
          <View style={styles.arrowCircle}>
            <ChevronRight size={20} color="#FFFFFF" />
          </View>
        </LinearGradient>
      </PressableScale>

      <View style={styles.divider} />
      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Specialized Diagnostics</Text>

      {farmerFeatures?.aiTools?.diseaseDetection !== false && (
        <PressableScale
          style={styles.toolBtnWrap}
          onPress={() => router.push('/(tabs)/ai/disease')}
          activeScale={0.98}
        >
          <GlassCard style={styles.toolCard} glowColor="#10B981">
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Leaf color="#10B981" size={24} />
            </View>
            <View style={styles.btnTextContainer}>
              <Text style={[styles.toolBtnText, { color: themeColors.text }]}>Foliar Disease Scanner</Text>
              <Text style={[styles.toolBtnSub, { color: themeColors.textSecondary }]}>
                Computer-vision analysis to identify leaf pathogens, blights & deficiencies
              </Text>
            </View>
            <ChevronRight size={18} color={themeColors.textMuted} />
          </GlassCard>
        </PressableScale>
      )}

      {farmerFeatures?.aiTools?.yieldPrediction !== false && (
        <PressableScale
          style={styles.toolBtnWrap}
          onPress={() => router.push('/(tabs)/ai/yield')}
          activeScale={0.98}
        >
          <GlassCard style={styles.toolCard} glowColor="#A855F7">
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <TrendingUp color="#A855F7" size={24} />
            </View>
            <View style={styles.btnTextContainer}>
              <Text style={[styles.toolBtnText, { color: themeColors.text }]}>Yield Forecast Engine</Text>
              <Text style={[styles.toolBtnSub, { color: themeColors.textSecondary }]}>
                Predict harvest weights and growth velocity from environmental metrics
              </Text>
            </View>
            <ChevronRight size={18} color={themeColors.textMuted} />
          </GlassCard>
        </PressableScale>
      )}
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
      backgroundColor: theme.primary + '18',
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      marginBottom: 10,
    },
    headerBadgeText: {
      color: theme.primary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    title: {
      ...typography.h1,
      color: theme.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      ...typography.body,
      color: theme.textSecondary,
      marginTop: 6,
      lineHeight: 22,
      maxWidth: 540,
    },
    askAiBtnWrap: {
      marginBottom: spacing.xl,
      borderRadius: 20,
      overflow: 'hidden',
      ...Platform.select({
        web: {
          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
        },
        default: {
          shadowColor: '#6366F1',
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
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
    askAiBtnText: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.3,
      marginBottom: 4,
    },
    askAiBtnSub: {
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.85)',
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
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: -0.2,
      marginBottom: spacing.md,
      textTransform: 'uppercase',
    },
    toolBtnWrap: {
      marginBottom: spacing.md,
    },
    toolCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: 16,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
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
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: -0.2,
      marginBottom: 2,
    },
    toolBtnSub: {
      fontSize: 12,
      lineHeight: 16,
    },
  });
