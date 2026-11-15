import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  G,
} from 'react-native-svg';
import { Activity, Droplets, Zap, Wind, CheckCircle2 } from 'lucide-react-native';
import { useThemeColors } from '../theme/theme';

export function HeroBotanicalVisual() {
  const theme = useThemeColors();
  const styles = createStyles(theme);
  return (
    <View style={styles.container}>
      {/* Background SVG Grid & Orbital Geometry */}
      <View style={styles.svgWrapper}>
        <Svg width="360" height="360" viewBox="0 0 360 360" fill="none">
          <Defs>
            <SvgGradient id="emeraldGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={theme.primary} stopOpacity="0.8" />
              <Stop offset="100%" stopColor={theme.adapt('#0A4D3C', theme.secondaryDark)} stopOpacity="0.1" />
            </SvgGradient>
            <SvgGradient id="ringGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={theme.primary} stopOpacity="0.4" />
              <Stop offset="50%" stopColor={theme.primaryLight} stopOpacity="0.8" />
              <Stop offset="100%" stopColor={theme.adapt('#0A4D3C', theme.secondaryDark)} stopOpacity="0.1" />
            </SvgGradient>
            <SvgGradient id="coreGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={theme.primaryLight} stopOpacity="0.9" />
              <Stop offset="50%" stopColor={theme.primary} stopOpacity="0.5" />
              <Stop offset="100%" stopColor={theme.adapt('#064E3B', theme.secondaryDark)} stopOpacity="0" />
            </SvgGradient>
          </Defs>

          {/* Outer Orbital Rings */}
          <Circle
            cx="180"
            cy="180"
            r="160"
            stroke={theme.adapt('rgba(16, 185, 129, 0.12)', theme.primaryGlow)}
            strokeWidth="1"
            strokeDasharray="4 8"
          />
          <Circle
            cx="180"
            cy="180"
            r="135"
            stroke="url(#ringGrad)"
            strokeWidth="1.5"
            strokeDasharray="180 120"
          />
          <Circle
            cx="180"
            cy="180"
            r="105"
            stroke={theme.adapt('rgba(16, 185, 129, 0.2)', theme.primaryGlow)}
            strokeWidth="1"
          />

          {/* Organic Radial Geometry Lines */}
          <G opacity="0.4">
            <Path
              d="M180 20 L180 340"
              stroke={theme.adapt('rgba(52, 211, 153, 0.15)', theme.borderStrong)}
              strokeWidth="1"
            />
            <Path
              d="M20 180 L340 180"
              stroke={theme.adapt('rgba(52, 211, 153, 0.15)', theme.borderStrong)}
              strokeWidth="1"
            />
            <Path
              d="M67 67 L293 293"
              stroke={theme.adapt('rgba(52, 211, 153, 0.12)', theme.border)}
              strokeWidth="1"
            />
            <Path
              d="M67 293 L293 67"
              stroke={theme.adapt('rgba(52, 211, 153, 0.12)', theme.border)}
              strokeWidth="1"
            />
          </G>

          {/* Botanical Hydroponic Stem Vector */}
          <Path
            d="M180 260 C180 210, 160 190, 140 170 C120 150, 130 110, 180 90 C230 110, 240 150, 220 170 C200 190, 180 210, 180 260 Z"
            fill="url(#coreGlow)"
            stroke={theme.primary}
            strokeWidth="1.5"
          />

          {/* Nutrient Flow Spirals */}
          <Path
            d="M180 120 C160 140, 165 170, 180 190 C195 210, 190 230, 180 245"
            stroke={theme.primaryLight}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Core Concentric Node */}
          <Circle cx="180" cy="180" r="28" fill={theme.adapt('#0A2F24', theme.surfaceMuted)} stroke={theme.primary} strokeWidth="2" />
          <Circle cx="180" cy="180" r="14" fill={theme.primary} opacity="0.9" />
          <Circle cx="180" cy="180" r="6" fill="#FFFFFF" />

          {/* Satellite Sensor Dots */}
          <Circle cx="115" cy="100" r="4" fill={theme.primaryLight} />
          <Circle cx="245" cy="100" r="4" fill={theme.primaryLight} />
          <Circle cx="90" cy="210" r="3.5" fill={theme.primary} />
          <Circle cx="270" cy="210" r="3.5" fill={theme.primary} />
        </Svg>
      </View>

      {/* Floating Telemetry Chips */}
      {/* 1. Top Right: EC & Nutrient Equilibrium */}
      <View style={[styles.floatingCard, styles.cardTopRight]}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.dotCircle, { backgroundColor: theme.success }]} />
          <Text style={styles.cardBadge}>NUTRIENT FLOW</Text>
        </View>
        <View style={styles.cardValueRow}>
          <Zap size={13} color={theme.primary} />
          <Text style={styles.cardValueText}>1.85 mS/cm</Text>
        </View>
        <Text style={styles.cardSubText}>EC Target · In Envelope</Text>
      </View>

      {/* 2. Left: Root Zone pH */}
      <View style={[styles.floatingCard, styles.cardLeft]}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.dotCircle, { backgroundColor: '#38BDF8' }]} />
          <Text style={styles.cardBadge}>ROOT ZONE</Text>
        </View>
        <View style={styles.cardValueRow}>
          <Droplets size={13} color="#38BDF8" />
          <Text style={styles.cardValueText}>6.15 pH</Text>
        </View>
        <Text style={styles.cardSubText}>Optimal Vegetative</Text>
      </View>

      {/* 3. Bottom Right: Closed-Loop Pump State */}
      <View style={[styles.floatingCard, styles.cardBottomRight]}>
        <View style={styles.cardHeaderRow}>
          <CheckCircle2 size={11} color={theme.success} />
          <Text style={styles.cardBadge}>RECIRCULATION</Text>
        </View>
        <View style={styles.cardValueRow}>
          <Activity size={13} color={theme.primary} />
          <Text style={styles.cardValueText}>95% Cyclical</Text>
        </View>
        <Text style={styles.cardSubText}>Submersible Loop Active</Text>
      </View>

      {/* 4. Bottom Left: VPD & Transpiration */}
      <View style={[styles.floatingCard, styles.cardBottomLeft]}>
        <View style={styles.cardHeaderRow}>
          <Wind size={11} color={theme.sensor.vpd} />
          <Text style={styles.cardBadge}>ATMOSPHERIC</Text>
        </View>
        <View style={styles.cardValueRow}>
          <Text style={styles.cardValueText}>1.12 kPa</Text>
        </View>
        <Text style={styles.cardSubText}>VPD Transpiration Ideal</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 420,
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 12,
  },
  svgWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCard: {
    position: 'absolute',
    backgroundColor: theme.adapt('rgba(10, 24, 18, 0.85)', theme.surfaceGlass),
    borderWidth: 1,
    borderColor: theme.adapt('rgba(52, 211, 153, 0.25)', theme.border),
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 125,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35), 0 0 16px rgba(16, 185, 129, 0.12)',
      },
      default: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
      },
    }),
  },
  cardTopRight: {
    top: 16,
    right: 12,
  },
  cardLeft: {
    top: 110,
    left: 8,
  },
  cardBottomRight: {
    bottom: 24,
    right: 16,
  },
  cardBottomLeft: {
    bottom: 40,
    left: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  dotCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardBadge: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: theme.adapt('#9CB0A2', theme.textSecondary),
    textTransform: 'uppercase',
  },
  cardValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginVertical: 1,
  },
  cardValueText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.adapt('#F8FAF8', theme.text),
    letterSpacing: -0.2,
  },
  cardSubText: {
    fontSize: 10,
    color: theme.adapt('#687D70', theme.textMuted),
    fontWeight: '500',
  },
});

