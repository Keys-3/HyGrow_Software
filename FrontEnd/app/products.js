import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Platform, useWindowDimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Cpu,
  Droplets,
  Layers,
  FlaskConical,
  Bot,
  Zap,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Radio,
  Sliders,
  Sparkles,
} from 'lucide-react-native';
import { PublicHeader } from '../src/components/public/PublicHeader';
import { PublicFooter } from '../src/components/public/PublicFooter';
import { PressableScale } from '../src/components/PressableScale';
import { useThemeColors } from '../src/theme/theme';

export default function ProductsScreen() {
  const router = useRouter();
  const { width: viewportWidth } = useWindowDimensions();
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors, viewportWidth);
  const [selectedTier, setSelectedTier] = useState('commercial');

  const products = [
    {
      id: 'controller-s3',
      name: 'HYGROW S3 Core Hub',
      tagline: 'Autonomous IoT Telemetry & Actuation Gateway',
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
      badge: 'FLAGSHIP HARDWARE',
      desc: 'Powered by an ESP32-S3 dual-core SoC running real-time RTOS tasks. Features galvanically isolated analog inputs for industrial pH and EC probes, 8-channel solid-state relay actuation, and automated failover to local ring buffers during internet outages.',
      specs: [
        'Dual-Core Tensilica Xtensa @ 240MHz',
        'Galvanically isolated pH/EC sensor inputs',
        '8x 10A Solid-State Actuator Relays',
        'Wi-Fi 6 (802.11ax) + Bluetooth 5 (LE) Mesh',
        'Local SQLite & Ring-Buffer Telemetry Cache',
      ],
    },
    {
      id: 'nft-gullies',
      name: 'HydroLoop NFT Vertical Gullies',
      tagline: 'High-Density Closed-Loop Cultivation Racks',
      image: 'https://images.unsplash.com/photo-1595858273617-e4318ee47683?w=800&q=80',
      badge: 'CULTIVATION SYSTEM',
      desc: 'Precision extruded food-grade, UV-stabilized UPVC channels engineered with micro-ribbed root beds. Optimizes boundary-layer oxygenation while maintaining laminar nutrient film flow without stagnant zones or root rot.',
      specs: [
        'UV-Stabilized Food-Grade UPVC (NSF/ANSI 61)',
        '30% Higher root oxygenation via ribbed floor',
        'Pre-drilled 50mm net-pot apertures @ 20cm pitch',
        'Integrated quick-disconnect siphon drain valves',
        'Modular expandable rack architecture',
      ],
    },
    {
      id: 'dosing-station',
      name: 'AutoDose Pro Dosing Manifold',
      tagline: 'Sub-Milliliter Precision Nutrient & pH Balancing',
      image: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=800&q=80',
      badge: 'PRECISION DOSING',
      desc: 'Four-channel industrial peristaltic pump station calibrated for micro-liter dosing. Dynamically meters pH Up, pH Down, and concentrated A/B nutrient stock solutions based on continuous PID feedback loops.',
      specs: [
        '4x Industrial Stepper Peristaltic Pumps',
        '0.1 mL/sec micro-dosing resolution',
        'Chemical-resistant Santoprene tubing',
        'PID closed-loop feedback correction',
        'Automatic low-level reservoir alert sensors',
      ],
    },
    {
      id: 'vision-ai',
      name: 'Quantum Foliar Diagnostics Vision',
      tagline: 'Edge Computer Vision & Disease Prevention Engine',
      image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80',
      badge: 'AI NEURAL MODULE',
      desc: 'Trained on over 250,000 multi-spectral crop leaf images. Detects fungal blights, viral mottling, nutrient chlorosis, and insect stress up to 48 hours before macroscopic visual symptoms appear on crop foliage.',
      specs: [
        '98.4% Classification Accuracy on 40+ Crop Diseases',
        'Multi-spectral foliar index evaluation',
        'Instant chemical-free treatment prescriptions',
        'Real-time yield and maturity estimation',
        'Direct integration with Grower Mobile App',
      ],
    },
  ];

  const tiers = [
    {
      id: 'micro',
      name: 'Micro Grower',
      tag: 'Urban Balconies & R&D',
      price: '₹14,999',
      features: [
        '1x HYGROW S3 Controller',
        '3-Tier NFT Gully Rack (36 plant sites)',
        'Basic pH & EC analog probes',
        'Cloud telemetry & mobile dashboard',
        'Marketplace grower listing access',
      ],
    },
    {
      id: 'commercial',
      name: 'Commercial Polyhouse',
      tag: 'RECOMMENDED · Scalable Farms',
      price: '₹48,999',
      popular: true,
      features: [
        '2x HYGROW S3 Dual-Bus Controllers',
        'AutoDose 4-Channel Peristaltic Station',
        '10-Tier High-Density Rack (240 sites)',
        'Foliar AI Disease Diagnostics (Unlimited)',
        'Priority Buyer Marketplace Placement',
        'Razorpay Instant Automated Payouts',
      ],
    },
    {
      id: 'enterprise',
      name: 'Industrial Agro-Park',
      tag: 'Custom Acreage Deployments',
      price: 'Custom Quote',
      features: [
        'Multi-facility central SCADA gateway',
        'Redundant industrial sensor arrays',
        'Automated climate & shade curtain integration',
        'Dedicated agronomist consultation & SLA',
        'Custom ERP & API data ingestion',
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, title: 'Products & Technology | HyGrow' }} />
      <PublicHeader activeRoute="products" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={themeColors.isDarkMode
              ? themeColors.globalBackground
              : [themeColors.secondary, themeColors.secondaryLight]}
            style={styles.heroGradient}
          >
            <View style={styles.heroBadge}>
              <Sparkles size={12} color={themeColors.primary} />
              <Text style={styles.heroBadgeText}>PRECISION NATURE-TECH HARDWARE & SOFTWARE</Text>
            </View>
            <Text style={styles.heroTitle}>
              Engineered for <Text style={styles.heroTitleAccent}>Perpetual Harvests</Text>
            </Text>
            <Text style={styles.heroSub}>
              Explore our complete suite of industrial IoT controllers, closed-loop NFT gullies, automated micro-dosing stations, and neural foliar diagnostic vision.
            </Text>
          </LinearGradient>
        </View>

        {/* Product Showcase Cards */}
        <View style={styles.productsGrid}>
          {products.map((p, idx) => (
            <View key={p.id} style={styles.productCard}>
              <View style={styles.imageWrap}>
                <Image source={{ uri: p.image }} style={styles.productImage} resizeMode="cover" />
                <LinearGradient
                  colors={['transparent', themeColors.overlay]}
                  style={styles.imageOverlay}
                />
                <View style={styles.productBadgeWrap}>
                  <Text style={styles.productBadgeText}>{p.badge}</Text>
                </View>
              </View>

              <LinearGradient
                colors={themeColors.isDarkMode
                  ? ['#0C1B12', '#0C1B12']
                  : ['rgba(156, 175, 136, 0.24)', 'rgba(247, 245, 239, 0.82)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.productBody}
              >
                <Text style={styles.productName}>{p.name}</Text>
                <Text style={styles.productTagline}>{p.tagline}</Text>
                <Text style={styles.productDesc}>{p.desc}</Text>

                <View style={styles.specsContainer}>
                  <Text style={styles.specsHeading}>TECHNICAL SPECIFICATIONS</Text>
                  {p.specs.map((spec, sIdx) => (
                    <View key={sIdx} style={styles.specItem}>
                      <CheckCircle2 size={13} color={themeColors.primary} />
                      <Text style={styles.specText}>{spec}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.cardActions}>
                  <PressableScale
                    style={styles.inquireBtn}
                    onPress={() => router.push('/contact')}
                    activeScale={0.96}
                  >
                    <Text style={styles.inquireBtnText}>Request Deployment Spec</Text>
                    <ArrowRight size={14} color={themeColors.adapt('#0B130E', themeColors.actionText)} />
                  </PressableScale>
                </View>
              </LinearGradient>
            </View>
          ))}
        </View>

        {/* Deployment Tiers Section */}
        <View style={styles.tiersSection}>
          <View style={styles.tiersHeader}>
            <View style={styles.heroBadge}>
              <Layers size={12} color={themeColors.primary} />
              <Text style={styles.heroBadgeText}>SCALABLE FARM PACKAGES</Text>
            </View>
            <Text style={styles.tiersTitle}>Deployment Configurations</Text>
            <Text style={styles.tiersSub}>
              From residential pilot systems to multi-acre commercial polyhouses, configure the right package for your crop volume.
            </Text>
          </View>

          <View style={styles.tiersGrid}>
            {tiers.map((tier) => (
              <View
                key={tier.id}
                style={[
                  styles.tierCard,
                  tier.popular && styles.tierCardPopular,
                  selectedTier === tier.id && styles.tierCardActive,
                ]}
              >
                {tier.popular && (
                  <View style={styles.popularRibbon}>
                    <Text style={styles.popularRibbonText}>MOST POPULAR</Text>
                  </View>
                )}
                <Text style={styles.tierName}>{tier.name}</Text>
                <Text style={styles.tierTag}>{tier.tag}</Text>
                <Text style={styles.tierPrice}>{tier.price}</Text>

                <View style={styles.tierDivider} />

                <View style={styles.tierFeaturesList}>
                  {tier.features.map((feat, fIdx) => (
                    <View key={fIdx} style={styles.tierFeatureItem}>
                      <CheckCircle2 size={14} color={themeColors.primary} />
                      <Text style={styles.tierFeatureText}>{feat}</Text>
                    </View>
                  ))}
                </View>

                <PressableScale
                  style={[styles.tierBtn, tier.popular ? styles.tierBtnPopular : styles.tierBtnNormal]}
                  onPress={() => router.push('/contact')}
                  activeScale={0.96}
                >
                  <Text
                    style={[
                      styles.tierBtnText,
                      tier.popular ? styles.tierBtnTextPopular : styles.tierBtnTextNormal,
                    ]}
                  >
                    Order Deployment Kit
                  </Text>
                </PressableScale>
              </View>
            ))}
          </View>
        </View>

        <PublicFooter />
      </ScrollView>
    </View>
  );
}

const createStyles = (themeColors, viewportWidth) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.adapt('#07100B', themeColors.background),
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroSection: {
    paddingVertical: 56,
    paddingHorizontal: 24,
    alignItems: 'center',
    textAlign: 'center',
  },
  heroGradient: {
    maxWidth: 900,
    width: '100%',
    alignItems: 'center',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(52, 211, 153, 0.2)', themeColors.border),
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.12)', themeColors.primaryGlow),
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(16, 185, 129, 0.25)', themeColors.border),
    marginBottom: 16,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: themeColors.adapt('#34D399', themeColors.primaryDark),
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 14,
  },
  heroTitleAccent: {
    color: themeColors.adapt('#34D399', themeColors.primaryDark),
  },
  heroSub: {
    fontSize: 15,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 720,
  },
  productsGrid: {
    maxWidth: 1320,
    marginHorizontal: 'auto',
    width: '100%',
    paddingHorizontal: 24,
    gap: 32,
    marginBottom: 64,
  },
  productCard: {
    backgroundColor: themeColors.adapt('#0C1B12', themeColors.surface),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(52, 211, 153, 0.22)', themeColors.border),
    overflow: 'hidden',
    ...Platform.select({
      web: {
        display: 'grid',
        gridTemplateColumns: viewportWidth > 980 ? 'minmax(320px, 460px) minmax(0, 1fr)' : 'minmax(0, 1fr)',
        boxShadow: themeColors.adapt('0 10px 30px rgba(0, 0, 0, 0.3)', '0 12px 28px rgba(10, 77, 60, 0.1)'),
      },
    }),
  },
  imageWrap: {
    height: 320,
    position: 'relative',
    backgroundColor: themeColors.adapt('#050D08', themeColors.surfaceMuted),
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  productBadgeWrap: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.25)', 'rgba(247, 245, 239, 0.96)'),
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(52, 211, 153, 0.4)', themeColors.secondaryDark),
  },
  productBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: themeColors.adapt(themeColors.primaryLight, themeColors.primaryDark),
    letterSpacing: 0.6,
  },
  productBody: {
    padding: 28,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 24,
    fontWeight: '800',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    marginBottom: 4,
  },
  productTagline: {
    fontSize: 14,
    color: themeColors.adapt('#34D399', themeColors.primaryDark),
    fontWeight: '600',
    marginBottom: 12,
  },
  productDesc: {
    fontSize: 13,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    lineHeight: 20,
    marginBottom: 20,
  },
  specsContainer: {
    backgroundColor: themeColors.adapt('rgba(5, 15, 10, 0.5)', 'rgba(156, 175, 136, 0.3)'),
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(52, 211, 153, 0.12)', 'rgba(105, 123, 91, 0.3)'),
    marginBottom: 20,
  },
  specsHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: themeColors.adapt('#6EE7B7', themeColors.primaryDark),
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  specText: {
    fontSize: 12,
    color: themeColors.primaryLight,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
  },
  inquireBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: themeColors.action,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  inquireBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.adapt('#0B130E', themeColors.actionText),
  },
  tiersSection: {
    backgroundColor: themeColors.adapt('#060E09', themeColors.surfaceMuted),
    paddingVertical: 56,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(52, 211, 153, 0.15)',
  },
  tiersHeader: {
    maxWidth: 800,
    marginHorizontal: 'auto',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 40,
  },
  tiersTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    marginBottom: 10,
  },
  tiersSub: {
    fontSize: 14,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    textAlign: 'center',
    lineHeight: 22,
  },
  tiersGrid: {
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'center',
  },
  tierCard: {
    backgroundColor: themeColors.adapt('#0C1B12', themeColors.surfaceMuted),
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.18)',
    padding: 24,
    flex: 1,
    minWidth: 280,
    maxWidth: 380,
    position: 'relative',
  },
  tierCardPopular: {
    borderColor: themeColors.adapt('#10B981', themeColors.borderActive),
    backgroundColor: themeColors.adapt('#0F2318', themeColors.secondaryLight),
    ...Platform.select({
      web: {
        boxShadow: '0 8px 30px rgba(16, 185, 129, 0.2)',
      },
    }),
  },
  tierCardActive: {},
  popularRibbon: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: themeColors.action,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  popularRibbonText: {
    fontSize: 10,
    fontWeight: '900',
    color: themeColors.adapt('#0B130E', themeColors.actionText),
    letterSpacing: 0.8,
  },
  tierName: {
    fontSize: 20,
    fontWeight: '800',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    marginBottom: 4,
  },
  tierTag: {
    fontSize: 12,
    color: themeColors.adapt('#34D399', themeColors.primaryDark),
    fontWeight: '600',
    marginBottom: 16,
  },
  tierPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    letterSpacing: -0.5,
  },
  tierDivider: {
    height: 1,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    marginVertical: 18,
  },
  tierFeaturesList: {
    gap: 12,
    marginBottom: 24,
  },
  tierFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tierFeatureText: {
    fontSize: 13,
    color: '#D1D5DB',
    lineHeight: 18,
  },
  tierBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  tierBtnPopular: {
    backgroundColor: themeColors.action,
  },
  tierBtnNormal: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  tierBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tierBtnTextPopular: {
    color: themeColors.adapt('#0B130E', themeColors.actionText),
  },
  tierBtnTextNormal: {
    color: themeColors.textSecondary,
  },
});

