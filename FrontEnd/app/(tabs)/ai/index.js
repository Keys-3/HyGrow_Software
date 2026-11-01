import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Bot, Leaf, TrendingUp } from 'lucide-react-native';
import { useThemeColors, spacing, borderRadius, typography, shadows } from '../../../src/theme/theme';
import { GradientText } from '../../../src/components/GradientText';
import useAppStore from '../../../src/store/useAppStore';
import { PageScrollView } from '../../../src/components/layout/PageScrollView';

export default function AIToolsScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const farmerFeatures = useAppStore((state) => state.farmerFeatures);

  return (
    <PageScrollView style={styles.container}>
      <View style={styles.header}>
        <GradientText colors={themeColors.gradients.primary} style={styles.title}>
          🤖 AI Tools
        </GradientText>
        <Text style={styles.subtitle}>Powered by Hugging Face & Advanced LLMs</Text>
      </View>

      <Pressable 
        style={({ pressed }) => [styles.askAiBtnWrap, pressed && styles.pressed]}
        onPress={() => router.push('/(tabs)/ai/ask')}
      >
        <LinearGradient
          colors={['#8B5CF6', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.askAiBtn}
        >
          <View style={styles.btnIconContainer}>
            <Bot color="#fff" size={28} />
          </View>
          <View style={styles.btnTextContainer}>
            <Text style={styles.askAiBtnText}>Ask AI Assistant</Text>
            <Text style={styles.askAiBtnSub}>Get instant answers about your farm</Text>
          </View>
        </LinearGradient>
      </Pressable>

      <View style={styles.divider} />
      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Other Tools</Text>

      {farmerFeatures?.aiTools?.diseaseDetection !== false && (
        <Pressable 
          style={({ pressed }) => [styles.toolBtnWrap, pressed && styles.pressed]}
          onPress={() => router.push('/(tabs)/ai/disease')}
        >
          <View style={[styles.toolBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={[styles.iconCircle, { backgroundColor: '#10B98120' }]}>
              <Leaf color="#10B981" size={24} />
            </View>
            <View style={styles.btnTextContainer}>
              <Text style={[styles.toolBtnText, { color: themeColors.text }]}>Disease Detection</Text>
              <Text style={[styles.toolBtnSub, { color: themeColors.textSecondary }]}>Scan plants for diseases</Text>
            </View>
          </View>
        </Pressable>
      )}

      {farmerFeatures?.aiTools?.yieldPrediction !== false && (
        <Pressable
          style={({ pressed }) => [styles.toolBtnWrap, pressed && styles.pressed]}
          onPress={() => router.push('/(tabs)/ai/yield')}
        >
          <View style={[styles.toolBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={[styles.iconCircle, { backgroundColor: '#A855F720' }]}>
              <TrendingUp color="#A855F7" size={24} />
            </View>
            <View style={styles.btnTextContainer}>
              <Text style={[styles.toolBtnText, { color: themeColors.text }]}>Yield Prediction</Text>
              <Text style={[styles.toolBtnSub, { color: themeColors.textSecondary }]}>Estimate your crop yield</Text>
            </View>
          </View>
        </Pressable>
      )}
    </PageScrollView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: theme.text,
  },
  subtitle: {
    ...typography.body,
    color: theme.textSecondary,
    marginTop: 4,
  },
  askAiBtnWrap: {
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  askAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  btnIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  btnTextContainer: {
    flex: 1,
  },
  askAiBtnText: {
    ...typography.h3,
    color: '#fff',
    marginBottom: 2,
  },
  askAiBtnSub: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  toolBtnWrap: {
    marginBottom: spacing.md,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  toolBtnText: {
    ...typography.h4,
    marginBottom: 2,
  },
  toolBtnSub: {
    ...typography.caption,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
