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
import { useEffect, useMemo, useState } from 'react';

import useAppStore from '../store/useAppStore';
import { spacing, useThemeColors, borderRadius, typography } from '../theme/theme';

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

  // Administrator has unrestricted visibility of all platform capabilities
  if (role === 'admin') {
    return items;
  }

  return items.filter((item) => {
    // 1. Must match role
    if (!item.roles.includes(role)) return false;

    // 2. If it's a feature-gated tab and user is farmer, check if feature is enabled
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

export function Sidebar({ isCollapsed = false, floating = false, mobileDock = false }: SidebarProps) {
  const pathname = usePathname();
  const user = useAppStore((state) => state.user);
  const farmerFeatures = useAppStore((state) => state.farmerFeatures);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [pointerY, setPointerY] = useState<number | null>(null);
  const [iconCenters, setIconCenters] = useState<Record<string, number>>({});
  const [keyboardFocusLabel, setKeyboardFocusLabel] = useState<string | null>(null);
  const [touchFocusLabel, setTouchFocusLabel] = useState<string | null>(null);
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors, isCollapsed, floating, mobileDock), [themeColors, isCollapsed, floating, mobileDock]);
  const isDockRail = isCollapsed && floating && !mobileDock;

  useEffect(() => {
    setTouchFocusLabel(null);
  }, [pathname]);

  if (!user) {
    return null;
  }

  const navItems = getNavItems(user.role, farmerFeatures);
  const userInitial = (user.name || user.email || 'H').charAt(0).toUpperCase();
  const nearestPointerItem = pointerY === null
    ? null
    : navItems.reduce<(typeof navItems)[number] | null>((nearest, item) => {
        const center = iconCenters[item.name];
        if (center === undefined) return nearest;
        if (!nearest) return item;
        return Math.abs(center - pointerY) < Math.abs(iconCenters[nearest.name] - pointerY) ? item : nearest;
      }, null);
  const magnifierLabel = nearestPointerItem?.name ?? keyboardFocusLabel ?? touchFocusLabel;
  const activeFocusLabel = keyboardFocusLabel ?? magnifierLabel;
  const interactionY = keyboardFocusLabel
    ? iconCenters[keyboardFocusLabel]
    : pointerY ?? (magnifierLabel ? iconCenters[magnifierLabel] : undefined);
  const NavigationContainer: any = isDockRail ? View : ScrollView;

  const handleRailPointerMove = (event: any) => {
    if (!isDockRail) return;
    const bounds = event.currentTarget?.getBoundingClientRect?.();
    const clientY = event.clientY ?? event.nativeEvent?.clientY;
    if (bounds && typeof clientY === 'number') setPointerY(clientY - bounds.top);
  };

  const handleRailPointerLeave = () => {
    setPointerY(null);
    setHoveredLabel(null);
    setTouchFocusLabel(null);
  };

  return (
    <View
      style={[styles.container, isCollapsed && styles.containerCollapsed, floating && styles.containerFloating, mobileDock && styles.containerMobileDock]}
      {...(isDockRail ? ({ className: 'hg-magnify-rail' } as any) : {})}
    >
      {/* Brand Header */}
      <View style={[styles.header, isCollapsed && styles.headerCollapsed, mobileDock && styles.headerMobileDock]}>
        <View style={styles.brandRow}>
          <View style={[styles.logoBadge, isCollapsed && styles.logoBadgeCollapsed]}>
            <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
            {isCollapsed ? <View style={styles.logoOnlineDot} {...({ className: 'hg-logo-ping' } as any)} /> : null}
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
      <NavigationContainer
        style={isDockRail ? styles.navDockViewport : [styles.navScrollView, mobileDock && styles.navScrollViewMobile]}
        {...(!isDockRail ? {
          horizontal: mobileDock,
          contentContainerStyle: [styles.navScrollContent, mobileDock && styles.navScrollContentMobile],
          showsVerticalScrollIndicator: false,
        } : {})}
        {...(isDockRail ? ({ className: 'hg-magnify-dock' } as any) : {})}
      >
        <View
          style={[styles.navGroup, mobileDock && styles.navGroupMobile]}
          {...(isDockRail ? ({
            onPointerMove: handleRailPointerMove,
            onPointerLeave: handleRailPointerLeave,
            onMouseMove: handleRailPointerMove,
            onMouseLeave: handleRailPointerLeave,
          } as any) : {})}
        >
          {!isCollapsed && <Text style={styles.navGroupLabel}>NAVIGATION</Text>}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const isTop = isDockRail && activeFocusLabel === item.name;
            const distance = interactionY === undefined || iconCenters[item.name] === undefined
              ? Number.POSITIVE_INFINITY
              : Math.abs(iconCenters[item.name] - interactionY);
            const scale = !isDockRail
              ? 1
              : keyboardFocusLabel
                ? isTop ? 1.75 : 1
                : Number.isFinite(distance)
                  ? 1 + 0.75 * Math.exp(-((distance / 52) ** 2))
                  : 1;
            const isNear = isDockRail && !isTop && scale > 1.12;
            const showLabel = isDockRail ? isTop : hoveredLabel === item.name;
            const dockGreen = isDarkMode ? '#3fb67f' : '#0e4f3b';
            const dockActive = isDarkMode ? '#1f3a2e' : '#d9e6e0';
            const dockLabelStyle = isDockRail ? ({
              opacity: isTop ? 1 : 0,
              left: 44 * scale + 14,
              transform: isTop ? 'translate(0px, -50%) scale(1)' : 'translate(-8px, -50%) scale(.85)',
            } as any) : null;
            const dockClassName = [
              'hg-magnify-item',
              isActive && 'on',
              isNear && 'near',
              isTop && 'top',
            ].filter(Boolean).join(' ');

            return (
              <Link key={item.name} href={item.href as any} asChild>
                <Pressable
                  accessibilityLabel={item.name}
                  accessibilityState={{ selected: isActive }}
                  onHoverIn={() => { if (!isDockRail) setHoveredLabel(item.name); }}
                  onHoverOut={() => { if (!isDockRail) setHoveredLabel(null); }}
                  onFocus={() => { setHoveredLabel(item.name); setKeyboardFocusLabel(item.name); }}
                  onBlur={() => { setHoveredLabel(null); setKeyboardFocusLabel(null); }}
                  onPressIn={() => { if (isDockRail) setTouchFocusLabel(item.name); }}
                  style={StyleSheet.flatten([
                    styles.navItem,
                    isActive && (isCollapsed ? styles.navItemActiveCollapsed : styles.navItemActive),
                    isCollapsed && styles.navItemCollapsed,
                    isDockRail && styles.navItemDock,
                    mobileDock && styles.navItemMobileDock,
                    isCollapsed && isTop && styles.navItemHovered,
                    isDockRail && ({ '--s': scale } as any),
                    isDockRail && { zIndex: isTop ? 30 : 1 },
                  ])}
                  {...(isDockRail ? ({ className: dockClassName } as any) : {})}
                  {...(isDockRail ? ({
                    onLayout: (event: any) => {
                      const { y, height } = event.nativeEvent.layout;
                      const center = y + height / 2;
                      setIconCenters((previous) => previous[item.name] === center ? previous : { ...previous, [item.name]: center });
                    },
                  } as any) : {})}
                >
                  <View style={[
                    styles.iconWrap,
                    isDockRail && styles.iconWrapDock,
                    isDockRail && {
                      backgroundColor: isTop || isActive ? dockGreen : isNear ? dockActive : 'transparent',
                    },
                    isDockRail && Platform.select({
                      web: {
                        transform: `scale(${scale})`,
                        transformOrigin: 'left center',
                        transition: 'transform .16s cubic-bezier(.2,.9,.3,1.2),background .2s,color .2s,box-shadow .2s',
                        willChange: 'transform',
                        boxShadow: isTop ? '0 10px 22px -8px rgba(14,79,59,.8)' : 'none',
                      } as any,
                      default: { transform: [{ scale }] },
                    }),
                    !isDockRail && isActive && styles.iconWrapActive,
                    isCollapsed && !isDockRail && hoveredLabel === item.name && styles.iconWrapHovered,
                  ]} {...(isDockRail ? ({ className: 'hg-magnify-icon' } as any) : {})}>
                    <Icon
                      size={isCollapsed ? 22 : 18}
                      color={isTop || isActive
                        ? '#FFFFFF'
                        : isNear ? themeColors.text : themeColors.textMuted}
                      strokeWidth={isTop || isActive ? 2.5 : 1.8}
                    />
                  </View>
                  {!isCollapsed && (
                    <Text style={[styles.navText, isActive && styles.navTextActive]}>
                      {item.name}
                    </Text>
                  )}
                  {!isCollapsed && isActive && <View style={styles.activeGlowPill} />}
                  {isDockRail ? (
                    <View
                      pointerEvents="none"
                      className={`hg-magnify-label${isTop ? ' show' : ''}`}
                      style={[styles.dockLabel, dockLabelStyle]}
                    >
                      <View style={styles.dockLabelArrow} />
                      <Text style={styles.dockLabelText}>{item.name}</Text>
                    </View>
                  ) : isCollapsed && floating && !mobileDock ? (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.hoverLabel,
                        showLabel ? styles.hoverLabelVisible : styles.hoverLabelHidden,
                        isDockRail && { left: 44 * scale + 14 },
                      ]}
                    >
                      <Text style={styles.hoverLabelText}>{item.name}</Text>
                    </View>
                  ) : null}
                </Pressable>
              </Link>
            );
          })}
        </View>
      </NavigationContainer>

      {isCollapsed && !mobileDock ? <View style={styles.railDivider} /> : null}
      {mobileDock ? <View style={styles.dockDivider} /> : null}

      {/* User Profile Card */}
      <View style={[styles.footer, isCollapsed && styles.footerCollapsed, mobileDock && styles.footerMobileDock]}>
        <Pressable
          onPress={toggleTheme}
          onHoverIn={() => setHoveredLabel('theme')}
          onHoverOut={() => setHoveredLabel(null)}
          onFocus={() => setHoveredLabel('theme')}
          onBlur={() => setHoveredLabel(null)}
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${isDarkMode ? 'light' : 'dark'} theme`}
          accessibilityHint="Changes the app appearance"
          style={({ pressed }) => [
            styles.themeButton,
            isCollapsed && styles.themeButtonCollapsed,
            mobileDock && styles.themeButtonMobileDock,
            isCollapsed && hoveredLabel === 'theme' && styles.iconWrapHovered,
            pressed && styles.themeButtonPressed,
          ]}
        >
          <View style={styles.themeIconWrap}>
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
          {isCollapsed && floating && !mobileDock ? (
            <View
              pointerEvents="none"
              style={[
                styles.hoverLabel,
                hoveredLabel === 'theme' ? styles.hoverLabelVisible : styles.hoverLabelHidden,
              ]}
            >
              <Text style={styles.hoverLabelText}>{isDarkMode ? 'Light mode' : 'Dark mode'}</Text>
            </View>
          ) : null}
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
          {isCollapsed && floating && !mobileDock ? (
            <View
              pointerEvents="none"
              style={[
                styles.hoverLabel,
                hoveredLabel === 'user' ? styles.hoverLabelVisible : styles.hoverLabelHidden,
              ]}
            >
              <Text style={styles.hoverLabelText} numberOfLines={1}>{user.name || user.email || 'User'}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: any, isCollapsed: boolean, floating: boolean, mobileDock: boolean) =>
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
    containerMobileDock: {
      position: 'absolute',
      left: '50%',
      bottom: 12,
      top: 'auto',
      zIndex: 50,
      width: 'auto',
      height: 'auto',
      maxWidth: 'calc(100vw - 20px)',
      maxHeight: 'none',
      alignSelf: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 7,
      paddingHorizontal: 7,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      ...Platform.select({ web: { transform: 'translateX(-50%)', bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', boxShadow: colors.isDarkMode ? '0 12px 30px -16px rgba(0,0,0,.75)' : '0 12px 30px -16px rgba(14,79,59,.38)' } as any }),
    },
    containerFloating: {
      position: Platform.OS === 'web' ? 'fixed' : 'absolute',
      left: Platform.OS === 'web' ? 26 : 18,
      top: '50%',
      width: 'auto',
      height: 'auto',
      maxHeight: 'none',
      alignSelf: 'auto',
      zIndex: 20,
      paddingVertical: 22,
      paddingHorizontal: 11,
      alignItems: 'center',
      gap: 16,
      overflow: 'visible',
      borderWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.isDarkMode ? '#26382E' : colors.border,
      backgroundColor: colors.isDarkMode ? '#101B15' : colors.surface,
      borderRadius: 999,
      ...Platform.select({
        web: {
          transform: 'translateY(-50%)',
          boxShadow: '0 24px 50px -26px rgba(14,79,59,.6)',
        } as any,
      }),
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerCollapsed: {
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: spacing.xs,
      alignItems: 'center',
      borderBottomWidth: 0,
    },
    headerMobileDock: { padding: 0, marginRight: 5 },
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
    logoBadgeCollapsed: { width: 44, height: 44, borderRadius: 999, backgroundColor: colors.isDarkMode ? '#1B3328' : '#FFFFFF', borderColor: colors.isDarkMode ? '#35513F' : colors.border },
    logo: {
      width: 26,
      height: 26,
    },
    logoOnlineDot: { position: 'absolute', right: 1, top: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E', borderWidth: 2, borderColor: colors.surface },
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
      flexGrow: 0,
      maxHeight: floating ? 520 : undefined,
      ...Platform.select({ web: { overflow: 'visible' } as any }),
    },
    navScrollViewMobile: ({ flex: 0, flexShrink: 1, maxWidth: 'calc(100vw - 150px)', maxHeight: 'none', overflow: 'auto' } as any),
    navDockViewport: { flexGrow: 0, flexShrink: 0, overflow: 'visible' },
    navScrollContent: {
      paddingVertical: isCollapsed ? spacing.xs : spacing.md,
      paddingHorizontal: isCollapsed ? 0 : spacing.md,
    },
    navScrollContentMobile: { flexDirection: 'row', alignItems: 'center', paddingVertical: 0, paddingHorizontal: 0, gap: 4 },
    navGroup: {
      gap: isCollapsed && floating && !mobileDock ? 20 : isCollapsed ? 6 : 4,
    },
    navGroupMobile: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    navGroupLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 1,
      marginBottom: 8,
      paddingHorizontal: spacing.sm,
    },
    navItem: {
      minHeight: isCollapsed ? 46 : 42,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: isCollapsed ? 0 : 12,
      borderRadius: isCollapsed ? 999 : 10,
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
      width: 46,
      height: 46,
      alignSelf: 'center',
      justifyContent: 'center',
      paddingHorizontal: 0,
      overflow: 'visible',
      zIndex: 1,
    },
    navItemDock: {
      width: 44,
      height: 44,
      minHeight: 44,
      alignSelf: 'auto',
      padding: 0,
      overflow: 'visible',
      zIndex: 1,
      position: 'relative',
    },
    navItemMobileDock: { width: 38, height: 38, minHeight: 38, flexShrink: 0, borderRadius: 999 },
    navItemHovered: {
      zIndex: 30,
    },
    iconWrapHovered: {
      width: 50,
      height: 50,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: colors.isDarkMode ? colors.primary : '#9CAF88',
      backgroundColor: colors.isDarkMode ? 'rgba(156,175,136,.16)' : 'rgba(156,175,136,.24)',
      transform: [{ scale: 1.06 }],
      ...Platform.select({
        web: { transition: 'all 0.18s cubic-bezier(.2,.8,.2,1)' },
      }),
    },
    iconWrapCollapsed: {
      width: 46,
      height: 46,
      borderRadius: 999,
      backgroundColor: colors.isDarkMode ? '#1B3328' : 'rgba(14,79,59,.07)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconWrapDock: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: 44,
      height: 44,
      borderRadius: 999,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'visible',
    },
    dockLabel: {
      position: 'absolute',
      top: '50%',
      left: 58,
      zIndex: 2,
      minHeight: 40,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: colors.isDarkMode ? '#EAF2EC' : '#10241B',
      color: colors.isDarkMode ? '#0D1511' : '#F6F4EF',
      justifyContent: 'center',
      overflow: 'visible',
      ...Platform.select({
        web: {
          transform: 'translate(-8px,-50%) scale(.85)',
          transformOrigin: 'left center',
          transition: 'all .22s cubic-bezier(.3,1.5,.5,1)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        } as any,
      }),
    },
    dockLabelText: {
      color: colors.isDarkMode ? '#0D1511' : '#F6F4EF',
      fontFamily: 'Manrope',
      fontSize: 15,
      fontWeight: '700',
      whiteSpace: 'nowrap',
    } as any,
    dockLabelArrow: {
      position: 'absolute',
      left: -5,
      top: 14,
      width: 12,
      height: 12,
      borderRadius: 3,
      backgroundColor: colors.isDarkMode ? '#EAF2EC' : '#10241B',
      transform: [{ rotate: '45deg' }],
    },
    iconWrapActiveCollapsed: {
      backgroundColor: colors.isDarkMode ? '#2F9E6B' : '#0E4F3B',
    },
    iconWrapMagnified: {
      backgroundColor: colors.isDarkMode ? '#3BB681' : '#0E4F3B',
      borderRadius: 999,
      ...Platform.select({
        web: { boxShadow: colors.isDarkMode ? '0 10px 26px -8px rgba(47,158,107,.55)' : '0 8px 18px -8px rgba(14,79,59,.6)' },
        default: { elevation: 6 },
      }),
    },
    hoverLabel: {
      position: 'absolute',
      left: 58,
      top: '50%',
      minHeight: 34,
      maxWidth: 190,
      paddingHorizontal: 13,
      justifyContent: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'transparent',
      backgroundColor: '#EAF2EC',
      zIndex: 40,
      ...Platform.select({
        web: {
          transform: 'translateY(-50%)',
          boxShadow: colors.isDarkMode
            ? '0 12px 30px -12px rgba(0,0,0,.72)'
            : '0 10px 24px -12px rgba(14,35,25,.4)',
          transition: 'opacity 0.18s ease, left 0.18s cubic-bezier(.2,.9,.3,1.2), transform 0.18s cubic-bezier(.2,.9,.3,1.2)',
          whiteSpace: 'nowrap',
        } as any,
      }),
    },
    hoverLabelVisible: {
      opacity: 1,
      transform: [{ translateX: 5 }, { translateY: -19 }],
    },
    hoverLabelHidden: {
      opacity: 0,
      transform: [{ translateX: -5 }, { translateY: -19 }],
    },
    hoverLabelText: {
      color: '#10241B',
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
    },
    hoverLabelArrow: {
      position: 'absolute',
      left: -5,
      top: 12,
      width: 9,
      height: 9,
      backgroundColor: '#EAF2EC',
      borderLeftWidth: 0,
      borderBottomWidth: 0,
      transform: [{ rotate: '45deg' }],
    },
    navItemActive: {
      backgroundColor: '#0E4F3B',
      borderWidth: 0,
    },
    navItemActiveCollapsed: {
      backgroundColor: 'transparent',
      borderWidth: 0,
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
      color: colors.adapt('#F8FAF8', colors.text),
      fontWeight: '700',
    },
    activeGlowPill: {
      width: 4,
      height: 18,
      borderRadius: 2,
      backgroundColor: colors.primary,
      ...Platform.select({
        web: {
          boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
        },
      }),
    },
    footer: {
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceLight,
    },
    footerCollapsed: {
      padding: 0,
      paddingTop: spacing.xs,
      alignItems: 'center',
      borderTopWidth: 0,
      backgroundColor: 'transparent',
    },
    footerMobileDock: { padding: 0, paddingTop: 0, borderTopWidth: 0, backgroundColor: 'transparent', flexDirection: 'row', alignItems: 'center', gap: 4 },
    dockDivider: { width: 1, height: 24, marginHorizontal: 5, backgroundColor: colors.border },
    railDivider: { width: 24, height: 1, marginVertical: 5, alignSelf: 'center', backgroundColor: colors.border },
    themeButton: {
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.sm,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...Platform.select({
        web: {
          cursor: 'pointer',
          transition: 'background-color 0.15s ease',
        },
      }),
    },
    themeButtonCollapsed: {
      width: 46,
      height: 46,
      minHeight: 46,
      justifyContent: 'center',
      paddingHorizontal: 0,
      alignSelf: 'center',
      borderRadius: 999,
      marginBottom: 0,
      borderWidth: 0,
      backgroundColor: colors.surfaceLight,
      position: 'relative',
      overflow: 'visible',
    },
    themeButtonMobileDock: { width: 38, height: 38, minHeight: 38, borderRadius: 999, marginBottom: 0, borderWidth: 0 },
    themeButtonPressed: {
      opacity: 0.72,
    },
    themeIconWrap: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeButtonText: {
      ...typography.bodySmall,
      color: colors.text,
      fontWeight: '600',
      flex: 1,
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
      marginTop: spacing.xs,
      position: 'relative',
      overflow: 'visible',
    },
    avatarWrap: {
      width: mobileDock ? 34 : isCollapsed ? 40 : 36,
      height: mobileDock ? 34 : isCollapsed ? 40 : 36,
      borderRadius: isCollapsed ? 999 : 10,
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
      backgroundColor: colors.success,
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
    }) as any;
