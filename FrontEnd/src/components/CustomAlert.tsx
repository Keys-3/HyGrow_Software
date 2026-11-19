import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useThemeColors, spacing, borderRadius, typography } from '../theme/theme';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
}

export default function CustomAlert({ visible, title, message, buttons = [], onDismiss }: CustomAlertProps) {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);

  // If no buttons are provided, default to a single OK button
  const activeButtons = buttons && buttons.length > 0 ? buttons : [
    {
      text: 'OK',
      onPress: onDismiss,
    }
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.alertBox} accessibilityViewIsModal>
          <Text style={styles.title}>{title}</Text>
          <ScrollView style={{ maxHeight: 280, width: '100%' }} contentContainerStyle={{ flexGrow: 1 }}><Text style={styles.message}>{message}</Text></ScrollView>
          
          <View style={styles.buttonContainer}>
            {activeButtons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              
              return (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    styles.button,
                    isCancel ? styles.buttonCancel : styles.buttonDefault,
                    isDestructive && styles.buttonDestructive,
                    pressed && styles.buttonPressed,
                    activeButtons.length === 2 && styles.buttonHalf
                  ]}
                  onPress={() => {
                    if (btn.onPress) btn.onPress();
                    if (onDismiss && !btn.onPress) onDismiss();
                  }}
                >
                  <Text style={[
                    styles.buttonText,
                    isCancel ? styles.buttonTextCancel : styles.buttonTextDefault,
                    isDestructive && styles.buttonTextDestructive
                  ]}>
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay || 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  alertBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    width: '100%',
    flexWrap: 'wrap',
  },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  buttonHalf: {
    flex: 1,
    minWidth: 0,
  },
  buttonDefault: {
    backgroundColor: colors.action,
  },
  buttonCancel: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDestructive: {
    backgroundColor: colors.danger,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    ...typography.body,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },
  buttonTextDefault: {
    color: colors.actionText,
  },
  buttonTextCancel: {
    color: colors.text,
  },
  buttonTextDestructive: {
    color: colors.background,
  },
});
