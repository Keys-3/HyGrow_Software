import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Modal, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors, spacing, borderRadius, typography, shadows } from '../../../src/theme/theme';
import useSensorData from '../../../src/hooks/useSensorData';
import useAppStore from '../../../src/store/useAppStore';
import { predictGrowth } from "../../../src/services/growthPrediction";

const CROP_OPTIONS = [
  { label: 'Butterhead Lettuce', temp: '22', hum: '65', ph: '6.0', ec: '1.2', water: '80', light: '15000', vpd: '0.8', waterTemp: '20', co2: '450' },
  { label: 'Tomatoes', temp: '26', hum: '70', ph: '6.2', ec: '2.5', water: '70', light: '25000', vpd: '1.0', waterTemp: '22', co2: '800' },
  { label: 'Basil', temp: '24', hum: '60', ph: '6.5', ec: '1.6', water: '75', light: '20000', vpd: '0.9', waterTemp: '21', co2: '500' },
  { label: 'Spinach', temp: '18', hum: '60', ph: '6.5', ec: '1.8', water: '85', light: '12000', vpd: '0.7', waterTemp: '18', co2: '400' },
  { label: 'Strawberries', temp: '20', hum: '70', ph: '5.8', ec: '1.5', water: '65', light: '22000', vpd: '0.8', waterTemp: '19', co2: '600' },
];

export default function YieldScreen() {
  const router = useRouter();
  const { current } = useSensorData();
  const farmerFeatures = useAppStore((state) => state.farmerFeatures);
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  
  const [crop, setCrop] = useState(CROP_OPTIONS[0].label);
  const [showCropModal, setShowCropModal] = useState(false);

  const isSensorActive = (key) => farmerFeatures?.sensors?.[key] !== false;

  const [temperature, setTemperature] = useState(current?.temperature?.toString() ?? '25');
  const [humidity, setHumidity] = useState(current?.humidity?.toString() ?? '60');
  const [ph, setPh] = useState(current?.ph?.toString() ?? '6.0');
  const [ec, setEc] = useState(current?.ec?.toString() ?? '1.5');
  const [waterLevel, setWaterLevel] = useState(current?.waterLevel?.toString() ?? '80');
  const [lightIntensity, setLightIntensity] = useState(current?.lightIntensity?.toString() ?? '15000');
  const [vpd, setVpd] = useState(current?.vpd?.toString() ?? '0.8');
  const [waterTemp, setWaterTemp] = useState(current?.waterTemp?.toString() ?? '20');
  const [co2, setCo2] = useState(current?.co2?.toString() ?? '450');
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  // When a crop is selected, auto-fill with optimal readings
  const handleSelectCrop = (selectedCrop) => {
    setCrop(selectedCrop.label);
    setTemperature(selectedCrop.temp);
    setHumidity(selectedCrop.hum);
    setPh(selectedCrop.ph);
    setEc(selectedCrop.ec);
    setWaterLevel(selectedCrop.water);
    setLightIntensity(selectedCrop.light);
    setVpd(selectedCrop.vpd);
    setWaterTemp(selectedCrop.waterTemp);
    setCo2(selectedCrop.co2);
    setShowCropModal(false);
  };

  const handleUseCurrentSensors = () => {
    setTemperature(current?.temperature?.toString() ?? '25');
    setHumidity(current?.humidity?.toString() ?? '60');
    setPh(current?.ph?.toString() ?? '6.0');
    setEc(current?.ec?.toString() ?? '1.5');
    setWaterLevel(current?.waterLevel?.toString() ?? '80');
    setLightIntensity(current?.lightIntensity?.toString() ?? '15000');
    setVpd(current?.vpd?.toString() ?? '0.8');
    setWaterTemp(current?.waterTemp?.toString() ?? '20');
    setCo2(current?.co2?.toString() ?? '450');
  };

  const handlePredict = async () => {
    try {
        setLoading(true);
        setResults(null);
        
        const payload = {
          temperature: parseFloat(temperature) || 25,
          humidity: parseFloat(humidity) || 60,
          ph: parseFloat(ph) || 6.0,
          tds: Math.round((parseFloat(ec) || 1.5) * 500), // convert EC to rough TDS
          waterLevel: parseFloat(waterLevel) || 80,
          lightIntensity: parseFloat(lightIntensity) || 15000,
          vpd: parseFloat(vpd) || 0.8,
          waterTemp: parseFloat(waterTemp) || 20,
          co2: parseFloat(co2) || 450,
        };

        const response = await predictGrowth(payload);
        if (response && response.success && response.prediction) {
          setResults(response.prediction);
        } else {
          Alert.alert('Prediction Failed', (response && response.message) || 'Could not fetch growth prediction from AI model.');
        }

    } catch (e) {
        console.error('Yield prediction error:', e);
        Alert.alert('Prediction Error', e.message || 'Network error connecting to Hugging Face AI backend.');
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
      <Text style={styles.subtitle}>Estimate crop yield based on conditions</Text>

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
              <Text style={styles.useSensorsText}>Use Sensors</Text>
            </Pressable>
          </View>

          <View style={styles.readingsGrid}>
            {isSensorActive('temperature') && (
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
            )}

            {isSensorActive('humidity') && (
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
            )}

            {isSensorActive('ph') && (
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
            )}

            {isSensorActive('ec') && (
              <View style={styles.readingInputWrapper}>
                <Text style={styles.readingLabel}>EC (mS/cm)</Text>
                <TextInput
                  style={styles.readingInput}
                  value={ec}
                  onChangeText={setEc}
                  keyboardType="numeric"
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>
            )}

            {isSensorActive('waterLevel') && (
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
            )}

            {isSensorActive('lightIntensity') && (
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
            )}

            {isSensorActive('vpd') && (
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
            )}

            {isSensorActive('waterTemp') && (
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
            )}

            {isSensorActive('co2') && (
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
            )}
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
