import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { sensorNote } from '../../src/utils/telemetry';
import ChartWidget from '../../src/components/ChartWidget';
import useSensorData from '../../src/hooks/useSensorData';

import { useThemeColors, spacing, borderRadius, typography, shadows } from '../../src/theme/theme';
import { GradientText } from '../../src/components/GradientText';
import { PageScrollView } from '../../src/components/layout/PageScrollView';

import {
  SENSOR_KEYS,
  SENSOR_CONFIG,
} from '../../src/utils/constants';

const TABS = [
  { key: '24h', label: 'Recent observations' },
  { key: '7d', label: 'Session observations' },
];

export default function AnalyticsScreen() {
  const { history, weekly, error, current, stale } = useSensorData();
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const [selectedTab, setSelectedTab] = useState('24h');

  const dataset = useMemo(() => {
    return (selectedTab === '24h' ? history : weekly) || [];
  }, [selectedTab, history, weekly]);

  const createChartData = (sensorKey) => {
    const records =
      selectedTab === '24h'
        ? dataset.slice(-20)
        : dataset;

    return {
      values: records
        .map((item) => item?.[sensorKey]),

      labels: records.map((item, index) => {
        if (selectedTab === '24h') {
          return index % 4 === 0
            ? item.time || ''
            : '';
        }

        return index % 2 === 0
          ? item.date || ''
          : '';
      }),
    };
  };

  return (
    <PageScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.primary }]}>
          📊 Analytics
        </Text>
        <Text style={styles.subtitle}>
          Observed samples this session (up to 100). Gaps are unavailable readings.
        </Text>
      </View>

      <LinearGradient colors={themeColors.cardGradients.default} style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedTab === tab.key }}
            style={[
              styles.tab,
              selectedTab === tab.key && { backgroundColor: themeColors.primary + '40' },
            ]}
            onPress={() => setSelectedTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab.key && { color: themeColors.primary, fontWeight: '700' },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </LinearGradient>

      {error && <Text style={styles.subtitle}>{error}</Text>}
      <Text style={styles.subtitle}>Simulation and compensation metadata remain attached to samples; charts reset when simulation changes.</Text>
      {SENSOR_KEYS.map((sensor, index) => {
          const config = SENSOR_CONFIG[sensor];
          const chart = createChartData(sensor);
          const gradient = themeColors.gradients[sensor] || themeColors.gradients.primary;

          return (
            <LinearGradient
              key={sensor}
              colors={themeColors.cardGradients.default}
              style={[styles.chartWrapper, { borderColor: config.color + '40' }]}
            >
              <ChartWidget
                title={`${config.label} · ${sensorNote(current,sensor,stale)}`}
                data={chart.values}
                labels={chart.labels}
                color={config.color}
                unit={config.unit}
              />
            </LinearGradient>
          );
        })}

    </PageScrollView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.body,
    color: theme.textSecondary,
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: theme.border,
    ...shadows.small,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  tabText: {
    textAlign: 'center',
    ...typography.bodySmall,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  chartWrapper: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    ...shadows.card,
  },
  emptyContainer: {
    padding: 30,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  emptyText: {
    ...typography.body,
    color: theme.textSecondary,
  },
});
