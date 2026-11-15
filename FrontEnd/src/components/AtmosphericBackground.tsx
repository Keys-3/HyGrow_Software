import React from 'react';
import { View, StyleSheet, Platform, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AtmosphericBackgroundProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function AtmosphericBackground({ style, children }: AtmosphericBackgroundProps) {
  return (
    <View style={[styles.container, style]}>
      {/* Cinematic Multi-stop Dark Gradient */}
      <LinearGradient
        colors={['#08120D', '#0B1710', '#070D09']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Atmospheric Ambient Glow Orbs */}
      <View style={styles.glowTopCenter} pointerEvents="none" />
      <View style={styles.glowBottomRight} pointerEvents="none" />
      <View style={styles.glowAccentLeft} pointerEvents="none" />

      {/* Content */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#08120D',
  },
  glowTopCenter: {
    position: 'absolute',
    top: -120,
    left: '25%',
    width: 500,
    height: 400,
    borderRadius: 250,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
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
    backgroundColor: 'rgba(10, 77, 60, 0.16)',
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
    backgroundColor: 'rgba(52, 211, 153, 0.05)',
    ...Platform.select({
      web: {
        filter: 'blur(80px)',
        pointerEvents: 'none',
      } as any,
    }),
  },
});

export default AtmosphericBackground;
