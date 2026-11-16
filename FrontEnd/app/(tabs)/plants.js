import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Image as ImageIcon,
  Plus,
  X,
  Calendar,
  Clock,
  Thermometer,
  Droplets,
  Zap,
  Sun,
  Activity,
  Trash2,
  CheckCircle2,
  Search,
  Filter,
  Layers,
  Sparkles,
  Info,
  Database,
  ArrowUpDown,
  Check,
  Sprout,
} from 'lucide-react-native';
import { usePlantProfiles } from '../../src/hooks/usePlantProfiles';
import useEffectiveSensorData from '../../src/hooks/useEffectiveSensorData';
import { useThemeColors, borderRadius, spacing } from '../../src/theme/theme';
import AtmosphericBackground from '../../src/components/AtmosphericBackground';
import { PressableScale } from '../../src/components/PressableScale';
import { getSeasonForDate } from '../../src/utils/annualSensorLogs';

const GROWTH_STAGES = ['Seedling', 'Vegetative', 'Flowering', 'Fruiting', 'Harvest Ready'];

const METRIC_TABS = [
  { id: 'temperature', label: 'Air Temp', unit: '°C', icon: Thermometer, color: '#EF4444' },
  { id: 'humidity', label: 'Humidity', unit: '%', icon: Droplets, color: '#3B82F6' },
  { id: 'ph', label: 'pH Level', unit: '', icon: Sparkles, color: '#10B981' },
  { id: 'ec', label: 'EC Level', unit: 'mS', icon: Zap, color: '#F59E0B' },
  { id: 'waterTemp', label: 'Water Temp', unit: '°C', icon: Droplets, color: '#06B6D4' },
  { id: 'lightIntensity', label: 'Light', unit: 'Lux', icon: Sun, color: '#FBBF24' },
  { id: 'vpd', label: 'VPD', unit: 'kPa', icon: Activity, color: '#EC4899' },
];

const TIME_RANGES = [
  { id: '365d', label: 'All 365 Days (1 Year)' },
  { id: '180d', label: 'Past 180 Days' },
  { id: '90d', label: 'Past 90 Days' },
  { id: '30d', label: 'Past 30 Days' },
];

const SEASONS = ['All', 'Spring', 'Summer', 'Autumn', 'Winter'];

export default function PlantPhotosScreen() {
  const { width } = useWindowDimensions();
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors, width), [themeColors, width]);

  // Dedicated Plant Profiles & 1-Year Telemetry Hook
  const {
    profiles,
    activePlantId,
    setActivePlantId,
    activeProfile,
    activePlantAnnualReadings,
    activePlantGrowthPhotos,
    activePlantStats,
    loading,
    syncing,
    addGrowthPhotoToPlant,
    seedProfilesToDatabase,
  } = usePlantProfiles();

  const { current: telemetry } = useEffectiveSensorData();

  // Active sub-tab inside selected plant profile ('photos' | 'telemetry' | 'specs')
  const [profileTab, setProfileTab] = useState('photos');

  // Telemetry metric switcher
  const [selectedMetric, setSelectedMetric] = useState('temperature');
  const [timeRange, setTimeRange] = useState('365d');
  const [seasonFilter, setSeasonFilter] = useState('All');
  const [complianceFilter, setComplianceFilter] = useState('all'); // 'all' | 'optimal' | 'deviation'

  // Photo gallery filter
  const [stageFilter, setStageFilter] = useState('All');
  const [photoSearch, setPhotoSearch] = useState('');

  // Upload modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [targetPlantId, setTargetPlantId] = useState(activePlantId);
  const [selectedImage, setSelectedImage] = useState(null); // { uri, base64 }
  const [stage, setStage] = useState('Vegetative');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  // Detailed inspect modal state (for either a growth photo or a weekly reading)
  const [inspectItem, setInspectItem] = useState(null);

  // Keep targetPlantId in sync with activePlantId when opening upload modal
  const openUploadModal = (plantId) => {
    setTargetPlantId(plantId || activePlantId);
    setModalVisible(true);
  };

  // Image pickers
  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Gallery access is required to choose plant photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.75,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage({
          uri: asset.uri,
          base64: asset.base64,
        });
      }
    } catch (e) {
      console.warn('Gallery pick error:', e);
      Alert.alert('Image Selection Failed', 'Could not open image library.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to capture photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.75,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage({
          uri: asset.uri,
          base64: asset.base64,
        });
      }
    } catch (e) {
      console.warn('Camera capture error:', e);
      Alert.alert('Camera Error', 'Could not access the camera device.');
    }
  };

  // Submit and save growth photo to active plant profile
  const handleSaveGrowthPhoto = async () => {
    if (!selectedImage?.uri) {
      Alert.alert('Missing Photo', 'Please take or select a plant photo first.');
      return;
    }

    try {
      setUploading(true);
      const currentReadings = {
        temperature: telemetry?.temperature ?? 24.2,
        humidity: telemetry?.humidity ?? 64,
        ph: telemetry?.ph ?? 6.1,
        ec: telemetry?.ec ?? 1.4,
        tds: telemetry?.tds ?? 700,
        waterTemp: telemetry?.waterTemp ?? 21.0,
        waterLevel: telemetry?.waterLevel ?? 82,
        lightIntensity: telemetry?.lightIntensity ?? 12500,
        vpd: telemetry?.vpd ?? 1.05,
      };

      await addGrowthPhotoToPlant({
        plantId: targetPlantId,
        stage,
        imageUrl: selectedImage.uri,
        notes: notes.trim(),
        readings: currentReadings,
      });

      setSelectedImage(null);
      setNotes('');
      setModalVisible(false);

      const savedPlant = profiles.find((p) => p.id === targetPlantId);
      const msg = `Growth photo and locked sensor telemetry saved to ${savedPlant ? savedPlant.name : 'plant profile'} successfully!`;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert('Photo Saved', msg);
      }
    } catch (e) {
      Alert.alert('Save Error', e.message || 'Failed to save growth photo.');
    } finally {
      setUploading(false);
    }
  };

  // Seed 1-Year Database Archive
  const handleSyncDatabaseClick = async () => {
    const doSync = async () => {
      try {
        const result = await seedProfilesToDatabase();
        const msg = `Successfully synced ${result.profilesCount} plant profiles and ${result.readingsCount} weekly sensor readings spanning 1 full year (365 days) into your database!`;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(msg);
        } else {
          Alert.alert('Database Sync Complete', msg);
        }
      } catch (err) {
        const errMsg = err?.message || 'Failed to sync 1-year telemetry to database.';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(errMsg);
        } else {
          Alert.alert('Sync Failed', errMsg);
        }
      }
    };

    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined'
        ? window.confirm('Sync all plant item profiles and 1 year (52 weekly records) of sensor telemetry into the Firestore database?')
        : true;
      if (ok) await doSync();
      return;
    }

    Alert.alert(
      'Sync 1-Year Telemetry to Database',
      'Store all 8 plant item profiles with 1 year (52 weekly records) of continuous sensor telemetry into your database?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sync Database', onPress: doSync },
      ]
    );
  };

  // Filtered photos for active plant
  const filteredPhotos = useMemo(() => {
    return activePlantGrowthPhotos.filter((p) => {
      if (stageFilter !== 'All' && p.stage !== stageFilter) return false;
      if (photoSearch) {
        const q = photoSearch.toLowerCase();
        const matchNotes = p.notes && p.notes.toLowerCase().includes(q);
        const matchStage = p.stage.toLowerCase().includes(q);
        if (!matchNotes && !matchStage) return false;
      }
      return true;
    });
  }, [activePlantGrowthPhotos, stageFilter, photoSearch]);

  // Filtered annual telemetry records for active plant
  const filteredTelemetry = useMemo(() => {
    const now = Date.now();
    const daysLimit = timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : timeRange === '180d' ? 180 : 365;
    const cutoffTime = now - daysLimit * 86400000;

    return activePlantAnnualReadings.filter((record) => {
      const recTime = new Date(record.timestamp).getTime();
      if (recTime < cutoffTime) return false;
      if (seasonFilter !== 'All' && record.season !== seasonFilter) return false;
      if (complianceFilter === 'optimal' && !record.isOptimal) return false;
      if (complianceFilter === 'deviation' && record.isOptimal) return false;
      return true;
    });
  }, [activePlantAnnualReadings, timeRange, seasonFilter, complianceFilter]);

  // Active metric config
  const activeMetricDef = useMemo(() => {
    return METRIC_TABS.find((m) => m.id === selectedMetric) || METRIC_TABS[0];
  }, [selectedMetric]);

  // Threshold range for active metric for the selected plant
  const currentThreshold = useMemo(() => {
    if (!activeProfile?.optimalThresholds) return null;
    return activeProfile.optimalThresholds[selectedMetric] || null;
  }, [activeProfile, selectedMetric]);

  const isWide = width >= 800;

  return (
    <AtmosphericBackground style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Banner */}
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <View style={styles.badgeRow}>
              <View style={styles.badgePill}>
                <Sprout size={13} color={themeColors.primary} />
                <Text style={styles.badgeText}>PLANT ITEM PROFILES</Text>
              </View>
              <View style={styles.syncPill}>
                <View style={styles.syncDot} />
                <Text style={styles.syncText}>1-YEAR SENSOR ARCHIVE</Text>
              </View>
            </View>
            <Text style={styles.title}>Plant Growth Profiles & 1-Yr Telemetry</Text>
            <Text style={styles.subtitle}>
              Access 1 full year of continuous hardware sensor readings for each plant grown, paired with chronological growth photos uploaded throughout cultivation.
            </Text>
          </View>

          <View style={styles.headerActions}>
            <PressableScale
              style={styles.addBtn}
              onPress={() => openUploadModal(activePlantId)}
              activeScale={0.96}
            >
              <Camera size={16} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.addBtnText}>Log Growth Photo</Text>
            </PressableScale>

            <PressableScale
              style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
              onPress={handleSyncDatabaseClick}
              disabled={syncing}
              activeScale={0.96}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Database size={15} color="#FFFFFF" strokeWidth={2.2} />
              )}
              <Text style={styles.syncBtnText}>
                {syncing ? 'Syncing...' : 'Sync 1-Yr Data'}
              </Text>
            </PressableScale>
          </View>
        </View>

        {/* 1. PLANT ITEM PROFILES SELECTOR RIBBON */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionTitle}>Select Plant Item Profile</Text>
            <Text style={styles.sectionSubtitle}>
              {profiles.length} agricultural crops grown with dedicated 1-year sensor telemetry
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.plantRibbonScroll}
        >
          {profiles.map((plant) => {
            const isSelected = plant.id === activePlantId;
            return (
              <PressableScale
                key={plant.id}
                style={[
                  styles.plantRibbonCard,
                  isSelected && styles.plantRibbonCardActive,
                ]}
                onPress={() => {
                  setActivePlantId(plant.id);
                  setTargetPlantId(plant.id);
                }}
                activeScale={0.97}
              >
                <Image
                  source={{ uri: plant.imageUrl }}
                  style={styles.plantRibbonImage}
                  resizeMode="cover"
                />
                <View style={styles.plantRibbonInfo}>
                  <View style={styles.plantRibbonTop}>
                    <Text
                      style={[
                        styles.plantRibbonName,
                        isSelected && styles.plantRibbonNameActive,
                      ]}
                      numberOfLines={1}
                    >
                      {plant.name}
                    </Text>
                    <View
                      style={[
                        styles.plantRibbonStageBadge,
                        isSelected && styles.plantRibbonStageBadgeActive,
                      ]}
                    >
                      <Text style={styles.plantRibbonStageText}>
                        {plant.currentStage}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.plantRibbonVariety} numberOfLines={1}>
                    {plant.variety}
                  </Text>
                  <Text style={styles.plantRibbonZone} numberOfLines={1}>
                    📍 {plant.zone}
                  </Text>
                </View>

                {isSelected ? (
                  <View style={styles.activeProfileIndicator}>
                    <Check size={12} color="#FFFFFF" strokeWidth={3} />
                  </View>
                ) : null}
              </PressableScale>
            );
          })}
        </ScrollView>

        {/* 2. SELECTED PLANT PROFILE HERO CARD */}
        <View style={styles.profileHeroCard}>
          <View style={styles.profileHeroTop}>
            <Image
              source={{ uri: activeProfile.imageUrl }}
              style={styles.profileHeroImage}
              resizeMode="cover"
            />
            <View style={styles.profileHeroDetails}>
              <View style={styles.profileHeroHeaderRow}>
                <View style={styles.profileCategoryPill}>
                  <Text style={styles.profileCategoryText}>{activeProfile.category}</Text>
                </View>
                <View style={styles.profileStagePill}>
                  <Text style={styles.profileStageText}>{activeProfile.currentStage}</Text>
                </View>
              </View>

              <Text style={styles.profileHeroTitle}>{activeProfile.name}</Text>
              <Text style={styles.profileHeroVariety}>
                {activeProfile.variety} • <Text style={styles.profileHeroZone}>{activeProfile.zone}</Text>
              </Text>

              <View style={styles.profileMetadataRow}>
                <View style={styles.profileMetaItem}>
                  <Calendar size={13} color={themeColors.textSecondary} />
                  <Text style={styles.profileMetaText}>
                    Planted {new Date(activeProfile.plantingDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.profileMetaItem}>
                  <Clock size={13} color={themeColors.textSecondary} />
                  <Text style={styles.profileMetaText}>
                    {activePlantStats.daysGrown} Days Cultivated • {activeProfile.harvestCycleDays}-Day Cycle
                  </Text>
                </View>
              </View>

              <Text style={styles.profileNotesText} numberOfLines={2}>
                {activeProfile.notes}
              </Text>
            </View>
          </View>

          {/* Plant's 1-Year Historical Sensor Summary Strip */}
          <View style={styles.profileStatsBanner}>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatLabel}>1-YR AVG TEMP</Text>
              <Text style={styles.profileStatValue}>{activePlantStats.avgTemp}°C</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatLabel}>1-YR AVG RH</Text>
              <Text style={styles.profileStatValue}>{activePlantStats.avgHumidity}%</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatLabel}>1-YR AVG pH</Text>
              <Text style={styles.profileStatValue}>{activePlantStats.avgPh}</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatLabel}>1-YR AVG EC</Text>
              <Text style={styles.profileStatValue}>{activePlantStats.avgEc} mS</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatLabel}>1-YR WATER</Text>
              <Text style={styles.profileStatValue}>{activePlantStats.avgWaterTemp}°C</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatLabel}>COMPLIANCE</Text>
              <Text style={[styles.profileStatValue, { color: '#10B981' }]}>
                {activePlantStats.optimalCompliancePercent}%
              </Text>
            </View>
          </View>
        </View>

        {/* 3. SUB-NAVIGATION TABS INSIDE PLANT PROFILE */}
        <View style={styles.tabNavRow}>
          <Pressable
            style={[styles.tabNavButton, profileTab === 'photos' && styles.tabNavButtonActive]}
            onPress={() => setProfileTab('photos')}
          >
            <Camera size={15} color={profileTab === 'photos' ? themeColors.primary : themeColors.textSecondary} />
            <Text style={[styles.tabNavText, profileTab === 'photos' && styles.tabNavTextActive]}>
              Growth Photos ({activePlantGrowthPhotos.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabNavButton, profileTab === 'telemetry' && styles.tabNavButtonActive]}
            onPress={() => setProfileTab('telemetry')}
          >
            <Activity size={15} color={profileTab === 'telemetry' ? themeColors.primary : themeColors.textSecondary} />
            <Text style={[styles.tabNavText, profileTab === 'telemetry' && styles.tabNavTextActive]}>
              1-Year Telemetry ({activePlantAnnualReadings.length} Wks)
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabNavButton, profileTab === 'specs' && styles.tabNavButtonActive]}
            onPress={() => setProfileTab('specs')}
          >
            <Sparkles size={15} color={profileTab === 'specs' ? themeColors.primary : themeColors.textSecondary} />
            <Text style={[styles.tabNavText, profileTab === 'specs' && styles.tabNavTextActive]}>
              Optimal Specs
            </Text>
          </Pressable>
        </View>

        {/* TAB CONTENT 1: GROWTH PHOTOS FOR THIS PLANT */}
        {profileTab === 'photos' && (
          <View style={styles.tabContentContainer}>
            {/* Filter Bar for Photos */}
            <View style={styles.filterCard}>
              <View style={styles.searchBar}>
                <Search size={15} color={themeColors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Search ${activeProfile.name} growth photos & notes...`}
                  placeholderTextColor={themeColors.textMuted}
                  value={photoSearch}
                  onChangeText={setPhotoSearch}
                />
                {photoSearch ? (
                  <Pressable onPress={() => setPhotoSearch('')}>
                    <X size={15} color={themeColors.textMuted} />
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.filterSubRow}>
                <Text style={styles.filterRowLabel}>Stage Filter:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollRow}>
                  {['All', ...GROWTH_STAGES].map((st) => {
                    const isSelected = stageFilter === st;
                    return (
                      <Pressable
                        key={st}
                        style={[styles.stageFilterPill, isSelected && styles.stageFilterPillActive]}
                        onPress={() => setStageFilter(st)}
                      >
                        <Text style={[styles.stageFilterText, isSelected && styles.stageFilterTextActive]}>
                          {st}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Photos Grid */}
            {filteredPhotos.length === 0 ? (
              <View style={styles.emptyState}>
                <ImageIcon size={38} color={themeColors.primary} />
                <Text style={styles.emptyTitle}>No Photos for this Stage</Text>
                <Text style={styles.emptySub}>
                  No growth snapshots match your filter for {activeProfile.name}. Upload one to record canopy progress!
                </Text>
                <PressableScale
                  style={styles.emptyActionBtn}
                  onPress={() => openUploadModal(activeProfile.id)}
                >
                  <Plus size={15} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.emptyActionText}>Take Growth Photo</Text>
                </PressableScale>
              </View>
            ) : (
              <View style={[styles.photoGrid, isWide && styles.photoGridWide]}>
                {filteredPhotos.map((photo) => (
                  <GrowthPhotoCard
                    key={photo.id}
                    photo={photo}
                    plantProfile={activeProfile}
                    colors={themeColors}
                    onInspect={() => setInspectItem({ type: 'photo', data: photo })}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* TAB CONTENT 2: 1-YEAR SENSOR TELEMETRY FOR THIS PLANT */}
        {profileTab === 'telemetry' && (
          <View style={styles.tabContentContainer}>
            {/* Metric Switcher Ribbon */}
            <View style={styles.metricSwitcherCard}>
              <View style={styles.metricSwitcherHeader}>
                <Text style={styles.metricSwitcherTitle}>Select Hardware Sensor Telemetry Metric</Text>
                <Text style={styles.metricSwitcherSub}>
                  52 weekly continuous records across 365 days calibrated specifically for {activeProfile.name}
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.metricPillsRow}
              >
                {METRIC_TABS.map((m) => {
                  const isSelected = selectedMetric === m.id;
                  const Icon = m.icon;
                  return (
                    <Pressable
                      key={m.id}
                      style={[
                        styles.metricPillBtn,
                        isSelected && { borderColor: m.color, backgroundColor: m.color + '15' },
                      ]}
                      onPress={() => setSelectedMetric(m.id)}
                    >
                      <Icon size={14} color={isSelected ? m.color : themeColors.textSecondary} />
                      <Text
                        style={[
                          styles.metricPillBtnText,
                          isSelected && { color: m.color, fontWeight: '800' },
                        ]}
                      >
                        {m.label} {m.unit ? `(${m.unit})` : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Threshold Target Callout */}
              {currentThreshold ? (
                <View style={[styles.metricThresholdBox, { borderColor: activeMetricDef.color + '40' }]}>
                  <View style={styles.thresholdLeft}>
                    <activeMetricDef.icon size={16} color={activeMetricDef.color} />
                    <Text style={styles.thresholdText}>
                      Optimal Range for {activeProfile.name}:{' '}
                      <Text style={{ fontWeight: '800', color: themeColors.text }}>
                        {currentThreshold.min} – {currentThreshold.max} {activeMetricDef.unit}
                      </Text>
                    </Text>
                  </View>
                  <View style={styles.complianceChip}>
                    <Text style={styles.complianceChipText}>
                      {activePlantStats.optimalCompliancePercent}% Annual In-Range
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Timeframe & Season Filters for Telemetry */}
            <View style={styles.telemetryFiltersCard}>
              <View style={styles.filterSubRow}>
                <Text style={styles.filterRowLabel}>Timeframe:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollRow}>
                  {TIME_RANGES.map((tr) => (
                    <Pressable
                      key={tr.id}
                      style={[styles.stageFilterPill, timeRange === tr.id && styles.stageFilterPillActive]}
                      onPress={() => setTimeRange(tr.id)}
                    >
                      <Text style={[styles.stageFilterText, timeRange === tr.id && styles.stageFilterTextActive]}>
                        {tr.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.filterSubRow}>
                <Text style={styles.filterRowLabel}>Season:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollRow}>
                  {SEASONS.map((s) => (
                    <Pressable
                      key={s}
                      style={[styles.stageFilterPill, seasonFilter === s && styles.stageFilterPillActive]}
                      onPress={() => setSeasonFilter(s)}
                    >
                      <Text style={[styles.stageFilterText, seasonFilter === s && styles.stageFilterTextActive]}>
                        {s === 'Spring' ? '🌸 ' : s === 'Summer' ? '☀️ ' : s === 'Autumn' ? '🍁 ' : s === 'Winter' ? '❄️ ' : ''}{s}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.filterSubRow}>
                <Text style={styles.filterRowLabel}>Status:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollRow}>
                  {[
                    { id: 'all', label: 'All Telemetry' },
                    { id: 'optimal', label: 'Optimal Readings Only' },
                    { id: 'deviation', label: 'Deviations Only' },
                  ].map((st) => (
                    <Pressable
                      key={st.id}
                      style={[styles.stageFilterPill, complianceFilter === st.id && styles.stageFilterPillActive]}
                      onPress={() => setComplianceFilter(st.id)}
                    >
                      <Text style={[styles.stageFilterText, complianceFilter === st.id && styles.stageFilterTextActive]}>
                        {st.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Telemetry Weekly Rows Table */}
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableCountText}>
                Showing {filteredTelemetry.length} weekly records for {activeProfile.name}
              </Text>
            </View>

            <View style={styles.telemetryTable}>
              {filteredTelemetry.map((rec) => {
                const metricVal = rec[selectedMetric];
                const isOptimalReading = rec.isOptimal;
                const recDate = new Date(rec.timestamp).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const seasonEmoji =
                  rec.season === 'Spring' ? '🌸' : rec.season === 'Summer' ? '☀️' : rec.season === 'Autumn' ? '🍁' : '❄️';

                return (
                  <PressableScale
                    key={rec.id}
                    style={styles.telemetryRowCard}
                    onPress={() =>
                      setInspectItem({
                        type: 'reading',
                        data: {
                          plantName: activeProfile.name,
                          stage: rec.stage,
                          timestamp: rec.timestamp,
                          notes: `Week ${rec.weekNumber} continuous agricultural telemetry for ${activeProfile.name} (${activeProfile.zone}).`,
                          imageUrl: activeProfile.imageUrl,
                          readings: {
                            temperature: rec.temperature,
                            humidity: rec.humidity,
                            ph: rec.ph,
                            ec: rec.ec,
                            tds: rec.tds,
                            waterTemp: rec.waterTemp,
                            waterLevel: rec.waterLevel,
                            lightIntensity: rec.lightIntensity,
                            vpd: rec.vpd,
                          },
                        },
                      })
                    }
                    activeScale={0.99}
                  >
                    <View style={styles.telemetryRowLeft}>
                      <View style={styles.weekBadge}>
                        <Text style={styles.weekBadgeText}>Wk {rec.weekNumber}</Text>
                      </View>
                      <View style={styles.dateAndSeasonWrap}>
                        <Text style={styles.telemetryRowDate}>{recDate}</Text>
                        <Text style={styles.telemetryRowStage}>
                          {seasonEmoji} {rec.season} • {rec.stage}
                        </Text>
                      </View>
                    </View>

                    {/* Primary Highlight Metric */}
                    <View style={styles.primaryMetricCol}>
                      <Text style={[styles.primaryMetricValue, { color: activeMetricDef.color }]}>
                        {typeof metricVal === 'number'
                          ? selectedMetric === 'ph' || selectedMetric === 'ec' || selectedMetric === 'vpd'
                            ? metricVal.toFixed(2)
                            : selectedMetric === 'temperature' || selectedMetric === 'waterTemp'
                            ? metricVal.toFixed(1)
                            : Math.round(metricVal)
                          : metricVal}{' '}
                        <Text style={styles.primaryMetricUnit}>{activeMetricDef.unit}</Text>
                      </Text>
                      <View
                        style={[
                          styles.readingStatusPill,
                          isOptimalReading ? styles.readingStatusOptimal : styles.readingStatusDeviation,
                        ]}
                      >
                        <Text
                          style={[
                            styles.readingStatusText,
                            isOptimalReading ? styles.readingStatusTextOptimal : styles.readingStatusTextDeviation,
                          ]}
                        >
                          {isOptimalReading ? 'OPTIMAL' : 'OFF-TARGET'}
                        </Text>
                      </View>
                    </View>

                    {/* Mini Sensor Strip */}
                    <View style={styles.telemetryRowSensorStrip}>
                      <Text style={styles.miniSensorPill}>🌡️ {rec.temperature.toFixed(1)}°C</Text>
                      <Text style={styles.miniSensorPill}>💧 {Math.round(rec.humidity)}%</Text>
                      <Text style={styles.miniSensorPill}>🧪 pH {rec.ph.toFixed(1)}</Text>
                      <Text style={styles.miniSensorPill}>⚡ {rec.ec.toFixed(2)} mS</Text>
                      <Text style={styles.miniSensorPill}>🌊 {rec.waterTemp.toFixed(1)}°C</Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        )}

        {/* TAB CONTENT 3: OPTIMAL SPECS FOR THIS PLANT */}
        {profileTab === 'specs' && (
          <View style={styles.tabContentContainer}>
            <View style={styles.specsHeroCard}>
              <View style={styles.specsHeroHeader}>
                <Sparkles size={18} color={themeColors.primary} />
                <Text style={styles.specsHeroTitle}>Agronomic Microclimate Specifications for {activeProfile.name}</Text>
              </View>
              <Text style={styles.specsHeroSub}>
                These targets define the optimal hydroponic environment used for automated dosers, climate control, and annual compliance benchmarking.
              </Text>
            </View>

            <View style={styles.specsGrid}>
              <View style={styles.specCard}>
                <View style={[styles.specIconWrap, { backgroundColor: '#EF444415' }]}>
                  <Thermometer size={20} color="#EF4444" />
                </View>
                <Text style={styles.specLabel}>Air Temperature</Text>
                <Text style={styles.specValue}>
                  {activeProfile.optimalThresholds?.temperature?.min} – {activeProfile.optimalThresholds?.temperature?.max} °C
                </Text>
                <Text style={styles.specDesc}>Daytime canopy setpoint for optimal photosynthetic transpiration</Text>
              </View>

              <View style={styles.specCard}>
                <View style={[styles.specIconWrap, { backgroundColor: '#3B82F615' }]}>
                  <Droplets size={20} color="#3B82F6" />
                </View>
                <Text style={styles.specLabel}>Relative Humidity</Text>
                <Text style={styles.specValue}>
                  {activeProfile.optimalThresholds?.humidity?.min} – {activeProfile.optimalThresholds?.humidity?.max} %
                </Text>
                <Text style={styles.specDesc}>Vapor deficit regulator to prevent tipburn and foliar fungal pathogens</Text>
              </View>

              <View style={styles.specCard}>
                <View style={[styles.specIconWrap, { backgroundColor: '#10B98115' }]}>
                  <Sparkles size={20} color="#10B981" />
                </View>
                <Text style={styles.specLabel}>Nutrient Solution pH</Text>
                <Text style={styles.specValue}>
                  {activeProfile.optimalThresholds?.ph?.min} – {activeProfile.optimalThresholds?.ph?.max}
                </Text>
                <Text style={styles.specDesc}>Root bioavailability window for Nitrogen, Phosphorus, Potassium and micronutrients</Text>
              </View>

              <View style={styles.specCard}>
                <View style={[styles.specIconWrap, { backgroundColor: '#F59E0B15' }]}>
                  <Zap size={20} color="#F59E0B" />
                </View>
                <Text style={styles.specLabel}>Electroconductivity (EC)</Text>
                <Text style={styles.specValue}>
                  {activeProfile.optimalThresholds?.ec?.min} – {activeProfile.optimalThresholds?.ec?.max} mS/cm
                </Text>
                <Text style={styles.specDesc}>Salinity index indicating overall dissolved ionic fertilizer strength</Text>
              </View>

              <View style={styles.specCard}>
                <View style={[styles.specIconWrap, { backgroundColor: '#06B6D415' }]}>
                  <Droplets size={20} color="#06B6D4" />
                </View>
                <Text style={styles.specLabel}>Water Reservoir Temperature</Text>
                <Text style={styles.specValue}>
                  {activeProfile.optimalThresholds?.waterTemp?.min} – {activeProfile.optimalThresholds?.waterTemp?.max} °C
                </Text>
                <Text style={styles.specDesc}>Ensures high dissolved oxygen (DO) content and protects rootzone health</Text>
              </View>

              <View style={styles.specCard}>
                <View style={[styles.specIconWrap, { backgroundColor: '#8B5CF615' }]}>
                  <Layers size={20} color="#8B5CF6" />
                </View>
                <Text style={styles.specLabel}>Growing Zone & System</Text>
                <Text style={styles.specValue}>{activeProfile.zone}</Text>
                <Text style={styles.specDesc}>Standard harvest cycle: {activeProfile.harvestCycleDays} days from transplant</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* MODAL: UPLOAD GROWTH PHOTO FOR A PLANT */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Log Growth Photo</Text>
                <Text style={styles.modalSubtitle}>
                  Bind photo with live hardware telemetry to this plant profile
                </Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color={themeColors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              {/* Target Plant Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Target Plant Profile *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.plantTargetScroll}>
                  {profiles.map((p) => {
                    const isTarget = targetPlantId === p.id;
                    return (
                      <Pressable
                        key={p.id}
                        style={[styles.plantTargetPill, isTarget && styles.plantTargetPillActive]}
                        onPress={() => setTargetPlantId(p.id)}
                      >
                        <Text style={[styles.plantTargetText, isTarget && styles.plantTargetTextActive]}>
                          {p.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Photo Area */}
              <View style={styles.photoUploadArea}>
                {selectedImage?.uri ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: selectedImage.uri }} style={styles.previewImg} resizeMode="cover" />
                    <View style={styles.previewActions}>
                      <Pressable style={styles.replaceBtn} onPress={handleTakePhoto}>
                        <Camera size={14} color="#FFFFFF" />
                        <Text style={styles.replaceBtnText}>Retake</Text>
                      </Pressable>
                      <Pressable style={styles.replaceBtn} onPress={handlePickImage}>
                        <ImageIcon size={14} color="#FFFFFF" />
                        <Text style={styles.replaceBtnText}>Library</Text>
                      </Pressable>
                      <Pressable style={[styles.replaceBtn, { backgroundColor: '#EF4444' }]} onPress={() => setSelectedImage(null)}>
                        <X size={14} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.pickButtonsContainer}>
                    <PressableScale style={styles.pickButton} onPress={handleTakePhoto} activeScale={0.96}>
                      <View style={styles.pickIconBadge}>
                        <Camera size={24} color={themeColors.primary} />
                      </View>
                      <Text style={styles.pickTitle}>Take Camera Photo</Text>
                      <Text style={styles.pickSub}>Capture live canopy</Text>
                    </PressableScale>

                    <PressableScale style={styles.pickButton} onPress={handlePickImage} activeScale={0.96}>
                      <View style={styles.pickIconBadge}>
                        <ImageIcon size={24} color={themeColors.primary} />
                      </View>
                      <Text style={styles.pickTitle}>Select from Gallery</Text>
                      <Text style={styles.pickSub}>Choose saved image</Text>
                    </PressableScale>
                  </View>
                )}
              </View>

              {/* Growth Stage Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Growth Stage</Text>
                <View style={styles.stageRow}>
                  {GROWTH_STAGES.map((s) => (
                    <Pressable
                      key={s}
                      style={[styles.stageBtn, stage === s && styles.stageBtnSelected]}
                      onPress={() => setStage(s)}
                    >
                      <Text style={[styles.stageBtnText, stage === s && styles.stageBtnTextSelected]}>
                        {s}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Foliar Notes & Observations</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="e.g. Robust leaf expansion, vibrant chlorophyll pigmentation, zero tipburn"
                  placeholderTextColor={themeColors.textMuted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              {/* Live Telemetry Snapshot Preview */}
              <View style={styles.readingsToLock}>
                <View style={styles.readingsToLockHeader}>
                  <CheckCircle2 size={15} color={themeColors.primary} />
                  <Text style={styles.readingsToLockTitle}>
                    Hardware Sensor Telemetry Locked to this Photo
                  </Text>
                </View>
                <View style={styles.readingsGridPreview}>
                  <Text style={styles.readingMiniBadge}>
                    🌡️ Temp: {telemetry?.temperature?.toFixed(1) ?? '24.2'}°C
                  </Text>
                  <Text style={styles.readingMiniBadge}>
                    💧 Humidity: {Math.round(telemetry?.humidity ?? 64)}%
                  </Text>
                  <Text style={styles.readingMiniBadge}>
                    🧪 pH: {telemetry?.ph?.toFixed(2) ?? '6.10'}
                  </Text>
                  <Text style={styles.readingMiniBadge}>
                    ⚡ EC: {telemetry?.ec?.toFixed(2) ?? '1.40'} mS
                  </Text>
                  <Text style={styles.readingMiniBadge}>
                    🌊 Water: {telemetry?.waterTemp?.toFixed(1) ?? '21.0'}°C
                  </Text>
                  <Text style={styles.readingMiniBadge}>
                    ☀️ Light: {Math.round(telemetry?.lightIntensity ?? 12500)} lux
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={uploading}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <PressableScale
                style={[styles.submitBtn, (!selectedImage || uploading) && styles.submitBtnDisabled]}
                onPress={handleSaveGrowthPhoto}
                disabled={!selectedImage || uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Camera size={16} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.submitBtnText}>Store in Plant Profile</Text>
                  </>
                )}
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: 9-POINT SENSOR TELEMETRY INSPECTION */}
      {inspectItem && (
        <Modal
          visible={true}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setInspectItem(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { maxWidth: 640 }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{inspectItem.data.plantName || activeProfile.name}</Text>
                  <Text style={styles.modalSubtitle}>
                    Logged on {new Date(inspectItem.data.timestamp).toLocaleDateString()} at{' '}
                    {new Date(inspectItem.data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Pressable onPress={() => setInspectItem(null)} style={styles.closeBtn}>
                  <X size={20} color={themeColors.text} />
                </Pressable>
              </View>

              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                {inspectItem.data.imageUrl ? (
                  <Image
                    source={{ uri: inspectItem.data.imageUrl }}
                    style={styles.inspectImg}
                    resizeMode="cover"
                  />
                ) : null}

                <View style={styles.inspectStageRow}>
                  <View style={styles.cardStageBadge}>
                    <Text style={styles.cardStageText}>{inspectItem.data.stage}</Text>
                  </View>
                  <View style={styles.seasonInspectBadge}>
                    <Text style={styles.seasonInspectText}>
                      {getSeasonForDate(new Date(inspectItem.data.timestamp)) === 'Spring'
                        ? '🌸 Spring'
                        : getSeasonForDate(new Date(inspectItem.data.timestamp)) === 'Summer'
                        ? '☀️ Summer'
                        : getSeasonForDate(new Date(inspectItem.data.timestamp)) === 'Autumn'
                        ? '🍁 Autumn'
                        : '❄️ Winter'}
                    </Text>
                  </View>
                  <Text style={styles.inspectTimestamp}>
                    {new Date(inspectItem.data.timestamp).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>

                {inspectItem.data.notes ? (
                  <View style={styles.inspectNotesCard}>
                    <Text style={styles.inspectNotesLabel}>AGRONOMIC OBSERVATIONS</Text>
                    <Text style={styles.inspectNotesText}>{inspectItem.data.notes}</Text>
                  </View>
                ) : null}

                <View style={styles.syncStatusHeader}>
                  <CheckCircle2 size={14} color={themeColors.primary} />
                  <Text style={styles.readingsSectionTitle}>
                    Synchronized 9-Point Hardware Sensor Telemetry
                  </Text>
                </View>

                <View style={styles.inspectMetricsGrid}>
                  <MetricCard
                    icon={Thermometer}
                    label="Air Temperature"
                    value={`${inspectItem.data.readings.temperature?.toFixed(1) ?? '—'} °C`}
                    color="#EF4444"
                    colors={themeColors}
                  />
                  <MetricCard
                    icon={Droplets}
                    label="Relative Humidity"
                    value={`${inspectItem.data.readings.humidity ? Math.round(inspectItem.data.readings.humidity) : '—'} %`}
                    color="#3B82F6"
                    colors={themeColors}
                  />
                  <MetricCard
                    icon={Sparkles}
                    label="Nutrient pH"
                    value={`${inspectItem.data.readings.ph?.toFixed(2) ?? '—'}`}
                    color="#10B981"
                    colors={themeColors}
                  />
                  <MetricCard
                    icon={Zap}
                    label="Electroconductivity"
                    value={`${inspectItem.data.readings.ec?.toFixed(2) ?? '—'} mS/cm`}
                    color="#F59E0B"
                    colors={themeColors}
                  />
                  <MetricCard
                    icon={Activity}
                    label="Total Dissolved Solids"
                    value={`${inspectItem.data.readings.tds ?? (inspectItem.data.readings.ec ? Math.round(inspectItem.data.readings.ec * 500) : '—')} ppm`}
                    color="#8B5CF6"
                    colors={themeColors}
                  />
                  <MetricCard
                    icon={Droplets}
                    label="Water Reservoir Temp"
                    value={`${inspectItem.data.readings.waterTemp?.toFixed(1) ?? '—'} °C`}
                    color="#06B6D4"
                    colors={themeColors}
                  />
                  <MetricCard
                    icon={Layers}
                    label="Reservoir Water Level"
                    value={`${inspectItem.data.readings.waterLevel ? Math.round(inspectItem.data.readings.waterLevel) : '85'} %`}
                    color="#14B8A6"
                    colors={themeColors}
                  />
                  <MetricCard
                    icon={Sun}
                    label="Photoperiod Light"
                    value={`${inspectItem.data.readings.lightIntensity ? Math.round(inspectItem.data.readings.lightIntensity) : '—'} Lux`}
                    color="#FBBF24"
                    colors={themeColors}
                  />
                  <MetricCard
                    icon={Activity}
                    label="Vapor Pressure Deficit"
                    value={`${inspectItem.data.readings.vpd?.toFixed(2) ?? '1.05'} kPa`}
                    color="#EC4899"
                    colors={themeColors}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <Pressable
                  style={[styles.submitBtn, { flex: 0, minWidth: 120 }]}
                  onPress={() => setInspectItem(null)}
                >
                  <Text style={styles.submitBtnText}>Close</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </AtmosphericBackground>
  );
}

// Growth Photo Card Component
function GrowthPhotoCard({ photo, plantProfile, colors, onInspect }) {
  const logDate = new Date(photo.timestamp);
  const formattedDate = logDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const season = getSeasonForDate(logDate);
  const seasonEmoji =
    season === 'Spring' ? '🌸' : season === 'Summer' ? '☀️' : season === 'Autumn' ? '🍁' : '❄️';

  return (
    <PressableScale style={stylesPhotoCard(colors).card} onPress={onInspect} activeScale={0.98}>
      <View style={stylesPhotoCard(colors).imageWrap}>
        <Image source={{ uri: photo.imageUrl }} style={stylesPhotoCard(colors).image} resizeMode="cover" />
        <View style={stylesPhotoCard(colors).imageTopRow}>
          <View style={stylesPhotoCard(colors).stageBadge}>
            <Text style={stylesPhotoCard(colors).stageText}>{photo.stage}</Text>
          </View>
          <View style={stylesPhotoCard(colors).seasonBadge}>
            <Text style={stylesPhotoCard(colors).seasonText}>
              {seasonEmoji} {season}
            </Text>
          </View>
          <View style={stylesPhotoCard(colors).timeBadge}>
            <Clock size={11} color="#FFFFFF" />
            <Text style={stylesPhotoCard(colors).timeText}>{formattedDate}</Text>
          </View>
        </View>
      </View>

      <View style={stylesPhotoCard(colors).content}>
        <View style={stylesPhotoCard(colors).titleRow}>
          <Text style={stylesPhotoCard(colors).title} numberOfLines={1}>
            {photo.stage} Milestone
          </Text>
        </View>

        {photo.notes ? (
          <Text style={stylesPhotoCard(colors).notes} numberOfLines={2}>
            {photo.notes}
          </Text>
        ) : null}

        {/* Synchronized Telemetry Strip for this Photo */}
        <View style={stylesPhotoCard(colors).metricsContainer}>
          <View style={stylesPhotoCard(colors).metricPill}>
            <Thermometer size={12} color="#EF4444" />
            <Text style={stylesPhotoCard(colors).metricText}>
              {photo.readings.temperature?.toFixed(1) ?? '—'}°C
            </Text>
          </View>
          <View style={stylesPhotoCard(colors).metricPill}>
            <Droplets size={12} color="#3B82F6" />
            <Text style={stylesPhotoCard(colors).metricText}>
              {photo.readings.humidity ? Math.round(photo.readings.humidity) : '—'}%
            </Text>
          </View>
          <View style={stylesPhotoCard(colors).metricPill}>
            <Sparkles size={12} color="#10B981" />
            <Text style={stylesPhotoCard(colors).metricText}>
              pH {photo.readings.ph?.toFixed(1) ?? '—'}
            </Text>
          </View>
          <View style={stylesPhotoCard(colors).metricPill}>
            <Zap size={12} color="#F59E0B" />
            <Text style={stylesPhotoCard(colors).metricText}>
              {photo.readings.ec?.toFixed(2) ?? '—'} mS
            </Text>
          </View>
          {photo.readings.waterTemp !== null && photo.readings.waterTemp !== undefined ? (
            <View style={stylesPhotoCard(colors).metricPill}>
              <Droplets size={12} color="#06B6D4" />
              <Text style={stylesPhotoCard(colors).metricText}>
                {photo.readings.waterTemp.toFixed(1)}°C H₂O
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

// 9-Point Metric Card Component
function MetricCard({ icon: Icon, label, value, color, colors }) {
  return (
    <View style={stylesMetric(colors).card}>
      <View style={[stylesMetric(colors).iconWrap, { backgroundColor: color + '15' }]}>
        <Icon size={18} color={color} />
      </View>
      <View>
        <Text style={stylesMetric(colors).label}>{label}</Text>
        <Text style={stylesMetric(colors).value}>{value}</Text>
      </View>
    </View>
  );
}

const stylesMetric = (colors) =>
  StyleSheet.create({
    card: {
      flex: 1,
      minWidth: '46%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 10,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    label: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '600',
    },
    value: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginTop: 2,
    },
  });

const stylesPhotoCard = (colors) =>
  StyleSheet.create({
    card: {
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 16,
      ...Platform.select({
        web: {
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.06)',
          cursor: 'pointer',
        },
      }),
    },
    imageWrap: {
      width: '100%',
      height: 190,
      position: 'relative',
      backgroundColor: colors.surfaceLight,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imageTopRow: {
      position: 'absolute',
      top: 10,
      left: 10,
      right: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    stageBadge: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
      backgroundColor: 'rgba(16, 185, 129, 0.92)',
    },
    stageText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
    seasonBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    seasonText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    timeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    timeText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    content: {
      padding: 14,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    title: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
    },
    notes: {
      fontSize: 12.5,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 10,
    },
    metricsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
    metricPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3.5,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metricText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text,
    },
  });

const createStyles = (colors, windowWidth) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: windowWidth >= 768 ? 24 : 16,
      paddingTop: windowWidth >= 768 ? 24 : 16,
      paddingBottom: 40,
    },
    header: {
      flexDirection: windowWidth >= 768 ? 'row' : 'column',
      justifyContent: 'space-between',
      alignItems: windowWidth >= 768 ? 'flex-start' : 'stretch',
      gap: 16,
      marginBottom: 20,
    },
    headerTextWrap: {
      flex: 1,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    badgePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.primary + '18',
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.8,
    },
    syncPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.isDarkMode ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.12)',
    },
    syncDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#22C55E',
    },
    syncText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#15803D',
      letterSpacing: 0.6,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      maxWidth: 640,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primary,
      ...Platform.select({
        web: {
          boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
          cursor: 'pointer',
        },
      }),
    },
    addBtnText: {
      color: '#FFFFFF',
      fontSize: 13.5,
      fontWeight: '700',
    },
    syncBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 15,
      paddingVertical: 11,
      borderRadius: borderRadius.md,
      backgroundColor: colors.adapt('#059669', colors.primary),
      ...Platform.select({
        web: {
          boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
          cursor: 'pointer',
        },
      }),
    },
    syncBtnDisabled: {
      opacity: 0.6,
    },
    syncBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    sectionTitleWrap: {
      gap: 2,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
    },
    sectionSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    plantRibbonScroll: {
      flexDirection: 'row',
      gap: 12,
      paddingVertical: 6,
      marginBottom: 20,
    },
    plantRibbonCard: {
      width: 200,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      overflow: 'hidden',
      position: 'relative',
      ...Platform.select({
        web: {
          cursor: 'pointer',
          boxShadow: '0 3px 12px rgba(0, 0, 0, 0.04)',
        },
      }),
    },
    plantRibbonCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '08',
      ...Platform.select({
        web: {
          boxShadow: '0 6px 20px rgba(16, 185, 129, 0.25)',
        },
      }),
    },
    plantRibbonImage: {
      width: '100%',
      height: 100,
      backgroundColor: colors.surfaceLight,
    },
    plantRibbonInfo: {
      padding: 10,
      gap: 3,
    },
    plantRibbonTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 4,
    },
    plantRibbonName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
    },
    plantRibbonNameActive: {
      color: colors.primary,
      fontWeight: '800',
    },
    plantRibbonStageBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    plantRibbonStageBadgeActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    plantRibbonStageText: {
      fontSize: 9.5,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    plantRibbonVariety: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    plantRibbonZone: {
      fontSize: 10.5,
      color: colors.textMuted,
    },
    activeProfileIndicator: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    profileHeroCard: {
      borderRadius: borderRadius.xl,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.adapt('rgba(16, 185, 129, 0.35)', colors.border),
      padding: windowWidth >= 768 ? 20 : 16,
      marginBottom: 20,
      ...Platform.select({
        web: {
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.05)',
        },
      }),
    },
    profileHeroTop: {
      flexDirection: windowWidth >= 768 ? 'row' : 'column',
      gap: 18,
      alignItems: windowWidth >= 768 ? 'center' : 'stretch',
      marginBottom: 16,
    },
    profileHeroImage: {
      width: windowWidth >= 768 ? 160 : '100%',
      height: windowWidth >= 768 ? 140 : 180,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surfaceLight,
    },
    profileHeroDetails: {
      flex: 1,
      gap: 4,
    },
    profileHeroHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
    },
    profileCategoryPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.primary + '18',
    },
    profileCategoryText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.5,
    },
    profileStagePill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    profileStageText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    profileHeroTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
    },
    profileHeroVariety: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    profileHeroZone: {
      color: colors.primary,
      fontWeight: '700',
    },
    profileMetadataRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 4,
      marginBottom: 4,
    },
    profileMetaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    profileMetaText: {
      fontSize: 11.5,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    profileNotesText: {
      fontSize: 12.5,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    profileStatsBanner: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'space-around',
      alignItems: 'center',
      gap: 8,
    },
    profileStatItem: {
      alignItems: 'center',
      gap: 2,
    },
    profileStatDivider: {
      width: 1,
      height: 24,
      backgroundColor: colors.border,
    },
    profileStatLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    profileStatValue: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },
    tabNavRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 4,
    },
    tabNavButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: borderRadius.md,
    },
    tabNavButtonActive: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabNavText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabNavTextActive: {
      color: colors.primary,
      fontWeight: '800',
    },
    tabContentContainer: {
      gap: 16,
    },
    filterCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 12,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      padding: 0,
    },
    filterSubRow: {
      gap: 6,
    },
    filterRowLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    filterScrollRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    stageFilterPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stageFilterPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    stageFilterText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    stageFilterTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    photoGrid: {
      flexDirection: 'column',
    },
    photoGridWide: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    metricSwitcherCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    metricSwitcherHeader: {
      gap: 2,
    },
    metricSwitcherTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },
    metricSwitcherSub: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    metricPillsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 2,
    },
    metricPillBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1.5,
      borderColor: colors.border,
      ...Platform.select({
        web: { cursor: 'pointer' },
      }),
    },
    metricPillBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    metricThresholdBox: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      flexWrap: 'wrap',
      gap: 8,
    },
    thresholdLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    thresholdText: {
      fontSize: 12.5,
      color: colors.textSecondary,
    },
    complianceChip: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      backgroundColor: '#10B98118',
    },
    complianceChipText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#10B981',
    },
    telemetryFiltersCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 12,
    },
    tableHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    tableCountText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    telemetryTable: {
      gap: 10,
    },
    telemetryRowCard: {
      borderRadius: borderRadius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      flexDirection: 'column',
      gap: 8,
      ...Platform.select({
        web: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
          cursor: 'pointer',
        },
      }),
    },
    telemetryRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    weekBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.primary + '18',
    },
    weekBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.primary,
    },
    dateAndSeasonWrap: {
      flex: 1,
    },
    telemetryRowDate: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    telemetryRowStage: {
      fontSize: 11,
      color: colors.textMuted,
    },
    primaryMetricCol: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
      borderTopWidth: 1,
      borderTopColor: colors.border + '60',
    },
    primaryMetricValue: {
      fontSize: 17,
      fontWeight: '800',
    },
    primaryMetricUnit: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    readingStatusPill: {
      paddingHorizontal: 8,
      paddingVertical: 2.5,
      borderRadius: 4,
    },
    readingStatusOptimal: {
      backgroundColor: '#10B98118',
    },
    readingStatusDeviation: {
      backgroundColor: '#F59E0B18',
    },
    readingStatusText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    readingStatusTextOptimal: {
      color: '#10B981',
    },
    readingStatusTextDeviation: {
      color: '#F59E0B',
    },
    telemetryRowSensorStrip: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    miniSensorPill: {
      fontSize: 10.5,
      fontWeight: '600',
      color: colors.textSecondary,
      backgroundColor: colors.surfaceLight,
      paddingHorizontal: 6,
      paddingVertical: 2.5,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    specsHeroCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 6,
    },
    specsHeroHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    specsHeroTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    specsHeroSub: {
      fontSize: 12.5,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    specsGrid: {
      flexDirection: windowWidth >= 768 ? 'row' : 'column',
      flexWrap: 'wrap',
      gap: 12,
    },
    specCard: {
      flex: 1,
      minWidth: windowWidth >= 768 ? '30%' : '100%',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 6,
    },
    specIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    specLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    specValue: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    specDesc: {
      fontSize: 11.5,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    emptyState: {
      paddingVertical: 50,
      paddingHorizontal: 20,
      alignItems: 'center',
      borderRadius: borderRadius.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    emptySub: {
      fontSize: 12.5,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 380,
      lineHeight: 18,
    },
    emptyActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primary,
      marginTop: 8,
    },
    emptyActionText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    // Modal Styles
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalCard: {
      width: '100%',
      maxWidth: 520,
      maxHeight: '92%',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    modalSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      padding: 4,
    },
    modalBody: {
      flexGrow: 1,
    },
    modalBodyContent: {
      padding: 20,
      gap: 16,
    },
    plantTargetScroll: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 4,
    },
    plantTargetPill: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    plantTargetPillActive: {
      backgroundColor: colors.primary + '18',
      borderColor: colors.primary,
    },
    plantTargetText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    plantTargetTextActive: {
      color: colors.primary,
      fontWeight: '800',
    },
    photoUploadArea: {
      borderRadius: borderRadius.lg,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.primary + '60',
      backgroundColor: colors.surfaceLight,
      overflow: 'hidden',
    },
    previewContainer: {
      width: '100%',
      height: 220,
      position: 'relative',
    },
    previewImg: {
      width: '100%',
      height: '100%',
    },
    previewActions: {
      position: 'absolute',
      bottom: 10,
      left: 10,
      right: 10,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
    },
    replaceBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: borderRadius.sm,
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    replaceBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    pickButtonsContainer: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
    },
    pickButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 8,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    pickIconBadge: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary + '18',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    pickTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    pickSub: {
      fontSize: 11,
      color: colors.textMuted,
      textAlign: 'center',
    },
    inputGroup: {
      gap: 6,
    },
    inputLabel: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.text,
    },
    textInput: {
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceLight,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 13.5,
    },
    textArea: {
      minHeight: 68,
      textAlignVertical: 'top',
    },
    stageRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    stageBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stageBtnSelected: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    stageBtnText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    stageBtnTextSelected: {
      color: colors.primary,
      fontWeight: '700',
    },
    readingsToLock: {
      padding: 12,
      borderRadius: borderRadius.md,
      backgroundColor: colors.isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(14, 79, 59, 0.05)',
      borderWidth: 1,
      borderColor: colors.isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(14, 79, 59, 0.15)',
      gap: 8,
    },
    readingsToLockHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    readingsToLockTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    readingsGridPreview: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    readingMiniBadge: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
      backgroundColor: colors.surface,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceLight,
    },
    cancelBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    submitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primary,
    },
    submitBtnDisabled: {
      opacity: 0.5,
    },
    submitBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    inspectImg: {
      width: '100%',
      height: 260,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surfaceLight,
    },
    inspectStageRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardStageBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.primary,
    },
    cardStageText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    seasonInspectBadge: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    seasonInspectText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
    },
    inspectTimestamp: {
      fontSize: 11.5,
      color: colors.textMuted,
      fontWeight: '500',
    },
    inspectNotesCard: {
      padding: 12,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    inspectNotesLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.6,
    },
    inspectNotesText: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 19,
    },
    syncStatusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    readingsSectionTitle: {
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.text,
      marginTop: 4,
    },
    inspectMetricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
  });
