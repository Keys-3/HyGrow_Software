import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useThemeColors, spacing, borderRadius, typography } from '../theme/theme';

export default function ActuatorControl({ isOn, autoMode, onToggle, onAutoModeToggle }) {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.label}>💧 Water Pump</Text>
          <Text style={[styles.status, { color: isOn ? themeColors.success : themeColors.textMuted }]}>
            Physical control unavailable
          </Text>
        </View>
        <Switch
          value={isOn === true}

          trackColor={{ false: themeColors.surfaceLight, true: themeColors.primary + '60' }}
          thumbColor={isOn ? themeColors.primary : themeColors.textMuted}
          disabled={true}
        />
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.label}>🤖 Auto Mode</Text>
          <Text style={styles.rule}>Automation is not reported by this firmware.</Text>
        </View>
        <Switch
          value={autoMode === true}
          disabled={true}
          trackColor={{ false: themeColors.surfaceLight, true: themeColors.info + '60' }}
          thumbColor={autoMode ? themeColors.info : themeColors.textMuted}
        />
      </View>
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  info: {
    flex: 1,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: theme.text,
  },
  status: {
    ...typography.bodySmall,
    marginTop: 2,
    fontWeight: '500',
  },
  rule: {
    ...typography.caption,
    marginTop: 4,
    color: theme.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: spacing.sm,
  },
});
