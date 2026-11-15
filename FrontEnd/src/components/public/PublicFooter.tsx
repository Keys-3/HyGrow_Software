import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Sprout, ShieldCheck, HeartHandshake, Zap, ArrowRight, ExternalLink } from 'lucide-react-native';
import { PressableScale } from '../PressableScale';
import { useThemeColors } from '../../theme/theme';

export function PublicFooter() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
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
              <Text style={styles.liveSystemPillText}>SYS 2.1 ONLINE · ALL SENSORY BUSES OPERATIONAL</Text>
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
                onPress={() => router.push('/(tabs)/market')}
                activeScale={0.96}
              >
                <Text style={styles.ctaBtnPrimaryText}>Browse Market</Text>
                <ArrowRight size={13} color={themeColors.actionText} />
              </PressableScale>
              <PressableScale
                style={styles.ctaBtnSecondary}
                onPress={() => router.push('/(auth)')}
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
            <PressableScale onPress={() => router.push('/products' as any)} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>ESP32-S3 Smart Controller</Text>
            </PressableScale>
            <PressableScale onPress={() => router.push('/products' as any)} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>NFT Vertical Gullies</Text>
            </PressableScale>
            <PressableScale onPress={() => router.push('/products' as any)} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Automated Dosing Station</Text>
            </PressableScale>
            <PressableScale onPress={() => router.push('/products' as any)} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Foliar Vision Scanner</Text>
            </PressableScale>
            <PressableScale onPress={() => router.push('/products' as any)} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Technical Spec Sheet</Text>
            </PressableScale>
          </View>

          {/* Column 2: Ecosystem */}
          <View style={styles.column}>
            <Text style={styles.columnHeading}>ECOSYSTEM</Text>
            <PressableScale onPress={() => router.push('/(tabs)/market')} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Hyperlocal Produce Exchange</Text>
            </PressableScale>
            <PressableScale onPress={() => router.push('/(tabs)/orders')} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Order Tracking & Proof</Text>
            </PressableScale>
            <PressableScale onPress={() => router.push('/(tabs)/inventory')} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Farmer Inventory Hub</Text>
            </PressableScale>
            <PressableScale onPress={() => router.push('/(tabs)/analytics')} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Historical Analytics</Text>
            </PressableScale>
            <PressableScale onPress={() => router.push('/customization' as any)} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Theme & UI Customization</Text>
            </PressableScale>
          </View>

          {/* Column 3: Resources */}
          <View style={styles.column}>
            <Text style={styles.columnHeading}>RESOURCES & BLOG</Text>
            <PressableScale onPress={() => router.push('/blogs' as any)} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Agronomy & VPD Research</Text>
            </PressableScale>
            <PressableScale onPress={() => router.push('/blogs' as any)} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Nutrient Equilibrium Math</Text>
            </PressableScale>
            <PressableScale onPress={() => router.push('/blogs' as any)} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Edge AI Pathogen Detection</Text>
            </PressableScale>
            <PressableScale onPress={() => router.push('/faq' as any)} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Hardware & Dosing FAQ</Text>
            </PressableScale>
            <PressableScale onPress={() => router.push('/faq' as any)} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Marketplace & Payout FAQ</Text>
            </PressableScale>
          </View>

          {/* Column 4: Company & Inquiries */}
          <View style={styles.column}>
            <Text style={styles.columnHeading}>DIRECT INQUIRY</Text>
            <PressableScale onPress={() => router.push('/contact' as any)} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Contact Engineering & Sales</Text>
            </PressableScale>
            <PressableScale onPress={() => router.push('/contact' as any)} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Commercial Polyhouse Pilots</Text>
            </PressableScale>
            <PressableScale onPress={() => router.push('/contact' as any)} style={styles.columnLink}>
              <Text style={styles.columnLinkText}>Agronomy Consultation</Text>
            </PressableScale>
            <View style={styles.trustBadgeWrap}>
              <ShieldCheck size={14} color={themeColors.success} />
              <Text style={styles.trustBadgeText}>Razorpay & UPI 256-Bit SSL</Text>
            </View>
            <View style={styles.trustBadgeWrap}>
              <HeartHandshake size={14} color={themeColors.secondaryDark} />
              <Text style={styles.trustBadgeText}>Zero Pesticide Guarantee</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bottom Legal & Copyright Bar */}
        <View style={styles.bottomRow}>
          <Text style={styles.copyrightText}>
            © {currentYear} HYGROW Systems Inc. All rights reserved. Crafted for sustainable closed-loop agriculture.
          </Text>

          <View style={styles.bottomLinks}>
            <PressableScale onPress={() => router.push('/products' as any)}>
              <Text style={styles.bottomLinkText}>Products</Text>
            </PressableScale>
            <Text style={styles.dot}>•</Text>
            <PressableScale onPress={() => router.push('/blogs' as any)}>
              <Text style={styles.bottomLinkText}>Research Blog</Text>
            </PressableScale>
            <Text style={styles.dot}>•</Text>
            <PressableScale onPress={() => router.push('/faq' as any)}>
              <Text style={styles.bottomLinkText}>FAQ</Text>
            </PressableScale>
            <Text style={styles.dot}>•</Text>
            <PressableScale onPress={() => router.push('/contact' as any)}>
              <Text style={styles.bottomLinkText}>Contact</Text>
            </PressableScale>
            <Text style={styles.dot}>•</Text>
            <PressableScale onPress={() => router.push('/(tabs)/market')}>
              <Text style={styles.bottomLinkText}>Marketplace</Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </View>
  );
}

const createStyles = (themeColors: any) => StyleSheet.create({
  footer: {
    backgroundColor: themeColors.adapt('#050D08', themeColors.surfaceMuted),
    borderTopWidth: 1,
    borderTopColor: themeColors.adapt('rgba(52, 211, 153, 0.18)', themeColors.border),
    paddingVertical: 48,
    paddingHorizontal: 24,
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
    gap: 32,
    marginBottom: 36,
  },
  brandBlock: {
    flex: 1,
    minWidth: 280,
    maxWidth: 520,
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
    fontSize: 13,
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
    fontSize: 10,
    fontWeight: '800',
    color: themeColors.adapt('#34D399', themeColors.primaryLight),
    letterSpacing: 0.6,
  },
  ctaMiniCard: {
    backgroundColor: themeColors.adapt('#0C1B12', themeColors.surface),
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(52, 211, 153, 0.2)', themeColors.border),
    borderRadius: 16,
    padding: 20,
    minWidth: 280,
    maxWidth: 420,
    flex: 1,
  },
  ctaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    marginBottom: 6,
  },
  ctaSub: {
    fontSize: 12,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    lineHeight: 18,
    marginBottom: 16,
  },
  ctaButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    marginVertical: 28,
  },
  columnsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 24,
  },
  column: {
    flex: 1,
    minWidth: 160,
  },
  columnHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: themeColors.adapt('#34D399', themeColors.primaryLight),
    letterSpacing: 1,
    marginBottom: 14,
  },
  columnLink: {
    paddingVertical: 6,
  },
  columnLinkText: {
    fontSize: 13,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    fontWeight: '500',
  },
  trustBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  trustBadgeText: {
    fontSize: 11,
    color: themeColors.primaryLight,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    paddingTop: 8,
  },
  copyrightText: {
    fontSize: 12,
    color: themeColors.adapt('#6B7E72', themeColors.textMuted),
  },
  bottomLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  bottomLinkText: {
    fontSize: 12,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    fontWeight: '500',
  },
  dot: {
    color: '#3D4D43',
    fontSize: 12,
  },
});
