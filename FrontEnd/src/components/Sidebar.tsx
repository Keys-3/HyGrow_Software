import { Link, usePathname } from 'expo-router';
import { Platform } from 'react-native';
import {
  ChartBar as BarChart3,
  Bot,
  House,
  Package,
  Settings,
  ShoppingCart,
  Warehouse,
} from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMemo } from 'react';

import useAppStore from '../store/useAppStore';
import { spacing, useThemeColors } from '../theme/theme';

const getNavItems = (role: string, features: any) => {
  const items = [
    { name: 'Dashboard', icon: House, href: '/dashboard', roles: ['farmer', 'admin'], featureKey: 'sensors' },
    { name: 'AI Tools', icon: Bot, href: '/ai', roles: ['farmer', 'admin'], featureKey: 'aiTools' },
    { name: 'Inventory', icon: Warehouse, href: '/inventory', roles: ['farmer', 'admin'], featureKey: 'inventory' },
    { name: 'Analytics', icon: BarChart3, href: '/analytics', roles: ['farmer', 'admin'], featureKey: 'analytics' },
    { name: 'Market', icon: ShoppingCart, href: '/market', roles: ['customer', 'admin'] },
    { name: 'Orders', icon: Package, href: '/orders', roles: ['customer', 'admin'] },
    { name: 'Settings', icon: Settings, href: '/settings', roles: ['farmer', 'customer', 'admin'] },
  ];

  return items.filter(item => {
    // 1. Must match role
    if (!item.roles.includes(role)) return false;
    
    // 2. If it's a feature-gated tab and user is farmer/admin, check if feature is enabled
    if (item.featureKey && (role === 'farmer' || role === 'admin')) {
      if (!features || !features[item.featureKey]?.enabled) {
        return false;
      }
    }
    return true;
  });
};

interface SidebarProps {
  isCollapsed?: boolean;
}

export function Sidebar({ isCollapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const user = useAppStore(state => state.user);
  const farmerFeatures = useAppStore(state => state.farmerFeatures);
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  if (!user) {
    return null;
  }

  const navItems = getNavItems(user.role, farmerFeatures);

  return (
    <ScrollView
      style={[styles.container, isCollapsed && styles.containerCollapsed]}
      contentContainerStyle={[styles.containerContent, isCollapsed && styles.containerContentCollapsed]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, isCollapsed && styles.headerCollapsed]}>
        <Image
            source={require('../../assets/images/logo.png')}
            style={[styles.logo, isCollapsed && styles.logoCollapsed]}
          />
        {!isCollapsed && (
          <>
            <Text style={styles.title}>HyGrow</Text>

            <View style={styles.userBadge}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userRole}>{user.role}</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.nav}>
        {navItems.map(item => {
          const Icon = item.icon;

          const isActive =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              href={item.href as any}
              asChild
            >
              <Pressable
                accessibilityLabel={item.name}
                accessibilityState={{ selected: isActive }}
                style={StyleSheet.flatten([
                  styles.navItem,
                  isActive && styles.navItemActive,
                  isCollapsed && styles.navItemCollapsed,
                ])}
              >
              <Icon
                size={isCollapsed ? 24 : 20}
                color={isActive ? themeColors.primary : themeColors.textSecondary}
              />
              {!isCollapsed && (
                <Text
                  style={[
                    styles.navText,
                    isActive && styles.navTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              )}
              </Pressable>
            </Link>
          );
        })}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    width: 240,
    flexGrow: 0,
    flexShrink: 0,
    height: '100%',
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    ...Platform.select({
      web: {
        transitionDuration: '0.3s',
        transitionProperty: 'width',
      },
    }),
  },
  containerCollapsed: {
    width: 80,
  },
  containerContent: {
    padding: spacing.lg,
  },
  containerContentCollapsed: {
    padding: spacing.sm,
  },
  header: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  headerCollapsed: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
  },
  logoCollapsed: {
    width: 40,
    height: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  userBadge: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  userRole: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  nav: {
    gap: spacing.sm,
  },
  navItem: {
    minHeight: 44,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 8,
    gap: spacing.sm,
  },
  navItemCollapsed: {
    justifyContent: 'center',
    padding: spacing.sm,
  },
  navItemActive: {
    backgroundColor: colors.primary + '20',
  },
  navText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  navTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
