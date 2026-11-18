import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {
  Sliders,
  Cpu,
  User,
  Edit3,
  KeyRound,
  Tractor,
  ShoppingBag,
  ShieldCheck,
  Bell,
  BellRing,
  Camera,
  HardDrive,
  ExternalLink,
  LifeBuoy,
  LogOut,
  Trash2,
  Check,
  Sparkles,
  ChevronRight,
  Filter,
  AlertTriangle,
  X,
  CheckCircle2,
  Calendar,
  Radio,
  Plus,
} from 'lucide-react-native';
import { updatePassword } from 'firebase/auth';
import { DEFAULT_SENSOR_SETS } from '../../src/utils/sensorSets';

import { useThemeColors, spacing, borderRadius, typography } from '../../src/theme/theme';
import useAppStore from '../../src/store/useAppStore';
import useAuth from '../../src/hooks/useAuth';
import { formatDate, formatTime } from '../../src/utils/helpers';
import permissionManager from '../../src/services/permissionManager';
import { PageScrollView } from '../../src/components/layout/PageScrollView';
import { SagePageHero } from '../../src/components/SagePageHero';
import { SageFeatureCards } from '../../src/components/SageFeatureCards';
import { auth } from '../../firebase';
import useAdminUsers from '../../src/hooks/useAdminUsers';
import PressableScale from '../../src/components/PressableScale';
import { useNavigationTransition } from '../../src/components/transitions/ScreenTransitionProvider';

export default function SettingsScreen() {
  const navigateWithTransition = useNavigationTransition();
  const deviceIds = useAppStore((state) => state.deviceIds);
  const setDeviceId = useAppStore((state) => state.setDeviceId);
  const { user, logout, updateProfile } = useAuth();
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const savedDeviceId = deviceIds[user?.id] || process.env.EXPO_PUBLIC_DEVICE_ID || '';
  const [deviceDraft, setDeviceDraft] = useState(savedDeviceId);
  const [deviceFeedback, setDeviceFeedback] = useState('');
  const [savingDevice, setSavingDevice] = useState(false);

  useEffect(() => {
    setDeviceDraft(savedDeviceId);
    setDeviceFeedback('');
  }, [savedDeviceId, user?.id]);

  const sensorSets = useAppStore((state) => state.sensorSets) || DEFAULT_SENSOR_SETS;
  const activeSensorSetId = useAppStore((state) => state.activeSensorSetId) || 'set-main';
  const setActiveSensorSetId = useAppStore((state) => state.setActiveSensorSetId);
  const saveSensorSet = useAppStore((state) => state.saveSensorSet);
  const deleteSensorSet = useAppStore((state) => state.deleteSensorSet);

  const [setModalVisible, setSetModalVisible] = useState(false);
  const [editingSet, setEditingSet] = useState(null);
  const [setNameDraft, setSetNameDraft] = useState('');
  const [setZoneDraft, setSetZoneDraft] = useState('');
  const [setCropDraft, setSetCropDraft] = useState('');
  const [setDeviceDraftVal, setSetDeviceDraftVal] = useState('');
  const [tempMinDraft, setTempMinDraft] = useState('20.0');
  const [tempMaxDraft, setTempMaxDraft] = useState('26.0');
  const [humMinDraft, setHumMinDraft] = useState('55.0');
  const [humMaxDraft, setHumMaxDraft] = useState('70.0');
  const [phMinDraft, setPhMinDraft] = useState('5.6');
  const [phMaxDraft, setPhMaxDraft] = useState('6.4');
  const [ecMinDraft, setEcMinDraft] = useState('1.2');
  const [ecMaxDraft, setEcMaxDraft] = useState('1.8');

  const handleOpenAddSet = () => {
    setEditingSet(null);
    setSetNameDraft('');
    setSetZoneDraft('Zone ' + String.fromCharCode(65 + (sensorSets?.length || 0)));
    setSetCropDraft('Leafy Greens');
    setSetDeviceDraftVal(`esp32-farm-0${(sensorSets?.length || 0) + 1}`);
    setTempMinDraft('20.0');
    setTempMaxDraft('26.0');
    setHumMinDraft('55.0');
    setHumMaxDraft('70.0');
    setPhMinDraft('5.6');
    setPhMaxDraft('6.4');
    setEcMinDraft('1.2');
    setEcMaxDraft('1.8');
    setSetModalVisible(true);
  };

  const handleOpenEditSet = (sSet) => {
    setEditingSet(sSet);
    setSetNameDraft(sSet.name || '');
    setSetZoneDraft(sSet.zone || '');
    setSetCropDraft(sSet.crop || '');
    setSetDeviceDraftVal(sSet.deviceId || '');
    setTempMinDraft(String(sSet.thresholds?.temperature?.min ?? 20));
    setTempMaxDraft(String(sSet.thresholds?.temperature?.max ?? 26));
    setHumMinDraft(String(sSet.thresholds?.humidity?.min ?? 55));
    setHumMaxDraft(String(sSet.thresholds?.humidity?.max ?? 70));
    setPhMinDraft(String(sSet.thresholds?.ph?.min ?? 5.6));
    setPhMaxDraft(String(sSet.thresholds?.ph?.max ?? 6.4));
    setEcMinDraft(String(sSet.thresholds?.ec?.min ?? 1.2));
    setEcMaxDraft(String(sSet.thresholds?.ec?.max ?? 1.8));
    setSetModalVisible(true);
  };

  const handleSaveSensorSetModal = async () => {
    if (!setNameDraft.trim()) {
      Alert.alert('Validation Error', 'Set name is required.');
      return;
    }

    const setId = editingSet ? editingSet.id : `set-${Date.now()}`;
    const newSet = {
      id: setId,
      name: setNameDraft.trim(),
      zone: setZoneDraft.trim() || 'General Zone',
      crop: setCropDraft.trim() || 'Crops',
      deviceId: setDeviceDraftVal.trim() || `esp32-${setId}`,
      isPrimary: editingSet ? editingSet.isPrimary : false,
      thresholds: {
        ...(editingSet?.thresholds || {}),
        temperature: { min: parseFloat(tempMinDraft) || 20, max: parseFloat(tempMaxDraft) || 26 },
        humidity: { min: parseFloat(humMinDraft) || 55, max: parseFloat(humMaxDraft) || 70 },
        ph: { min: parseFloat(phMinDraft) || 5.6, max: parseFloat(phMaxDraft) || 6.4 },
        ec: { min: parseFloat(ecMinDraft) || 1.2, max: parseFloat(ecMaxDraft) || 1.8 },
      },
      calibrationOffsets: editingSet?.calibrationOffsets || {
        temperature: parseFloat((Math.random() * 2 - 1).toFixed(2)),
        humidity: Math.round(Math.random() * 8 - 4),
        ph: parseFloat((Math.random() * 0.4 - 0.2).toFixed(2)),
        ec: parseFloat((Math.random() * 0.3 - 0.15).toFixed(2)),
      },
    };

    try {
      await saveSensorSet(newSet);
      setSetModalVisible(false);
      Alert.alert('Saved', `Sensor set "${newSet.name}" updated successfully.`);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save sensor set.');
    }
  };

  const handleDeleteSetConfirm = (sSet) => {
    Alert.alert(
      'Delete Sensor Set',
      `Are you sure you want to delete "${sSet.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSensorSet(sSet.id);
            } catch (e) {
              Alert.alert('Delete Failed', e.message || 'Could not delete set.');
            }
          },
        },
      ]
    );
  };

  const sensorData = useAppStore((state) => state.sensorData);
  const adminSelectedFarmerId = useAppStore((state) => state.adminSelectedFarmerId);
  const setAdminSelectedFarmerId = useAppStore((state) => state.setAdminSelectedFarmerId);
  const adminSelectedCustomerId = useAppStore((state) => state.adminSelectedCustomerId);
  const setAdminSelectedCustomerId = useAppStore((state) => state.setAdminSelectedCustomerId);

  const { users: allUsers } = useAdminUsers();
  const farmersList = useMemo(() => {
    const raw = allUsers.filter((u) => u.role === 'farmer');
    const unique = [];
    const seen = new Set();
    for (const u of raw) {
      const key = u.email || u.id;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(u);
      }
    }
    return unique;
  }, [allUsers]);

  const customersList = useMemo(() => {
    const raw = allUsers.filter((u) => u.role === 'customer');
    const unique = [];
    const seen = new Set();
    for (const u of raw) {
      const key = u.email || u.id;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(u);
      }
    }
    return unique;
  }, [allUsers]);

  const [showAdminFarmerModal, setShowAdminFarmerModal] = useState(false);
  const [showAdminCustomerModal, setShowAdminCustomerModal] = useState(false);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeletingOther, setIsDeletingOther] = useState(false);

  const handleDeleteAccount = async () => {
    alert('Account deletion requires support to reconcile orders and remove the account securely.');
    setShowDeleteAccountModal(false);
  };

  const handleDeleteOtherUser = async () => {
    alert('Account deletion requires the authenticated account administration service.');
    setUserToDelete(null);
  };

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    farm_name: user?.farm_name || '',
    farm_location: user?.farm_location || '',
    farm_size: user?.farm_size || '',
    crops: user?.crops || '',
    experience: user?.experience || '',
    upi_id: user?.upi_id || '',
    address: user?.address || '',
    city: user?.city || '',
    state: user?.state || '',
    pincode: user?.pincode || '',
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [permissions, setPermissions] = useState({
    camera: false,
    storage: false,
    notifications: false,
  });

  useEffect(() => {
    let active = true;
    const checkAll = async () => {
      const status = await permissionManager.checkPermissions();
      if (active) {
        setPermissions(status);
      }
    };
    checkAll();
    return () => {
      active = false;
    };
  }, []);

  const requestCameraPermission = async () => {
    const success = await permissionManager.requestCamera();
    setPermissions((prev) => ({ ...prev, camera: success }));
  };

  const requestStoragePermission = async () => {
    const success = await permissionManager.requestStorage();
    setPermissions((prev) => ({ ...prev, storage: success }));
  };

  const requestNotificationPermission = async () => {
    const success = await permissionManager.requestNotifications();
    setPermissions((prev) => ({ ...prev, notifications: success }));
  };

  const requestAllPermissions = async () => {
    const status = await permissionManager.requestAll();
    setPermissions(status);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigateWithTransition('/home', 'Home', 'section', true);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setShowLogoutModal(false);
      setIsLoggingOut(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await updateProfile(editForm);
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleEditProfileOpen = () => {
    setEditForm({
      name: user?.name || '',
      phone: user?.phone || '',
      farm_name: user?.farm_name || '',
      farm_location: user?.farm_location || '',
      farm_size: user?.farm_size || '',
      crops: user?.crops || '',
      experience: user?.experience || '',
      upi_id: user?.upi_id || '',
      address: user?.address || '',
      city: user?.city || '',
      state: user?.state || '',
      pincode: user?.pincode || '',
    });
    setIsEditingProfile(true);
  };

  const handleChangePassword = async () => {
    if (!auth.currentUser || newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    setIsChangingPassword(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      alert('Password updated successfully!');
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Failed to change password. Please verify your credentials.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const isCustomer = user?.role === 'customer';
  const isFarmer = user?.role === 'farmer';
  const isAdmin = user?.role === 'admin';

  const roleLabel = isAdmin ? 'Administrator' : isFarmer ? 'Verified Farmer' : 'Market Customer';
  const RoleIcon = isAdmin ? ShieldCheck : isFarmer ? Tractor : ShoppingBag;

  return (
    <PageScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <SagePageHero
        eyebrow="System & hardware preferences"
        title="System"
        titleAccent="& Settings"
        subtitle="Manage device connections, account details, security, and your HyGrow experience."
        actionLabel="Edit profile"
        actionIcon={<User color="#0E4F3B" size={21} />}
        onAction={handleEditProfileOpen}
        scene="settings"
        tickerItems={['Devices', 'Profile', 'Notifications', 'Security']}
        chips={[roleLabel, themeColors.isDarkMode ? 'Dark appearance' : 'Light appearance', 'Preferences synced']}
      />

      <SageFeatureCards cards={[
        { tag: 'Account profile', title: 'Personal details', description: 'Update your account name, farm details, and contact information.', graphic: 'settings', onPress: handleEditProfileOpen },
        { tag: 'Account security', title: 'Password & access', description: 'Change your password and review account access controls.', graphic: 'telemetry', onPress: () => setShowPasswordModal(true) },
      ]} />

      {/* Hardware Configuration Section (Farmer / Admin) */}
      {!isCustomer && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleBlock}>
              <Cpu size={16} color={themeColors.primary} />
              <Text style={styles.sectionTitle}>IoT Hardware & Device ID</Text>
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardExplainer}>
              Enter the unique Device ID configured in your ESP32 firmware. Readings published by this node will be routed to your live dashboard.
            </Text>

            <View style={styles.deviceInputRow}>
              <TextInput
                accessibilityLabel="Device ID"
                style={styles.deviceIdInput}
                value={deviceDraft}
                onChangeText={(val) => {
                  setDeviceDraft(val);
                  setDeviceFeedback('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!savingDevice}
                placeholder="ESP32S3_001"
                placeholderTextColor={themeColors.textMuted}
              />
              <PressableScale
                style={styles.saveDeviceBtn}
                onPress={async () => {
                  setSavingDevice(true);
                  try {
                    await setDeviceId(deviceDraft);
                    setDeviceFeedback('Device ID saved. Telemetry stream connected.');
                  } catch (error) {
                    setDeviceFeedback(error.message);
                  } finally {
                    setSavingDevice(false);
                  }
                }}
                disabled={savingDevice}
              >
                {savingDevice ? (
                  <ActivityIndicator size="small" color={themeColors.actionText} />
                ) : (
                  <Text style={styles.saveDeviceBtnText}>Save</Text>
                )}
              </PressableScale>
            </View>

            {Boolean(deviceFeedback) && (
              <View
                style={[
                  styles.feedbackBanner,
                  deviceFeedback.includes('error') ? styles.feedbackError : styles.feedbackSuccess,
                ]}
              >
                <CheckCircle2
                  size={14}
                  color={deviceFeedback.includes('error') ? themeColors.danger : themeColors.success}
                />
                <Text
                  style={[
                    styles.feedbackText,
                    {
                      color: deviceFeedback.includes('error')
                        ? themeColors.danger
                        : themeColors.success,
                    },
                  ]}
                >
                  {deviceFeedback}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Sensor Sets & Zone Configuration Section (Farmer / Admin) */}
      {!isCustomer && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleBlock}>
              <Radio size={16} color={themeColors.primary} />
              <Text style={styles.sectionTitle}>Sensor Sets & Hardware Zones</Text>
            </View>
            <PressableScale
              style={styles.addSetActionPill}
              onPress={handleOpenAddSet}
            >
              <Plus size={13} color={themeColors.primary} />
              <Text style={styles.addSetActionText}>Add Sensor Set</Text>
            </PressableScale>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardExplainer}>
              Configure and track multiple sensor arrays across your hydroponic facility. You can switch between these sets on your Dashboard, and alerts are calculated based on each set's custom thresholds.
            </Text>

            <View style={styles.sensorSetsList}>
              {sensorSets.map((sSet) => {
                const isActive = sSet.id === activeSensorSetId;
                return (
                  <View
                    key={sSet.id}
                    style={[
                      styles.setRowCard,
                      isActive && styles.setRowCardActive,
                    ]}
                  >
                    <View style={styles.setRowLeft}>
                      <View style={styles.setRowHeader}>
                        <Text style={styles.setRowTitle}>{sSet.name}</Text>
                        {isActive ? (
                          <View style={styles.activeSetBadge}>
                            <Text style={styles.activeSetBadgeText}>ACTIVE ON DASH</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.setRowSub}>
                        {sSet.zone} • {sSet.crop} • Device: {sSet.deviceId || 'Virtual Node'}
                      </Text>

                      <View style={styles.thresholdChipsRow}>
                        <Text style={styles.thresholdChip}>
                          🌡️ {sSet.thresholds?.temperature?.min ?? 20}-{sSet.thresholds?.temperature?.max ?? 26}°C
                        </Text>
                        <Text style={styles.thresholdChip}>
                          💧 {sSet.thresholds?.humidity?.min ?? 55}-{sSet.thresholds?.humidity?.max ?? 70}%
                        </Text>
                        <Text style={styles.thresholdChip}>
                          🧪 pH {sSet.thresholds?.ph?.min ?? 5.6}-{sSet.thresholds?.ph?.max ?? 6.4}
                        </Text>
                        <Text style={styles.thresholdChip}>
                          ⚡ EC {sSet.thresholds?.ec?.min ?? 1.2}-{sSet.thresholds?.ec?.max ?? 1.8} mS
                        </Text>
                      </View>
                    </View>

                    <View style={styles.setRowActions}>
                      {!isActive ? (
                        <PressableScale
                          style={styles.makeActiveBtn}
                          onPress={() => setActiveSensorSetId(sSet.id)}
                        >
                          <Text style={styles.makeActiveBtnText}>Set Active</Text>
                        </PressableScale>
                      ) : null}

                      <PressableScale
                        style={styles.editSetBtn}
                        onPress={() => handleOpenEditSet(sSet)}
                      >
                        <Edit3 size={13} color={themeColors.primary} />
                        <Text style={styles.editSetBtnText}>Edit</Text>
                      </PressableScale>

                      {sensorSets.length > 1 ? (
                        <PressableScale
                          style={styles.deleteSetBtn}
                          onPress={() => handleDeleteSetConfirm(sSet)}
                        >
                          <Trash2 size={13} color="#EF4444" />
                        </PressableScale>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Account Profile Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleBlock}>
            <User size={16} color={themeColors.primary} />
            <Text style={styles.sectionTitle}>Account Profile</Text>
          </View>
          <PressableScale style={styles.editActionPill} onPress={handleEditProfileOpen}>
            <Edit3 size={13} color={themeColors.primary} />
            <Text style={styles.editActionText}>Edit</Text>
          </PressableScale>
        </View>

        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{user?.name || 'Verified User'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <View style={styles.roleBadge}>
                <RoleIcon size={12} color={themeColors.primary} />
                <Text style={styles.roleBadgeText}>{roleLabel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Account ID</Text>
              <Text style={styles.metaValue}>
                #{user?.id ? user.id.substring(0, 8).toUpperCase() : 'ANON'}
              </Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Member Since</Text>
              <Text style={styles.metaValue}>
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <PressableScale
            style={styles.changePasswordRow}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={styles.changePasswordLeft}>
              <KeyRound size={15} color={themeColors.textSecondary} />
              <Text style={styles.changePasswordText}>Change Security Password</Text>
            </View>
            <ChevronRight size={15} color={themeColors.textMuted} />
          </PressableScale>
        </View>
      </View>

      {/* Farm Details (Farmer Only) */}
      {isFarmer && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agricultural Facility</Text>
          <View style={styles.card}>
            {user?.farm_name ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Facility Name</Text>
                <Text style={styles.infoValue}>{user.farm_name}</Text>
              </View>
            ) : null}
            {user?.farm_location ? (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>{user.farm_location}</Text>
                </View>
              </>
            ) : null}
            {user?.farm_size ? (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Cultivation Area</Text>
                  <Text style={styles.infoValue}>{user.farm_size} Acres</Text>
                </View>
              </>
            ) : null}
            {user?.crops ? (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Primary Yield</Text>
                  <Text style={styles.infoValue}>{user.crops}</Text>
                </View>
              </>
            ) : null}
            {user?.phone ? (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Contact Line</Text>
                  <Text style={styles.infoValue}>{user.phone}</Text>
                </View>
              </>
            ) : null}
          </View>
        </View>
      )}

      {/* App Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences & Navigation</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLabelGroup}>
              <Bell size={16} color={themeColors.primary} />
              <Text style={styles.settingLabel}>Telemetry Notifications</Text>
            </View>
            <Switch
              value={permissions.notifications}
              onValueChange={requestNotificationPermission}
              trackColor={{ false: themeColors.surfaceLight, true: themeColors.primary + '60' }}
              thumbColor={permissions.notifications ? themeColors.primary : themeColors.textMuted}
            />
          </View>

          <View style={styles.divider} />

          {(isFarmer || isAdmin) && (
            <>
              <PressableScale
                style={styles.navRow}
                onPress={() => navigateWithTransition('/customization', 'Customization', 'section')}
              >
                <View style={styles.settingLabelGroup}>
                  <Sparkles size={16} color={themeColors.primary} />
                  <Text style={styles.settingLabel}>Feature Customization</Text>
                </View>
                <ChevronRight size={16} color={themeColors.textMuted} />
              </PressableScale>
              <View style={styles.divider} />
            </>
          )}

          <PressableScale style={styles.navRow} onPress={() => navigateWithTransition('/home', 'Home', 'section')}>
            <View style={styles.settingLabelGroup}>
              <ExternalLink size={16} color={themeColors.textSecondary} />
              <Text style={styles.settingLabel}>HyGrow Landing Portal</Text>
            </View>
            <ChevronRight size={16} color={themeColors.textMuted} />
          </PressableScale>

          <View style={styles.divider} />

          <PressableScale
            style={styles.navRow}
            onPress={() => navigateWithTransition('/contact-team', 'Contact team', 'section')}
          >
            <View style={styles.settingLabelGroup}>
              <LifeBuoy size={16} color={themeColors.textSecondary} />
              <Text style={styles.settingLabel}>Agronomist Support & Contact</Text>
            </View>
            <ChevronRight size={16} color={themeColors.textMuted} />
          </PressableScale>
        </View>
      </View>

      {/* Farmer Permissions */}
      {isFarmer && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mobile Hardware Permissions</Text>
          <View style={styles.card}>
            <View style={styles.permissionRow}>
              <View style={styles.permissionInfo}>
                <View style={styles.permissionTitleRow}>
                  <Camera size={14} color={themeColors.text} />
                  <Text style={styles.permissionTitle}>Camera Diagnostic Access</Text>
                </View>
                <Text style={styles.permissionDesc}>
                  Used for leaf disease identification via Vision AI.
                </Text>
              </View>
              <PressableScale
                style={[
                  styles.grantBtn,
                  permissions.camera && styles.grantBtnSuccess,
                ]}
                onPress={requestCameraPermission}
                disabled={permissions.camera}
              >
                <Text
                  style={[
                    styles.grantBtnText,
                    permissions.camera && styles.grantBtnTextSuccess,
                  ]}
                >
                  {permissions.camera ? 'Granted ✓' : 'Grant'}
                </Text>
              </PressableScale>
            </View>

            <View style={styles.divider} />

            <View style={styles.permissionRow}>
              <View style={styles.permissionInfo}>
                <View style={styles.permissionTitleRow}>
                  <HardDrive size={14} color={themeColors.text} />
                  <Text style={styles.permissionTitle}>Device Storage</Text>
                </View>
                <Text style={styles.permissionDesc}>
                  Used to cache observation logs and export PDF yield reports.
                </Text>
              </View>
              <PressableScale
                style={[
                  styles.grantBtn,
                  permissions.storage && styles.grantBtnSuccess,
                ]}
                onPress={requestStoragePermission}
                disabled={permissions.storage}
              >
                <Text
                  style={[
                    styles.grantBtnText,
                    permissions.storage && styles.grantBtnTextSuccess,
                  ]}
                >
                  {permissions.storage ? 'Granted ✓' : 'Grant'}
                </Text>
              </PressableScale>
            </View>

            <View style={styles.divider} />

            <View style={styles.permissionRow}>
              <View style={styles.permissionInfo}>
                <View style={styles.permissionTitleRow}>
                  <BellRing size={14} color={themeColors.text} />
                  <Text style={styles.permissionTitle}>Critical Sensor Alerts</Text>
                </View>
                <Text style={styles.permissionDesc}>
                  Push notifications when water pH or temperature breaks envelope.
                </Text>
              </View>
              <PressableScale
                style={[
                  styles.grantBtn,
                  permissions.notifications && styles.grantBtnSuccess,
                ]}
                onPress={requestNotificationPermission}
                disabled={permissions.notifications}
              >
                <Text
                  style={[
                    styles.grantBtnText,
                    permissions.notifications && styles.grantBtnTextSuccess,
                  ]}
                >
                  {permissions.notifications ? 'Granted ✓' : 'Grant'}
                </Text>
              </PressableScale>
            </View>
          </View>
        </View>
      )}

      {/* Admin Global Filters */}
      {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Global Data Partitioning (Admin)</Text>
          <View style={styles.card}>
            <View style={styles.adminFilterRow}>
              <Text style={styles.infoLabel}>Farmer Filter</Text>
              <PressableScale
                style={styles.adminFilterBtn}
                onPress={() => setShowAdminFarmerModal(true)}
              >
                <Filter size={12} color={themeColors.textSecondary} />
                <Text style={styles.adminFilterBtnText} numberOfLines={1}>
                  {adminSelectedFarmerId
                    ? farmersList.find((f) => f.id === adminSelectedFarmerId)?.farm_name ||
                      farmersList.find((f) => f.id === adminSelectedFarmerId)?.name ||
                      'Selected Farmer'
                    : 'All Farmers'}
                </Text>
                <ChevronRight size={12} color={themeColors.textMuted} />
              </PressableScale>
            </View>

            <View style={styles.divider} />

            <View style={styles.adminFilterRow}>
              <Text style={styles.infoLabel}>Customer Filter</Text>
              <PressableScale
                style={styles.adminFilterBtn}
                onPress={() => setShowAdminCustomerModal(true)}
              >
                <Filter size={12} color={themeColors.textSecondary} />
                <Text style={styles.adminFilterBtnText} numberOfLines={1}>
                  {adminSelectedCustomerId
                    ? customersList.find((c) => c.id === adminSelectedCustomerId)?.name ||
                      'Selected Customer'
                    : 'All Customers'}
                </Text>
                <ChevronRight size={12} color={themeColors.textMuted} />
              </PressableScale>
            </View>
          </View>
        </View>
      )}

      {/* Session Actions */}
      <View style={styles.actionsSection}>
        <PressableScale
          style={styles.signOutBtn}
          onPress={() => setShowLogoutModal(true)}
        >
          <LogOut size={16} color={themeColors.danger} />
          <Text style={styles.signOutText}>Sign Out of Session</Text>
        </PressableScale>

        <PressableScale
          style={styles.deleteAccountBtn}
          onPress={() => setShowDeleteAccountModal(true)}
        >
          <Trash2 size={14} color={themeColors.textMuted} />
          <Text style={styles.deleteAccountText}>Delete Account Data</Text>
        </PressableScale>
      </View>

      <Text style={styles.versionText}>HyGrow Enterprise SaaS · v2.1.0-release</Text>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to sign out of your active HyGrow session?
            </Text>
            <View style={styles.modalActions}>
              <PressableScale
                style={styles.modalBtnCancel}
                onPress={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </PressableScale>
              <PressableScale
                style={styles.modalBtnConfirm}
                onPress={handleConfirmLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color={themeColors.adapt('#FFFFFF', themeColors.text)} />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>Sign Out</Text>
                )}
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteAccountModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteAccountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: themeColors.danger }]}>Delete Account</Text>
            <Text style={styles.modalMessage}>
              This will permanently delete your account, saved devices, and all historical data. This action is irreversible.
            </Text>
            <View style={styles.modalActions}>
              <PressableScale
                style={styles.modalBtnCancel}
                onPress={() => setShowDeleteAccountModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </PressableScale>
              <PressableScale
                style={[styles.modalBtnConfirm, { backgroundColor: themeColors.danger }]}
                onPress={handleDeleteAccount}
              >
                <Text style={styles.modalBtnConfirmText}>Confirm Deletion</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Password</Text>
            <Text style={styles.modalMessage}>
              Enter a new secure password for your HyGrow credentials.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Minimum 6 characters"
              placeholderTextColor={themeColors.textMuted}
            />
            <View style={styles.modalActions}>
              <PressableScale
                style={styles.modalBtnCancel}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </PressableScale>
              <PressableScale
                style={[styles.modalBtnConfirm, { backgroundColor: themeColors.action }]}
                onPress={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <ActivityIndicator size="small" color={themeColors.adapt('#FFFFFF', themeColors.text)} />
                ) : (
                  <Text style={[styles.modalBtnConfirmText, { color: themeColors.actionText }]}>Save Password</Text>
                )}
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditingProfile}
        transparent
        animationType="fade"
        onRequestClose={() => !isSavingProfile && setIsEditingProfile(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.editProfileModal]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Edit Profile Information</Text>
              <PressableScale
                onPress={() => !isSavingProfile && setIsEditingProfile(false)}
                style={styles.closeBtn}
              >
                <X size={16} color={themeColors.textSecondary} />
              </PressableScale>
            </View>

            <ScrollView style={styles.editFormScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.formSectionTitle}>Personal Details</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editForm.name}
                  onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Phone</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editForm.phone}
                  onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                  keyboardType="phone-pad"
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>

              {isFarmer && (
                <>
                  <Text style={[styles.formSectionTitle, { marginTop: spacing.md }]}>
                    Agricultural Details
                  </Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Facility / Farm Name</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editForm.farm_name}
                      onChangeText={(text) => setEditForm({ ...editForm, farm_name: text })}
                      placeholderTextColor={themeColors.textMuted}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Location</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editForm.farm_location}
                      onChangeText={(text) => setEditForm({ ...editForm, farm_location: text })}
                      placeholderTextColor={themeColors.textMuted}
                    />
                  </View>
                  <View style={styles.rowInputs}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                      <Text style={styles.inputLabel}>Size (Acres)</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={editForm.farm_size}
                        onChangeText={(text) => setEditForm({ ...editForm, farm_size: text })}
                        keyboardType="numeric"
                        placeholderTextColor={themeColors.textMuted}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Experience (Yrs)</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={editForm.experience}
                        onChangeText={(text) => setEditForm({ ...editForm, experience: text })}
                        keyboardType="numeric"
                        placeholderTextColor={themeColors.textMuted}
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Specialized Crops</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editForm.crops}
                      onChangeText={(text) => setEditForm({ ...editForm, crops: text })}
                      placeholder="e.g. Tomatoes, Lettuce, Basil"
                      placeholderTextColor={themeColors.textMuted}
                    />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <PressableScale
                style={styles.modalBtnCancel}
                onPress={() => setIsEditingProfile(false)}
                disabled={isSavingProfile}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </PressableScale>
              <PressableScale
                style={[styles.modalBtnConfirm, { backgroundColor: themeColors.action }]}
                onPress={handleSaveProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <ActivityIndicator color={themeColors.adapt('#FFFFFF', themeColors.text)} size="small" />
                ) : (
                  <Text style={[styles.modalBtnConfirmText, { color: themeColors.actionText }]}>Save Changes</Text>
                )}
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      {/* Admin Farmer Modal */}
      <Modal
        visible={showAdminFarmerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAdminFarmerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Farmer Scope</Text>
              <PressableScale onPress={() => setShowAdminFarmerModal(false)}>
                <Text style={styles.modalCloseText}>Done</Text>
              </PressableScale>
            </View>
            <ScrollView style={styles.modalScroll}>
              <PressableScale
                style={[styles.modalItem, !adminSelectedFarmerId && styles.modalItemActive]}
                onPress={() => {
                  setAdminSelectedFarmerId(null);
                  setShowAdminFarmerModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    !adminSelectedFarmerId && styles.modalItemTextActive,
                  ]}
                >
                  All Farmers (Global)
                </Text>
              </PressableScale>
              {farmersList.map((farmer) => (
                <PressableScale
                  key={farmer.id}
                  style={[
                    styles.modalItem,
                    adminSelectedFarmerId === farmer.id && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setAdminSelectedFarmerId(farmer.id);
                    setShowAdminFarmerModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      adminSelectedFarmerId === farmer.id && styles.modalItemTextActive,
                    ]}
                  >
                    {farmer.farm_name || farmer.name} ({farmer.email || 'No email'})
                  </Text>
                </PressableScale>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Admin Customer Modal */}
      <Modal
        visible={showAdminCustomerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAdminCustomerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Customer Scope</Text>
              <PressableScale onPress={() => setShowAdminCustomerModal(false)}>
                <Text style={styles.modalCloseText}>Done</Text>
              </PressableScale>
            </View>
            <ScrollView style={styles.modalScroll}>
              <PressableScale
                style={[styles.modalItem, !adminSelectedCustomerId && styles.modalItemActive]}
                onPress={() => {
                  setAdminSelectedCustomerId(null);
                  setShowAdminCustomerModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    !adminSelectedCustomerId && styles.modalItemTextActive,
                  ]}
                >
                  All Customers (Global)
                </Text>
              </PressableScale>
              {customersList.map((customer) => (
                <PressableScale
                  key={customer.id}
                  style={[
                    styles.modalItem,
                    adminSelectedCustomerId === customer.id && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setAdminSelectedCustomerId(customer.id);
                    setShowAdminCustomerModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      adminSelectedCustomerId === customer.id && styles.modalItemTextActive,
                    ]}
                  >
                    {customer.name} ({customer.email || 'No email'})
                  </Text>
                </PressableScale>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sensor Set Edit / Add Modal */}
      <Modal
        visible={setModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.editProfileModal, { maxWidth: 500, maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {editingSet ? 'Adjust Sensor Set & Limits' : 'Add New Sensor Set'}
              </Text>
              <PressableScale
                onPress={() => setSetModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={16} color={themeColors.textSecondary} />
              </PressableScale>
            </View>

            <ScrollView style={styles.editFormScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.formSectionTitle}>Array Identification</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Set Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. NFT Bay 2 or Vertical Tower"
                  placeholderTextColor={themeColors.textMuted}
                  value={setNameDraft}
                  onChangeText={setSetNameDraft}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Zone / Facility Location *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Zone B (North Bay)"
                  placeholderTextColor={themeColors.textMuted}
                  value={setZoneDraft}
                  onChangeText={setSetZoneDraft}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Target Crop *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Genovese Basil or Strawberries"
                  placeholderTextColor={themeColors.textMuted}
                  value={setCropDraft}
                  onChangeText={setSetCropDraft}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hardware Node ID (Optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. esp32-farm-04"
                  placeholderTextColor={themeColors.textMuted}
                  value={setDeviceDraftVal}
                  onChangeText={setSetDeviceDraftVal}
                  autoCapitalize="none"
                />
              </View>

              <Text style={[styles.formSectionTitle, { marginTop: spacing.md }]}>
                Alert Thresholds (Min / Max Limits)
              </Text>
              <Text style={styles.thresholdDesc}>
                Alerts are triggered on your Dashboard when readings deviate outside these ranges.
              </Text>

              <View style={styles.thresholdMatrix}>
                <View style={styles.thresholdMatrixCard}>
                  <Text style={styles.thresholdMatrixLabel}>Air Temperature (°C)</Text>
                  <View style={styles.matrixInputRow}>
                    <TextInput
                      style={styles.matrixInput}
                      value={tempMinDraft}
                      onChangeText={setTempMinDraft}
                      keyboardType="numeric"
                      placeholder="Min"
                      placeholderTextColor={themeColors.textMuted}
                    />
                    <Text style={styles.matrixDash}>to</Text>
                    <TextInput
                      style={styles.matrixInput}
                      value={tempMaxDraft}
                      onChangeText={setTempMaxDraft}
                      keyboardType="numeric"
                      placeholder="Max"
                      placeholderTextColor={themeColors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.thresholdMatrixCard}>
                  <Text style={styles.thresholdMatrixLabel}>Relative Humidity (%)</Text>
                  <View style={styles.matrixInputRow}>
                    <TextInput
                      style={styles.matrixInput}
                      value={humMinDraft}
                      onChangeText={setHumMinDraft}
                      keyboardType="numeric"
                      placeholder="Min"
                      placeholderTextColor={themeColors.textMuted}
                    />
                    <Text style={styles.matrixDash}>to</Text>
                    <TextInput
                      style={styles.matrixInput}
                      value={humMaxDraft}
                      onChangeText={setHumMaxDraft}
                      keyboardType="numeric"
                      placeholder="Max"
                      placeholderTextColor={themeColors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.thresholdMatrixCard}>
                  <Text style={styles.thresholdMatrixLabel}>Nutrient pH</Text>
                  <View style={styles.matrixInputRow}>
                    <TextInput
                      style={styles.matrixInput}
                      value={phMinDraft}
                      onChangeText={setPhMinDraft}
                      keyboardType="numeric"
                      placeholder="Min"
                      placeholderTextColor={themeColors.textMuted}
                    />
                    <Text style={styles.matrixDash}>to</Text>
                    <TextInput
                      style={styles.matrixInput}
                      value={phMaxDraft}
                      onChangeText={setPhMaxDraft}
                      keyboardType="numeric"
                      placeholder="Max"
                      placeholderTextColor={themeColors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.thresholdMatrixCard}>
                  <Text style={styles.thresholdMatrixLabel}>Electroconductivity (mS)</Text>
                  <View style={styles.matrixInputRow}>
                    <TextInput
                      style={styles.matrixInput}
                      value={ecMinDraft}
                      onChangeText={setEcMinDraft}
                      keyboardType="numeric"
                      placeholder="Min"
                      placeholderTextColor={themeColors.textMuted}
                    />
                    <Text style={styles.matrixDash}>to</Text>
                    <TextInput
                      style={styles.matrixInput}
                      value={ecMaxDraft}
                      onChangeText={setEcMaxDraft}
                      keyboardType="numeric"
                      placeholder="Max"
                      placeholderTextColor={themeColors.textMuted}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <PressableScale
                style={styles.modalBtnCancel}
                onPress={() => setSetModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </PressableScale>
              <PressableScale
                style={[styles.modalBtnConfirm, { backgroundColor: themeColors.action }]}
                onPress={handleSaveSensorSetModal}
              >
                <Text style={[styles.modalBtnConfirmText, { color: themeColors.actionText }]}>
                  Save Sensor Set
                </Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    </PageScrollView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    contentContainer: {
      padding: spacing.lg,
      paddingTop: 56,
      paddingBottom: 56,
      width: '100%',
      maxWidth: 1200,
      alignSelf: 'center',
    },
    header: {
      marginBottom: spacing.xl,
    },
    headerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.adapt('rgba(16, 185, 129, 0.12)', theme.primaryGlow),
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: theme.adapt('rgba(16, 185, 129, 0.25)', theme.border),
      alignSelf: 'flex-start',
      marginBottom: 8,
    },
    headerBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: theme.adapt('#34D399', theme.primaryLight),
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.adapt('#F8FAF8', theme.text),
      letterSpacing: -0.8,
    },
    subtitle: {
      fontSize: 15,
      color: theme.adapt('#9CB0A2', theme.textSecondary),
      marginTop: 4,
      lineHeight: 20,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    sectionTitleBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      color: theme.textSecondary,
    },
    editActionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.adapt('rgba(16, 185, 129, 0.12)', theme.primaryGlow),
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: theme.adapt('rgba(16, 185, 129, 0.25)', theme.border),
    },
    editActionText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },
    addSetActionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.adapt('rgba(16, 185, 129, 0.12)', 'rgba(14, 79, 59, 0.1)'),
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: theme.adapt('rgba(16, 185, 129, 0.25)', theme.border),
    },
    addSetActionText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.primary,
    },
    sensorSetsList: {
      gap: 12,
      marginTop: 10,
    },
    setRowCard: {
      padding: 14,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.surfaceLight,
      borderWidth: 1.5,
      borderColor: theme.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
    },
    setRowCardActive: {
      borderColor: theme.primary,
      backgroundColor: theme.adapt('rgba(16, 185, 129, 0.08)', 'rgba(14, 79, 59, 0.04)'),
    },
    setRowLeft: {
      flex: 1,
      minWidth: 220,
      gap: 4,
    },
    setRowHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    setRowTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    activeSetBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
      backgroundColor: theme.primary,
    },
    activeSetBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    setRowSub: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    thresholdChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
    thresholdChip: {
      fontSize: 12,
      color: theme.textSecondary,
      backgroundColor: theme.surface,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    setRowActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    makeActiveBtn: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: borderRadius.md,
      backgroundColor: theme.adapt('rgba(16, 185, 129, 0.15)', 'rgba(14, 79, 59, 0.1)'),
      borderWidth: 1,
      borderColor: theme.adapt('rgba(16, 185, 129, 0.3)', theme.border),
    },
    makeActiveBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.primary,
    },
    editSetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: borderRadius.md,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    editSetBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
    },
    deleteSetBtn: {
      padding: 7,
      borderRadius: borderRadius.md,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    thresholdDesc: {
      fontSize: 13,
      color: theme.textSecondary,
      marginBottom: 12,
      lineHeight: 17,
    },
    thresholdMatrix: {
      gap: 10,
    },
    thresholdMatrixCard: {
      backgroundColor: theme.surfaceLight,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      gap: 6,
    },
    thresholdMatrixLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    matrixInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    matrixInput: {
      flex: 1,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
      color: theme.text,
      fontSize: 14,
      textAlign: 'center',
    },
    matrixDash: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textMuted,
    },
    card: {
      backgroundColor: theme.adapt('#191C1E', theme.surface),
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: theme.adapt('rgba(52, 211, 153, 0.22)', theme.border),
      ...Platform.select({
        web: {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        },
      }),
    },
    cardExplainer: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      lineHeight: 18,
      marginBottom: spacing.md,
    },
    deviceInputRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    deviceIdInput: {
      flex: 1,
      backgroundColor: theme.surfaceLight,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    saveDeviceBtn: {
      backgroundColor: theme.action,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveDeviceBtnText: {
      color: theme.actionText,
      fontWeight: '700',
      fontSize: 15,
    },
    feedbackBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.sm,
      padding: spacing.sm,
      borderRadius: borderRadius.sm,
    },
    feedbackSuccess: {
      backgroundColor: theme.success + '15',
    },
    feedbackError: {
      backgroundColor: theme.danger + '15',
    },
    feedbackText: {
      fontSize: 13,
      fontWeight: '600',
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.primary + '30',
    },
    avatarText: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.primary,
    },
    profileInfo: {
      flex: 1,
    },
    userName: {
      ...typography.h3,
      color: theme.text,
      fontWeight: '700',
    },
    userEmail: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: 1,
    },
    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.primary + '12',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.full,
      alignSelf: 'flex-start',
      marginTop: 6,
    },
    roleBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    metaCol: {
      flex: 1,
    },
    metaLabel: {
      ...typography.caption,
      color: theme.textMuted,
      marginBottom: 2,
    },
    metaValue: {
      ...typography.bodySmall,
      color: theme.text,
      fontWeight: '600',
    },
    divider: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginVertical: spacing.md,
    },
    changePasswordRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    changePasswordLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    changePasswordText: {
      ...typography.bodySmall,
      color: theme.text,
      fontWeight: '600',
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    infoLabel: {
      ...typography.bodySmall,
      color: theme.textSecondary,
    },
    infoValue: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: theme.text,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    settingLabelGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    settingLabel: {
      ...typography.bodySmall,
      color: theme.text,
      fontWeight: '600',
    },
    navRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    permissionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
    },
    permissionInfo: {
      flex: 1,
    },
    permissionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2,
    },
    permissionTitle: {
      ...typography.bodySmall,
      fontWeight: '700',
      color: theme.text,
    },
    permissionDesc: {
      ...typography.caption,
      color: theme.textSecondary,
      lineHeight: 15,
    },
    grantBtn: {
      backgroundColor: theme.surfaceLight,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      minWidth: 74,
      alignItems: 'center',
    },
    grantBtnSuccess: {
      backgroundColor: theme.success + '15',
      borderColor: theme.success + '30',
    },
    grantBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.text,
    },
    grantBtnTextSuccess: {
      color: theme.success,
    },
    adminFilterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    adminFilterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.surfaceLight,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      maxWidth: 200,
    },
    adminFilterBtnText: {
      fontSize: 12,
      color: theme.text,
      fontWeight: '600',
      flex: 1,
    },
    actionsSection: {
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    signOutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.danger + '12',
      borderWidth: 1,
      borderColor: theme.danger + '30',
      paddingVertical: 14,
      borderRadius: borderRadius.lg,
    },
    signOutText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.danger,
    },
    deleteAccountBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
    },
    deleteAccountText: {
      fontSize: 13,
      color: theme.textMuted,
      fontWeight: '500',
    },
    versionText: {
      ...typography.caption,
      textAlign: 'center',
      color: theme.textMuted,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalContent: {
      backgroundColor: theme.cardBackground,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      width: '100%',
      maxWidth: 400,
      borderWidth: 1,
      borderColor: theme.border,
      ...Platform.select({
        web: {
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
        },
      }),
    },
    editProfileModal: {
      maxHeight: '85%',
    },
    modalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    modalTitle: {
      ...typography.h3,
      color: theme.text,
      fontWeight: '700',
    },
    closeBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalMessage: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      marginBottom: spacing.lg,
      lineHeight: 18,
    },
    modalInput: {
      backgroundColor: theme.surfaceLight,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      color: theme.text,
      fontSize: 15,
      marginBottom: spacing.lg,
    },
    modalActions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    modalBtnCancel: {
      flex: 1,
      backgroundColor: theme.surfaceLight,
      paddingVertical: 12,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    modalBtnCancelText: {
      ...typography.bodySmall,
      color: theme.text,
      fontWeight: '600',
    },
    modalBtnConfirm: {
      flex: 1,
      backgroundColor: theme.danger,
      paddingVertical: 12,
      borderRadius: borderRadius.md,
      alignItems: 'center',
    },
    modalBtnConfirmText: {
      ...typography.bodySmall,
      color: theme.adapt('#FFFFFF', theme.text),
      fontWeight: '700',
    },
    editFormScroll: {
      marginBottom: spacing.lg,
    },
    formSectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      color: theme.primary,
      marginBottom: spacing.sm,
    },
    inputGroup: {
      marginBottom: spacing.md,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 4,
    },
    rowInputs: {
      flexDirection: 'row',
    },
    modalCloseText: {
      color: theme.primary,
      fontWeight: '700',
      fontSize: 15,
    },
    modalScroll: {
      maxHeight: 280,
    },
    modalItem: {
      paddingVertical: 12,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: 4,
    },
    modalItemActive: {
      backgroundColor: theme.primary + '15',
    },
    modalItemText: {
      fontSize: 14,
      color: theme.text,
    },
    modalItemTextActive: {
      color: theme.primary,
      fontWeight: '700',
    },
  });
