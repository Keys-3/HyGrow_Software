import { getAuthHeaders } from '../src/services/authHeaders';
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  ImageBackground,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Droplets,
  Sprout,
  Activity,
  Award,
  Radio,
  ShoppingBag,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Cpu,
  ShieldCheck,
  Zap,
} from 'lucide-react-native';
import { getBackendUrl } from '../src/utils/apiConfig';
import { PressableScale } from '../src/components/PressableScale';
import { GlassCard } from '../src/components/GlassCard';
import { useThemeColors, typography, borderRadius, spacing, shadows } from '../src/theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BACKGROUND_IMAGES = [
  require('../assets/images/slide1.jpg'),
  require('../assets/images/slide2.jpg'),
  require('../assets/images/slide3.jpg'),
];

export default function HomeScreen() {
  const router = useRouter();
  const carouselRef = useRef(null);
  const themeColors = useThemeColors();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);

  const handleNextSlide = () => {
    const nextSlide = (activeSlide + 1) % BACKGROUND_IMAGES.length;
    carouselRef.current?.scrollTo({ x: nextSlide * SCREEN_WIDTH, animated: true });
    setActiveSlide(nextSlide);
  };

  const handlePrevSlide = () => {
    const prevSlide = activeSlide === 0 ? BACKGROUND_IMAGES.length - 1 : activeSlide - 1;
    carouselRef.current?.scrollTo({ x: prevSlide * SCREEN_WIDTH, animated: true });
    setActiveSlide(prevSlide);
  };

  const handleMomentumScrollEnd = (event) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveSlide(slide);
  };

  const handleSendFeedback = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert('Required Fields', 'Please fill in your name, email, and message before submitting.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsSending(true);
    try {
      const url = `${getBackendUrl()}/api/email/send`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({
          to: 'prithvis3804@gmail.com',
          subject: `Feedback from ${name}`,
          text: `From: ${name} (${email})\n\nFeedback:\n${message}`,
          replyTo: email,
        }),
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      setSuccessMessage('Thank you! Your feedback has been received.');
      setName('');
      setEmail('');
      setMessage('');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error sending feedback:', error);
      Alert.alert('Submission Error', 'Failed to send feedback. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* HERO SECTION */}
        <ImageBackground source={BACKGROUND_IMAGES[0]} style={styles.heroSection} imageStyle={styles.heroBgImage}>
          <LinearGradient
            colors={['rgba(9, 13, 22, 0.65)', 'rgba(9, 13, 22, 0.96)']}
            style={styles.heroOverlay}
          >
            {/* Embedded Header Navbar */}
            <View style={styles.headerContent}>
              <View style={styles.logoRow}>
                <View style={styles.logoIconGlow}>
                  <Sprout size={20} color="#10B981" />
                </View>
                <Text style={styles.logo}>HYGROW</Text>
              </View>

              <View style={styles.navLinks}>
                <PressableScale onPress={() => router.push('/(tabs)/market')} style={styles.navItem}>
                  <Text style={styles.navText}>Marketplace</Text>
                </PressableScale>
                <PressableScale onPress={() => router.push('/(auth)')} style={styles.navBtn}>
                  <Text style={styles.navBtnText}>Sign In</Text>
                  <ArrowRight size={14} color="#090D16" />
                </PressableScale>
              </View>
            </View>

            {/* Hero Main Content */}
            <View style={styles.heroContent}>
              <View style={styles.badgeWrap}>
                <Sparkles size={14} color="#10B981" />
                <Text style={styles.badgeText}>Next-Gen Precision Hydroponics</Text>
              </View>

              <Text style={styles.heroTitle}>
                Autonomous Farming.{'\n'}
                <Text style={styles.heroTitleAccent}>Pure Yield.</Text>
              </Text>

              <Text style={styles.heroSubtitle}>
                Empowering cultivators with real-time IoT sensory telemetry and AI crop intelligence, while connecting local communities directly to peak-freshness produce.
              </Text>

              <View style={styles.heroActions}>
                <PressableScale
                  style={styles.primaryBtn}
                  onPress={() => router.push('/(tabs)/market')}
                  activeScale={0.96}
                >
                  <Text style={styles.primaryBtnText}>Explore Marketplace</Text>
                  <ShoppingBag size={18} color="#090D16" />
                </PressableScale>

                <PressableScale
                  style={styles.secondaryBtn}
                  onPress={() => router.push('/(auth)')}
                  activeScale={0.96}
                >
                  <Text style={styles.secondaryBtnText}>Farmer Console</Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </PressableScale>
              </View>
            </View>

            {/* Metric Badges Banner */}
            <View style={styles.metricsContainer}>
              {[
                { val: '300%', label: 'Accelerated Growth', icon: TrendingUp },
                { val: '95%', label: 'Water Conserved', icon: Droplets },
                { val: '0 ppm', label: 'Zero Pesticides', icon: ShieldCheck },
                { val: '24/7', label: 'Autonomous IoT', icon: Cpu },
              ].map((m, i) => {
                const IconComponent = m.icon;
                return (
                  <View key={i} style={styles.metricBadge}>
                    <View style={styles.metricIconWrap}>
                      <IconComponent size={16} color="#10B981" />
                    </View>
                    <Text style={styles.metricVal}>{m.val}</Text>
                    <Text style={styles.metricLabel}>{m.label}</Text>
                  </View>
                );
              })}
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* WHY CHOOSE SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.pillTag}>
              <Text style={styles.pillTagText}>ENGINEERED FOR EFFICIENCY</Text>
            </View>
            <Text style={styles.sectionTitle}>Why Choose HYGROW?</Text>
            <Text style={styles.sectionSubtitle}>
              Our closed-loop hydroponic systems combine biological science with IoT precision to achieve unprecedented resource savings and crop vibrancy.
            </Text>
          </View>

          <View style={styles.gridContainer}>
            {[
              {
                icon: Droplets,
                title: '95% Water Recirculation',
                desc: 'Continuous cyclical nutrient looping uses a fraction of conventional irrigation, minimizing environmental footprint.',
                color: '#06B6D4',
              },
              {
                icon: Zap,
                title: 'Micro-Nutrient Precision',
                desc: 'Sub-millisiemens EC and pH dosing calibrated in real time for optimal vegetative growth and maximum nutrient density.',
                color: '#10B981',
              },
              {
                icon: Activity,
                title: 'Ambient IoT Telemetry',
                desc: 'Continuous tracking of humidity, vapor pressure deficit (VPD), water temp, lux, and water levels via cloud sync.',
                color: '#3B82F6',
              },
              {
                icon: Award,
                title: 'Uncompromised Purity',
                desc: 'Completely pesticide-free, sterile-root-zone crop cultivation delivering crisp, nutrient-rich harvest year-round.',
                color: '#F59E0B',
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <View key={i} style={styles.gridCardWrapper}>
                  <GlassCard style={styles.gridCard} glowColor={item.color}>
                    <View style={[styles.iconCircle, { backgroundColor: item.color + '18' }]}>
                      <Icon size={24} color={item.color} />
                    </View>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardDesc}>{item.desc}</Text>
                  </GlassCard>
                </View>
              );
            })}
          </View>
        </View>

        {/* IOT-POWERED AGRICULTURE SECTION */}
        <View style={styles.darkSection}>
          <View style={styles.sectionHeader}>
            <View style={[styles.pillTag, styles.pillTagDark]}>
              <Text style={[styles.pillTagText, { color: '#10B981' }]}>END-TO-END ECOSYSTEM</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Autonomous Growth Platform</Text>
            <Text style={[styles.sectionSubtitle, { color: '#94A3B8' }]}>
              Bridging precision agricultural hardware with an ultra-fresh direct-to-consumer marketplace.
            </Text>
          </View>

          <View style={styles.cardsRow}>
            {[
              {
                icon: Radio,
                tag: 'TELEMETRY',
                title: 'Smart Sensor Grid',
                desc: 'ESP32 multi-sensor array streams live telemetry directly to Firestore & local LAN bridges with sub-second alert triggers.',
                color: '#10B981',
              },
              {
                icon: ShoppingBag,
                tag: 'COMMERCE',
                title: 'Direct Marketplace',
                desc: 'List harvests instantly for local buyers. Zero intermediary markups, transparent origin tracking, and maximum freshness.',
                color: '#06B6D4',
              },
              {
                icon: TrendingUp,
                tag: 'INTELLIGENCE',
                title: 'AI Crop Diagnostics',
                desc: 'Hugging Face neural models detect foliar diseases, forecast harvest timing, and compute optimal actuator adjustments.',
                color: '#8B5CF6',
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <View key={i} style={styles.largeCardWrapper}>
                  <GlassCard style={styles.largeCard} glowColor={item.color}>
                    <View style={styles.largeCardHeader}>
                      <View style={[styles.largeIconCircle, { backgroundColor: item.color + '1A' }]}>
                        <Icon size={28} color={item.color} />
                      </View>
                      <View style={[styles.cardTag, { borderColor: item.color + '40' }]}>
                        <Text style={[styles.cardTagText, { color: item.color }]}>{item.tag}</Text>
                      </View>
                    </View>
                    <Text style={styles.largeCardTitle}>{item.title}</Text>
                    <Text style={styles.largeCardDesc}>{item.desc}</Text>
                  </GlassCard>
                </View>
              );
            })}
          </View>
        </View>

        {/* IMAGE CAROUSEL SECTION */}
        <View style={styles.carouselSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.pillTag}>
              <Text style={styles.pillTagText}>LIVE FROM OUR FARMS</Text>
            </View>
            <Text style={styles.sectionTitle}>Inside the Facility</Text>
            <Text style={styles.sectionSubtitle}>
              Glimpse the living canopy, precision dosing manifolds, and pure hydroponic ecosystems.
            </Text>
          </View>

          <View style={styles.carouselContainer}>
            <ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleMomentumScrollEnd}
            >
              {BACKGROUND_IMAGES.map((img, idx) => (
                <View key={idx} style={{ width: SCREEN_WIDTH }}>
                  <View style={styles.carouselImageWrapper}>
                    <ImageBackground source={img} style={styles.carouselImage} imageStyle={styles.carouselImageStyle}>
                      <LinearGradient
                        colors={['transparent', 'rgba(9, 13, 22, 0.7)']}
                        style={styles.carouselOverlay}
                      >
                        <Text style={styles.carouselCaption}>
                          {idx === 0 && 'High-Density NFT Channel Systems'}
                          {idx === 1 && 'Precision Nutrient Reservoir Automation'}
                          {idx === 2 && 'Pesticide-Free High-Vibrancy Leafy Greens'}
                        </Text>
                      </LinearGradient>
                    </ImageBackground>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Carousel Controls */}
            <View style={styles.carouselControls}>
              <PressableScale style={styles.controlBtn} onPress={handlePrevSlide}>
                <ChevronLeft size={20} color="#0F172A" />
              </PressableScale>

              <View style={styles.dotsWrap}>
                {BACKGROUND_IMAGES.map((_, idx) => (
                  <View
                    key={idx}
                    style={[styles.dot, activeSlide === idx && styles.activeDot]}
                  />
                ))}
              </View>

              <PressableScale style={styles.controlBtn} onPress={handleNextSlide}>
                <ChevronRight size={20} color="#0F172A" />
              </PressableScale>
            </View>
          </View>
        </View>

        {/* FEEDBACK SECTION */}
        <View style={styles.feedbackSection}>
          <View style={styles.feedbackCardWrapper}>
            <GlassCard style={styles.feedbackCard}>
              <View style={styles.feedbackHeader}>
                <View style={styles.feedbackBadge}>
                  <Send size={14} color="#10B981" />
                  <Text style={styles.feedbackBadgeText}>DIRECT INQUIRY</Text>
                </View>
                <Text style={styles.feedbackTitle}>Connect With Us</Text>
                <Text style={styles.feedbackDesc}>
                  Have questions about our modular farming racks, produce availability, or IoT software integration? Let us know.
                </Text>
              </View>

              {!!successMessage && (
                <View style={styles.successContainer}>
                  <CheckCircle2 size={18} color="#047857" />
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. John Doe"
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@domain.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Message</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Tell us about your requirements or question..."
                  placeholderTextColor="#94A3B8"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <PressableScale
                style={styles.submitBtn}
                onPress={handleSendFeedback}
                disabled={isSending}
                activeScale={0.97}
              >
                {isSending ? (
                  <ActivityIndicator color="#090D16" />
                ) : (
                  <View style={styles.submitBtnInner}>
                    <Text style={styles.submitBtnText}>Transmit Message</Text>
                    <Send size={16} color="#090D16" />
                  </View>
                )}
              </PressableScale>
            </GlassCard>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.footerBrandRow}>
            <View style={styles.logoRow}>
              <View style={styles.logoIconGlow}>
                <Sprout size={18} color="#10B981" />
              </View>
              <Text style={styles.footerLogo}>HYGROW</Text>
            </View>
            <Text style={styles.footerTagline}>
              Engineering precision hydroponics and ambient agricultural intelligence.
            </Text>
          </View>

          <View style={styles.footerDivider} />

          <View style={styles.footerBottomRow}>
            <Text style={styles.footerCopyright}>
              © {new Date().getFullYear()} HYGROW Systems Inc. All rights reserved.
            </Text>
            <View style={styles.footerLinks}>
              <Pressable onPress={() => router.push('/(tabs)/market')}>
                <Text style={styles.footerLinkText}>Marketplace</Text>
              </Pressable>
              <Text style={styles.footerDot}>•</Text>
              <Pressable onPress={() => router.push('/(auth)')}>
                <Text style={styles.footerLinkText}>Farmer Portal</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  scrollContent: {
    paddingTop: 0,
    backgroundColor: '#F8FAFC',
  },
  heroSection: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#090D16',
  },
  heroBgImage: {
    resizeMode: 'cover',
  },
  heroOverlay: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 0,
    justifyContent: 'flex-start',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 40,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIconGlow: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  navText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    letterSpacing: -0.2,
  },
  navBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  navBtnText: {
    color: '#090D16',
    fontWeight: '700',
    fontSize: 13,
  },
  heroContent: {
    alignItems: 'flex-start',
    maxWidth: 680,
    paddingBottom: 56,
    alignSelf: 'center',
    width: '100%',
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 24,
  },
  badgeText: {
    color: '#10B981',
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  heroTitle: {
    fontSize: SCREEN_WIDTH > 768 ? 58 : 40,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: SCREEN_WIDTH > 768 ? 66 : 46,
    letterSpacing: -1.5,
    marginBottom: 20,
  },
  heroTitleAccent: {
    color: '#10B981',
  },
  heroSubtitle: {
    fontSize: SCREEN_WIDTH > 768 ? 18 : 16,
    color: '#94A3B8',
    lineHeight: 28,
    letterSpacing: -0.2,
    marginBottom: 36,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#090D16',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 12,
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  metricBadge: {
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
    paddingVertical: 8,
  },
  metricIconWrap: {
    marginBottom: 6,
  },
  metricVal: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    paddingVertical: 72,
    paddingHorizontal: 24,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  darkSection: {
    backgroundColor: '#090D16',
    paddingVertical: 80,
    paddingHorizontal: 24,
    width: '100%',
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 48,
    maxWidth: 720,
    alignSelf: 'center',
  },
  pillTag: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 14,
  },
  pillTagDark: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  pillTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: SCREEN_WIDTH > 768 ? 36 : 28,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 25,
    letterSpacing: -0.2,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
  },
  gridCardWrapper: {
    width: SCREEN_WIDTH > 768 ? '48%' : '100%',
  },
  gridCard: {
    padding: 28,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },
  cardsRow: {
    flexDirection: SCREEN_WIDTH > 900 ? 'row' : 'column',
    gap: 20,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  largeCardWrapper: {
    flex: 1,
  },
  largeCard: {
    padding: 28,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  largeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  largeIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTag: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  largeCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  largeCardDesc: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 23,
  },
  carouselSection: {
    paddingVertical: 72,
    paddingHorizontal: 0,
    backgroundColor: '#F8FAFC',
  },
  carouselContainer: {
    position: 'relative',
  },
  carouselImageWrapper: {
    paddingHorizontal: 20,
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
  },
  carouselImage: {
    width: '100%',
    height: 380,
    justifyContent: 'flex-end',
  },
  carouselImageStyle: {
    borderRadius: 24,
  },
  carouselOverlay: {
    padding: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  carouselCaption: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  carouselControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 24,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dotsWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  activeDot: {
    backgroundColor: '#10B981',
    width: 24,
  },
  feedbackSection: {
    paddingVertical: 72,
    paddingHorizontal: 24,
    backgroundColor: '#F1F5F9',
  },
  feedbackCardWrapper: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  feedbackCard: {
    backgroundColor: '#FFFFFF',
    padding: SCREEN_WIDTH > 768 ? 40 : 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  feedbackHeader: {
    marginBottom: 24,
  },
  feedbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  feedbackBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  feedbackTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  feedbackDesc: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 110,
  },
  submitBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#090D16',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successText: {
    color: '#065F46',
    fontWeight: '600',
    fontSize: 13,
    flex: 1,
  },
  footer: {
    backgroundColor: '#090D16',
    paddingVertical: 56,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  footerBrandRow: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    marginBottom: 32,
  },
  footerLogo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  footerTagline: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 10,
    maxWidth: 480,
    lineHeight: 22,
  },
  footerDivider: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 24,
  },
  footerBottomRow: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: SCREEN_WIDTH > 600 ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  footerCopyright: {
    fontSize: 13,
    color: '#64748B',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerLinkText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  footerDot: {
    color: '#475569',
  },
});
