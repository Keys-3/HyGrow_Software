import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { useThemeColors, spacing, borderRadius, typography } from '../theme/theme';

export default function AlertBanner({ alerts, onDismiss }) {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (alerts && alerts.length > 0) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [alerts, slideAnim]);

  if (!alerts || alerts.length === 0) return null;

  const topAlert = alerts[0];
  const isCritical = topAlert.type === 'critical';
  const bgColor = isCritical ? themeColors.danger + '20' : themeColors.warning + '20';
  const borderColor = isCritical ? themeColors.danger + '80' : themeColors.warning + '80';
  const textColor = isCritical ? themeColors.danger : themeColors.warning;

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
      <View style={[styles.banner, { backgroundColor: bgColor, borderColor }]}>
        <Text style={styles.icon}>{isCritical ? '🚨' : '⚠️'}</Text>
        <View style={styles.content}>
          <Text style={[styles.title, { color: textColor }]}>
            {topAlert.sensorLabel} Alert
          </Text>
          <Text style={styles.message}>{topAlert.message}</Text>
        </View>
        {onDismiss && (
          <Pressable onPress={() => onDismiss(topAlert.id)} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.body,
    fontWeight: '700',
  },
  message: {
    ...typography.bodySmall,
    color: theme.text,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeText: {
    color: theme.textSecondary,
    fontSize: 18,
  },
});
