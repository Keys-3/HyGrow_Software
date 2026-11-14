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
import { Tabs, usePathname, useRouter } from 'expo-router';
import { ChartBar as BarChart3, Bot, Hop as Home, Package, Settings, ShoppingCart, Warehouse } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sidebar } from '../../src/components/Sidebar';
import useAuth from '../../src/hooks/useAuth';
import { useThemeColors, colors } from '../../src/theme/theme';
import useAppStore from '../../src/store/useAppStore';
import { SENSOR_KEYS, SENSOR_THRESHOLDS, SENSOR_CONFIG } from '../../src/utils/constants';
import { getSensorStatus, formatSensorValue } from '../../src/utils/helpers';
import { db } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// Tab bar icon component using Lucide icons
function TabIcon({ Icon, label, focused }) {
  const themeColors = useThemeColors();
  const iconColor = focused ? themeColors.primary : themeColors.textMuted;
  const iconSize = focused ? 22 : 20;

  return (
    <View style={styles.tabIconContainer}>
      <View style={[styles.tabIconPill, focused && { backgroundColor: themeColors.primary + '18' }]}>
        <Icon
          color={iconColor}
          size={iconSize}
          strokeWidth={focused ? 2.5 : 2}
        />
      </View>
      <Text
        style={[
          styles.tabLabel,
          { color: themeColors.textMuted },
          focused && { color: themeColors.primary, fontWeight: '700' },
        ]}
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
  const themeColors = useThemeColors();

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
            // Temporarily disable the persist middleware from writing back during this sync
            useAppStore.setState({
              ...(data.preferences.farmerFeatures && { farmerFeatures: data.preferences.farmerFeatures }),
              ...(data.preferences.isDarkMode !== undefined && { isDarkMode: data.preferences.isDarkMode })
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
  const isWeb = Platform.OS === 'web';
  const isDesktopOrTablet = isLargeScreen || isTablet || isWeb;

  const baseHeight = 64;
  const tabBarHeight = baseHeight + insets.bottom;

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
        <Sidebar isCollapsed={isTablet || (isWeb && width < 1024)} />
        <View style={styles.content}>
          <Tabs
            sceneContainerStyle={{ backgroundColor: 'transparent' }}
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: 'none' },
            }}
          >
            <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
            <Tabs.Screen name="ai" options={{ title: 'AI Tools' }} />
            <Tabs.Screen name="inventory" options={{ title: 'Inventory' }} />
            <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
            <Tabs.Screen name="market" options={{ title: 'Market' }} />
            <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
            <Tabs.Screen name="settings" options={{ title: 'Setting' }} />
          </Tabs>
        </View>
      </View>
    );
  }

  return (
    <Tabs
      sceneContainerStyle={{ backgroundColor: 'transparent' }}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          ...styles.tabBar,
          height: tabBarHeight,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          backgroundColor: themeColors.tabBar,
          borderTopColor: themeColors.tabBarBorder,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textMuted,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Home} label="Home" focused={focused} />,
          tabBarItemStyle: (userRole === 'customer' || userRole === 'guest' || ((userRole === 'farmer' || userRole === 'admin') && !farmerFeatures.sensors.enabled)) ? { display: 'none' } : undefined,
        }}
        listeners={{
          tabPress: (e) => {
            if (userRole === 'customer' || userRole === 'guest') {
              e.preventDefault();
              router.replace('/(tabs)/market');
            }
          },
        }}
      />

      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI Tools',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Bot} label="AI" focused={focused} />,
          tabBarItemStyle: (userRole === 'customer' || userRole === 'guest' || ((userRole === 'farmer' || userRole === 'admin') && !farmerFeatures.aiTools.enabled)) ? { display: 'none' } : undefined,
        }}
        listeners={{
          tabPress: (e) => {
            if (userRole === 'customer' || userRole === 'guest') {
              e.preventDefault();
              router.replace('/(tabs)/market');
            }
          },
        }}
      />

      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Warehouse} label="Stock" focused={focused} />,
          tabBarItemStyle: (userRole === 'customer' || userRole === 'guest' || ((userRole === 'farmer' || userRole === 'admin') && !farmerFeatures.inventory.enabled)) ? { display: 'none' } : undefined,
        }}
        listeners={{
          tabPress: (e) => {
            if (userRole === 'customer' || userRole === 'guest') {
              e.preventDefault();
              router.replace('/(tabs)/market');
            }
          },
        }}
      />

      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ focused }) => <TabIcon Icon={BarChart3} label="Stats" focused={focused} />,
          tabBarItemStyle: (userRole === 'customer' || userRole === 'guest' || ((userRole === 'farmer' || userRole === 'admin') && !farmerFeatures.analytics.enabled)) ? { display: 'none' } : undefined,
        }}
        listeners={{
          tabPress: (e) => {
            if (userRole === 'customer' || userRole === 'guest') {
              e.preventDefault();
              router.replace('/(tabs)/market');
            }
          },
        }}
      />

      <Tabs.Screen
        name="market"
        options={{
          title: 'Market',
          tabBarIcon: ({ focused }) => <TabIcon Icon={ShoppingCart} label="Market" focused={focused} />,
          tabBarItemStyle: userRole !== 'customer' && userRole !== 'admin' && userRole !== 'guest' ? { display: 'none' } : undefined,
        }}
        listeners={{
          tabPress: (e) => {
            if (userRole !== 'customer' && userRole !== 'admin' && userRole !== 'guest') {
              e.preventDefault();
              router.replace('/(tabs)/inventory');
            }
          },
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Package} label="Orders" focused={focused} />,
          tabBarItemStyle: userRole === 'farmer' || userRole === 'guest' ? { display: 'none' } : undefined,
        }}
        listeners={{
          tabPress: (e) => {
            if (userRole === 'farmer' || userRole === 'guest') {
              e.preventDefault();
              router.replace('/(tabs)/dashboard');
            }
          },
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Setting',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Settings} label="Setting" focused={focused} />,
          tabBarItemStyle: userRole === 'guest' ? { display: 'none' } : undefined,
        }}
        listeners={{
          tabPress: (e) => {
            if (userRole === 'guest') {
              e.preventDefault();
              router.replace('/(tabs)/market');
            }
          },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
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
  },
  content: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    elevation: 10,
    ...Platform.select({
      web: { boxShadow: '0px -4px 15px rgba(0, 0, 0, 0.08)' },
      default: { 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
    }),
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 46,
  },
  tabIconPill: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
