import React, { useRef } from 'react';
import { Animated, Platform, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

interface PressableScaleProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  activeScale?: number;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PressableScale: React.FC<PressableScaleProps> = ({
  children,
  style,
  activeScale = 0.985,
  disabled = false,
  onPressIn,
  onPressOut,
  ...rest
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReducedMotion();

  if (Platform.OS === 'web') {
    return (
      <Pressable
        {...rest}
        disabled={disabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          style,
          { cursor: disabled ? 'default' : 'pointer', transition: reduceMotion ? 'none' : 'transform 100ms ease, opacity 100ms ease' } as any,
          pressed && !disabled && { opacity: 0.85, transform: [{ scale: reduceMotion ? 1 : activeScale }] },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      style={[style, { transform: [{ scale: scaleAnim }] }]}
      onPressIn={(event) => {
        if (!disabled && !reduceMotion) {
          Animated.timing(scaleAnim, { toValue: activeScale, duration: 80, useNativeDriver: true, isInteraction: false }).start();
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        Animated.timing(scaleAnim, { toValue: 1, duration: reduceMotion ? 0 : 120, useNativeDriver: true, isInteraction: false }).start();
        onPressOut?.(event);
      }}
    >
      {children}
    </AnimatedPressable>
  );
};

export default PressableScale;
