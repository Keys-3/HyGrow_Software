import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Modal, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors, spacing, borderRadius, typography, shadows } from '../../../src/theme/theme';
import useSensorData from '../../../src/hooks/useSensorData';
import useAppStore from '../../../src/store/useAppStore';
import { predictGrowth } from "../../../src/services/growthPrediction";

const CROP_OPTIONS = [
  { label: 'Butterhead Lettuce', temp: '22', hum: '65', ph: '6.0', tds: '600', water: '80', light: '15000', vpd: '0.8', waterTemp: '20', co2: '450' },
  { label: 'Tomatoes', temp: '26', hum: '70', ph: '6.2', tds: '1250', water: '70', light: '25000', vpd: '1.0', waterTemp: '22', co2: '800' },
  { label: 'Basil', temp: '24', hum: '60', ph: '6.5', tds: '800', water: '75', light: '20000', vpd: '0.9', waterTemp: '21', co2: '500' },
  { label: 'Spinach', temp: '18', hum: '60', ph: '6.5', tds: '900', water: '85', light: '12000', vpd: '0.7', waterTemp: '18', co2: '400' },
  { label: 'Strawberries', temp: '20', hum: '70', ph: '5.8', tds: '750', water: '65', light: '22000', vpd: '0.8', waterTemp: '19', co2: '600' },
];

export default function YieldScreen() {
  const router = useRouter();
  const { current } = useSensorData();
  const farmerFeatures = useAppStore((state) => state.farmerFeatures);
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  
  const [crop, setCrop] = useState(CROP_OPTIONS[0].label);
  const [showCropModal, setShowCropModal] = useState(false);


  const [temperature, setTemperature] = useState(current?.temperature?.toString() ?? '');
  const [humidity, setHumidity] = useState(current?.humidity?.toString() ?? '');
  const [ph, setPh] = useState(current?.ph?.toString() ?? '');
  const [tds, setTds] = useState(current?.tds?.toString() ?? '');
  const [waterLevel, setWaterLevel] = useState(current?.waterLevel?.toString() ?? '');
  const [lightIntensity, setLightIntensity] = useState(current?.lightIntensity?.toString() ?? '');
  const [vpd, setVpd] = useState(current?.vpd?.toString() ?? '');
  const [waterTemp, setWaterTemp] = useState(current?.waterTemp?.toString() ?? '');
  const [co2, setCo2] = useState(current?.co2?.toString() ?? '');
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  // When a crop is selected, auto-fill with optimal readings
  const handleSelectCrop = (selectedCrop) => {
    setCrop(selectedCrop.label);
    setTemperature(selectedCrop.temp);
    setHumidity(selectedCrop.hum);
    setPh(selectedCrop.ph);
    setTds(selectedCrop.tds);
    setWaterLevel(selectedCrop.water);
    setLightIntensity(selectedCrop.light);
    setVpd(selectedCrop.vpd);
    setWaterTemp(selectedCrop.waterTemp);
    setCo2(selectedCrop.co2);
    setShowCropModal(false);
  };

  const handleUseCurrentSensors = () => {
    setTemperature(current?.temperature?.toString() ?? '');
    setHumidity(current?.humidity?.toString() ?? '');
    setPh(current?.ph?.toString() ?? '');
    setTds(current?.tds?.toString() ?? '');
    setWaterLevel(current?.waterLevel?.toString() ?? '');
    setLightIntensity(current?.lightIntensity?.toString() ?? '');
    setVpd(current?.vpd?.toString() ?? '');
    setWaterTemp(current?.waterTemp?.toString() ?? '');
    setCo2(current?.co2?.toString() ?? '');
  };

  const handlePredict = async () => {
    try {
        setLoading(true);
        setResults(null);
        
        const entries = { temperature, humidity, ph, tds, waterLevel, lightIntensity, vpd, waterTemp, co2 };
        if (Object.values(entries).some(value => value.trim() === '' || !Number.isFinite(Number(value)))) {
          throw new Error('Enter all environmental readings. Missing sensors require manual inputs or crop reference values.');
        }
        const payload = Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, Number(value)]));

        const response = await predictGrowth(payload);
        setResults(response.prediction);

    } catch (e) {
        Alert.alert('Prediction unavailable', e.message || 'Unable to predict growth.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Yield Prediction</Text>
      <Text style={styles.subtitle}>Estimate crop yield from entered conditions. Crop presets are reference values, not sensor readings.</Text>

      <View style={styles.formCard}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Crop Type</Text>
          <Pressable style={styles.dropdown} onPress={() => setShowCropModal(true)}>
            <Text style={[styles.dropdownText, !crop && { color: themeColors.textMuted }]}>
              {crop || 'Select a crop'}
            </Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </Pressable>
        </View>

        <View style={styles.currentConditions}>
          <View style={styles.conditionsHeader}>
            <Text style={styles.label}>Environmental Readings</Text>
            <Pressable onPress={handleUseCurrentSensors}>
              <Text style={styles.useSensorsText}>Use Available Sensors</Text>
            </Pressable>
          </View>

          <View style={styles.readingsGrid}>
            <View style={styles.readingInputWrapper}>
                <Text style={styles.readingLabel}>Temp (°C)</Text>
                <TextInput
                  style={styles.readingInput}
                  value={temperature}
                  onChangeText={setTemperature}
                  keyboardType="numeric"
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>

            <View style={styles.readingInputWrapper}>
                <Text style={styles.readingLabel}>Humidity (%)</Text>
                <TextInput
                  style={styles.readingInput}
                  value={humidity}
                  onChangeText={setHumidity}
                  keyboardType="numeric"
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>

            <View style={styles.readingInputWrapper}>
                <Text style={styles.readingLabel}>pH Level</Text>
                <TextInput
                  style={styles.readingInput}
                  value={ph}
                  onChangeText={setPh}
                  keyboardType="numeric"
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>

            <View style={styles.readingInputWrapper}>
                <Text style={styles.readingLabel}>TDS (ppm)</Text>
                <TextInput
                  style={styles.readingInput}
                  value={tds}
                  onChangeText={setTds}
                  keyboardType="numeric"
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>

            <View style={styles.readingInputWrapper}>
                <Text style={styles.readingLabel}>Water Lvl (%)</Text>
                <TextInput
                  style={styles.readingInput}
                  value={waterLevel}
                  onChangeText={setWaterLevel}
                  keyboardType="numeric"
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>

            <View style={styles.readingInputWrapper}>
                <Text style={styles.readingLabel}>Light (lux)</Text>
                <TextInput
                  style={styles.readingInput}
                  value={lightIntensity}
                  onChangeText={setLightIntensity}
                  keyboardType="numeric"
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>

            <View style={styles.readingInputWrapper}>
                <Text style={styles.readingLabel}>VPD (kPa)</Text>
                <TextInput
                  style={styles.readingInput}
                  value={vpd}
                  onChangeText={setVpd}
                  keyboardType="numeric"
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>

            <View style={styles.readingInputWrapper}>
                <Text style={styles.readingLabel}>Water Temp (°C)</Text>
                <TextInput
                  style={styles.readingInput}
                  value={waterTemp}
                  onChangeText={setWaterTemp}
                  keyboardType="numeric"
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>

            <View style={styles.readingInputWrapper}>
                <Text style={styles.readingLabel}>CO2 (ppm)</Text>
                <TextInput
                  style={styles.readingInput}
                  value={co2}
                  onChangeText={setCo2}
                  keyboardType="numeric"
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>
          </View>
        </View>
        
        <Pressable 
          style={({ pressed }) => [styles.predictBtn, pressed && styles.pressed, loading && styles.disabledBtn]}
          onPress={handlePredict}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={themeColors.background} />
          ) : (
            <Text style={styles.predictBtnText}>Predict Yield</Text>
          )}
        </Pressable>
      </View>

      {results && !loading && (
        <View style={styles.resultsArea}>
          <Text style={styles.resultsTitle}>AI Growth Prediction</Text>

          <View style={styles.primaryResultCard}>
            <View style={styles.timeBox}>
              <Text style={styles.timeLabel}>Est. Harvest</Text>
              <Text style={styles.timeValue}>{results.harvestTime || 'N/A'}</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.timeBox}>
              <Text style={styles.timeLabel}>Status</Text>
              <Text style={styles.stageText}>{results.growthStatus || 'N/A'}</Text>
            </View>
          </View>

          <Text style={styles.factorsTitle}>Recommendations</Text>
          {results.recommendations?.map((item, index) => (
            <Text key={index} style={styles.conditionText}>
              • {item}
            </Text>
          ))}
        </View>
      )}
      
      <View style={{ height: 40 }} />

      {/* Crop Selection Modal */}
      <Modal visible={showCropModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Crop</Text>
              <Pressable onPress={() => setShowCropModal(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>
            <FlatList
              data={CROP_OPTIONS}
              keyExtractor={(item) => item.label}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.cropOption}
                  onPress={() => handleSelectCrop(item)}
                >
                  <Text style={[styles.cropOptionText, crop === item.label && { color: themeColors.primary, fontWeight: '700' }]}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: spacing.lg, paddingTop: 60 },
  backBtn: { marginBottom: spacing.md },
  backText: { color: theme.primary, ...typography.body, fontWeight: '600' },
  title: { ...typography.h1, color: theme.text },
  subtitle: { ...typography.body, color: theme.textSecondary, marginBottom: spacing.lg },
  
  formCard: {
    backgroundColor: theme.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.border,
    ...shadows.card,
    marginBottom: spacing.xl,
  },
  inputGroup: { marginBottom: spacing.lg },
  label: { ...typography.label, marginBottom: spacing.sm, color: theme.text },
  dropdown: {
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    color: theme.text,
    fontSize: 16,
  },
  dropdownIcon: {
    color: theme.textSecondary,
    fontSize: 12,
  },
  currentConditions: {
    backgroundColor: theme.surfaceLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  conditionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  useSensorsText: {
    color: theme.primary,
    ...typography.bodySmall,
    fontWeight: '700',
  },
  readingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  readingInputWrapper: {
    width: '48%',
    marginBottom: spacing.md,
  },
  readingLabel: {
    ...typography.caption,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  readingInput: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    color: theme.text,
    fontSize: 14,
  },
  conditionText: { color: theme.textSecondary, ...typography.bodySmall, marginBottom: 4 },
  predictBtn: {
    backgroundColor: theme.info,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  pressed: { opacity: 0.8 },
  disabledBtn: { opacity: 0.5 },
  predictBtnText: { color: theme.background, ...typography.body, fontWeight: '700' },

  resultsArea: {
    backgroundColor: theme.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.info + '50',
    ...shadows.card,
  },
  resultsTitle: { ...typography.h3, marginBottom: spacing.md, color: theme.text },
  primaryResultCard: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceLight,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  timeBox: { flex: 1, alignItems: 'center' },
  timeLabel: { ...typography.caption, color: theme.textSecondary, marginBottom: 4 },
  timeValue: { ...typography.h3, color: theme.text, textAlign: 'center' },
  stageText: { ...typography.h3, color: theme.info, textAlign: 'center' },
  verticalDivider: { width: 1, height: '80%', backgroundColor: theme.border, marginHorizontal: spacing.md },
  factorsTitle: { ...typography.body, fontWeight: '600', marginBottom: spacing.sm, color: theme.text },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: theme.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    maxHeight: '80%',
    ...shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: theme.text,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeBtnText: {
    color: theme.textSecondary,
    fontSize: 18,
  },
  cropOption: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  cropOptionText: {
    ...typography.body,
    color: theme.text,
  },
  factorsList: { gap: spacing.sm },
  factorItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  factorLeft: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  factorName: { ...typography.body, color: theme.textSecondary, width: 100 },
  factorStatus: { ...typography.caption, textTransform: 'uppercase' },
  factorImpact: { ...typography.body, fontWeight: '600' },
});
