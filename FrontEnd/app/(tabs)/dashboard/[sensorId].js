import React, { useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { sensorNote } from '../../../src/utils/telemetry';
import ChartWidget from '../../../src/components/ChartWidget';
import useSensorData from '../../../src/hooks/useSensorData';

import {
  useThemeColors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from '../../../src/theme/theme';

import {
  SENSOR_CONFIG,
  SENSOR_THRESHOLDS,
} from '../../../src/utils/constants';

export default function SensorDetailScreen() {
  const router = useRouter();
  const { sensorId } = useLocalSearchParams();
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const { current, history, stale, error } = useSensorData();

  const config = SENSOR_CONFIG[sensorId];

  if (!config) {
    return (
      <View style={styles.center}>
        <Text style={{ color: themeColors.text }}>Sensor not found.</Text>
      </View>
    );
  }

  const threshold = SENSOR_THRESHOLDS?.[sensorId];

  const values = history
    .map((item) => item?.[sensorId]);

  const labels = history.map((item, index) =>
    index % 4 === 0 ? item.time : ''
  );

  const currentValue =
    current?.[sensorId] ?? null;

  const validValues = values.filter(value => typeof value === 'number' && Number.isFinite(value));
  const stats = validValues.length ? {
    min:Math.min(...validValues), max:Math.max(...validValues),
    avg:validValues.reduce((a,b) => a+b,0)/validValues.length,
  } : {min:null,max:null,avg:null};
  const display = value => typeof value === 'number' ? value.toFixed(1) : '--';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backText}>
          ← Back
        </Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: config.color }]}>
          {config.label}
        </Text>

        <Text style={[styles.headerDesc, { color: config.color, opacity: 0.8 }]}>
          {sensorNote(current,sensorId,stale)}
        </Text>
      </View>

      <View style={styles.valueCard}>
        <Text style={styles.valueLabel}>
          Current Reading
        </Text>

        <Text
          style={[
            styles.currentValue,
            {
              color: config.color,
            },
          ]}
        >
          {display(currentValue)}
        </Text>

        <Text style={[styles.currentUnit, { color: config.color, opacity: 0.8 }]}>
          {config.unit}
        </Text>
      </View>

      {error && <Text style={styles.headerDesc}>{error}</Text>}
      <ChartWidget
        title={`${config.label} Trend`}
        data={values}
        labels={labels}
        color={config.color}
        unit={config.unit}
        height={240}
      />

      <Text style={[styles.sectionTitle, { color: config.color }]}>
        Statistics
      </Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>
            Minimum
          </Text>

          <Text style={[styles.statValue, { color: config.color }]}>
            {display(stats.min)}
            {config.unit}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>
            Average
          </Text>

          <Text style={[styles.statValue, { color: config.color }]}>
            {display(stats.avg)}
            {config.unit}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>
            Maximum
          </Text>

          <Text style={[styles.statValue, { color: config.color }]}>
            {display(stats.max)}
            {config.unit}
          </Text>
        </View>
      </View>

      {threshold && (
        <>
          <Text style={[styles.sectionTitle, { color: config.color }]}>
            Recommended Range
          </Text>

          <View style={styles.thresholdCard}>
            <View style={styles.thresholdRow}>
              <Text style={styles.thresholdLabel}>
                Minimum
              </Text>

              <Text style={[styles.thresholdValue, { color: config.color }]}>
                {threshold.min} {config.unit}
              </Text>
            </View>

            <View style={styles.thresholdRow}>
              <Text style={styles.thresholdLabel}>
                Maximum
              </Text>

              <Text style={[styles.thresholdValue, { color: config.color }]}>
                {threshold.max} {config.unit}
              </Text>
            </View>
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    padding: spacing.lg,
    paddingTop: 60,
  },

  header: {
    marginBottom: spacing.lg,
  },

  backButton: {
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },

  backText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },

  headerTitle: {
    ...typography.h1,
    marginBottom: 6,
    color: colors.text,
  },

  headerDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  valueCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    ...shadows.card,
  },

  valueAccent: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 5,
  },

  valueLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
    color: colors.textSecondary,
  },

  currentValue: {
    fontSize: 48,
    fontWeight: '700',
  },

  currentUnit: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },

  statusText: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.text,
  },

  rangeText: {
    ...typography.caption,
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },

  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
    color: colors.text,
  },

  chartContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    ...shadows.card,
  },

  emptyChartCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },

  emptyChartText: {
    ...typography.body,
    color: colors.textSecondary,
  },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },

  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginHorizontal: 4,
    ...shadows.small,
  },

  statLabel: {
    ...typography.caption,
    marginBottom: 6,
    color: colors.textSecondary,
  },

  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },

  thresholdCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  thresholdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },

  thresholdLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },

  thresholdValue: {
    fontWeight: '700',
    color: colors.text,
  },
});