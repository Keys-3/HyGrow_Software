/**
 * Farm Help — Dashboard Stack Layout
 */

import { Stack } from 'expo-router';
import { useThemeColors } from '../../../src/theme/theme';
import { SCREEN_TRANSITION } from '../../../src/components/transitions/ScreenTransitionProvider';

export default function DashboardLayout() {
  const themeColors = useThemeColors();
  
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themeColors.background },
        animation: 'slide_from_right',
        animationDuration: SCREEN_TRANSITION.detailPushMs,
      }}
    />
  );
}
