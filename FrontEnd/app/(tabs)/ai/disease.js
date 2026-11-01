import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { uploadDiseaseImage } from '../../../src/services/diseaseApi';
import {
  borderRadius,
  useThemeColors,
  shadows,
  spacing,
  typography,
} from '../../../src/theme/theme';

export default function DiseaseScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);

  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const analyzeImage = async (asset) => {
    try {
      console.log('Selected asset:', asset);

      setLoading(true);
      setResults(null);
      console.log(JSON.stringify(asset, null, 2));
      const data = await uploadDiseaseImage(asset);

      setResults(data.result);
    } catch (error) {
      console.error('Disease detection error:', error);

      Alert.alert(
        'Detection Failed',
        error.message || 'Could not analyze image.'
      );
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Gallery permission is required.'
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

    if (result.canceled) return;

    const asset = result.assets[0];

    console.log('Gallery asset:', asset);

    setImage(asset.uri);

    await analyzeImage(asset);
  };

  const takePhoto = async () => {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Camera permission is required.'
      );
      return;
    }

    const result =
      await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

    if (result.canceled) return;

    const asset = result.assets[0];

    console.log('Camera asset:', asset);

    setImage(asset.uri);

    await analyzeImage(asset);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Pressable
        onPress={() => router.back()}
        style={styles.backBtn}
      >
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>
        Disease Detection
      </Text>

      <Text style={styles.subtitle}>
        Upload a leaf image for AI analysis.
      </Text>

      <View style={styles.uploadArea}>
        {image ? (
          <Image
            source={{ uri: image }}
            style={styles.previewImage}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderEmoji}>
              📸
            </Text>

            <Text style={styles.placeholderText}>
              No image selected
            </Text>
          </View>
        )}
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          style={styles.actionBtn}
          onPress={takePhoto}
        >
          <Text style={styles.actionBtnText}>
            Take Photo
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.actionBtn,
            styles.secondaryBtn,
          ]}
          onPress={pickImage}
        >
          <Text style={styles.actionBtnText}>
            Gallery
          </Text>
        </Pressable>
      </View>

      {loading && (
        <View style={styles.loadingArea}>
          <ActivityIndicator
            size="large"
            color={themeColors.success}
          />

          <Text style={styles.loadingText}>
            Analyzing image...
          </Text>
        </View>
      )}

      {results && !loading && (
        <View style={styles.resultsCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>
              {results.disease}
            </Text>

            {results.severity && (
              <View
                style={[
                  styles.badge,
                  results.severity === 'moderate'
                    ? styles.badgeWarning
                    : styles.badgeDanger,
                ]}
              >
                <Text style={styles.badgeText}>
                  {results.severity}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.confidence}>
            Confidence:{' '}
            {results.confidence
              ? `${(results.confidence * 100).toFixed(1)}%`
              : 'N/A'}
          </Text>

          {results.description && (
            <Text style={styles.desc}>
              {results.description}
            </Text>
          )}

          {Array.isArray(results.recommendations) &&
            results.recommendations.length > 0 && (
              <>
                <Text style={styles.recTitle}>
                  Recommendations
                </Text>

                {results.recommendations.map(
                  (item, index) => (
                    <View
                      key={index}
                      style={styles.recItem}
                    >
                      <Text style={styles.recIcon}>
                        ✅
                      </Text>

                      <Text style={styles.recText}>
                        {item}
                      </Text>
                    </View>
                  )
                )}
              </>
            )}
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backBtn: {
    marginBottom: spacing.md,
  },
  backText: {
    color: theme.primary,
    ...typography.body,
    fontWeight: '600',
  },
  title: {
    ...typography.h1,
    color: theme.text,
  },
  subtitle: {
    ...typography.body,
    color: theme.textSecondary,
    marginBottom: spacing.lg,
  },
  uploadArea: {
    height: 250,
    backgroundColor: theme.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  placeholderText: {
    color: theme.textSecondary,
    ...typography.body,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: theme.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },
  secondaryBtn: {
    backgroundColor: theme.surfaceLight,
  },
  actionBtnText: {
    color: theme.text,
    ...typography.body,
    fontWeight: '600',
  },
  loadingArea: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    color: theme.textSecondary,
    ...typography.body,
  },
  resultsCard: {
    backgroundColor: theme.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: theme.warning + '50',
    ...shadows.card,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  resultTitle: {
    ...typography.h2,
    color: theme.warning,
    flex: 1,
    marginRight: 8,
    minWidth: 150,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  badgeWarning: {
    backgroundColor: theme.warning + '20',
  },
  badgeDanger: {
    backgroundColor: theme.danger + '20',
  },
  badgeText: {
    ...typography.caption,
    color: theme.text,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  confidence: {
    ...typography.bodySmall,
    color: theme.textSecondary,
    marginBottom: spacing.md,
  },
  desc: {
    ...typography.body,
    marginBottom: spacing.lg,
    lineHeight: 22,
    color: theme.text,
  },
  recTitle: {
    ...typography.body,
    fontWeight: '700',
    marginBottom: spacing.sm,
    color: theme.text,
  },
  recItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  recIcon: {
    marginRight: spacing.sm,
    fontSize: 14,
    marginTop: 2,
  },
  recText: {
    ...typography.body,
    color: theme.textSecondary,
    flex: 1,
  },
});