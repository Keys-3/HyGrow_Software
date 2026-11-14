import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StyleProp, ViewStyle } from 'react-native';
import { useThemeColors, borderRadius, typography } from '../theme/theme';

export type BadgeStatus = 'normal' | 'warning' | 'critical' | 'online' | 'offline' | 'local' | 'info';

interface StatusBadgeProps {
  label: string;
  status?: BadgeStatus;
  pulse?: boolean;
  style?: StyleProp<ViewStyle>;
  customColor?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  status = 'normal',
  pulse = false,
  style,
  customColor,
}) => {
  const theme = useThemeColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (pulse) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.35,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [pulse]);

  const getColorConfig = () => {
    if (customColor) {
      return {
        bg: `${customColor}18`,
        border: `${customColor}35`,
        text: customColor,
        dot: customColor,
      };
    }

    switch (status) {
      case 'normal':
      case 'online':
        return {
          bg: theme.successLight,
          border: `${theme.success}35`,
          text: theme.success,
          dot: theme.success,
        };
      case 'local':
        return {
          bg: theme.infoLight,
          border: `${theme.secondary}35`,
          text: theme.secondary,
          dot: theme.secondary,
        };
      case 'warning':
        return {
          bg: theme.warningLight,
          border: `${theme.warning}40`,
          text: theme.warning,
          dot: theme.warning,
        };
      case 'critical':
        return {
          bg: theme.dangerLight,
          border: `${theme.danger}40`,
          text: theme.danger,
          dot: theme.danger,
        };
      case 'offline':
      default:
        return {
          bg: 'rgba(100, 116, 139, 0.12)',
          border: 'rgba(100, 116, 139, 0.25)',
          text: theme.textMuted,
          dot: theme.textMuted,
        };
    }
  };

  const colors = getColorConfig();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: colors.dot,
            opacity: pulse ? pulseAnim : 1,
          },
        ]}
      />
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default StatusBadge;

