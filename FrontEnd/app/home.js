import { getAuthHeaders } from '../src/services/authHeaders';
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, ImageBackground, Dimensions, SafeAreaView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getBackendUrl } from '../src/utils/apiConfig';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BACKGROUND_IMAGES = [
  require('../assets/images/slide1.jpg'),
  require('../assets/images/slide2.jpg'),
  require('../assets/images/slide3.jpg')
];

// Aztec Theme Colors
const theme = {
  primary: '#10b981', // Emerald 500
  primaryDark: '#047857', // Emerald 700
  secondary: '#0ea5e9', // Sky 500
  background: '#f8fafc', // Slate 50
  surface: '#ffffff',
  text: '#0f172a', // Slate 900
  textMuted: '#64748b', // Slate 500
  border: '#e2e8f0', // Slate 200
  success: '#10b981',
};

export default function HomeScreen() {
  const router = useRouter();
  const carouselRef = useRef(null);

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
      Alert.alert('Error', 'Please fill in all fields before submitting.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address.');
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
          replyTo: email
        })
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      setSuccessMessage('Thank you! We will get back to you soon.');
      setName(''); setEmail(''); setMessage('');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error sending feedback:', error);
      Alert.alert('Error', 'Failed to send feedback.');
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
            colors={['rgba(15, 23, 42, 0.4)', 'rgba(15, 23, 42, 0.95)']}
            style={styles.heroOverlay}
          >
            {/* Embedded Header */}
            <View style={styles.headerContent}>
              <Text style={styles.logo}>HYGROW</Text>
              <View style={styles.navLinks}>
                <Pressable onPress={() => router.push('/(tabs)/market')} style={styles.navItem}>
                  <Text style={styles.navText}>Marketplace</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/(auth)')} style={styles.navBtn}>
                  <Text style={styles.navBtnText}>Sign In</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.heroContent}>
              <View style={styles.badgeWrap}>
                <Text style={styles.badgeText}>🌱 The Future of Farming</Text>
              </View>
              <Text style={styles.heroTitle}>Revolutionary{'\n'}Hydroponic{'\n'}Agriculture</Text>
              <Text style={styles.heroSubtitle}>
                Empowering modern farmers and delivering peak-freshness, nutrient-dense produce directly to your community.
              </Text>
              <View style={styles.heroActions}>
                <Pressable style={styles.primaryBtn} onPress={() => router.push('/(tabs)/market')}>
                  <Text style={styles.primaryBtnText}>Explore Market</Text>
                </Pressable>
                <Pressable style={styles.secondaryBtn} onPress={() => router.push('/(auth)')}>
                  <Text style={styles.secondaryBtnText}>Get Started</Text>
                </Pressable>
              </View>
            </View>
            
            {/* Metric Badges */}
            <View style={styles.metricsContainer}>
              {[
                { val: '300%', label: 'Faster Growth' },
                { val: '90%', label: 'Water Savings' },
                { val: '100%', label: 'Organic' }
              ].map((m, i) => (
                <View key={i} style={styles.metricBadge}>
                  <Text style={styles.metricVal}>{m.val}</Text>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* WHY CHOOSE SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Choose HYGROW?</Text>
          <Text style={styles.sectionSubtitle}>We're bringing sustainable, highly-efficient farming directly to the community.</Text>
          
          <View style={styles.gridContainer}>
            {[
              { icon: '💧', title: 'Water Efficiency', desc: 'Uses up to 90% less water than traditional soil farming.' },
              { icon: '🌿', title: 'Nutrient Precision', desc: 'Plants receive exactly what they need for maximum growth.' },
              { icon: '📊', title: 'Smart Monitoring', desc: 'Real-time IoT sensors track humidity, pH, and temp.' },
              { icon: '🏆', title: 'Premium Quality', desc: 'Pesticide-free, nutrient-dense produce all year round.' }
            ].map((item, i) => (
              <View key={i} style={styles.gridCard}>
                <View style={styles.iconCircle}><Text style={styles.iconText}>{item.icon}</Text></View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* IOT-POWERED AGRICULTURE SECTION */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={styles.sectionTitle}>IoT-Powered Agriculture</Text>
          <Text style={styles.sectionSubtitle}>Seamlessly integrating smart sensors with a direct-to-consumer marketplace.</Text>
          
          <View style={styles.cardsRow}>
            {[
              { icon: '📡', title: 'Smart Sensor Monitoring', desc: 'Monitor your crops anywhere, anytime. Get instant alerts for pH and EC levels.' },
              { icon: '🛒', title: 'Direct Marketplace', desc: 'List your harvest directly. No middlemen, better prices, maximum freshness.' },
              { icon: '📈', title: 'Real-time Analytics', desc: 'Leverage AI to predict yields and optimize your nutrient delivery system.' }
            ].map((item, i) => (
              <View key={i} style={styles.largeCard}>
                <View style={styles.largeIconCircle}><Text style={styles.largeIconText}>{item.icon}</Text></View>
                <Text style={styles.largeCardTitle}>{item.title}</Text>
                <Text style={styles.largeCardDesc}>{item.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* IMAGE CAROUSEL SECTION */}
        <View style={[styles.section, { paddingHorizontal: 0, paddingBottom: 60 }]}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 24 }]}>Inside the Farm</Text>
          <Text style={[styles.sectionSubtitle, { paddingHorizontal: 24, marginBottom: 24 }]}>Take a look at our cutting-edge facilities and vibrant produce.</Text>
          
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
                  <ImageBackground source={img} style={styles.carouselImage} imageStyle={{ resizeMode: 'cover' }} />
                </View>
              ))}
            </ScrollView>
            
            {/* Carousel Controls */}
            <View style={styles.carouselControls}>
              <Pressable style={styles.controlBtn} onPress={handlePrevSlide}>
                <Text style={styles.controlBtnText}>←</Text>
              </Pressable>
              <View style={styles.dotsWrap}>
                {BACKGROUND_IMAGES.map((_, idx) => (
                  <View key={idx} style={[styles.dot, activeSlide === idx && styles.activeDot]} />
                ))}
              </View>
              <Pressable style={styles.controlBtn} onPress={handleNextSlide}>
                <Text style={styles.controlBtnText}>→</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* FEEDBACK SECTION */}
        <View style={styles.section}>
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>Get In Touch</Text>
            <Text style={styles.feedbackDesc}>Have a suggestion or question? Let us know below!</Text>
            
            {!!successMessage && (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}

            <TextInput style={styles.input} placeholder="Your Name" placeholderTextColor={theme.textMuted} value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Your Email" placeholderTextColor={theme.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={[styles.input, styles.textArea]} placeholder="Your Message" placeholderTextColor={theme.textMuted} value={message} onChangeText={setMessage} multiline numberOfLines={4} textAlignVertical="top" />

            <Pressable style={styles.submitBtn} onPress={handleSendFeedback} disabled={isSending}>
              {isSending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Send Message</Text>}
            </Pressable>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>HYGROW</Text>
          <Text style={styles.footerDesc}>Sustainable agriculture powered by modern technology.</Text>
          <View style={styles.footerDivider} />
          <Text style={styles.footerCopyright}>© {new Date().getFullYear()} HYGROW. All rights reserved.</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 40,
  },
  logo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  navBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  navBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollContent: {
    paddingTop: 0,
  },
  heroSection: {
    width: '100%',
    overflow: 'hidden',
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
  heroContent: {
    alignItems: 'flex-start',
    maxWidth: 600,
    paddingBottom: 40,
  },
  badgeWrap: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  badgeText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 56,
    marginBottom: 20,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#cbd5e1',
    lineHeight: 28,
    marginBottom: 32,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
  },
  secondaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    justifyContent: 'space-evenly',
    gap: 16,
    marginTop: 0,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  metricBadge: {
    flex: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.primary,
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: theme.textMuted,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
  },
  gridCard: {
    backgroundColor: theme.surface,
    width: SCREEN_WIDTH > 600 ? '45%' : '100%',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 15,
    color: theme.textMuted,
    lineHeight: 22,
  },
  cardsRow: {
    flexDirection: SCREEN_WIDTH > 800 ? 'row' : 'column',
    gap: 20,
  },
  largeCard: {
    flex: 1,
    backgroundColor: theme.background,
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  largeIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  largeIconText: {
    fontSize: 36,
  },
  largeCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  largeCardDesc: {
    fontSize: 15,
    color: theme.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  carouselContainer: {
    position: 'relative',
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: 400,
  },
  carouselControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  controlBtnText: {
    fontSize: 20,
    color: theme.text,
    fontWeight: 'bold',
  },
  dotsWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.border,
  },
  activeDot: {
    backgroundColor: theme.primary,
    width: 24,
  },
  feedbackCard: {
    backgroundColor: theme.surface,
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  feedbackTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 8,
  },
  feedbackDesc: {
    fontSize: 15,
    color: theme.textMuted,
    marginBottom: 24,
  },
  input: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: theme.text,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 120,
  },
  submitBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  successContainer: {
    backgroundColor: theme.primary + '20',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.primary + '50',
  },
  successText: {
    color: theme.primaryDark,
    textAlign: 'center',
    fontWeight: '600',
  },
  footer: {
    backgroundColor: theme.surface,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  footerLogo: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.primaryDark,
    marginBottom: 12,
    letterSpacing: 1,
  },
  footerDesc: {
    fontSize: 15,
    color: theme.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  footerDivider: {
    width: '100%',
    height: 1,
    backgroundColor: theme.border,
    marginBottom: 24,
  },
  footerCopyright: {
    fontSize: 14,
    color: theme.textMuted,
  }
});
