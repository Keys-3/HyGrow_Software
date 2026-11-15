import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BookOpen,
  Search,
  Clock,
  Calendar,
  User,
  ArrowRight,
  X,
  Share2,
  Sparkles,
  Tag,
} from 'lucide-react-native';
import { PublicHeader } from '../src/components/public/PublicHeader';
import { PublicFooter } from '../src/components/public/PublicFooter';
import { PressableScale } from '../src/components/PressableScale';
import { useThemeColors } from '../src/theme/theme';

const ARTICLES = [
  {
    id: 'mastering-vpd',
    title: 'Mastering Vapor Pressure Deficit (VPD) in Closed-Loop Hydroponics',
    category: 'Agronomy',
    readTime: '6 min read',
    date: 'Nov 12, 2026',
    author: 'Dr. Aris Thorne',
    authorRole: 'Head of Crop Science',
    image: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800&q=80',
    excerpt: 'Why measuring temperature and relative humidity separately fails crop transpiration, and how targeting a 0.8–1.2 kPa VPD window accelerates calcium translocation.',
    content: [
      'In high-density hydroponic cultivation, relative humidity (RH) is rarely an accurate proxy for crop transpiration stress. Plants experience microclimatic boundary layers governed primarily by Vapor Pressure Deficit (VPD) — the difference between the moisture pressure inside the saturated foliar stomata and the ambient canopy air.',
      'When VPD drops below 0.4 kPa, ambient air is near saturation. Transpiration slows to a crawl, stalling xylem flow and preventing calcium from reaching new leaf tips — directly triggering tip-burn in leafy greens and blossom-end rot in fruiting crops.',
      'Conversely, when VPD exceeds 1.5 kPa in warm greenhouses, stomata close defensively to prevent dehydration, starving the photosynthetic machinery of ambient CO2. HyGrow autonomous telemetry continuously fuses dry-bulb temperature, leaf temperature, and capacitive humidity sensors to modulate misting nozzles and exhaust louvers in real-time, locking VPD into the golden 0.9–1.1 kPa band.',
    ],
  },
  {
    id: 'sub-milli-ec',
    title: 'Sub-Millisiemens Precision: The Mathematics of Ion Absorption',
    category: 'Agronomy',
    readTime: '8 min read',
    date: 'Nov 08, 2026',
    author: 'Elena Rostova',
    authorRole: 'Lead Hydro-Chemist',
    image: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=800&q=80',
    excerpt: 'Deconstructing electrical conductivity curves, selective ion uptake, and avoiding osmotic shock in recirculating nutrient reservoirs.',
    content: [
      'Electrical Conductivity (EC) quantifies total dissolved mineral salts in water. However, plants do not absorb nutrients uniformly; nitrate (NO3-) and potassium (K+) are often absorbed far faster than calcium (Ca2+) or sulfate (SO4 2-).',
      'Over a 7-day recirculation cycle, an EC reading of 1.8 mS/cm may look healthy on a generic meter, but 40% of the ionic pool may have shifted into unusable sulfate ballast. This phenomenon, known as "phantom EC", causes acute potassium deficiency despite normal conductivity readings.',
      'HyGrow intelligent dosing software accounts for cumulative plant transpiration volume, scheduling scheduled drain-and-dilute pulses before ballast salts induce osmotic shock in delicate root hairs.',
    ],
  },
  {
    id: 'edge-ai-pathogens',
    title: 'Edge-AI Foliar Recognition: Detecting Pathogens 48 Hours Before Lesions Form',
    category: 'AI & Vision',
    readTime: '7 min read',
    date: 'Nov 03, 2026',
    author: 'Kiran Patel',
    authorRole: 'Computer Vision Architect',
    image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80',
    excerpt: 'How localized convolutional neural networks and multi-spectral indices spot microscopic Pythium and Powdery Mildew before crop-wide damage occurs.',
    content: [
      'Visual scouting in commercial greenhouses is labor-intensive and inherently reactive: by the time an agronomist sees yellow chlorotic blotches or powdery mildew sporulation, millions of fungal spores have already dispersed throughout the ventilation stream.',
      'HyGrow Quantum Vision scanner captures high-resolution canopy photography, extracting color-channel ratios that highlight early chlorophyll breakdown and moisture loss in the spongy mesophyll layer.',
      'Because inference executes directly on the greenhouse gateway, growers receive immediate alerts with organic treatment recipes (such as potassium bicarbonate foliar sprays or Bacillus subtilis inoculants) with zero delay.',
    ],
  },
  {
    id: 'offline-first-iot',
    title: 'Surviving Power & Wi-Fi Dropouts with Offline-First IoT Firmware',
    category: 'IoT Engineering',
    readTime: '5 min read',
    date: 'Oct 28, 2026',
    author: 'Devin Vance',
    authorRole: 'Embedded Firmware Lead',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
    excerpt: 'Architecting ESP32-S3 controllers with ring buffers, flash wear-leveling, and local PID fallback loops when cloud connections sever.',
    content: [
      'Agricultural facilities are notorious for hostile electrical grids and patchy rural cellular coverage. If a smart controller depends on constant cloud round-trips to turn on an irrigation pump, a 20-minute router reboot can desiccate an entire rack of sensitive Butterhead lettuce.',
      'HyGrow S3 firmware is designed strictly "offline-first". All vital dosing, lighting, and aeration schedules execute within local FreeRTOS tasks. Telemetry readings write into a local ring-buffer flash partition capable of buffering 72 hours of continuous readings.',
      'The moment internet connectivity is restored, the gateway performs authenticated delta-syncing with cloud Firestore, preventing gaps in historical analytics without duplicating observations.',
    ],
  },
  {
    id: 'zero-pesticide-urban',
    title: 'Zero Pesticides, 12-Hour Farm-to-Door: The Hyperlocal Produce Model',
    category: 'Farm Economics',
    readTime: '6 min read',
    date: 'Oct 20, 2026',
    author: 'Nisha Sundaram',
    authorRole: 'Supply Chain Director',
    image: 'https://images.unsplash.com/photo-1595858273617-e4318ee47683?w=800&q=80',
    excerpt: 'Eliminating the 2,000-kilometer cold-chain: how decentralized hydroponic polyhouses deliver fresher, nutrient-dense produce directly to consumers.',
    content: [
      'Supermarket produce spends an average of 4 to 8 days in refrigerated shipping containers, during which vitamin C and volatile terpenes degrade by up to 50%.',
      'By placing closed-loop hydroponic polyhouses within 25 kilometers of metropolitan centers and linking inventory directly to local buyers via HyGrow Market, harvest-to-table transit drops under 12 hours.',
      'The produce retains its living root ball, eliminating the need for post-harvest chemical washing or artificial preservatives.',
    ],
  },
];

const CATEGORIES = ['All', 'Agronomy', 'AI & Vision', 'IoT Engineering', 'Farm Economics'];

export default function BlogsScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [activeArticle, setActiveArticle] = useState(null);

  const filteredArticles = ARTICLES.filter((article) => {
    const matchesCategory =
      activeCategory === 'All' || article.category.toLowerCase() === activeCategory.toLowerCase();
    const query = search.toLowerCase();
    const matchesSearch =
      article.title.toLowerCase().includes(query) ||
      article.excerpt.toLowerCase().includes(query) ||
      article.author.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, title: 'Agronomy & Technology Blog | HyGrow' }} />
      <PublicHeader activeRoute="blogs" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <LinearGradient colors={themeColors.globalBackground} style={styles.heroGradient}>
            <View style={styles.heroBadge}>
              <BookOpen size={12} color={themeColors.primary} />
              <Text style={styles.heroBadgeText}>AGRONOMY & NATURE-TECH RESEARCH</Text>
            </View>
            <Text style={styles.heroTitle}>
              HyGrow <Text style={styles.heroTitleAccent}>Research & Knowledge</Text>
            </Text>
            <Text style={styles.heroSub}>
              Deep-dive investigations into closed-loop nutrient science, microclimate transpiration, edge AI foliar vision, and vertical farm engineering.
            </Text>
          </LinearGradient>
        </View>

        {/* Filter and Search Bar */}
        <View style={styles.filterSection}>
          <View style={styles.searchBox}>
            <Search size={16} color={themeColors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search agronomy papers, IoT guides, authors..."
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

        {/* Articles Grid */}
        <View style={styles.articlesGrid}>
          {filteredArticles.map((article) => (
            <PressableScale
              key={article.id}
              style={styles.articleCard}
              onPress={() => setActiveArticle(article)}
              activeScale={0.98}
            >
              <View style={styles.articleImageWrap}>
                <Image source={{ uri: article.image }} style={styles.articleImage} resizeMode="cover" />
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{article.category}</Text>
                </View>
              </View>

              <View style={styles.articleBody}>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Calendar size={12} color={themeColors.textSecondary} />
                    <Text style={styles.metaText}>{article.date}</Text>
                  </View>
                  <Text style={styles.metaDot}>•</Text>
                  <View style={styles.metaItem}>
                    <Clock size={12} color={themeColors.textSecondary} />
                    <Text style={styles.metaText}>{article.readTime}</Text>
                  </View>
                </View>

                <Text style={styles.articleTitle}>{article.title}</Text>
                <Text style={styles.articleExcerpt} numberOfLines={3}>
                  {article.excerpt}
                </Text>

                <View style={styles.authorRow}>
                  <View style={styles.authorAvatar}>
                    <User size={13} color={themeColors.primary} />
                  </View>
                  <View>
                    <Text style={styles.authorName}>{article.author}</Text>
                    <Text style={styles.authorRole}>{article.authorRole}</Text>
                  </View>
                  <View style={styles.readMoreArrow}>
                    <ArrowRight size={14} color={themeColors.primary} />
                  </View>
                </View>
              </View>
            </PressableScale>
          ))}
        </View>

        <PublicFooter />
      </ScrollView>

      {/* Article Detail Reading Modal */}
      {activeArticle && (
        <Modal
          visible={!!activeArticle}
          animationType="fade"
          transparent
          onRequestClose={() => setActiveArticle(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalBadge}>
                  <Tag size={12} color={themeColors.primary} />
                  <Text style={styles.modalBadgeText}>{activeArticle.category}</Text>
                </View>
                <PressableScale
                  style={styles.closeBtn}
                  onPress={() => setActiveArticle(null)}
                  activeScale={0.92}
                >
                  <X size={18} color={themeColors.adapt('#F8FAF8', themeColors.text)} />
                </PressableScale>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                <Image
                  source={{ uri: activeArticle.image }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />

                <Text style={styles.modalTitle}>{activeArticle.title}</Text>

                <View style={styles.modalAuthorRow}>
                  <View style={styles.authorAvatarLarge}>
                    <User size={16} color={themeColors.primary} />
                  </View>
                  <View>
                    <Text style={styles.modalAuthorName}>{activeArticle.author}</Text>
                    <Text style={styles.modalAuthorRole}>{activeArticle.authorRole} · {activeArticle.date}</Text>
                  </View>
                </View>

                <View style={styles.articleDivider} />

                {activeArticle.content.map((paragraph, pIdx) => (
                  <Text key={pIdx} style={styles.articleParagraph}>
                    {paragraph}
                  </Text>
                ))}

                <View style={styles.modalActions}>
                  <PressableScale
                    style={styles.doneBtn}
                    onPress={() => setActiveArticle(null)}
                    activeScale={0.96}
                  >
                    <Text style={styles.doneBtnText}>Close Article</Text>
                  </PressableScale>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const createStyles = (themeColors) => StyleSheet.create({
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
    color: themeColors.adapt('#34D399', themeColors.primaryLight),
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 34,
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
    fontSize: 15,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 720,
  },
  filterSection: {
    maxWidth: 1240,
    marginHorizontal: 'auto',
    width: '100%',
    paddingHorizontal: 24,
    marginBottom: 36,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.adapt('#0C1B12', themeColors.surface),
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
    fontSize: 14,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catPill: {
    backgroundColor: themeColors.adapt('#0C1B12', themeColors.surface),
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
    fontSize: 12,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    fontWeight: '600',
  },
  catPillTextActive: {
    color: themeColors.adapt('#0B130E', themeColors.actionText),
    fontWeight: '700',
  },
  articlesGrid: {
    maxWidth: 1240,
    marginHorizontal: 'auto',
    width: '100%',
    paddingHorizontal: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    marginBottom: 64,
  },
  articleCard: {
    backgroundColor: themeColors.adapt('#0C1B12', themeColors.surface),
    borderRadius: 18,
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(52, 211, 153, 0.2)', themeColors.border),
    overflow: 'hidden',
    flex: 1,
    minWidth: 320,
    maxWidth: 390,
  },
  articleImageWrap: {
    height: 190,
    position: 'relative',
    backgroundColor: themeColors.adapt('#050D08', themeColors.surfaceMuted),
  },
  articleImage: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(8, 18, 13, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(52, 211, 153, 0.3)', themeColors.border),
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: themeColors.adapt('#34D399', themeColors.primaryLight),
  },
  articleBody: {
    padding: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
  },
  metaDot: {
    color: '#4B5563',
    fontSize: 10,
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    lineHeight: 24,
    marginBottom: 8,
  },
  articleExcerpt: {
    fontSize: 13,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
    lineHeight: 20,
    marginBottom: 18,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(52, 211, 153, 0.1)',
  },
  authorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.15)', themeColors.primaryGlow),
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorName: {
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
  },
  authorRole: {
    fontSize: 10,
    color: themeColors.adapt('#687D70', themeColors.textMuted),
  },
  readMoreArrow: {
    marginLeft: 'auto',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: themeColors.adapt('#0C1B12', themeColors.surface),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: themeColors.adapt('rgba(52, 211, 153, 0.3)', themeColors.border),
    maxWidth: 760,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(52, 211, 153, 0.15)',
  },
  modalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: themeColors.adapt('#34D399', themeColors.primaryLight),
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalScroll: {
    padding: 24,
  },
  modalImage: {
    width: '100%',
    height: 240,
    borderRadius: 14,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
    lineHeight: 32,
    marginBottom: 14,
  },
  modalAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  authorAvatarLarge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: themeColors.adapt('rgba(16, 185, 129, 0.18)', themeColors.primaryGlow),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAuthorName: {
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.adapt('#F8FAF8', themeColors.text),
  },
  modalAuthorRole: {
    fontSize: 11,
    color: themeColors.adapt('#9CB0A2', themeColors.textSecondary),
  },
  articleDivider: {
    height: 1,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    marginVertical: 18,
  },
  articleParagraph: {
    fontSize: 14,
    color: themeColors.primaryLight,
    lineHeight: 24,
    marginBottom: 16,
  },
  modalActions: {
    marginTop: 20,
    alignItems: 'center',
  },
  doneBtn: {
    backgroundColor: themeColors.action,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.adapt('#0B130E', themeColors.actionText),
  },
});

