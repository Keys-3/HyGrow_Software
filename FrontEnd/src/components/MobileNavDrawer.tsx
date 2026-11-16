import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import {
  House,
  Bot,
  ClipboardList,
  ChartBar as BarChart3,
  ShoppingCart,
  Package,
  Settings,
  Sun,
  Moon,
  Camera,
  X,
  ChevronRight,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react-native';

import useAppStore from '../store/useAppStore';
import { useThemeColors, borderRadius, spacing, typography } from '../theme/theme';
import { PressableScale } from './PressableScale';

const getNavItems = (role: string, features: any) => {
  const items = [
    { name: 'Dashboard', icon: House, href: '/dashboard', roles: ['farmer', 'admin'], featureKey: 'sensors' },
    { name: 'Plant Logs', icon: Camera, href: '/plants', roles: ['farmer', 'admin'] },
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

interface MobileNavDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export function MobileNavDrawer({ visible, onClose }: MobileNavDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const user = useAppStore((state) => state.user);
  const farmerFeatures = useAppStore((state) => state.farmerFeatures);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors, width);

  if (!user) return null;

  const navItems = getNavItems(user.role, farmerFeatures);
  const userInitial = (user.name || user.email || 'H').charAt(0).toUpperCase();

  const handleNavigate = (href: string) => {
    onClose();
    setTimeout(() => {
      router.push(href as any);
    }, 150);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        {/* Dimmed backdrop with touch dismiss */}
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Close navigation drawer"
        />

        {/* Sliding Drawer Container */}
        <View style={styles.drawerContainer}>
          {/* Drawer Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Image
                  source={require('../../assets/images/logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.brandTextWrap}>
                <Text style={styles.brandTitle}>HYGROW</Text>
                <View style={styles.liveBadge}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.liveBadgeText}>SYSTEM ONLINE</Text>
                </View>
              </View>
            </View>

            <PressableScale
              style={styles.closeBtn}
              onPress={onClose}
              activeScale={0.9}
              accessibilityLabel="Close drawer"
            >
              <X size={18} color={themeColors.textSecondary} />
            </PressableScale>
          </View>

          {/* Navigation Items List */}
          <ScrollView
            style={styles.navScrollView}
            contentContainerStyle={styles.navScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionLabel}>NAVIGATION</Text>

            <View style={styles.navGroup}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const isHovered = hoveredItem === item.name;

                return (
                  <PressableScale
                    key={item.name}
                    onPress={() => handleNavigate(item.href)}
                    onHoverIn={() => setHoveredItem(item.name)}
                    onHoverOut={() => setHoveredItem(null)}
                    activeScale={0.97}
                    style={[
                      styles.navItem,
                      isActive && styles.navItemActive,
                      isHovered && !isActive && styles.navItemHovered,
                    ]}
                    accessibilityLabel={item.name}
                    accessibilityState={{ selected: isActive }}
                  >
                    <View
                      style={[
                        styles.iconWrap,
                        isActive && styles.iconWrapActive,
                        isHovered && !isActive && styles.iconWrapHovered,
                      ]}
                    >
                      <Icon
                        size={19}
                        color={
                          isActive
                            ? '#FFFFFF'
                            : isHovered
                            ? themeColors.primary
                            : themeColors.textSecondary
                        }
                        strokeWidth={isActive ? 2.4 : 1.8}
                      />
                    </View>

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

                    {isActive ? (
                      <View style={styles.activeDot} />
                    ) : (
                      <ChevronRight
                        size={15}
                        color={isHovered ? themeColors.text : themeColors.textMuted}
                        style={{ opacity: isHovered ? 0.8 : 0.3 }}
                      />
                    )}
                  </PressableScale>
                );
              })}
            </View>
          </ScrollView>

          {/* Drawer Footer Controls */}
          <View style={styles.drawerFooter}>
            {/* Theme Toggle Pill */}
            <PressableScale
              onPress={toggleTheme}
              onHoverIn={() => setHoveredItem('theme')}
              onHoverOut={() => setHoveredItem(null)}
              activeScale={0.96}
              style={[
                styles.themeBtn,
                hoveredItem === 'theme' && styles.themeBtnHovered,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            >
              <View style={styles.themeIconCircle}>
                {isDarkMode ? (
                  <Sun size={16} color={themeColors.primary} />
                ) : (
                  <Moon size={16} color={themeColors.primary} />
                )}
              </View>
              <Text style={styles.themeBtnText}>
                {isDarkMode ? 'Light mode' : 'Dark mode'}
              </Text>
            </PressableScale>

            {/* User Profile Card */}
            <View style={styles.userCard}>
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarText}>{userInitial}</Text>
                <View style={styles.userStatusDot} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user.name || 'User'}
                </Text>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{user.role || 'Member'}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any, windowWidth: number) => {
  const drawerWidth = Math.min(windowWidth * 0.84, 320);

  return StyleSheet.create({
    modalRoot: {
      flex: 1,
      flexDirection: 'row',
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      ...Platform.select({
        web: {
          backdropFilter: 'blur(4px)',
        } as any,
      }),
    },
    drawerContainer: {
      width: drawerWidth,
      height: '100%',
      backgroundColor: colors.surface,
      borderTopRightRadius: 28,
      borderBottomRightRadius: 28,
      borderRightWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      ...Platform.select({
        web: {
          boxShadow: '8px 0 32px rgba(0, 0, 0, 0.35)',
        },
        default: {
          elevation: 16,
        },
      }),
    },
    drawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: Platform.OS === 'ios' ? 54 : spacing.xl,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logoBadge: {
      width: 42,
      height: 42,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primary + '18',
      borderWidth: 1,
      borderColor: colors.primary + '35',
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoImage: {
      width: 26,
      height: 26,
    },
    brandTextWrap: {
      justifyContent: 'center',
    },
    brandTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.2,
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 2,
    },
    livePulseDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#22C55E',
    },
    liveBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 0.6,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    navScrollView: {
      flex: 1,
    },
    navScrollContent: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.lg,
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1,
      color: colors.textMuted,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    navGroup: {
      gap: 4,
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: borderRadius.lg,
      gap: 12,
      minHeight: 48,
      ...Platform.select({
        web: {
          cursor: 'pointer',
          transition: 'all 0.16s ease',
        },
      }),
    },
    navItemActive: {
      backgroundColor: colors.isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#0E4F3B',
    },
    navItemHovered: {
      backgroundColor: colors.isDarkMode ? 'rgba(255, 255, 255, 0.07)' : 'rgba(14, 79, 59, 0.08)',
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(14, 79, 59, 0.05)',
    },
    iconWrapActive: {
      backgroundColor: colors.isDarkMode ? colors.primary : '#0B3E2F',
    },
    iconWrapHovered: {
      backgroundColor: colors.isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(14, 79, 59, 0.15)',
    },
    navText: {
      ...typography.body,
      fontSize: 14.5,
      color: colors.textSecondary,
      fontWeight: '500',
      flex: 1,
    },
    navTextActive: {
      color: colors.isDarkMode ? colors.primary : '#FFFFFF',
      fontWeight: '700',
    },
    navTextHovered: {
      color: colors.text,
      fontWeight: '600',
    },
    activeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    drawerFooter: {
      padding: spacing.md,
      borderTopWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceLight,
      gap: 10,
      paddingBottom: Platform.OS === 'ios' ? 36 : spacing.lg,
    },
    themeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: borderRadius.md,
      gap: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...Platform.select({
        web: {
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        },
      }),
    },
    themeBtnHovered: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    themeIconCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    themeBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 6,
      borderRadius: borderRadius.md,
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
      fontSize: 13.5,
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
  });
};
