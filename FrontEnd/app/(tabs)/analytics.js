import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
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
import { useMultiSensorSets } from '../../src/hooks/useMultiSensorSets';
import { useThemeColors, spacing, borderRadius, typography } from '../../src/theme/theme';
import { PageScrollView } from '../../src/components/layout/PageScrollView';
import PressableScale from '../../src/components/PressableScale';
import StatusBadge from '../../src/components/StatusBadge';
import { SagePageHero } from '../../src/components/SagePageHero';
import { SageFeatureCards } from '../../src/components/SageFeatureCards';

import {
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
  const {
    sensorSets, activeSensorSetId, activeSet, setActiveSensorSetId,
    activeTelemetry: current, history, error, stale, visibleSensorKeys,
  } = useMultiSensorSets();
  const isFallback = !current || stale;
  const themeColors = useThemeColors();
  const { width: viewportWidth } = useWindowDimensions();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const [selectedTab, setSelectedTab] = useState('24h');

  const dataset = useMemo(() => {
    const cutoff = Date.now() - (selectedTab === '24h' ? 1 : 7) * 86400000;
    return history.filter((point) => point.observedAt >= cutoff);
  }, [selectedTab, history]);

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
    return visibleSensorKeys.filter((key) => {
      const val = current[key];
      const th = activeSet.thresholds[key] || SENSOR_THRESHOLDS[key];
      if (typeof val !== 'number' || !th) return false;
      return val >= th.min && val <= th.max;
    }).length;
  }, [current, visibleSensorKeys, activeSet]);
  const equilibriumPercent = visibleSensorKeys.length
    ? Math.round((optimalSensorsCount / visibleSensorKeys.length) * 100)
    : 0;

  return (
    <PageScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <SagePageHero
        eyebrow="Telemetry & historical trends"
        title="System Analytics"
        titleAccent="& Equilibrium"
        subtitle="Track sensor drift, historical trends, and hydroponic nutrient balance across every channel."
        actionLabel="View 7-day trends"
        actionIcon={<Calendar color="#0E4F3B" size={21} />}
        onAction={() => setSelectedTab('7d')}
        scene="analytics"
        tickerItems={visibleSensorKeys.map((key) => SENSOR_CONFIG[key]?.label || key)}
        sceneData={{ score: `${equilibriumPercent}%` }}
        chips={[`${optimalSensorsCount}/${visibleSensorKeys.length} sensors in spec`, selectedTab === '24h' ? '24-hour trends' : '7-day trends', isFallback ? 'Waiting for fresh readings' : 'Live telemetry']}
      />

      <View style={styles.setSelector}>
        <Text style={styles.setSelectorLabel}>Sensor sets</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.setOptions}>
          {sensorSets.map((set) => (
            <Pressable key={set.id} accessibilityRole="tab" accessibilityLabel={set.name}
              accessibilityState={{ selected: set.id === activeSensorSetId }}
              onPress={() => setActiveSensorSetId(set.id)}
              style={[styles.setOption, set.id === activeSensorSetId && styles.setOptionActive]}>
              <Text style={[styles.setOptionName, set.id === activeSensorSetId && { color: themeColors.primary }]}>{set.name}</Text>
              <Text style={styles.setOptionZone}>{set.zone}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.setSelectorDetail}>{activeSet.name} · {visibleSensorKeys.length} channels · {sensorSets.length} sets</Text>
      </View>

      <SageFeatureCards cards={[
        { tag: 'Historical trends', title: 'Sensor drift', description: 'Compare recent readings with the weekly sensor history.', graphic: 'analytics', onPress: () => setSelectedTab('7d') },
        { tag: 'Nutrient balance', title: 'Equilibrium index', description: 'Review channels that are currently within their target range.', graphic: 'telemetry', onPress: () => setSelectedTab('24h') },
      ]} />

      {/* KPI Ribbon */}
      <View style={styles.kpiRibbon}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Monitored Channels</Text>
          <Text style={styles.kpiValue}>{visibleSensorKeys.length}</Text>
          <Text style={styles.kpiSub}>{activeSet.name}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Data Window</Text>
          <Text style={styles.kpiValue}>{selectedTab === '24h' ? '24 Hours' : '7 Days'}</Text>
          <Text style={styles.kpiSub}>{dataset.length} data samples</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Equilibrium Index</Text>
          <Text style={[styles.kpiValue, { color: themeColors.primary }]}>
            {equilibriumPercent}%
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
      {Boolean(error) && (
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
              {current ? 'Showing Last Recorded Readings' : 'Waiting for Sensor Readings'}
            </Text>
            <Text style={styles.demoBannerText}>
              {current
                ? 'The latest readings stay visible while this sensor set waits for its next update.'
                : 'Charts will populate as readings arrive for the selected sensor set.'}
            </Text>
          </View>
        </View>
      )}

      {/* Metadata Info Callout */}
      <View style={styles.infoBanner}>
        <Info size={15} color={themeColors.textSecondary} style={{ marginTop: 2 }} />
        <Text style={styles.infoText}>
          Readings, channels, and thresholds follow the same selected sensor set as the dashboard. Charts show samples received during this session.
        </Text>
      </View>

      {/* Sensor Chart Cards */}
      <View style={styles.chartsGrid}>
        {visibleSensorKeys.map((sensor) => {
          const config = SENSOR_CONFIG[sensor] || {
            label: sensor,
            unit: '',
            color: themeColors.primary,
          };
          const chart = createChartData(sensor);
          const IconComponent = SENSOR_ICONS[sensor] || Activity;
          const healthNote = sensorNote(current, sensor, stale);
          const threshold = activeSet.thresholds[sensor] || SENSOR_THRESHOLDS[sensor];
          const value = current?.[sensor];
          const note = healthNote === 'Measured' && typeof value === 'number' && threshold
            ? value < threshold.min ? 'Below target' : value > threshold.max ? 'Above target' : 'Within target'
            : healthNote;
          const liveVal = current?.[sensor];
          const displayVal = typeof liveVal === 'number' ? liveVal.toFixed(1) : '--';

          let statusType = 'info';
          if (note === 'Within target') {
            statusType = 'normal';
          } else if (note === 'Above target' || note === 'Below target') {
            statusType = 'warning';
          } else if (note.toLowerCase().includes('critical') || note.toLowerCase().includes('error')) {
            statusType = 'critical';
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
    setSelector: { marginBottom: spacing.lg, gap: 10 },
    setSelectorLabel: { fontSize: 14, fontWeight: '700', color: theme.text },
    setOptions: { gap: 10, paddingVertical: 4 },
    setOption: { minWidth: 145, padding: 12, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.md, backgroundColor: theme.surface },
    setOptionActive: { borderColor: theme.primary, backgroundColor: theme.primary + '12' },
    setOptionName: { fontSize: 14, fontWeight: '700', color: theme.text },
    setOptionZone: { fontSize: 12, color: theme.textSecondary, marginTop: 4 },
    setSelectorDetail: { fontSize: 12, color: theme.textSecondary },
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      padding: spacing.lg,
      paddingBottom: 48,
      width: '100%',
      maxWidth: 1320,
      alignSelf: 'center',
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
      backgroundColor: theme.adapt('rgba(16, 185, 129, 0.12)', theme.primaryGlow),
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: theme.adapt('rgba(16, 185, 129, 0.25)', theme.border),
      alignSelf: 'flex-start',
    },
    liveBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: theme.adapt('#34D399', theme.primaryLight),
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.adapt('rgba(16, 185, 129, 0.08)', theme.primaryGlow),
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.20)',
    },
    statusPillText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.adapt('#F8FAF8', theme.text),
      letterSpacing: -0.8,
      marginTop: 2,
    },
    subtitle: {
      fontSize: 15,
      color: theme.adapt('#9CB0A2', theme.textSecondary),
      marginTop: 4,
      lineHeight: 20,
    },
    heroBanner: {
      marginBottom: spacing.lg,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(44, 77, 55, 0.24)',
      ...Platform.select({
        web: { boxShadow: '0 10px 28px rgba(70, 92, 62, 0.18)' },
        default: { elevation: 3 },
      }),
    },
    heroBannerCompact: {
      minHeight: 230,
    },
    heroGradient: {
      minHeight: 150,
      padding: spacing.lg,
      justifyContent: 'center',
    },
    heroBannerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.lg,
    },
    heroBannerContentCompact: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    heroCopy: {
      flex: 1,
      minWidth: 0,
    },
    heroPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: 'rgba(247, 245, 239, 0.54)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 9999,
      alignSelf: 'flex-start',
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: 'rgba(33, 72, 55, 0.18)',
    },
    heroPillText: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.adapt('#DDE8DE', '#214837'),
      letterSpacing: 0.6,
    },
    heroPulseDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.adapt('#A9BD9B', '#214837'),
    },
    heroBannerTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.adapt('#EAF2EC', '#173D2E'),
      letterSpacing: -0.4,
    },
    heroBannerSub: {
      fontSize: 14,
      color: theme.adapt('#B7C8BA', '#294A39'),
      marginTop: 5,
      fontWeight: '500',
      lineHeight: 19,
    },
    heroGraphic: {
      width: 250,
      height: 112,
      padding: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: 'rgba(33, 72, 55, 0.18)',
      backgroundColor: theme.adapt('rgba(34, 38, 40, 0.9)', 'rgba(247, 245, 239, 0.48)'),
      overflow: 'hidden',
    },
    heroGraphicCompact: {
      width: '100%',
    },
    heroGraphHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    heroGraphLabel: {
      color: theme.adapt('#B7C8BA', '#294A39'),
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.6,
      flex: 1,
    },
    heroGraphDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.adapt('#A9BD9B', '#214837'),
    },
    heroGraphBars: {
      height: 60,
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(33, 72, 55, 0.22)',
    },
    heroGraphBar: {
      width: 8,
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
      backgroundColor: theme.adapt('#A9BD9B', '#214837'),
    },
    heroGraphAxis: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 3,
    },
    heroGraphAxisText: {
      color: theme.adapt('#9DB0A5', '#3F5C4B'),
      fontSize: 12,
      fontWeight: '700',
    },
    kpiRibbon: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    kpiCard: {
      flex: 1,
      backgroundColor: theme.adapt('#191C1E', theme.surface),
      borderRadius: 14,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: theme.adapt('rgba(52, 211, 153, 0.22)', theme.border),
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
      backgroundColor: theme.adapt('rgba(16, 185, 129, 0.08)', theme.primaryGlow),
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: theme.adapt('rgba(52, 211, 153, 0.25)', theme.border),
    },
    demoBannerTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.adapt('#34D399', theme.primaryLight),
      marginBottom: 2,
    },
    demoBannerText: {
      ...typography.bodySmall,
      color: theme.adapt('#9CB0A2', theme.textSecondary),
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
      backgroundColor: theme.adapt('#191C1E', theme.surface),
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: theme.adapt('rgba(52, 211, 153, 0.22)', theme.border),
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
