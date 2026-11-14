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
  Sprout,
  User as UserIcon,
} from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMemo } from 'react';

import useAppStore from '../store/useAppStore';
import { spacing, useThemeColors, borderRadius, typography } from '../theme/theme';
import { PressableScale } from './PressableScale';

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

  return items.filter((item) => {
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
  const user = useAppStore((state) => state.user);
  const farmerFeatures = useAppStore((state) => state.farmerFeatures);
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors, isCollapsed), [themeColors, isCollapsed]);

  if (!user) {
    return null;
  }

  const navItems = getNavItems(user.role, farmerFeatures);
  const userInitial = (user.name || user.email || 'H').charAt(0).toUpperCase();

  return (
    <View style={[styles.container, isCollapsed && styles.containerCollapsed]}>
      {/* Brand Header */}
      <View style={[styles.header, isCollapsed && styles.headerCollapsed]}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
          {!isCollapsed && (
            <View style={styles.brandTitleWrap}>
              <Text style={styles.brandName}>HYGROW</Text>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>SYSTEM ONLINE</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Navigation List */}
      <ScrollView
        style={styles.navScrollView}
        contentContainerStyle={styles.navScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.navGroup}>
          {!isCollapsed && <Text style={styles.navGroupLabel}>NAVIGATION</Text>}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link key={item.name} href={item.href as any} asChild>
                <Pressable
                  accessibilityLabel={item.name}
                  accessibilityState={{ selected: isActive }}
                  style={[
                    styles.navItem,
                    isActive && styles.navItemActive,
                    isCollapsed && styles.navItemCollapsed,
                  ]}
                >
                  <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                    <Icon
                      size={isCollapsed ? 22 : 18}
                      color={isActive ? themeColors.primary : themeColors.textMuted}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </View>
                  {!isCollapsed && (
                    <Text style={[styles.navText, isActive && styles.navTextActive]}>
                      {item.name}
                    </Text>
                  )}
                  {!isCollapsed && isActive && <View style={styles.activeGlowPill} />}
                </Pressable>
              </Link>
            );
          })}
        </View>
      </ScrollView>

      {/* User Profile Card */}
      <View style={[styles.footer, isCollapsed && styles.footerCollapsed]}>
        <View style={[styles.userCard, isCollapsed && styles.userCardCollapsed]}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{userInitial}</Text>
            <View style={styles.userStatusDot} />
          </View>
          {!isCollapsed && (
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.name || 'User'}
              </Text>
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>{user.role || 'Member'}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: any, isCollapsed: boolean) =>
  StyleSheet.create({
    container: {
      width: 250,
      flexGrow: 0,
      flexShrink: 0,
      height: '100%',
      backgroundColor: colors.surface,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      display: 'flex',
      flexDirection: 'column',
      ...Platform.select({
        web: {
          transitionDuration: '0.2s',
          transitionProperty: 'width',
        },
      }),
    },
    containerCollapsed: {
      width: 76,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerCollapsed: {
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logoBadge: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.primary + '15',
      borderWidth: 1,
      borderColor: colors.primary + '30',
      justifyContent: 'center',
      alignItems: 'center',
    },
    logo: {
      width: 26,
      height: 26,
    },
    brandTitleWrap: {
      flex: 1,
    },
    brandName: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
    },
    liveIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 2,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    liveText: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 0.6,
    },
    navScrollView: {
      flex: 1,
    },
    navScrollContent: {
      paddingVertical: spacing.md,
      paddingHorizontal: isCollapsed ? spacing.xs : spacing.md,
    },
    navGroup: {
      gap: 4,
    },
    navGroupLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 1,
      marginBottom: 8,
      paddingHorizontal: spacing.sm,
    },
    navItem: {
      minHeight: 42,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      gap: 10,
      position: 'relative',
      ...Platform.select({
        web: {
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        },
      }),
    },
    navItemCollapsed: {
      justifyContent: 'center',
      paddingHorizontal: 0,
    },
    navItemActive: {
      backgroundColor: colors.primary + '15',
    },
    iconWrap: {
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconWrapActive: {
      transform: [{ scale: 1.05 }],
    },
    navText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
      letterSpacing: -0.2,
      flex: 1,
    },
    navTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    activeGlowPill: {
      width: 4,
      height: 16,
      borderRadius: 2,
      backgroundColor: colors.primary,
    },
    footer: {
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceLight,
    },
    footerCollapsed: {
      padding: spacing.xs,
      alignItems: 'center',
    },
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: spacing.xs,
      borderRadius: 12,
    },
    userCardCollapsed: {
      justifyContent: 'center',
      padding: 0,
    },
    avatarWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.primary + '20',
      borderWidth: 1,
      borderColor: colors.primary + '40',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    avatarText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },
    userStatusDot: {
      position: 'absolute',
      bottom: -1,
      right: -1,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: '#10B981',
      borderWidth: 2,
      borderColor: colors.surface,
    },
    userInfo: {
      flex: 1,
      minWidth: 0,
    },
    userName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.2,
    },
    rolePill: {
      backgroundColor: colors.primary + '18',
      alignSelf: 'flex-start',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 2,
    },
    rolePillText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });
