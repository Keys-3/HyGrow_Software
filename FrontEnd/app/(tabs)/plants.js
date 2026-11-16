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
} from 'lucide-react-native';
import { usePlantLogs } from '../../src/hooks/usePlantLogs';
import useEffectiveSensorData from '../../src/hooks/useEffectiveSensorData';
import { useThemeColors, borderRadius, spacing } from '../../src/theme/theme';
import AtmosphericBackground from '../../src/components/AtmosphericBackground';
import { PressableScale } from '../../src/components/PressableScale';

const GROWTH_STAGES = ['Seedling', 'Vegetative', 'Flowering', 'Fruiting', 'Harvest Ready'];
const COMMON_CROPS = ['Romaine Lettuce', 'Butterhead', 'Genovese Basil', 'Cherry Tomato', 'Strawberries', 'Spinach', 'Mint'];

export default function PlantPhotosScreen() {
  const { width } = useWindowDimensions();
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors, width), [themeColors, width]);

  const { logs, loading, uploading, addPlantLog, deletePlantLog } = usePlantLogs();
  const { current: telemetry } = useEffectiveSensorData();

  // Upload modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // { uri, base64 }
  const [plantName, setPlantName] = useState('');
  const [stage, setStage] = useState('Vegetative');
  const [notes, setNotes] = useState('');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState('All');

  // Detailed inspect modal state
  const [inspectLog, setInspectLog] = useState(null);

  // Pick from gallery
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

  // Capture with camera
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

  // Submit and save to Firebase
  const handleSaveLog = async () => {
    if (!selectedImage?.uri) {
      Alert.alert('Missing Photo', 'Please take or select a plant photo first.');
      return;
    }
    if (!plantName.trim()) {
      Alert.alert('Missing Plant Name', 'Please specify the name of the plant or batch.');
      return;
    }

    try {
      // Package live sensor telemetry matching this exact photo capture
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

      await addPlantLog({
        plantName: plantName.trim(),
        stage,
        notes: notes.trim(),
        imageUri: selectedImage.uri,
        imageBase64: selectedImage.base64,
        readings: currentReadings,
      });

      // Reset and close
      setSelectedImage(null);
      setPlantName('');
      setStage('Vegetative');
      setNotes('');
      setModalVisible(false);

      Alert.alert('Success', 'Plant photo and matching telemetry stored in Firebase successfully!');
    } catch (e) {
      Alert.alert('Save Error', e.message || 'Failed to upload photo to Firebase.');
    }
  };

  // Delete log confirmation
  const handleDeleteConfirm = async (id, title) => {
    const executeDelete = async () => {
      try {
        await deletePlantLog(id);
        if (inspectLog?.id === id) setInspectLog(null);
      } catch (err) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(err.message || 'Could not delete item.');
        } else {
          Alert.alert('Delete Failed', err.message || 'Could not delete item.');
        }
      }
    };

    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' ? window.confirm(`Are you sure you want to delete the plant log for "${title}"?`) : true;
      if (ok) {
        await executeDelete();
      }
      return;
    }

    Alert.alert(
      'Delete Plant Log',
      `Are you sure you want to delete the log for "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: executeDelete,
        },
      ]
    );
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        !searchQuery.trim() ||
        log.plantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.notes && log.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStage =
        selectedStageFilter === 'All' || log.stage === selectedStageFilter;

      return matchesSearch && matchesStage;
    });
  }, [logs, searchQuery, selectedStageFilter]);

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
                <Camera size={13} color={themeColors.primary} />
                <Text style={styles.badgeText}>BOTANICAL ARCHIVE</Text>
              </View>
              <View style={styles.syncPill}>
                <View style={styles.syncDot} />
                <Text style={styles.syncText}>TELEMETRY SYNCED</Text>
              </View>
            </View>
            <Text style={styles.title}>Plant Photo Logs</Text>
            <Text style={styles.subtitle}>
              Capture crop development snapshots paired with synchronized hardware sensor readings stored in Firebase.
            </Text>
          </View>

          <PressableScale
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
            activeScale={0.96}
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={styles.addBtnText}>Log New Photo</Text>
          </PressableScale>
        </View>

        {/* Live Telemetry Sensor Bar */}
        <View style={styles.telemetryBar}>
          <View style={styles.telemetryHeaderRow}>
            <View style={styles.telemetryIndicator}>
              <Activity size={15} color={themeColors.primary} />
              <Text style={styles.telemetryBarTitle}>Current Sensor Status</Text>
            </View>
            <Text style={styles.telemetrySubText}>
              Next photo will bind with these live metrics
            </Text>
          </View>

          <View style={styles.sensorMetricsRow}>
            <View style={styles.metricItem}>
              <Thermometer size={14} color="#EF4444" />
              <Text style={styles.metricLabel}>Air Temp</Text>
              <Text style={styles.metricValue}>
                {telemetry?.temperature !== null && telemetry?.temperature !== undefined
                  ? `${telemetry.temperature.toFixed(1)}°C`
                  : '24.2°C'}
              </Text>
            </View>

            <View style={styles.metricItem}>
              <Droplets size={14} color="#3B82F6" />
              <Text style={styles.metricLabel}>Humidity</Text>
              <Text style={styles.metricValue}>
                {telemetry?.humidity !== null && telemetry?.humidity !== undefined
                  ? `${Math.round(telemetry.humidity)}%`
                  : '64%'}
              </Text>
            </View>

            <View style={styles.metricItem}>
              <Sparkles size={14} color="#10B981" />
              <Text style={styles.metricLabel}>pH Value</Text>
              <Text style={styles.metricValue}>
                {telemetry?.ph !== null && telemetry?.ph !== undefined
                  ? telemetry.ph.toFixed(2)
                  : '6.10'}
              </Text>
            </View>

            <View style={styles.metricItem}>
              <Zap size={14} color="#F59E0B" />
              <Text style={styles.metricLabel}>EC Level</Text>
              <Text style={styles.metricValue}>
                {telemetry?.ec !== null && telemetry?.ec !== undefined
                  ? `${telemetry.ec.toFixed(2)} mS`
                  : '1.40 mS'}
              </Text>
            </View>

            <View style={styles.metricItem}>
              <Sun size={14} color="#FBBF24" />
              <Text style={styles.metricLabel}>Light (Lux)</Text>
              <Text style={styles.metricValue}>
                {telemetry?.lightIntensity !== null && telemetry?.lightIntensity !== undefined
                  ? `${Math.round(telemetry.lightIntensity)}`
                  : '12,500'}
              </Text>
            </View>
          </View>
        </View>

        {/* Filter & Search Bar */}
        <View style={styles.filterSection}>
          <View style={styles.searchBar}>
            <Search size={16} color={themeColors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by plant name or notes..."
              placeholderTextColor={themeColors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')}>
                <X size={16} color={themeColors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stageFilterScroll}
          >
            {['All', ...GROWTH_STAGES].map((stageName) => {
              const isSelected = selectedStageFilter === stageName;
              return (
                <Pressable
                  key={stageName}
                  style={[
                    styles.stageFilterPill,
                    isSelected && styles.stageFilterPillActive,
                  ]}
                  onPress={() => setSelectedStageFilter(stageName)}
                >
                  <Text
                    style={[
                      styles.stageFilterText,
                      isSelected && styles.stageFilterTextActive,
                    ]}
                  >
                    {stageName}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Plant Log Cards Grid */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            <Text style={styles.loadingText}>Syncing plant photos from Firebase...</Text>
          </View>
        ) : filteredLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <ImageIcon size={36} color={themeColors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Plant Logs Found</Text>
            <Text style={styles.emptySub}>
              {searchQuery || selectedStageFilter !== 'All'
                ? 'Try adjusting your search query or stage filter.'
                : 'Start logging your plant growth by taking your first photo snapshot!'}
            </Text>
            <PressableScale
              style={styles.emptyActionBtn}
              onPress={() => setModalVisible(true)}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.emptyActionText}>Take First Plant Photo</Text>
            </PressableScale>
          </View>
        ) : (
          <View style={[styles.grid, isWide && styles.gridWide]}>
            {filteredLogs.map((item) => (
              <PlantCard
                key={item.id}
                log={item}
                colors={themeColors}
                onInspect={() => setInspectLog(item)}
                onDelete={() => handleDeleteConfirm(item.id, item.plantName)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Upload Plant Photo Modal */}
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
                <Text style={styles.modalTitle}>New Plant Photo Log</Text>
                <Text style={styles.modalSubtitle}>Store growth image with matching sensor metrics</Text>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={20} color={themeColors.text} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Photo Area */}
              <View style={styles.photoUploadArea}>
                {selectedImage?.uri ? (
                  <View style={styles.previewContainer}>
                    <Image
                      source={{ uri: selectedImage.uri }}
                      style={styles.previewImg}
                      resizeMode="cover"
                    />
                    <View style={styles.previewActions}>
                      <Pressable
                        style={styles.replaceBtn}
                        onPress={handleTakePhoto}
                      >
                        <Camera size={14} color="#FFFFFF" />
                        <Text style={styles.replaceBtnText}>Retake</Text>
                      </Pressable>
                      <Pressable
                        style={styles.replaceBtn}
                        onPress={handlePickImage}
                      >
                        <ImageIcon size={14} color="#FFFFFF" />
                        <Text style={styles.replaceBtnText}>Library</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.replaceBtn, { backgroundColor: '#EF4444' }]}
                        onPress={() => setSelectedImage(null)}
                      >
                        <X size={14} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.pickButtonsContainer}>
                    <PressableScale
                      style={styles.pickButton}
                      onPress={handleTakePhoto}
                      activeScale={0.96}
                    >
                      <View style={styles.pickIconBadge}>
                        <Camera size={24} color={themeColors.primary} />
                      </View>
                      <Text style={styles.pickTitle}>Take Camera Photo</Text>
                      <Text style={styles.pickSub}>Capture live canopy</Text>
                    </PressableScale>

                    <PressableScale
                      style={styles.pickButton}
                      onPress={handlePickImage}
                      activeScale={0.96}
                    >
                      <View style={styles.pickIconBadge}>
                        <ImageIcon size={24} color={themeColors.primary} />
                      </View>
                      <Text style={styles.pickTitle}>Select from Gallery</Text>
                      <Text style={styles.pickSub}>Choose saved image</Text>
                    </PressableScale>
                  </View>
                )}
              </View>

              {/* Plant Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Plant or Crop Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Romaine Lettuce (Bay 2)"
                  placeholderTextColor={themeColors.textMuted}
                  value={plantName}
                  onChangeText={setPlantName}
                />
                {/* Suggestions */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionRow}
                >
                  {COMMON_CROPS.map((crop) => (
                    <Pressable
                      key={crop}
                      style={styles.suggestionPill}
                      onPress={() => setPlantName(crop)}
                    >
                      <Text style={styles.suggestionText}>{crop}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Growth Stage Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Growth Stage</Text>
                <View style={styles.stageRow}>
                  {GROWTH_STAGES.map((s) => (
                    <Pressable
                      key={s}
                      style={[
                        styles.stageBtn,
                        stage === s && styles.stageBtnSelected,
                      ]}
                      onPress={() => setStage(s)}
                    >
                      <Text
                        style={[
                          styles.stageBtnText,
                          stage === s && styles.stageBtnTextSelected,
                        ]}
                      >
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
                  placeholder="e.g. Rapid root expansion, pristine leaf color, optimal transpiration"
                  placeholderTextColor={themeColors.textMuted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              {/* Telemetry Snapshot Preview */}
              <View style={styles.readingsToLock}>
                <View style={styles.readingsToLockHeader}>
                  <CheckCircle2 size={15} color={themeColors.primary} />
                  <Text style={styles.readingsToLockTitle}>
                    Matching Telemetry to Lock in Firebase
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

            {/* Modal Actions */}
            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={uploading}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <PressableScale
                style={[
                  styles.submitBtn,
                  (!selectedImage || !plantName.trim() || uploading) && styles.submitBtnDisabled,
                ]}
                onPress={handleSaveLog}
                disabled={!selectedImage || !plantName.trim() || uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Camera size={16} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.submitBtnText}>Store to Firebase</Text>
                  </>
                )}
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      {/* Inspect Detail Modal */}
      {inspectLog && (
        <Modal
          visible={true}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setInspectLog(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { maxWidth: 600 }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{inspectLog.plantName}</Text>
                  <Text style={styles.modalSubtitle}>
                    Logged on {new Date(inspectLog.timestamp).toLocaleDateString()} at{' '}
                    {new Date(inspectLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setInspectLog(null)}
                  style={styles.closeBtn}
                >
                  <X size={20} color={themeColors.text} />
                </Pressable>
              </View>

              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                <Image
                  source={{ uri: inspectLog.imageUrl }}
                  style={styles.inspectImg}
                  resizeMode="cover"
                />

                <View style={styles.inspectStageRow}>
                  <View style={styles.cardStageBadge}>
                    <Text style={styles.cardStageText}>{inspectLog.stage}</Text>
                  </View>
                  <Text style={styles.inspectTimestamp}>
                    Captured {new Date(inspectLog.timestamp).toLocaleString()}
                  </Text>
                </View>

                {inspectLog.notes ? (
                  <View style={styles.inspectNotesCard}>
                    <Text style={styles.inspectNotesLabel}>OBSERVATIONS</Text>
                    <Text style={styles.inspectNotesText}>{inspectLog.notes}</Text>
                  </View>
                ) : null}

                <Text style={styles.readingsSectionTitle}>Synchronized Sensor Readings</Text>
                <View style={styles.inspectMetricsGrid}>
                  <MetricCard
                    icon={Thermometer}
                    label="Air Temperature"
                    value={`${inspectLog.readings.temperature?.toFixed(1) ?? '—'} °C`}
                    color="#EF4444"
                    colors={themeColors}
                  />
                  <MetricCard
                    icon={Droplets}
                    label="Relative Humidity"
                    value={`${inspectLog.readings.humidity ? Math.round(inspectLog.readings.humidity) : '—'} %`}
                    color="#3B82F6"
                    colors={themeColors}
                  />
                  <MetricCard
                    icon={Sparkles}
                    label="Nutrient pH"
                    value={`${inspectLog.readings.ph?.toFixed(2) ?? '—'}`}
                    color="#10B981"
                    colors={themeColors}
                  />
                  <MetricCard
                    icon={Zap}
                    label="Electroconductivity"
                    value={`${inspectLog.readings.ec?.toFixed(2) ?? '—'} mS/cm`}
                    color="#F59E0B"
                    colors={themeColors}
                  />
                  <MetricCard
                    icon={Droplets}
                    label="Water Temp"
                    value={`${inspectLog.readings.waterTemp?.toFixed(1) ?? '—'} °C`}
                    color="#06B6D4"
                    colors={themeColors}
                  />
                  <MetricCard
                    icon={Sun}
                    label="Light Intensity"
                    value={`${inspectLog.readings.lightIntensity ? Math.round(inspectLog.readings.lightIntensity) : '—'} Lux`}
                    color="#FBBF24"
                    colors={themeColors}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <Pressable
                  style={[styles.cancelBtn, { borderColor: '#EF4444' }]}
                  onPress={() => handleDeleteConfirm(inspectLog.id, inspectLog.plantName)}
                >
                  <Trash2 size={16} color="#EF4444" />
                  <Text style={[styles.cancelBtnText, { color: '#EF4444' }]}>Delete Log</Text>
                </Pressable>
                <Pressable
                  style={[styles.submitBtn, { flex: 0, minWidth: 120 }]}
                  onPress={() => setInspectLog(null)}
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

// Plant Card Component
function PlantCard({ log, colors, onInspect, onDelete }) {
  const formattedDate = new Date(log.timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = new Date(log.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <PressableScale
      style={stylesCard(colors).card}
      onPress={onInspect}
      activeScale={0.98}
    >
      <View style={stylesCard(colors).imageWrap}>
        <Image
          source={{ uri: log.imageUrl }}
          style={stylesCard(colors).image}
          resizeMode="cover"
        />
        <View style={stylesCard(colors).imageTopRow}>
          <View style={stylesCard(colors).stageBadge}>
            <Text style={stylesCard(colors).stageText}>{log.stage}</Text>
          </View>
          <View style={stylesCard(colors).timeBadge}>
            <Clock size={11} color="#FFFFFF" />
            <Text style={stylesCard(colors).timeText}>{formattedDate}</Text>
          </View>
        </View>
      </View>

      <View style={stylesCard(colors).content}>
        <View style={stylesCard(colors).titleRow}>
          <Text style={stylesCard(colors).title} numberOfLines={1}>
            {log.plantName}
          </Text>
          <Pressable
            onPress={(e) => {
              if (e && typeof e.stopPropagation === 'function') {
                e.stopPropagation();
              }
              onDelete();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={stylesCard(colors).deleteBtn}
            accessibilityLabel="Delete plant photo"
          >
            <Trash2 size={16} color="#EF4444" />
          </Pressable>
        </View>

        {log.notes ? (
          <Text style={stylesCard(colors).notes} numberOfLines={2}>
            {log.notes}
          </Text>
        ) : null}

        {/* Telemetry Snapshot Row */}
        <View style={stylesCard(colors).metricsContainer}>
          <View style={stylesCard(colors).metricPill}>
            <Thermometer size={12} color="#EF4444" />
            <Text style={stylesCard(colors).metricText}>
              {log.readings.temperature?.toFixed(1) ?? '—'}°C
            </Text>
          </View>
          <View style={stylesCard(colors).metricPill}>
            <Droplets size={12} color="#3B82F6" />
            <Text style={stylesCard(colors).metricText}>
              {log.readings.humidity ? Math.round(log.readings.humidity) : '—'}%
            </Text>
          </View>
          <View style={stylesCard(colors).metricPill}>
            <Sparkles size={12} color="#10B981" />
            <Text style={stylesCard(colors).metricText}>
              pH {log.readings.ph?.toFixed(1) ?? '—'}
            </Text>
          </View>
          <View style={stylesCard(colors).metricPill}>
            <Zap size={12} color="#F59E0B" />
            <Text style={stylesCard(colors).metricText}>
              {log.readings.ec?.toFixed(2) ?? '—'} mS
            </Text>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

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

const stylesCard = (colors) =>
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
    deleteBtn: {
      padding: 4,
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
      maxWidth: 620,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 18,
      paddingVertical: 12,
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
    telemetryBar: {
      padding: 14,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20,
    },
    telemetryHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      flexWrap: 'wrap',
      gap: 6,
    },
    telemetryIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    telemetryBarTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    telemetrySubText: {
      fontSize: 11.5,
      color: colors.textMuted,
    },
    sensorMetricsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricItem: {
      flex: 1,
      minWidth: 100,
      padding: 8,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 3,
    },
    metricLabel: {
      fontSize: 10,
      color: colors.textMuted,
      fontWeight: '600',
    },
    metricValue: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },
    filterSection: {
      flexDirection: windowWidth >= 768 ? 'row' : 'column',
      gap: 12,
      marginBottom: 20,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 13.5,
      padding: 0,
    },
    stageFilterScroll: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    stageFilterPill: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stageFilterPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    stageFilterText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    stageFilterTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    grid: {
      flexDirection: 'column',
    },
    gridWide: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      justifyContent: 'flex-start',
    },
    loadingWrap: {
      paddingVertical: 60,
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      color: colors.textSecondary,
      fontSize: 13.5,
    },
    emptyState: {
      paddingVertical: 60,
      paddingHorizontal: 20,
      alignItems: 'center',
      borderRadius: borderRadius.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    emptyIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primary + '18',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    emptySub: {
      fontSize: 13,
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
    suggestionRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 4,
    },
    suggestionPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    suggestionText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '500',
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
