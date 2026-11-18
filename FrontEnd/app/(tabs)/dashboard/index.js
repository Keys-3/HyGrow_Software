/**
 * HyGrow — Enterprise Nature-Tech Dashboard
 *
 * Modern Nature-Tech SaaS aesthetic inspired by Linear, Stripe, and AgriVision:
 * - Forest Green & Sage accents
 * - Clean off-white background with crisp white cards
 * - Real-time IoT sensor telemetry grid with sparklines
 * - Hardware actuator controls with instant feedback
 */

import { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Radio,
  Settings,
  Power,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { useMultiSensorSets } from '../../../src/hooks/useMultiSensorSets';
import useAppStore from '../../../src/store/useAppStore';
import { useThemeColors, borderRadius, shadows, spacing, typography } from '../../../src/theme/theme';
import IotConnectionModal from '../../../src/components/IotConnectionModal';
import { sendActuatorCommand } from '../../../src/services/iotBridge';
import SensorCard from '../../../src/components/SensorCard';
import { GlassCard } from '../../../src/components/GlassCard';
import { PressableScale } from '../../../src/components/PressableScale';
import StatusBadge from '../../../src/components/StatusBadge';
import { SagePageHero } from '../../../src/components/SagePageHero';
import { SageFeatureCards } from '../../../src/components/SageFeatureCards';
import {
  SENSOR_CONFIG,
  SENSOR_KEYS,
} from '../../../src/utils/constants';
import {
  formatSensorValue,
  getSensorStatus,
} from '../../../src/utils/helpers';
import { alertEligible } from '../../../src/utils/telemetry';
import { useNavigationTransition } from '../../../src/components/transitions/ScreenTransitionProvider';

export default function DashboardScreen() {
  const router = useRouter();
  const navigateWithTransition = useNavigationTransition();
  const {
    sensorSets,
    activeSensorSetId,
    activeSet,
    activeTelemetry: current,
    activeSetAlerts,
    allSetAlertSummaries,
    rawHistory,
    loading,
    error,
    refresh,
    isOffline,
    isLastKnown,
    setActiveSensorSetId,
  } = useMultiSensorSets();
  const isFallback = !current || isOffline;
  const rawCurrent = current;
  const lastUpdated = useAppStore((state) => state.lastUpdated);
  const isDeviceOnline = useAppStore((state) => state.isDeviceOnline);
  const farmerFeatures = useAppStore((state) => state.farmerFeatures);
  const activeSource = rawCurrent?.source ?? null;
  const localDevice = useAppStore((state) => state.localDevice);
  const togglePump = useAppStore((state) => state.togglePump);

  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [isTogglingPump, setIsTogglingPump] = useState(false);
  
  const themeColors = useThemeColors();
  const { width: windowWidth } = useWindowDimensions();
  const styles = useMemo(() => createStyles(themeColors, windowWidth), [themeColors, windowWidth]);
  const sagePanelGradient = themeColors.isDarkMode
    ? undefined
    : ['rgba(156, 175, 136, 0.3)', 'rgba(187, 201, 168, 0.14)'];
  const sagePanelBorder = themeColors.isDarkMode ? undefined : 'rgba(105, 123, 91, 0.32)';

  const sensorCards = useMemo(() => {
    if (!current) return [];
    const recentHistory = rawHistory.slice(-12);

    return SENSOR_KEYS.filter((key) => farmerFeatures?.sensors?.[key] !== false).map((key) => {
      const config = SENSOR_CONFIG[key];
      const value = current[key];
      return {
        key,
        label: config.label,
        value: formatSensorValue(key, value),
        rawValue: value,
        unit: config.unit,
        color: config.color,
        gradient: themeColors.gradients[key] || [config.color, config.color],
        status: getSensorStatus(key, value),
        recentReadings: recentHistory.map(point => ({
          timeMs: point.sampledUptimeMs,
          value: alertEligible(point, key, point.observedAt) ? point[key] : null,
        })),
      };
    });
  }, [current, rawHistory, themeColors, farmerFeatures]);

  const optimalCount = useMemo(() => {
    return sensorCards.filter((s) => s.status === 'normal').length;
  }, [sensorCards]);

  const handleTogglePump = async () => {
    if (!current) return;
    const nextAction = current.pumpStatus ? 'PUMP_OFF' : 'PUMP_ON';
    togglePump();
    setIsTogglingPump(true);
    try {
      await sendActuatorCommand(current.deviceId, nextAction);
    } catch (e) {
      console.warn('Failed to toggle pump:', e);
    } finally {
      setIsTogglingPump(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl 
          refreshing={loading} 
          onRefresh={refresh} 
          tintColor={themeColors.primary}
          colors={[themeColors.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Top Console Bar: Status & Hardware Bridge */}
      <View style={styles.topControlBar}>
        <View style={styles.topControlLeft}>
          <View style={styles.systemStatusBadge}>
            <View
              style={[
                styles.statusPulseDot,
                { backgroundColor: !isOffline ? themeColors.primary : isLastKnown ? '#0284C7' : themeColors.warning },
              ]}
            />
            <Text style={styles.statusBadgeText}>
              {!isOffline ? 'TELEMETRY LIVE' : isLastKnown ? 'CACHED SAMPLES' : 'SIMULATION MODE'}
            </Text>
          </View>
          {lastUpdated ? (
            <Text style={styles.lastSyncText}>
              Synced {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          ) : null}
        </View>

        <View style={styles.topControlRight}>
          <PressableScale
            style={[
              styles.connectionPill,
              !isOffline
                ? activeSource === 'local'
                  ? styles.localPill
                  : styles.cloudPill
                : isLastKnown
                ? styles.cloudPill
                : styles.offlinePill,
            ]}
            onPress={() => setShowConnectionModal(true)}
            activeScale={0.96}
          >
            <View
              style={[
                styles.connectionDot,
                !isOffline
                  ? activeSource === 'local'
                    ? styles.localDot
                    : styles.cloudDot
                  : isLastKnown
                  ? styles.cloudDot
                  : styles.offlineDot,
              ]}
            />
            <Text
              style={[
                styles.connectionPillText,
                !isOffline
                  ? activeSource === 'local'
                    ? styles.localPillText
                    : styles.cloudPillText
                  : isLastKnown
                  ? styles.cloudPillText
                  : styles.offlinePillText,
              ]}
              numberOfLines={1}
            >
              {!isOffline
                ? activeSource === 'local'
                  ? `LAN DIRECT (${localDevice?.ip || 'LAN'})`
                  : 'CLOUD FIRESTORE'
                : isLastKnown
                ? 'OFFLINE · LAST DATA'
                : 'OFFLINE · DEMO MODE'}
            </Text>
            <Settings size={13} color={!isOffline ? themeColors.primary : isLastKnown ? '#0284C7' : themeColors.dangerDark} />
          </PressableScale>

          <PressableScale
            style={styles.syncBtn}
            onPress={refresh}
            activeScale={0.94}
            accessibilityLabel="Refresh telemetry"
          >
            <RotateCcw size={15} color={themeColors.textSecondary} />
          </PressableScale>
        </View>
      </View>

      <SagePageHero
        eyebrow="Autonomous telemetry bus"
        title="System Control"
        titleAccent="& Telemetry"
        subtitle="Closed-loop environmental sampling, equilibrium balancing, and actuator automation."
        actionLabel="Refresh telemetry"
        actionIcon={<RotateCcw color="#0E4F3B" size={22} />}
        onAction={refresh}
        scene="dashboard"
        tickerItems={['pH', 'EC', 'Temperature', 'Humidity']}
        sceneData={{
          ph: current?.ph ?? '--',
          ec: current?.ec ?? '--',
          temperature: current?.temperature != null ? `${formatSensorValue('temperature', current.temperature)}°` : '--',
          humidity: current?.humidity != null ? `${formatSensorValue('humidity', current.humidity)}%` : '--',
        }}
        chips={[
          `${activeSet.name} (${activeSet.crop})`,
          !isOffline ? 'System online' : isLastKnown ? 'Last data cached' : 'Calibrated simulation',
          `${sensorCards.length} sensor channels`,
          activeSetAlerts.length > 0 ? `${activeSetAlerts.length} Active Alert${activeSetAlerts.length === 1 ? '' : 's'}` : 'Equilibrium optimal',
        ]}
      />

      <SageFeatureCards cards={[
        { tag: 'Live telemetry', title: 'Sensor array', description: 'Track pH, EC, temperature, and humidity from one live feed.', graphic: 'telemetry', onPress: () => navigateWithTransition('/analytics', 'Analytics', 'tab') },
        { tag: 'Control loop', title: 'Hardware settings', description: 'Check the controller connection and device configuration.', graphic: 'settings', onPress: () => navigateWithTransition('/settings', 'Settings', 'tab') },
      ]} />

      {/* Multi-Sensor Set Switcher Bar */}
      <View style={styles.sensorSetsContainer}>
        <View style={styles.sensorSetsHeader}>
          <View style={styles.sensorSetsTitleBlock}>
            <Radio size={14} color={themeColors.primary} />
            <Text style={styles.sensorSetsSectionTitle}>ACTIVE SENSOR SETS & ZONES</Text>
          </View>
          <TouchableOpacity
            style={styles.manageSetsBtn}
            onPress={() => navigateWithTransition('/settings', 'Settings', 'tab')}
            accessibilityLabel="Configure sensor sets in settings"
          >
            <Settings size={13} color={themeColors.primary} />
            <Text style={styles.manageSetsBtnText}>Adjust in Settings</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sensorSetsScroll}
        >
          {sensorSets.map((set) => {
            const isSelected = set.id === activeSensorSetId;
            const summary = allSetAlertSummaries[set.id];
            const hasAlerts = summary && summary.count > 0;
            const isCritical = summary?.hasCritical;

            return (
              <PressableScale
                key={set.id}
                style={[
                  styles.setCard,
                  isSelected && styles.setCardActive,
                  hasAlerts && styles.setCardAlert,
                ]}
                onPress={() => setActiveSensorSetId(set.id)}
                activeScale={0.96}
              >
                <View style={styles.setCardTop}>
                  <View style={styles.setCardStatusRow}>
                    <View
                      style={[
                        styles.setPulseDot,
                        {
                          backgroundColor: hasAlerts
                            ? isCritical
                              ? '#EF4444'
                              : '#F59E0B'
                            : '#22C55E',
                        },
                      ]}
                    />
                    <Text style={styles.setZoneText}>{set.zone}</Text>
                  </View>
                  {hasAlerts ? (
                    <View
                      style={[
                        styles.setAlertPill,
                        {
                          backgroundColor: isCritical
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(245, 158, 11, 0.15)',
                        },
                      ]}
                    >
                      <AlertTriangle size={11} color={isCritical ? '#EF4444' : '#F59E0B'} />
                      <Text
                        style={[
                          styles.setAlertPillText,
                          { color: isCritical ? '#EF4444' : '#F59E0B' },
                        ]}
                      >
                        {summary.count} {summary.count === 1 ? 'Alert' : 'Alerts'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.setOptimalPill}>
                      <CheckCircle2 size={11} color="#10B981" />
                      <Text style={styles.setOptimalPillText}>OPTIMAL</Text>
                    </View>
                  )}
                </View>

                <Text
                  style={[styles.setNameText, isSelected && styles.setNameTextActive]}
                  numberOfLines={1}
                >
                  {set.name}
                </Text>
                <Text style={styles.setCropText} numberOfLines={1}>
                  {set.crop}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>

      {/* Set-Specific Active Alerts Banner */}
      {activeSetAlerts.length > 0 ? (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.setAlertBanner}>
          <View style={styles.setAlertHeader}>
            <View style={styles.setAlertTitleWrap}>
              <AlertTriangle size={18} color="#EF4444" />
              <Text style={styles.setAlertBannerTitle}>
                {activeSet.name} Active Alerts ({activeSetAlerts.length})
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigateWithTransition('/settings', 'Settings', 'tab')}>
              <Text style={styles.setAlertAdjustLink}>Adjust Thresholds →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.setAlertList}>
            {activeSetAlerts.map((alert) => (
              <View key={alert.id} style={styles.setAlertItem}>
                <View
                  style={[
                    styles.setAlertBadge,
                    alert.type === 'critical' ? styles.badgeCrit : styles.badgeWarn,
                  ]}
                >
                  <Text style={styles.setAlertBadgeText}>
                    {alert.type.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.setAlertItemText}>{alert.message}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      ) : null}

      {/* KPI Overview Summary Ribbon */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCardWrapper}>
          <GlassCard gradientColors={sagePanelGradient} borderColor={sagePanelBorder} style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>SYSTEM STATUS</Text>
              <Cpu size={15} color={!isOffline ? themeColors.primary : isLastKnown ? '#0284C7' : themeColors.primary} />
            </View>
            <View style={styles.kpiBottom}>
              <Text style={[styles.kpiValue, { color: !isOffline ? themeColors.primary : isLastKnown ? '#0284C7' : themeColors.primary }]}>
                {!isOffline ? 'Operational' : isLastKnown ? 'Cached Data' : 'Simulated'}
              </Text>
              <StatusBadge
                label={!isOffline ? 'ONLINE' : isLastKnown ? 'CACHED' : 'DEMO'}
                status={!isOffline ? 'normal' : isLastKnown ? 'warning' : 'neutral'}
                pulse={!isOffline}
              />
            </View>
          </GlassCard>
        </View>

        <View style={styles.kpiCardWrapper}>
          <GlassCard gradientColors={sagePanelGradient} borderColor={sagePanelBorder} style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>ACTUATOR STATE</Text>
              <Power size={15} color={current?.pumpStatus ? '#10B981' : themeColors.textMuted} />
            </View>
            <View style={styles.kpiBottom}>
              <Text style={styles.kpiValue}>
                {current?.pumpStatus ? 'Recirculating' : 'Pump Standby'}
              </Text>
              <StatusBadge
                label={current?.pumpStatus ? 'RUNNING' : 'STANDBY'}
                status={current?.pumpStatus ? 'normal' : 'neutral'}
                pulse={!!current?.pumpStatus}
              />
            </View>
          </GlassCard>
        </View>

        <View style={styles.kpiCardWrapper}>
          <GlassCard gradientColors={sagePanelGradient} borderColor={sagePanelBorder} style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>SENSOR EQUILIBRIUM</Text>
              <Layers size={15} color={themeColors.secondary} />
            </View>
            <View style={styles.kpiBottom}>
              <Text style={styles.kpiValue}>
                {sensorCards.length > 0 ? `${optimalCount} of ${sensorCards.length} Optimal` : '9 of 9 Optimal'}
              </Text>
              <Text style={styles.kpiSub}>
                {sensorCards.length > 0 && optimalCount === sensorCards.length ? '100% In Spec' : 'Calibrated Baseline'}
              </Text>
            </View>
          </GlassCard>
        </View>
      </View>

      {/* Sensor Ingestion Error Banner (only if real configuration issue) */}
      {error && !isFallback ? (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.errorCard}>
          <View style={styles.errorHeader}>
            <AlertTriangle size={18} color={themeColors.dangerDark} />
            <Text style={styles.errorTitle}>Telemetry Ingestion Error</Text>
          </View>
          <Text style={styles.errorText}>{error}</Text>
          {typeof error === 'string' && error.includes('Settings') && (
            <PressableScale
              style={styles.errorButton}
              onPress={() => navigateWithTransition('/(tabs)/settings', 'Settings', 'tab')}
              activeScale={0.96}
            >
              <Text style={styles.errorButtonText}>Configure ESP32 Device in Settings</Text>
            </PressableScale>
          )}
        </Animated.View>
      ) : null}

      {/* Fallback / Offline Notice Banner */}
      {isFallback ? (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.demoCard}>
          <View style={styles.demoHeader}>
            <Sparkles size={16} color={themeColors.primary} />
            <Text style={styles.demoTitle}>
              {isLastKnown
                ? 'Showing Last Recorded Sensor Readings'
                : 'Sensors Offline — Displaying Calibrated Demo Telemetry'}
            </Text>
          </View>
          <Text style={styles.demoText}>
            {isLastKnown
              ? 'ESP32 controller is not streaming. Displaying the most recent captured sensor readings.'
              : 'Sensors are in standby or offline. The environmental telemetry array, drift sparklines, and controls below are fully interactive with realistic agronomic simulation.'}
          </Text>
        </Animated.View>
      ) : null}

      {/* Sensor Cards Telemetry Grid */}
      {current ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Environmental Telemetry Array</Text>
            <Text style={styles.sectionSubtitle}>
              Recent measured readings by sensor
            </Text>
          </View>

          <View style={styles.cardsGrid}>
            {sensorCards.map((sensor, index) => (
                <Animated.View
                  key={sensor.key}
                  entering={FadeInDown.delay(index * 40).duration(350)}
                  style={styles.sensorCardWrap}
                >
                  <SensorCard
                    sensorKey={sensor.key}
                    value={sensor.rawValue}
                    displayValue={sensor.value}
                    unit={sensor.unit}
                    label={sensor.label}
                    color={sensor.color}
                    gradient={sensor.gradient}
                    recentReadings={sensor.recentReadings}
                    onPress={() => router.push({ pathname: '/dashboard/[sensorId]', params: { sensorId: sensor.key } })}
                  />
                </Animated.View>
            ))}
          </View>

          {/* Subsystem Actuation & Autopilot Widget */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Hardware Actuation & Loop Controls</Text>
            <Text style={styles.sectionSubtitle}>
              Low-latency command dispatch to local relays and nutrient dosing manifolds
            </Text>
          </View>

          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <GlassCard
              gradientColors={sagePanelGradient}
              borderColor={sagePanelBorder}
              style={styles.controlsCard}
              glowColor={themeColors.primary}
            >
              <View style={styles.controlsHeader}>
                <View style={styles.controlsHeaderLeft}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.controlsTitle}>Submersible Dosing & Recirculation Pump</Text>
                </View>
                <StatusBadge
                  label={current.pumpStatus ? 'ACTIVE' : 'STANDBY'}
                  status={current.pumpStatus ? 'normal' : 'neutral'}
                  pulse={!!current.pumpStatus}
                />
              </View>

              <PressableScale
                style={[
                  styles.controlRowBtn,
                  current.pumpStatus ? styles.pumpActiveBtn : styles.pumpInactiveBtn,
                ]}
                onPress={handleTogglePump}
                disabled={isTogglingPump}
                activeScale={0.98}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={[styles.pumpIconWrap, current.pumpStatus && styles.pumpIconWrapActive]}>
                    <Power size={20} color={current.pumpStatus ? '#0A4D3C' : themeColors.textMuted} />
                  </View>
                  <View>
                    <Text style={styles.controlLabel}>Circulation Manifold Actuator</Text>
                    <Text style={styles.controlSubLabel}>
                      Tap to switch {current.pumpStatus ? 'OFF (Manual Stop)' : 'ON (Force Recirculation)'}
                    </Text>
                  </View>
                </View>

                {isTogglingPump ? (
                  <ActivityIndicator size="small" color={themeColors.primary} />
                ) : (
                  <View
                    style={[
                      styles.controlBadge,
                      current.pumpStatus ? styles.controlBadgeOn : styles.controlBadgeOff,
                    ]}
                  >
                    <Text
                      style={[
                        styles.controlBadgeText,
                        current.pumpStatus ? styles.controlBadgeTextOn : styles.controlBadgeTextOff,
                      ]}
                    >
                      {current.pumpStatus ? 'RUNNING' : 'STOPPED'}
                    </Text>
                  </View>
                )}
              </PressableScale>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nutrient Closed-Loop Autopilot</Text>
                <View
                  style={[
                    styles.controlBadge,
                    current.autoMode ? styles.controlBadgeOn : styles.controlBadgeOff,
                  ]}
                >
                  <Text
                    style={[
                      styles.controlBadgeText,
                      current.autoMode ? styles.controlBadgeTextOn : styles.controlBadgeTextOff,
                    ]}
                  >
                    {current.autoMode ? 'AUTOPILOT ON' : 'MANUAL OVERRIDE'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <PressableScale
                style={styles.infoRowPressable}
                onPress={() => setShowConnectionModal(true)}
                activeScale={0.98}
              >
                <Text style={styles.infoLabel}>Active Telemetry Ingestion Bridge</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.infoValue, { color: themeColors.primary, fontWeight: '700' }]}>
                    {activeSource === 'local' ? `LAN (${localDevice?.ip || 'Direct'})` : activeSource === 'cloud' ? 'Cloud Firestore' : 'Disconnected'}
                  </Text>
                  <Settings size={14} color={themeColors.primary} />
                </View>
              </PressableScale>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Packet Streamed</Text>
                <Text style={styles.infoValue}>
                  {current?.lastSensorTimestamp
                    ? new Date(current.lastSensorTimestamp).toLocaleTimeString()
                    : 'N/A'}
                </Text>
              </View>
            </GlassCard>
          </Animated.View>
        </>
      ) : null}

      <IotConnectionModal
        visible={showConnectionModal}
        activeSource={activeSource}
        onClose={() => setShowConnectionModal(false)}
        onRefreshTelemetry={refresh}
      />
    </ScrollView>
  );
}

const createStyles = (theme, width = 360) => {
  const isMobile = width < 768;
  const isSmall = width < 380;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    content: {
      padding: isMobile ? 14 : spacing.lg,
      paddingTop: Platform.OS === 'ios' ? spacing.xl : spacing.md,
      paddingBottom: isMobile ? 80 : spacing.xxl,
      maxWidth: 1200,
      width: '100%',
      alignSelf: 'center',
    },

    topControlBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
      flexWrap: 'wrap',
      gap: 10,
    },

    sensorSetsContainer: {
      marginBottom: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
    },
    sensorSetsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    sensorSetsTitleBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sensorSetsSectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.textMuted,
      letterSpacing: 0.8,
    },
    manageSetsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    manageSetsBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.primary,
    },
    sensorSetsScroll: {
      flexDirection: 'row',
      gap: 10,
      paddingVertical: 2,
    },
    setCard: {
      minWidth: 170,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: borderRadius.md,
      backgroundColor: theme.surfaceLight,
      borderWidth: 1.5,
      borderColor: theme.border,
      gap: 3,
      ...Platform.select({
        web: {
          cursor: 'pointer',
          transition: 'all 0.16s ease',
        },
      }),
    },
    setCardActive: {
      borderColor: theme.primary,
      backgroundColor: theme.adapt('rgba(16, 185, 129, 0.14)', '#0E4F3B0D'),
    },
    setCardAlert: {
      borderColor: '#F59E0B',
    },
    setCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 6,
    },
    setCardStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    setPulseDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    setZoneText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    setAlertPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
    },
    setAlertPillText: {
      fontSize: 12,
      fontWeight: '800',
    },
    setOptimalPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 5,
      paddingVertical: 1.5,
      borderRadius: borderRadius.sm,
      backgroundColor: theme.adapt('rgba(34, 197, 94, 0.12)', 'rgba(34, 197, 94, 0.1)'),
    },
    setOptimalPillText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#10B981',
      letterSpacing: 0.5,
    },
    setNameText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
      marginTop: 2,
    },
    setNameTextActive: {
      color: theme.primary,
    },
    setCropText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    setAlertBanner: {
      marginBottom: spacing.md,
      padding: 14,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.adapt('rgba(239, 68, 68, 0.12)', 'rgba(239, 68, 68, 0.08)'),
      borderWidth: 1,
      borderColor: theme.adapt('rgba(239, 68, 68, 0.35)', 'rgba(239, 68, 68, 0.25)'),
      gap: 10,
    },
    setAlertHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    setAlertTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    setAlertBannerTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.text,
    },
    setAlertAdjustLink: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.primary,
    },
    setAlertList: {
      gap: 6,
    },
    setAlertItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    setAlertBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    badgeCrit: {
      backgroundColor: '#EF4444',
    },
    badgeWarn: {
      backgroundColor: '#F59E0B',
    },
    setAlertBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    setAlertItemText: {
      fontSize: 13,
      color: theme.text,
      flex: 1,
    },
    topControlLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    },
    systemStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.adapt('rgba(16, 185, 129, 0.1)', 'rgba(156, 175, 136, 0.18)'),
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: theme.adapt('rgba(16, 185, 129, 0.22)', theme.border),
    },
    statusPulseDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: theme.adapt('#34D399', theme.primaryLight),
    },
    lastSyncText: {
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: '500',
    },
    topControlRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },

    syncBtn: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.md,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.small,
    },
    connectionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      ...shadows.small,
    },
    localPill: {
      backgroundColor: 'rgba(10, 77, 60, 0.08)',
      borderColor: 'rgba(10, 77, 60, 0.25)',
    },
    cloudPill: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
    },
    offlinePill: {
      backgroundColor: 'rgba(220, 38, 38, 0.08)',
      borderColor: 'rgba(220, 38, 38, 0.25)',
    },
    connectionDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    localDot: {
      backgroundColor: theme.primary,
    },
    cloudDot: {
      backgroundColor: '#0284C7',
    },
    offlineDot: {
      backgroundColor: '#DC2626',
    },
    connectionPillText: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    localPillText: {
      color: theme.primary,
    },
    cloudPillText: {
      color: theme.text,
    },
    offlinePillText: {
      color: theme.dangerDark,
    },

    kpiRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: spacing.xl,
      flexWrap: 'wrap',
    },
    kpiCardWrapper: {
      flex: 1,
      minWidth: isMobile ? '100%' : 200,
    },
    kpiCard: {
      padding: 16,
      borderRadius: borderRadius.md,
    },
    kpiTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    kpiLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
      letterSpacing: 0.8,
    },
    kpiBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    kpiValue: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.text,
      letterSpacing: -0.3,
    },
    kpiSub: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: '600',
    },

    sectionHeader: {
      marginBottom: spacing.md,
      marginTop: spacing.sm,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      letterSpacing: -0.3,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 2,
    },

    cardsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: isSmall ? 8 : spacing.md,
      marginBottom: spacing.xl,
    },
    sensorCardWrap: {
      width: isSmall ? '100%' : '48%',
      minWidth: isSmall ? '100%' : 135,
      flexGrow: 1,
    },

    controlsCard: {
      borderRadius: borderRadius.md,
      padding: spacing.lg,
    },
    controlsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    controlsHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pulseDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.primary,
    },
    controlsTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
      letterSpacing: -0.2,
    },

    controlRowBtn: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      marginVertical: 4,
    },
    pumpActiveBtn: {
      backgroundColor: theme.adapt('rgba(10, 77, 60, 0.06)', 'rgba(156, 175, 136, 0.22)'),
      borderColor: theme.adapt('rgba(10, 77, 60, 0.25)', 'rgba(105, 123, 91, 0.35)'),
    },
    pumpInactiveBtn: {
      backgroundColor: theme.adapt(theme.surfaceLight, 'rgba(156, 175, 136, 0.12)'),
      borderColor: theme.border,
    },
    pumpIconWrap: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.sm,
      backgroundColor: theme.surfaceMuted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pumpIconWrapActive: {
      backgroundColor: theme.adapt('rgba(10, 77, 60, 0.15)', 'rgba(156, 175, 136, 0.34)'),
    },
    controlLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    controlSubLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },

    controlBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: borderRadius.xs,
    },
    controlBadgeOn: {
      backgroundColor: theme.adapt('rgba(10, 77, 60, 0.12)', 'rgba(156, 175, 136, 0.3)'),
    },
    controlBadgeOff: {
      backgroundColor: theme.surfaceMuted,
    },
    controlBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
    controlBadgeTextOn: {
      color: theme.primary,
    },
    controlBadgeTextOff: {
      color: theme.textMuted,
    },

    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    infoRowPressable: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    infoLabel: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    infoDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: spacing.xs,
    },

    demoCard: {
      backgroundColor: theme.adapt('rgba(16, 185, 129, 0.08)', 'rgba(156, 175, 136, 0.34)'),
      borderWidth: 1,
      borderColor: theme.adapt('rgba(52, 211, 153, 0.25)', 'rgba(105, 123, 91, 0.34)'),
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    demoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    demoTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.adapt('#34D399', theme.primaryDark),
    },
    demoText: {
      fontSize: 13,
      color: theme.adapt('#9CB0A2', theme.textSecondary),
      lineHeight: 18,
    },

    errorCard: {
      backgroundColor: 'rgba(220, 38, 38, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(220, 38, 38, 0.25)',
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    errorHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    errorTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.dangerDark,
    },
    errorText: {
      fontSize: 13,
      color: theme.dangerDark,
      lineHeight: 18,
    },
    errorButton: {
      marginTop: spacing.sm,
      backgroundColor: theme.primary,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: borderRadius.sm,
      alignSelf: 'flex-start',
    },
    errorButtonText: {
      color: theme.adapt('#FFFFFF', theme.text),
      fontWeight: '700',
      fontSize: 13,
    },

    placeholderCard: {
      backgroundColor: theme.surface,
      borderRadius: borderRadius.md,
      padding: spacing.xl,
      marginBottom: spacing.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      ...shadows.small,
    },
    placeholderTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    placeholderText: {
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
};
