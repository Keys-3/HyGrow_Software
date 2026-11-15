import React from 'react';
import { View, StyleSheet, Platform, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../theme/theme';

interface AtmosphericBackgroundProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function AtmosphericBackground({ style, children }: AtmosphericBackgroundProps) {
  const theme = useThemeColors();
  const glowStyle = { backgroundColor: theme.ambientGlow };
  return (
    <View style={[styles.container, { backgroundColor: theme.background }, style]}>
      <LinearGradient
        colors={theme.globalBackground}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Atmospheric Ambient Glow Orbs */}
      <View style={[styles.glowTopCenter, glowStyle]} pointerEvents="none" />
      <View style={[styles.glowBottomRight, glowStyle]} pointerEvents="none" />
      <View style={[styles.glowAccentLeft, glowStyle]} pointerEvents="none" />

      {/* Content */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  glowTopCenter: {
    position: 'absolute',
    top: -120,
    left: '25%',
    width: 500,
    height: 400,
    borderRadius: 250,
    ...Platform.select({
      web: {
        filter: 'blur(90px)',
        pointerEvents: 'none',
      } as any,
    }),
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: -60,
    right: -60,
    width: 450,
    height: 450,
    borderRadius: 225,
    ...Platform.select({
      web: {
        filter: 'blur(100px)',
        pointerEvents: 'none',
      } as any,
    }),
  },
  glowAccentLeft: {
    position: 'absolute',
    top: '40%',
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    ...Platform.select({
      web: {
        filter: 'blur(80px)',
        pointerEvents: 'none',
      } as any,
    }),
  },
});

export default AtmosphericBackground;

