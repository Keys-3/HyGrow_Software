import React, { useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Thermometer,
  Droplets,
  Sun,
  Wind,
  FlaskConical,
  Gauge,
  TrendingDown,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react-native';

import { sensorNote } from '../../../src/utils/telemetry';
import ChartWidget from '../../../src/components/ChartWidget';
import useEffectiveSensorData from '../../../src/hooks/useEffectiveSensorData';
import {
  useThemeColors,
  spacing,
  borderRadius,
  typography,
} from '../../../src/theme/theme';
import PressableScale from '../../../src/components/PressableScale';
import StatusBadge from '../../../src/components/StatusBadge';

import {
  SENSOR_CONFIG,
  SENSOR_THRESHOLDS,
} from '../../../src/utils/constants';

const SENSOR_ICONS = {
  temperature: Thermometer,
  humidity: Droplets,
  water_temperature: Droplets,
  waterTemp: Droplets,
  ph: FlaskConical,
  ec: Gauge,
  tds: Gauge,
  waterLevel: Droplets,
  light: Sun,
  lightIntensity: Sun,
  vpd: Wind,
  co2: Wind,
};

export default function SensorDetailScreen() {
  const router = useRouter();
  const { sensorId } = useLocalSearchParams();
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const { current, history, stale, error, isFallback, isLastKnown } = useEffectiveSensorData();

  const config = SENSOR_CONFIG[sensorId];

  if (!config) {
    return (
      <View style={styles.center}>
        <Text style={{ color: themeColors.text }}>Sensor not found.</Text>
      </View>
    );
  }

  const threshold = SENSOR_THRESHOLDS?.[sensorId];
  const IconComponent = SENSOR_ICONS[sensorId] || Activity;

  const values = history.map((item) => item?.[sensorId]);
  const labels = history.map((item, index) =>
    index % 4 === 0 ? item.time : ''
  );

  const currentValue = current?.[sensorId] ?? null;

  const validValues = values.filter(
    (value) => typeof value === 'number' && Number.isFinite(value)
  );
  const stats = validValues.length
    ? {
        min: Math.min(...validValues),
        max: Math.max(...validValues),
        avg: validValues.reduce((a, b) => a + b, 0) / validValues.length,
      }
    : { min: null, max: null, avg: null };

  const display = (value) =>
    typeof value === 'number' ? value.toFixed(1) : '--';

  const note = sensorNote(current, sensorId, stale);
  let statusType = 'neutral';
  if (note.toLowerCase().includes('optimal') || note.toLowerCase().includes('normal')) {
    statusType = 'success';
  } else if (
    note.toLowerCase().includes('high') ||
    note.toLowerCase().includes('low') ||
    note.toLowerCase().includes('warning')
  ) {
    statusType = 'warning';
  } else if (
    note.toLowerCase().includes('critical') ||
    note.toLowerCase().includes('error')
  ) {
    statusType = 'danger';
  }

  const isWithinThreshold =
    typeof currentValue === 'number' &&
    threshold &&
    currentValue >= threshold.min &&
    currentValue <= threshold.max;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Back Button */}
      <PressableScale
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <ArrowLeft size={16} color={themeColors.text} />
        <Text style={styles.backText}>Dashboard</Text>
      </PressableScale>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.sensorPill,
              { backgroundColor: (config.color || themeColors.primary) + '15' },
            ]}
          >
            <IconComponent
              size={13}
              color={config.color || themeColors.primary}
            />
            <Text
              style={[
                styles.sensorPillText,
                { color: config.color || themeColors.primary },
              ]}
            >
              CHANNEL TELEMETRY
            </Text>
          </View>
        </View>

        <Text style={styles.headerTitle}>{config.label}</Text>
        <Text style={styles.headerDesc}>
          {sensorNote(current, sensorId, stale)} · Real-time crop monitoring
        </Text>
      </View>

      {/* Hero Value Card */}
      <View style={styles.valueCard}>
        <View
          style={[
            styles.valueAccent,
            { backgroundColor: config.color || themeColors.primary },
          ]}
        />
        <View style={styles.valueCardHeader}>
          <Text style={styles.valueLabel}>Current Live Reading</Text>
          <StatusBadge label={note} status={statusType} size="sm" />
        </View>

        <View style={styles.valueMainRow}>
          <Text
            style={[
              styles.currentValue,
              { color: config.color || themeColors.primary },
            ]}
          >
            {display(currentValue)}
          </Text>
          <Text style={styles.currentUnit}>{config.unit}</Text>
        </View>

        {threshold && (
          <View style={styles.thresholdStatusRow}>
            {isWithinThreshold ? (
              <CheckCircle2 size={14} color={themeColors.success} />
            ) : (
              <AlertCircle size={14} color={themeColors.warning} />
            )}
            <Text style={styles.thresholdStatusText}>
              Target Range: {threshold.min} – {threshold.max} {config.unit}{' '}
              {isWithinThreshold ? '(Optimal)' : '(Out of Envelope)'}
            </Text>
          </View>
        )}
      </View>

      {/* Error Callout */}
      {Boolean(error) && !isFallback && (
        <View style={styles.errorBanner}>
          <AlertCircle size={16} color={themeColors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Fallback Simulation Notice */}
      {isFallback && (
        <View style={styles.demoBanner}>
          <Sparkles size={14} color={themeColors.primary} />
          <Text style={styles.demoBannerText}>
            {isLastKnown
              ? 'Displaying last captured sensor observations from your previous session.'
              : 'Sensors are offline. Displaying calibrated baseline curve and sample telemetry.'}
          </Text>
        </View>
      )}

      {/* Chart Widget */}
      <View style={styles.chartContainer}>
        <ChartWidget
          title={`${config.label} Time-Series Trend`}
          data={values}
          labels={labels}
          color={config.color}
          unit={config.unit}
        />
      </View>

      {/* Statistics Grid */}
      <Text style={styles.sectionTitle}>Observation Statistics</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statIconRow}>
            <TrendingDown size={14} color={themeColors.textSecondary} />
            <Text style={styles.statLabel}>Minimum</Text>
          </View>
          <Text style={styles.statValue}>
            {display(stats.min)} {config.unit}
          </Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconRow}>
            <Activity size={14} color={themeColors.primary} />
            <Text style={styles.statLabel}>Average</Text>
          </View>
          <Text style={[styles.statValue, { color: themeColors.primary }]}>
            {display(stats.avg)} {config.unit}
          </Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconRow}>
            <TrendingUp size={14} color={themeColors.textSecondary} />
            <Text style={styles.statLabel}>Maximum</Text>
          </View>
          <Text style={styles.statValue}>
            {display(stats.max)} {config.unit}
          </Text>
        </View>
      </View>

      {/* Recommended Thresholds */}
      {threshold && (
        <>
          <Text style={styles.sectionTitle}>Agronomic Envelope</Text>
          <View style={styles.thresholdCard}>
            <View style={styles.thresholdRow}>
              <Text style={styles.thresholdLabel}>Lower Recommended Bound</Text>
              <Text style={styles.thresholdValue}>
                {threshold.min} {config.unit}
              </Text>
            </View>
            <View style={styles.thresholdDivider} />
            <View style={styles.thresholdRow}>
              <Text style={styles.thresholdLabel}>Upper Recommended Bound</Text>
              <Text style={styles.thresholdValue}>
                {threshold.max} {config.unit}
              </Text>
            </View>
            <View style={styles.thresholdDivider} />
            <View style={styles.thresholdRow}>
              <Text style={styles.thresholdLabel}>Operating State</Text>
              <Text
                style={[
                  styles.thresholdValue,
                  { color: isWithinThreshold ? themeColors.success : themeColors.warning },
                ]}
              >
                {isWithinThreshold ? 'Compliant' : 'Deviation Detected'}
              </Text>
            </View>
          </View>
        </>
      )}

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    content: {
      padding: spacing.lg,
      paddingTop: 56,
      paddingBottom: 48,
      width: '100%',
      maxWidth: 1120,
      alignSelf: 'center',
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.adapt('#191C1E', theme.surface),
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      alignSelf: 'flex-start',
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: theme.adapt('rgba(52, 211, 153, 0.22)', theme.border),
    },
    backText: {
      ...typography.bodySmall,
      color: theme.text,
      fontWeight: '600',
    },
    header: {
      marginBottom: spacing.lg,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    sensorPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
    },
    sensorPillText: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.8,
    },
    headerTitle: {
      ...typography.h1,
      color: theme.text,
      letterSpacing: -0.5,
      marginTop: 4,
    },
    headerDesc: {
      ...typography.body,
      color: theme.textSecondary,
      marginTop: 4,
    },
    valueCard: {
      backgroundColor: theme.adapt('#191C1E', theme.surface),
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      marginBottom: spacing.xl,
      borderWidth: 1,
      borderColor: theme.adapt('rgba(52, 211, 153, 0.22)', theme.border),
      overflow: 'hidden',
      position: 'relative',
      ...Platform.select({
        web: {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        },
      }),
    },
    valueAccent: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: 4,
    },
    valueCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    valueLabel: {
      ...typography.caption,
      color: theme.textMuted,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    valueMainRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
      marginVertical: spacing.xs,
    },
    currentValue: {
      fontSize: 48,
      fontWeight: '800',
      letterSpacing: -1,
    },
    currentUnit: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    thresholdStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    thresholdStatusText: {
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: theme.danger + '15',
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: theme.danger + '30',
    },
    errorText: {
      ...typography.bodySmall,
      color: theme.danger,
      flex: 1,
    },
    demoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: theme.adapt('rgba(16, 185, 129, 0.08)', theme.primaryGlow),
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: theme.adapt('rgba(52, 211, 153, 0.25)', theme.border),
    },
    demoBannerText: {
      ...typography.bodySmall,
      color: theme.adapt('#9CB0A2', theme.textSecondary),
      flex: 1,
      lineHeight: 18,
    },
    chartContainer: {
      backgroundColor: theme.adapt('#191C1E', theme.surface),
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      borderWidth: 1,
      borderColor: theme.adapt('rgba(52, 211, 153, 0.22)', theme.border),
      ...Platform.select({
        web: {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        },
      }),
    },
    sectionTitle: {
      ...typography.h3,
      color: theme.text,
      marginBottom: spacing.md,
      fontWeight: '700',
    },
    statsGrid: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.adapt('#191C1E', theme.surface),
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: theme.adapt('rgba(52, 211, 153, 0.22)', theme.border),
      ...Platform.select({
        web: {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        },
      }),
    },
    statIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginBottom: 6,
    },
    statLabel: {
      ...typography.caption,
      color: theme.textMuted,
      fontWeight: '600',
    },
    statValue: {
      ...typography.body,
      fontWeight: '700',
      color: theme.text,
    },
    thresholdCard: {
      backgroundColor: theme.adapt('#191C1E', theme.surface),
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: theme.adapt('rgba(52, 211, 153, 0.22)', theme.border),
      ...Platform.select({
        web: {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        },
      }),
    },
    thresholdRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.xs,
    },
    thresholdDivider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginVertical: spacing.xs,
    },
    thresholdLabel: {
      ...typography.bodySmall,
      color: theme.textSecondary,
    },
    thresholdValue: {
      ...typography.bodySmall,
      fontWeight: '700',
      color: theme.text,
    },
  });
