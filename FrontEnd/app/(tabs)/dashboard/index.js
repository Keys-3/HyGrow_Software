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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
  Radio,
  Settings,
  Power,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Cpu,
  Layers,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import useSensorData from '../../../src/hooks/useSensorData';
import useAppStore from '../../../src/store/useAppStore';
import { useThemeColors, borderRadius, shadows, spacing, typography } from '../../../src/theme/theme';
import IotConnectionModal from '../../../src/components/IotConnectionModal';
import { sendActuatorCommand } from '../../../src/services/iotBridge';
import SensorCard from '../../../src/components/SensorCard';
import { GlassCard } from '../../../src/components/GlassCard';
import { PressableScale } from '../../../src/components/PressableScale';
import StatusBadge from '../../../src/components/StatusBadge';
import {
  SENSOR_CONFIG,
  SENSOR_KEYS,
  SENSOR_THRESHOLDS,
} from '../../../src/utils/constants';
import {
  formatSensorValue,
  getSensorStatus,
} from '../../../src/utils/helpers';

const ICON_MAP = {
  temperature: Thermometer,
  humidity: Droplets,
  ph: FlaskConical,
  ec: Zap,
  waterLevel: Waves,
  lightIntensity: Sun,
  vpd: Cloud,
  waterTemp: ThermometerSnow,
  co2: Wind,
};

export default function DashboardScreen() {
  const router = useRouter();
  const { current, history, loading, error, refresh } = useSensorData();
  const lastUpdated = useAppStore((state) => state.lastUpdated);
  const isDeviceOnline = useAppStore((state) => state.isDeviceOnline);
  const farmerFeatures = useAppStore((state) => state.farmerFeatures);
  const activeSource = useAppStore((state) => state.activeSource);
  const localDevice = useAppStore((state) => state.localDevice);
  const togglePump = useAppStore((state) => state.togglePump);

  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [isTogglingPump, setIsTogglingPump] = useState(false);
  
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const sensorCards = useMemo(() => {
    if (!current) return [];

    return SENSOR_KEYS.filter((key) => farmerFeatures?.sensors?.[key] !== false).map((key) => {
      const config = SENSOR_CONFIG[key];
      const value = current[key];
      const status = getSensorStatus(key, value);

      const MOCK_TRENDS = {
        temperature: { val: '0.2', dir: 'up' },
        humidity: { val: '1.5', dir: 'down' },
        ph: { val: '0.1', dir: 'up' },
        ec: { val: '0.05', dir: 'up' },
        waterLevel: { val: '2.0', dir: 'down' },
        lightIntensity: { val: '120', dir: 'up' },
      };

      let trend = null;
      let trendDirection = null;
      
      if (history && history.length > 1) {
        const prevValue = history[0][key];
        if (typeof prevValue === 'number' && typeof value === 'number') {
          const diff = value - prevValue;
          if (Math.abs(diff) >= 0.1) {
            trendDirection = diff > 0 ? 'up' : 'down';
            trend = Math.abs(diff).toFixed(1);
          }
        }
      } 
      
      if (!trend) {
        const mock = MOCK_TRENDS[key] || { val: '0.1', dir: 'up' };
        trend = mock.val;
        trendDirection = mock.dir;
      }

      return {
        key,
        label: config.label,
        value: formatSensorValue(key, value),
        rawValue: value,
        unit: config.unit,
        color: config.color,
        gradient: themeColors.gradients[key] || [config.color, config.color],
        status,
        trend,
        trendDirection,
        IconComponent: ICON_MAP[key] || Thermometer,
      };
    });
  }, [current, history, themeColors, farmerFeatures]);

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
      {/* Enterprise Top Navigation & Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.badgeRow}>
            <View style={styles.brandBadge}>
              <View style={styles.brandDot} />
              <Text style={styles.brandBadgeText}>NFT AUTONOMOUS FACILITY</Text>
            </View>
            {lastUpdated ? (
              <View style={styles.timestampBadge}>
                <Clock size={11} color={themeColors.textMuted} />
                <Text style={styles.timestampText}>
                  {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.title}>Hydroponic Telemetry</Text>
          <Text style={styles.subtitle}>
            Real-time closed-loop monitoring & actuator automation
          </Text>
        </View>

        <View style={styles.headerRight}>
          <PressableScale
            style={styles.syncBtn}
            onPress={refresh}
            activeScale={0.94}
            accessibilityLabel="Refresh telemetry"
          >
            <RotateCcw size={16} color={themeColors.textSecondary} />
          </PressableScale>

          <PressableScale
            style={[
              styles.connectionPill,
              isDeviceOnline
                ? activeSource === 'local'
                  ? styles.localPill
                  : styles.cloudPill
                : styles.offlinePill,
            ]}
            onPress={() => setShowConnectionModal(true)}
            activeScale={0.96}
          >
            <View
              style={[
                styles.connectionDot,
                isDeviceOnline
                  ? activeSource === 'local'
                    ? styles.localDot
                    : styles.cloudDot
                  : styles.offlineDot,
              ]}
            />
            <Text
              style={[
                styles.connectionPillText,
                isDeviceOnline
                  ? activeSource === 'local'
                    ? styles.localPillText
                    : styles.cloudPillText
                  : styles.offlinePillText,
              ]}
            >
              {isDeviceOnline
                ? activeSource === 'local'
                  ? `LAN DIRECT (${localDevice?.ip || 'LAN'})`
                  : 'CLOUD FIRESTORE'
                : 'OFFLINE'}
            </Text>
            <Settings size={13} color={isDeviceOnline ? themeColors.primary : themeColors.dangerDark} />
          </PressableScale>
        </View>
      </View>

      {/* KPI Overview Summary Ribbon */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCardWrapper}>
          <GlassCard style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>SYSTEM STATUS</Text>
              <Cpu size={15} color={isDeviceOnline ? themeColors.primary : themeColors.textMuted} />
            </View>
            <View style={styles.kpiBottom}>
              <Text style={[styles.kpiValue, { color: isDeviceOnline ? themeColors.primary : themeColors.dangerDark }]}>
                {isDeviceOnline ? 'Operational' : 'Disconnected'}
              </Text>
              <StatusBadge
                label={isDeviceOnline ? 'ONLINE' : 'OFFLINE'}
                status={isDeviceOnline ? 'normal' : 'critical'}
                pulse={isDeviceOnline}
              />
            </View>
          </GlassCard>
        </View>

        <View style={styles.kpiCardWrapper}>
          <GlassCard style={styles.kpiCard}>
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
          <GlassCard style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>SENSOR EQUILIBRIUM</Text>
              <Layers size={15} color={themeColors.secondary} />
            </View>
            <View style={styles.kpiBottom}>
              <Text style={styles.kpiValue}>
                {sensorCards.length > 0 ? `${optimalCount} of ${sensorCards.length} Optimal` : 'Analyzing'}
              </Text>
              <Text style={styles.kpiSub}>
                {optimalCount === sensorCards.length ? '100% In Spec' : `${sensorCards.length - optimalCount} Deviation`}
              </Text>
            </View>
          </GlassCard>
        </View>
      </View>

      {/* Sensor Error State */}
      {error ? (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.errorCard}>
          <View style={styles.errorHeader}>
            <AlertTriangle size={18} color={themeColors.dangerDark} />
            <Text style={styles.errorTitle}>Telemetry Ingestion Error</Text>
          </View>
          <Text style={styles.errorText}>{error}</Text>
          {typeof error === 'string' && error.includes('Settings') && (
            <PressableScale
              style={styles.errorButton}
              onPress={() => router.push('/(tabs)/settings')}
              activeScale={0.96}
            >
              <Text style={styles.errorButtonText}>Configure ESP32 Device in Settings</Text>
            </PressableScale>
          )}
        </Animated.View>
      ) : null}

      {/* Loading Skeleton Placeholder */}
      {!current && loading ? (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.placeholderCard}>
          <ActivityIndicator size="small" color={themeColors.primary} style={{ marginBottom: 12 }} />
          <Text style={styles.placeholderTitle}>Synchronizing Telemetry Packet</Text>
          <Text style={styles.placeholderText}>
            Establishing bi-directional stream with Firestore real-time listener...
          </Text>
        </Animated.View>
      ) : null}

      {/* Empty State */}
      {!current && !loading && !error ? (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.placeholderCard}>
          <Radio size={28} color={themeColors.primary} style={{ marginBottom: 10 }} />
          <Text style={styles.placeholderTitle}>Awaiting Hardware Broadcast</Text>
          <Text style={styles.placeholderText}>
            Connect your ESP32 controller or simulate sample observations to inspect readings.
          </Text>
        </Animated.View>
      ) : null}

      {/* Sensor Cards Telemetry Grid */}
      {current ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Environmental Telemetry Array</Text>
            <Text style={styles.sectionSubtitle}>
              Continuous sensor observations with real-time drift sparklines
            </Text>
          </View>

          <View style={styles.cardsGrid}>
            {sensorCards.map((sensor, index) => {
              const sparkline =
                history && history.length > 0
                  ? history.slice(0, 8).map((h) => h[sensor.key]).reverse()
                  : undefined;

              return (
                <Animated.View
                  key={sensor.key}
                  entering={FadeInDown.delay(index * 40).duration(350)}
                  style={styles.sensorCardWrap}
                >
                  <SensorCard
                    sensorKey={sensor.key}
                    value={sensor.rawValue !== undefined ? sensor.rawValue : sensor.value}
                    unit={sensor.unit}
                    label={sensor.label}
                    color={sensor.color}
                    gradient={sensor.gradient}
                    sparklineData={sparkline}
                    onPress={() => router.push({ pathname: '/dashboard/[sensorId]', params: { sensorId: sensor.key } })}
                  />
                </Animated.View>
              );
            })}
          </View>

          {/* Subsystem Actuation & Autopilot Widget */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Hardware Actuation & Loop Controls</Text>
            <Text style={styles.sectionSubtitle}>
              Low-latency command dispatch to local relays and nutrient dosing manifolds
            </Text>
          </View>

          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <GlassCard style={styles.controlsCard} glowColor={themeColors.primary}>
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
        onClose={() => setShowConnectionModal(false)}
        onRefreshTelemetry={refresh}
      />
    </ScrollView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: spacing.lg,
      paddingTop: Platform.OS === 'ios' ? spacing.xxl : spacing.xl,
      paddingBottom: spacing.xxl,
      maxWidth: 1400,
      width: '100%',
      alignSelf: 'center',
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.lg,
      flexWrap: 'wrap',
      gap: 16,
    },
    headerLeft: {
      flex: 1,
      minWidth: 260,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    brandBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(10, 77, 60, 0.08)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.xs,
    },
    brandDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.primary,
    },
    brandBadgeText: {
      color: theme.primary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    timestampBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    timestampText: {
      fontSize: 11,
      color: theme.textMuted,
      fontWeight: '500',
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: theme.text,
      letterSpacing: -0.6,
    },
    subtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 2,
      letterSpacing: -0.1,
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
      fontSize: 11,
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
      minWidth: 200,
    },
    kpiCard: {
      padding: 16,
      borderRadius: borderRadius.md,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    kpiTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    kpiLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.textMuted,
      letterSpacing: 0.8,
    },
    kpiBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    kpiValue: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.text,
      letterSpacing: -0.3,
    },
    kpiSub: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: '600',
    },

    sectionHeader: {
      marginBottom: spacing.md,
      marginTop: spacing.sm,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      letterSpacing: -0.3,
    },
    sectionSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },

    cardsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    sensorCardWrap: {
      width: '48%',
      minWidth: 155,
      flexGrow: 1,
    },

    controlsCard: {
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
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
      fontSize: 14,
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
      backgroundColor: 'rgba(10, 77, 60, 0.06)',
      borderColor: 'rgba(10, 77, 60, 0.25)',
    },
    pumpInactiveBtn: {
      backgroundColor: theme.surfaceLight,
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
      backgroundColor: 'rgba(10, 77, 60, 0.15)',
    },
    controlLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },
    controlSubLabel: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2,
    },

    controlBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: borderRadius.xs,
    },
    controlBadgeOn: {
      backgroundColor: 'rgba(10, 77, 60, 0.12)',
    },
    controlBadgeOff: {
      backgroundColor: theme.surfaceMuted,
    },
    controlBadgeText: {
      fontSize: 10,
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
      fontSize: 13,
      color: theme.textSecondary,
    },
    infoValue: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
    },
    infoDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: spacing.xs,
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
      fontSize: 13,
      fontWeight: '700',
      color: theme.dangerDark,
    },
    errorText: {
      fontSize: 12,
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
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 12,
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
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    placeholderText: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
