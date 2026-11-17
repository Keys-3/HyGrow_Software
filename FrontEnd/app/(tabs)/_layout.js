/**
 * Farm Help — Tab Layout
 *
 * Role-based bottom tab navigator:
 * - Customer: Market, Orders, Settings (3 tabs)
 * - Farmer: Dashboard, AI Tools, Market, Analytics, Settings (5 tabs)
 * - Admin: All tabs visible (5 tabs)
 *
 * Uses safe area insets for proper handling of:
 * - iPhone notch / Dynamic Island
 * - Android gesture navigation
 * - Various screen sizes
 */
import SafeImage from '../../src/components/SafeImage';
import { Tabs, usePathname, useRouter } from 'expo-router';
import {
  ChartBar as BarChart3,
  Bot,
  Hop as Home,
  Package,
  Settings,
  ShoppingCart,
  Warehouse,
  Menu,
  Sun,
  Moon,
  Camera,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sidebar } from '../../src/components/Sidebar';
import { MobileNavDrawer } from '../../src/components/MobileNavDrawer';
import { PressableScale } from '../../src/components/PressableScale';
import AtmosphericBackground from '../../src/components/AtmosphericBackground';
import useAuth from '../../src/hooks/useAuth';
import { useThemeColors, borderRadius, spacing } from '../../src/theme/theme';
import useAppStore from '../../src/store/useAppStore';
import { SENSOR_KEYS, SENSOR_THRESHOLDS, SENSOR_CONFIG } from '../../src/utils/constants';
import { getSensorStatus, formatSensorValue } from '../../src/utils/helpers';
import { db } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// Tab bar icon component using Lucide icons
function TabIcon({ Icon, label, focused }) {
  const themeColors = useThemeColors();
  const { width } = useWindowDimensions();
  const styles = createStyles(themeColors);
  const iconColor = focused ? themeColors.primary : themeColors.textMuted;
  const isNarrow = width < 420;
  const iconSize = isNarrow ? 19 : 21;

  return (
    <View style={styles.tabIconContainer}>
      <View style={[styles.tabIconPill, focused && { backgroundColor: themeColors.primary + '18' }]}>
        <Icon
          color={iconColor}
          size={iconSize}
          strokeWidth={focused ? 2.4 : 1.8}
        />
      </View>
      <Text
        style={[
          styles.tabLabel,
          { color: themeColors.textMuted, fontSize: isNarrow ? 9.5 : 10.5 },
          focused && { color: themeColors.primary, fontWeight: '700' },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

// Route guard component - redirects users to appropriate screens
function RoleGuard({ children, userRole, targetRole }) {
  const router = useRouter();
  const pathname = usePathname();
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);

  useEffect(() => {
    if ((userRole === 'customer' || userRole === 'guest') && targetRole !== 'customer') {
      router.replace('/(tabs)/market');
    }
  }, [userRole, targetRole, pathname, router]);

  if ((userRole === 'customer' || userRole === 'guest') && targetRole !== 'customer') {
    return (
      <View style={[styles.guardContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return children;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { user, isAuthenticated, authInitialized, loading: authLoading } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);

  useEffect(() => {
    // Wait for auth to initialize before redirecting
    if (!authInitialized) return;
  }, [authInitialized, router]);

  const userRole = user?.role || 'guest';

  const addAlert = useAppStore((s) => s.addAlert);
  const farmerFeatures = useAppStore((s) => s.farmerFeatures);

  // Real-time preferences sync from Firestore
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.id),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.preferences) {
            const preferences = data.preferences;
            const farmerFeatures = preferences.farmerFeatures;
            const hasValidFarmerFeatures = farmerFeatures
              && typeof farmerFeatures === 'object'
              && !Array.isArray(farmerFeatures);

            // Temporarily disable the persist middleware from writing back during this sync
            useAppStore.setState({
              ...(hasValidFarmerFeatures && { farmerFeatures }),
              ...(typeof preferences.isDarkMode === 'boolean' && { isDarkMode: preferences.isDarkMode }),
            });
          }
        }
      },
      (error) => {
        // Ignore permission-denied errors that occur naturally during signout
        if (error.code !== 'permission-denied') {
          console.warn('Preferences sync error:', error);
        }
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, user?.id]);

  // Global sensor alert monitoring loop
  useEffect(() => {
    if (!isAuthenticated || userRole !== 'farmer' || !farmerFeatures?.sensors?.enabled) return;

    const runSensorCheck = () => {
      try {
        const state = useAppStore.getState();
        const liveData = state.sensorData;

        if (!liveData) return;

        // Check alerts
        SENSOR_KEYS.forEach((key) => {
          const value = liveData[key];
          if (value === undefined || value === null || typeof value !== 'number' || Number.isNaN(value)) return;

          const status = getSensorStatus(key, value);
          const threshold = SENSOR_THRESHOLDS[key];
          if (!threshold) return;

          if (status !== 'normal') {
            const isHigh = value > threshold.max;
            const config = SENSOR_CONFIG[key];
            const label = config?.label || key;
            const formattedVal = `${formatSensorValue(key, value)}${threshold.unit}`;
            const limitVal = `${formatSensorValue(key, isHigh ? threshold.max : threshold.min)}${threshold.unit}`;

            addAlert({
              id: `alert-${key}-${status}`,
              sensorKey: key,
              sensorLabel: label,
              type: status,
              value: value,
              threshold: isHigh ? threshold.max : threshold.min,
              unit: threshold.unit,
              message: `${label} is ${isHigh ? 'above' : 'below'} threshold: ${formattedVal} (Limit: ${limitVal})`,
              timestamp: new Date().toISOString(),
            });
          }
        });
      } catch (err) {
        console.error('Error in global sensor check loop:', err);
      }
    };

    runSensorCheck();
    const interval = setInterval(runSensorCheck, 25000); // Check every 25 seconds
    return () => clearInterval(interval);
  }, [isAuthenticated, userRole, farmerFeatures?.sensors?.enabled, addAlert]);

  const isLargeScreen = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isDesktopOrTablet = width >= 768;

  const baseHeight = 58;
  const tabBarHeight = baseHeight + Math.max(insets.bottom, Platform.OS === 'web' ? 8 : 4);

  // Show loading while auth state is being determined
  if (!authInitialized || authLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Restoring session...</Text>
      </View>
    );
  }

  const getTabsForRole = () => {
    if (userRole === 'admin') {
      return [
        { name: 'dashboard', title: 'Dashboard', Icon: Home, label: 'Home', role: 'admin' },
        { name: 'plants', title: 'Plant Logs', Icon: Camera, label: 'Plants', role: 'admin' },
        { name: 'ai', title: 'AI Tools', Icon: Bot, label: 'AI', role: 'admin' },
        { name: 'inventory', title: 'Inventory', Icon: Warehouse, label: 'Stock', role: 'admin' },
        { name: 'analytics', title: 'Analytics', Icon: BarChart3, label: 'Stats', role: 'admin' },
        { name: 'market', title: 'Market', Icon: ShoppingCart, label: 'Market', role: 'admin' },
        { name: 'orders', title: 'Orders', Icon: Package, label: 'Orders', role: 'admin' },
        { name: 'settings', title: 'Setting', Icon: Settings, label: 'Setting', role: 'admin' },
      ];
    }
    if (userRole === 'customer' || userRole === 'guest') {
      return [
        { name: 'market', title: 'Market', Icon: ShoppingCart, label: 'Market', role: userRole },
        ...(userRole === 'customer' ? [
          { name: 'orders', title: 'Orders', Icon: Package, label: 'Orders', role: 'customer' },
          { name: 'settings', title: 'Setting', Icon: Settings, label: 'Setting', role: 'customer' },
        ] : []),
      ];
    }

    return [
      { name: 'dashboard', title: 'Dashboard', Icon: Home, label: 'Home', role: 'farmer' },
      { name: 'plants', title: 'Plant Logs', Icon: Camera, label: 'Plants', role: 'farmer' },
      { name: 'ai', title: 'AI Tools', Icon: Bot, label: 'AI', role: 'farmer' },
      { name: 'inventory', title: 'Inventory', Icon: Warehouse, label: 'Stock', role: 'farmer' },
      { name: 'analytics', title: 'Analytics', Icon: BarChart3, label: 'Stats', role: 'farmer' },
      { name: 'settings', title: 'Setting', Icon: Settings, label: 'Setting', role: 'farmer' },
    ];
  };

  const tabs = getTabsForRole();

  if (isDesktopOrTablet) {
    return (
      <View style={[styles.desktopContainer, { backgroundColor: themeColors.background }]}>
        <View style={styles.desktopSidebarRail}>
          <Sidebar />
        </View>
        <AtmosphericBackground style={styles.content}>
          <Tabs
            sceneContainerStyle={{ backgroundColor: 'transparent' }}
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: 'none' },
            }}
          >
            <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
            <Tabs.Screen name="plants" options={{ title: 'Plant Logs' }} />
            <Tabs.Screen name="ai" options={{ title: 'AI Tools' }} />
            <Tabs.Screen name="inventory" options={{ title: 'Inventory' }} />
            <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
            <Tabs.Screen name="market" options={{ title: 'Market' }} />
            <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
            <Tabs.Screen name="settings" options={{ title: 'Setting' }} />
          </Tabs>
        </AtmosphericBackground>
      </View>
    );
  }

  return (
    <AtmosphericBackground style={{ flex: 1 }}>
      {/* Mobile Top Bar with Menu Pop-up Button */}
      <View style={[styles.mobileTopBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <PressableScale
          style={styles.mobileMenuBtn}
          onPress={() => setMobileDrawerOpen(true)}
          activeScale={0.92}
          accessibilityLabel="Open navigation menu"
        >
          <Menu size={22} color={themeColors.text} />
        </PressableScale>

        <View style={styles.mobileBrandWrap}>
          <SafeImage
            source={require('../../assets/images/logo.png')}
            style={styles.mobileLogo}
            resizeMode="contain"
          />
          <Text style={styles.mobileBrandText}>HYGROW</Text>
        </View>

        <PressableScale
          style={styles.mobileThemeBtn}
          onPress={toggleTheme}
          activeScale={0.92}
          accessibilityLabel="Toggle appearance theme"
        >
          {isDarkMode ? (
            <Sun size={18} color={themeColors.primary} />
          ) : (
            <Moon size={18} color={themeColors.primary} />
          )}
        </PressableScale>
      </View>

      {/* Screen Content - NO bottom tab bar! */}
      <Tabs
        sceneContainerStyle={{ backgroundColor: 'transparent' }}
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Tabs.Screen name="plants" options={{ title: 'Plant Logs' }} />
        <Tabs.Screen name="ai" options={{ title: 'AI Tools' }} />
        <Tabs.Screen name="inventory" options={{ title: 'Inventory' }} />
        <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
        <Tabs.Screen name="market" options={{ title: 'Market' }} />
        <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
        <Tabs.Screen name="settings" options={{ title: 'Setting' }} />
      </Tabs>

      {/* Mobile Side Pop-up Navbar Drawer */}
      <MobileNavDrawer
        visible={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />
    </AtmosphericBackground>
  );
}

const createStyles = (colors) => StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 15,
  },
  guardContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    height: '100%',
    overflow: 'hidden',
  },
  desktopSidebarRail: {
    width: 82,
    position: 'relative',
    zIndex: 50,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  mobileTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    zIndex: 40,
    ...Platform.select({
      web: {
        position: 'sticky',
        top: 0,
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  mobileMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileBrandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileLogo: {
    width: 24,
    height: 24,
  },
  mobileBrandText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  mobileThemeBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
