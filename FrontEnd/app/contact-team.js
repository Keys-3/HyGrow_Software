import { getAuthHeaders } from '../src/services/authHeaders';
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Linking, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors, spacing, borderRadius, typography, shadows } from '../src/theme/theme';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../src/services/api';
import { getBackendUrl } from '../src/utils/apiConfig';

export default function ContactTeamScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const [activeTab, setActiveTab] = useState('team');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const TABS = [
    { key: 'team', label: 'Our Team' },
    { key: 'contact', label: 'Contact Us' },
    { key: 'faq', label: 'FAQ' },
    { key: 'legal', label: 'Legal' },
  ];

  const handleSendEmail = async () => {
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in all fields before submitting.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setIsSending(true);
    try {
      const url = `${getBackendUrl()}/api/email/send`;
      console.log(`[Contact Form] Sending email to: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({
          to: 'prithvis3804@gmail.com',
          subject: subject,
          text: `From: ${name} (${email})\n\nMessage:\n${message}`,
          replyTo: email
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      Alert.alert('Success', 'Your message has been sent to our team!');
      setSuccessMessage('Your message has been sent to our team!');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error sending email:', error);
      Alert.alert('Error', 'Failed to send message. Please try again later.');
    } finally {
      setIsSending(false);
    }
  };




  // -----------------------------------Team Memeber Details Over Here ---------------------------




  const renderTeamTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionHeader}>Meet the Creators</Text>
      <View style={styles.teamGrid}>
        {[
          { name: 'Prithvi Singh', role: 'Software Developer' },
          { name: 'Vaibhav Sharma', role: 'Hardware Developer' },
          { name: 'Samarth Sharma', role: 'AI Developer' },
          { name: 'Ekta Jain', role: 'Team Lead' },
        ].map((member, index) => (
          <View key={index} style={[styles.teamCard, { borderColor: themeColors.border, backgroundColor: themeColors.surfaceLight }]}>
            <View style={[styles.avatar, { backgroundColor: themeColors.primary + '20' }]}>
              <Text style={[styles.avatarText, { color: themeColors.primary }]}>{member.name.charAt(0)}</Text>
            </View>
            <Text style={styles.teamName}>{member.name}</Text>
            <Text style={styles.teamRole}>{member.role}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderContactTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionHeader}>Get In Touch</Text>
      <Text style={styles.sectionDesc}>Fill out the form below to send us an email directly.</Text>

      {!!successMessage && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Your Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          placeholderTextColor={themeColors.textMuted}
          value={name}
          onChangeText={setName}
          editable={!isSending}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Your Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email address"
          placeholderTextColor={themeColors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isSending}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Subject</Text>
        <TextInput
          style={styles.input}
          placeholder="What is this regarding?"
          placeholderTextColor={themeColors.textMuted}
          value={subject}
          onChangeText={setSubject}
          editable={!isSending}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Message</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="How can we help you?"
          placeholderTextColor={themeColors.textMuted}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          editable={!isSending}
        />
      </View>

      <Pressable
        style={({ pressed }) => [styles.submitBtnWrap, pressed && styles.pressed, isSending && { opacity: 0.7 }]}
        onPress={handleSendEmail}
        disabled={isSending}
      >
        <LinearGradient
          colors={themeColors.gradients.primary}
          style={styles.submitBtn}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {isSending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitBtnText}>Send Message</Text>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );

  const renderFAQTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionHeader}>Frequently Asked Questions</Text>
      <View style={styles.faqList}>
        {[
          { q: 'How does HyGrow use sensor data?', a: 'HyGrow reads data from your IoT sensors to provide real-time updates and AI-driven insights on your crops.' },
          { q: 'Can I sell my produce on HyGrow?', a: 'Yes! Farmers can list their inventory in our Market section, and customers can easily buy them directly.' },
          { q: 'How do I change my farm details?', a: 'Go to Settings > Edit Profile to update your farm name, location, and other details.' },
        ].map((item, index) => (
          <View key={index} style={[styles.faqItem, { borderColor: themeColors.border, backgroundColor: themeColors.surfaceLight }]}>
            <Text style={styles.faqQuestion}>{item.q}</Text>
            <Text style={styles.faqAnswer}>{item.a}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderLegalTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionHeader}>Terms and Conditions</Text>
      <View style={[styles.legalContainer, { backgroundColor: themeColors.surfaceLight, borderColor: themeColors.border }]}>
        <Text style={styles.legalText}>
          Last Updated: {new Date().toLocaleDateString()}{'\n\n'}
          1. Introduction{'\n'}
          Welcome to HyGrow. By accessing our app, you agree to these Terms and Conditions. Please read them carefully.{'\n\n'}
          2. Use of Service{'\n'}
          You must use this app responsibly and in accordance with all local laws. Any misuse may result in account termination.{'\n\n'}
          3. Data Privacy{'\n'}
          Your sensor and personal data are stored securely. We do not sell your data to third parties. By using the app, you consent to our data processing practices necessary for providing our services.{'\n\n'}
          4. Market Transactions{'\n'}
          HyGrow acts as a platform connecting farmers and customers. We are not responsible for the quality, safety, or legality of the items advertised.{'\n\n'}
          5. Limitation of Liability{'\n'}
          In no event shall HyGrow or its team be liable for any indirect, incidental, or consequential damages arising out of your use of the app.{'\n\n'}
          Please contact our support team if you have any questions regarding these terms.
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Support & Info</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[
                  styles.tabBtn,
                  isActive && { backgroundColor: themeColors.primary + '20', borderColor: themeColors.primary },
                  !isActive && { borderColor: themeColors.border }
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[
                  styles.tabBtnText,
                  isActive && { color: themeColors.primary, fontWeight: '700' },
                  !isActive && { color: themeColors.textSecondary }
                ]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentInner}>
        {activeTab === 'team' && renderTeamTab()}
        {activeTab === 'contact' && renderContactTab()}
        {activeTab === 'faq' && renderFAQTab()}
        {activeTab === 'legal' && renderLegalTab()}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backBtn: {
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
  },
  backBtnText: {
    ...typography.body,
    color: theme.primary,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.h2,
    color: theme.text,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingVertical: spacing.sm,
  },
  tabsScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  tabBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  tabBtnText: {
    ...typography.bodySmall,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentInner: {
    padding: spacing.lg,
  },
  tabContent: {
    flex: 1,
  },
  sectionHeader: {
    ...typography.h2,
    color: theme.text,
    marginBottom: spacing.sm,
  },
  sectionDesc: {
    ...typography.body,
    color: theme.textSecondary,
    marginBottom: spacing.xl,
  },
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  teamCard: {
    width: '47%',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
  },
  teamName: {
    ...typography.body,
    fontWeight: '700',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  teamRole: {
    ...typography.caption,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: theme.success + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: theme.success + '50',
  },
  successText: {
    ...typography.body,
    color: theme.success,
    textAlign: 'center',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.label,
    color: theme.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: theme.text,
    fontSize: 16,
  },
  textArea: {
    minHeight: 120,
  },
  submitBtnWrap: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  submitBtn: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  submitBtnText: {
    ...typography.body,
    color: '#ffffff',
    fontWeight: '700',
  },
  faqList: {
    gap: spacing.md,
  },
  faqItem: {
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
  },
  faqQuestion: {
    ...typography.h3,
    color: theme.text,
    marginBottom: spacing.xs,
  },
  faqAnswer: {
    ...typography.body,
    color: theme.textSecondary,
    lineHeight: 24,
  },
  legalContainer: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  legalText: {
    ...typography.body,
    color: theme.textSecondary,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
