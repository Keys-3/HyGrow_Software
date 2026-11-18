import React from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, useWindowDimensions } from 'react-native';
import { Sprout, ShoppingBag, ArrowRight, Sun, Moon } from 'lucide-react-native';
import { PressableScale } from '../PressableScale';
import useAuth from '../../hooks/useAuth';
import { useThemeColors } from '../../theme/theme';
import useAppStore from '../../store/useAppStore';
import { useNavigationTransition } from '../transitions/ScreenTransitionProvider';

interface PublicHeaderProps {
  activeRoute?: 'home' | 'products' | 'blogs' | 'faq' | 'contact';
}

export function PublicHeader({ activeRoute = 'home' }: PublicHeaderProps) {
  const navigateWithTransition = useNavigationTransition();
  const { user, isAuthenticated } = useAuth();
  const themeColors = useThemeColors();
  const { width } = useWindowDimensions();
  const isMobile = width < 960;
  const isSmallMobile = width < 480;
  const styles = createStyles(themeColors, isMobile, isSmallMobile);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleTheme = useAppStore((state) => state.toggleTheme);

  const navLinks = [
    { key: 'home', label: 'Home', path: '/home' },
    { key: 'products', label: 'Technology', path: '/products' },
    { key: 'blogs', label: 'Research', path: '/blogs' },
    { key: 'faq', label: 'FAQ', path: '/faq' },
    { key: 'contact', label: 'Contact', path: '/contact' },
    { key: 'market', label: 'Marketplace', path: '/(tabs)/market' },
  ];

  return (
    <View style={styles.headerContainer}>
      <View style={styles.mainRow}>
        {/* Brand / Logo */}
        <PressableScale
          style={styles.brandRow}
          onPress={() => navigateWithTransition('/home', 'Home', 'section')}
          activeScale={0.97}
        >
          <View style={styles.brandLogoWrap}>
            <Sprout size={18} color={themeColors.primary} />
          </View>
          <Text style={styles.brandTitle}>HYGROW</Text>
          {!isSmallMobile && (
            <View style={styles.systemStatusPill}>
              <View style={styles.systemStatusDot} />
              <Text style={styles.systemStatusText}>SYS 2.1 ONLINE</Text>
            </View>
          )}
        </PressableScale>

        {/* Desktop Navigation Links */}
        {!isMobile && (
          <View style={styles.desktopNav}>
            {navLinks.slice(0, 5).map((link) => {
              const isActive = activeRoute === link.key;
              return (
                <PressableScale
                  key={link.key}
                  onPress={() => navigateWithTransition(link.path, link.label, 'section')}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  activeScale={0.96}
                >
                  <Text style={[styles.navItemText, isActive && styles.navItemTextActive]}>
                    {link.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.navActions}>
          <PressableScale
            onPress={toggleTheme}
            style={styles.themeToggle}
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${isDarkMode ? 'light' : 'dark'} theme`}
            activeScale={0.92}
          >
            {isDarkMode ? (
              <Sun size={16} color={themeColors.textSecondary} />
            ) : (
              <Moon size={16} color={themeColors.textSecondary} />
            )}
          </PressableScale>

          {!isMobile && (
            <PressableScale
            onPress={() => navigateWithTransition('/(tabs)/market', 'Marketplace', 'section')}
              style={styles.navLinkMarket}
              activeScale={0.96}
            >
              <ShoppingBag size={14} color={themeColors.textSecondary} />
              <Text style={styles.navLinkMarketText}>Marketplace</Text>
            </PressableScale>
          )}

          <PressableScale
            onPress={() => {
              if (isAuthenticated) {
                navigateWithTransition(
                  user?.role === 'customer' ? '/(tabs)/market' : '/(tabs)/dashboard',
                  user?.role === 'customer' ? 'Marketplace' : 'Dashboard',
                  'section',
                );
              } else {
                navigateWithTransition('/(auth)', 'Grower Console', 'section');
              }
            }}
            style={styles.navSignInBtn}
            activeScale={0.96}
          >
            <Text style={styles.navSignInText}>
              {isAuthenticated
                ? user?.role === 'admin'
                  ? 'Admin Suite'
                  : 'Dashboard'
                : isSmallMobile
                ? 'Console'
                : 'Grower Console'}
            </Text>
            <ArrowRight size={13} color={themeColors.actionText} />
          </PressableScale>
        </View>
      </View>

      {/* Mobile Horizontal Subnav Scroll for Small Screens */}
      {isMobile && (
        <View style={styles.mobileNavWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mobileNavContent}
          >
            {navLinks.map((link) => {
              const isActive = activeRoute === link.key;
              return (
                <PressableScale
                  key={link.key}
                  onPress={() => navigateWithTransition(link.path, link.label, 'section')}
                  style={[styles.mobilePill, isActive && styles.mobilePillActive]}
                  activeScale={0.95}
                >
                  <Text
                    style={[
                      styles.mobilePillText,
                      isActive && styles.mobilePillTextActive,
                    ]}
                  >
                    {link.label}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const createStyles = (themeColors: any, isMobile: boolean, isSmallMobile: boolean) =>
  StyleSheet.create({
    headerContainer: {
      backgroundColor: themeColors.adapt('rgba(8, 18, 13, 0.95)', themeColors.surfaceGlass),
      borderBottomWidth: 1,
      borderBottomColor: themeColors.adapt('rgba(52, 211, 153, 0.15)', themeColors.border),
      paddingTop: isMobile ? 12 : 16,
      paddingBottom: isMobile ? 10 : 12,
      paddingHorizontal: isSmallMobile ? 12 : isMobile ? 16 : 24,
      ...Platform.select({
        web: {
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backdropFilter: 'blur(16px)',
        },
      }),
    },
    mainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      maxWidth: 1320,
      marginHorizontal: 'auto',
      width: '100%',
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    brandLogoWrap: {
      width: 32,
      height: 32,
      borderRadius: 9,
      backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.15)', themeColors.primaryGlow),
      borderWidth: 1,
      borderColor: themeColors.adapt('rgba(16, 185, 129, 0.35)', themeColors.borderStrong),
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandTitle: {
      fontSize: isSmallMobile ? 16 : 18,
      fontWeight: '900',
      color: themeColors.adapt('#F8FAF8', themeColors.text),
      letterSpacing: 1.5,
    },
    systemStatusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.12)', themeColors.primaryGlow),
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: themeColors.adapt('rgba(16, 185, 129, 0.25)', themeColors.border),
    },
    systemStatusDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: '#10B981',
    },
    systemStatusText: {
      fontSize: 12,
      fontWeight: '800',
      color: themeColors.adapt('#34D399', themeColors.primaryLight),
      letterSpacing: 0.5,
    },
    desktopNav: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    navItem: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
    },
    navItemActive: {
      backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.15)', themeColors.primaryGlow),
      borderWidth: 1,
      borderColor: themeColors.adapt('rgba(52, 211, 153, 0.3)', themeColors.border),
    },
    navItemText: {
      fontSize: 14,
      fontWeight: '600',
      color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
      letterSpacing: 0.2,
    },
    navItemTextActive: {
      color: themeColors.adapt('#34D399', themeColors.primaryLight),
      fontWeight: '700',
    },
    navActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isSmallMobile ? 6 : 10,
    },
    themeToggle: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.surfaceLight,
    },
    navLinkMarket: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: themeColors.adapt('rgba(255, 255, 255, 0.08)', themeColors.border),
      backgroundColor: themeColors.adapt('rgba(255, 255, 255, 0.03)', themeColors.surfaceLight),
    },
    navLinkMarketText: {
      fontSize: 13,
      fontWeight: '600',
      color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    },
    navSignInBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: themeColors.action,
      paddingHorizontal: isSmallMobile ? 10 : 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    navSignInText: {
      fontSize: isSmallMobile ? 11 : 12,
      fontWeight: '700',
      color: themeColors.adapt('#0B130E', themeColors.actionText),
      letterSpacing: 0.2,
    },
    mobileNavWrapper: {
      marginTop: 8,
      paddingBottom: 2,
    },
    mobileNavContent: {
      gap: 8,
      paddingVertical: 2,
      paddingHorizontal: isSmallMobile ? 4 : 8,
    },
    mobilePill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 9999,
      backgroundColor: themeColors.adapt('rgba(255, 255, 255, 0.05)', themeColors.surfaceLight),
      borderWidth: 1,
      borderColor: themeColors.adapt('rgba(255, 255, 255, 0.08)', themeColors.border),
    },
    mobilePillActive: {
      backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.2)', themeColors.primaryGlow),
      borderColor: themeColors.adapt('#34D399', themeColors.borderActive),
    },
    mobilePillText: {
      fontSize: 13,
      color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
      fontWeight: '600',
    },
    mobilePillTextActive: {
      color: themeColors.adapt('#34D399', themeColors.primaryLight),
      fontWeight: '700',
    },
  });
