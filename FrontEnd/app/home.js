import { fetchWithAuth } from '../src/services/authHeaders';
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
  Gauge,
  FlaskConical,
  Thermometer,
  Layers,
  Bot,
  CircleDot,
  Server,
  Lock,
} from 'lucide-react-native';

import { getBackendUrl } from '../src/utils/apiConfig';
import { PressableScale } from '../src/components/PressableScale';
import { GlassCard } from '../src/components/GlassCard';
import { HeroBotanicalVisual } from '../src/components/HeroBotanicalVisual';
import StatusBadge from '../src/components/StatusBadge';
import { useThemeColors, typography, borderRadius, spacing } from '../src/theme/theme';
import useAuth from '../src/hooks/useAuth';
import { PublicHeader } from '../src/components/public/PublicHeader';
import { PublicFooter } from '../src/components/public/PublicFooter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BACKGROUND_IMAGES = [
  require('../assets/images/slide1.jpg'),
  require('../assets/images/slide2.jpg'),
  require('../assets/images/slide3.jpg'),
];

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const carouselRef = useRef(null);
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const heroBackgroundColors = themeColors.isDarkMode
    ? themeColors.globalBackground
    : [themeColors.secondary, themeColors.secondaryLight];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);

  // Interactive Product Architecture Tab
  const [activeProductTab, setActiveProductTab] = useState('telemetry');

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
      const response = await fetchWithAuth(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'prithvis3804@gmail.com',
          subject: `Inquiry from ${name}`,
          text: `From: ${name} (${email})\n\nMessage:\n${message}`,
          replyTo: email,
        }),
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      setSuccessMessage('Your transmission has been logged. Our agronomy team will follow up promptly.');
      setName('');
      setEmail('');
      setMessage('');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error sending feedback:', error);
      Alert.alert('Submission Error', 'Failed to transmit message. Please try again or check connection.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, title: 'HyGrow | Autonomous Nature-Tech SaaS' }} />
      <PublicHeader activeRoute="home" />

      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ========================================================================= */}
        {/* SECTION 1: CINEMATIC HERO SECTION                                         */}
        {/* ========================================================================= */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={heroBackgroundColors}
            style={styles.heroBackgroundGradient}
          >
            {/* Top Atmospheric Ambient Glows */}
            <View style={styles.glowTopCenter} />
            <View style={styles.glowBottomRight} />

            {/* Hero Main Body: Split Desktop Architecture */}
            <View style={styles.heroGrid}>
              {/* Left Column: Headlines & Pitch */}
              <View style={styles.heroLeftCol}>
                <View style={styles.badgeWrap}>
                  <Sparkles size={12} color={themeColors.primary} />
                  <Text style={styles.badgeText}>
                    {isAuthenticated
                      ? `AUTHENTICATED: ${user?.name || user?.email || 'GROWER'} (${(user?.role || 'farmer').toUpperCase()})`
                      : 'FUTURISTIC NATURE-TECH SAAS'}
                  </Text>
                </View>

                <Text style={styles.heroTitle}>
                  The Living System.{'\n'}
                  <Text style={styles.heroTitleAccent}>Autonomous Precision.</Text>
                </Text>

                <Text style={styles.heroSubtitle}>
                  Closed-loop hydroponic intelligence engineered with ESP32 IoT telemetry, sub-millisiemens nutrient balancing, and neural foliar diagnostics. Connecting growers directly to local consumer markets.
                </Text>

                {/* Primary Action Buttons */}
                <View style={styles.heroActions}>
                  <PressableScale
                    style={styles.primaryBtn}
                    onPress={() => router.push('/(tabs)/market')}
                    activeScale={0.96}
                  >
                    <ShoppingBag size={17} color={themeColors.actionText} />
                    <Text style={styles.primaryBtnText}>Explore Marketplace</Text>
                  </PressableScale>

                  <PressableScale
                    style={styles.secondaryBtn}
                    onPress={() => {
                      if (isAuthenticated) {
                        router.push(user?.role === 'customer' ? '/(tabs)/market' : '/(tabs)/dashboard');
                      } else {
                        router.push('/(auth)');
                      }
                    }}
                    activeScale={0.96}
                  >
                    <Text style={styles.secondaryBtnText}>
                      {isAuthenticated ? 'Enter Live Dashboard' : 'Enter Grower Console'}
                    </Text>
                    <ArrowRight size={16} color={themeColors.text} />
                  </PressableScale>
                </View>

                {/* Platform Trust Chips */}
                <View style={styles.trustChipsRow}>
                  <View style={styles.trustChip}>
                    <CheckCircle2 size={12} color={themeColors.primary} />
                    <Text style={styles.trustChipText}>Zero Synthetic Pesticides</Text>
                  </View>
                  <View style={styles.trustChip}>
                    <CheckCircle2 size={12} color={themeColors.primary} />
                    <Text style={styles.trustChipText}>Sub-Second Actuator Latency</Text>
                  </View>
                  <View style={styles.trustChip}>
                    <CheckCircle2 size={12} color={themeColors.primary} />
                    <Text style={styles.trustChipText}>Razorpay & UPI Verified</Text>
                  </View>
                </View>
              </View>

              {/* Right Column: Custom 3D Botanical Vector Composition */}
              <View style={styles.heroRightCol}>
                <HeroBotanicalVisual />
              </View>
            </View>

            {/* Metrics KPI Banner */}
            <View style={styles.metricsContainer}>
              {[
                { val: '95%', label: 'Water Recirculated', sub: 'Cyclical loop recovery', icon: Droplets },
                { val: '300%', label: 'Growth Acceleration', sub: 'Optimal transpiration VPD', icon: TrendingUp },
                { val: '0.01', label: 'pH Resolution', sub: 'Micro-dosed acid/base balancing', icon: FlaskConical },
                { val: '5 sec', label: 'Telemetry Heartbeat', sub: 'Continuous sensor bus sync', icon: Radio },
              ].map((m, i) => {
                const IconComponent = m.icon;
                return (
                  <View key={i} style={styles.metricCard}>
                    <View style={styles.metricCardTop}>
                      <IconComponent size={14} color={themeColors.primary} />
                      <Text style={styles.metricCardLabel}>{m.label}</Text>
                    </View>
                    <Text style={styles.metricCardVal}>{m.val}</Text>
                    <Text style={styles.metricCardSub}>{m.sub}</Text>
                  </View>
                );
              })}
            </View>
          </LinearGradient>
        </View>

        {/* ========================================================================= */}
        {/* SECTION 2: INTERACTIVE PRODUCT ARCHITECTURE SHOWCASE                      */}
        {/* ========================================================================= */}
        <View style={styles.sectionDark}>
          <View style={styles.sectionHeader}>
            <View style={styles.pillTag}>
              <Text style={styles.pillTagText}>ENTERPRISE PRODUCT SUITE</Text>
            </View>
            <Text style={styles.sectionTitle}>Interactive Architecture</Text>
            <Text style={styles.sectionSubtitle}>
              Experience how hardware telemetry, edge artificial intelligence, and direct commerce converge into a single operational interface.
            </Text>
          </View>

          {/* Interactive Showcase Tabs */}
          <View style={styles.productTabsRow}>
            {[
              { id: 'telemetry', label: 'Autonomous Telemetry Node', icon: Radio },
              { id: 'ai', label: 'Neural Foliar Diagnostics', icon: Bot },
              { id: 'market', label: 'Direct Marketplace Engine', icon: ShoppingBag },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeProductTab === tab.id;
              return (
                <PressableScale
                  key={tab.id}
                  style={[styles.productTabBtn, isActive && styles.productTabBtnActive]}
                  onPress={() => setActiveProductTab(tab.id)}
                >
                  <Icon size={14} color={isActive ? '#10B981' : '#687D70'} />
                  <Text style={[styles.productTabText, isActive && styles.productTabTextActive]}>
                    {tab.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          {/* Product Viewport Card */}
          <View style={styles.productViewportContainer}>
            <View style={styles.viewportHeader}>
              <View style={styles.viewportWindowControls}>
                <View style={[styles.windowDot, { backgroundColor: '#EF4444' }]} />
                <View style={[styles.windowDot, { backgroundColor: '#F59E0B' }]} />
                <View style={[styles.windowDot, { backgroundColor: '#10B981' }]} />
              </View>
              <Text style={styles.viewportAddressBar}>
                hygrow://node.facility.autonomous/{activeProductTab}
              </Text>
              <View style={styles.viewportLiveTag}>
                <View style={styles.viewportLiveDot} />
                <Text style={styles.viewportLiveText}>LIVE DEMO</Text>
              </View>
            </View>

            <View style={styles.viewportBody}>
              {activeProductTab === 'telemetry' && (
                <View style={styles.demoContent}>
                  <View style={styles.demoTopBar}>
                    <View>
                      <Text style={styles.demoHeading}>NFT Channel Node · Bay 04</Text>
                      <Text style={styles.demoSub}>ESP32-S3 Firmware v2.1.0 · Recirculating Loop Active</Text>
                    </View>
                    <StatusBadge label="OPERATIONAL" status="success" size="sm" />
                  </View>

                  {/* Grid of Real Metrics */}
                  <View style={styles.demoGrid}>
                    <View style={styles.demoMetricCard}>
                      <Text style={styles.demoMetricLabel}>Root Zone pH</Text>
                      <Text style={[styles.demoMetricVal, { color: '#38BDF8' }]}>6.18</Text>
                      <Text style={styles.demoMetricStatus}>Target: 5.5 - 6.5 · Optimal</Text>
                    </View>
                    <View style={styles.demoMetricCard}>
                      <Text style={styles.demoMetricLabel}>Nutrient EC</Text>
                      <Text style={[styles.demoMetricVal, { color: '#10B981' }]}>1.84 <Text style={styles.demoUnit}>mS/cm</Text></Text>
                      <Text style={styles.demoMetricStatus}>Target: 1.4 - 2.2 · Optimal</Text>
                    </View>
                    <View style={styles.demoMetricCard}>
                      <Text style={styles.demoMetricLabel}>Water Temp</Text>
                      <Text style={[styles.demoMetricVal, { color: '#0EA5E9' }]}>21.2 <Text style={styles.demoUnit}>°C</Text></Text>
                      <Text style={styles.demoMetricStatus}>Dissolved Oxygen Ideal</Text>
                    </View>
                    <View style={styles.demoMetricCard}>
                      <Text style={styles.demoMetricLabel}>Transpiration VPD</Text>
                      <Text style={[styles.demoMetricVal, { color: '#A78BFA' }]}>1.14 <Text style={styles.demoUnit}>kPa</Text></Text>
                      <Text style={styles.demoMetricStatus}>Peak Stomatal Conductance</Text>
                    </View>
                  </View>

                  {/* Actuator State Bar */}
                  <View style={styles.demoActuatorBar}>
                    <View style={styles.demoActuatorLeft}>
                      <Cpu size={16} color={themeColors.primary} />
                      <Text style={styles.demoActuatorTitle}>Submersible Cycle Pump</Text>
                      <Text style={styles.demoActuatorState}>Continuous Recirculation (12.4 L/min)</Text>
                    </View>
                    <View style={styles.demoActuatorBadge}>
                      <Text style={styles.demoActuatorBadgeText}>ENERGIZED</Text>
                    </View>
                  </View>
                </View>
              )}

              {activeProductTab === 'ai' && (
                <View style={styles.demoContent}>
                  <View style={styles.demoTopBar}>
                    <View>
                      <Text style={styles.demoHeading}>Computer Vision Agronomist</Text>
                      <Text style={styles.demoSub}>Hugging Face MobileNetV2 Foliar Pathology Model</Text>
                    </View>
                    <StatusBadge label="CONFIDENCE 98.4%" status="success" size="sm" />
                  </View>

                  <View style={styles.demoAiBox}>
                    <View style={styles.demoAiIconCircle}>
                      <Bot size={28} color={themeColors.primary} />
                    </View>
                    <View style={styles.demoAiDetails}>
                      <Text style={styles.demoAiTitle}>Lactuca sativa (Butterhead Lettuce)</Text>
                      <Text style={styles.demoAiDesc}>
                        Chlorophyll absorption spectra within normal range. No fungal cercospora or powdery mildew markers detected across leaf lamina.
                      </Text>
                      <View style={styles.demoAiAdvice}>
                        <CheckCircle2 size={13} color={themeColors.primary} />
                        <Text style={styles.demoAiAdviceText}>
                          Agronomist Guidance: Maintain current EC dosing envelope for 7-day harvest readiness.
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {activeProductTab === 'market' && (
                <View style={styles.demoContent}>
                  <View style={styles.demoTopBar}>
                    <View>
                      <Text style={styles.demoHeading}>Hyperlocal Produce Exchange</Text>
                      <Text style={styles.demoSub}>Direct farm-to-table orders with automated inventory deduction</Text>
                    </View>
                    <StatusBadge label="LIVE SETTLEMENT" status="info" size="sm" />
                  </View>

                  <View style={styles.demoMarketCard}>
                    <View style={styles.demoMarketLeft}>
                      <View style={styles.marketPill}>
                        <Text style={styles.marketPillText}>HARVESTED TODAY</Text>
                      </View>
                      <Text style={styles.demoMarketTitle}>Hydroponic Sweet Italian Basil</Text>
                      <Text style={styles.demoMarketSub}>Pesticide-Free · Living Root Plug Attached</Text>
                      <Text style={styles.demoMarketStock}>340 bundles available in batch</Text>
                    </View>
                    <View style={styles.demoMarketRight}>
                      <Text style={styles.demoMarketPrice}>₹85</Text>
                      <Text style={styles.demoMarketUnit}>per bundle</Text>
                      <View style={styles.demoPaymentPill}>
                        <Text style={styles.demoPaymentText}>Razorpay & UPI Instant</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ========================================================================= */}
        {/* SECTION 3: HOW IT WORKS — STAGED ARCHITECTURAL FLOW                       */}
        {/* ========================================================================= */}
        <View style={styles.sectionLight}>
          <View style={styles.sectionHeader}>
            <View style={styles.pillTag}>
              <Text style={styles.pillTagText}>STAGED AUTONOMY</Text>
            </View>
            <Text style={styles.sectionTitle}>How Closed-Loop Hydroponics Works</Text>
            <Text style={styles.sectionSubtitle}>
              From nutrient reservoir cycling to local buyer fulfillment, every step is orchestrated with precision telemetry.
            </Text>
          </View>

          <View style={styles.stepsGrid}>
            {[
              {
                step: '01',
                title: 'Nutrient Recirculation',
                desc: 'Water, oxygen, and balanced micro-elements loop continuously across shallow NFT gullies, delivering non-stop nutrition without root drowning.',
                icon: Droplets,
                color: '#06B6D4',
              },
              {
                step: '02',
                title: 'Edge Telemetry Sampling',
                desc: 'Submersible and atmospheric sensors log pH, EC, water temperature, water depth, and VPD every 5 seconds with instant alert trigger bounds.',
                icon: Radio,
                color: '#10B981',
              },
              {
                step: '03',
                title: 'Neural Foliar Diagnostics',
                desc: 'Mobile vision scans analyze leaf morphology, detecting early micronutrient deficiencies or pathogen signatures days before symptoms show.',
                icon: Bot,
                color: '#8B5CF6',
              },
              {
                step: '04',
                title: 'Direct-to-Consumer Market',
                desc: 'Harvested yields are logged into farm inventory and immediately surfaced to local buyers with transparent origin metadata and instant payment.',
                icon: ShoppingBag,
                color: '#F59E0B',
              },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <View key={i} style={styles.stepCard}>
                  <View style={styles.stepHeader}>
                    <Text style={[styles.stepNum, { color: s.color }]}>{s.step}</Text>
                    <View style={[styles.stepIconWrap, { backgroundColor: s.color + '15' }]}>
                      <Icon size={18} color={s.color} />
                    </View>
                  </View>
                  <Text style={styles.stepTitle}>{s.title}</Text>
                  <Text style={styles.stepDesc}>{s.desc}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ========================================================================= */}
        {/* SECTION 4: INSIDE THE FACILITY — CAROUSEL                                  */}
        {/* ========================================================================= */}
        <View style={styles.carouselSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.pillTag}>
              <Text style={styles.pillTagText}>VERIFIED CULTIVATION</Text>
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
                    <ImageBackground
                      source={img}
                      style={styles.carouselImage}
                      imageStyle={styles.carouselImageStyle}
                      resizeMode="cover"
                    >
                      <LinearGradient
                        colors={['transparent', themeColors.adapt('rgba(17, 19, 21, 0.92)', 'rgba(8, 18, 13, 0.85)')]}
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
                <ChevronLeft size={20} color={themeColors.actionText} />
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
                <ChevronRight size={20} color={themeColors.actionText} />
              </PressableScale>
            </View>
          </View>
        </View>

        {/* ========================================================================= */}
        {/* SECTION 5: AGRONOMY INQUIRY & CONTACT TRANSMISSION                        */}
        {/* ========================================================================= */}
        <View style={styles.feedbackSection}>
          <View style={styles.feedbackCardWrapper}>
            <View style={styles.feedbackCard}>
              <View style={styles.feedbackHeader}>
                <View style={styles.feedbackBadge}>
                  <Send size={12} color={themeColors.primary} />
                  <Text style={styles.feedbackBadgeText}>DIRECT INQUIRY & PILOT CONSULTATION</Text>
                </View>
                <Text style={styles.feedbackTitle}>Connect with Agronomists</Text>
                <Text style={styles.feedbackDesc}>
                  Have questions about our modular farming racks, produce availability, or IoT software integration? Transmit your query directly.
                </Text>
              </View>

              {Boolean(successMessage) && (
                <View style={styles.successContainer}>
                  <CheckCircle2 size={16} color={themeColors.primary} />
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Dr. Jane Smith"
                  placeholderTextColor={themeColors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Work Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="jane@organization.com"
                  placeholderTextColor={themeColors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Project Requirement or Inquiry</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your hydroponic system dimensions, sensor queries, or produce procurement requirements..."
                  placeholderTextColor={themeColors.textMuted}
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
                  <ActivityIndicator color={themeColors.actionText} />
                ) : (
                  <View style={styles.submitBtnInner}>
                    <Text style={styles.submitBtnText}>Transmit Inquiry</Text>
                    <Send size={15} color={themeColors.actionText} />
                  </View>
                )}
              </PressableScale>
            </View>
          </View>
        </View>

        {/* ========================================================================= */}
        {/* SECTION 6: ENTERPRISE FOOTER                                              */}
        {/* ========================================================================= */}
        <PublicFooter />
      </ScrollView>
    </View>
  );
}

const createStyles = (themeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.adapt('#111315', themeColors.background),
  },
  scrollContent: {
    flexGrow: 1,
  },

  // HERO SECTION
  heroSection: {
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: themeColors.isDarkMode ? 0 : 24,
    marginTop: themeColors.isDarkMode ? 0 : 24,
    borderRadius: themeColors.isDarkMode ? 0 : 24,
  },
  heroBackgroundGradient: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 24,
    position: 'relative',
  },
  glowTopCenter: {
    position: 'absolute',
    top: -100,
    left: '30%',
    width: 400,
    height: 300,
    borderRadius: 200,
    backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.12)', 'rgba(255, 255, 255, 0.18)'),
    ...Platform.select({
      web: { filter: 'blur(80px)' },
    }),
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: 50,
    right: -50,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: themeColors.adapt('rgba(10, 77, 60, 0.18)', 'rgba(255, 255, 255, 0.2)'),
    ...Platform.select({
      web: { filter: 'blur(90px)' },
    }),
  },

  // NAVBAR
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 48,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogoWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.15)', themeColors.primaryGlow),
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(16, 185, 129, 0.3)', themeColors.border),
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    letterSpacing: 1.5,
  },
  systemStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.12)', themeColors.primaryGlow),
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(16, 185, 129, 0.25)', themeColors.border),
    marginLeft: 6,
  },
  systemStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: themeColors.success,
  },
  systemStatusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: themeColors.primary,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navLinkMarket: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navLinkMarketText: {
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
  },
  navSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: themeColors.action,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(52, 211, 153, 0.3)', themeColors.border),
  },
  navSignInText: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.actionText,
  },

  // HERO CONTENT
  heroGrid: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: SCREEN_WIDTH > 900 ? 'row' : 'column',
    alignItems: 'center',
    gap: 36,
    marginBottom: 48,
  },
  heroLeftCol: {
    flex: 1,
    width: SCREEN_WIDTH > 900 ? undefined : '100%',
  },
  heroRightCol: {
    flex: 1,
    width: SCREEN_WIDTH > 900 ? undefined : '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.12)', 'rgba(247, 245, 239, 0.62)'),
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(16, 185, 129, 0.3)', 'rgba(10, 77, 60, 0.2)'),
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: themeColors.adapt('#34D399', themeColors.primaryDark),
  },
  heroTitle: {
    fontSize: SCREEN_WIDTH > 600 ? 46 : 34,
    fontWeight: '800',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    letterSpacing: -1.2,
    lineHeight: SCREEN_WIDTH > 600 ? 54 : 42,
    marginBottom: 16,
  },
  heroTitleAccent: {
    color: themeColors.adapt(themeColors.primary, themeColors.primaryDark),
  },
  heroSubtitle: {
    fontSize: 15,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    lineHeight: 24,
    marginBottom: 28,
    maxWidth: 540,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: themeColors.action,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 10,
    ...Platform.select({
      web: {
        boxShadow: themeColors.adapt('0 4px 16px rgba(16, 185, 129, 0.35)', '0 6px 18px rgba(232, 65, 44, 0.22)'),
      },
    }),
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: themeColors.adapt('#0B130E', themeColors.actionText),
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: themeColors.adapt('rgba(255, 255, 255, 0.06)', 'rgba(247, 245, 239, 0.72)'),
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(255, 255, 255, 0.16)', 'rgba(10, 77, 60, 0.22)'),
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
  },
  trustChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  trustChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustChipText: {
    fontSize: 11,
    color: themeColors.adapt('#687D70', themeColors.textMuted),
    fontWeight: '600',
  },

  // METRICS KPI BANNER
  metricsContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: themeColors.adapt('rgba(18, 29, 22, 0.75)', themeColors.surfaceGlass),
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(255, 255, 255, 0.08)', 'rgba(10, 77, 60, 0.18)'),
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
        boxShadow: themeColors.adapt('0 2px 8px rgba(0, 0, 0, 0.2)', '0 8px 24px rgba(10, 77, 60, 0.12)'),
      },
    }),
  },
  metricCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metricCardLabel: {
    fontSize: 11,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    fontWeight: '600',
  },
  metricCardVal: {
    fontSize: 24,
    fontWeight: '800',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    letterSpacing: -0.5,
    marginVertical: 2,
  },
  metricCardSub: {
    fontSize: 10,
    color: themeColors.adapt('#687D70', themeColors.textMuted),
  },

  // SECTION DARK (SHOWCASE)
  sectionDark: {
    backgroundColor: themeColors.adapt('#191C1E', themeColors.surfaceLight),
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  pillTag: {
    backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.12)', themeColors.primaryGlow),
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(16, 185, 129, 0.25)', themeColors.border),
    marginBottom: 12,
  },
  pillTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: themeColors.primary,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 620,
  },

  // PRODUCT TABS
  productTabsRow: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  productTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  productTabBtnActive: {
    backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.15)', themeColors.primaryGlow),
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  productTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.adapt('#687D70', themeColors.textMuted),
  },
  productTabTextActive: {
    color: themeColors.primary,
    fontWeight: '700',
  },

  // PRODUCT VIEWPORT
  productViewportContainer: {
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: themeColors.adapt('#191C1E', themeColors.surface),
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(52, 211, 153, 0.2)', themeColors.border),
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)',
      },
    }),
  },
  viewportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: themeColors.adapt('#0A130E', themeColors.surface),
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
  },
  viewportWindowControls: {
    flexDirection: 'row',
    gap: 6,
  },
  windowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  viewportAddressBar: {
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    color: themeColors.adapt('#687D70', themeColors.textMuted),
  },
  viewportLiveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewportLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  viewportLiveText: {
    fontSize: 9,
    fontWeight: '800',
    color: themeColors.primary,
  },
  viewportBody: {
    padding: 24,
  },
  demoContent: {
    gap: 16,
  },
  demoTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  demoHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    letterSpacing: -0.3,
  },
  demoSub: {
    fontSize: 12,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    marginTop: 2,
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  demoMetricCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 10,
    padding: 12,
  },
  demoMetricLabel: {
    fontSize: 11,
    color: themeColors.adapt('#687D70', themeColors.textMuted),
    fontWeight: '600',
  },
  demoMetricVal: {
    fontSize: 20,
    fontWeight: '800',
    marginVertical: 4,
    color: themeColors.adapt('#F8FAF8', themeColors.text),
  },
  demoUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
  },
  demoMetricStatus: {
    fontSize: 10,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
  },
  demoActuatorBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.08)', themeColors.primaryGlow),
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(16, 185, 129, 0.25)', themeColors.border),
    padding: 14,
    borderRadius: 10,
  },
  demoActuatorLeft: {
    gap: 2,
  },
  demoActuatorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
  },
  demoActuatorState: {
    fontSize: 11,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
  },
  demoActuatorBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  demoActuatorBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: themeColors.adapt('#0B130E', themeColors.actionText),
    letterSpacing: 0.5,
  },

  // DEMO AI & MARKETPLACE
  demoAiBox: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 18,
  },
  demoAiIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.15)', themeColors.primaryGlow),
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoAiDetails: {
    flex: 1,
  },
  demoAiTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    marginBottom: 4,
  },
  demoAiDesc: {
    fontSize: 12,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    lineHeight: 18,
    marginBottom: 8,
  },
  demoAiAdvice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  demoAiAdviceText: {
    fontSize: 11,
    color: themeColors.primary,
    fontWeight: '600',
  },
  demoMarketCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 18,
  },
  demoMarketLeft: {
    gap: 4,
  },
  marketPill: {
    backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.15)', themeColors.primaryGlow),
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  marketPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: themeColors.primary,
  },
  demoMarketTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
  },
  demoMarketSub: {
    fontSize: 12,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
  },
  demoMarketStock: {
    fontSize: 11,
    color: themeColors.adapt('#687D70', themeColors.textMuted),
  },
  demoMarketRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  demoMarketPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: themeColors.primary,
  },
  demoMarketUnit: {
    fontSize: 11,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
  },
  demoPaymentPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  demoPaymentText: {
    fontSize: 10,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    fontWeight: '600',
  },

  // SECTION LIGHT (STAGED FLOW)
  sectionLight: {
    backgroundColor: themeColors.adapt('#191C1E', themeColors.surface),
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  stepsGrid: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  stepCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: themeColors.adapt('#191C1E', themeColors.surface),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 14,
    padding: 20,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNum: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  stepIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: 13,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    lineHeight: 19,
  },

  // CAROUSEL SECTION
  carouselSection: {
    backgroundColor: themeColors.adapt('#111315', themeColors.background),
    paddingVertical: 64,
  },
  carouselContainer: {
    width: '100%',
    alignItems: 'center',
  },
  carouselImageWrapper: {
    paddingHorizontal: 20,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  carouselImage: {
    height: 380,
    borderRadius: 16,
    overflow: 'hidden',
  },
  carouselImageStyle: {
    borderRadius: 16,
  },
  carouselOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
  },
  carouselCaption: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.adapt('#FFFFFF', themeColors.text),
    letterSpacing: -0.3,
  },
  carouselControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 20,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: themeColors.adapt('#FFFFFF', themeColors.surface),
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeDot: {
    width: 24,
    backgroundColor: themeColors.secondary,
  },

  // FEEDBACK SECTION
  feedbackSection: {
    backgroundColor: themeColors.adapt('#191C1E', themeColors.surfaceLight),
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  feedbackCardWrapper: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  feedbackCard: {
    backgroundColor: themeColors.adapt('#191C1E', themeColors.surface),
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(52, 211, 153, 0.25)', themeColors.border),
    borderRadius: 16,
    padding: 28,
  },
  feedbackHeader: {
    marginBottom: 20,
  },
  feedbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.12)', themeColors.primaryGlow),
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  feedbackBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: themeColors.primary,
  },
  feedbackTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    marginBottom: 6,
  },
  feedbackDesc: {
    fontSize: 13,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    lineHeight: 20,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.15)', themeColors.primaryGlow),
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(16, 185, 129, 0.3)', themeColors.border),
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    fontSize: 12,
    color: themeColors.primary,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: themeColors.adapt('#191C1E', themeColors.surfaceLight),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    fontSize: 14,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: themeColors.action,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: themeColors.adapt('#0B130E', themeColors.actionText),
  },

  // FOOTER
  footer: {
    backgroundColor: themeColors.adapt('#151719', themeColors.surfaceMuted),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  footerBrandRow: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    gap: 8,
    marginBottom: 28,
  },
  footerBrandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    letterSpacing: 1.2,
  },
  footerTagline: {
    fontSize: 13,
    color: themeColors.adapt('#687D70', themeColors.textMuted),
    maxWidth: 500,
    lineHeight: 18,
  },
  footerDivider: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 24,
  },
  footerBottomRow: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: SCREEN_WIDTH > 768 ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  footerCopyright: {
    fontSize: 12,
    color: themeColors.adapt('#687D70', themeColors.textMuted),
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
  },
  footerDot: {
    color: '#4D7C6F',
  },
  liveSystemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.1)', themeColors.primaryGlow),
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  liveSystemPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.primary,
  },
});
