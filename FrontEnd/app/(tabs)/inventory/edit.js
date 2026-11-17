import SafeImage from '../../../src/components/SafeImage';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Sparkles, Image as ImageIcon } from 'lucide-react-native';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../../firebase';
import useInventory from '../../../src/hooks/useInventory';
import useAppStore from '../../../src/store/useAppStore';
import { useThemeColors, spacing, borderRadius, typography } from '../../../src/theme/theme';
import { getProduceImageUrl, PRODUCE_PRESETS } from '../../../src/utils/produceImages';
import { PressableScale } from '../../../src/components/PressableScale';

const CATEGORIES = ['Vegetables', 'Fruits', 'Herbs', 'Microgreens', 'Supplies'];
const UNITS = ['kg', 'g', 'piece', 'bundle', 'tray', 'pack', 'set', 'L'];

export default function EditInventoryScreen() {
  const router = useRouter();
  const { inventoryId } = useLocalSearchParams();
  const {
    inventory,
    fetchInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    listItemToMarket,
    unlistItemFromMarket,
  } = useInventory();
  const user = useAppStore((state) => state.user);

  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Vegetables');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!inventoryId;
  const editingItem = inventory.find((item) => item.id === inventoryId);

  useEffect(() => {
    if (user?.role === 'farmer' || user?.role === 'admin') {
      const unsubscribe = fetchInventory();
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, [fetchInventory, user]);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setDescription(editingItem.description || '');
      setCategory(editingItem.category);
      setQuantity(editingItem.quantity.toString());
      setUnit(editingItem.unit);
      setPrice(editingItem.price_per_unit.toString());
      setImageUrl(editingItem.image_url || '');
    }
  }, [editingItem]);

  const validateForm = () => {
    if (!name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      setError('Quantity must be greater than 0');
      return false;
    }
    if (!price || parseFloat(price) <= 0) {
      setError('Price must be greater than 0');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError('');

      const resolvedImageUrl = imageUrl.trim() || getProduceImageUrl(name, category);

      const itemData = {
        name: name.trim(),
        description: description.trim() || null,
        category,
        quantity: parseFloat(quantity),
        unit,
        price_per_unit: parseFloat(price),
        image_url: resolvedImageUrl,
      };

      if (isEditing) {
        await updateInventoryItem(inventoryId, itemData);
      } else {
        await addInventoryItem(itemData);
      }

      router.back();
    } catch (err) {
      setError(err.message || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  const executeDelete = async () => {
    try {
      setLoading(true);
      await deleteInventoryItem(inventoryId);
      router.back();
    } catch (err) {
      setError(err.message || 'Failed to delete item');
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this item from your inventory?');
      if (confirmed) {
        executeDelete();
      }
    } else {
      Alert.alert(
        'Delete Item',
        'Are you sure you want to delete this item from your inventory?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: executeDelete,
          },
        ]
      );
    }
  };

  const handleListToMarket = async () => {
    if (!editingItem) return;

    try {
      setLoading(true);
      setError('');
      await listItemToMarket(editingItem);
      Alert.alert('Success', 'Item has been listed to the market!');
      router.back();
    } catch (err) {
      setError(err.message || 'Failed to list item');
      setLoading(false);
    }
  };

  const handleUnlistFromMarket = async () => {
    if (!editingItem) return;

    try {
      setLoading(true);
      setError('');

      // Find the active market listing for this inventory item
      const listingsQuery = query(
        collection(db, 'market_listings'),
        where('inventory_id', '==', inventoryId),
        where('is_active', '==', true)
      );
      const snapshot = await getDocs(listingsQuery);

      if (!snapshot.empty) {
        const listingDoc = snapshot.docs[0];
        await unlistItemFromMarket(listingDoc.id, inventoryId);
      } else {
        // Just update inventory item as not listed
        await updateInventoryItem(inventoryId, { is_listed: false });
      }

      Alert.alert('Success', 'Item has been unlisted from the market.');
      router.back();
    } catch (err) {
      setError(err.message || 'Failed to unlist item');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={themeColors.primary} />
          <Text style={styles.backText}>Inventory</Text>
        </Pressable>

        <Text style={styles.title}>
          {isEditing ? 'Edit Item' : 'Add to Inventory'}
        </Text>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Live Produce Visual Preview */}
        <View style={styles.imagePreviewSection}>
          <View style={styles.imagePreviewWrap}>
            <SafeImage
              source={{ uri: getProduceImageUrl(name, category, imageUrl) }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
            <View style={styles.imagePreviewBadge}>
              <Sparkles size={11} color={themeColors.primaryLight} />
              <Text style={styles.imagePreviewBadgeText}>LIVE HARVEST PREVIEW</Text>
            </View>
          </View>

          <Text style={styles.presetHeading}>Tap to Apply Curated Produce Photo:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.presetsRow}
            contentContainerStyle={styles.presetsContent}
          >
            {PRODUCE_PRESETS.map((preset) => {
              const isSelected = imageUrl === preset.imageUrl;
              return (
                <Pressable
                  key={preset.name}
                  style={[styles.presetCard, isSelected && styles.presetCardActive]}
                  onPress={() => {
                    setImageUrl(preset.imageUrl);
                    if (!name) setName(preset.name);
                    if (preset.category) setCategory(preset.category);
                  }}
                >
                  <SafeImage source={{ uri: preset.imageUrl }} style={styles.presetThumb} />
                  <Text style={[styles.presetText, isSelected && styles.presetTextActive]} numberOfLines={1}>
                    {preset.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Custom Image URL (Optional) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Custom Produce Photo URL (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="https://images.unsplash.com/..."
            placeholderTextColor={themeColors.textMuted}
            value={imageUrl}
            onChangeText={setImageUrl}
            editable={!loading}
            autoCapitalize="none"
          />
        </View>

        {/* Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Item Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Fresh Hydroponic Lettuce"
            placeholderTextColor={themeColors.textMuted}
            value={name}
            onChangeText={setName}
            editable={!loading}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your product..."
            placeholderTextColor={themeColors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            editable={!loading}
          />
        </View>

        {/* Category */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.chipContainer}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() => !loading && setCategory(cat)}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Quantity and Unit */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
            <Text style={styles.label}>Quantity *</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={themeColors.textMuted}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              editable={!loading}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Unit</Text>
            <View style={styles.chipContainerSmall}>
              {UNITS.slice(0, 4).map((u) => (
                <Pressable
                  key={u}
                  style={[styles.chipSmall, unit === u && styles.chipActive]}
                  onPress={() => !loading && setUnit(u)}
                >
                  <Text style={[styles.chipTextSmall, unit === u && styles.chipTextActive]}>
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Price */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Price per Unit (₹) *</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={themeColors.textMuted}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            editable={!loading}
          />
        </View>

        {/* Save Button */}
        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed, loading && styles.disabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={themeColors.background} />
          ) : (
            <Text style={styles.saveBtnText}>
              {isEditing ? 'Update Item' : 'Add to Inventory'}
            </Text>
          )}
        </Pressable>

        {/* Market Actions - Only for editing */}
        {isEditing && editingItem && (
          <View style={styles.marketSection}>
            <Text style={styles.marketSectionTitle}>Market Actions</Text>
            {editingItem.is_listed ? (
              <Pressable
                style={({ pressed }) => [styles.unlistBtn, pressed && styles.pressed]}
                onPress={handleUnlistFromMarket}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={themeColors.warning} />
                ) : (
                  <Text style={styles.unlistBtnText}>Unlist from Market</Text>
                )}
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.listBtn, pressed && styles.pressed]}
                onPress={handleListToMarket}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={themeColors.background} />
                ) : (
                  <Text style={styles.listBtnText}>List to Market</Text>
                )}
              </Pressable>
            )}
          </View>
        )}

        {/* Delete Button - Only for editing */}
        {isEditing && (
          <Pressable
            style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
            onPress={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={themeColors.danger} />
            ) : (
              <Text style={styles.deleteBtnText}>Delete from Inventory</Text>
            )}
          </Pressable>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: 60,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  backText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.lg,
    color: colors.text,
  },
  errorContainer: {
    backgroundColor: colors.danger + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
  },
  imagePreviewSection: {
    marginBottom: spacing.lg,
    backgroundColor: colors.adapt('#191C1E', colors.surface),
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.adapt('rgba(52, 211, 153, 0.22)', colors.border),
  },
  imagePreviewWrap: {
    height: 160,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.adapt('#151719', colors.surfaceMuted),
    marginBottom: spacing.md,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePreviewBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(8, 18, 13, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.adapt('rgba(52, 211, 153, 0.3)', colors.border),
  },
  imagePreviewBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.adapt('#34D399', colors.primaryLight),
    letterSpacing: 0.6,
  },
  presetHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.adapt('#9CB0A2', colors.textSecondary),
    marginBottom: 8,
  },
  presetsRow: {
    marginBottom: 4,
  },
  presetsContent: {
    gap: 8,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  presetCardActive: {
    borderColor: colors.adapt('#10B981', colors.borderActive),
    backgroundColor: colors.adapt('rgba(16, 185, 129, 0.2)', colors.primaryGlow),
  },
  presetThumb: {
    width: 32,
    height: 32,
  },
  presetText: {
    fontSize: 13,
    color: colors.adapt('#9CB0A2', colors.textSecondary),
    fontWeight: '500',
  },
  presetTextActive: {
    color: colors.adapt('#34D399', colors.primaryLight),
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 18,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chipContainerSmall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSmall: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  chipTextSmall: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: colors.action,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveBtnText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.actionText,
  },
  marketSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  marketSectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
    color: colors.text,
  },
  listBtn: {
    backgroundColor: colors.info,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  listBtnText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.adapt('#FFFFFF', colors.text),
  },
  unlistBtn: {
    backgroundColor: colors.warning + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  unlistBtnText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.warning,
  },
  deleteBtn: {
    backgroundColor: colors.danger + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.danger + '40',
  },
  deleteBtnText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.danger,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
