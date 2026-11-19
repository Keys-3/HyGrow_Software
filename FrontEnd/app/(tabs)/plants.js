import SafeImage from '../../src/components/SafeImage';
import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  Download,
  RefreshCw,
  Sliders,
  Cpu,
  FileText,
  Share2,
  Edit3,
} from 'lucide-react-native';
import { usePlantProfiles } from '../../src/hooks/usePlantProfiles';
import { useThemeColors, borderRadius, spacing } from '../../src/theme/theme';
import AtmosphericBackground from '../../src/components/AtmosphericBackground';
import { PressableScale } from '../../src/components/PressableScale';
import { getSeasonForDate } from '../../src/utils/annualSensorLogs';
import { filterPlantDailyLogs } from '../../src/utils/plantProfileData';
import { DEFAULT_SENSOR_SETS, getAssignedSensorSetForPlant } from '../../src/utils/sensorSets';
import { getLocalDateString } from '../../src/utils/dailySensorAveraging';

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

  // Navigation state: null = list of plant items; string = opened plant item log page
  const [selectedPlantId, setSelectedPlantId] = useState(null);

  // Dedicated Plant Profiles & 1-Year Day-wise Telemetry Hook
  const {
    dailyLogger,
    sensorPlant,
    sensorSets,
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
    assignSensorSetToPlant,
    deleteDailyLog,
    deleteEntirePlantHistory,
    deletePlantProfileEntirely,
    updatePlantProfile,
    addNewPlantProfile,
    fetchLogsFromDatabase,
    seedProfilesToDatabase,
  } = usePlantProfiles();

  // Search query for the main list of plant items
  const [plantListSearch, setPlantListSearch] = useState('');
  const [plantGridWidth, setPlantGridWidth] = useState(0);

  // Edit & Add Plant Modal State
  const [editPlantModalVisible, setEditPlantModalVisible] = useState(false);
  const [isCreatingNewPlant, setIsCreatingNewPlant] = useState(false);
  const [editingPlantId, setEditingPlantId] = useState(null);
  const [formPlantName, setFormPlantName] = useState('');
  const [formVariety, setFormVariety] = useState('');
  const [formCategory, setFormCategory] = useState('Leafy Greens');
  const [formZone, setFormZone] = useState('Zone A (Bench 1-4)');
  const [formZoneId, setFormZoneId] = useState('zone-a');
  const [formGrowingSystem, setFormGrowingSystem] = useState('Hydroponic System');
  const [formSensorSetId, setFormSensorSetId] = useState('set-main');
  const [formCurrentStage, setFormCurrentStage] = useState('Seedling');
  const [formPlantingDate, setFormPlantingDate] = useState('');
  const [formHarvestCycleDays, setFormHarvestCycleDays] = useState('30');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formTempMin, setFormTempMin] = useState('20');
  const [formTempMax, setFormTempMax] = useState('26');
  const [formHumMin, setFormHumMin] = useState('55');
  const [formHumMax, setFormHumMax] = useState('70');
  const [formPhMin, setFormPhMin] = useState('5.6');
  const [formPhMax, setFormPhMax] = useState('6.4');
  const [formEcMin, setFormEcMin] = useState('1.2');
  const [formEcMax, setFormEcMax] = useState('1.8');
  const [formWaterMin, setFormWaterMin] = useState('18');
  const [formWaterMax, setFormWaterMax] = useState('22');
  const [isSavingPlant, setIsSavingPlant] = useState(false);
  const [isRestoringDatabase, setIsRestoringDatabase] = useState(false);

  // Active opened plant profile object
  const openedPlant = useMemo(() => {
    if (!selectedPlantId) return null;
    return profiles.find((p) => p.id === selectedPlantId) || null;
  }, [profiles, selectedPlantId]);

  const assignedSensorSet = useMemo(() => {
    if (!openedPlant) return sensorSets[0] || DEFAULT_SENSOR_SETS[0];
    return getAssignedSensorSetForPlant(openedPlant.id, openedPlant.sensorSetId, sensorSets);
  }, [openedPlant, sensorSets]);

  const recent7Days = useMemo(() => {
    return activePlantDailyLogs.slice(0, 7).reverse();
  }, [activePlantDailyLogs]);

  // Reassign sensor set modal
  const [reassignModalVisible, setReassignModalVisible] = useState(false);
  const [selectedSetToAssign, setSelectedSetToAssign] = useState('set-main');
  const [isAssigningSet, setIsAssigningSet] = useState(false);

  // CSV Export Modal
  const [csvModalVisible, setCsvModalVisible] = useState(false);
  const [csvTextContent, setCsvTextContent] = useState('');

  // Action busy states
  const [isFetchingSinglePlant, setIsFetchingSinglePlant] = useState(false);

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
    setTargetDateString(dateStr || dailyLogger.todayDateString);
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
    try {
      const date = new Date(`${targetDateString}T12:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDateString) || Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== targetDateString) {
        throw new Error('Enter a valid log date in YYYY-MM-DD format.');
      }
      setUploading(true);
      const timestampToSave = date.toISOString();

      await addGrowthPhotoToPlant({
        plantId: targetPlantId,
        stage,
        imageUrl: selectedImage?.uri,
        notes: notes.trim(),
        readings: targetPlantId === sensorPlant.id && !dailyLogger.isOffline &&
          targetDateString === dailyLogger.todayDateString ? dailyLogger.liveReading : undefined,
        timestamp: timestampToSave,
      });

      setSelectedImage(null);
      setNotes('');
      setModalVisible(false);

      const targetPlant = profiles.find((p) => p.id === targetPlantId);
      const msg = `Saved ${targetPlant?.name || 'plant'} log for ${targetDateString || 'today'}.`;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert('Log Saved', msg);
      }
    } catch (e) {
      Alert.alert('Save Error', e.message || 'Failed to save the plant log.');
    } finally {
      setUploading(false);
    }
  };

  // Database sync
  const handleSyncDatabaseClick = async () => {
    const doSync = async () => {
      try {
        const result = await seedProfilesToDatabase();
        const msg = `Successfully synced ${result.count} plant profiles and 1-year historical telemetry into Firestore database!`;
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

  // Store today's computed daily average to Firestore
  const handleSyncTodayAverage = async () => {
    try {
      const record = await dailyLogger.syncTodayToFirestore();
      const msg = `Today's Daily Sensor Average (${record.sampleCount} samples) successfully saved to Firestore collections "daily_sensor_logs" & "plant_logs" for future analysis!`;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert('Daily Average Stored', msg);
      }
    } catch (err) {
      const errMsg = err?.message || 'Failed to sync daily average to Firestore.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(errMsg);
      } else {
        Alert.alert('Sync Failed', errMsg);
      }
    }
  };

  // 1. Fetch sensor data & create today's log for the opened plant (Single-Plant Action)
  const handleFetchTodayLogForOpenedPlant = async () => {
    if (!openedPlant) return;
    try {
      setIsFetchingSinglePlant(true);
      if (openedPlant.id !== sensorPlant.id) throw new Error('The live sensor is assigned to Methi.');
      await dailyLogger.syncTodayToFirestore();
      const msg = `Today's log for ${openedPlant.name} recorded from sensor set "${assignedSensorSet.name}" (${assignedSensorSet.zone}).`;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert("Today's Log Updated", msg);
      }
    } catch (err) {
      const errMsg = err?.message || 'Failed to fetch sensor data.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(errMsg);
      } else {
        Alert.alert('Fetch Failed', errMsg);
      }
    } finally {
      setIsFetchingSinglePlant(false);
    }
  };

  // 3. Reassign sensor set to plant with historical immutability notice
  const handleConfirmReassignSensorSet = async () => {
    if (!openedPlant) return;
    try {
      setIsAssigningSet(true);
      const ok = await assignSensorSetToPlant(openedPlant.id, selectedSetToAssign);
      if (ok) {
        const newSet = sensorSets.find((s) => s.id === selectedSetToAssign);
        const msg = `${openedPlant.name} reassigned to ${newSet?.name} (${newSet?.zone}).\n\nNotice: Historical daily records permanently preserve their original recorded sensor sets.`;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(msg);
        } else {
          Alert.alert('Sensor Set Reassigned', msg);
        }
        setReassignModalVisible(false);
      }
    } catch (err) {
      Alert.alert('Reassignment Failed', err?.message || 'Could not reassign sensor set.');
    } finally {
      setIsAssigningSet(false);
    }
  };

  // 4. Delete single day log from Firestore & local state
  const handleDeleteDayLog = (dayLog) => {
    const doDelete = async () => {
      try {
        await deleteDailyLog(openedPlant.id, dayLog.dateString, dayLog.id);
        const msg = `Day ${dayLog.dayNumber} (${dayLog.formattedDate}) log deleted from database.`;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(msg);
        } else {
          Alert.alert('Log Deleted', msg);
        }
      } catch (err) {
        Alert.alert('Delete Failed', err?.message || 'Could not delete daily log.');
      }
    };

    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined'
        ? window.confirm(`Delete daily log for ${dayLog.formattedDate}? This removes its Firestore record.`)
        : true;
      if (ok) void doDelete();
      return;
    }

    Alert.alert(
      'Delete Daily Log',
      `Delete daily log for ${dayLog.formattedDate}? This removes its Firestore record.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]
    );
  };

  // 5. Delete entire crop history
  const handleDeleteEntireCropHistory = () => {
    if (!openedPlant) return;
    const doWipe = async () => {
      try {
        await deleteEntirePlantHistory(openedPlant.id);
        const msg = `All 365 daily logs and canopy photos for ${openedPlant.name} have been deleted from the database.`;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(msg);
        } else {
          Alert.alert('Crop History Wiped', msg);
        }
        setSelectedPlantId(null);
      } catch (err) {
        Alert.alert('Wipe Failed', err?.message || 'Could not delete crop history.');
      }
    };

    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined'
        ? window.confirm(`Permanently delete all 365 daily logs and canopy photos for ${openedPlant.name}? This action cannot be undone.`)
        : true;
      if (ok) void doWipe();
      return;
    }

    Alert.alert(
      'Delete Entire Crop History',
      `Permanently delete all 365 daily logs and canopy photos for ${openedPlant.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete All History', style: 'destructive', onPress: doWipe },
      ]
    );
  };

  // 6. Open edit plant modal
  const handleOpenEditPlantModal = (plant) => {
    setIsCreatingNewPlant(false);
    setEditingPlantId(plant.id);
    setFormPlantName(plant.name || '');
    setFormVariety(plant.variety || '');
    setFormCategory(plant.category || 'Leafy Greens');
    setFormZone(plant.zone || 'Zone A');
    setFormZoneId(plant.zoneId || 'zone-a');
    setFormGrowingSystem(plant.growingSystem || 'Hydroponic System');
    setFormSensorSetId(plant.sensorSetId || 'set-main');
    setFormCurrentStage(plant.currentStage || 'Seedling');
    setFormPlantingDate((plant.plantingDate || new Date().toISOString()).slice(0, 10));
    setFormHarvestCycleDays(String(plant.harvestCycleDays || 30));
    setFormImageUrl(plant.imageUrl || '');
    setFormNotes(plant.notes || '');
    setFormTempMin(String(plant.optimalThresholds?.temperature?.min ?? 20));
    setFormTempMax(String(plant.optimalThresholds?.temperature?.max ?? 26));
    setFormHumMin(String(plant.optimalThresholds?.humidity?.min ?? 55));
    setFormHumMax(String(plant.optimalThresholds?.humidity?.max ?? 70));
    setFormPhMin(String(plant.optimalThresholds?.ph?.min ?? 5.6));
    setFormPhMax(String(plant.optimalThresholds?.ph?.max ?? 6.4));
    setFormEcMin(String(plant.optimalThresholds?.ec?.min ?? 1.2));
    setFormEcMax(String(plant.optimalThresholds?.ec?.max ?? 1.8));
    setFormWaterMin(String(plant.optimalThresholds?.waterTemp?.min ?? 18));
    setFormWaterMax(String(plant.optimalThresholds?.waterTemp?.max ?? 22));
    setEditPlantModalVisible(true);
  };

  // 7. Open add new plant modal
  const handleOpenAddPlantModal = () => {
    setIsCreatingNewPlant(true);
    const todayStr = getLocalDateString();
    setEditingPlantId(`plant-${Date.now()}`);
    setFormPlantName('Fenugreek');
    setFormVariety('Fenugreek');
    setFormCategory('Leafy Greens');
    setFormZone('Zone A (Bench 1-4)');
    setFormZoneId('zone-a');
    setFormGrowingSystem('Hydroponic System');
    setFormSensorSetId('set-main');
    setFormCurrentStage('Seedling');
    setFormPlantingDate(todayStr);
    setFormHarvestCycleDays('30');
    setFormImageUrl('https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80');
    setFormNotes('Cultivation started today with automated sensor telemetry.');
    setFormTempMin('20');
    setFormTempMax('26');
    setFormHumMin('55');
    setFormHumMax('70');
    setFormPhMin('5.6');
    setFormPhMax('6.4');
    setFormEcMin('1.2');
    setFormEcMax('1.8');
    setFormWaterMin('18');
    setFormWaterMax('22');
    setEditPlantModalVisible(true);
  };

  // 8. Save edited plant or create new plant
  const handleSavePlant = async () => {
    if (!formPlantName.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid crop name.');
      return;
    }
    const cycle = parseInt(formHarvestCycleDays, 10);
    if (isNaN(cycle) || cycle <= 0) {
      Alert.alert('Validation Error', 'Harvest cycle days must be a positive number.');
      return;
    }

    setIsSavingPlant(true);
    try {
      const thresholds = {
        temperature: { min: parseFloat(formTempMin) || 20, max: parseFloat(formTempMax) || 26 },
        humidity: { min: parseFloat(formHumMin) || 55, max: parseFloat(formHumMax) || 70 },
        ph: { min: parseFloat(formPhMin) || 5.6, max: parseFloat(formPhMax) || 6.4 },
        ec: { min: parseFloat(formEcMin) || 1.2, max: parseFloat(formEcMax) || 1.8 },
        waterTemp: { min: parseFloat(formWaterMin) || 18, max: parseFloat(formWaterMax) || 22 },
      };

      const plantPayload = {
        name: formPlantName.trim(),
        variety: formVariety.trim(),
        category: formCategory.trim() || 'Leafy Greens',
        zone: formZone.trim() || 'Zone A',
        zoneId: formZoneId || 'zone-a',
        growingSystem: formGrowingSystem.trim() || 'Hydroponic System',
        sensorSetId: formSensorSetId || 'set-main',
        currentStage: formCurrentStage || 'Seedling',
        plantingDate: new Date(`${formPlantingDate || getLocalDateString()}T12:00:00.000Z`).toISOString(),
        harvestCycleDays: cycle,
        imageUrl: formImageUrl.trim(),
        notes: formNotes.trim(),
        optimalThresholds: thresholds,
      };

      if (isCreatingNewPlant) {
        const newPlant = {
          id: editingPlantId || `plant-${Date.now()}`,
          ...plantPayload,
        };
        await addNewPlantProfile(newPlant);
        setActivePlantId(newPlant.id);
        const msg = `Crop "${newPlant.name}" has been successfully added to your monitored plants and saved to Firestore.`;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(msg);
        } else {
          Alert.alert('Plant Added', msg);
        }
      } else {
        await updatePlantProfile(editingPlantId, plantPayload);
        const msg = `Crop details for "${plantPayload.name}" have been updated in local storage and synced to Firestore.`;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(msg);
        } else {
          Alert.alert('Plant Updated', msg);
        }
      }

      setEditPlantModalVisible(false);
    } catch (err) {
      console.warn('[plants] Error saving plant:', err);
      Alert.alert('Save Failed', err?.message || 'Could not save plant details.');
    } finally {
      setIsSavingPlant(false);
    }
  };

  // 9. Delete plant item entirely (profile, daily logs, and photos)
  const handleConfirmDeletePlantEntirely = (plant) => {
    if (!plant) return;

    const doDelete = async () => {
      try {
        await deletePlantProfileEntirely(plant.id);
        const msg = `Crop "${plant.name}" and all its historical daily logs, sensor data, and photos have been permanently deleted from the database.`;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(msg);
        } else {
          Alert.alert('Plant Deleted', msg);
        }
        if (selectedPlantId === plant.id) {
          setSelectedPlantId(null);
        }
      } catch (err) {
        console.warn('[plants] Error deleting plant entirely:', err);
        Alert.alert('Delete Failed', err?.message || 'Could not delete plant profile.');
      }
    };

    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined'
        ? window.confirm(
            `Permanently delete "${plant.name}" (${plant.variety}) entirely?\n\nThis will remove the plant profile and all its daily sensor logs and growth photos from both the local device and Firestore database.`
          )
        : true;
      if (ok) void doDelete();
      return;
    }

    Alert.alert(
      'Delete Plant Item Entirely',
      `Permanently delete "${plant.name}" (${plant.variety}) entirely?\n\nThis will remove the plant profile and all its daily sensor logs and photos from Firestore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Plant Entirely', style: 'destructive', onPress: doDelete },
      ]
    );
  };

  // 10. Restore / Fetch logs from Cloud Database
  const handleRestoreLogsFromDatabase = async (plantId = null) => {
    setIsRestoringDatabase(true);
    try {
      const res = await fetchLogsFromDatabase(plantId || undefined);
      const msg = res.message || `Successfully fetched ${res.count} historical records from Firestore.`;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert('Database Hydrated', msg);
      }
    } catch (err) {
      console.warn('[plants] Error restoring logs from database:', err);
      Alert.alert('Database Fetch Error', err?.message || 'Could not fetch records from Firestore.');
    } finally {
      setIsRestoringDatabase(false);
    }
  };

  // 6. Export all daily records to CSV
  const handleOpenExportCsv = () => {
    if (!openedPlant) return;
    const headers = [
      'DayNumber',
      'Date',
      'Stage',
      'Season',
      'SensorSetId',
      'Zone',
      'GrowingSystem',
      'Source',
      'AirTemp_C',
      'Humidity_Pct',
      'pH',
      'EC_mS',
      'TDS_ppm',
      'WaterTemp_C',
      'WaterLevel_Pct',
      'Light_Lux',
      'VPD_kPa',
      'OptimalStatus',
      'SampleCount',
      'PhotosCount',
      'Notes',
    ];

    const rows = activePlantDailyLogs.map((log) => [
      log.dayNumber,
      log.dateString,
      `"${log.stage}"`,
      log.season,
      log.sensorSetId || openedPlant.sensorSetId || 'set-main',
      `"${log.zone || openedPlant.zone}"`,
      `"${log.growingSystem || openedPlant.growingSystem}"`,
      log.source || 'cloud',
      (log.readings.temperature?.toFixed(1) ?? '—'),
      (log.readings.humidity == null ? '—' : Math.round(log.readings.humidity)),
      (log.readings.ph?.toFixed(2) ?? '—'),
      (log.readings.ec?.toFixed(2) ?? '—'),
      log.readings.tds ?? Math.round(log.readings.ec * 500),
      (log.readings.waterTemp?.toFixed(1) ?? '—'),
      Math.round(log.readings.waterLevel ?? 85),
      Math.round(log.readings.lightIntensity ?? 14500),
      (log.readings.vpd?.toFixed(2) ?? '—'),
      log.isOptimal ? 'Optimal' : 'Sub-Optimal',
      log.sampleCount || 1,
      log.photos ? log.photos.length : 0,
      `"${(log.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    setCsvTextContent(csv);
    setCsvModalVisible(true);
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

  const plantGridGap = 16;
  const plantGridColumns = plantGridWidth > 0
    ? Math.max(1, Math.floor((plantGridWidth + plantGridGap) / (320 + plantGridGap)))
    : 1;
  const plantCardWidth = plantGridWidth > 0
    ? (plantGridWidth - (plantGridColumns - 1) * plantGridGap) / plantGridColumns
    : '100%';

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
                <Text style={styles.addBtnText}>
                  {width >= 600 ? "+ Log Today's Entry" : '+ Log Entry'}
                </Text>
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
              <SafeImage
                source={{ uri: openedPlant.imageUrl }}
                style={styles.openedPlantHeroImage}
                resizeMode="cover"
              />
              <View style={styles.openedPlantHeroDetails}>
                <View style={styles.heroBadgeRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText} numberOfLines={1}>
                      {openedPlant.category}
                    </Text>
                  </View>
                  <View style={styles.stageBadge}>
                    <Text style={styles.stageBadgeText}>{openedPlant.currentStage}</Text>
                  </View>
                  <View style={styles.databaseBadge}>
                    <Database size={11} color={themeColors.primary} />
                    <Text style={styles.databaseBadgeText}>DATABASE RECORD</Text>
                  </View>
                </View>

                <View style={styles.heroTitleRow}>
                  <Text style={styles.openedPlantHeroTitle}>{openedPlant.name}</Text>
                  <PressableScale
                    style={styles.heroEditPill}
                    onPress={() => handleOpenEditPlantModal(openedPlant)}
                    activeScale={0.95}
                  >
                    <Edit3 size={12} color={themeColors.primary} />
                    <Text style={styles.heroEditPillText}>Edit Crop</Text>
                  </PressableScale>
                </View>
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

            {/* 1-Year Historical Sensor Summary Strip: Clean Grid of Stat Tiles */}
            <View style={styles.openedPlantStatsStrip}>
              <View style={styles.openedPlantStatItem}>
                <Text style={styles.openedPlantStatLabel}>LOG RECORDS</Text>
                <Text style={styles.openedPlantStatValue}>365 Days</Text>
              </View>
              <View style={styles.openedPlantStatItem}>
                <Text style={styles.openedPlantStatLabel}>PHOTOS</Text>
                <Text style={styles.openedPlantStatValue}>{activePlantGrowthPhotos.filter((entry) => entry.imageUrl).length} Snaps</Text>
              </View>
              <View style={styles.openedPlantStatItem}>
                <Text style={styles.openedPlantStatLabel}>1-YR TEMP</Text>
                <Text style={styles.openedPlantStatValue}>{activePlantStats.avgTemp}°C</Text>
              </View>
              <View style={styles.openedPlantStatItem}>
                <Text style={styles.openedPlantStatLabel}>1-YR RH</Text>
                <Text style={styles.openedPlantStatValue}>{activePlantStats.avgHumidity}%</Text>
              </View>
              <View style={styles.openedPlantStatItem}>
                <Text style={styles.openedPlantStatLabel}>1-YR pH</Text>
                <Text style={styles.openedPlantStatValue}>{activePlantStats.avgPh}</Text>
              </View>
              <View style={styles.openedPlantStatItem}>
                <Text style={styles.openedPlantStatLabel}>1-YR EC</Text>
                <Text style={styles.openedPlantStatValue}>{activePlantStats.avgEc} mS</Text>
              </View>
              <View style={styles.openedPlantStatItem}>
                <Text style={styles.openedPlantStatLabel}>COMPLIANCE</Text>
                <Text style={[styles.openedPlantStatValue, { color: '#10B981' }]}>
                  {activePlantStats.optimalCompliancePercent}%
                </Text>
              </View>
            </View>
          </View>

          {/* SENSOR SET MAPPING & INTEGRATION CONTROL PANEL */}
          <View style={styles.sensorSetAssignmentCard}>
            <View style={styles.sensorSetCardHeader}>
              <View style={styles.sensorSetHeaderLeft}>
                <Cpu size={16} color={themeColors.primary} />
                <Text style={styles.sensorSetCardTitle}>ASSIGNED SENSOR SET & ZONE</Text>
              </View>
              <View style={styles.sensorSetBadge}>
                <Text style={styles.sensorSetBadgeText}>{assignedSensorSet.id.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.sensorSetDetailsRow}>
              <View style={styles.sensorSetDetailCol}>
                <Text style={styles.sensorSetDetailLabel}>Sensor Set Name</Text>
                <Text style={styles.sensorSetDetailVal}>{assignedSensorSet.name}</Text>
              </View>
              <View style={styles.sensorSetDetailCol}>
                <Text style={styles.sensorSetDetailLabel}>Assigned Zone</Text>
                <Text style={styles.sensorSetDetailVal}>📍 {assignedSensorSet.zone}</Text>
              </View>
              <View style={styles.sensorSetDetailCol}>
                <Text style={styles.sensorSetDetailLabel}>Growing System</Text>
                <Text style={styles.sensorSetDetailVal}>{assignedSensorSet.growingSystem}</Text>
              </View>
            </View>

            {/* Actions for this specific plant and sensor set */}
            <View style={styles.sensorSetActionsRow}>
              <PressableScale
                style={[styles.fetchSensorLogBtn, isFetchingSinglePlant && styles.actionBtnDisabled]}
                onPress={handleFetchTodayLogForOpenedPlant}
                disabled={isFetchingSinglePlant || dailyLogger.isSyncing || openedPlant.id !== sensorPlant.id || !dailyLogger.sampleCount}
                activeScale={0.97}
              >
                {isFetchingSinglePlant ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <RefreshCw size={14} color="#FFFFFF" strokeWidth={2.2} />
                )}
                <Text style={styles.fetchSensorLogBtnText}>
                  {isFetchingSinglePlant ? 'Fetching Sensor Data...' : "Fetch Sensor Data & Create Today's Log"}
                </Text>
              </PressableScale>

              <PressableScale
                style={styles.editCropDetailsBtn}
                onPress={() => handleOpenEditPlantModal(openedPlant)}
                activeScale={0.97}
              >
                <Edit3 size={13} color={themeColors.primary} strokeWidth={2.2} />
                <Text style={styles.editCropDetailsBtnText}>Edit Crop Details</Text>
              </PressableScale>

              <PressableScale
                style={styles.reassignSetBtn}
                onPress={() => {
                  setSelectedSetToAssign(openedPlant.sensorSetId || 'set-main');
                  setReassignModalVisible(true);
                }}
                activeScale={0.97}
              >
                <Sliders size={13} color={themeColors.primary} strokeWidth={2.2} />
                <Text style={styles.reassignSetBtnText}>Reassign Sensor Set</Text>
              </PressableScale>

              <PressableScale
                style={[styles.fetchDbBtn, isRestoringDatabase && styles.actionBtnDisabled]}
                onPress={() => handleRestoreLogsFromDatabase(openedPlant.id)}
                disabled={isRestoringDatabase}
                activeScale={0.97}
              >
                {isRestoringDatabase ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <Download size={13} color="#3B82F6" strokeWidth={2.2} />
                )}
                <Text style={styles.fetchDbBtnText}>
                  {isRestoringDatabase ? 'Restoring...' : 'Restore From DB'}
                </Text>
              </PressableScale>

              <PressableScale
                style={styles.exportCsvBtn}
                onPress={handleOpenExportCsv}
                activeScale={0.97}
              >
                <Download size={13} color="#10B981" strokeWidth={2.2} />
                <Text style={styles.exportCsvBtnText}>Export CSV</Text>
              </PressableScale>

              <PressableScale
                style={styles.deleteEntirePlantBtn}
                onPress={() => handleConfirmDeletePlantEntirely(openedPlant)}
                activeScale={0.97}
              >
                <Trash2 size={13} color="#EF4444" strokeWidth={2.2} />
                <Text style={styles.deleteEntirePlantBtnText}>Delete Plant Entirely</Text>
              </PressableScale>

              <PressableScale
                style={styles.wipeCropHistoryBtn}
                onPress={handleDeleteEntireCropHistory}
                activeScale={0.97}
              >
                <Trash2 size={13} color="#F59E0B" strokeWidth={2.2} />
                <Text style={styles.wipeCropHistoryBtnText}>Clear Daily Logs Only</Text>
              </PressableScale>
            </View>
          </View>

          {/* 7-DAY ENVIRONMENTAL TREND TELEMETRY CHARTS */}
          <View style={styles.environmentalTrendsCard}>
            <View style={styles.trendsHeader}>
              <View style={styles.trendsHeaderLeft}>
                <Activity size={15} color={themeColors.primary} />
                <Text style={styles.trendsTitle}>7-DAY ENVIRONMENTAL TRENDS</Text>
              </View>
              <Text style={styles.trendsSubtitle}>Historical readings from {assignedSensorSet.name}</Text>
            </View>

            <View style={styles.trendsGrid}>
              {/* Temp Trend */}
              <View style={styles.trendTile}>
                <View style={styles.trendTileTop}>
                  <Thermometer size={12} color="#EF4444" />
                  <Text style={styles.trendTileLabel}>Air Temp</Text>
                  <Text style={styles.trendTileAvg}>
                    {(recent7Days.reduce((a, c) => a + c.readings.temperature, 0) / (recent7Days.length || 1)).toFixed(1)}°C
                  </Text>
                </View>
                <View style={styles.barsContainer}>
                  {recent7Days.map((d, idx) => {
                    const h = Math.max(10, Math.min(36, (d.readings.temperature - 15) * 2.8));
                    return (
                      <View key={d.id || idx} style={styles.barCol}>
                        <View style={[styles.barFill, { height: h, backgroundColor: '#EF4444' }]} />
                        <Text style={styles.barDayText}>{d.dateString.slice(8)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Humidity Trend */}
              <View style={styles.trendTile}>
                <View style={styles.trendTileTop}>
                  <Droplets size={12} color="#3B82F6" />
                  <Text style={styles.trendTileLabel}>Humidity</Text>
                  <Text style={styles.trendTileAvg}>
                    {Math.round(recent7Days.reduce((a, c) => a + c.readings.humidity, 0) / (recent7Days.length || 1))}%
                  </Text>
                </View>
                <View style={styles.barsContainer}>
                  {recent7Days.map((d, idx) => {
                    const h = Math.max(10, Math.min(36, (d.readings.humidity - 40) * 0.9));
                    return (
                      <View key={d.id || idx} style={styles.barCol}>
                        <View style={[styles.barFill, { height: h, backgroundColor: '#3B82F6' }]} />
                        <Text style={styles.barDayText}>{d.dateString.slice(8)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* pH Trend */}
              <View style={styles.trendTile}>
                <View style={styles.trendTileTop}>
                  <Sparkles size={12} color="#10B981" />
                  <Text style={styles.trendTileLabel}>pH</Text>
                  <Text style={styles.trendTileAvg}>
                    {(recent7Days.reduce((a, c) => a + c.readings.ph, 0) / (recent7Days.length || 1)).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.barsContainer}>
                  {recent7Days.map((d, idx) => {
                    const h = Math.max(10, Math.min(36, (d.readings.ph - 5.0) * 18));
                    return (
                      <View key={d.id || idx} style={styles.barCol}>
                        <View style={[styles.barFill, { height: h, backgroundColor: '#10B981' }]} />
                        <Text style={styles.barDayText}>{d.dateString.slice(8)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* EC Trend */}
              <View style={styles.trendTile}>
                <View style={styles.trendTileTop}>
                  <Zap size={12} color="#F59E0B" />
                  <Text style={styles.trendTileLabel}>EC</Text>
                  <Text style={styles.trendTileAvg}>
                    {(recent7Days.reduce((a, c) => a + c.readings.ec, 0) / (recent7Days.length || 1)).toFixed(2)} mS
                  </Text>
                </View>
                <View style={styles.barsContainer}>
                  {recent7Days.map((d, idx) => {
                    const h = Math.max(10, Math.min(36, (d.readings.ec - 0.5) * 22));
                    return (
                      <View key={d.id || idx} style={styles.barCol}>
                        <View style={[styles.barFill, { height: h, backgroundColor: '#F59E0B' }]} />
                        <Text style={styles.barDayText}>{d.dateString.slice(8)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Water Temp Trend */}
              <View style={styles.trendTile}>
                <View style={styles.trendTileTop}>
                  <Droplets size={12} color="#06B6D4" />
                  <Text style={styles.trendTileLabel}>Water</Text>
                  <Text style={styles.trendTileAvg}>
                    {(recent7Days.reduce((a, c) => a + c.readings.waterTemp, 0) / (recent7Days.length || 1)).toFixed(1)}°C
                  </Text>
                </View>
                <View style={styles.barsContainer}>
                  {recent7Days.map((d, idx) => {
                    const h = Math.max(10, Math.min(36, (d.readings.waterTemp - 15) * 2.8));
                    return (
                      <View key={d.id || idx} style={styles.barCol}>
                        <View style={[styles.barFill, { height: h, backgroundColor: '#06B6D4' }]} />
                        <Text style={styles.barDayText}>{d.dateString.slice(8)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* VPD Trend */}
              <View style={styles.trendTile}>
                <View style={styles.trendTileTop}>
                  <Activity size={12} color="#EC4899" />
                  <Text style={styles.trendTileLabel}>VPD</Text>
                  <Text style={styles.trendTileAvg}>
                    {(recent7Days.reduce((a, c) => a + c.readings.vpd, 0) / (recent7Days.length || 1)).toFixed(2)} kPa
                  </Text>
                </View>
                <View style={styles.barsContainer}>
                  {recent7Days.map((d, idx) => {
                    const h = Math.max(10, Math.min(36, d.readings.vpd * 22));
                    return (
                      <View key={d.id || idx} style={styles.barCol}>
                        <View style={[styles.barFill, { height: h, backgroundColor: '#EC4899' }]} />
                        <Text style={styles.barDayText}>{d.dateString.slice(8)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {openedPlant.id === sensorPlant.id && <View style={styles.dailyLoggerPanel}>
            <View style={styles.dailyLoggerTopRow}>
              <View style={styles.dailyLoggerTitleGroup}>
                <View style={styles.dailyLoggerPulseDot} />
                <Activity size={15} color={themeColors.primary} />
                <Text style={styles.dailyLoggerTitle}>AUTOMATED DAILY SENSOR LOGGER</Text>
              </View>
              <View style={styles.dailyLoggerBadgeRow}>
                <View style={styles.sampleCountPill}>
                  <Text style={styles.sampleCountPillText}>
                    {dailyLogger.sampleCount} Readings Averaged Today
                  </Text>
                </View>
                <View
                  style={[
                    styles.firestoreStatusPill,
                    dailyLogger.lastSyncedAt && styles.firestoreStatusPillActive,
                  ]}
                >
                  <Database
                    size={11}
                    color={dailyLogger.lastSyncedAt ? '#10B981' : themeColors.textMuted}
                  />
                  <Text
                    style={[
                      styles.firestoreStatusText,
                      dailyLogger.lastSyncedAt && styles.firestoreStatusTextActive,
                    ]}
                  >
                    {dailyLogger.isSyncing
                      ? 'Syncing to Firestore...'
                      : dailyLogger.lastSyncedAt
                      ? 'Firestore Synced'
                      : 'Firestore Auto-Sync Ready'}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.dailyLoggerDesc}>
              Methi sensor readings for {dailyLogger.todayDateString} are averaged and synced to Firestore. {dailyLogger.isOffline ? dailyLogger.connectionError || (dailyLogger.connectionStatus === 'connected' ? 'Device connected. Waiting for a fresh sensor sample.' : 'Waiting for the assigned device.') : 'Receiving sensor readings.'}
            </Text>

            {dailyLogger.syncError ? <Text style={styles.dailyLoggerDesc}>{dailyLogger.syncError}</Text> : null}
            {/* Today's Running Daily Average Chips */}
            {dailyLogger.sampleCount > 0 && <View style={styles.dailyLoggerAveragesRow}>
              <View style={styles.dailyAvgChip}>
                <Text style={styles.dailyAvgChipLabel}>AVG TEMP</Text>
                <Text style={styles.dailyAvgChipVal}>
                  {(dailyLogger.todayRecord.readings.temperature?.toFixed(1) ?? '—')}°C
                </Text>
                <Text style={styles.dailyAvgChipRange}>
                  {dailyLogger.todayRecord.minReadings.temperature}° - {dailyLogger.todayRecord.maxReadings.temperature}°
                </Text>
              </View>

              <View style={styles.dailyAvgChip}>
                <Text style={styles.dailyAvgChipLabel}>AVG RH</Text>
                <Text style={styles.dailyAvgChipVal}>
                  {(dailyLogger.todayRecord.readings.humidity == null ? '—' : Math.round(dailyLogger.todayRecord.readings.humidity))}%
                </Text>
                <Text style={styles.dailyAvgChipRange}>
                  {dailyLogger.todayRecord.minReadings.humidity}% - {dailyLogger.todayRecord.maxReadings.humidity}%
                </Text>
              </View>

              <View style={styles.dailyAvgChip}>
                <Text style={styles.dailyAvgChipLabel}>AVG pH</Text>
                <Text style={styles.dailyAvgChipVal}>
                  {(dailyLogger.todayRecord.readings.ph?.toFixed(2) ?? '—')}
                </Text>
                <Text style={styles.dailyAvgChipRange}>
                  {dailyLogger.todayRecord.minReadings.ph} - {dailyLogger.todayRecord.maxReadings.ph}
                </Text>
              </View>

              <View style={styles.dailyAvgChip}>
                <Text style={styles.dailyAvgChipLabel}>AVG EC</Text>
                <Text style={styles.dailyAvgChipVal}>
                  {(dailyLogger.todayRecord.readings.ec?.toFixed(2) ?? '—')} mS
                </Text>
                <Text style={styles.dailyAvgChipRange}>
                  {dailyLogger.todayRecord.minReadings.ec} - {dailyLogger.todayRecord.maxReadings.ec}
                </Text>
              </View>

              <View style={styles.dailyAvgChip}>
                <Text style={styles.dailyAvgChipLabel}>AVG WATER</Text>
                <Text style={styles.dailyAvgChipVal}>
                  {(dailyLogger.todayRecord.readings.waterTemp?.toFixed(1) ?? '—')}°C
                </Text>
                <Text style={styles.dailyAvgChipRange}>
                  {dailyLogger.todayRecord.minReadings.waterTemp}° - {dailyLogger.todayRecord.maxReadings.waterTemp}°
                </Text>
              </View>

              <View style={styles.dailyAvgChip}>
                <Text style={styles.dailyAvgChipLabel}>AVG VPD</Text>
                <Text style={styles.dailyAvgChipVal}>
                  {(dailyLogger.todayRecord.readings.vpd?.toFixed(2) ?? '—')} kPa
                </Text>
                <Text style={styles.dailyAvgChipRange}>
                  {dailyLogger.todayRecord.minReadings.vpd} - {dailyLogger.todayRecord.maxReadings.vpd}
                </Text>
              </View>
            </View>}

            {/* Action Buttons Row */}
            <View style={styles.dailyLoggerActionRow}>
              <PressableScale
                style={[
                  styles.dailyLoggerSyncBtn,
                  dailyLogger.isSyncing && styles.dailyLoggerSyncBtnDisabled,
                ]}
                onPress={handleSyncTodayAverage}
                disabled={dailyLogger.isSyncing || !dailyLogger.sampleCount}
                activeScale={0.97}
              >
                {dailyLogger.isSyncing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <CheckCircle2 size={14} color="#FFFFFF" strokeWidth={2.2} />
                )}
                <Text style={styles.dailyLoggerSyncBtnText}>
                  {dailyLogger.isSyncing
                    ? 'Syncing to Firestore...'
                    : "Store Today's Average in Firestore"}
                </Text>
              </PressableScale>

            </View>
          </View>}

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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollRow}>
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
              </ScrollView>
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
                  windowWidth={width}
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
                        isAutomatedDailyAvg: dayLog.isAutomatedDailyAvg,
                        sampleCount: dayLog.sampleCount,
                        minReadings: dayLog.minReadings,
                        maxReadings: dayLog.maxReadings,
                        isFirestoreSynced: dayLog.isFirestoreSynced,
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
                  onDeleteLog={() => handleDeleteDayLog(dayLog)}
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

        {/* Reassign Sensor Set Modal */}
        {renderReassignSensorSetModal()}

        {/* Export to CSV Modal */}
        {renderCsvExportModal()}

        {/* Edit & Add Plant Modal */}
        {renderEditPlantModal()}
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
Select a plant to view its log. Live sensor readings are assigned to Methi.
            </Text>
          </View>

          <View style={styles.headerActions}>
            <PressableScale
              style={styles.newCropBtn}
              onPress={handleOpenAddPlantModal}
              activeScale={0.96}
            >
              <Plus size={15} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.newCropBtnText}>+ Add Plant</Text>
            </PressableScale>

            <PressableScale
              style={styles.addBtn}
              onPress={() => handleOpenUploadModal(activePlantId, null, 'Vegetative')}
              activeScale={0.96}
            >
              <Camera size={15} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.addBtnText}>+ Record Plant Log</Text>
            </PressableScale>

            <PressableScale
              style={[styles.restoreBtn, isRestoringDatabase && styles.syncBtnDisabled]}
              onPress={() => handleRestoreLogsFromDatabase()}
              disabled={isRestoringDatabase}
              activeScale={0.96}
            >
              {isRestoringDatabase ? (
                <ActivityIndicator size="small" color={themeColors.primary} />
              ) : (
                <Download size={14} color={themeColors.primary} strokeWidth={2.2} />
              )}
              <Text style={styles.restoreBtnText}>
                {isRestoringDatabase ? 'Restoring...' : 'Restore DB'}
              </Text>
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

        {/* OVERVIEW DASHBOARD: ACTIVE CROPS, SENSOR SETS, & REAL-TIME TELEMETRY PROVENANCE */}
        <View style={styles.dashboardStatsOverview}>
          <View style={styles.dashStatCard}>
            <Text style={styles.dashStatLabel}>ACTIVE CROPS</Text>
            <Text style={styles.dashStatVal}>{profiles.length} Crops</Text>
            <Text style={styles.dashStatSub}>Monitored Daily</Text>
          </View>
          <View style={styles.dashStatCard}>
            <Text style={styles.dashStatLabel}>CONNECTED SENSOR SETS</Text>
            <Text style={styles.dashStatVal}>{sensorSets.length} Sensor Sets</Text>
            <Text style={styles.dashStatSub}>Zone A, Zone B, Zone C</Text>
          </View>
          <View style={styles.dashStatCard}>
            <Text style={styles.dashStatLabel}>TODAY'S READINGS</Text>
            <Text style={styles.dashStatVal}>{dailyLogger.sampleCount} Samples</Text>
            <Text style={styles.dashStatSub}>Auto-Logged to Cloud</Text>
          </View>
          <View style={styles.dashStatCard}>
            <Text style={styles.dashStatLabel}>TELEMETRY PROVENANCE</Text>
            <View style={styles.sourcePillWrap}>
              <View
                style={[
                  styles.sourceDot,
                  dailyLogger.isOffline
                    ? styles.sourceDotSim
                    : styles.sourceDotLive,
                ]}
              />
              <Text
                style={[
                  styles.dashStatVal,
                  { fontSize: 13 },
                  dailyLogger.isOffline
                    ? { color: '#F59E0B' }
                    : { color: '#10B981' },
                ]}
              >
                {dailyLogger.isOffline ? 'WAITING FOR DATA' : 'LIVE HARDWARE'}
              </Text>
            </View>
            <Text style={styles.dashStatSub}>
              {dailyLogger.isOffline
                ? 'Waiting for the assigned Methi device'
                : 'ESP32 Probes Connected'}
            </Text>
          </View>
        </View>

        {/* Daily Sensor Auto-Logger Status Strip */}
        <View style={styles.catalogAutoLogBar}>
          <View style={styles.catalogAutoLogLeft}>
            <View style={styles.dailyLoggerPulseDot} />
            <Activity size={14} color={themeColors.primary} />
            <Text style={styles.catalogAutoLogTitle}>
              Methi Sensor Logger: {dailyLogger.sampleCount} samples averaged today ({dailyLogger.todayDateString})
            </Text>
          </View>
          <View style={styles.catalogAutoLogPill}>
            <Database size={11} color="#10B981" />
            <Text style={styles.catalogAutoLogPillText}>
              {dailyLogger.lastSyncedAt ? 'FIRESTORE SYNCED' : 'FIRESTORE CLOUD READY'}
            </Text>
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
        <View
          style={styles.plantItemsGrid}
          onLayout={(event) => {
            const nextWidth = Math.floor(event.nativeEvent.layout.width);
            if (nextWidth !== plantGridWidth) setPlantGridWidth(nextWidth);
          }}
        >
          {filteredPlantList.map((plant) => (
            <PlantItemCatalogCard
              key={plant.id}
              plant={plant}
              colors={themeColors}
              cardWidth={plantCardWidth}
              onOpenRecord={() => handleOpenPlantRecord(plant.id)}
              onEdit={() => handleOpenEditPlantModal(plant)}
              onDelete={() => handleConfirmDeletePlantEntirely(plant)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Upload Modal */}
      {renderUploadModal()}

      {/* 9-Point Telemetry Inspection Modal */}
      {renderInspectModal()}

      {/* Reassign Sensor Set Modal */}
      {renderReassignSensorSetModal()}

      {/* Export to CSV Modal */}
      {renderCsvExportModal()}

      {/* Edit & Add Plant Modal */}
      {renderEditPlantModal()}
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
                <Text style={styles.modalTitle}>Record Plant Log</Text>
                <Text style={styles.modalSubtitle}>
                  Add a log entry for {targetDateString || 'today'}
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
                <Text style={styles.inputLabel}>Log Date</Text>
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

              <Text style={styles.inputLabel}>Photo (optional)</Text>
              <View style={styles.photoUploadArea}>
                {selectedImage?.uri ? (
                  <View style={styles.previewContainer}>
                    <SafeImage source={{ uri: selectedImage.uri }} style={styles.previewImg} resizeMode="cover" />
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

            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={uploading}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <PressableScale
                style={[styles.submitBtn, uploading && styles.submitBtnDisabled]}
                onPress={handleSaveGrowthPhoto}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Camera size={16} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.submitBtnText}>Save Log</Text>
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
                <SafeImage
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

              {inspectItem.data.isAutomatedDailyAvg ? (
                <View style={styles.autoDailyModalBadge}>
                  <View style={styles.autoDailyModalHeader}>
                    <Activity size={14} color="#10B981" />
                    <Text style={styles.autoDailyModalTitle}>
                      AUTOMATED DAILY AVERAGE SENSOR TELEMETRY
                    </Text>
                  </View>
                  <Text style={styles.autoDailyModalSub}>
                    Calculated from {inspectItem.data.sampleCount || 1} readings sampled throughout this day. Stored in Firestore collections "daily_sensor_logs" & "plant_logs" for future analysis.
                  </Text>
                  {inspectItem.data.minReadings && inspectItem.data.maxReadings ? (
                    <View style={styles.dailyMinMaxRow}>
                      <View style={styles.minMaxItem}>
                        <Text style={styles.minMaxLabel}>TEMP RANGE</Text>
                        <Text style={styles.minMaxVal}>
                          {inspectItem.data.minReadings.temperature?.toFixed(1)}° - {inspectItem.data.maxReadings.temperature?.toFixed(1)}°C
                        </Text>
                      </View>
                      <View style={styles.minMaxItem}>
                        <Text style={styles.minMaxLabel}>RH RANGE</Text>
                        <Text style={styles.minMaxVal}>
                          {Math.round(inspectItem.data.minReadings.humidity)}% - {Math.round(inspectItem.data.maxReadings.humidity)}%
                        </Text>
                      </View>
                      <View style={styles.minMaxItem}>
                        <Text style={styles.minMaxLabel}>pH RANGE</Text>
                        <Text style={styles.minMaxVal}>
                          {inspectItem.data.minReadings.ph?.toFixed(2)} - {inspectItem.data.maxReadings.ph?.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.minMaxItem}>
                        <Text style={styles.minMaxLabel}>EC RANGE</Text>
                        <Text style={styles.minMaxVal}>
                          {inspectItem.data.minReadings.ec?.toFixed(2)} - {inspectItem.data.maxReadings.ec?.toFixed(2)} mS
                        </Text>
                      </View>
                    </View>
                  ) : null}
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
                  value={`${inspectItem.data.readings?.temperature?.toFixed(1) ?? '—'} °C`}
                  color="#EF4444"
                  colors={themeColors}
                />
                <MetricCard
                  icon={Droplets}
                  label="Relative Humidity"
                  value={`${inspectItem.data.readings?.humidity ? Math.round(inspectItem.data.readings?.humidity) : '—'} %`}
                  color="#3B82F6"
                  colors={themeColors}
                />
                <MetricCard
                  icon={Sparkles}
                  label="Nutrient pH"
                  value={`${inspectItem.data.readings?.ph?.toFixed(2) ?? '—'}`}
                  color="#10B981"
                  colors={themeColors}
                />
                <MetricCard
                  icon={Zap}
                  label="Electroconductivity"
                  value={`${inspectItem.data.readings?.ec?.toFixed(2) ?? '—'} mS/cm`}
                  color="#F59E0B"
                  colors={themeColors}
                />
                <MetricCard
                  icon={Activity}
                  label="Total Dissolved Solids"
                  value={`${inspectItem.data.readings?.tds ?? (inspectItem.data.readings?.ec ? Math.round(inspectItem.data.readings?.ec * 500) : '—')} ppm`}
                  color="#8B5CF6"
                  colors={themeColors}
                />
                <MetricCard
                  icon={Droplets}
                  label="Water Reservoir Temp"
                  value={`${inspectItem.data.readings?.waterTemp?.toFixed(1) ?? '—'} °C`}
                  color="#06B6D4"
                  colors={themeColors}
                />
                <MetricCard
                  icon={Layers}
                  label="Reservoir Water Level"
                  value={`${inspectItem.data.readings?.waterLevel ? Math.round(inspectItem.data.readings?.waterLevel) : '—'} %`}
                  color="#14B8A6"
                  colors={themeColors}
                />
                <MetricCard
                  icon={Sun}
                  label="Photoperiod Light"
                  value={`${inspectItem.data.readings?.lightIntensity ? Math.round(inspectItem.data.readings?.lightIntensity) : '—'} Lux`}
                  color="#FBBF24"
                  colors={themeColors}
                />
                <MetricCard
                  icon={Activity}
                  label="Vapor Pressure Deficit"
                  value={`${inspectItem.data.readings?.vpd?.toFixed(2) ?? '—'} kPa`}
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

  function renderReassignSensorSetModal() {
    if (!reassignModalVisible || !openedPlant) return null;

    return (
      <Modal
        visible={true}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setReassignModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxWidth: 540 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Reassign Sensor Set</Text>
                <Text style={styles.modalSubtitle}>
                  Select telemetry sensor set for {openedPlant.name}
                </Text>
              </View>
              <Pressable onPress={() => setReassignModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color={themeColors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              {/* Notice regarding historical immutability */}
              <View style={styles.immutabilityNotice}>
                <Info size={16} color={themeColors.primary} />
                <View style={styles.immutabilityNoticeTextWrap}>
                  <Text style={styles.immutabilityNoticeTitle}>Historical Sensor Immutability</Text>
                  <Text style={styles.immutabilityNoticeDesc}>
                    Reassigning this sensor set applies to future daily records. All past historical records permanently preserve the sensor set and zone that recorded them.
                  </Text>
                </View>
              </View>

              <Text style={styles.reassignListLabel}>AVAILABLE SENSOR SETS:</Text>

              {sensorSets.map((s) => {
                const isSelected = selectedSetToAssign === s.id;
                return (
                  <PressableScale
                    key={s.id}
                    style={[styles.sensorSetOptionCard, isSelected && styles.sensorSetOptionCardActive]}
                    onPress={() => setSelectedSetToAssign(s.id)}
                    activeScale={0.98}
                  >
                    <View style={styles.sensorSetOptionHeader}>
                      <View style={styles.sensorSetOptionTitleGroup}>
                        <View style={[styles.sensorOptionRadio, isSelected && styles.sensorOptionRadioActive]}>
                          {isSelected && <View style={styles.sensorOptionRadioInner} />}
                        </View>
                        <View>
                          <Text style={[styles.sensorOptionName, isSelected && styles.sensorOptionNameActive]}>
                            {s.name}
                          </Text>
                          <Text style={styles.sensorOptionZone}>📍 {s.zone}</Text>
                        </View>
                      </View>
                      <View style={styles.sensorOptionBadge}>
                        <Text style={styles.sensorOptionBadgeText}>{s.id.toUpperCase()}</Text>
                      </View>
                    </View>

                    <Text style={styles.sensorOptionSystem}>{s.growingSystem}</Text>

                    <View style={styles.sensorOptionProbesRow}>
                      <Text style={styles.sensorOptionProbesLabel}>Probes: </Text>
                      <Text style={styles.sensorOptionProbesText}>
                        {(s.sensorTypes || []).slice(0, 3).join(', ')}...
                      </Text>
                    </View>
                  </PressableScale>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setReassignModalVisible(false)}
                disabled={isAssigningSet}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <PressableScale
                style={[styles.submitBtn, isAssigningSet && styles.submitBtnDisabled]}
                onPress={handleConfirmReassignSensorSet}
                disabled={isAssigningSet}
              >
                {isAssigningSet ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.submitBtnText}>Confirm Sensor Set</Text>
                  </>
                )}
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  function renderCsvExportModal() {
    if (!csvModalVisible || !openedPlant) return null;

    return (
      <Modal
        visible={true}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCsvModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxWidth: 680, maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Export 365-Day Environmental CSV</Text>
                <Text style={styles.modalSubtitle}>
                  Historical telemetry & canopy records for {openedPlant.name}
                </Text>
              </View>
              <Pressable onPress={() => setCsvModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color={themeColors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              <Text style={styles.csvPreviewDesc}>
                Full time-series data including daily Temp, RH, pH, EC, TDS, Water Temp, Water Level, Lux, VPD, sensor set provenance, and attached photo links.
              </Text>
              <View style={styles.csvCodeBox}>
                <TextInput
                  style={styles.csvCodeText}
                  value={csvTextContent}
                  multiline={true}
                  editable={false}
                  selectTextOnFocus={true}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setCsvModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Close</Text>
              </Pressable>

              <PressableScale
                style={styles.submitBtn}
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    try {
                      const blob = new Blob([csvTextContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.setAttribute('href', url);
                      link.setAttribute('download', `${openedPlant.id}_365day_sensor_logs.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.alert(`Downloaded ${openedPlant.id}_365day_sensor_logs.csv!`);
                    } catch {
                      window.alert('CSV generated. Please copy text from preview box above.');
                    }
                  } else {
                    Alert.alert('CSV Ready', 'You can select and copy the text from the preview box above.');
                  }
                }}
              >
                <Download size={15} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.submitBtnText}>Download CSV</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  function renderEditPlantModal() {
    if (!editPlantModalVisible) return null;

    return (
      <Modal
        visible={true}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEditPlantModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxWidth: 620, maxHeight: '90%' }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.modalTitle}>
                  {isCreatingNewPlant ? '+ Add New Crop' : `Edit Crop: ${formPlantName || 'Plant'}`}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {isCreatingNewPlant
                    ? 'Register a new crop to monitor with assigned sensors and permanent Firestore database logs.'
                    : 'Edit crop name, variety, zone, assigned sensor set, stage, and optimal environmental thresholds.'}
                </Text>
              </View>
              <Pressable onPress={() => setEditPlantModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color={themeColors.text} />
              </Pressable>
            </View>

            {/* Modal Scrollable Body */}
            <ScrollView style={styles.modalBody} contentContainerStyle={[styles.modalBodyContent, { gap: 14 }]}>
              {/* Row 1: Crop Name & Variety */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Crop / Plant Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Fenugreek (Methi)"
                    placeholderTextColor={themeColors.textMuted}
                    value={formPlantName}
                    onChangeText={setFormPlantName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Variety *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Fenugreek / Pusa Early"
                    placeholderTextColor={themeColors.textMuted}
                    value={formVariety}
                    onChangeText={setFormVariety}
                  />
                </View>
              </View>

              {/* Row 2: Category & Growing Zone */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Category</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Leafy Greens, Herbs"
                    placeholderTextColor={themeColors.textMuted}
                    value={formCategory}
                    onChangeText={setFormCategory}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Growing Zone</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Zone A (Bench 1-4)"
                    placeholderTextColor={themeColors.textMuted}
                    value={formZone}
                    onChangeText={setFormZone}
                  />
                </View>
              </View>

              {/* Row 3: Growing System & Assigned Sensor Set */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Growing System</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Hydroponic System, NFT"
                    placeholderTextColor={themeColors.textMuted}
                    value={formGrowingSystem}
                    onChangeText={setFormGrowingSystem}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Assigned Sensor Set</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 4 }}>
                    {sensorSets.map((s) => (
                      <Pressable
                        key={s.id}
                        style={[
                          styles.filterPill,
                          formSensorSetId === s.id && styles.filterPillActive,
                        ]}
                        onPress={() => {
                          setFormSensorSetId(s.id);
                          setFormZone(s.zone || formZone);
                          setFormZoneId(s.zoneId || formZoneId);
                        }}
                      >
                        <Text style={[styles.filterPillText, formSensorSetId === s.id && styles.filterPillTextActive]}>
                          {s.name} ({s.id.toUpperCase()})
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Growth Stage Selector */}
              <View>
                <Text style={styles.fieldLabel}>Current Growth Stage</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 4 }}>
                  {['Germination', 'Seedling', 'Vegetative', 'Flowering', 'Fruiting', 'Harvest Ready'].map((st) => (
                    <Pressable
                      key={st}
                      style={[
                        styles.filterPill,
                        formCurrentStage === st && styles.filterPillActive,
                      ]}
                      onPress={() => setFormCurrentStage(st)}
                    >
                      <Text style={[styles.filterPillText, formCurrentStage === st && styles.filterPillTextActive]}>
                        {st}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Row 4: Planting Date & Harvest Cycle Days */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Planting Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={themeColors.textMuted}
                    value={formPlantingDate}
                    onChangeText={setFormPlantingDate}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Harvest Cycle (Days)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="30"
                    placeholderTextColor={themeColors.textMuted}
                    keyboardType="numeric"
                    value={formHarvestCycleDays}
                    onChangeText={setFormHarvestCycleDays}
                  />
                </View>
              </View>

              {/* Optimal Environmental Targets */}
              <View style={styles.thresholdsSectionCard}>
                <Text style={styles.thresholdsSectionTitle}>OPTIMAL ENVIRONMENTAL TARGETS</Text>
                <View style={styles.thresholdsGrid}>
                  <View style={styles.thresholdCol}>
                    <Text style={styles.thresholdInputLabel}>Temp (°C)</Text>
                    <View style={styles.thresholdMinMaxRow}>
                      <TextInput
                        style={styles.thresholdInput}
                        placeholder="Min"
                        placeholderTextColor={themeColors.textMuted}
                        keyboardType="numeric"
                        value={formTempMin}
                        onChangeText={setFormTempMin}
                      />
                      <Text style={{ color: themeColors.textMuted }}>–</Text>
                      <TextInput
                        style={styles.thresholdInput}
                        placeholder="Max"
                        placeholderTextColor={themeColors.textMuted}
                        keyboardType="numeric"
                        value={formTempMax}
                        onChangeText={setFormTempMax}
                      />
                    </View>
                  </View>

                  <View style={styles.thresholdCol}>
                    <Text style={styles.thresholdInputLabel}>Humidity (%)</Text>
                    <View style={styles.thresholdMinMaxRow}>
                      <TextInput
                        style={styles.thresholdInput}
                        placeholder="Min"
                        placeholderTextColor={themeColors.textMuted}
                        keyboardType="numeric"
                        value={formHumMin}
                        onChangeText={setFormHumMin}
                      />
                      <Text style={{ color: themeColors.textMuted }}>–</Text>
                      <TextInput
                        style={styles.thresholdInput}
                        placeholder="Max"
                        placeholderTextColor={themeColors.textMuted}
                        keyboardType="numeric"
                        value={formHumMax}
                        onChangeText={setFormHumMax}
                      />
                    </View>
                  </View>

                  <View style={styles.thresholdCol}>
                    <Text style={styles.thresholdInputLabel}>pH Level</Text>
                    <View style={styles.thresholdMinMaxRow}>
                      <TextInput
                        style={styles.thresholdInput}
                        placeholder="Min"
                        placeholderTextColor={themeColors.textMuted}
                        keyboardType="numeric"
                        value={formPhMin}
                        onChangeText={setFormPhMin}
                      />
                      <Text style={{ color: themeColors.textMuted }}>–</Text>
                      <TextInput
                        style={styles.thresholdInput}
                        placeholder="Max"
                        placeholderTextColor={themeColors.textMuted}
                        keyboardType="numeric"
                        value={formPhMax}
                        onChangeText={setFormPhMax}
                      />
                    </View>
                  </View>

                  <View style={styles.thresholdCol}>
                    <Text style={styles.thresholdInputLabel}>EC (mS/cm)</Text>
                    <View style={styles.thresholdMinMaxRow}>
                      <TextInput
                        style={styles.thresholdInput}
                        placeholder="Min"
                        placeholderTextColor={themeColors.textMuted}
                        keyboardType="numeric"
                        value={formEcMin}
                        onChangeText={setFormEcMin}
                      />
                      <Text style={{ color: themeColors.textMuted }}>–</Text>
                      <TextInput
                        style={styles.thresholdInput}
                        placeholder="Max"
                        placeholderTextColor={themeColors.textMuted}
                        keyboardType="numeric"
                        value={formEcMax}
                        onChangeText={setFormEcMax}
                      />
                    </View>
                  </View>

                  <View style={styles.thresholdCol}>
                    <Text style={styles.thresholdInputLabel}>Water Temp (°C)</Text>
                    <View style={styles.thresholdMinMaxRow}>
                      <TextInput
                        style={styles.thresholdInput}
                        placeholder="Min"
                        placeholderTextColor={themeColors.textMuted}
                        keyboardType="numeric"
                        value={formWaterMin}
                        onChangeText={setFormWaterMin}
                      />
                      <Text style={{ color: themeColors.textMuted }}>–</Text>
                      <TextInput
                        style={styles.thresholdInput}
                        placeholder="Max"
                        placeholderTextColor={themeColors.textMuted}
                        keyboardType="numeric"
                        value={formWaterMax}
                        onChangeText={setFormWaterMax}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Image URL & Notes */}
              <View>
                <Text style={styles.fieldLabel}>Image URL (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor={themeColors.textMuted}
                  value={formImageUrl}
                  onChangeText={setFormImageUrl}
                />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Crop Notes / Comments</Text>
                <TextInput
                  style={[styles.formInput, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="Cultivation parameters, observations, notes..."
                  placeholderTextColor={themeColors.textMuted}
                  multiline
                  value={formNotes}
                  onChangeText={setFormNotes}
                />
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setEditPlantModalVisible(false)}
                disabled={isSavingPlant}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <PressableScale
                style={[styles.confirmBtn, isSavingPlant && styles.actionBtnDisabled]}
                onPress={handleSavePlant}
                disabled={isSavingPlant}
                activeScale={0.97}
              >
                {isSavingPlant ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Check size={16} color="#FFFFFF" strokeWidth={2.4} />
                )}
                <Text style={styles.confirmBtnText}>
                  {isSavingPlant ? 'Saving...' : isCreatingNewPlant ? 'Save & Register Crop' : 'Save Changes'}
                </Text>
              </PressableScale>
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
function PlantItemCatalogCard({ plant, colors, cardWidth, onOpenRecord, onEdit, onDelete }) {
  const styles = stylesItemCard(colors, cardWidth);

  return (
    <View style={styles.card}>
      <PressableScale onPress={onOpenRecord} activeScale={0.99}>
        <View style={styles.imageWrap}>
          <SafeImage source={{ uri: plant.imageUrl }} style={styles.image} resizeMode="cover" />
          <View style={styles.imageTopRow}>
            <View style={styles.stageBadge}>
              <Text style={styles.stageText}>{plant.currentStage}</Text>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText} numberOfLines={1}>{plant.category}</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.plantTitle} numberOfLines={1}>{plant.name}</Text>
          <Text style={styles.plantVariety} numberOfLines={1}>
            {plant.variety} • <Text style={styles.plantZone}>📍 {plant.zone}</Text>
          </Text>

          {/* Assigned Sensor Set & Growing System Badge */}
          <View style={styles.sensorSetTagRow}>
            <View style={styles.systemTag}>
              <Cpu size={10} color={colors.primary} />
              <Text style={styles.systemTagText} numberOfLines={1}>
                {plant.growingSystem || 'Hydroponic System'}
              </Text>
            </View>
            <View style={styles.sensorSetIdTag}>
              <Text style={styles.sensorSetIdText}>{(plant.sensorSetId || 'set-main').toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.plantNotes} numberOfLines={2}>
            {plant.notes}
          </Text>

          {/* Telemetry Summary Stats Badges */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Calendar size={11} color={colors.primary} />
              <Text style={styles.statChipText}>Daily Logs</Text>
            </View>
            <View style={styles.statChip}>
              <Camera size={11} color="#3B82F6" />
              <Text style={styles.statChipText}>Photos</Text>
            </View>
            <View style={styles.statChip}>
              <Sparkles size={11} color="#10B981" />
              <Text style={styles.statChipText}>pH {plant.optimalThresholds?.ph?.min}–{plant.optimalThresholds?.ph?.max}</Text>
            </View>
          </View>
        </View>
      </PressableScale>

      {/* Action Buttons Row: Open Record + Edit + Delete Item Entirely */}
      <View style={styles.cardBottomActionRow}>
        <PressableScale
          style={styles.openBtnRow}
          onPress={onOpenRecord}
          activeScale={0.96}
        >
          <Text style={styles.openBtnText}>Open Record</Text>
          <ChevronRight size={15} color={colors.primary} />
        </PressableScale>

        <View style={styles.cardRightActionButtons}>
          <PressableScale
            style={styles.editCardBtn}
            onPress={(e) => {
              e?.stopPropagation?.();
              onEdit?.();
            }}
            activeScale={0.92}
          >
            <Edit3 size={12} color={colors.primary} />
            <Text style={styles.editCardBtnText}>Edit</Text>
          </PressableScale>

          <PressableScale
            style={styles.deleteCardBtn}
            onPress={(e) => {
              e?.stopPropagation?.();
              onDelete?.();
            }}
            activeScale={0.92}
          >
            <Trash2 size={12} color="#EF4444" />
            <Text style={styles.deleteCardBtnText}>Delete</Text>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

// 2. Day-Wise Log Record Card (showing day date, database sensor readings, and attached photos)
function DayLogRecordCard({
  dayLog,
  plantProfile,
  colors,
  windowWidth,
  onInspectTelemetry,
  onInspectPhoto,
  onAttachPhoto,
  onDeleteLog,
}) {
  const styles = stylesDayCard(colors, windowWidth);
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

          {/* Assigned Sensor Set & Zone */}
          <View style={styles.sensorSetDayBadge}>
            <Text style={styles.sensorSetDayBadgeText}>
              📍 {dayLog.zone || plantProfile?.zone || 'Zone A'}
            </Text>
          </View>

          {/* Telemetry Provenance: Hardware vs Simulated Demo vs Cloud */}
          {dayLog.source === 'hardware' ? (
            <View style={styles.provenanceHardware}>
              <Activity size={10} color="#10B981" />
              <Text style={styles.provenanceHardwareText}>LIVE HARDWARE</Text>
            </View>
          ) : dayLog.source === 'simulated' || dayLog.isSimulated ? (
            <View style={styles.provenanceSimulated}>
              <AlertTriangle size={10} color="#F59E0B" />
              <Text style={styles.provenanceSimulatedText}>SIMULATED DEMO</Text>
            </View>
          ) : (
            <View style={styles.provenanceCloud}>
              <Database size={10} color="#3B82F6" />
              <Text style={styles.provenanceCloudText}>CLOUD RECORD</Text>
            </View>
          )}

          {/* Partial sensor reporting badge */}
          {dayLog.loggingStatus === 'partial' && (
            <View style={styles.partialBadge}>
              <Text style={styles.partialBadgeText}>
                ⚠️ Partial ({dayLog.missingMetrics?.join(', ') || 'probes'} offline)
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statusGroup}>
          <View style={[styles.statusBadge, dayLog.isOptimal ? styles.statusOptimal : styles.statusDeviation]}>
            <Text style={[styles.statusBadgeText, dayLog.isOptimal ? styles.statusTextOptimal : styles.statusTextDeviation]}>
              {dayLog.isOptimal ? '✓ OPTIMAL' : '⚠ OFF-TARGET'}
            </Text>
          </View>
          {onDeleteLog && (
            <PressableScale
              style={styles.deleteDayBtn}
              onPress={onDeleteLog}
              activeScale={0.92}
            >
              <Trash2 size={13} color="#EF4444" />
            </PressableScale>
          )}
        </View>
      </View>

      {/* Database Sensor Telemetry Readings Row for this Day */}
      <PressableScale style={styles.readingsSection} onPress={onInspectTelemetry} activeScale={0.99}>
        <View style={styles.readingsHeaderRow}>
          <View style={styles.telemetryTagGroup}>
            <View style={[styles.telemetryTag, dayLog.isAutomatedDailyAvg && styles.telemetryTagDailyAvg]}>
              <Activity size={12} color={dayLog.isAutomatedDailyAvg ? '#10B981' : colors.primary} />
              <Text style={[styles.telemetryTagText, dayLog.isAutomatedDailyAvg && styles.telemetryTagTextDailyAvg]}>
                {dayLog.isAutomatedDailyAvg ? `AUTOMATED DAILY AVERAGE (${dayLog.sampleCount || 1} SAMPLES)` : dayLog.isSimulated ? 'SIMULATED TELEMETRY' : 'DATABASE TELEMETRY RECORD'}
              </Text>
            </View>
            {dayLog.isFirestoreSynced ? (
              <View style={styles.firestorePill}>
                <Database size={10} color="#10B981" />
                <Text style={styles.firestorePillText}>FIRESTORE</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.inspectHint}>Tap to view all 9 metrics →</Text>
        </View>

        <View style={styles.metricsStrip}>
          <View style={styles.metricItem}>
            <View style={styles.metricItemTop}>
              <Thermometer size={12} color="#EF4444" />
              <Text style={styles.metricLabel}>Air Temp</Text>
            </View>
            <Text style={styles.metricVal}>{(dayLog.readings.temperature?.toFixed(1) ?? '—')}°C</Text>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricItemTop}>
              <Droplets size={12} color="#3B82F6" />
              <Text style={styles.metricLabel}>Humidity</Text>
            </View>
            <Text style={styles.metricVal}>{(dayLog.readings.humidity == null ? '—' : Math.round(dayLog.readings.humidity))}%</Text>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricItemTop}>
              <Sparkles size={12} color="#10B981" />
              <Text style={styles.metricLabel}>pH Level</Text>
            </View>
            <Text style={styles.metricVal}>{(dayLog.readings.ph?.toFixed(2) ?? '—')}</Text>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricItemTop}>
              <Zap size={12} color="#F59E0B" />
              <Text style={styles.metricLabel}>EC Level</Text>
            </View>
            <Text style={styles.metricVal}>{(dayLog.readings.ec?.toFixed(2) ?? '—')} mS</Text>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricItemTop}>
              <Droplets size={12} color="#06B6D4" />
              <Text style={styles.metricLabel}>Water</Text>
            </View>
            <Text style={styles.metricVal}>{(dayLog.readings.waterTemp?.toFixed(1) ?? '—')}°C</Text>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricItemTop}>
              <Sun size={12} color="#FBBF24" />
              <Text style={styles.metricLabel}>Light</Text>
            </View>
            <Text style={styles.metricVal}>{(dayLog.readings.lightIntensity == null ? '—' : Math.round(dayLog.readings.lightIntensity))} lx</Text>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricItemTop}>
              <Activity size={12} color="#EC4899" />
              <Text style={styles.metricLabel}>VPD</Text>
            </View>
            <Text style={styles.metricVal}>{(dayLog.readings.vpd?.toFixed(2) ?? '—')} kPa</Text>
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
                  <SafeImage source={{ uri: photo.imageUrl }} style={styles.attachedPhotoImg} resizeMode="cover" />
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
              <Text style={styles.attachPhotoBtnText}>+ Add Entry to Day {dayLog.dayNumber}</Text>
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
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '600',
    },
    value: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginTop: 2,
    },
  });

const stylesItemCard = (colors, cardWidth) =>
  StyleSheet.create({
    card: {
      width: cardWidth,
      minWidth: 0,
      flexGrow: 0,
      flexShrink: 0,
      borderRadius: borderRadius.xl,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      overflow: 'hidden',
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
    imageTopRow: {
      position: 'absolute',
      top: 10,
      left: 10,
      right: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 6,
    },
    stageBadge: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
      backgroundColor: 'rgba(16, 185, 129, 0.92)',
    },
    stageText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    categoryBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      maxWidth: '55%',
    },
    categoryText: {
      fontSize: 12,
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
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    plantZone: {
      color: colors.primary,
      fontWeight: '700',
    },
    plantNotes: {
      fontSize: 14,
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
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    sensorSetTagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
      marginBottom: 2,
    },
    systemTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
      maxWidth: '75%',
    },
    systemTagText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    sensorSetIdTag: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.primary + '15',
    },
    sensorSetIdText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.primary,
    },
    cardBottomActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 14,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
      flexWrap: 'wrap',
    },
    openBtnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    openBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.primary,
    },
    cardRightActionButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    editCardBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4.5,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.primary + '18',
      borderWidth: 1,
      borderColor: colors.primary + '30',
    },
    editCardBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    deleteCardBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4.5,
      borderRadius: borderRadius.sm,
      backgroundColor: '#EF444415',
      borderWidth: 1,
      borderColor: '#EF444430',
    },
    deleteCardBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#EF4444',
    },
  });

const stylesDayCard = (colors, windowWidth) =>
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
      fontSize: 12,
      fontWeight: '800',
      color: colors.primary,
    },
    dateText: {
      fontSize: 15,
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
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    sensorSetDayBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sensorSetDayBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    provenanceHardware: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      backgroundColor: '#10B98118',
      borderWidth: 1,
      borderColor: '#10B98140',
    },
    provenanceHardwareText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#10B981',
      letterSpacing: 0.3,
    },
    provenanceSimulated: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      backgroundColor: '#F59E0B18',
      borderWidth: 1,
      borderColor: '#F59E0B40',
    },
    provenanceSimulatedText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#F59E0B',
      letterSpacing: 0.3,
    },
    provenanceCloud: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      backgroundColor: '#3B82F618',
      borderWidth: 1,
      borderColor: '#3B82F640',
    },
    provenanceCloudText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#3B82F6',
      letterSpacing: 0.3,
    },
    partialBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      backgroundColor: '#EF444415',
      borderWidth: 1,
      borderColor: '#EF444430',
    },
    partialBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#EF4444',
    },
    deleteDayBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#EF444415',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 6,
    },
    statusGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
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
      fontSize: 12,
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
    telemetryTagGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    telemetryTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    telemetryTagDailyAvg: {
      backgroundColor: '#10B98118',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    telemetryTagText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.6,
    },
    telemetryTagTextDailyAvg: {
      color: '#10B981',
      fontWeight: '800',
    },
    firestorePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 5,
      paddingVertical: 1.5,
      borderRadius: 4,
      backgroundColor: '#10B98114',
      borderWidth: 1,
      borderColor: '#10B98133',
    },
    firestorePillText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#10B981',
      letterSpacing: 0.5,
    },
    inspectHint: {
      fontSize: 12,
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
      minWidth: windowWidth >= 768 ? 95 : 75,
      maxWidth: windowWidth >= 768 ? 140 : '32%',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.sm,
      paddingVertical: 6,
      paddingHorizontal: 6,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 2,
    },
    metricItemTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metricLabel: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '600',
    },
    metricVal: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
      marginTop: 2,
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
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    photosRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    attachedPhotoCard: {
      width: windowWidth < 500 ? '100%' : windowWidth < 768 ? 220 : 200,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      paddingBottom: 6,
      ...Platform.select({
        web: {
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        },
      }),
    },
    attachedPhotoImg: {
      width: '100%',
      height: windowWidth < 500 ? 150 : 120,
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
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    photoTapText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    photoNotes: {
      fontSize: 12,
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
      paddingVertical: 2,
    },
    noPhotoText: {
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    attachPhotoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
      ...Platform.select({
        web: { cursor: 'pointer' },
      }),
    },
    attachPhotoBtnText: {
      fontSize: 12,
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
      fontSize: 12,
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
      fontSize: 12,
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
      fontSize: 15,
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
      fontSize: 14,
      fontWeight: '700',
    },
    newCropBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 15,
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
    newCropBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    restoreBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1.5,
      borderColor: colors.primary,
      ...Platform.select({
        web: {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          cursor: 'pointer',
        },
      }),
    },
    restoreBtnText: {
      color: colors.primary,
      fontSize: 14,
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
      fontSize: 14,
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
      fontSize: 14,
      padding: 0,
      ...Platform.select({
        web: { outlineStyle: 'none' },
      }),
    },
    catalogCountText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    plantItemsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
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
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    topRightActions: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
      flexWrap: 'wrap',
      width: windowWidth >= 768 ? 'auto' : '100%',
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
      fontSize: 12,
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
      fontSize: 12,
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
      fontSize: 12,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.5,
    },
    heroTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    },
    openedPlantHeroTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
    },
    heroEditPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3.5,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.primary + '18',
      borderWidth: 1,
      borderColor: colors.primary + '35',
    },
    heroEditPillText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    openedPlantHeroVariety: {
      fontSize: 14,
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
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    openedPlantNotes: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    openedPlantStatsStrip: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    openedPlantStatItem: {
      flex: 1,
      minWidth: windowWidth >= 768 ? 95 : 80,
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      paddingVertical: 9,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    openedPlantStatLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    openedPlantStatValue: {
      fontSize: 14,
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
      fontSize: 12,
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
      fontSize: 13,
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
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
    },
    dayWiseSub: {
      fontSize: 13,
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
      fontSize: 14,
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
      fontSize: 14,
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
      fontSize: 14,
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
      fontSize: 13,
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
      fontSize: 13,
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
      fontSize: 14,
      color: colors.text,
      fontWeight: '700',
      flex: 1,
      padding: 0,
      ...Platform.select({
        web: { outlineStyle: 'none' },
      }),
    },
    dateHint: {
      fontSize: 12,
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
      fontSize: 13,
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
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    pickSub: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
    },
    inputGroup: {
      gap: 6,
    },
    inputLabel: {
      fontSize: 14,
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
      fontSize: 15,
      ...Platform.select({
        web: { outlineStyle: 'none' },
      }),
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
      fontSize: 13,
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
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    readingsGridPreview: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    readingMiniBadge: {
      fontSize: 12,
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
      fontSize: 14,
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
      fontSize: 14,
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
      fontSize: 13,
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
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    inspectTimestamp: {
      fontSize: 13,
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
      fontSize: 12,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.6,
    },
    inspectNotesText: {
      fontSize: 14,
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
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginTop: 4,
    },
    inspectMetricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },

    // =========================================================================
    // AUTOMATED DAILY SENSOR LOGGER STYLES
    // =========================================================================
    dailyLoggerPanel: {
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.isDarkMode ? '#10B98133' : '#10B98126',
      padding: 16,
      marginBottom: 16,
      gap: 12,
      ...Platform.select({
        web: {
          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.06)',
        },
      }),
    },
    dailyLoggerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 10,
    },
    dailyLoggerTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dailyLoggerPulseDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#10B981',
    },
    dailyLoggerTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.8,
    },
    dailyLoggerBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    sampleCountPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sampleCountPillText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    firestoreStatusPill: {
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
    firestoreStatusPillActive: {
      backgroundColor: '#10B98114',
      borderColor: '#10B98133',
    },
    firestoreStatusText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.textMuted,
    },
    firestoreStatusTextActive: {
      color: '#10B981',
      fontWeight: '800',
    },
    dailyLoggerDesc: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    dailyLoggerAveragesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    dailyAvgChip: {
      flex: 1,
      minWidth: windowWidth >= 768 ? 100 : 80,
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      gap: 2,
    },
    dailyAvgChipLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.6,
    },
    dailyAvgChipVal: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    dailyAvgChipRange: {
      fontSize: 10.5,
      fontWeight: '600',
      color: colors.textMuted,
    },
    dailyLoggerActionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 4,
    },
    dailyLoggerSyncBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primary,
      ...Platform.select({
        web: { cursor: 'pointer' },
      }),
    },
    dailyLoggerSyncBtnDisabled: {
      opacity: 0.6,
    },
    dailyLoggerSyncBtnText: {
      fontSize: 12.5,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    dailyLoggerBatchBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
      ...Platform.select({
        web: { cursor: 'pointer' },
      }),
    },
    dailyLoggerBatchBtnText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.text,
    },
    catalogAutoLogBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.isDarkMode ? '#10B98133' : '#10B98126',
      marginBottom: 16,
    },
    catalogAutoLogLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    catalogAutoLogTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    catalogAutoLogPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 4,
      backgroundColor: '#10B98114',
      borderWidth: 1,
      borderColor: '#10B98133',
    },
    catalogAutoLogPillText: {
      fontSize: 10.5,
      fontWeight: '800',
      color: '#10B981',
      letterSpacing: 0.5,
    },
    autoDailyModalBadge: {
      padding: 12,
      borderRadius: borderRadius.md,
      backgroundColor: colors.isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(14, 79, 59, 0.06)',
      borderWidth: 1,
      borderColor: colors.isDarkMode ? 'rgba(16, 185, 129, 0.25)' : 'rgba(14, 79, 59, 0.18)',
      gap: 6,
    },
    autoDailyModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    autoDailyModalTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#10B981',
      letterSpacing: 0.7,
    },
    autoDailyModalSub: {
      fontSize: 12.5,
      color: colors.textSecondary,
      lineHeight: 17,
    },
    dailyMinMaxRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    minMaxItem: {
      flex: 1,
      minWidth: 90,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.sm,
      padding: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    minMaxLabel: {
      fontSize: 9.5,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    minMaxVal: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
      marginTop: 1,
    },
    sensorSetAssignmentCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 16,
      gap: 12,
      ...Platform.select({
        web: {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        },
      }),
    },
    sensorSetCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sensorSetHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sensorSetCardTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.8,
    },
    sensorSetBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.primary + '18',
    },
    sensorSetBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.primary,
    },
    sensorSetDetailsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      paddingVertical: 4,
    },
    sensorSetDetailCol: {
      flex: 1,
      minWidth: 140,
    },
    sensorSetDetailLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      marginBottom: 2,
    },
    sensorSetDetailVal: {
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.text,
    },
    sensorSetActionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    fetchSensorLogBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primary,
    },
    fetchSensorLogBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    reassignSetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reassignSetBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    exportCsvBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: borderRadius.md,
      backgroundColor: '#10B98118',
      borderWidth: 1,
      borderColor: '#10B98140',
    },
    exportCsvBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#10B981',
    },
    editCropDetailsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primary + '18',
      borderWidth: 1,
      borderColor: colors.primary + '30',
    },
    editCropDetailsBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    fetchDbBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: borderRadius.md,
      backgroundColor: '#3B82F618',
      borderWidth: 1,
      borderColor: '#3B82F635',
    },
    fetchDbBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#3B82F6',
    },
    deleteEntirePlantBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: borderRadius.md,
      backgroundColor: '#EF444418',
      borderWidth: 1,
      borderColor: '#EF444440',
    },
    deleteEntirePlantBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#EF4444',
    },
    wipeCropHistoryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: borderRadius.md,
      backgroundColor: '#EF444415',
      borderWidth: 1,
      borderColor: '#EF444430',
      marginLeft: 'auto',
    },
    wipeCropHistoryBtnText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#EF4444',
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 5,
    },
    formInput: {
      height: 42,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      color: colors.text,
      fontSize: 14,
    },
    formRow: {
      flexDirection: 'row',
      gap: 12,
    },
    thresholdsSectionCard: {
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    thresholdsSectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.6,
    },
    thresholdsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    thresholdCol: {
      flex: 1,
      minWidth: 95,
      gap: 4,
    },
    thresholdInputLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    thresholdMinMaxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    thresholdInput: {
      height: 36,
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surface,
      textAlign: 'center',
      fontSize: 12,
      color: colors.text,
    },
    actionBtnDisabled: {
      opacity: 0.6,
    },
    environmentalTrendsCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 16,
      gap: 12,
    },
    trendsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    trendsHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    trendsTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: 0.8,
    },
    trendsSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
    },
    trendsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    trendTile: {
      flex: 1,
      minWidth: 130,
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    trendTileTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    trendTileLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    trendTileAvg: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
      marginLeft: 'auto',
    },
    barsContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      height: 48,
      paddingTop: 6,
    },
    barCol: {
      alignItems: 'center',
      gap: 3,
      flex: 1,
    },
    barFill: {
      width: 8,
      borderRadius: 4,
    },
    barDayText: {
      fontSize: 9,
      color: colors.textMuted,
      fontWeight: '600',
    },
    dashboardStatsOverview: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    dashStatCard: {
      flex: 1,
      minWidth: 140,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    dashStatLabel: {
      fontSize: 10.5,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.7,
    },
    dashStatVal: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },
    dashStatSub: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    sourcePillWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sourceDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    sourceDotLive: {
      backgroundColor: '#10B981',
    },
    sourceDotSim: {
      backgroundColor: '#F59E0B',
    },
    bulkActionRow: {
      marginBottom: 16,
    },
    bulkFetchBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primary,
      ...Platform.select({
        web: {
          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
        },
      }),
    },
    bulkFetchBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
    immutabilityNotice: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: colors.primary + '12',
      borderWidth: 1,
      borderColor: colors.primary + '30',
      padding: 12,
      borderRadius: borderRadius.md,
      marginBottom: 12,
    },
    immutabilityNoticeTextWrap: {
      flex: 1,
      gap: 2,
    },
    immutabilityNoticeTitle: {
      fontSize: 12.5,
      fontWeight: '800',
      color: colors.primary,
    },
    immutabilityNoticeDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    reassignListLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    sensorSetOptionCard: {
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 10,
      gap: 6,
    },
    sensorSetOptionCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '0A',
    },
    sensorSetOptionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sensorSetOptionTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sensorOptionRadio: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sensorOptionRadioActive: {
      borderColor: colors.primary,
    },
    sensorOptionRadioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    sensorOptionName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    sensorOptionNameActive: {
      color: colors.primary,
    },
    sensorOptionZone: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    sensorOptionBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sensorOptionBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textMuted,
    },
    sensorOptionSystem: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 28,
    },
    sensorOptionProbesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 28,
      marginTop: 2,
    },
    sensorOptionProbesLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
    },
    sensorOptionProbesText: {
      fontSize: 11,
      color: colors.textMuted,
      flex: 1,
    },
    csvPreviewDesc: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 10,
    },
    csvCodeBox: {
      maxHeight: 260,
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
    },
    csvCodeText: {
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      fontSize: 11,
      color: colors.text,
      lineHeight: 16,
    },
  });
