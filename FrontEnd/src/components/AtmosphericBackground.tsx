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
  return (
    <View style={[styles.container, { backgroundColor: theme.background }, style]}>
      <LinearGradient
        colors={theme.globalBackground}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={[styles.blobSage, { backgroundColor: theme.isDarkMode ? '#35513F' : '#A9BD9B' }]} pointerEvents="none" {...({ className: 'hg-background-sage' } as any)} />
      <View style={[styles.blobPurple, { backgroundColor: theme.isDarkMode ? '#2A1B3B' : '#A855F7' }]} pointerEvents="none" {...({ className: 'hg-background-purple' } as any)} />

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
  blobSage: {
    position: 'absolute',
    top: '55%',
    left: '10%',
    width: 380,
    height: 380,
    borderRadius: 190,
    opacity: 0.32,
    ...Platform.select({
      web: {
        filter: 'blur(70px)',
        pointerEvents: 'none',
      } as any,
      default: { display: 'none' },
    }),
  },
  blobPurple: {
    position: 'absolute',
    bottom: -40,
    right: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.12,
    ...Platform.select({
      web: {
        filter: 'blur(70px)',
        pointerEvents: 'none',
      } as any,
      default: { display: 'none' },
    }),
  },
});

export default AtmosphericBackground;

