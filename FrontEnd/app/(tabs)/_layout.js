/**
 * Farm Help — Tab Layout
 *
 * Role-based bottom tab navigator:
 * - Customer: Market, Orders, Settings (3 tabs)
 * - Farmer: Dashboard, AI Tools, Inventory, Analytics, Settings (5 tabs)
 * - Admin: All tabs visible (7 tabs)
 *
 * Uses safe area insets for proper handling of:
 * - iPhone notch / Dynamic Island
 * - Android gesture navigation
 * - Various screen sizes
 */
import { Tabs, useRouter } from 'expo-router';
import { ChartBar as BarChart3, Bot, House as Home, Package, Settings, ShoppingCart, Warehouse } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sidebar } from '../../src/components/Sidebar';
import useAuth from '../../src/hooks/useAuth';
import { useThemeColors, colors } from '../../src/theme/theme';
import useAppStore from '../../src/store/useAppStore';
import useSensorData from '../../src/hooks/useSensorData';
import useAlerts from '../../src/hooks/useAlerts';
import { db } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// Tab bar icon component using Lucide icons
function TabIcon({ Icon, label, focused }) {
  const themeColors = useThemeColors();
  const iconColor = focused ? themeColors.primary : themeColors.textSecondary;
  const iconSize = focused ? 26 : 24;

  return (
    <View style={styles.tabIconContainer}>
      <Icon
        color={iconColor}
        size={iconSize}
        strokeWidth={focused ? 2.5 : 2}
      />
      <Text style={[styles.tabLabel, { color: themeColors.textSecondary }, focused && { color: themeColors.primary, fontWeight: '600' }]}>
        {label}
      </Text>
    </View>
  );
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
    if (!isAuthenticated) router.replace('/(auth)/login');
  }, [authInitialized, isAuthenticated, router]);

  const userRole = user?.role || 'guest';

  const { current: telemetry, stale: telemetryStale } = useSensorData();
  useAlerts(telemetry,telemetryStale);
  const farmerFeatures = useAppStore((s) => s.farmerFeatures);

  // Real-time preferences sync from Firestore
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.id),
      (docSnap) => {
        if (useAppStore.getState().user?.id !== user.id) return;
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

  const isLargeScreen = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isDesktopOrTablet = isLargeScreen || isTablet;

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

  return (
    <View style={[styles.desktopContainer, {
      backgroundColor: themeColors.background,
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    }]}>
      {isDesktopOrTablet && <Sidebar isCollapsed={isTablet} />}
      <View style={styles.content}>
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
          ...(isDesktopOrTablet ? { display: 'none' } : {}),
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textSecondary,
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
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Settings} label="Settings" focused={focused} />,
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
      </View>
    </View>
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
    minWidth: 0,
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
    gap: Platform.OS === 'ios' ? 4 : 2,
    minHeight: 44,
  },
  tabLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    lineHeight: 14,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
