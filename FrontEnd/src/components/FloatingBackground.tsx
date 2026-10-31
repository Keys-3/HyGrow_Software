import React, { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  cancelAnimation,
  Easing
} from 'react-native-reanimated';
import { Leaf, Droplets, Sun, Sparkles, Sprout, Wind } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../theme/theme';

type FloatingIconProps = { Icon: typeof Leaf; initialX: number; initialY: number; size: number; duration: number; delay: number; rotation: number };

function FloatingIcon({ Icon, initialX, initialY, size, duration, delay, rotation }: FloatingIconProps) {
  const themeColors = useThemeColors();
  const translateY = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      translateY.value = withRepeat(
        withTiming(-40, { 
          duration: duration, 
          easing: Easing.inOut(Easing.ease) 
        }),
        -1, // infinite
        true // reverse
      );
    }, delay);
    return () => { clearTimeout(timer); cancelAnimation(translateY); };
  }, [delay, duration, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotation}deg` }
    ],
  }));

  return (
    <Animated.View style={[styles.iconWrapper, { left: initialX, top: initialY }, animatedStyle]}>
      <Icon size={size} color={themeColors.primary} opacity={0.06} strokeWidth={1} />
    </Animated.View>
  );
}

export function FloatingBackground() {
  const themeColors = useThemeColors();
  const { width, height } = useWindowDimensions();
  
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[themeColors.globalBackground[0], themeColors.globalBackground[1]]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <FloatingIcon Icon={Leaf} initialX={width * 0.05} initialY={height * 0.1} size={140} duration={6000} delay={0} rotation={-15} />
      <FloatingIcon Icon={Droplets} initialX={width * 0.65} initialY={height * 0.05} size={180} duration={7000} delay={500} rotation={10} />
      <FloatingIcon Icon={Sun} initialX={width * 0.15} initialY={height * 0.55} size={200} duration={8000} delay={1000} rotation={45} />
      <FloatingIcon Icon={Sprout} initialX={width * 0.75} initialY={height * 0.65} size={120} duration={6500} delay={200} rotation={-20} />
      <FloatingIcon Icon={Sparkles} initialX={width * 0.4} initialY={height * 0.35} size={90} duration={5000} delay={800} rotation={0} />
      <FloatingIcon Icon={Wind} initialX={width * 0.5} initialY={height * 0.8} size={160} duration={7500} delay={1200} rotation={15} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    position: 'absolute',
  }
});
