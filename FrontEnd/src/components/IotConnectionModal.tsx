/**
 * Farm Help — IoT Connection & Offline Mode Modal
 * Allows farmers to configure UDP discovery (port 39400),
 * direct device IP connection (http://<ip>/status), and switch between Auto/Local/Cloud modes.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Wifi,
  WifiOff,
  Radio,
  RefreshCw,
  X,
  Check,
  AlertCircle,
  Cpu,
  Server,
  Cloud,
  HardDrive,
} from 'lucide-react-native';
import useAppStore from '../store/useAppStore';
import localIotService from '../services/localIotService';
import { useThemeColors, borderRadius, shadows, spacing, typography } from '../theme/theme';
import { ConnectionMode, LocalDeviceInfo } from '../store/slices/sensorSlice';

interface IotConnectionModalProps {
  visible: boolean;
  onClose: () => void;
  onRefreshTelemetry?: () => void;
}

export default function IotConnectionModal({
  visible,
  onClose,
  onRefreshTelemetry,
}: IotConnectionModalProps) {
  const themeColors = useThemeColors();

  const connectionMode = useAppStore((state) => state.connectionMode);
  const setConnectionMode = useAppStore((state) => state.setConnectionMode);
  const activeSource = useAppStore((state) => state.activeSource);
  const localDevice = useAppStore((state) => state.localDevice);
  const setLocalDevice = useAppStore((state) => state.setLocalDevice);
  const discoveredDevices = useAppStore((state) => state.discoveredDevices);
  const setDiscoveredDevices = useAppStore((state) => state.setDiscoveredDevices);
  const isDeviceOnline = useAppStore((state) => state.isDeviceOnline);

  const [inputIp, setInputIp] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Initialize input IP from saved local device
  useEffect(() => {
    if (visible) {
      const savedIp = localDevice?.ip || localIotService.getActiveDeviceIp() || '';
      setInputIp(savedIp);
      setTestResult(null);
    }
  }, [visible, localDevice]);

  // Handle Mode Change
  const handleSelectMode = (mode: ConnectionMode) => {
    setConnectionMode(mode);
    setTestResult(null);
    if (onRefreshTelemetry) {
      setTimeout(onRefreshTelemetry, 300);
    }
  };

  // Trigger UDP discovery (port 39400) + subnet scan
  const handleScanNetwork = async () => {
    setIsScanning(true);
    setTestResult(null);
    try {
      const devices = await localIotService.discoverDevices();
      setDiscoveredDevices(devices);
      if (devices.length === 0) {
        setTestResult({
          success: false,
          message: 'No devices responded to UDP port 39400 or subnet scan. Ensure ESP32 is powered and on same WiFi.',
        });
      } else {
        setTestResult({
          success: true,
          message: `Found ${devices.length} HyGrow device${devices.length > 1 ? 's' : ''} on local network!`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Discovery failed: ${err.message}`,
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Test and connect to manual IP
  const handleConnectIp = async (targetIp?: string) => {
    const ipToTest = targetIp || inputIp;
    if (!ipToTest.trim()) {
      setTestResult({ success: false, message: 'Please enter a valid IP address (e.g. 192.168.1.100)' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const { snapshot, latencyMs } = await localIotService.fetchStatus(ipToTest);
      const cleanIp = localIotService.cleanIp(ipToTest);

      const newDeviceInfo: LocalDeviceInfo = {
        ip: cleanIp,
        deviceId: snapshot.deviceId,
        port: 39400,
        lastSeen: new Date().toISOString(),
        isReachable: true,
        latencyMs,
      };

      setLocalDevice(newDeviceInfo);
      await localIotService.setActiveDeviceIp(cleanIp);

      setTestResult({
        success: true,
        message: `Connected to ${snapshot.deviceId} (${latencyMs}ms latency)`,
      });

      if (onRefreshTelemetry) {
        onRefreshTelemetry();
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Connection failed: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const styles = createStyles(themeColors);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIconWrap}>
                <Radio color={themeColors.primary} size={22} />
              </View>
              <View>
                <Text style={styles.modalTitle}>IoT & Offline Mode</Text>
                <Text style={styles.modalSubtitle}>UDP port 39400 • Direct LAN /status</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={themeColors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Active Status Banner */}
            <View style={styles.statusCard}>
              <View style={styles.statusHeaderRow}>
                <View style={styles.statusIndicatorRow}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: isDeviceOnline
                          ? activeSource === 'local'
                            ? '#10B981'
                            : '#3B82F6'
                          : '#EF4444',
                      },
                    ]}
                  />
                  <Text style={styles.statusTitle}>
                    {isDeviceOnline
                      ? activeSource === 'local'
                        ? 'Connected Directly to ESP32 (Offline Mode)'
                        : 'Connected via Cloud Firestore'
                      : 'No Device Streaming'}
                  </Text>
                </View>
                {activeSource === 'local' && localDevice?.latencyMs !== undefined && (
                  <View style={styles.latencyBadge}>
                    <Text style={styles.latencyText}>{localDevice.latencyMs} ms</Text>
                  </View>
                )}
              </View>

              {activeSource === 'local' && localDevice && (
                <View style={styles.statusDetails}>
                  <Text style={styles.statusDetailText}>Device: <Text style={styles.boldText}>{localDevice.deviceId}</Text></Text>
                  <Text style={styles.statusDetailText}>Endpoint: <Text style={styles.codeText}>http://{localDevice.ip}/status</Text></Text>
                </View>
              )}

              {activeSource === 'cloud' && (
                <Text style={styles.statusDesc}>
                  App is synchronizing live snapshots via Firebase Firestore.
                </Text>
              )}
            </View>

            {/* Connection Mode Selection */}
            <Text style={styles.sectionTitle}>Connection Mode</Text>
            <View style={styles.modesContainer}>
              {/* Auto Mode */}
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  connectionMode === 'auto' && styles.modeOptionSelected,
                ]}
                onPress={() => handleSelectMode('auto')}
                activeOpacity={0.7}
              >
                <View style={styles.modeIconWrap}>
                  <Radio
                    color={connectionMode === 'auto' ? themeColors.primary : themeColors.textMuted}
                    size={20}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.modeOptionTitle,
                      connectionMode === 'auto' && styles.modeOptionTitleSelected,
                    ]}
                  >
                    Auto (Smart Sync)
                  </Text>
                  <Text style={styles.modeOptionDesc}>
                    Uses direct Local LAN if reachable; seamlessly falls back to Cloud.
                  </Text>
                </View>
                {connectionMode === 'auto' && (
                  <Check color={themeColors.primary} size={18} />
                )}
              </TouchableOpacity>

              {/* Local LAN Only (Offline Mode) */}
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  connectionMode === 'local' && styles.modeOptionSelected,
                ]}
                onPress={() => handleSelectMode('local')}
                activeOpacity={0.7}
              >
                <View style={styles.modeIconWrap}>
                  <HardDrive
                    color={connectionMode === 'local' ? themeColors.primary : themeColors.textMuted}
                    size={20}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.modeOptionTitle,
                      connectionMode === 'local' && styles.modeOptionTitleSelected,
                    ]}
                  >
                    Direct Local LAN (100% Offline)
                  </Text>
                  <Text style={styles.modeOptionDesc}>
                    Connects directly to ESP32 over WiFi/AP. Zero internet or Firebase needed.
                  </Text>
                </View>
                {connectionMode === 'local' && (
                  <Check color={themeColors.primary} size={18} />
                )}
              </TouchableOpacity>

              {/* Cloud Only */}
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  connectionMode === 'cloud' && styles.modeOptionSelected,
                ]}
                onPress={() => handleSelectMode('cloud')}
                activeOpacity={0.7}
              >
                <View style={styles.modeIconWrap}>
                  <Cloud
                    color={connectionMode === 'cloud' ? themeColors.primary : themeColors.textMuted}
                    size={20}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.modeOptionTitle,
                      connectionMode === 'cloud' && styles.modeOptionTitleSelected,
                    ]}
                  >
                    Cloud Only (Firebase)
                  </Text>
                  <Text style={styles.modeOptionDesc}>
                    Synchronizes exclusively with Cloud Firestore database.
                  </Text>
                </View>
                {connectionMode === 'cloud' && (
                  <Check color={themeColors.primary} size={18} />
                )}
              </TouchableOpacity>
            </View>

            {/* Manual IP Configuration */}
            <Text style={styles.sectionTitle}>Device IP Address</Text>
            <View style={styles.manualInputCard}>
              <Text style={styles.inputLabel}>
                ESP32 IP (e.g. 192.168.1.100 or 192.168.4.1 for AP mode)
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  placeholder="192.168.1.100"
                  placeholderTextColor={themeColors.textMuted}
                  value={inputIp}
                  onChangeText={setInputIp}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={[styles.connectBtn, isTesting && styles.btnDisabled]}
                  onPress={() => handleConnectIp()}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.connectBtnText}>Connect</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* UDP Discovery Section */}
            <View style={styles.discoveryHeaderRow}>
              <Text style={styles.sectionTitle}>Local Network Discovery</Text>
              <TouchableOpacity
                style={[styles.scanBtn, isScanning && styles.btnDisabled]}
                onPress={handleScanNetwork}
                disabled={isScanning}
              >
                {isScanning ? (
                  <ActivityIndicator size="small" color={themeColors.primary} />
                ) : (
                  <>
                    <RefreshCw size={14} color={themeColors.primary} />
                    <Text style={styles.scanBtnText}>Scan Port 39400</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Test Result Message */}
            {testResult && (
              <View
                style={[
                  styles.resultBox,
                  testResult.success ? styles.resultBoxSuccess : styles.resultBoxError,
                ]}
              >
                {testResult.success ? (
                  <Check size={16} color="#10B981" />
                ) : (
                  <AlertCircle size={16} color="#EF4444" />
                )}
                <Text
                  style={[
                    styles.resultText,
                    testResult.success ? styles.resultTextSuccess : styles.resultTextError,
                  ]}
                >
                  {testResult.message}
                </Text>
              </View>
            )}

            {/* Discovered Devices List */}
            {discoveredDevices.length > 0 ? (
              <View style={styles.devicesList}>
                {discoveredDevices.map((dev) => {
                  const isCurrent = localDevice?.ip === dev.ip;
                  return (
                    <View key={dev.ip} style={styles.deviceItem}>
                      <View style={styles.deviceInfoWrap}>
                        <Cpu size={18} color={themeColors.primary} />
                        <View style={{ marginLeft: 10 }}>
                          <Text style={styles.deviceItemName}>{dev.deviceId}</Text>
                          <Text style={styles.deviceItemIp}>
                            http://{dev.ip}/status • Port {dev.port || 39400}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.deviceSelectBtn,
                          isCurrent && styles.deviceSelectedBtn,
                        ]}
                        onPress={() => handleConnectIp(dev.ip)}
                      >
                        <Text
                          style={[
                            styles.deviceSelectBtnText,
                            isCurrent && styles.deviceSelectedBtnText,
                          ]}
                        >
                          {isCurrent ? 'Active' : 'Select'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyDiscoveryCard}>
                <Text style={styles.emptyDiscoveryText}>
                  Tap &quot;Scan Port 39400&quot; to discover HyGrow ESP32 devices broadcasting UDP packets on your network, or enter the IP above.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.md,
    },
    modalContent: {
      backgroundColor: theme.cardBackground || '#1E293B',
      width: '100%',
      maxWidth: 520,
      maxHeight: '88%',
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border || '#334155',
      ...shadows.card,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border || '#334155',
    },
    headerTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    headerIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: theme.primary + '18',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      ...typography.h3,
      color: theme.text,
    },
    modalSubtitle: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      padding: spacing.xs,
    },
    scrollBody: {
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    statusCard: {
      backgroundColor: theme.surfaceMuted || '#0F172A',
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: theme.border || '#334155',
    },
    statusHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statusIndicatorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    statusTitle: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
    },
    latencyBadge: {
      backgroundColor: '#10B98125',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
    },
    latencyText: {
      color: '#10B981',
      fontSize: 11,
      fontWeight: '700',
    },
    statusDetails: {
      marginTop: spacing.sm,
      paddingTop: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: theme.border || '#334155',
      gap: 2,
    },
    statusDetailText: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    boldText: {
      color: theme.text,
      fontWeight: '600',
    },
    codeText: {
      color: theme.primary,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      fontWeight: '600',
    },
    statusDesc: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: 4,
    },
    sectionTitle: {
      ...typography.bodySmall,
      fontWeight: '700',
      color: theme.text,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.xs,
    },
    modesContainer: {
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    modeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.surfaceMuted || '#0F172A',
      borderWidth: 1.5,
      borderColor: 'transparent',
      gap: spacing.sm,
    },
    modeOptionSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '10',
    },
    modeIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.background || '#1E293B',
    },
    modeOptionTitle: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: theme.text,
    },
    modeOptionTitleSelected: {
      color: theme.primary,
    },
    modeOptionDesc: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: 2,
    },
    manualInputCard: {
      backgroundColor: theme.surfaceMuted || '#0F172A',
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: theme.border || '#334155',
    },
    inputLabel: {
      ...typography.caption,
      color: theme.textSecondary,
      marginBottom: spacing.xs,
    },
    inputRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    textInput: {
      flex: 1,
      backgroundColor: theme.background || '#1E293B',
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border || '#334155',
      fontSize: 14,
    },
    connectBtn: {
      backgroundColor: theme.primary,
      paddingHorizontal: spacing.lg,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: borderRadius.md,
    },
    connectBtnText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 13,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    discoveryHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    scanBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: borderRadius.sm,
      backgroundColor: theme.primary + '15',
    },
    scanBtnText: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: '600',
    },
    resultBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: spacing.sm,
      borderRadius: borderRadius.md,
      marginBottom: spacing.md,
    },
    resultBoxSuccess: {
      backgroundColor: '#10B98115',
      borderWidth: 1,
      borderColor: '#10B98140',
    },
    resultBoxError: {
      backgroundColor: '#EF444415',
      borderWidth: 1,
      borderColor: '#EF444440',
    },
    resultText: {
      ...typography.caption,
      flex: 1,
    },
    resultTextSuccess: {
      color: '#10B981',
      fontWeight: '500',
    },
    resultTextError: {
      color: '#EF4444',
      fontWeight: '500',
    },
    devicesList: {
      gap: spacing.xs,
    },
    deviceItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.surfaceMuted || '#0F172A',
      borderRadius: borderRadius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: theme.border || '#334155',
    },
    deviceInfoWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    deviceItemName: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: theme.text,
    },
    deviceItemIp: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: 1,
    },
    deviceSelectBtn: {
      backgroundColor: theme.primary + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: borderRadius.sm,
    },
    deviceSelectedBtn: {
      backgroundColor: '#10B981',
    },
    deviceSelectBtnText: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: '600',
    },
    deviceSelectedBtnText: {
      color: '#fff',
    },
    emptyDiscoveryCard: {
      backgroundColor: theme.surfaceMuted || '#0F172A',
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: theme.border || '#334155',
      alignItems: 'center',
    },
    emptyDiscoveryText: {
      ...typography.caption,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
}
