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
  ArrowLeft,
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
  ChevronRight,
  AlertTriangle,
} from 'lucide-react-native';
import { usePlantProfiles } from '../../src/hooks/usePlantProfiles';
import useEffectiveSensorData from '../../src/hooks/useEffectiveSensorData';
import { useThemeColors, borderRadius, spacing } from '../../src/theme/theme';
import AtmosphericBackground from '../../src/components/AtmosphericBackground';
import { PressableScale } from '../../src/components/PressableScale';
import { getSeasonForDate } from '../../src/utils/annualSensorLogs';
import { filterPlantDailyLogs } from '../../src/utils/plantProfileData';

const GROWTH_STAGES = ['Seedling', 'Vegetative', 'Flowering', 'Fruiting', 'Harvest Ready'];

const TIME_RANGES = [
  { id: '7d', label: 'Past 7 Days' },
  { id: '30d', label: 'Past 30 Days' },
  { id: '90d', label: 'Past 90 Days' },
  { id: '180d', label: 'Past 6 Months' },
  { id: '365d', label: 'All 365 Days (1 Year)' },
];

export default function PlantPhotosScreen() {
  const { width } = useWindowDimensions();
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors, width), [themeColors, width]);

  // Dedicated Plant Profiles & 1-Year Day-wise Telemetry Hook
  const {
    profiles,
    activePlantId,
    setActivePlantId,
    activeProfile,
    activePlantDailyLogs,
    activePlantGrowthPhotos,
    activePlantStats,
    loading,
    syncing,
    addGrowthPhotoToPlant,
    seedProfilesToDatabase,
  } = usePlantProfiles();

  const { current: telemetry } = useEffectiveSensorData();

  // Navigation state: null = list of plant items; string = opened plant item log page
  const [selectedPlantId, setSelectedPlantId] = useState(null);

  // Search query for the main list of plant items
  const [plantListSearch, setPlantListSearch] = useState('');

  // Active opened plant profile object
  const openedPlant = useMemo(() => {
    if (!selectedPlantId) return null;
    return profiles.find((p) => p.id === selectedPlantId) || activeProfile;
  }, [profiles, selectedPlantId, activeProfile]);

  // Day-wise filtering state
  const [dayTimeRange, setDayTimeRange] = useState('365d');
  const [onlyDaysWithPhotos, setOnlyDaysWithPhotos] = useState(false);
  const [dayStageFilter, setDayStageFilter] = useState('All');
  const [daySearchQuery, setDaySearchQuery] = useState('');
  const [visibleDaysCount, setVisibleDaysCount] = useState(30);

  // Upload modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [targetPlantId, setTargetPlantId] = useState('');
  const [targetDateString, setTargetDateString] = useState('');
  const [selectedImage, setSelectedImage] = useState(null); // { uri, base64 }
  const [stage, setStage] = useState('Vegetative');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  // Detailed inspect modal state (photo or daily telemetry)
  const [inspectItem, setInspectItem] = useState(null);

  // Open the dedicated day-wise log record page for a specific plant item
  const handleOpenPlantRecord = (plantId) => {
    setActivePlantId(plantId);
    setSelectedPlantId(plantId);
    setVisibleDaysCount(30);
    setOnlyDaysWithPhotos(false);
    setDayStageFilter('All');
    setDaySearchQuery('');
  };

  // Back button to return to all plant items
  const handleBackToPlantsList = () => {
    setSelectedPlantId(null);
  };

  // Open upload modal for a plant, optionally pre-binding to a specific day/date
  const handleOpenUploadModal = (plantId, dateStr = null, initialStage = 'Vegetative') => {
    setTargetPlantId(plantId || activePlantId);
    setTargetDateString(dateStr || new Date().toISOString().split('T')[0]);
    setStage(initialStage);
    setSelectedImage(null);
    setNotes('');
    setModalVisible(true);
  };

  // Gallery picker
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

  // Camera capture
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

  // Save growth photo attached to the selected day
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

      // Set timestamp based on target date
      const timestampToSave = targetDateString
        ? new Date(`${targetDateString}T12:00:00.000Z`).toISOString()
        : new Date().toISOString();

      await addGrowthPhotoToPlant({
        plantId: targetPlantId,
        stage,
        imageUrl: selectedImage.uri,
        notes: notes.trim(),
        readings: currentReadings,
        timestamp: timestampToSave,
      });

      setSelectedImage(null);
      setNotes('');
      setModalVisible(false);

      const targetPlant = profiles.find((p) => p.id === targetPlantId);
      const msg = `Photo attached to ${targetDateString || 'today'} for ${targetPlant ? targetPlant.name : 'plant profile'} successfully!`;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert('Photo Attached', msg);
      }
    } catch (e) {
      Alert.alert('Save Error', e.message || 'Failed to save growth photo.');
    } finally {
      setUploading(false);
    }
  };

  // Database sync
  const handleSyncDatabaseClick = async () => {
    const doSync = async () => {
      try {
        const result = await seedProfilesToDatabase();
        const msg = `Successfully synced ${result.profilesCount} plant profiles and 1-year historical telemetry into Firestore database!`;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(msg);
        } else {
          Alert.alert('Database Sync Complete', msg);
        }
      } catch (err) {
        const errMsg = err?.message || 'Failed to sync plant logs to database.';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(errMsg);
        } else {
          Alert.alert('Sync Failed', errMsg);
        }
      }
    };

    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined'
        ? window.confirm('Sync all plant item profiles and 1 year of sensor telemetry into the Firestore database?')
        : true;
      if (ok) await doSync();
      return;
    }

    Alert.alert(
      'Sync Database',
      'Store all plant profiles and 1-year sensor telemetry in your database?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sync', onPress: doSync },
      ]
    );
  };

  // Filtered plant items for the main list
  const filteredPlantList = useMemo(() => {
    if (!plantListSearch.trim()) return profiles;
    const q = plantListSearch.toLowerCase().trim();
    return profiles.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        p.variety.toLowerCase().includes(q) ||
        p.zone.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.currentStage.toLowerCase().includes(q)
      );
    });
  }, [profiles, plantListSearch]);

  // Filtered day-wise logs for the opened plant
  const filteredDailyLogs = useMemo(() => {
    return filterPlantDailyLogs(activePlantDailyLogs, {
      timeRange: dayTimeRange,
      onlyWithPhotos: onlyDaysWithPhotos,
      stageFilter: dayStageFilter,
      searchQuery: daySearchQuery,
    });
  }, [activePlantDailyLogs, dayTimeRange, onlyDaysWithPhotos, dayStageFilter, daySearchQuery]);

  // Paginated daily logs
  const paginatedDailyLogs = useMemo(() => {
    return filteredDailyLogs.slice(0, visibleDaysCount);
  }, [filteredDailyLogs, visibleDaysCount]);

  // Count of days with attached photos
  const daysWithPhotosCount = useMemo(() => {
    return activePlantDailyLogs.filter((d) => d.photos && d.photos.length > 0).length;
  }, [activePlantDailyLogs]);

  const isWide = width >= 800;

  // =========================================================================
  // VIEW 1: DEDICATED DAY-WISE LOG RECORD PAGE (WHEN AN ITEM IS OPENED)
  // =========================================================================
  if (selectedPlantId && openedPlant) {
    return (
      <AtmosphericBackground style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Navigation Bar */}
          <View style={styles.backNavRow}>
            <PressableScale
              style={styles.backButton}
              onPress={handleBackToPlantsList}
              activeScale={0.97}
            >
              <ArrowLeft size={16} color={themeColors.text} strokeWidth={2.4} />
              <Text style={styles.backButtonText}>Back to All Plant Logs</Text>
            </PressableScale>

            <View style={styles.topRightActions}>
              <PressableScale
                style={styles.addBtn}
                onPress={() => handleOpenUploadModal(openedPlant.id, null, openedPlant.currentStage)}
                activeScale={0.96}
              >
                <Camera size={15} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.addBtnText}>+ Log Today's Entry & Photo</Text>
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
                  <Database size={14} color="#FFFFFF" strokeWidth={2.2} />
                )}
                <Text style={styles.syncBtnText}>{syncing ? 'Syncing...' : 'Sync Database'}</Text>
              </PressableScale>
            </View>
          </View>

          {/* Plant Hero Header Banner */}
          <View style={styles.openedPlantHero}>
            <View style={styles.openedPlantHeroTop}>
              <Image
                source={{ uri: openedPlant.imageUrl }}
                style={styles.openedPlantHeroImage}
                resizeMode="cover"
              />
              <View style={styles.openedPlantHeroDetails}>
                <View style={styles.heroBadgeRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{openedPlant.category}</Text>
                  </View>
                  <View style={styles.stageBadge}>
                    <Text style={styles.stageBadgeText}>{openedPlant.currentStage}</Text>
                  </View>
                  <View style={styles.databaseBadge}>
                    <Database size={11} color={themeColors.primary} />
                    <Text style={styles.databaseBadgeText}>DATABASE RECORD</Text>
                  </View>
                </View>

                <Text style={styles.openedPlantHeroTitle}>{openedPlant.name}</Text>
                <Text style={styles.openedPlantHeroVariety}>
                  {openedPlant.variety} • <Text style={styles.highlightText}>📍 {openedPlant.zone}</Text>
                </Text>

                <View style={styles.openedPlantMetaRow}>
                  <View style={styles.metaRowItem}>
                    <Calendar size={13} color={themeColors.textSecondary} />
                    <Text style={styles.metaRowText}>
                      Planted {new Date(openedPlant.plantingDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={styles.metaRowItem}>
                    <Clock size={13} color={themeColors.textSecondary} />
                    <Text style={styles.metaRowText}>
                      {activePlantStats.daysGrown} Days Cultivated • {openedPlant.harvestCycleDays}-Day Cycle
                    </Text>
                  </View>
                </View>

                <Text style={styles.openedPlantNotes} numberOfLines={2}>
                  {openedPlant.notes}
                </Text>
              </View>
            </View>

            {/* 1-Year Historical Sensor Summary Strip */}
            <View style={styles.openedPlantStatsStrip}>
              <View style={styles.openedPlantStatItem}>
                <Text style={styles.openedPlantStatLabel}>LOG RECORDS</Text>
                <Text style={styles.openedPlantStatValue}>365 Days</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.openedPlantStatItem}>
                <Text style={styles.openedPlantStatLabel}>PHOTOS ATTACHED</Text>
                <Text style={styles.openedPlantStatValue}>{activePlantGrowthPhotos.length} Snaps</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.openedPlantStatItem}>
                <Text style={styles.openedPlantStatLabel}>1-YR AVG TEMP</Text>
                <Text style={styles.openedPlantStatValue}>{activePlantStats.avgTemp}°C</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.openedPlantStatItem}>
                <Text style={styles.openedPlantStatLabel}>1-YR AVG RH</Text>
                <Text style={styles.openedPlantStatValue}>{activePlantStats.avgHumidity}%</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.openedPlantStatItem}>
                <Text style={styles.openedPlantStatLabel}>1-YR AVG pH</Text>
                <Text style={styles.openedPlantStatValue}>{activePlantStats.avgPh}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.openedPlantStatItem}>
                <Text style={styles.openedPlantStatLabel}>1-YR AVG EC</Text>
                <Text style={styles.openedPlantStatValue}>{activePlantStats.avgEc} mS</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.openedPlantStatItem}>
                <Text style={styles.openedPlantStatLabel}>COMPLIANCE</Text>
                <Text style={[styles.openedPlantStatValue, { color: '#10B981' }]}>
                  {activePlantStats.optimalCompliancePercent}%
                </Text>
              </View>
            </View>
          </View>

          {/* DAY-WISE FILTER & TIMELINE CONTROLS */}
          <View style={styles.filterCard}>
            <View style={styles.searchBar}>
              <Search size={15} color={themeColors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Search ${openedPlant.name} day-wise logs by date, notes, stage...`}
                placeholderTextColor={themeColors.textMuted}
                value={daySearchQuery}
                onChangeText={setDaySearchQuery}
              />
              {daySearchQuery ? (
                <Pressable onPress={() => setDaySearchQuery('')}>
                  <X size={15} color={themeColors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.filterSubRow}>
              <Text style={styles.filterRowLabel}>Timeframe:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollRow}>
                {TIME_RANGES.map((tr) => (
                  <Pressable
                    key={tr.id}
                    style={[styles.filterPill, dayTimeRange === tr.id && styles.filterPillActive]}
                    onPress={() => setDayTimeRange(tr.id)}
                  >
                    <Text style={[styles.filterPillText, dayTimeRange === tr.id && styles.filterPillTextActive]}>
                      {tr.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterSubRow}>
              <Text style={styles.filterRowLabel}>Filter Views:</Text>
              <View style={styles.filterScrollRow}>
                <Pressable
                  style={[styles.filterPill, onlyDaysWithPhotos && styles.filterPillActive]}
                  onPress={() => setOnlyDaysWithPhotos(!onlyDaysWithPhotos)}
                >
                  <Text style={[styles.filterPillText, onlyDaysWithPhotos && styles.filterPillTextActive]}>
                    📷 Only Days with Photos ({daysWithPhotosCount})
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.filterPill, dayStageFilter === 'All' && !onlyDaysWithPhotos && styles.filterPillActive]}
                  onPress={() => {
                    setOnlyDaysWithPhotos(false);
                    setDayStageFilter('All');
                  }}
                >
                  <Text style={[styles.filterPillText, dayStageFilter === 'All' && !onlyDaysWithPhotos && styles.filterPillTextActive]}>
                    All Days ({activePlantDailyLogs.length})
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.filterSubRow}>
              <Text style={styles.filterRowLabel}>Growth Stage:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollRow}>
                {['All', ...GROWTH_STAGES].map((st) => (
                  <Pressable
                    key={st}
                    style={[styles.filterPill, dayStageFilter === st && styles.filterPillActive]}
                    onPress={() => setDayStageFilter(st)}
                  >
                    <Text style={[styles.filterPillText, dayStageFilter === st && styles.filterPillTextActive]}>
                      {st}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* DAY-WISE LISTING HEADER */}
          <View style={styles.dayWiseHeaderRow}>
            <View>
              <Text style={styles.dayWiseTitle}>Day-Wise Log Records from Database</Text>
              <Text style={styles.dayWiseSub}>
                Showing {paginatedDailyLogs.length} of {filteredDailyLogs.length} daily entries with attached canopy photos
              </Text>
            </View>
          </View>

          {/* DAY-WISE TIMELINE LIST */}
          {filteredDailyLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar size={36} color={themeColors.primary} />
              <Text style={styles.emptyTitle}>No Daily Log Entries Found</Text>
              <Text style={styles.emptySub}>
                No records match your current timeframe or photo filter for {openedPlant.name}.
              </Text>
              <PressableScale
                style={styles.emptyActionBtn}
                onPress={() => {
                  setDayTimeRange('365d');
                  setOnlyDaysWithPhotos(false);
                  setDayStageFilter('All');
                  setDaySearchQuery('');
                }}
              >
                <Text style={styles.emptyActionText}>Reset Filters</Text>
              </PressableScale>
            </View>
          ) : (
            <View style={styles.dayWiseList}>
              {paginatedDailyLogs.map((dayLog) => (
                <DayLogRecordCard
                  key={dayLog.id}
                  dayLog={dayLog}
                  plantProfile={openedPlant}
                  colors={themeColors}
                  onInspectTelemetry={() =>
                    setInspectItem({
                      type: 'daily',
                      title: `${openedPlant.name} • ${dayLog.formattedDate}`,
                      data: {
                        plantName: openedPlant.name,
                        stage: dayLog.stage,
                        timestamp: dayLog.timestamp,
                        notes: dayLog.notes || `Day ${dayLog.dayNumber} database log record for ${openedPlant.name} (${openedPlant.zone}).`,
                        imageUrl: dayLog.photos.length > 0 ? dayLog.photos[0].imageUrl : openedPlant.imageUrl,
                        readings: dayLog.readings,
                      },
                    })
                  }
                  onInspectPhoto={(photo) =>
                    setInspectItem({
                      type: 'photo',
                      title: `${openedPlant.name} • ${dayLog.formattedDate}`,
                      data: photo,
                    })
                  }
                  onAttachPhoto={() =>
                    handleOpenUploadModal(openedPlant.id, dayLog.dateString, dayLog.stage)
                  }
                />
              ))}

              {/* Load more button if there are remaining days */}
              {paginatedDailyLogs.length < filteredDailyLogs.length && (
                <PressableScale
                  style={styles.loadMoreBtn}
                  onPress={() => setVisibleDaysCount((prev) => Math.min(prev + 30, filteredDailyLogs.length))}
                  activeScale={0.98}
                >
                  <Text style={styles.loadMoreBtnText}>
                    Load 30 More Days ({filteredDailyLogs.length - paginatedDailyLogs.length} remaining)
                  </Text>
                </PressableScale>
              )}
            </View>
          )}
        </ScrollView>

        {/* Upload Modal (Pre-bound to Plant & Day) */}
        {renderUploadModal()}

        {/* 9-Point Telemetry Inspection Modal */}
        {renderInspectModal()}
      </AtmosphericBackground>
    );
  }

  // =========================================================================
  // VIEW 2: MAIN PLANT ITEMS CATALOG (EACH ITEM LISTED IN LOGS)
  // =========================================================================
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
                <Text style={styles.badgeText}>CROPS ARCHIVE</Text>
              </View>
              <View style={styles.syncPill}>
                <View style={styles.syncDot} />
                <Text style={styles.syncText}>DATABASE CONNECTED</Text>
              </View>
            </View>
            <Text style={styles.title}>Plant Logs & Crop Records</Text>
            <Text style={styles.subtitle}>
              Select any plant below to open its entire day-wise log record from the database, complete with chronological sensor telemetry and photos attached to each day.
            </Text>
          </View>

          <View style={styles.headerActions}>
            <PressableScale
              style={styles.addBtn}
              onPress={() => handleOpenUploadModal(activePlantId, null, 'Vegetative')}
              activeScale={0.96}
            >
              <Camera size={16} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.addBtnText}>+ Log Growth Photo</Text>
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
              <Text style={styles.syncBtnText}>{syncing ? 'Syncing...' : 'Sync Database'}</Text>
            </PressableScale>
          </View>
        </View>

        {/* Search Plants Catalog */}
        <View style={styles.catalogSearchCard}>
          <View style={styles.searchBar}>
            <Search size={16} color={themeColors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search plants by crop name, variety, system, zone, or stage..."
              placeholderTextColor={themeColors.textMuted}
              value={plantListSearch}
              onChangeText={setPlantListSearch}
            />
            {plantListSearch ? (
              <Pressable onPress={() => setPlantListSearch('')}>
                <X size={16} color={themeColors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.catalogCountText}>
            Showing {filteredPlantList.length} crops grown with full 1-year database log records
          </Text>
        </View>

        {/* Grid of Plant Items Listed in Logs */}
        <View style={[styles.plantItemsGrid, isWide && styles.plantItemsGridWide]}>
          {filteredPlantList.map((plant) => (
            <PlantItemCatalogCard
              key={plant.id}
              plant={plant}
              colors={themeColors}
              onOpenRecord={() => handleOpenPlantRecord(plant.id)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Upload Modal */}
      {renderUploadModal()}

      {/* 9-Point Telemetry Inspection Modal */}
      {renderInspectModal()}
    </AtmosphericBackground>
  );

  // =========================================================================
  // MODAL RENDERERS
  // =========================================================================
  function renderUploadModal() {
    return (
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
                <Text style={styles.modalTitle}>Attach Photo to Day Record</Text>
                <Text style={styles.modalSubtitle}>
                  Bind photo & live hardware telemetry to {targetDateString || 'today'}
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

              {/* Target Date */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date to Attach Photo</Text>
                <View style={styles.datePickerWrap}>
                  <Calendar size={15} color={themeColors.primary} />
                  <TextInput
                    style={styles.dateInput}
                    value={targetDateString}
                    onChangeText={setTargetDateString}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={themeColors.textMuted}
                  />
                  <Text style={styles.dateHint}>(e.g. {new Date().toISOString().split('T')[0]})</Text>
                </View>
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

              {/* Foliar Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Foliar Notes & Observations</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="e.g. Robust leaf expansion, vibrant chlorophyll, clean root zone"
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
                    Synchronized Sensor Telemetry Locked to this Day
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
                    <Text style={styles.submitBtnText}>Attach to Day Record</Text>
                  </>
                )}
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  function renderInspectModal() {
    if (!inspectItem) return null;

    return (
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
                <Text style={styles.modalTitle}>{inspectItem.title || inspectItem.data.plantName}</Text>
                <Text style={styles.modalSubtitle}>
                  Recorded {new Date(inspectItem.data.timestamp).toLocaleDateString()} at{' '}
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
                  Hardware Sensor Telemetry from Database
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
    );
  }
}

// =========================================================================
// SUBCOMPONENTS
// =========================================================================

// 1. Plant Item Catalog Card (for the main list of plant items)
function PlantItemCatalogCard({ plant, colors, onOpenRecord }) {
  const styles = stylesItemCard(colors);

  return (
    <PressableScale style={styles.card} onPress={onOpenRecord} activeScale={0.98}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: plant.imageUrl }} style={styles.image} resizeMode="cover" />
        <View style={styles.stageBadge}>
          <Text style={styles.stageText}>{plant.currentStage}</Text>
        </View>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{plant.category}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.plantTitle}>{plant.name}</Text>
        <Text style={styles.plantVariety}>
          {plant.variety} • <Text style={styles.plantZone}>📍 {plant.zone}</Text>
        </Text>

        <Text style={styles.plantNotes} numberOfLines={2}>
          {plant.notes}
        </Text>

        {/* Telemetry Summary Stats Badges */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Calendar size={11} color={colors.primary} />
            <Text style={styles.statChipText}>365 Days Logged</Text>
          </View>
          <View style={styles.statChip}>
            <Camera size={11} color="#3B82F6" />
            <Text style={styles.statChipText}>Photos Attached</Text>
          </View>
          <View style={styles.statChip}>
            <Sparkles size={11} color="#10B981" />
            <Text style={styles.statChipText}>Target pH {plant.optimalThresholds?.ph?.min}–{plant.optimalThresholds?.ph?.max}</Text>
          </View>
        </View>

        {/* Primary Action Button */}
        <View style={styles.openBtnRow}>
          <Text style={styles.openBtnText}>Open Entire Log Record</Text>
          <ChevronRight size={16} color={colors.primary} />
        </View>
      </View>
    </PressableScale>
  );
}

// 2. Day-Wise Log Record Card (showing day date, database sensor readings, and attached photos)
function DayLogRecordCard({ dayLog, plantProfile, colors, onInspectTelemetry, onInspectPhoto, onAttachPhoto }) {
  const styles = stylesDayCard(colors);
  const seasonEmoji =
    dayLog.season === 'Spring' ? '🌸' : dayLog.season === 'Summer' ? '☀️' : dayLog.season === 'Autumn' ? '🍁' : '❄️';

  const hasPhotos = dayLog.photos && dayLog.photos.length > 0;

  return (
    <View style={styles.card}>
      {/* Day Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.dayBadgeGroup}>
          <View style={styles.dayPill}>
            <Text style={styles.dayPillText}>Day {dayLog.dayNumber}</Text>
          </View>
          <Text style={styles.dateText}>{dayLog.formattedDate}</Text>
          <View style={styles.stagePill}>
            <Text style={styles.stagePillText}>
              {seasonEmoji} {dayLog.stage}
            </Text>
          </View>
        </View>

        <View style={styles.statusGroup}>
          <View style={[styles.statusBadge, dayLog.isOptimal ? styles.statusOptimal : styles.statusDeviation]}>
            <Text style={[styles.statusBadgeText, dayLog.isOptimal ? styles.statusTextOptimal : styles.statusTextDeviation]}>
              {dayLog.isOptimal ? '✓ OPTIMAL' : '⚠ OFF-TARGET'}
            </Text>
          </View>
        </View>
      </View>

      {/* Database Sensor Telemetry Readings Row for this Day */}
      <PressableScale style={styles.readingsSection} onPress={onInspectTelemetry} activeScale={0.99}>
        <View style={styles.readingsHeaderRow}>
          <View style={styles.telemetryTag}>
            <Activity size={12} color={colors.primary} />
            <Text style={styles.telemetryTagText}>DATABASE TELEMETRY RECORD</Text>
          </View>
          <Text style={styles.inspectHint}>Tap to view all 9 metrics →</Text>
        </View>

        <View style={styles.metricsStrip}>
          <View style={styles.metricItem}>
            <Thermometer size={13} color="#EF4444" />
            <Text style={styles.metricLabel}>Air Temp</Text>
            <Text style={styles.metricVal}>{dayLog.readings.temperature.toFixed(1)}°C</Text>
          </View>

          <View style={styles.metricItem}>
            <Droplets size={13} color="#3B82F6" />
            <Text style={styles.metricLabel}>Humidity</Text>
            <Text style={styles.metricVal}>{Math.round(dayLog.readings.humidity)}%</Text>
          </View>

          <View style={styles.metricItem}>
            <Sparkles size={13} color="#10B981" />
            <Text style={styles.metricLabel}>pH Level</Text>
            <Text style={styles.metricVal}>{dayLog.readings.ph.toFixed(2)}</Text>
          </View>

          <View style={styles.metricItem}>
            <Zap size={13} color="#F59E0B" />
            <Text style={styles.metricLabel}>EC Level</Text>
            <Text style={styles.metricVal}>{dayLog.readings.ec.toFixed(2)} mS</Text>
          </View>

          <View style={styles.metricItem}>
            <Droplets size={13} color="#06B6D4" />
            <Text style={styles.metricLabel}>Water Temp</Text>
            <Text style={styles.metricVal}>{dayLog.readings.waterTemp.toFixed(1)}°C</Text>
          </View>

          <View style={styles.metricItem}>
            <Sun size={13} color="#FBBF24" />
            <Text style={styles.metricLabel}>Light</Text>
            <Text style={styles.metricVal}>{Math.round(dayLog.readings.lightIntensity)} lx</Text>
          </View>

          <View style={styles.metricItem}>
            <Activity size={13} color="#EC4899" />
            <Text style={styles.metricLabel}>VPD</Text>
            <Text style={styles.metricVal}>{dayLog.readings.vpd.toFixed(2)} kPa</Text>
          </View>
        </View>
      </PressableScale>

      {/* PHOTOS ATTACHED TO THIS DAY */}
      <View style={styles.photosSection}>
        {hasPhotos ? (
          <View style={styles.attachedPhotosContainer}>
            <View style={styles.attachedPhotosHeader}>
              <Camera size={13} color={colors.primary} />
              <Text style={styles.attachedPhotosTitle}>
                Canopy Photos Attached to {dayLog.formattedDate} ({dayLog.photos.length})
              </Text>
            </View>

            <View style={styles.photosRow}>
              {dayLog.photos.map((photo) => (
                <PressableScale
                  key={photo.id}
                  style={styles.attachedPhotoCard}
                  onPress={() => onInspectPhoto(photo)}
                  activeScale={0.98}
                >
                  <Image source={{ uri: photo.imageUrl }} style={styles.attachedPhotoImg} resizeMode="cover" />
                  <View style={styles.attachedPhotoOverlay}>
                    <View style={styles.photoStageBadge}>
                      <Text style={styles.photoStageText}>{photo.stage}</Text>
                    </View>
                    <Text style={styles.photoTapText}>Tap to inspect</Text>
                  </View>
                  {photo.notes ? (
                    <Text style={styles.photoNotes} numberOfLines={2}>
                      {photo.notes}
                    </Text>
                  ) : null}
                </PressableScale>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.noPhotoRow}>
            <Text style={styles.noPhotoText}>No photo attached to this day yet</Text>
            <PressableScale style={styles.attachPhotoBtn} onPress={onAttachPhoto} activeScale={0.96}>
              <Camera size={13} color={colors.primary} />
              <Text style={styles.attachPhotoBtnText}>+ Attach Photo to Day {dayLog.dayNumber}</Text>
            </PressableScale>
          </View>
        )}
      </View>
    </View>
  );
}

// 3. 9-Point Metric Card
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

// =========================================================================
// STYLES
// =========================================================================

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

const stylesItemCard = (colors) =>
  StyleSheet.create({
    card: {
      borderRadius: borderRadius.xl,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 16,
      ...Platform.select({
        web: {
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.05)',
          cursor: 'pointer',
        },
      }),
    },
    imageWrap: {
      width: '100%',
      height: 180,
      position: 'relative',
      backgroundColor: colors.surfaceLight,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    stageBadge: {
      position: 'absolute',
      top: 12,
      left: 12,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
      backgroundColor: 'rgba(16, 185, 129, 0.92)',
    },
    stageText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    categoryBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    categoryText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    content: {
      padding: 16,
      gap: 6,
    },
    plantTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
    },
    plantVariety: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    plantZone: {
      color: colors.primary,
      fontWeight: '700',
    },
    plantNotes: {
      fontSize: 12.5,
      color: colors.textSecondary,
      lineHeight: 18,
      marginTop: 2,
    },
    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 6,
      marginBottom: 6,
    },
    statChip: {
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
    statChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    openBtnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 4,
    },
    openBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.primary,
    },
  });

const stylesDayCard = (colors) =>
  StyleSheet.create({
    card: {
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      padding: 14,
      gap: 12,
      marginBottom: 12,
      ...Platform.select({
        web: {
          boxShadow: '0 3px 12px rgba(0, 0, 0, 0.03)',
        },
      }),
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    dayBadgeGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    dayPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.primary + '18',
    },
    dayPillText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.primary,
    },
    dateText: {
      fontSize: 13.5,
      fontWeight: '800',
      color: colors.text,
    },
    stagePill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stagePillText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    statusGroup: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
    },
    statusOptimal: {
      backgroundColor: '#10B98118',
    },
    statusDeviation: {
      backgroundColor: '#F59E0B18',
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    statusTextOptimal: {
      color: '#10B981',
    },
    statusTextDeviation: {
      color: '#F59E0B',
    },
    readingsSection: {
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      gap: 8,
      ...Platform.select({
        web: { cursor: 'pointer' },
      }),
    },
    readingsHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    telemetryTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    telemetryTagText: {
      fontSize: 9.5,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.6,
    },
    inspectHint: {
      fontSize: 10.5,
      color: colors.textMuted,
      fontWeight: '600',
    },
    metricsStrip: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    metricItem: {
      flex: 1,
      minWidth: 70,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.sm,
      padding: 6,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 2,
    },
    metricLabel: {
      fontSize: 9,
      color: colors.textMuted,
      fontWeight: '600',
    },
    metricVal: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.text,
    },
    photosSection: {
      borderTopWidth: 1,
      borderTopColor: colors.border + '60',
      paddingTop: 8,
    },
    attachedPhotosContainer: {
      gap: 8,
    },
    attachedPhotosHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    attachedPhotosTitle: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.text,
    },
    photosRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    attachedPhotoCard: {
      width: 180,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      paddingBottom: 6,
      ...Platform.select({
        web: { cursor: 'pointer' },
      }),
    },
    attachedPhotoImg: {
      width: '100%',
      height: 110,
      backgroundColor: colors.border,
    },
    attachedPhotoOverlay: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingTop: 4,
    },
    photoStageBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    photoStageText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    photoTapText: {
      fontSize: 9,
      color: colors.textMuted,
    },
    photoNotes: {
      fontSize: 10.5,
      color: colors.textSecondary,
      paddingHorizontal: 6,
      marginTop: 3,
      lineHeight: 14,
    },
    noPhotoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    noPhotoText: {
      fontSize: 11,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    attachPhotoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
      ...Platform.select({
        web: { cursor: 'pointer' },
      }),
    },
    attachPhotoBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
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
      fontSize: 13,
      fontWeight: '700',
    },
    syncBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 14,
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
      fontSize: 12.5,
      fontWeight: '700',
    },
    catalogSearchCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 10,
      marginBottom: 20,
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
    catalogCountText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    plantItemsGrid: {
      flexDirection: 'column',
    },
    plantItemsGridWide: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    // Opened Plant Page Styles
    backNavRow: {
      flexDirection: windowWidth >= 768 ? 'row' : 'column',
      justifyContent: 'space-between',
      alignItems: windowWidth >= 768 ? 'center' : 'stretch',
      gap: 12,
      marginBottom: 16,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: 'flex-start',
      ...Platform.select({
        web: { cursor: 'pointer' },
      }),
    },
    backButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    topRightActions: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    openedPlantHero: {
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
    openedPlantHeroTop: {
      flexDirection: windowWidth >= 768 ? 'row' : 'column',
      gap: 18,
      alignItems: windowWidth >= 768 ? 'center' : 'stretch',
      marginBottom: 16,
    },
    openedPlantHeroImage: {
      width: windowWidth >= 768 ? 160 : '100%',
      height: windowWidth >= 768 ? 140 : 180,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surfaceLight,
    },
    openedPlantHeroDetails: {
      flex: 1,
      gap: 4,
    },
    heroBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
      flexWrap: 'wrap',
    },
    categoryBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.primary + '18',
    },
    categoryBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.5,
    },
    stageBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stageBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    databaseBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    databaseBadgeText: {
      fontSize: 9.5,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.5,
    },
    openedPlantHeroTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
    },
    openedPlantHeroVariety: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    highlightText: {
      color: colors.primary,
      fontWeight: '700',
    },
    openedPlantMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 4,
      marginBottom: 4,
    },
    metaRowItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    metaRowText: {
      fontSize: 11.5,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    openedPlantNotes: {
      fontSize: 12.5,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    openedPlantStatsStrip: {
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
    openedPlantStatItem: {
      alignItems: 'center',
      gap: 2,
    },
    statDivider: {
      width: 1,
      height: 24,
      backgroundColor: colors.border,
    },
    openedPlantStatLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    openedPlantStatValue: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },
    // Filter Card Styles
    filterCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 12,
      marginBottom: 16,
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
    filterPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
      ...Platform.select({
        web: { cursor: 'pointer' },
      }),
    },
    filterPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterPillText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filterPillTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    dayWiseHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    dayWiseTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
    },
    dayWiseSub: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    dayWiseList: {
      gap: 10,
    },
    loadMoreBtn: {
      paddingVertical: 14,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      ...Platform.select({
        web: { cursor: 'pointer' },
      }),
    },
    loadMoreBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
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
    datePickerWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateInput: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '700',
      flex: 1,
      padding: 0,
    },
    dateHint: {
      fontSize: 11,
      color: colors.textMuted,
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
