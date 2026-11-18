import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors, typography } from '../../theme/theme';

export const SCREEN_TRANSITION = {
  direction: 'bottom' as 'bottom' | 'top',
  waterColorToken: 'sage' as const,
  sectionRiseMs: 550,
  sectionHoldMs: 100,
  sectionDrainMs: 550,
  tabInMs: 150,
  tabHoldMs: 60,
  tabOutMs: 200,
  tabVeilOpacity: 0.16,
  fallbackFadeMs: 300,
  overscan: 120,
  rippleEnabled: true,
  simpleFallback: false,
  detailPushMs: 450,
} as const;

type TransitionMode = 'section' | 'tab';
type NavigationRequest = { href: string; label: string; mode: TransitionMode; replace: boolean };
type NavigateWithTransition = (href: string, label?: string, mode?: TransitionMode, replace?: boolean) => void;
type OverlayMode = TransitionMode | 'fallback';

const NavigationTransitionContext = createContext<NavigateWithTransition | null>(null);

export function useNavigationTransition() {
  const navigateWithTransition = useContext(NavigationTransitionContext);
  if (!navigateWithTransition) {
    throw new Error('useNavigationTransition must be used inside ScreenTransitionProvider.');
  }
  return navigateWithTransition;
}

function normalizePath(path: string) {
  const withoutQuery = path.split('?')[0].replace('/(tabs)', '');
  return withoutQuery.length > 1 ? withoutQuery.replace(/\/$/, '') : withoutQuery;
}

export function ScreenTransitionProvider({ children }: React.PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const { height } = useWindowDimensions();
  const theme = useThemeColors();
  const reduceMotion = useReducedMotion();
  const [overlayMode, setOverlayMode] = useState<OverlayMode | null>(null);
  const [destination, setDestination] = useState('');
  const activeRef = useRef(false);
  const requestRef = useRef<NavigationRequest | null>(null);
  const tokenRef = useRef(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPathRef = useRef(pathname);
  const outsideSheetY = SCREEN_TRANSITION.direction === 'bottom'
    ? height + SCREEN_TRANSITION.overscan
    : -height - SCREEN_TRANSITION.overscan;
  const coveredSheetY = SCREEN_TRANSITION.direction === 'bottom'
    ? -SCREEN_TRANSITION.overscan
    : 0;

  const sheetY = useSharedValue(outsideSheetY);
  const veilOpacity = useSharedValue(0);
  const labelOpacity = useSharedValue(0);
  const labelScale = useSharedValue(0.97);

  const finishTransition = useCallback((token: number) => {
    if (token !== tokenRef.current) return;
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    activeRef.current = false;
    requestRef.current = null;
    setOverlayMode(null);
    setDestination('');
    veilOpacity.value = 0;
    labelOpacity.value = 0;
    labelScale.value = 0.97;
    sheetY.value = outsideSheetY;
  }, [labelOpacity, labelScale, outsideSheetY, sheetY, veilOpacity]);

  const commitCoveredNavigation = useCallback((token: number) => {
    if (token !== tokenRef.current || !activeRef.current) return;
    const request = requestRef.current;
    if (!request) return;
    if (request.replace) router.replace(request.href as any);
    else router.push(request.href as any);

    if (request.mode === 'section') {
      holdTimerRef.current = setTimeout(() => {
        if (token !== tokenRef.current) return;
        labelOpacity.value = withTiming(0, { duration: 140, easing: Easing.out(Easing.quad) });
        sheetY.value = withTiming(outsideSheetY, {
          duration: SCREEN_TRANSITION.sectionDrainMs,
          easing: Easing.in(Easing.cubic),
        }, (finished) => {
          if (finished) runOnJS(finishTransition)(token);
        });
      }, SCREEN_TRANSITION.sectionHoldMs);
    }
  }, [finishTransition, labelOpacity, outsideSheetY, router, sheetY]);

  const navigateWithTransition = useCallback<NavigateWithTransition>((href, label, mode = 'section', replace = false) => {
    if (!href || activeRef.current) return;
    if (normalizePath(href) === normalizePath(currentPathRef.current)) return;

    const pathSegments = href.split('/').filter(Boolean);
    const routeName = pathSegments[pathSegments.length - 1];
    const request: NavigationRequest = {
      href,
      label: label || routeName?.replace(/[-_]/g, ' ') || 'HyGrow',
      mode,
      replace,
    };
    if (reduceMotion) {
      if (replace) router.replace(href as any);
      else router.push(href as any);
      return;
    }

    activeRef.current = true;
    const token = ++tokenRef.current;
    requestRef.current = request;
    setDestination(request.label);
    setOverlayMode(SCREEN_TRANSITION.simpleFallback ? 'fallback' : mode);
    labelOpacity.value = 0;
    labelScale.value = 0.97;

    if (mode === 'tab' || SCREEN_TRANSITION.simpleFallback) {
      veilOpacity.value = 0;
      const duration = SCREEN_TRANSITION.simpleFallback ? SCREEN_TRANSITION.fallbackFadeMs : SCREEN_TRANSITION.tabInMs;
      veilOpacity.value = withSequence(
        withTiming(SCREEN_TRANSITION.tabVeilOpacity, {
          duration,
          easing: Easing.out(Easing.quad),
        }, (finished) => {
          if (finished) runOnJS(commitCoveredNavigation)(token);
        }),
        withDelay(
          SCREEN_TRANSITION.tabHoldMs,
          withTiming(0, {
            duration: SCREEN_TRANSITION.simpleFallback ? SCREEN_TRANSITION.fallbackFadeMs : SCREEN_TRANSITION.tabOutMs,
            easing: Easing.in(Easing.quad),
          }, (finished) => {
            if (finished) runOnJS(finishTransition)(token);
          }),
        ),
      );
      labelOpacity.value = withSequence(
        withDelay(duration * 0.6, withTiming(1, { duration: 60 })),
        withDelay(SCREEN_TRANSITION.tabHoldMs, withTiming(0, { duration: 90 })),
      );
      labelScale.value = withTiming(1, { duration: duration + SCREEN_TRANSITION.tabHoldMs });
      return;
    }

    sheetY.value = outsideSheetY;
    sheetY.value = withTiming(coveredSheetY, {
      duration: SCREEN_TRANSITION.sectionRiseMs,
      easing: Easing.out(Easing.cubic),
    }, (finished) => {
      if (finished) runOnJS(commitCoveredNavigation)(token);
    });
    labelOpacity.value = withDelay(SCREEN_TRANSITION.sectionRiseMs - 45, withTiming(1, { duration: 120 }));
    labelScale.value = withDelay(SCREEN_TRANSITION.sectionRiseMs - 45, withTiming(1, { duration: 130, easing: Easing.out(Easing.quad) }));
  }, [commitCoveredNavigation, coveredSheetY, finishTransition, height, labelOpacity, labelScale, outsideSheetY, reduceMotion, router, sheetY, veilOpacity]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.value }] }));
  const veilStyle = useAnimatedStyle(() => ({ opacity: veilOpacity.value }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ scale: labelScale.value }],
  }));

  useEffect(() => {
    if (!activeRef.current) sheetY.value = outsideSheetY;
  }, [outsideSheetY, sheetY]);

  useEffect(() => {
    currentPathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => activeRef.current);
    return () => subscription.remove();
  }, []);

  useEffect(() => () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    activeRef.current = false;
  }, []);

  return (
    <NavigationTransitionContext.Provider value={navigateWithTransition}>
      {children}
      <View
        pointerEvents={overlayMode ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, styles.overlayRoot]}
      >
        {overlayMode === 'section' ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.waterSheet,
              {
                height: height + SCREEN_TRANSITION.overscan,
                backgroundColor: theme[SCREEN_TRANSITION.waterColorToken],
                ...(SCREEN_TRANSITION.direction === 'bottom'
                  ? { top: 0, borderTopLeftRadius: 58, borderTopRightRadius: 58 }
                  : { bottom: 0, borderBottomLeftRadius: 58, borderBottomRightRadius: 58 }),
              },
              sheetStyle,
            ]}
          >
            {SCREEN_TRANSITION.rippleEnabled ? (
              <Svg
                width="110%"
                height={20}
                viewBox="0 0 432 20"
                preserveAspectRatio="none"
                style={SCREEN_TRANSITION.direction === 'bottom' ? styles.ripple : styles.rippleFromTop}
              >
                <Path
                  d="M0 10 C24 2 48 2 72 10 S120 18 144 10 S192 2 216 10 S264 18 288 10 S336 2 360 10 S408 18 432 10"
                  fill="none"
                  stroke={theme.primary}
                  strokeWidth={2}
                  opacity={0.72}
                />
              </Svg>
            ) : null}
          </Animated.View>
        ) : overlayMode ? (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: theme.activeTint }, veilStyle]}
          />
        ) : null}
        {overlayMode ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.destination,
              overlayMode === 'tab' && styles.tabDestination,
              { backgroundColor: theme.surfaceGlass, borderColor: theme.border },
              labelStyle,
            ]}
          >
            <Text style={[styles.destinationText, { color: theme.text }]} numberOfLines={1}>
              {destination}
            </Text>
          </Animated.View>
        ) : null}
      </View>
    </NavigationTransitionContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    zIndex: 10000,
    elevation: 10000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 10000,
    elevation: 10000,
  },
  ripple: {
    position: 'absolute',
    top: 0,
    left: '-5%',
  },
  rippleFromTop: {
    position: 'absolute',
    bottom: 0,
    left: '-5%',
    transform: [{ rotate: '180deg' }],
  },
  destination: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '82%',
    paddingHorizontal: 26,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 10001,
    elevation: 10001,
  },
  tabDestination: {
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  destinationText: {
    fontSize: typography.h2.fontSize,
    lineHeight: typography.h2.lineHeight,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
});
