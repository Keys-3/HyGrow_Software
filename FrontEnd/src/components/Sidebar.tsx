import { Link, usePathname } from 'expo-router';
import { Platform } from 'react-native';
import {
  ChartBar as BarChart3,
  Bot,
  House,
  Package,
  Settings,
  ShoppingCart,
  Sun,
  Moon,
  ClipboardList,
} from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMemo, useState } from 'react';

import useAppStore from '../store/useAppStore';
import { spacing, useThemeColors, borderRadius } from '../theme/theme';

const getNavItems = (role: string, features: any) => {
  const items = [
    { name: 'Dashboard', icon: House, href: '/dashboard', roles: ['farmer', 'admin'], featureKey: 'sensors' },
    { name: 'AI Tools', icon: Bot, href: '/ai', roles: ['farmer', 'admin'], featureKey: 'aiTools' },
    { name: 'Inventory', icon: ClipboardList, href: '/inventory', roles: ['farmer', 'admin'], featureKey: 'inventory' },
    { name: 'Analytics', icon: BarChart3, href: '/analytics', roles: ['farmer', 'admin'], featureKey: 'analytics' },
    { name: 'Market', icon: ShoppingCart, href: '/market', roles: ['customer', 'admin'] },
    { name: 'Orders', icon: Package, href: '/orders', roles: ['customer', 'admin'] },
    { name: 'Settings', icon: Settings, href: '/settings', roles: ['farmer', 'customer', 'admin'] },
  ];

  if (role === 'admin') {
    return items;
  }

  return items.filter((item) => {
    if (!item.roles.includes(role)) return false;
    if (item.featureKey && role === 'farmer') {
      if (!features || !features[item.featureKey]?.enabled) {
        return false;
      }
    }
    return true;
  });
};

interface SidebarProps {
  isCollapsed?: boolean;
  floating?: boolean;
  mobileDock?: boolean;
}

export function Sidebar({ isCollapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const user = useAppStore((state) => state.user);
  const farmerFeatures = useAppStore((state) => state.farmerFeatures);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
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
          <View style={[styles.logoBadge, isCollapsed && styles.logoBadgeCollapsed]}>
            <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
            {isCollapsed ? <View style={styles.logoOnlineDot} /> : null}
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
            const isHovered = hoveredLabel === item.name;

            return (
              <Link key={item.name} href={item.href as any} asChild>
                <Pressable
                  accessibilityLabel={item.name}
                  accessibilityState={{ selected: isActive }}
                  onHoverIn={() => setHoveredLabel(item.name)}
                  onHoverOut={() => setHoveredLabel(null)}
                  onFocus={() => setHoveredLabel(item.name)}
                  onBlur={() => setHoveredLabel(null)}
                  style={StyleSheet.flatten([
                    styles.navItem,
                    isCollapsed && styles.navItemCollapsed,
                    isActive && (isCollapsed ? styles.navItemActiveCollapsed : styles.navItemActive),
                    isHovered && !isActive && (isCollapsed ? styles.navItemHoveredCollapsed : styles.navItemHovered),
                  ])}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      isCollapsed && styles.iconWrapCollapsed,
                      isActive && (isCollapsed ? styles.iconWrapActiveCollapsed : styles.iconWrapActive),
                    ]}
                  >
                    <Icon
                      size={isCollapsed ? 20 : 18}
                      color={isActive
                        ? '#FFFFFF'
                        : isHovered
                        ? themeColors.text
                        : themeColors.textMuted}
                      strokeWidth={isActive ? 2.4 : 1.8}
                    />
                  </View>

                  {!isCollapsed && (
                    <Text
                      style={[
                        styles.navText,
                        isActive && styles.navTextActive,
                        isHovered && !isActive && styles.navTextHovered,
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                  )}

                  {!isCollapsed && isActive && <View style={styles.activeGlowPill} />}

                  {/* Tooltip on hover in collapsed mode */}
                  {isCollapsed && isHovered && (
                    <View style={styles.tooltipPill} pointerEvents="none">
                      <View style={styles.tooltipArrow} />
                      <Text style={styles.tooltipText}>{item.name}</Text>
                    </View>
                  )}
                </Pressable>
              </Link>
            );
          })}
        </View>
      </ScrollView>

      {isCollapsed ? <View style={styles.railDivider} /> : null}

      {/* Footer Controls: Theme Toggle & User Card */}
      <View style={[styles.footer, isCollapsed && styles.footerCollapsed]}>
        <Pressable
          onPress={toggleTheme}
          onHoverIn={() => setHoveredLabel('theme')}
          onHoverOut={() => setHoveredLabel(null)}
          onFocus={() => setHoveredLabel('theme')}
          onBlur={() => setHoveredLabel(null)}
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${isDarkMode ? 'light' : 'dark'} theme`}
          style={({ pressed }) => [
            styles.themeButton,
            isCollapsed && styles.themeButtonCollapsed,
            hoveredLabel === 'theme' && (isCollapsed ? styles.themeButtonHoveredCollapsed : styles.themeButtonHovered),
            pressed && styles.themeButtonPressed,
          ]}
        >
          <View style={[styles.themeIconWrap, isCollapsed && styles.themeIconWrapCollapsed]}>
            {isDarkMode ? (
              <Sun size={18} color={themeColors.primary} />
            ) : (
              <Moon size={18} color={themeColors.primary} />
            )}
          </View>
          {!isCollapsed && (
            <Text style={styles.themeButtonText}>
              {isDarkMode ? 'Light mode' : 'Dark mode'}
            </Text>
          )}
          {isCollapsed && hoveredLabel === 'theme' && (
            <View style={styles.tooltipPill} pointerEvents="none">
              <View style={styles.tooltipArrow} />
              <Text style={styles.tooltipText}>{isDarkMode ? 'Light mode' : 'Dark mode'}</Text>
            </View>
          )}
        </Pressable>

        <View
          style={[styles.userCard, isCollapsed && styles.userCardCollapsed]}
          {...({
            onMouseEnter: () => setHoveredLabel('user'),
            onMouseLeave: () => setHoveredLabel(null),
          } as any)}
        >
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
          {isCollapsed && hoveredLabel === 'user' && (
            <View style={styles.tooltipPill} pointerEvents="none">
              <View style={styles.tooltipArrow} />
              <Text style={styles.tooltipText}>{user.name || user.email || 'User'}</Text>
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
      width: 240,
      flexGrow: 0,
      flexShrink: 0,
      height: '100%',
      backgroundColor: colors.surface,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10,
    },
    containerCollapsed: {
      width: 72,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerCollapsed: {
      paddingHorizontal: 0,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      alignItems: 'center',
      borderBottomWidth: 0,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logoBadge: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.primary + '15',
      borderWidth: 1,
      borderColor: colors.primary + '30',
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoBadgeCollapsed: {
      width: 42,
      height: 42,
      borderRadius: borderRadius.md,
      backgroundColor: colors.isDarkMode ? '#1B3328' : '#FFFFFF',
      borderColor: colors.isDarkMode ? '#35513F' : colors.border,
    },
    logo: {
      width: 24,
      height: 24,
    },
    logoOnlineDot: {
      position: 'absolute',
      right: -2,
      top: -2,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: '#22C55E',
      borderWidth: 2,
      borderColor: colors.surface,
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
      paddingVertical: spacing.sm,
      paddingHorizontal: isCollapsed ? 0 : spacing.sm,
    },
    navGroup: {
      gap: 4,
    },
    navGroupLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 1,
      marginBottom: 6,
      marginTop: 4,
      paddingHorizontal: spacing.sm,
    },
    navItem: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: borderRadius.md,
      gap: 10,
      position: 'relative',
      ...Platform.select({
        web: {
          cursor: 'pointer',
          transition: 'background-color 0.15s ease',
        },
      }),
    },
    navItemCollapsed: {
      width: 44,
      height: 44,
      minHeight: 44,
      alignSelf: 'center',
      justifyContent: 'center',
      paddingHorizontal: 0,
      borderRadius: borderRadius.md,
    },
    navItemActive: {
      backgroundColor: colors.isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#0E4F3B',
    },
    navItemActiveCollapsed: {
      backgroundColor: 'transparent',
    },
    navItemHovered: {
      backgroundColor: colors.isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(14, 79, 59, 0.06)',
    },
    navItemHoveredCollapsed: {
      backgroundColor: colors.isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(14, 79, 59, 0.06)',
    },
    iconWrap: {
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconWrapCollapsed: {
      width: 38,
      height: 38,
      borderRadius: borderRadius.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconWrapActive: {},
    iconWrapActiveCollapsed: {
      backgroundColor: colors.isDarkMode ? colors.primary : '#0E4F3B',
    },
    navText: {
      fontSize: 13.5,
      color: colors.textSecondary,
      fontWeight: '500',
      letterSpacing: -0.2,
      flex: 1,
    },
    navTextActive: {
      color: colors.isDarkMode ? colors.primary : '#FFFFFF',
      fontWeight: '700',
    },
    navTextHovered: {
      color: colors.text,
    },
    activeGlowPill: {
      width: 3.5,
      height: 16,
      borderRadius: 2,
      backgroundColor: colors.primary,
    },
    railDivider: {
      width: 36,
      height: 1,
      alignSelf: 'center',
      backgroundColor: colors.border,
      marginVertical: 4,
    },
    footer: {
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceLight,
      gap: 10,
    },
    footerCollapsed: {
      paddingHorizontal: 0,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      borderTopWidth: 0,
      backgroundColor: 'transparent',
      gap: 8,
    },
    themeButton: {
      minHeight: 38,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: borderRadius.md,
      gap: 10,
      ...Platform.select({
        web: { cursor: 'pointer', transition: 'background-color 0.15s ease' },
      }),
    },
    themeButtonCollapsed: {
      width: 40,
      height: 40,
      minHeight: 40,
      paddingHorizontal: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    themeButtonHovered: {
      backgroundColor: colors.isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(14, 79, 59, 0.06)',
    },
    themeButtonHoveredCollapsed: {
      backgroundColor: colors.isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(14, 79, 59, 0.06)',
    },
    themeButtonPressed: {
      opacity: 0.8,
    },
    themeIconWrap: {
      width: 22,
      height: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    themeIconWrapCollapsed: {
      width: 34,
      height: 34,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(14,79,59,0.08)',
    },
    themeButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 6,
      borderRadius: borderRadius.md,
    },
    userCardCollapsed: {
      justifyContent: 'center',
      padding: 0,
    },
    avatarWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    avatarText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 14,
    },
    userStatusDot: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#22C55E',
      borderWidth: 1.5,
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
    },
    rolePill: {
      alignSelf: 'flex-start',
      marginTop: 2,
    },
    rolePillText: {
      fontSize: 10,
      color: colors.textMuted,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    tooltipPill: {
      position: 'absolute',
      left: 56,
      top: '50%',
      transform: [{ translateY: -14 }],
      zIndex: 100,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.isDarkMode ? '#EAF2EC' : '#10241B',
      flexDirection: 'row',
      alignItems: 'center',
      ...Platform.select({
        web: {
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.28)',
          pointerEvents: 'none',
        } as any,
      }),
    },
    tooltipText: {
      color: colors.isDarkMode ? '#0D1511' : '#F6F4EF',
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    tooltipArrow: {
      position: 'absolute',
      left: -4,
      top: 9,
      width: 8,
      height: 8,
      backgroundColor: colors.isDarkMode ? '#EAF2EC' : '#10241B',
      transform: [{ rotate: '45deg' }],
    },
  });
