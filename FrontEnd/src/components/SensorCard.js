import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useThemeColors, spacing, borderRadius, shadows, typography } from '../theme/theme';
import { getSensorStatus, getStatusColor, getStatusLabel } from '../utils/helpers';

export default function SensorCard({ sensorKey, value, unit, label, icon, color, gradient, onPress, sparklineData, provenance, stale = false }) {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const available = typeof value === 'number' && Number.isFinite(value);
  const status = !available || stale || provenance ? 'unknown' : getSensorStatus(sensorKey,value);
  const statusColor = getStatusColor(status, themeColors);
  
  const emoji = sensorKey === 'temperature' ? '🌡️' :
                sensorKey === 'humidity' ? '💧' :
                sensorKey === 'ph' ? '🧪' :
                sensorKey === 'ec' ? '⚡' : '🪣';

  const maxSparkline = sparklineData && sparklineData.length > 0 ? Math.max(...sparklineData.filter(value => typeof value === 'number' && Number.isFinite(value)), 1) : 1;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { borderColor: color + '30' },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.accentLine, { backgroundColor: color }]} />
      
      <View style={styles.header}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </View>

      <Text style={[styles.value, { color }]}>
        {value !== undefined && value !== null ? value : '--'}
        <Text style={styles.unit}> {unit}</Text>
      </Text>

      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.statusText, { color: statusColor }]}>
        {provenance || (stale ? 'Stale' : !available ? 'Unavailable' : getStatusLabel(status))}
      </Text>

      {sparklineData && sparklineData.length > 0 && (
        <View style={styles.sparkline}>
          {sparklineData.map((val, i) => (
            <View
              key={i}
              style={[
                styles.sparklineBar,
                {
                  height: typeof val === 'number' && Number.isFinite(val) ? Math.max(4,(val/maxSparkline)*24) : 0,
                  backgroundColor: color + (i === sparklineData.length - 1 ? 'FF' : '60'),
                },
              ]}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
}

const createStyles = (theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.card,
    flex: 1,
    minWidth: '45%', // Ensure 2 columns
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emoji: {
    fontSize: 24,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 2,
  },
  unit: {
    fontSize: 14,
    fontWeight: '400',
  },
  label: {
    ...typography.bodySmall,
    fontSize: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginTop: spacing.sm,
    height: 28,
  },
  sparklineBar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 0,
  },
});
