import { Stack } from 'expo-router';
import { SCREEN_TRANSITION } from '../../src/components/transitions/ScreenTransitionProvider';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: SCREEN_TRANSITION.detailPushMs }} />;
}
