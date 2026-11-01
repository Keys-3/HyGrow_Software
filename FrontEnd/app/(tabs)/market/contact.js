import { getAuthHeaders } from '../../../src/services/authHeaders';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Paperclip, X } from 'lucide-react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useThemeColors, spacing, borderRadius, typography } from '../../../src/theme/theme';
import useAppStore from '../../../src/store/useAppStore';

import { BACKEND_URL } from '../../../src/utils/apiConfig';

export default function ContactSellerScreen() {
  const { listingId, farmerId, listingTitle, farmerName } = useLocalSearchParams();
  const router = useRouter();
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const user = useAppStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [farmerEmail, setFarmerEmail] = useState('');
  const [subject, setSubject] = useState(`Inquiry about ${listingTitle || 'your listing'}`);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [attachment, setAttachment] = useState(null);

  useEffect(() => {
    setLoading(false);
    setFarmerEmail(listingId ? 'seller' : '');
    if (!listingId) setError('Listing information missing');
  }, [listingId]);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAttachment(result.assets[0]);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handleSendEmail = async () => {
    if (!farmerEmail) {
      Alert.alert('Error', 'Cannot send email because seller email is missing.');
      return;
    }
    
    if (!message.trim()) {
      Alert.alert('Validation Error', 'Please enter a message.');
      return;
    }

    try {
      setSending(true);
      const targetUrl = `${BACKEND_URL}/api/email/send`;
      console.log(`Sending POST request to: ${targetUrl}`);
      
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({
          listingId,
          subject,
          text: message,
          attachments: attachment ? [{
            filename: attachment.fileName || 'attachment.jpg',
            content: attachment.base64,
            encoding: 'base64'
          }] : undefined
        }),
      });
      
      if (!response.ok) {
        let errorMsg = `Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.message) errorMsg = errorData.message;
        } catch(e) {}
        throw new Error(errorMsg);
      }
      
      setSuccessMsg('Message sent successfully!');
      setTimeout(() => {
        router.back();
      }, 2000);
    } catch (err) {
      console.error('Error sending email via API:', err);
      // If it's a 404, the user likely didn't restart the backend
      if (err.message.includes('404')) {
        Alert.alert('Configuration Error', 'The backend email route was not found. Please restart your backend server to load the new email routes.');
      } else {
        Alert.alert('Error', `Failed to send message: ${err.message}`);
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading seller details...</Text>
      </View>
    );
  }

  if (error && !farmerEmail) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>😕</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.errorBackBtn} onPress={() => router.back()}>
          <Text style={styles.errorBackBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back to Listing</Text>
        </Pressable>

        <Text style={styles.title}>Contact Seller</Text>
        <Text style={styles.subtitle}>
          Send a message to {farmerName || 'the seller'} directly from your email app.
        </Text>

        {successMsg ? (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>{successMsg}</Text>
          </View>
        ) : null}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="Enter subject"
            placeholderTextColor={themeColors.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder="Type your message here..."
            placeholderTextColor={themeColors.textMuted}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {attachment ? (
          <View style={styles.attachmentPreview}>
            <View style={styles.attachmentInfo}>
              <Paperclip size={16} color={themeColors.primary} />
              <Text style={styles.attachmentText} numberOfLines={1}>
                {attachment.fileName || 'Image attached'}
              </Text>
            </View>
            <Pressable onPress={() => setAttachment(null)} style={styles.removeAttachmentBtn}>
              <X size={16} color="#dc3545" />
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.attachBtn} onPress={handlePickImage}>
            <Paperclip size={20} color={themeColors.primary} />
            <Text style={styles.attachBtnText}>Attach Image</Text>
          </Pressable>
        )}

        <Pressable 
          style={({ pressed }) => [styles.submitBtn, (pressed || sending) && styles.pressed]}
          onPress={handleSendEmail}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color={themeColors.background} size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Send Message</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  errorBackBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  errorBackBtnText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.background,
  },
  backBtn: {
    marginBottom: spacing.md,
  },
  backText: {
    color: colors.primary,
    ...typography.body,
    fontWeight: '600',
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  textArea: {
    minHeight: 150,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  pressed: {
    opacity: 0.8,
  },
  submitBtnText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.background,
  },
  successBanner: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  successBannerText: {
    ...typography.body,
    color: '#4CAF50',
    textAlign: 'center',
    fontWeight: '600',
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  attachBtnText: {
    ...typography.body,
    color: colors.primary,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  attachmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  attachmentText: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  removeAttachmentBtn: {
    padding: spacing.xs,
  },
});
