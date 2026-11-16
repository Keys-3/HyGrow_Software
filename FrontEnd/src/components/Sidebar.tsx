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
}

export function Sidebar({ isCollapsed: forcedCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const user = useAppStore((state) => state.user);
  const farmerFeatures = useAppStore((state) => state.farmerFeatures);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const themeColors = useThemeColors();

  // Floating sidebar is collapsed (icons only) by default, expanding to 240px when hovered
  const isExpanded = isHovered && !forcedCollapsed;
  const styles = useMemo(() => createStyles(themeColors, isExpanded), [themeColors, isExpanded]);

  if (!user) {
    return null;
  }

  const navItems = getNavItems(user.role, farmerFeatures);
  const userInitial = (user.name || user.email || 'H').charAt(0).toUpperCase();

  return (
    <View
      style={styles.floatingContainer}
      {...({
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => {
          setIsHovered(false);
          setHoveredItem(null);
        },
      } as any)}
    >
      {/* Brand Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.logoOnlineDot} />
          </View>

          {isExpanded && (
            <View style={styles.brandTitleWrap}>
              <Text style={styles.brandName} numberOfLines={1}>
                HYGROW
              </Text>
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
          {isExpanded && <Text style={styles.navGroupLabel}>NAVIGATION</Text>}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const isItemHovered = hoveredItem === item.name;

            return (
              <Link key={item.name} href={item.href as any} asChild>
                <Pressable
                  accessibilityLabel={item.name}
                  accessibilityState={{ selected: isActive }}
                  onHoverIn={() => setHoveredItem(item.name)}
                  onHoverOut={() => setHoveredItem(null)}
                  onFocus={() => setHoveredItem(item.name)}
                  onBlur={() => setHoveredItem(null)}
                  style={StyleSheet.flatten([
                    styles.navItem,
                    isActive && styles.navItemActive,
                    isItemHovered && !isActive && styles.navItemHovered,
                  ])}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      isActive && styles.iconWrapActive,
                      isItemHovered && !isActive && styles.iconWrapHovered,
                    ]}
                  >
                    <Icon
                      size={19}
                      color={
                        isActive
                          ? '#FFFFFF'
                          : isItemHovered
                          ? themeColors.primary
                          : themeColors.textSecondary
                      }
                      strokeWidth={isActive ? 2.4 : 1.8}
                    />
                  </View>

                  {isExpanded && (
                    <Text
                      style={[
                        styles.navText,
                        isActive && styles.navTextActive,
                        isItemHovered && !isActive && styles.navTextHovered,
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                  )}

                  {isExpanded && isActive && <View style={styles.activeGlowPill} />}
                </Pressable>
              </Link>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer Controls: Theme Toggle & User Card */}
      <View style={styles.footer}>
        <Pressable
          onPress={toggleTheme}
          onHoverIn={() => setHoveredItem('theme')}
          onHoverOut={() => setHoveredItem(null)}
          onFocus={() => setHoveredItem('theme')}
          onBlur={() => setHoveredItem(null)}
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${isDarkMode ? 'light' : 'dark'} theme`}
          style={({ pressed }) => [
            styles.themeButton,
            hoveredItem === 'theme' && styles.themeButtonHovered,
            pressed && styles.themeButtonPressed,
          ]}
        >
          <View style={styles.themeIconWrap}>
            {isDarkMode ? (
              <Sun size={17} color={themeColors.primary} />
            ) : (
              <Moon size={17} color={themeColors.primary} />
            )}
          </View>
          {isExpanded && (
            <Text style={styles.themeButtonText} numberOfLines={1}>
              {isDarkMode ? 'Light mode' : 'Dark mode'}
            </Text>
          )}
        </Pressable>

        <View
          style={styles.userCard}
          {...({
            onMouseEnter: () => setHoveredItem('user'),
            onMouseLeave: () => setHoveredItem(null),
          } as any)}
        >
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{userInitial}</Text>
            <View style={styles.userStatusDot} />
          </View>
          {isExpanded && (
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

const createStyles = (colors: any, isExpanded: boolean) =>
  StyleSheet.create({
    floatingContainer: {
      position: Platform.OS === 'web' ? 'fixed' : 'absolute',
      left: 14,
      top: 14,
      bottom: 14,
      width: isExpanded ? 240 : 68,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      zIndex: 100,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      ...Platform.select({
        web: {
          transition: 'width 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease',
          boxShadow: colors.isDarkMode
            ? '0 16px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            : '0 12px 32px rgba(14, 79, 59, 0.12), 0 0 0 1px rgba(14, 79, 59, 0.08)',
        } as any,
        default: {
          elevation: 12,
        },
      }),
    },
    header: {
      paddingHorizontal: isExpanded ? spacing.lg : 14,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logoBadge: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.primary + '18',
      borderWidth: 1,
      borderColor: colors.primary + '30',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    logo: {
      width: 23,
      height: 23,
    },
    logoOnlineDot: {
      position: 'absolute',
      right: -2,
      top: -2,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: '#22C55E',
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    brandTitleWrap: {
      flex: 1,
      overflow: 'hidden',
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
      paddingHorizontal: isExpanded ? spacing.sm : 8,
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
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: isExpanded ? 10 : 6,
      borderRadius: borderRadius.lg,
      gap: 10,
      position: 'relative',
      ...Platform.select({
        web: {
          cursor: 'pointer',
          transition: 'all 0.16s ease',
        },
      }),
    },
    navItemActive: {
      backgroundColor: colors.isDarkMode ? 'rgba(16, 185, 129, 0.18)' : '#0E4F3B',
    },
    navItemHovered: {
      backgroundColor: colors.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(14, 79, 59, 0.08)',
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(14, 79, 59, 0.04)',
    },
    iconWrapActive: {
      backgroundColor: colors.isDarkMode ? colors.primary : '#0B3E2F',
    },
    iconWrapHovered: {
      backgroundColor: colors.isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(14, 79, 59, 0.14)',
    },
    navText: {
      fontSize: 13.5,
      color: colors.textSecondary,
      fontWeight: '500',
      letterSpacing: -0.2,
      flex: 1,
      ...Platform.select({
        web: {
          whiteSpace: 'nowrap',
        } as any,
      }),
    },
    navTextActive: {
      color: colors.isDarkMode ? colors.primary : '#FFFFFF',
      fontWeight: '700',
    },
    navTextHovered: {
      color: colors.text,
      fontWeight: '600',
    },
    activeGlowPill: {
      width: 3.5,
      height: 16,
      borderRadius: 2,
      backgroundColor: colors.primary,
    },
    footer: {
      padding: isExpanded ? spacing.md : 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceLight,
      gap: 8,
    },
    themeButton: {
      minHeight: 38,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 5,
      paddingHorizontal: isExpanded ? 8 : 4,
      borderRadius: borderRadius.md,
      gap: 10,
      ...Platform.select({
        web: { cursor: 'pointer', transition: 'background-color 0.15s ease' },
      }),
    },
    themeButtonHovered: {
      backgroundColor: colors.isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(14, 79, 59, 0.07)',
    },
    themeButtonPressed: {
      opacity: 0.8,
    },
    themeIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(14,79,59,0.08)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    themeButtonText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
      ...Platform.select({
        web: { whiteSpace: 'nowrap' } as any,
      }),
    },
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: isExpanded ? 4 : 0,
      paddingVertical: 4,
      borderRadius: borderRadius.md,
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
      fontSize: 13.5,
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
      overflow: 'hidden',
    },
    userName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      ...Platform.select({
        web: { whiteSpace: 'nowrap' } as any,
      }),
    },
    rolePill: {
      alignSelf: 'flex-start',
      marginTop: 2,
    },
    rolePillText: {
      fontSize: 9.5,
      color: colors.textMuted,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
  });
