/**
 * Farm Help — Dashboard Screen
 * Modern, Professional UI with Light/Dark Mode
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
  Image,
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
  Moon,
  Cloud,
  ThermometerSnow,
  Wind,
  Radio,
  Wifi,
  HardDrive,
  Settings,
  Power,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import useSensorData from '../../../src/hooks/useSensorData';
import useAppStore from '../../../src/store/useAppStore';
import { useThemeColors, borderRadius, shadows, spacing, typography } from '../../../src/theme/theme';
import { GradientText } from '../../../src/components/GradientText';
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
  const connectionMode = useAppStore((state) => state.connectionMode);
  const localDevice = useAppStore((state) => state.localDevice);
  const togglePump = useAppStore((state) => state.togglePump);

  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [isTogglingPump, setIsTogglingPump] = useState(false);
  
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const sensorCards = useMemo(() => {
    if (!current) return [];

    return SENSOR_KEYS.filter(key => farmerFeatures?.sensors?.[key] !== false).map((key) => {
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
      
      // If trend is still null (no history or diff is too small), use mock data
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <GradientText 
            colors={themeColors.gradients.primary} 
            style={styles.title}
          >
            Farm Dashboard
          </GradientText>
          <Text style={styles.subtitle}>
            Real-time hydroponics monitoring
          </Text>
          <Text style={[styles.subtitle, { fontSize: 12, marginTop: 4 }]}>
            Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'N/A'}
          </Text>
        </View>
      </View>

      {/* Banner Image */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.bannerContainer}>
        <Image 
          source={require('../../../assets/images/banner.jpg')} 
          style={styles.bannerImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(9, 13, 22, 0.88)']}
          style={styles.bannerOverlay}
        >
          <View style={styles.bannerBadge}>
            <View style={styles.bannerBadgeDot} />
            <Text style={styles.bannerBadgeText}>CLOSED-LOOP NFT</Text>
          </View>
          <Text style={styles.bannerTitle}>Precision Hydroponics</Text>
          <Text style={styles.bannerSubtitle}>Sub-second autonomous telemetry & nutrient dosing</Text>
        </LinearGradient>
      </Animated.View>

      <View style={styles.statusRow}>
        <PressableScale
          style={[
            styles.statusBadge,
            isDeviceOnline
              ? activeSource === 'local'
                ? styles.localOnlineBadge
                : styles.onlineBadge
              : styles.offlineBadge,
          ]}
          onPress={() => setShowConnectionModal(true)}
          activeScale={0.97}
        >
          <View
            style={[
              styles.statusDot,
              isDeviceOnline
                ? activeSource === 'local'
                  ? styles.localDot
                  : styles.onlineDot
                : styles.offlineDot,
            ]}
          />
          <Text
            style={[
              styles.statusText,
              isDeviceOnline
                ? activeSource === 'local'
                  ? styles.localText
                  : styles.onlineText
                : styles.offlineText,
            ]}
          >
            {isDeviceOnline
              ? activeSource === 'local'
                ? `LAN DIRECT: ${localDevice?.ip || 'ACTIVE'}`
                : 'CLOUD TELEMETRY ACTIVE'
              : 'SYSTEM OFFLINE • TAP TO CONFIGURE'}
          </Text>

          {activeSource === 'local' && localDevice?.latencyMs !== undefined && (
            <View style={styles.miniLatencyBadge}>
              <Text style={styles.miniLatencyText}>{localDevice.latencyMs}ms</Text>
            </View>
          )}

          <Settings
            size={14}
            color={
              isDeviceOnline
                ? activeSource === 'local'
                  ? '#047857'
                  : themeColors.successDark
                : themeColors.dangerDark
            }
            style={{ marginLeft: 6 }}
          />
        </PressableScale>
      </View>

      {/* Error */}
      {error ? (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.errorCard}>
          <Text style={styles.errorTitle}>Sensor Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          {typeof error === 'string' && error.includes('Settings') && (
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => router.push('/(tabs)/settings')}
              activeOpacity={0.8}
            >
              <Text style={styles.errorButtonText}>Go to Settings to Configure Device</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      ) : null}

      {/* Loading */}
      {!current && loading ? (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>Loading sensor data...</Text>
          <Text style={styles.placeholderText}>
            Syncing the latest real-time data from Firestore.
          </Text>
        </Animated.View>
      ) : null}

      {/* Empty */}
      {!current && !loading && !error ? (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>No sensor data yet</Text>
          <Text style={styles.placeholderText}>
            Sensor readings will appear here once your ESP32 starts transmitting.
          </Text>
        </Animated.View>
      ) : null}

      {/* Sensor cards */}
      {current ? (
        <>
          <View style={styles.cardsGrid}>
            {sensorCards.map((sensor, index) => {
              const sparkline =
                history && history.length > 0
                  ? history.slice(0, 8).map((h) => h[sensor.key]).reverse()
                  : undefined;

              return (
                <Animated.View
                  key={sensor.key}
                  entering={FadeInDown.delay(index * 60).duration(400)}
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

          {/* System Controls & Actuator State */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <GlassCard style={styles.controlsCard} glowColor="#10B981">
              <View style={styles.controlsHeader}>
                <View style={styles.controlsHeaderLeft}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.controlsTitle}>Actuator & Subsystem Control</Text>
                </View>
                <StatusBadge
                  label={current.pumpStatus ? 'PUMP ONLINE' : 'STANDBY'}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.pumpIconWrap, current.pumpStatus && styles.pumpIconWrapActive]}>
                    <Power size={20} color={current.pumpStatus ? '#10B981' : themeColors.textMuted} />
                  </View>
                  <View>
                    <Text style={styles.controlLabel}>Submersible Dosing Pump</Text>
                    <Text style={styles.controlSubLabel}>
                      Tap to {current.pumpStatus ? 'stop recirculation' : 'trigger continuous circulation'}
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
                <Text style={styles.infoLabel}>Nutrient Autopilot</Text>
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
                    {current.autoMode ? 'ENABLED' : 'MANUAL'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <PressableScale
                style={styles.infoRowPressable}
                onPress={() => setShowConnectionModal(true)}
                activeScale={0.98}
              >
                <Text style={styles.infoLabel}>Telemetry Ingestion</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.infoValue, { color: themeColors.primary, fontWeight: '700' }]}>
                    {activeSource === 'local' ? `LAN (${localDevice?.ip || 'Direct'})` : activeSource === 'cloud' ? 'Cloud Firestore' : 'Disconnected'}
                  </Text>
                  <Settings size={14} color={themeColors.primary} />
                </View>
              </PressableScale>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Packet Received</Text>
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

/* ---------------------- local helpers ---------------------- */

function getStatusStyles(status, themeColors) {
  switch (status) {
    case 'critical':
      return {
        label: 'Critical',
        bg: themeColors.dangerLight,
        text: themeColors.dangerDark,
      };
    case 'warning':
      return {
        label: 'Warning',
        bg: themeColors.warningLight,
        text: themeColors.warningDark,
      };
    case 'normal':
      return {
        label: 'Optimal',
        bg: themeColors.successLight,
        text: themeColors.successDark,
      };
    default:
      return {
        label: 'Unknown',
        bg: themeColors.surfaceMuted,
        text: themeColors.textMuted,
      };
  }
}

/* ---------------------- styles ---------------------- */

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? spacing.xxl : spacing.xl,
    paddingBottom: spacing.xxl,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    ...typography.h1,
    color: theme.text,
  },
  subtitle: {
    ...typography.bodySmall,
    color: theme.textSecondary,
    marginTop: 2,
  },
  
  bannerContainer: {
    width: '100%',
    height: 140,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    justifyContent: 'flex-end',
  },
  bannerTitle: {
    ...typography.h3,
    color: '#FFFFFF',
    ...Platform.select({
      web: {
        textShadow: '0 1px 4px rgba(0, 0, 0, 0.5)',
      },
      default: {
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      },
    }),
  },
  bannerSubtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  bannerBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  bannerBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  
  statusRow: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  onlineBadge: {
    backgroundColor: theme.successLight,
  },
  localOnlineBadge: {
    backgroundColor: '#D1FAE5',
  },
  offlineBadge: {
    backgroundColor: theme.dangerLight,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  onlineDot: {
    backgroundColor: theme.success,
  },
  localDot: {
    backgroundColor: '#059669',
  },
  offlineDot: {
    backgroundColor: theme.danger,
  },
  statusText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  onlineText: {
    color: theme.successDark,
  },
  localText: {
    color: '#065F46',
  },
  offlineText: {
    color: theme.dangerDark,
  },
  miniLatencyBadge: {
    backgroundColor: '#05966920',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: 6,
  },
  miniLatencyText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '700',
  },

  errorCard: {
    backgroundColor: theme.dangerLight,
    borderWidth: 1,
    borderColor: theme.dangerBorder,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  errorButton: {
    marginTop: spacing.md,
    backgroundColor: theme.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  errorTitle: {
    ...typography.h3,
    color: theme.dangerDark,
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.bodySmall,
    color: theme.dangerDark,
    lineHeight: 20,
  },

  placeholderCard: {
    backgroundColor: theme.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  placeholderTitle: {
    ...typography.h3,
    color: theme.text,
    marginBottom: spacing.sm,
  },
  placeholderText: {
    ...typography.bodySmall,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sensorCardWrap: {
    width: '48%',
    marginBottom: spacing.md,
  },
  sensorCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    overflow: 'hidden',
    ...shadows.card,
    flex: 1,
    position: 'relative',
  },
  watermarkContainer: {
    position: 'absolute',
    bottom: -15,
    right: -20,
    zIndex: -1,
  },
  sensorAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensorStatusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  sensorStatusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sensorLabel: {
    marginTop: spacing.lg,
    ...typography.bodySmall,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  sensorValue: {
    marginTop: spacing.xs,
    fontSize: typography.value.fontSize,
    fontWeight: typography.value.fontWeight,
    color: theme.text,
  },
  sensorUnit: {
    fontSize: typography.unit.fontSize,
    fontWeight: typography.unit.fontWeight,
    color: theme.textMuted,
  },
  sensorRange: {
    marginTop: spacing.xs,
    fontSize: 11,
    color: theme.textMuted,
    fontWeight: '500',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  trendIcon: {
    fontSize: 12,
    fontWeight: '800',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
  },

  controlsCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: theme.surface,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  controlsTitle: {
    ...typography.h3,
    color: theme.text,
  },
  controlRowBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 4,
  },
  pumpActiveBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  pumpInactiveBtn: {
    backgroundColor: theme.surfaceLight,
    borderColor: theme.border,
  },
  pumpIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pumpIconWrapActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
  },
  controlSubLabel: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 2,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  controlBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  controlBadgeOn: {
    backgroundColor: theme.successLight,
  },
  controlBadgeOff: {
    backgroundColor: theme.surfaceMuted,
  },
  controlBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  controlBadgeTextOn: {
    color: theme.successDark,
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
    ...typography.bodySmall,
    color: theme.textSecondary,
  },
  infoValue: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: theme.text,
  },
  infoDivider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: spacing.xs,
  },
});