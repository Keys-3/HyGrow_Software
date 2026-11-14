import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Thermometer,
  Droplets,
  FlaskConical,
  Zap,
  Waves,
  Sun,
  Cloud,
  ThermometerSnow,
  Wind,
} from 'lucide-react-native';
import { useThemeColors, spacing, borderRadius, shadows, typography } from '../theme/theme';
import { getSensorStatus, getStatusColor, getStatusLabel } from '../utils/helpers';
import PressableScale from './PressableScale';
import StatusBadge from './StatusBadge';

const SENSOR_ICONS = {
  temperature: Thermometer,
  humidity: Droplets,
  ph: FlaskConical,
  ec: Zap,
  tds: Zap,
  waterLevel: Waves,
  lightIntensity: Sun,
  vpd: Cloud,
  waterTemp: ThermometerSnow,
  co2: Wind,
};

export default function SensorCard({
  sensorKey,
  value,
  unit,
  label,
  icon,
  color = '#10B981',
  gradient,
  onPress,
  sparklineData,
  provenance,
  stale = false,
}) {
  const theme = useThemeColors();
  const styles = createStyles(theme);

  const available = typeof value === 'number' && Number.isFinite(value);
  const status = !available || stale || provenance ? 'unknown' : getSensorStatus(sensorKey, value);
  const statusColor = getStatusColor(status, theme);
  const IconComponent = SENSOR_ICONS[sensorKey] || Thermometer;

  const maxSparkline =
    sparklineData && sparklineData.length > 0
      ? Math.max(...sparklineData.filter((v) => typeof v === 'number' && Number.isFinite(v)), 1)
      : 1;

  const cardGradient: [string, string] = theme.cardGradients?.[sensorKey] || [
    theme.surface,
    theme.surfaceLight,
  ];

  return (
    <PressableScale onPress={onPress} style={styles.cardContainer}>
      <LinearGradient
        colors={cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            borderColor: `${color}25`,
          },
        ]}
      >
        {/* Top Accent Gradient Line */}
        <LinearGradient
          colors={gradient || [color, `${color}40`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.accentLine}
        />

        {/* Ambient Watermark Icon for Depth */}
        <View style={styles.watermarkContainer} pointerEvents="none">
          <IconComponent
            color={color}
            size={88}
            opacity={0.06}
            style={{ transform: [{ rotate: '-12deg' }] }}
          />
        </View>

        {/* Header: Icon badge & Status badge */}
        <View style={styles.header}>
          <View style={[styles.iconBadge, { backgroundColor: `${color}18` }]}>
            <IconComponent color={color} size={18} strokeWidth={2.2} />
          </View>
          <StatusBadge
            label={provenance || (stale ? 'Stale' : !available ? 'Offline' : getStatusLabel(status))}
            status={status === 'normal' ? 'normal' : status === 'warning' ? 'warning' : status === 'critical' ? 'critical' : 'offline'}
            pulse={status === 'normal' && available}
            customColor={status !== 'normal' ? statusColor : undefined}
          />
        </View>

        {/* Sensor Label */}
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>

        {/* Metric Value */}
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color }]}>
            {value !== undefined && value !== null ? value : '--'}
          </Text>
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        </View>

        {/* Sparkline Visual */}
        {sparklineData && sparklineData.length > 0 && (
          <View style={styles.sparklineContainer}>
            <View style={styles.sparkline}>
              {sparklineData.map((val, i) => {
                const isValid = typeof val === 'number' && Number.isFinite(val);
                const heightPercent = isValid ? Math.max(12, Math.min(100, (val / maxSparkline) * 100)) : 10;
                return (
                  <View
                    key={i}
                    style={[
                      styles.sparklineBar,
                      {
                        height: `${heightPercent}%`,
                        backgroundColor: i === sparklineData.length - 1 ? color : `${color}40`,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        )}
      </LinearGradient>
    </PressableScale>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    cardContainer: {
      flex: 1,
      minWidth: '45%',
      marginBottom: spacing.md,
    },
    card: {
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: theme.surface,
      ...shadows.card,
    },
    accentLine: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
    },
    watermarkContainer: {
      position: 'absolute',
      right: -12,
      bottom: -16,
      zIndex: 0,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
      zIndex: 1,
    },
    iconBadge: {
      width: 34,
      height: 34,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    label: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      fontWeight: '500',
      marginBottom: 4,
      zIndex: 1,
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      zIndex: 1,
    },
    value: {
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.8,
    },
    unit: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textMuted,
      marginLeft: 4,
    },
    sparklineContainer: {
      marginTop: spacing.md,
      height: 28,
      justifyContent: 'flex-end',
      zIndex: 1,
    },
    sparkline: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      height: '100%',
      gap: 3,
    },
    sparklineBar: {
      flex: 1,
      borderRadius: 2,
    },
  });
