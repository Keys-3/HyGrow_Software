import React from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Sprout, ShieldCheck, HeartHandshake, Zap, ArrowRight, ExternalLink } from 'lucide-react-native';
import { PressableScale } from '../PressableScale';
import { useThemeColors } from '../../theme/theme';
import { useNavigationTransition } from '../transitions/ScreenTransitionProvider';

export function PublicFooter() {
  const navigateWithTransition = useNavigationTransition();
  const themeColors = useThemeColors();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isSmallMobile = width < 480;
  const styles = createStyles(themeColors, isMobile, isSmallMobile);
  const currentYear = new Date().getFullYear();

  return (
    <View style={styles.footer}>
      <View style={styles.footerContainer}>
        {/* Top Brand & Mission Banner */}
        <View style={styles.topRow}>
          <View style={styles.brandBlock}>
            <View style={styles.brandRow}>
              <View style={styles.brandLogoWrap}>
                <Sprout size={18} color={themeColors.primary} />
              </View>
              <Text style={styles.brandTitle}>HYGROW</Text>
            </View>
            <Text style={styles.tagline}>
              Engineering autonomous closed-loop hydroponic systems, ambient IoT sensory meshes, and local produce exchanges.
            </Text>
            <View style={styles.liveSystemPill}>
              <View style={styles.systemStatusDot} />
              <Text style={styles.liveSystemPillText}>SYS 2.1 ONLINE · SENSORS OPERATIONAL</Text>
            </View>
          </View>

          {/* Quick CTA Card */}
          <View style={styles.ctaMiniCard}>
            <Text style={styles.ctaTitle}>Ready to cultivate or procure?</Text>
            <Text style={styles.ctaSub}>
              Deploy precision telemetry in your greenhouse or buy fresh produce directly from verified growers.
            </Text>
            <View style={styles.ctaButtonsRow}>
              <PressableScale
                style={styles.ctaBtnPrimary}
                onPress={() => navigateWithTransition('/(tabs)/market', 'Market', 'section')}
                activeScale={0.96}
              >
                <Text style={styles.ctaBtnPrimaryText}>Browse Market</Text>
                <ArrowRight size={13} color={themeColors.actionText} />
              </PressableScale>
              <PressableScale
                style={styles.ctaBtnSecondary}
                onPress={() => navigateWithTransition('/(auth)', 'Grower Console', 'section')}
                activeScale={0.96}
              >
                <Text style={styles.ctaBtnSecondaryText}>Grower Console</Text>
              </PressableScale>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Footer Navigation Columns Matrix */}
        <View style={styles.columnsGrid}>
          {/* Column 1: Products */}
          <View style={styles.column}>
            <Text style={styles.columnHeading}>PLATFORM & TECH</Text>
            <PressableScale onPress={() => navigateWithTransition('/products', 'Products', 'section')} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>ESP32-S3 Smart Controller</Text>
            </PressableScale>
            <PressableScale onPress={() => navigateWithTransition('/products', 'Products', 'section')} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>NFT Vertical Gullies</Text>
            </PressableScale>
            <PressableScale onPress={() => navigateWithTransition('/products', 'Products', 'section')} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Automated Dosing Station</Text>
            </PressableScale>
            <PressableScale onPress={() => navigateWithTransition('/products', 'Products', 'section')} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Foliar Vision Scanner</Text>
            </PressableScale>
          </View>

          {/* Column 2: Ecosystem */}
          <View style={styles.column}>
            <Text style={styles.columnHeading}>ECOSYSTEM</Text>
            <PressableScale onPress={() => navigateWithTransition('/(tabs)/market', 'Market', 'section')} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Hyperlocal Produce Exchange</Text>
            </PressableScale>
            <PressableScale onPress={() => navigateWithTransition('/(tabs)/orders', 'Orders', 'section')} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Order Tracking & Proof</Text>
            </PressableScale>
            <PressableScale onPress={() => navigateWithTransition('/(tabs)/inventory', 'Inventory', 'section')} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Farmer Inventory Hub</Text>
            </PressableScale>
            <PressableScale onPress={() => navigateWithTransition('/(tabs)/analytics', 'Analytics', 'section')} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Historical Analytics</Text>
            </PressableScale>
          </View>

          {/* Column 3: Resources */}
          <View style={styles.column}>
            <Text style={styles.columnHeading}>KNOWLEDGE & AG</Text>
            <PressableScale onPress={() => navigateWithTransition('/blogs', 'Research', 'section')} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Hydroponic Research Blog</Text>
            </PressableScale>
            <PressableScale onPress={() => navigateWithTransition('/faq', 'FAQ', 'section')} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Frequently Asked Questions</Text>
            </PressableScale>
            <PressableScale onPress={() => navigateWithTransition('/contact', 'Contact', 'section')} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Agronomy Consultation</Text>
            </PressableScale>
            <PressableScale onPress={() => navigateWithTransition('/(tabs)/ai', 'AI Tools', 'section')} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>AI Diagnostics Engine</Text>
            </PressableScale>
          </View>

          {/* Column 4: Trust & Assurance */}
          <View style={styles.column}>
            <Text style={styles.columnHeading}>VERIFICATION</Text>
            <View style={styles.trustBadgeWrap}>
              <ShieldCheck size={14} color={themeColors.primary} />
              <Text style={styles.trustBadgeText}>Zero Pesticide Verified</Text>
            </View>
            <View style={styles.trustBadgeWrap}>
              <Zap size={14} color={themeColors.primary} />
              <Text style={styles.trustBadgeText}>100% Water Recirculation</Text>
            </View>
            <View style={styles.trustBadgeWrap}>
              <HeartHandshake size={14} color={themeColors.primary} />
              <Text style={styles.trustBadgeText}>Direct Farmer Remittance</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bottom Legal & Copyright Bar */}
        <View style={styles.bottomRow}>
          <Text style={styles.copyrightText}>
            © {currentYear} HYGROW Systems Inc. All rights reserved.
          </Text>

          <View style={styles.bottomLinks}>
            <PressableScale onPress={() => navigateWithTransition('/products', 'Products', 'section')}>
              <Text style={styles.bottomLinkText}>Products</Text>
            </PressableScale>
            <Text style={styles.dot}>•</Text>
            <PressableScale onPress={() => navigateWithTransition('/blogs', 'Research', 'section')}>
              <Text style={styles.bottomLinkText}>Research</Text>
            </PressableScale>
            <Text style={styles.dot}>•</Text>
            <PressableScale onPress={() => navigateWithTransition('/faq', 'FAQ', 'section')}>
              <Text style={styles.bottomLinkText}>FAQ</Text>
            </PressableScale>
            <Text style={styles.dot}>•</Text>
            <PressableScale onPress={() => navigateWithTransition('/contact', 'Contact', 'section')}>
              <Text style={styles.bottomLinkText}>Contact</Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </View>
  );
}

const createStyles = (themeColors: any, isMobile: boolean, isSmallMobile: boolean) =>
  StyleSheet.create({
    footer: {
      backgroundColor: themeColors.adapt('#151719', themeColors.surfaceMuted),
      borderTopWidth: 1,
      borderTopColor: themeColors.adapt('rgba(52, 211, 153, 0.18)', themeColors.border),
      paddingTop: isMobile ? 36 : 48,
      paddingBottom: isMobile ? 76 : 48,
      paddingHorizontal: isSmallMobile ? 16 : isMobile ? 20 : 24,
    },
    footerContainer: {
      maxWidth: 1320,
      marginHorizontal: 'auto',
      width: '100%',
    },
    topRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: isMobile ? 20 : 32,
      marginBottom: isMobile ? 24 : 36,
    },
    brandBlock: {
      flex: 1,
      minWidth: isMobile ? '100%' : 280,
      maxWidth: isMobile ? '100%' : 520,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    brandLogoWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.15)', themeColors.primaryGlow),
      borderWidth: 1,
      borderColor: themeColors.adapt('rgba(16, 185, 129, 0.35)', themeColors.borderStrong),
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: themeColors.adapt('#F8FAF8', themeColors.text),
      letterSpacing: 2,
    },
    tagline: {
      fontSize: 14,
      color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
      lineHeight: 20,
      marginBottom: 16,
    },
    liveSystemPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.1)', themeColors.primaryGlow),
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: themeColors.adapt('rgba(16, 185, 129, 0.25)', themeColors.border),
      alignSelf: 'flex-start',
    },
    systemStatusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: themeColors.success,
    },
    liveSystemPillText: {
      fontSize: 12,
      fontWeight: '800',
      color: themeColors.adapt('#34D399', themeColors.primaryLight),
      letterSpacing: 0.6,
    },
    ctaMiniCard: {
      backgroundColor: themeColors.adapt('#191C1E', themeColors.surface),
      borderWidth: 1,
      borderColor: themeColors.adapt('rgba(52, 211, 153, 0.2)', themeColors.border),
      borderRadius: 16,
      padding: isSmallMobile ? 16 : 20,
      minWidth: isMobile ? '100%' : 280,
      maxWidth: isMobile ? '100%' : 420,
      flex: 1,
    },
    ctaTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: themeColors.adapt('#F8FAF8', themeColors.text),
      marginBottom: 6,
    },
    ctaSub: {
      fontSize: 13,
      color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
      lineHeight: 18,
      marginBottom: 16,
    },
    ctaButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    },
    ctaBtnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: themeColors.action,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 8,
    },
    ctaBtnPrimaryText: {
      fontSize: 13,
      fontWeight: '700',
      color: themeColors.adapt('#0B130E', themeColors.actionText),
    },
    ctaBtnSecondary: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.12)',
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    ctaBtnSecondaryText: {
      fontSize: 13,
      fontWeight: '600',
      color: themeColors.textSecondary,
    },
    divider: {
      height: 1,
      backgroundColor: 'rgba(52, 211, 153, 0.12)',
      marginVertical: isMobile ? 20 : 28,
    },
    columnsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: isMobile ? 20 : 24,
    },
    column: {
      width: isSmallMobile ? '100%' : isMobile ? '47%' : 'auto',
      minWidth: isSmallMobile ? '100%' : isMobile ? 140 : 160,
      flex: isMobile ? undefined : 1,
      flexGrow: isMobile ? 0 : 1,
      flexShrink: 0,
      flexBasis: isMobile ? 'auto' : 0,
    },
    columnHeading: {
      fontSize: 12,
      fontWeight: '800',
      color: themeColors.adapt('#34D399', themeColors.primaryLight),
      letterSpacing: 1,
      marginBottom: 12,
    },
    columnLink: {
      paddingVertical: 5,
    },
    columnLinkText: {
      fontSize: 14,
      color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
      fontWeight: '500',
    },
    trustBadgeWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginVertical: 4,
    },
    trustBadgeText: {
      fontSize: 12,
      color: themeColors.primaryLight,
      fontWeight: '600',
    },
    bottomRow: {
      flexDirection: isSmallMobile ? 'column' : 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: isSmallMobile ? 'flex-start' : 'center',
      gap: 12,
      paddingTop: 8,
    },
    copyrightText: {
      fontSize: 13,
      color: themeColors.adapt('#6B7E72', themeColors.textMuted),
    },
    bottomLinks: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    bottomLinkText: {
      fontSize: 13,
      color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
      fontWeight: '500',
    },
    dot: {
      color: '#3D4D43',
      fontSize: 13,
    },
  });
