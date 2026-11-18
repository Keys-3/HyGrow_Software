import { Stack } from 'expo-router';
import { SCREEN_TRANSITION } from '../../../src/components/transitions/ScreenTransitionProvider';

export default function AILayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'slide_from_right',
        animationDuration: SCREEN_TRANSITION.detailPushMs,
      }}
    />
  );
}

