/**
 * Farm Help — Dashboard Screen
 * Modern, Professional UI with Light/Dark Mode
 */

import { useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Thermometer, Droplets, FlaskConical, Zap, Waves, Sun, Moon, Cloud, ThermometerSnow, Wind } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { sensorNote } from '../../../src/utils/telemetry';
import useSensorData from '../../../src/hooks/useSensorData';
import useAppStore from '../../../src/store/useAppStore';
import { useThemeColors, borderRadius, shadows, spacing, typography } from '../../../src/theme/theme';
import { GradientText } from '../../../src/components/GradientText';
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
  tds: Zap,
  waterLevel: Waves,
  lightIntensity: Sun,
  vpd: Cloud,
  waterTemp: ThermometerSnow,
  co2: Wind,
};

export default function DashboardScreen() {
  const router = useRouter();
  const { current, history, loading, error, refresh, stale, source } = useSensorData();
  const lastUpdated = useAppStore((state) => state.lastUpdated);
  const isDeviceOnline = useAppStore((state) => state.isDeviceOnline);
  const farmerFeatures = useAppStore((state) => state.farmerFeatures);
  
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const sensorCards = useMemo(() => {
    if (!current) return [];

    return SENSOR_KEYS.filter(key => farmerFeatures?.sensors?.[key] !== false).map((key) => {
      const config = SENSOR_CONFIG[key];
      const value = current[key];
      const note = sensorNote(current,key,stale);
      const status = value === null || stale || note !== 'Measured' ? 'unknown' : getSensorStatus(key,value);

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
      
      return {
        key,
        label: config.label,
        value: formatSensorValue(key, value),
        rawValue: value,
        unit: config.unit,
        color: config.color,
        gradient: themeColors.gradients[key] || [config.color, config.color],
        status,
        note,
        trend,
        trendDirection,
        IconComponent: ICON_MAP[key] || Thermometer,
      };
    });
  }, [current, history, themeColors, farmerFeatures, stale]);

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
            Estimated sample time: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'N/A'}
          </Text>
        </View>
      </View>

      {/* Banner Image */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.bannerContainer}>
        <Image 
          source={require('../../../assets/images/banner.jpg')} 
          style={styles.bannerImage}
        />
        <LinearGradient
          colors={['transparent', 'rgba(6, 78, 59, 0.8)']}
          style={styles.bannerOverlay}
        >
          <Text style={styles.bannerTitle}>Grow Monitoring</Text>
          <Text style={styles.bannerSubtitle}>Powered by AI & IoT</Text>
        </LinearGradient>
      </Animated.View>

      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusBadge,
            isDeviceOnline ? styles.onlineBadge : styles.offlineBadge,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              isDeviceOnline ? styles.onlineDot : styles.offlineDot,
            ]}
          />
          <Text
            style={[
              styles.statusText,
              isDeviceOnline ? styles.onlineText : styles.offlineText,
            ]}
          >
            {current ? `${source === 'local' ? 'Local HTTP' : 'Cloud'} · ${stale ? 'Stale sample' : 'Fresh sample'}` : 'Waiting for device'}
          </Text>
        </View>
      </View>

      {/* Error */}
      {error ? (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.errorCard}>
          <Text style={styles.errorTitle}>Sensor Error</Text>
          <Text style={styles.errorText}>{error}</Text>
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
              const threshold = SENSOR_THRESHOLDS[sensor.key];
              const statusStyle = getStatusStyles(sensor.status, themeColors);
              const Icon = sensor.IconComponent;

              return (
                <Animated.View 
                  key={sensor.key} 
                  entering={FadeInDown.delay(index * 100).duration(500)}
                  style={styles.sensorCardWrap}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/dashboard/[sensorId]', params: { sensorId: sensor.key } })}
                    style={{ flex: 1 }}
                  >
                    <LinearGradient
                      colors={themeColors.cardGradients.default}
                      style={[styles.sensorCard, { borderColor: sensor.color + '40', borderWidth: 1 }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {/* Massive Watermark Icon */}
                      <View style={styles.watermarkContainer}>
                        <Icon color={sensor.color} size={110} opacity={0.06} style={{ transform: [{ rotate: '-15deg' }] }} />
                      </View>

                      <LinearGradient
                        colors={sensor.gradient}
                        style={styles.sensorAccent}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />

                      <View style={styles.cardTop}>
                        <View style={[styles.iconWrap, { backgroundColor: sensor.color + '15' }]}>
                          <Icon color={sensor.color} size={22} />
                        </View>

                        <View
                          style={[
                            styles.sensorStatusPill,
                            { backgroundColor: statusStyle.bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.sensorStatusText,
                              { color: statusStyle.text },
                            ]}
                          >
                            {sensor.note !== 'Measured' ? sensor.note : statusStyle.label}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.sensorLabel, { color: sensor.color }]}>{sensor.label}</Text>

                      <Text 
                        style={[styles.sensorValue, { color: sensor.color }]}
                      >
                        {sensor.value}
                      </Text>
                      {sensor.unit ? (
                        <Text style={[styles.sensorUnit, { color: sensor.color, opacity: 0.8 }]}>{sensor.unit}</Text>
                      ) : null}

                      <Text style={[styles.sensorRange, { color: sensor.color, opacity: 0.7 }]}>
                        Ideal: {threshold.min}–{threshold.max} {threshold.unit}
                      </Text>

                      {sensor.trend ? (
                        <View style={[styles.trendContainer, { backgroundColor: sensor.color + '15' }]}>
                          <Text style={[styles.trendIcon, { color: sensor.color }]}>
                            {sensor.trendDirection === 'up' ? '↗ ' : sensor.trendDirection === 'down' ? '↘ ' : '→ '}
                          </Text>
                          <Text style={[styles.trendText, { color: sensor.color }]}>
                            {sensor.trend} {sensor.unit || ''}
                          </Text>
                        </View>
                      ) : null}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          {/* System Controls & Overview */}
          <Animated.View entering={FadeInDown.delay(600).duration(500)}>
            <LinearGradient 
              colors={themeColors.cardGradients.default}
              style={[styles.controlsCard, { borderColor: themeColors.primary + '40', borderWidth: 1 }]}
            >
              <Text style={styles.controlsTitle}>System Status</Text>

              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Pump Status</Text>
                <View
                  style={[
                    styles.controlBadge,
                    current.pumpStatus
                      ? styles.controlBadgeOn
                      : styles.controlBadgeOff,
                  ]}
                >
                  <Text
                    style={[
                      styles.controlBadgeText,
                      current.pumpStatus
                        ? styles.controlBadgeTextOn
                        : styles.controlBadgeTextOff,
                    ]}
                  >
                    {current.pumpStatus === null ? 'UNAVAILABLE' : current.pumpStatus ? 'ACTIVE' : 'IDLE'}
                  </Text>
                </View>
              </View>
              <View style={styles.infoDivider} />
              
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Automation</Text>
                <View
                  style={[
                    styles.controlBadge,
                    current.autoMode
                      ? styles.controlBadgeOn
                      : styles.controlBadgeOff,
                  ]}
                >
                  <Text
                    style={[
                      styles.controlBadgeText,
                      current.autoMode
                        ? styles.controlBadgeTextOn
                        : styles.controlBadgeTextOff,
                    ]}
                  >
                    {current.autoMode === null ? 'UNAVAILABLE' : current.autoMode ? 'ENABLED' : 'MANUAL'}
                  </Text>
                </View>
              </View>
              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Estimated sample time</Text>
                <Text style={styles.infoValue}>
                  {current?.lastSensorTimestamp
                    ? new Date(current.lastSensorTimestamp).toLocaleTimeString()
                    : 'N/A'}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </>
      ) : null}
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
    resizeMode: 'cover',
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
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bannerSubtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
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
  offlineText: {
    color: theme.dangerDark,
  },

  errorCard: {
    backgroundColor: theme.dangerLight,
    borderWidth: 1,
    borderColor: theme.dangerBorder,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
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
    ...shadows.card,
  },
  controlsTitle: {
    ...typography.h3,
    color: theme.text,
    marginBottom: spacing.md,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  controlLabel: {
    ...typography.body,
    fontWeight: '600',
    color: theme.text,
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
    fontSize: 12,
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