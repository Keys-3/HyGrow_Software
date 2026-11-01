/**
 * Farm Help — Root Layout
 * 
 * Entry point for Expo Router.
 * Sets up dark theme, fonts, and auth routing.
 */

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import * as Updates from 'expo-updates';

import { useThemeColors } from '../src/theme/theme';
import useAppStore from '../src/store/useAppStore';

export { ErrorBoundary } from 'expo-router';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const authInitialized = useAppStore((s) => s.authInitialized);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const themeColors = useThemeColors();

  const isDarkMode = useAppStore((s) => s.isDarkMode);

  // Proactively check for live OTA updates on mobile release/standalone builds
  useEffect(() => {
    async function checkLiveUpdate() {
      try {
        if (!__DEV__ && Platform.OS !== 'web') {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
          }
        }
      } catch (err) {
        console.log('Expo Updates check:', err?.message || err);
      }
    }
    checkLiveUpdate();
  }, []);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={themeColors.globalBackground}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <ThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
            animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </ThemeProvider>
    </View>
  );
}
