import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors, borderRadius, shadows } from '../theme/theme';
import PressableScale from './PressableScale';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  gradientColors?: [string, string, ...string[]];
  borderColor?: string;
  onPress?: () => void;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  contentStyle,
  gradientColors,
  borderColor,
  onPress,
  hoverEffect = true,
}) => {
  const theme = useThemeColors();

  const defaultGradient: [string, string] = [
    theme.adapt(theme.surfaceGlass, 'rgba(156, 175, 136, 0.14)'),
    theme.adapt(theme.surfaceLight, theme.surface),
  ];

  const colors = gradientColors || defaultGradient;
  const border = borderColor || theme.border;

  const cardContent = (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.card,
        {
          borderColor: border,
        },
        shadows.card,
        style,
      ]}
    >
      <View style={[styles.innerHighlight, { borderColor: 'rgba(255, 255, 255, 0.05)' }]} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </LinearGradient>
  );

  if (onPress) {
    return (
      <PressableScale onPress={onPress}>
        {cardContent}
      </PressableScale>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      web: {
        contain: 'layout style',
      } as any,
    }),
  },
  innerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    zIndex: 1,
  },
  content: {
    position: 'relative',
    zIndex: 2,
  },
});

export default GlassCard;

