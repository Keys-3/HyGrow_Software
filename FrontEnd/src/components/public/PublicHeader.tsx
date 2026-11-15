import React from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Sprout, ShoppingBag, ArrowRight } from 'lucide-react-native';
import { PressableScale } from '../PressableScale';
import useAuth from '../../hooks/useAuth';

interface PublicHeaderProps {
  activeRoute?: 'home' | 'products' | 'blogs' | 'faq' | 'contact';
}

export function PublicHeader({ activeRoute = 'home' }: PublicHeaderProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const navLinks = [
    { key: 'home', label: 'Home', path: '/home' },
    { key: 'products', label: 'Technology & Products', path: '/products' },
    { key: 'blogs', label: 'Research & Blog', path: '/blogs' },
    { key: 'faq', label: 'FAQ', path: '/faq' },
    { key: 'contact', label: 'Contact', path: '/contact' },
  ];

  return (
    <View style={styles.headerContainer}>
      <View style={styles.mainRow}>
        {/* Brand / Logo */}
        <PressableScale
          style={styles.brandRow}
          onPress={() => router.push('/home')}
          activeScale={0.97}
        >
          <View style={styles.brandLogoWrap}>
            <Sprout size={18} color="#10B981" />
          </View>
          <Text style={styles.brandTitle}>HYGROW</Text>
          <View style={styles.systemStatusPill}>
            <View style={styles.systemStatusDot} />
            <Text style={styles.systemStatusText}>SYS 2.1 ONLINE</Text>
          </View>
        </PressableScale>

        {/* Desktop Navigation Links */}
        <View style={styles.desktopNav}>
          {navLinks.map((link) => {
            const isActive = activeRoute === link.key;
            return (
              <PressableScale
                key={link.key}
                onPress={() => router.push(link.path as any)}
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

        {/* Action Buttons */}
        <View style={styles.navActions}>
          <PressableScale
            onPress={() => router.push('/(tabs)/market')}
            style={styles.navLinkMarket}
            activeScale={0.96}
          >
            <ShoppingBag size={14} color="#9CB0A2" />
            <Text style={styles.navLinkMarketText}>Marketplace</Text>
          </PressableScale>

          <PressableScale
            onPress={() => {
              if (isAuthenticated) {
                router.push(user?.role === 'customer' ? '/(tabs)/market' : '/(tabs)/dashboard');
              } else {
                router.push('/(auth)');
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
                : 'Grower Console'}
            </Text>
            <ArrowRight size={13} color="#FFFFFF" />
          </PressableScale>
        </View>
      </View>

      {/* Mobile Horizontal Subnav Scroll for Small Screens */}
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
                onPress={() => router.push(link.path as any)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: 'rgba(8, 18, 13, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(52, 211, 153, 0.15)',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 24,
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
    gap: 10,
  },
  brandLogoWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F8FAF8',
    letterSpacing: 2,
  },
  systemStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  systemStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  systemStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.6,
  },
  desktopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Platform.select({
      web: {
        display: 'flex',
      },
      default: {
        display: 'none',
      },
    }),
  },
  navItem: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  navItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CB0A2',
    letterSpacing: 0.2,
  },
  navItemTextActive: {
    color: '#34D399',
    fontWeight: '700',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navLinkMarket: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  navLinkMarketText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CB0A2',
  },
  navSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navSignInText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B130E',
    letterSpacing: 0.2,
  },
  mobileNavWrapper: {
    marginTop: 10,
    ...Platform.select({
      web: {
        display: 'none',
      },
      default: {
        display: 'flex',
      },
    }),
  },
  mobileNavContent: {
    gap: 8,
    paddingVertical: 4,
  },
  mobilePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  mobilePillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#34D399',
  },
  mobilePillText: {
    fontSize: 12,
    color: '#9CB0A2',
    fontWeight: '600',
  },
  mobilePillTextActive: {
    color: '#34D399',
    fontWeight: '700',
  },
});

