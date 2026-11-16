import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { ArrowRight, Sprout } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableScale } from './PressableScale';
import { borderRadius, spacing, useThemeColors } from '../theme/theme';

export type SageCardGraphic = 'scan' | 'yield' | 'telemetry' | 'inventory' | 'analytics' | 'market' | 'orders' | 'settings';
export type SageFeatureCardData = {
  tag: string;
  title: string;
  description: string;
  graphic: SageCardGraphic;
  metric?: number;
  unit?: string;
  onPress?: () => void;
};

function CountUp({ value, unit, color }: { value: number; unit?: string; color: string }) {
  const [shown, setShown] = useState(0);
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles({ isDarkMode: false }, width), [width]);
  useEffect(() => {
    const reduceMotion = Platform.OS === 'web'
      && typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (Platform.OS !== 'web' || reduceMotion || typeof requestAnimationFrame !== 'function') {
      setShown(value);
      return;
    }
    let start: number | null = null;
    let frame = 0;
    const update = (time: number) => {
      if (start === null) start = time;
      const progress = Math.min((time - start) / 1500, 1);
      setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <Text style={[styles.metric, { color }]}>{shown}<Text style={styles.metricUnit}>{unit}</Text></Text>;
}

function CardArt({ type, foreground, metric = 248, unit = ' kg' }: { type: SageCardGraphic; foreground: string; metric?: number; unit?: string }) {
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles({ isDarkMode: false }, width), [width]);
  if (type === 'yield') return (
    <View style={styles.yieldArt} pointerEvents="none">
      <CountUp value={metric} unit={unit} color="#A855F7" />
      <View style={styles.yieldBars}>
        {[28, 38, 35, 52, 64, 78, 100].map((height, i) => <View key={i} style={[styles.yieldBar, { height: `${height}%`, '--hg-delay': `${.2 + i * .1}s` } as any]} {...({ className: 'hg-motion-bar' } as any)} />)}
      </View>
      <Sprout size={28} color="#2F9E6B" style={styles.yieldLeaf} />
    </View>
  );

  if (type === 'scan') return (
    <View style={styles.scanArt} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 190 190" fill="none">
        <Circle cx="95" cy="95" r="82" stroke="#A9BD9B" strokeOpacity=".55" strokeDasharray="5 8" strokeWidth="2" />
        <Circle cx="95" cy="95" r="69" fill="#2F9E6B" fillOpacity=".3" stroke="#A9BD9B" strokeOpacity=".45" />
        <Path d="M15 184C37 89 87 24 180 7c6 74-51 151-165 177Z" fill="#3FB67F" fillOpacity=".58" />
        <Path d="M18 178C68 123 127 61 180 9" stroke="#D9E6E0" strokeWidth="3" strokeOpacity=".75" />
        <G {...({ className: 'hg-motion-radar' } as any)}><Path d="M95 95L95 14A81 81 0 0 1 168 60Z" fill="#D9E6E0" fillOpacity=".55" /></G>
        <Circle cx="124" cy="72" r="10" stroke="#A9BD9B" strokeWidth="3" {...({ className: 'hg-motion-marker' } as any)} />
        <Circle cx="65" cy="127" r="8" stroke="#A9BD9B" strokeWidth="3" {...({ className: 'hg-motion-marker' } as any)} />
      </Svg>
      <Text style={styles.scanPill}>Blight {metric}%</Text>
    </View>
  );

  if (type === 'analytics' || type === 'market') return (
    <Svg width="230" height="175" viewBox="0 0 230 175" fill="none" style={styles.genericArt}>
      <Path d="M14 150H218M24 128C61 120 64 82 99 91s49-51 75-30 31-12 42-30" stroke={foreground} strokeOpacity=".36" strokeWidth="3" strokeDasharray="280" strokeDashoffset="280" {...({ className: 'hg-motion-stem' } as any)} />
      {[0, 1, 2, 3, 4].map(i => <Rect key={i} x={32 + i * 34} y={136 - i * 17} width="14" height={14 + i * 17} rx="7" fill={foreground} fillOpacity=".24" {...({ className: 'hg-motion-bar' } as any)} style={{ '--hg-delay': `${i * .12}s` } as any} />)}
      <Circle cx="181" cy="56" r="20" fill={foreground} fillOpacity=".15" stroke={foreground} strokeOpacity=".6" {...({ className: 'hg-motion-pulse' } as any)} />
      <Path d="M179 57l8-12m-8 12 10 2" stroke={foreground} strokeWidth="2" />
    </Svg>
  );

  if (type === 'inventory') return (
    <Svg width="230" height="175" viewBox="0 0 230 175" fill="none" style={styles.genericArt}>
      {[0, 1, 2].map(i => <G key={i} {...({ className: 'hg-motion-pop' } as any)} style={{ '--hg-delay': `${i * .18}s` } as any}><Rect x={26 + i * 58} y="100" width="46" height="46" rx="10" fill={foreground} fillOpacity=".18" stroke={foreground} strokeOpacity=".5" /><Path d={`M${49 + i * 58} 100V68m0 20c-16 0-20-10-20-21 13 0 20 7 20 21m0-5c15 0 20-10 20-21-13 0-20 7-20 21`} fill="#2F9E6B" stroke={foreground} strokeOpacity=".6" strokeWidth="2" /></G>)}
      <Path d="M18 151h194M27 158v-14m175 14v-14" stroke={foreground} strokeOpacity=".5" strokeWidth="3" />
    </Svg>
  );

  if (type === 'orders') return (
    <Svg width="230" height="175" viewBox="0 0 230 175" fill="none" style={styles.genericArt}>
      <Path d="M18 135c46-40 75 18 110-13s58-30 84-16" stroke={foreground} strokeWidth="3" strokeDasharray="7 8" />
      {[30, 125, 210].map((x, i) => <Circle key={x} cx={x} cy={i === 0 ? 127 : i === 1 ? 122 : 106} r="8" fill="#2F9E6B" stroke={foreground} strokeWidth="2" {...({ className: 'hg-motion-marker' } as any)} style={{ '--hg-delay': `${i * .2}s` } as any} />)}
      <G {...({ className: 'hg-motion-pop' } as any)}><Path d="M70 40l40-18 42 18-41 20z" fill={foreground} fillOpacity=".4" stroke={foreground} strokeOpacity=".7" /><Path d="M70 40v52l41 22V60zm82 0v52l-41 22V60z" fill="#A9BD9B" fillOpacity=".46" stroke={foreground} strokeOpacity=".7" /><Path d="M110 22v38m-40-20 40 20 42-20" stroke={foreground} strokeOpacity=".7" /></G>
      <G {...({ className: 'hg-motion-van' } as any)}><Rect x="35" y="112" width="36" height="16" rx="5" fill={foreground} /><Circle cx="45" cy="132" r="5" fill="#fff" stroke={foreground} strokeWidth="2" /><Circle cx="65" cy="132" r="5" fill="#fff" stroke={foreground} strokeWidth="2" /></G>
    </Svg>
  );

  if (type === 'settings') return (
    <Svg width="230" height="175" viewBox="0 0 230 175" fill="none" style={styles.genericArt}>
      <G {...({ className: 'hg-motion-gear' } as any)}><Circle cx="112" cy="82" r="46" fill={foreground} fillOpacity=".15" stroke={foreground} strokeOpacity=".7" strokeWidth="6" /><Circle cx="112" cy="82" r="17" fill="#2F9E6B" /><Path d="M112 65v34m0-17c-19 0-24-11-24-22 16 0 24 7 24 22m0-4c18 0 24-11 24-22-16 0-24 7-24 22" stroke={foreground} strokeWidth="2" /></G>
      <G {...({ className: 'hg-motion-gear-reverse' } as any)}><Circle cx="180" cy="125" r="27" fill="#A9BD9B" fillOpacity=".25" stroke={foreground} strokeOpacity=".55" strokeWidth="5" /><Circle cx="180" cy="125" r="8" fill={foreground} fillOpacity=".55" /></G>
      <Path d="M24 153h61m-54 0v-11m157 11v-11" stroke={foreground} strokeOpacity=".5" strokeWidth="3" />
    </Svg>
  );

  return (
    <Svg width="230" height="175" viewBox="0 0 230 175" fill="none" style={styles.genericArt}>
      <Circle cx="115" cy="86" r="60" stroke={foreground} strokeOpacity=".3" strokeDasharray="4 7" />
      <Path d="M115 112V50m0 38C83 88 72 69 72 48c28 0 43 13 43 40m0-10c30 0 43-19 43-40-28 0-43 13-43 40" fill="#2F9E6B" stroke={foreground} strokeOpacity=".75" strokeWidth="2" />
      <Circle cx="115" cy="112" r="10" fill="#A9BD9B" stroke={foreground} strokeWidth="2" {...({ className: 'hg-motion-pulse' } as any)} />
      <Path d="M188 36h12m-6-6v12m-14-6h-12" stroke={foreground} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

export function SageFeatureCards({ cards, variant }: { cards: SageFeatureCardData[]; variant?: 'market' }) {
  const theme = useThemeColors();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme, width), [theme, width]);
  const column = width >= 1000;

  return (
    <View style={styles.grid} {...(variant === 'market' ? ({ className: 'hg-market-feature-grid' } as any) : {})}>
      {cards.map((card, index) => {
        const forest = index === 0;
        const foreground = forest ? '#EAF6EF' : theme.isDarkMode ? theme.text : '#10241B';
        return (
          <PressableScale
            key={card.title}
            accessibilityRole="button"
            accessibilityLabel={`${card.title}. ${card.description}`}
            onPress={card.onPress}
            activeScale={0.98}
            style={[styles.pressable, column && index === 0 && styles.firstWide, column && index > 0 && styles.secondWide]}
            {...({ className: 'hg-feature-card' } as any)}
          >
            {forest ? (
              <View style={[styles.card, styles.forestCard]}>
                <CardArt type={card.graphic} foreground={foreground} metric={card.metric} unit={card.unit} />
                <CardContents card={card} foreground={foreground} muted={theme.textSecondary} forest />
              </View>
            ) : (
              <LinearGradient colors={theme.isDarkMode ? ['#2A1B3B', '#2A1B3B'] : ['#F1E4FD', '#F1E4FD']} style={styles.card}>
                <CardArt type={card.graphic} foreground={theme.isDarkMode ? '#D9B8F7' : '#A855F7'} metric={card.metric} unit={card.unit} />
                <CardContents card={card} foreground={foreground} muted={theme.textSecondary} />
              </LinearGradient>
            )}
          </PressableScale>
        );
      })}
    </View>
  );
}

function CardContents({ card, foreground, muted, forest = false }: { card: SageFeatureCardData; foreground: string; muted: string; forest?: boolean }) {
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles({ isDarkMode: forest }, width), [forest, width]);
  return <>
    <View style={[styles.arrow, forest && styles.arrowForest]} {...({ className: 'hg-card-arrow' } as any)}>
      <ArrowRight size={20} color={forest ? '#EAF6EF' : '#A855F7'} />
    </View>
    <View style={[styles.tag, forest ? styles.tagForest : styles.tagPurple]}>
      <Sprout size={14} color={forest ? '#C9E3C4' : '#A855F7'} />
      <Text style={[styles.tagText, { color: forest ? '#C9E3C4' : '#A855F7' }]}>{card.tag.toUpperCase()}</Text>
    </View>
    <Text style={[styles.cardTitle, { color: foreground }]}>{card.title}</Text>
    <Text style={[styles.description, { color: forest ? '#D4E9DC' : muted }]} {...({ className: 'hg-card-description' } as any)} numberOfLines={2}>{card.description}</Text>
  </>;
}

const createStyles = (theme: any, width: number) => {
  const isSmall = width < 500;
  const isTouch = width < 768;
  return StyleSheet.create({
    grid: { flexDirection: width >= 1000 ? 'row' : 'column', gap: isSmall ? 16 : 22, marginTop: isSmall ? 16 : 22, marginBottom: spacing.xl, width: '100%' },
    pressable: { minHeight: isSmall ? 210 : 280, borderRadius: isSmall ? 24 : 44, overflow: 'hidden', flex: 1 },
    firstWide: { flex: 1.25 },
    secondWide: { flex: 1 },
    card: { minHeight: isSmall ? 210 : 280, borderRadius: isSmall ? 24 : 44, padding: isSmall ? 20 : 30, overflow: 'hidden', justifyContent: 'flex-end', position: 'relative', borderWidth: theme.isDarkMode ? 1 : 0, borderColor: theme.isDarkMode ? '#243429' : 'transparent' },
    forestCard: { backgroundColor: '#0E4F3B', shadowColor: '#0E4F3B', shadowOpacity: .28, shadowRadius: 28, elevation: 7 },
    arrow: { position: 'absolute', right: isSmall ? 16 : 26, top: isSmall ? 16 : 26, width: isSmall ? 38 : 46, height: isSmall ? 38 : 46, borderRadius: 999, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
    arrowForest: { backgroundColor: 'rgba(169,189,155,.22)' },
    tag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginBottom: 10 },
    tagForest: { backgroundColor: 'rgba(169,189,155,.22)' },
    tagPurple: { backgroundColor: theme.isDarkMode ? '#38264B' : '#E7D8F2' },
    tagText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    cardTitle: { fontFamily: Platform.OS === 'web' ? 'Fraunces' : 'serif', fontSize: isSmall ? 22 : 29, lineHeight: isSmall ? 27 : 34, fontWeight: '700', maxWidth: '88%' },
    description: { fontSize: 13, lineHeight: 20, marginTop: 7, maxWidth: 360, ...Platform.select({ web: { opacity: isTouch ? 1 : 0, maxHeight: isTouch ? 'none' : 0, overflow: 'hidden', transition: 'opacity .35s ease, max-height .35s ease' } as any }) },
    genericArt: { position: 'absolute', right: isSmall ? -25 : 25, top: isSmall ? 8 : 14, opacity: isSmall ? 0.35 : 0.8, ...(isSmall ? { transform: [{ scale: 0.75 }] } : {}) },
    scanArt: { position: 'absolute', width: isSmall ? 140 : 190, height: isSmall ? 140 : 190, right: isSmall ? 16 : 46, top: isSmall ? 20 : 40, borderRadius: 999, overflow: 'visible', backgroundColor: '#1B6B4A', alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { boxShadow: '0 0 0 8px rgba(169,189,155,.2),0 0 0 9px rgba(169,189,155,.5)' } as any }) },
    scanPill: { position: 'absolute', right: -2, bottom: -5, color: '#10241B', backgroundColor: '#A9BD9B', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontSize: isSmall ? 11 : 12, fontWeight: '800' },
    yieldArt: { position: 'absolute', left: isSmall ? 20 : 30, right: isSmall ? 20 : 30, top: isSmall ? 16 : 24, height: isSmall ? 125 : 175 },
    metric: { fontFamily: Platform.OS === 'web' ? 'Fraunces' : 'serif', fontSize: isSmall ? 40 : 58, fontWeight: '700', letterSpacing: -2, lineHeight: isSmall ? 46 : 64 },
    metricUnit: { fontFamily: 'Manrope', fontSize: isSmall ? 15 : 18, fontWeight: '500', letterSpacing: 0 },
    yieldBars: { position: 'absolute', left: 0, right: 20, bottom: 0, height: isSmall ? 60 : 94, flexDirection: 'row', alignItems: 'flex-end', gap: isSmall ? 6 : 10 },
    yieldBar: { flex: 1, borderRadius: 99, backgroundColor: '#A855F7', maxHeight: '100%' },
    yieldLeaf: { position: 'absolute', top: isSmall ? 40 : 60, right: -8 },
  });
};

export default SageFeatureCards;

