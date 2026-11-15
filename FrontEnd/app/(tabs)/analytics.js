import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Activity,
  Clock,
  Calendar,
  Info,
  AlertCircle,
  Thermometer,
  Droplets,
  Sun,
  Wind,
  FlaskConical,
  Gauge,
  CheckCircle2,
  Sparkles,
} from 'lucide-react-native';

import { sensorNote } from '../../src/utils/telemetry';
import ChartWidget from '../../src/components/ChartWidget';
import useEffectiveSensorData from '../../src/hooks/useEffectiveSensorData';
import { useThemeColors, spacing, borderRadius, typography } from '../../src/theme/theme';
import { PageScrollView } from '../../src/components/layout/PageScrollView';
import PressableScale from '../../src/components/PressableScale';
import StatusBadge from '../../src/components/StatusBadge';

import {
  SENSOR_KEYS,
  SENSOR_CONFIG,
  SENSOR_THRESHOLDS,
} from '../../src/utils/constants';

const TABS = [
  { key: '24h', label: 'Recent (24h)', icon: Clock },
  { key: '7d', label: 'Historical (7d)', icon: Calendar },
];

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

export default function AnalyticsScreen() {
  const { history, weekly, error, current, stale, isOffline, isFallback, isLastKnown } = useEffectiveSensorData();
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
      values: records.map((item) => item?.[sensorKey]),
      labels: records.map((item, index) => {
        if (selectedTab === '24h') {
          return index % 4 === 0 ? item.time || '' : '';
        }
        return index % 2 === 0 ? item.date || '' : '';
      }),
    };
  };

  // Calculate overall equilibrium
  const optimalSensorsCount = useMemo(() => {
    if (!current) return 0;
    return SENSOR_KEYS.filter((key) => {
      const val = current[key];
      const th = SENSOR_THRESHOLDS[key];
      if (typeof val !== 'number' || !th) return false;
      return val >= th.min && val <= th.max;
    }).length;
  }, [current]);

  return (
    <PageScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Enterprise Header */}
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <View style={styles.liveBadge}>
            <Activity size={12} color="#10B981" />
            <Text style={styles.liveBadgeText}>TELEMETRY & HISTORICAL TRENDS</Text>
          </View>
          <View style={styles.statusPill}>
            <CheckCircle2 size={12} color="#10B981" />
            <Text style={styles.statusPillText}>
              {optimalSensorsCount}/{SENSOR_KEYS.length} In Spec
            </Text>
          </View>
        </View>

        <Text style={styles.title}>
          System Analytics & <Text style={{ color: themeColors.primary }}>Equilibrium</Text>
        </Text>
        <Text style={styles.subtitle}>
          Continuous sensory drift tracking, historical trend curves, and hydroponic nutrient equilibrium.
        </Text>
      </View>

      {/* Visual Analytics Hero Banner */}
      <View style={styles.heroBanner}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80' }}
          style={styles.heroBannerImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(6, 15, 10, 0.25)', 'rgba(6, 15, 10, 0.92)']}
          style={styles.heroBannerOverlay}
        />
        <View style={styles.heroBannerContent}>
          <View style={styles.heroPill}>
            <Sparkles size={11} color="#34D399" />
            <Text style={styles.heroPillText}>CONTINUOUS SENSORY DRIFT MONITORING</Text>
          </View>
          <Text style={styles.heroBannerTitle}>Multi-Channel Environmental Dynamics</Text>
          <Text style={styles.heroBannerSub}>
            Real-time closed-loop sensor telemetry, circadian curves & calibration offsets
          </Text>
        </View>
      </View>

      {/* KPI Ribbon */}
      <View style={styles.kpiRibbon}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Monitored Channels</Text>
          <Text style={styles.kpiValue}>{SENSOR_KEYS.length}</Text>
          <Text style={styles.kpiSub}>Multi-sensor bus</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Data Window</Text>
          <Text style={styles.kpiValue}>{selectedTab === '24h' ? '24 Hours' : '7 Days'}</Text>
          <Text style={styles.kpiSub}>{dataset.length} data samples</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Equilibrium Index</Text>
          <Text style={[styles.kpiValue, { color: themeColors.primary }]}>
            {Math.round((optimalSensorsCount / SENSOR_KEYS.length) * 100)}%
          </Text>
          <Text style={styles.kpiSub}>Within target envelope</Text>
        </View>
      </View>

      {/* Segmented Control Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedTab === tab.key;
          return (
            <PressableScale
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              style={[
                styles.tab,
                isActive && styles.tabActive,
              ]}
              onPress={() => setSelectedTab(tab.key)}
            >
              <Icon
                size={15}
                color={isActive ? themeColors.primary : themeColors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  isActive && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      {/* Error Callout if any */}
      {Boolean(error) && !isFallback && (
        <View style={styles.errorBanner}>
          <AlertCircle size={16} color={themeColors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Fallback Telemetry Simulation Notice */}
      {isFallback && (
        <View style={styles.demoBanner}>
          <Sparkles size={16} color={themeColors.primary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.demoBannerTitle}>
              {isLastKnown ? 'Showing Last Recorded Session Trends' : 'Hardware In Standby — Calibrated Simulation Active'}
            </Text>
            <Text style={styles.demoBannerText}>
              {isLastKnown
                ? 'Sensors are currently offline. Analytics are rendered using your last recorded telemetry packet.'
                : 'Sensors are disconnected. Displaying 24h & 7d calibrated environmental curves across all channels.'}
            </Text>
          </View>
        </View>
      )}

      {/* Metadata Info Callout */}
      <View style={styles.infoBanner}>
        <Info size={15} color={themeColors.textSecondary} style={{ marginTop: 2 }} />
        <Text style={styles.infoText}>
          Samples include hardware compensation and sensor calibrations. Time-series charts display gaps when node hardware is sleeping or offline.
        </Text>
      </View>

      {/* Sensor Chart Cards */}
      <View style={styles.chartsGrid}>
        {SENSOR_KEYS.map((sensor) => {
          const config = SENSOR_CONFIG[sensor] || {
            label: sensor,
            unit: '',
            color: themeColors.primary,
          };
          const chart = createChartData(sensor);
          const IconComponent = SENSOR_ICONS[sensor] || Activity;
          const note = sensorNote(current, sensor, stale);
          const liveVal = current?.[sensor];
          const displayVal = typeof liveVal === 'number' ? liveVal.toFixed(1) : '--';

          let statusType = 'neutral';
          if (note.toLowerCase().includes('optimal') || note.toLowerCase().includes('normal')) {
            statusType = 'success';
          } else if (note.toLowerCase().includes('high') || note.toLowerCase().includes('low') || note.toLowerCase().includes('warning')) {
            statusType = 'warning';
          } else if (note.toLowerCase().includes('critical') || note.toLowerCase().includes('error')) {
            statusType = 'danger';
          }

          return (
            <View key={sensor} style={styles.chartCard}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleGroup}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: (config.color || themeColors.primary) + '15' },
                    ]}
                  >
                    <IconComponent
                      size={18}
                      color={config.color || themeColors.primary}
                    />
                  </View>
                  <View>
                    <Text style={styles.sensorTitle}>{config.label}</Text>
                    <Text style={styles.sensorUnitLabel}>Telemetry channel · {config.unit || 'Standard'}</Text>
                  </View>
                </View>

                <View style={styles.cardHeaderRight}>
                  <View style={styles.liveValueBadge}>
                    <Text style={[styles.liveValueText, { color: config.color || themeColors.primary }]}>
                      {displayVal}
                    </Text>
                    <Text style={styles.liveValueUnit}>{config.unit}</Text>
                  </View>
                  <StatusBadge
                    label={note}
                    status={statusType}
                    size="sm"
                  />
                </View>
              </View>

              {/* Chart Body */}
              <View style={styles.chartBody}>
                <ChartWidget
                  data={chart.values}
                  labels={chart.labels}
                  color={config.color}
                  unit={config.unit}
                />
              </View>
            </View>
          );
        })}
      </View>
    </PageScrollView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      padding: spacing.lg,
      paddingBottom: 48,
    },
    header: {
      marginBottom: spacing.lg,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.25)',
      alignSelf: 'flex-start',
    },
    liveBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: '#34D399',
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.20)',
    },
    statusPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#10B981',
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: '#F8FAF8',
      letterSpacing: -0.8,
      marginTop: 2,
    },
    subtitle: {
      fontSize: 14,
      color: '#9CB0A2',
      marginTop: 4,
      lineHeight: 20,
    },
    heroBanner: {
      marginBottom: spacing.lg,
      height: 130,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      position: 'relative',
      borderWidth: 1,
      borderColor: 'rgba(52, 211, 153, 0.25)',
    },
    heroBannerImage: {
      width: '100%',
      height: '100%',
    },
    heroBannerOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    heroBannerContent: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      bottom: spacing.md,
    },
    heroPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 9999,
      alignSelf: 'flex-start',
      marginBottom: 6,
      borderWidth: 1,
      borderColor: 'rgba(52, 211, 153, 0.35)',
    },
    heroPillText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#34D399',
      letterSpacing: 0.6,
    },
    heroBannerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#F8FAF8',
      letterSpacing: -0.3,
    },
    heroBannerSub: {
      fontSize: 12,
      color: '#A7F3D0',
      marginTop: 2,
      fontWeight: '500',
    },
    kpiRibbon: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    kpiCard: {
      flex: 1,
      backgroundColor: '#0E1A13',
      borderRadius: 14,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: 'rgba(52, 211, 153, 0.22)',
      ...Platform.select({
        web: {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        },
      }),
    },
    kpiLabel: {
      ...typography.caption,
      color: theme.textMuted,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    kpiValue: {
      ...typography.h2,
      color: theme.text,
      marginVertical: 2,
      fontWeight: '700',
    },
    kpiSub: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceLight,
      borderRadius: borderRadius.lg,
      padding: 4,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      minHeight: 40,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.sm,
    },
    tabActive: {
      backgroundColor: theme.cardBackground,
      ...Platform.select({
        web: {
          boxShadow: '0 2px 6px rgba(10, 77, 60, 0.08)',
        },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
        },
      }),
    },
    tabText: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    tabTextActive: {
      color: theme.primary,
      fontWeight: '700',
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: theme.danger + '15',
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: theme.danger + '30',
    },
    errorText: {
      ...typography.bodySmall,
      color: theme.danger,
      flex: 1,
      fontWeight: '500',
    },
    demoBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: 'rgba(52, 211, 153, 0.25)',
    },
    demoBannerTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: '#34D399',
      marginBottom: 2,
    },
    demoBannerText: {
      ...typography.bodySmall,
      color: '#9CB0A2',
      lineHeight: 18,
    },
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: theme.surfaceLight,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
    },
    infoText: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      flex: 1,
      lineHeight: 18,
    },
    chartsGrid: {
      gap: spacing.lg,
    },
    chartCard: {
      backgroundColor: '#0E1A13',
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: 'rgba(52, 211, 153, 0.22)',
      ...Platform.select({
        web: {
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        },
      }),
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    cardTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sensorTitle: {
      ...typography.h3,
      color: theme.text,
      fontWeight: '700',
    },
    sensorUnitLabel: {
      ...typography.caption,
      color: theme.textMuted,
      marginTop: 2,
    },
    cardHeaderRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
    liveValueBadge: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 3,
    },
    liveValueText: {
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    liveValueUnit: {
      ...typography.caption,
      color: theme.textMuted,
      fontWeight: '600',
    },
    chartBody: {
      marginTop: spacing.xs,
    },
  });
