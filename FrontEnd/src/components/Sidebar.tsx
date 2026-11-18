import SafeImage from './SafeImage';
import { usePathname } from 'expo-router';
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
  Camera,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';

import useAppStore from '../store/useAppStore';
import { useThemeColors } from '../theme/theme';
import { useNavigationTransition } from './transitions/ScreenTransitionProvider';

interface NavItemDef {
  name: string;
  icon: any;
  href: string;
  roles: string[];
  featureKey?: string;
  description: string;
}

const getNavItems = (role: string, features: any): NavItemDef[] => {
  const items: NavItemDef[] = [
    {
      name: 'Dashboard',
      icon: House,
      href: '/dashboard',
      roles: ['farmer', 'admin'],
      featureKey: 'sensors',
      description: 'Live telemetry & system controls',
    },
    {
      name: 'Plant Logs',
      icon: Camera,
      href: '/plants',
      roles: ['farmer', 'admin'],
      description: 'Photo archive & sensor telemetry',
    },
    {
      name: 'AI Tools',
      icon: Bot,
      href: '/ai',
      roles: ['farmer', 'admin'],
      featureKey: 'aiTools',
      description: 'Yield prediction & disease doctor',
    },
    {
      name: 'Inventory',
      icon: ClipboardList,
      href: '/inventory',
      roles: ['farmer', 'admin'],
      featureKey: 'inventory',
      description: 'Batches, crops & hardware stock',
    },
    {
      name: 'Analytics',
      icon: BarChart3,
      href: '/analytics',
      roles: ['farmer', 'admin'],
      featureKey: 'analytics',
      description: 'Agronomic trends & harvest stats',
    },
    {
      name: 'Market',
      icon: ShoppingCart,
      href: '/market',
      roles: ['customer', 'admin'],
      description: 'Produce catalog & purchasing',
    },
    {
      name: 'Orders',
      icon: Package,
      href: '/orders',
      roles: ['customer', 'admin'],
      description: 'Track orders & order history',
    },
    {
      name: 'Settings',
      icon: Settings,
      href: '/settings',
      roles: ['farmer', 'customer', 'admin'],
      description: 'Preferences & device setup',
    },
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

interface FloatingTooltipProps {
  visible: boolean;
  title: string;
  description?: string;
  isActive?: boolean;
  styles: any;
}

function FloatingTooltip({ visible, title, description, isActive, styles }: FloatingTooltipProps) {
  if (Platform.OS !== 'web' && !visible) {
    return null;
  }

  return (
    <View
      style={[
        styles.floatingTooltip,
        {
          opacity: visible ? 1 : 0,
          transform: [
            { translateX: visible ? 0 : -8 },
            { translateY: -25 },
          ],
          pointerEvents: 'none' as const,
        },
      ]}
    >
      <View style={styles.tooltipPointer} />
      <View style={styles.tooltipSheen} />
      <View style={styles.tooltipContent}>
        <View style={styles.tooltipHeaderRow}>
          <Text style={styles.tooltipTitle} numberOfLines={1}>
            {title}
          </Text>
          {isActive && (
            <View style={styles.tooltipActiveBadge}>
              <View style={styles.tooltipActiveDot} />
              <Text style={styles.tooltipActiveText}>ACTIVE</Text>
            </View>
          )}
        </View>
        {description ? (
          <Text style={styles.tooltipDesc} numberOfLines={1}>
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function Sidebar({ isCollapsed: _unused }: SidebarProps) {
  const pathname = usePathname();
  const navigateWithTransition = useNavigationTransition();
  const user = useAppStore((state) => state.user);
  const farmerFeatures = useAppStore((state) => state.farmerFeatures);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [pointerY, setPointerY] = useState<number | null>(null);
  const [iconCenters, setIconCenters] = useState<Record<string, number>>({});
  const [keyboardFocusLabel, setKeyboardFocusLabel] = useState<string | null>(null);
  const [touchFocusLabel, setTouchFocusLabel] = useState<string | null>(null);
  const themeColors = useThemeColors();

  useEffect(() => {
    setHoveredKey(null);
    setPointerY(null);
    setKeyboardFocusLabel(null);
    setTouchFocusLabel(null);
  }, [pathname]);

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  if (!user) {
    return null;
  }

  const navItems = getNavItems(user.role, farmerFeatures);
  const userInitial = (user.name || user.email || 'H').charAt(0).toUpperCase();
  const nearestPointerItem = pointerY === null
    ? null
    : navItems.reduce<NavItemDef | null>((nearest, item) => {
        const center = iconCenters[item.name];
        if (center === undefined) return nearest;
        if (!nearest) return item;
        return Math.abs(center - pointerY) < Math.abs(iconCenters[nearest.name] - pointerY) ? item : nearest;
      }, null);
  const hoveredNavItem = navItems.find((item) => item.name === hoveredKey);
  const magnifierLabel = keyboardFocusLabel ?? nearestPointerItem?.name ?? touchFocusLabel ?? hoveredNavItem?.name ?? null;
  const interactionY = keyboardFocusLabel
    ? iconCenters[keyboardFocusLabel]
    : pointerY ?? (magnifierLabel ? iconCenters[magnifierLabel] : undefined);

  const handleRailPointerMove = (event: any) => {
    const bounds = event.currentTarget?.getBoundingClientRect?.();
    const clientY = event.clientY ?? event.nativeEvent?.clientY;
    if (bounds && typeof clientY === 'number') setPointerY(clientY - bounds.top);
  };

  const handleRailPointerLeave = () => {
    setPointerY(null);
    setHoveredKey((current) => navItems.some((item) => item.name === current) ? null : current);
    setTouchFocusLabel(null);
  };

  return (
    <View style={styles.floatingContainer} {...({ className: 'hg-magnify-rail' } as any)}>
      {/* Brand Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="HyGrow OS"
          onHoverIn={() => setHoveredKey('brand')}
          onHoverOut={() => setHoveredKey(null)}
          onFocus={() => setHoveredKey('brand')}
          onBlur={() => setHoveredKey(null)}
          style={styles.logoBtn}
        >
          <View style={styles.logoBadge}>
            <SafeImage
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.logoOnlineDot} />
          </View>

          <FloatingTooltip
            visible={hoveredKey === 'brand'}
            title="HYGROW OS"
            description="Automated Hydroponics Platform"
            styles={styles}
          />
        </Pressable>
      </View>

      {/* Navigation List - Fixed icons-only with textured floating section boxes */}
      <View style={styles.navContainer}>
        <View
          style={styles.navGroup}
          {...({
            className: 'hg-magnify-dock',
            onPointerMove: handleRailPointerMove,
            onPointerLeave: handleRailPointerLeave,
            onMouseMove: handleRailPointerMove,
            onMouseLeave: handleRailPointerLeave,
          } as any)}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const isTop = magnifierLabel === item.name;
            const distance = interactionY === undefined || iconCenters[item.name] === undefined
              ? Number.POSITIVE_INFINITY
              : Math.abs(iconCenters[item.name] - interactionY);
            const scale = Number.isFinite(distance)
              ? 1 + 0.75 * Math.exp(-((distance / 52) ** 2))
              : 1;
            const isNear = !isTop && scale > 1.12;
            const itemClassName = [
              'hg-magnify-item',
              isActive && 'on',
              isNear && 'near',
              isTop && 'top',
            ].filter(Boolean).join(' ');

            return (
                <Pressable
                  key={item.name}
                  accessibilityRole={Platform.OS === 'web' ? 'link' : 'button'}
                  accessibilityLabel={item.name}
                  accessibilityState={{ selected: isActive }}
                  onPress={() => navigateWithTransition(item.href, item.name, 'section')}
                  onHoverIn={() => setHoveredKey(item.name)}
                  onHoverOut={() => setHoveredKey((current) => current === item.name ? null : current)}
                  onFocus={() => { setHoveredKey(item.name); setKeyboardFocusLabel(item.name); }}
                  onBlur={() => { setHoveredKey(null); setKeyboardFocusLabel(null); }}
                  onPressIn={() => setTouchFocusLabel(item.name)}
                  onLayout={(event) => {
                    const { y, height } = event.nativeEvent.layout;
                    const center = y + height / 2;
                    setIconCenters((previous) => previous[item.name] === center ? previous : { ...previous, [item.name]: center });
                  }}
                  style={StyleSheet.flatten([
                    styles.navItem,
                    { '--s': scale, zIndex: isTop ? 30 : 1 } as any,
                  ])}
                  {...({ className: itemClassName } as any)}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      { transform: [{ scale }] },
                      isTop && styles.iconWrapTop,
                      !isTop && isNear && styles.iconWrapNear,
                      !isTop && !isNear && isActive && styles.iconWrapActive,
                      Platform.select({
                        web: {
                          transformOrigin: 'left center',
                          boxShadow: isTop ? '0 10px 22px -8px rgba(14,79,59,.8)' : 'none',
                        } as any,
                        default: {},
                      }),
                    ]}
                    {...({ className: 'hg-magnify-icon' } as any)}
                  >
                    <Icon
                      size={20}
                      color={
                        isTop || (isActive && !isNear)
                          ? '#FFFFFF'
                          : isNear
                          ? themeColors.primary
                          : themeColors.textSecondary
                      }
                      strokeWidth={isTop || isActive ? 2.4 : 1.9}
                    />
                  </View>

                  <View
                    pointerEvents="none"
                    style={[
                      styles.magnifyLabel,
                      {
                        left: 44 * scale + 14,
                        opacity: isTop ? 1 : 0,
                        transform: [{ translateX: isTop ? 0 : -8 }],
                        zIndex: isTop ? 40 : 2,
                      },
                    ]}
                    className={`hg-magnify-label${isTop ? ' show' : ''}`}
                  >
                    <View style={styles.magnifyLabelArrow} />
                    <Text style={styles.magnifyLabelText} numberOfLines={1}>{item.name}</Text>
                  </View>
                </Pressable>
            );
          })}
        </View>
      </View>

      {/* Footer Controls: Theme Toggle & User Avatar */}
      <View style={styles.footer}>
        <Pressable
          onPress={toggleTheme}
          onHoverIn={() => setHoveredKey('theme')}
          onHoverOut={() => setHoveredKey(null)}
          onFocus={() => setHoveredKey('theme')}
          onBlur={() => setHoveredKey(null)}
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${isDarkMode ? 'light' : 'dark'} theme`}
          style={({ pressed }) => [
            styles.themeButton,
            hoveredKey === 'theme' && styles.themeButtonHovered,
            pressed && styles.themeButtonPressed,
          ]}
        >
          {isDarkMode ? (
            <Sun size={18} color={themeColors.primary} />
          ) : (
            <Moon size={18} color={themeColors.primary} />
          )}

          <FloatingTooltip
            visible={hoveredKey === 'theme'}
            title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            description={`Switch to ${isDarkMode ? 'light daylight' : 'dark night'} theme`}
            styles={styles}
          />
        </Pressable>

        <Pressable
          accessibilityLabel="User profile"
          onHoverIn={() => setHoveredKey('user')}
          onHoverOut={() => setHoveredKey(null)}
          onFocus={() => setHoveredKey('user')}
          onBlur={() => setHoveredKey(null)}
          style={styles.userCard}
        >
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{userInitial}</Text>
            <View style={styles.userStatusDot} />
          </View>

          <FloatingTooltip
            visible={hoveredKey === 'user'}
            title={user.name || 'User Profile'}
            description={`${(user.role || 'Member').toUpperCase()} • HyGrow System`}
            styles={styles}
          />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    floatingContainer: {
      position: Platform.OS === 'web' ? 'fixed' : 'absolute',
      left: 14,
      top: 32,
      bottom: 32,
      width: 68,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      zIndex: 100,
      overflow: 'visible',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      ...Platform.select({
        web: {
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
      width: '100%',
      alignItems: 'center',
      paddingTop: 16,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      position: 'relative',
      overflow: 'visible',
    },
    logoBtn: {
      position: 'relative',
      overflow: 'visible',
    },
    logoBadge: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: colors.primary + '18',
      borderWidth: 1,
      borderColor: colors.primary + '32',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
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
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    navContainer: {
      flex: 1,
      width: '100%',
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'visible',
    },
    navGroup: {
      gap: 20,
      alignItems: 'center',
      width: '100%',
      position: 'relative',
      overflow: 'visible',
    },
    navItem: {
      width: 44,
      height: 44,
      borderRadius: 999,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      overflow: 'visible',
      backgroundColor: 'transparent',
      ...Platform.select({
        web: {
          cursor: 'pointer',
          transition: 'background-color 0.16s ease, transform 0.14s ease',
        } as any,
      }),
    },
    navItemActive: {
      backgroundColor: colors.isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#0E4F3B',
    },
    navItemHovered: {
      backgroundColor: colors.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(14, 79, 59, 0.08)',
    },
    activeGlowIndicator: {
      position: 'absolute',
      left: -9,
      width: 3.5,
      height: 18,
      borderRadius: 2,
      backgroundColor: colors.primary,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 999,
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    iconWrapTop: {
      backgroundColor: colors.isDarkMode ? '#3FB67F' : '#0E4F3B',
      ...Platform.select({
        web: { boxShadow: '0 10px 22px -8px rgba(14,79,59,.8)' } as any,
        default: { elevation: 8 },
      }),
    },
    iconWrapNear: {
      backgroundColor: colors.isDarkMode ? '#1F3A2E' : '#D9E6E0',
    },
    iconWrapActive: {
      backgroundColor: colors.isDarkMode ? '#3FB67F' : '#0E4F3B',
    },
    iconWrapHovered: {
      backgroundColor: colors.isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(14, 79, 59, 0.12)',
    },
    magnifyLabel: {
      position: 'absolute',
      top: 3,
      height: 38,
      paddingHorizontal: 18,
      borderRadius: 99,
      backgroundColor: colors.isDarkMode ? '#35513F' : '#A9BD9B',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
      ...Platform.select({
        web: {
          transition: 'opacity 0.18s ease, transform 0.18s cubic-bezier(.2,.9,.3,1.2)',
          whiteSpace: 'nowrap',
        } as any,
      }),
    },
    magnifyLabelArrow: {
      position: 'absolute',
      left: -5,
      top: 14,
      width: 10,
      height: 10,
      borderRadius: 2,
      backgroundColor: colors.isDarkMode ? '#35513F' : '#A9BD9B',
      transform: [{ rotate: '45deg' }],
    },
    magnifyLabelText: {
      color: colors.isDarkMode ? '#EAF2EC' : '#0E4F3B',
      fontSize: 15,
      lineHeight: 18,
      fontWeight: '700',
      fontFamily: Platform.OS === 'web' ? 'Manrope' : undefined,
      zIndex: 1,
      ...Platform.select({ web: { whiteSpace: 'nowrap' } as any }),
    },
    footer: {
      width: '100%',
      paddingVertical: 14,
      alignItems: 'center',
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceLight,
      borderBottomLeftRadius: 34,
      borderBottomRightRadius: 34,
      position: 'relative',
      overflow: 'visible',
    },
    themeButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(14, 79, 59, 0.08)',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      overflow: 'visible',
      ...Platform.select({
        web: {
          cursor: 'pointer',
          transition: 'background-color 0.16s ease, transform 0.14s ease',
        } as any,
      }),
    },
    themeButtonHovered: {
      backgroundColor: colors.isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(14, 79, 59, 0.14)',
    },
    themeButtonPressed: {
      opacity: 0.8,
    },
    userCard: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      overflow: 'visible',
      ...Platform.select({
        web: {
          cursor: 'pointer',
        } as any,
      }),
    },
    avatarWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    avatarText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 15,
    },
    userStatusDot: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 8.5,
      height: 8.5,
      borderRadius: 5,
      backgroundColor: '#22C55E',
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    // Floating Textured Tooltip Box
    floatingTooltip: {
      position: 'absolute',
      left: 56,
      top: '50%',
      zIndex: 9999,
      minWidth: 180,
      maxWidth: 240,
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.isDarkMode ? 'rgba(16, 185, 129, 0.35)' : 'rgba(14, 79, 59, 0.22)',
      backgroundColor: colors.isDarkMode ? 'rgba(14, 22, 19, 0.94)' : 'rgba(255, 255, 255, 0.96)',
      ...Platform.select({
        web: {
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          boxShadow: colors.isDarkMode
            ? '0 12px 32px rgba(0, 0, 0, 0.7), 0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.16)'
            : '0 12px 28px rgba(14, 79, 59, 0.15), 0 2px 8px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
          transition: 'opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        } as any,
      }),
    },
    tooltipPointer: {
      position: 'absolute',
      left: -5,
      top: '50%',
      marginTop: -5,
      width: 10,
      height: 10,
      backgroundColor: colors.isDarkMode ? 'rgba(14, 22, 19, 0.94)' : 'rgba(255, 255, 255, 0.96)',
      borderLeftWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.isDarkMode ? 'rgba(16, 185, 129, 0.35)' : 'rgba(14, 79, 59, 0.22)',
      transform: [{ rotate: '45deg' }],
    },
    tooltipSheen: {
      position: 'absolute',
      top: 0,
      left: 10,
      right: 10,
      height: 1,
      backgroundColor: colors.isDarkMode ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.85)',
      borderRadius: 1,
    },
    tooltipContent: {
      position: 'relative',
      zIndex: 2,
    },
    tooltipHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 2,
    },
    tooltipTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.2,
    },
    tooltipActiveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 6,
      backgroundColor: colors.isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(14, 79, 59, 0.12)',
    },
    tooltipActiveDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: colors.primary,
    },
    tooltipActiveText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.6,
    },
    tooltipDesc: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '500',
      letterSpacing: -0.1,
    },
  });
