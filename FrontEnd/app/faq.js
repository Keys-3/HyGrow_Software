import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Platform, useWindowDimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Cpu,
  FlaskConical,
  Bot,
  ShoppingBag,
  ShieldCheck,
  Send,
  ArrowRight,
  X,
  Sparkles,
} from 'lucide-react-native';
import { PublicHeader } from '../src/components/public/PublicHeader';
import { PublicFooter } from '../src/components/public/PublicFooter';
import { PressableScale } from '../src/components/PressableScale';
import { useThemeColors } from '../src/theme/theme';

const FAQ_DATA = [
  // Hardware & Sensors
  {
    id: 'hw-1',
    category: 'Hardware & IoT',
    question: 'How does the HYGROW S3 Controller communicate with the cloud?',
    answer: 'The S3 Hub connects via 2.4 GHz Wi-Fi (802.11 b/g/n) to your facility local network and synchronizes encrypted state with Firebase Firestore over TLS. It also features Bluetooth Low Energy (BLE 5.0) for zero-network local commissioning and Bluetooth mesh networking with nearby secondary sensor nodes.',
  },
  {
    id: 'hw-2',
    category: 'Hardware & IoT',
    question: 'What happens if my greenhouse internet connection drops?',
    answer: 'HYGROW is strictly offline-first. All mission-critical dosing schedules, aeration timers, and light photoperiods execute directly within local FreeRTOS firmware tasks. Sensor readings write into an onboard 72-hour ring buffer partition. Once network access returns, the controller performs an authenticated delta-sync without any loss of historical telemetry.',
  },
  {
    id: 'hw-3',
    category: 'Hardware & IoT',
    question: 'How often do pH and EC probes require recalibration?',
    answer: 'Our industrial glass-bulb pH probes are factory-calibrated. Under continuous immersion in closed-loop nutrient streams, we recommend a 2-point buffer calibration (pH 4.01 and pH 7.00) every 45 to 60 days. The HyGrow app includes an automated step-by-step calibration wizard that guides you through the process in under 3 minutes.',
  },
  {
    id: 'hw-4',
    category: 'Hardware & IoT',
    question: 'Can I connect my existing AC exhaust fans and water pumps?',
    answer: 'Yes! The HYGROW S3 controller incorporates 8 optical-isolated solid-state relays (SSRs) rated for up to 250V AC @ 10A each. You can wire standard water submersible pumps, motorized ball valves, exhaust blowers, and LED grow drivers directly into the screw-terminal barrier blocks.',
  },

  // Nutrient Dosing & Water Chemistry
  {
    id: 'nutr-1',
    category: 'Nutrient Automation',
    question: 'How does automated pH balancing work without swinging the reservoir?',
    answer: 'The system uses an adaptive PID (Proportional-Integral-Derivative) dosing algorithm. Instead of dumping large volumes of acid or base, our stepper-driven peristaltic pumps administer micro-liter pulses (0.1 mL resolution) with programmable circulation delay intervals. This prevents localized pH shock and stabilizes reservoir water precisely between pH 5.8 and 6.2.',
  },
  {
    id: 'nutr-2',
    category: 'Nutrient Automation',
    question: 'Can I use custom A/B fertilizer formulations or organic teas?',
    answer: 'Absolutely. HyGrow AutoDose pump heads are constructed with chemical-grade Santoprene tubing compatible with concentrated nitric acid, phosphoric acid, potassium hydroxide, calcium nitrate, and organic kelp or fulvic acid extracts.',
  },
  {
    id: 'nutr-3',
    category: 'Nutrient Automation',
    question: 'How much water does closed-loop hydroponics save compared to traditional soil?',
    answer: 'Closed-loop hydroponics recirculates and filters runoff, eliminating evaporation into deep subsoil. Depending on crop variety and canopy humidity, HyGrow systems consume between 90% and 95% less water per kilogram of harvested produce than open-field soil cultivation.',
  },

  // AI & Computer Vision
  {
    id: 'ai-1',
    category: 'AI & Diagnostics',
    question: 'How accurate is the Foliar Disease Vision Scanner?',
    answer: 'Our neural vision model achieves 98.4% top-1 classification accuracy across 40+ common crop pathologies, including powdery mildew, early blight, bacterial leaf spot, iron chlorosis, and spider mite webbing. It is trained on tens of thousands of verified botanical leaf specimens under various lighting spectra.',
  },
  {
    id: 'ai-2',
    category: 'AI & Diagnostics',
    question: 'Does the AI provide pesticide-free treatment recommendations?',
    answer: 'Yes. Our integrated AI Agronomist prioritizes biological and organic integrated pest management (IPM) protocols — such as beneficial predatory mites (Phytoseiulus persimilis), cold-pressed neem emulsions, Bacillus subtilis bio-fungicides, and microclimate VPD adjustments — rather than synthetic chemical drenching.',
  },

  // Marketplace & Payouts
  {
    id: 'mkt-1',
    category: 'Marketplace & Orders',
    question: 'How do growers receive payments from buyers on the HyGrow Market?',
    answer: 'All marketplace transactions are processed securely through Razorpay supporting UPI, credit cards, debit cards, and net banking. Funds are routed directly into the verified grower bank account via automated settlements, with full invoice tracking inside the Orders dashboard.',
  },
  {
    id: 'mkt-2',
    category: 'Marketplace & Orders',
    question: 'What is the "living produce with root ball" standard?',
    answer: 'To ensure maximum freshness and zero post-harvest chemical preservation, our hydroponic lettuce and culinary herbs are dispatched with their living root ball intact in biodegradable net cups. Buyers simply place the root ball in a shallow bowl of water, keeping produce fresh and crisp for up to 14 days on the kitchen counter.',
  },
];

const CATEGORIES = [
  'All',
  'Hardware & IoT',
  'Nutrient Automation',
  'AI & Diagnostics',
  'Marketplace & Orders',
];

export default function FAQScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(themeColors, width), [themeColors, width]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState('hw-1');

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const filteredFaqs = FAQ_DATA.filter((item) => {
    const matchesCategory =
      activeCategory === 'All' || item.category.toLowerCase() === activeCategory.toLowerCase();
    const query = search.toLowerCase();
    const matchesSearch =
      item.question.toLowerCase().includes(query) ||
      item.answer.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, title: 'Frequently Asked Questions | HyGrow' }} />
      <PublicHeader activeRoute="faq" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <LinearGradient colors={themeColors.globalBackground} style={styles.heroGradient}>
            <View style={styles.heroBadge}>
              <HelpCircle size={12} color={themeColors.primary} />
              <Text style={styles.heroBadgeText}>KNOWLEDGE BASE & ARCHITECTURE FAQ</Text>
            </View>
            <Text style={styles.heroTitle}>
              Frequently Asked <Text style={styles.heroTitleAccent}>Questions</Text>
            </Text>
            <Text style={styles.heroSub}>
              Everything you need to know about setting up the S3 hardware hub, automated nutrient dosing, foliar AI diagnostics, and local produce fulfillment.
            </Text>
          </LinearGradient>
        </View>

        {/* Filter and Search Bar */}
        <View style={styles.filterSection}>
          <View style={styles.searchBox}>
            <Search size={16} color={themeColors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search questions by keyword, sensor name, or topic..."
              placeholderTextColor={themeColors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <PressableScale onPress={() => setSearch('')}>
                <X size={16} color={themeColors.textSecondary} />
              </PressableScale>
            )}
          </View>

          <View style={styles.categoriesRow}>
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <PressableScale
                  key={cat}
                  onPress={() => setActiveCategory(cat)}
                  style={[styles.catPill, isActive && styles.catPillActive]}
                  activeScale={0.96}
                >
                  <Text style={[styles.catPillText, isActive && styles.catPillTextActive]}>
                    {cat}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>

        {/* FAQ Accordion List */}
        <View style={styles.faqList}>
          {filteredFaqs.map((faq) => {
            const isExpanded = expandedId === faq.id;
            return (
              <View
                key={faq.id}
                style={[styles.faqItem, isExpanded && styles.faqItemExpanded]}
              >
                <PressableScale
                  style={styles.faqHeader}
                  onPress={() => toggleExpand(faq.id)}
                  activeScale={0.99}
                >
                  <View style={styles.questionBlock}>
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryTagText}>{faq.category.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.questionText}>{faq.question}</Text>
                  </View>
                  <View style={[styles.expandIconWrap, isExpanded && styles.expandIconWrapActive]}>
                    {isExpanded ? (
                      <ChevronUp size={18} color={themeColors.primary} />
                    ) : (
                      <ChevronDown size={18} color={themeColors.textSecondary} />
                    )}
                  </View>
                </PressableScale>

                {isExpanded && (
                  <View style={styles.faqBody}>
                    <View style={styles.divider} />
                    <Text style={styles.answerText}>{faq.answer}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Still Have Questions CTA */}
        <View style={styles.stillQuestionsSection}>
          <View style={styles.stillQuestionsCard}>
            <View style={styles.stillIconWrap}>
              <Send size={24} color={themeColors.primary} />
            </View>
            <View style={styles.stillTextBlock}>
              <Text style={styles.stillTitle}>Still have questions or custom facility dimensions?</Text>
              <Text style={styles.stillDesc}>
                Our agricultural engineering and software team is ready to analyze your greenhouse blueprint.
              </Text>
            </View>
            <PressableScale
              style={styles.stillBtn}
              onPress={() => router.push('/contact')}
              activeScale={0.96}
            >
              <Text style={styles.stillBtnText}>Contact Agronomists</Text>
              <ArrowRight size={14} color={themeColors.adapt('#0B130E', themeColors.actionText)} />
            </PressableScale>
          </View>
        </View>

        <PublicFooter />
      </ScrollView>
    </View>
  );
}

const createStyles = (themeColors, width = 360) => {
  const isMobile = width < 768;
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.adapt('#111315', themeColors.background),
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroSection: {
    paddingVertical: isMobile ? 32 : 56,
    paddingHorizontal: isMobile ? 16 : 24,
    alignItems: 'center',
  },
  heroGradient: {
    maxWidth: 900,
    width: '100%',
    alignItems: 'center',
    padding: isMobile ? 20 : 32,
    borderRadius: isMobile ? 18 : 24,
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
    fontSize: 12,
    fontWeight: '800',
    color: themeColors.adapt('#34D399', themeColors.primaryLight),
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: isMobile ? 26 : 34,
    fontWeight: '900',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 14,
  },
  heroTitleAccent: {
    color: themeColors.adapt('#34D399', themeColors.primaryLight),
  },
  heroSub: {
    fontSize: isMobile ? 13 : 15,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    lineHeight: isMobile ? 20 : 24,
    textAlign: 'center',
    maxWidth: 720,
  },
  filterSection: {
    maxWidth: 1080,
    marginHorizontal: 'auto',
    width: '100%',
    paddingHorizontal: isMobile ? 16 : 24,
    marginBottom: isMobile ? 24 : 36,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.adapt('#191C1E', themeColors.surface),
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(52, 211, 153, 0.2)', themeColors.border),
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    fontSize: 15,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catPill: {
    backgroundColor: themeColors.adapt('#191C1E', themeColors.surface),
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.15)',
  },
  catPillActive: {
    backgroundColor: themeColors.secondary,
    borderColor: themeColors.adapt('#10B981', themeColors.borderActive),
  },
  catPillText: {
    fontSize: 13,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    fontWeight: '600',
  },
  catPillTextActive: {
    color: themeColors.adapt('#0B130E', themeColors.actionText),
    fontWeight: '700',
  },
  faqList: {
    maxWidth: 1080,
    marginHorizontal: 'auto',
    width: '100%',
    paddingHorizontal: isMobile ? 16 : 24,
    gap: isMobile ? 12 : 16,
    marginBottom: isMobile ? 36 : 56,
  },
  faqItem: {
    backgroundColor: themeColors.adapt('#191C1E', themeColors.surface),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.16)',
    overflow: 'hidden',
  },
  faqItemExpanded: {
    borderColor: 'rgba(52, 211, 153, 0.35)',
    backgroundColor: themeColors.adapt('#0E2116', themeColors.surfaceMuted),
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    gap: 16,
  },
  questionBlock: {
    flex: 1,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.12)', themeColors.primaryGlow),
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: themeColors.adapt('#34D399', themeColors.primaryLight),
    letterSpacing: 0.6,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    lineHeight: 22,
  },
  expandIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandIconWrapActive: {
    backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.18)', themeColors.primaryGlow),
  },
  faqBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    marginBottom: 14,
  },
  answerText: {
    fontSize: 15,
    color: themeColors.primaryLight,
    lineHeight: 22,
  },
  stillQuestionsSection: {
    maxWidth: 1080,
    marginHorizontal: 'auto',
    width: '100%',
    paddingHorizontal: isMobile ? 16 : 24,
    marginBottom: isMobile ? 36 : 64,
  },
  stillQuestionsCard: {
    backgroundColor: themeColors.adapt('#191C1E', themeColors.surface),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(52, 211, 153, 0.25)', themeColors.border),
    padding: isMobile ? 20 : 28,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  stillIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.15)', themeColors.primaryGlow),
    alignItems: 'center',
    justifyContent: 'center',
  },
  stillTextBlock: {
    flex: 1,
    minWidth: isMobile ? '100%' : 260,
  },
  stillTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    marginBottom: 4,
  },
  stillDesc: {
    fontSize: 14,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    lineHeight: 20,
  },
  stillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: themeColors.action,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  stillBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.adapt('#0B130E', themeColors.actionText),
  },
  });
};

