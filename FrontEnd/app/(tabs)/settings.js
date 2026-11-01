import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors, spacing, borderRadius, typography, shadows } from '../../src/theme/theme';
import useAppStore from '../../src/store/useAppStore';
import useAuth from '../../src/hooks/useAuth';
import { formatDate, formatTime } from '../../src/utils/helpers';
import permissionManager from '../../src/services/permissionManager';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientText } from '../../src/components/GradientText';
import { PageScrollView } from '../../src/components/layout/PageScrollView';
import { db, auth } from '../../firebase';
import { doc, updateDoc, setDoc, deleteDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { updatePassword, deleteUser } from 'firebase/auth';
import useAdminUsers from '../../src/hooks/useAdminUsers';

export default function SettingsScreen() {
  const router = useRouter();
  const deviceIds = useAppStore(state => state.deviceIds);
  const setDeviceId = useAppStore(state => state.setDeviceId);
  const { user, logout, updateProfile } = useAuth();
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const savedDeviceId = deviceIds[user?.id] || process.env.EXPO_PUBLIC_DEVICE_ID || '';
  const [deviceDraft, setDeviceDraft] = useState(savedDeviceId);
  const [deviceFeedback, setDeviceFeedback] = useState('');
  const [savingDevice, setSavingDevice] = useState(false);
  useEffect(() => { setDeviceDraft(savedDeviceId); setDeviceFeedback(''); }, [savedDeviceId, user?.id]);
  const sensorData = useAppStore((state) => state.sensorData);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const updateUser = useAppStore((state) => state.updateUser);
  const adminSelectedFarmerId = useAppStore((state) => state.adminSelectedFarmerId);
  const setAdminSelectedFarmerId = useAppStore((state) => state.setAdminSelectedFarmerId);
  const adminSelectedCustomerId = useAppStore((state) => state.adminSelectedCustomerId);
  const setAdminSelectedCustomerId = useAppStore((state) => state.setAdminSelectedCustomerId);

  const { users: allUsers } = useAdminUsers();
  const farmersList = useMemo(() => {
    const raw = allUsers.filter(u => u.role === 'farmer');
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
    const raw = allUsers.filter(u => u.role === 'customer');
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

  const ROLE_CONFIG = {
    farmer: { label: 'Farmer', icon: '🚜', color: themeColors.success },
    customer: { label: 'Customer', icon: '🛒', color: themeColors.info },
    admin: { label: 'Administrator', icon: '🛡️', color: themeColors.warning },
  };

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

  const handleLogoutPress = () => {
    setShowLogoutModal(true);
  };

  const [isWipingData, setIsWipingData] = useState(false);

  const handleWipeOrphanedData = async () => {
    alert('Bulk deletion is unavailable. Data cleanup requires an audited server process.');
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace('/home');
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
      alert("Password must be at least 6 characters.");
      return;
    }
    setIsChangingPassword(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      alert("Password updated successfully!");
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (error) {
      console.error("Error changing password:", error);
      alert("Failed to change password. You may need to log out and log back in to verify your identity.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const roleConfig = ROLE_CONFIG[user?.role] || ROLE_CONFIG.farmer;
  const isCustomer = user?.role === 'customer';
  const isFarmer = user?.role === 'farmer';
  const isAdmin = user?.role === 'admin';

  return (
    <PageScrollView style={styles.container}>
      {user?.role !== 'customer' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sensor device</Text>
          <Text style={{ color: themeColors.textSecondary, marginBottom: spacing.sm }}>
            Copy the Device ID from your firmware settings. Saved to your account and synced across your devices.
          </Text>
          <Text style={{ color: themeColors.textSecondary, marginBottom: spacing.sm }}>
            Firmware must upload current readings to the devices collection. Older sensor_readings uploads are not supported.
          </Text>
          <Text style={styles.infoLabel}>Device ID</Text>
          <TextInput
            accessibilityLabel="Device ID"
            style={[styles.input, { minHeight: 48, color: themeColors.text }]}
            value={deviceDraft}
            onChangeText={value => { setDeviceDraft(value); setDeviceFeedback(''); }}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!savingDevice}
            placeholder="ESP32S3_001"
            placeholderTextColor={themeColors.textSecondary}
          />
          <Pressable accessibilityRole="button" disabled={savingDevice} style={{ padding: spacing.md, minHeight: 48 }} onPress={async () => {
            setSavingDevice(true);
            try { await setDeviceId(deviceDraft); setDeviceFeedback('Device saved. Reconnecting to sensor readings.'); }
            catch (error) { setDeviceFeedback(error.message); }
            finally { setSavingDevice(false); }
          }}>
            <Text style={{ color: themeColors.primaryDark, fontWeight: '700' }}>{savingDevice ? 'Saving device…' : 'Save device'}</Text>
          </Pressable>
          {!!deviceFeedback && <Text accessibilityLiveRegion="polite" style={{ color: themeColors.textSecondary }}>{deviceFeedback}</Text>}
        </View>
      )}
      <View style={styles.header}>
        <GradientText colors={themeColors.gradients.primary} style={styles.title}>Settings</GradientText>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Pressable onPress={handleEditProfileOpen}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </Pressable>
        </View>
        <LinearGradient colors={themeColors.cardGradients.default} style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || '?'}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              {user?.id ? (
                <Text style={styles.userMeta}>ID: {user.id.substring(0, 8).toUpperCase()}</Text>
              ) : null}
              {user?.created_at ? (
                <Text style={styles.userMeta}>Joined: {new Date(user.created_at).toLocaleDateString()}</Text>
              ) : null}
              <View style={[styles.roleBadge, { backgroundColor: roleConfig.color + '20', marginTop: spacing.xs }]}>
                <Text style={styles.roleIcon}>{roleConfig.icon}</Text>
                <Text style={[styles.roleText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
              </View>
            </View>
          </View>
          <View style={styles.divider} />
          <Pressable onPress={() => setShowPasswordModal(true)} style={styles.passwordBtn}>
            <Text style={styles.passwordBtnText}>Change Login Password</Text>
          </Pressable>
        </LinearGradient>
      </View>

      {/* Contact/Shipping Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Farm Details</Text>
        <LinearGradient colors={themeColors.cardGradients.default} style={styles.card}>
          {user?.farm_name ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Farm Name</Text>
                <Text style={styles.infoValue}>{user.farm_name}</Text>
              </View>
              <View style={styles.divider} />
            </>
          ) : null}
          {user?.farm_location ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Farm Location</Text>
                <Text style={styles.infoValue}>{user.farm_location}</Text>
              </View>
              <View style={styles.divider} />
            </>
          ) : null}
          {user?.farm_size ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Farm Size (Acres)</Text>
                <Text style={styles.infoValue}>{user.farm_size}</Text>
              </View>
              <View style={styles.divider} />
            </>
          ) : null}
          {user?.crops ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Specialized Crops</Text>
                <Text style={styles.infoValue}>{user.crops}</Text>
              </View>
              <View style={styles.divider} />
            </>
          ) : null}
          {user?.experience ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Experience</Text>
                <Text style={styles.infoValue}>{user.experience} yrs</Text>
              </View>
              <View style={styles.divider} />
            </>
          ) : null}
          {user?.phone ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{user.phone}</Text>
            </View>
          ) : null}
          {Boolean(user?.address || user?.city || user?.state || user?.pincode) ? (
            <>
              {user?.address ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>{user.address}</Text>
                </View>
              ) : null}
              {Boolean(user?.city || user?.state) ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>City/State</Text>
                  <Text style={styles.infoValue}>{user.city}{user.city && user?.state ? ', ' : ''}{user.state}</Text>
                </View>
              ) : null}
              {user?.pincode ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Pincode</Text>
                  <Text style={styles.infoValue}>{user.pincode}</Text>
                </View>
              ) : null}
            </>
          ) : null}
        </LinearGradient>
      </View>

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>
        <LinearGradient colors={themeColors.cardGradients.default} style={styles.card}>
          {(isFarmer || isAdmin) && (
            <>
              <Pressable style={styles.settingRow} onPress={() => router.push('/customization')}>
                <Text style={styles.settingLabel}>Customize App Features</Text>
                <Text style={{ color: themeColors.primary, fontSize: 20 }}>→</Text>
              </Pressable>
              <View style={styles.divider} />
            </>
          )}
          <Pressable style={styles.settingRow} onPress={() => router.push('/home')}>
            <Text style={styles.settingLabel}>View Home / Landing Page</Text>
            <Text style={{ color: themeColors.primary, fontSize: 20 }}>→</Text>
          </Pressable>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: themeColors.surfaceLight, true: themeColors.primary + '60' }}
              thumbColor={isDarkMode ? themeColors.primary : themeColors.textMuted}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Switch
              value={permissions.notifications}
              onValueChange={requestNotificationPermission}
              trackColor={{ false: themeColors.surfaceLight, true: themeColors.primary + '60' }}
              thumbColor={permissions.notifications ? themeColors.primary : themeColors.textMuted}
            />
          </View>
          <View style={styles.divider} />
          <Pressable style={styles.settingRow} onPress={() => router.push('/contact-team')}>
            <Text style={styles.settingLabel}>Contact Team & Support</Text>
            <Text style={{ color: themeColors.primary, fontSize: 20 }}>→</Text>
          </Pressable>
        </LinearGradient>
      </View>

      {/* Farmer Permissions */}
      {isFarmer && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Essential Farmer Permissions</Text>
          <LinearGradient colors={themeColors.cardGradients.default} style={styles.card}>
            <View style={styles.permissionIntroRow}>
              <Text style={styles.permissionIntroText}>
                Please grant the following device permissions to enable core farming assistance features.
              </Text>
            </View>

            <View style={styles.divider} />

            {/* Camera Permission */}
            <View style={styles.permissionRow}>
              <View style={styles.permissionTextContainer}>
                <Text style={styles.permissionRowTitle}>📸 Camera Access</Text>
                <Text style={styles.permissionRowDesc}>Required for scanning crop leaves to detect plant diseases via AI.</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.grantBtn,
                  permissions.camera && styles.grantBtnSuccess,
                  pressed && styles.pressed
                ]}
                onPress={requestCameraPermission}
                disabled={permissions.camera}
              >
                <Text style={[styles.grantBtnText, permissions.camera && styles.grantBtnTextSuccess]}>
                  {permissions.camera ? 'Granted ✓' : 'Grant'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.divider} />

            {/* Storage Permission */}
            <View style={styles.permissionRow}>
              <View style={styles.permissionTextContainer}>
                <Text style={styles.permissionRowTitle}>💾 Storage Access</Text>
                <Text style={styles.permissionRowDesc}>Required to upload crop logs and save weekly growth reports.</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.grantBtn,
                  permissions.storage && styles.grantBtnSuccess,
                  pressed && styles.pressed
                ]}
                onPress={requestStoragePermission}
                disabled={permissions.storage}
              >
                <Text style={[styles.grantBtnText, permissions.storage && styles.grantBtnTextSuccess]}>
                  {permissions.storage ? 'Granted ✓' : 'Grant'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.divider} />

            {/* Notifications Permission */}
            <View style={styles.permissionRow}>
              <View style={styles.permissionTextContainer}>
                <Text style={styles.permissionRowTitle}>🔔 Sensor Alerts</Text>
                <Text style={styles.permissionRowDesc}>Required to receive instant alerts if sensor readings go offline or cross safe levels.</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.grantBtn,
                  permissions.notifications && styles.grantBtnSuccess,
                  pressed && styles.pressed
                ]}
                onPress={requestNotificationPermission}
                disabled={permissions.notifications}
              >
                <Text style={[styles.grantBtnText, permissions.notifications && styles.grantBtnTextSuccess]}>
                  {permissions.notifications ? 'Granted ✓' : 'Grant'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.divider} />

            {/* Request All Action Button */}
            <Pressable
              style={({ pressed }) => [
                styles.grantAllBtnWrap,
                pressed && styles.pressed
              ]}
              onPress={requestAllPermissions}
              disabled={permissions.camera && permissions.storage && permissions.notifications}
            >
              <LinearGradient
                colors={themeColors.gradients.primary}
                style={[
                  styles.grantAllBtn,
                  (permissions.camera && permissions.storage && permissions.notifications) && styles.grantAllBtnDisabled
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.grantAllBtnText, (permissions.camera && permissions.storage && permissions.notifications) && { color: themeColors.textSecondary }]}>
                  {permissions.camera && permissions.storage && permissions.notifications
                    ? 'All Permissions Granted ✓'
                    : 'Grant All Permissions'}
                </Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </View>
      )}

      {/* Device Info - Only for Farmer/Admin */}
      {!isCustomer && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Information</Text>
          <LinearGradient colors={themeColors.cardGradients.default} style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Device ID</Text>
              <Text style={styles.infoValue}>{sensorData?.deviceId || 'Not Connected'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Firmware</Text>
              <Text style={styles.infoValue}>v2.1.0 (Latest)</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>IP Address</Text>
              <Text style={styles.infoValue}>DHCP Configured</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Sync</Text>
              <Text style={styles.infoValue}>
                {sensorData?.lastSensorTimestamp ? `${formatDate(sensorData.lastSensorTimestamp)} ${formatTime(sensorData.lastSensorTimestamp)}` : 'Never'}
              </Text>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Global Admin Filters */}
      {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Global Data Filters</Text>
          <LinearGradient colors={themeColors.cardGradients.default} style={styles.card}>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Farmer Filter</Text>
              <Pressable
                style={styles.adminFilterBtn}
                onPress={() => setShowAdminFarmerModal(true)}
              >
                <Text style={styles.adminFilterBtnText}>
                  {adminSelectedFarmerId ? (farmersList.find(f => f.id === adminSelectedFarmerId)?.farm_name || farmersList.find(f => f.id === adminSelectedFarmerId)?.name || 'Unknown') + ' (' + (farmersList.find(f => f.id === adminSelectedFarmerId)?.email || 'No email') + ')' : 'All Farmers'}
                </Text>
                <Text style={styles.dropdownIcon}>▼</Text>
              </Pressable>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Customer Filter</Text>
              <Pressable
                style={styles.adminFilterBtn}
                onPress={() => setShowAdminCustomerModal(true)}
              >
                <Text style={styles.adminFilterBtnText}>
                  {adminSelectedCustomerId ? (customersList.find(c => c.id === adminSelectedCustomerId)?.name || 'Unknown') + ' (' + (customersList.find(c => c.id === adminSelectedCustomerId)?.email || 'No email') + ')' : 'All Customers'}
                </Text>
                <Text style={styles.dropdownIcon}>▼</Text>
              </Pressable>
            </View>

            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Pressable
                style={[styles.adminFilterBtn, { backgroundColor: themeColors.danger + '20', width: '100%' }]}
                onPress={handleWipeOrphanedData}
                disabled={isWipingData}
              >
                <Text style={[styles.adminFilterBtnText, { color: themeColors.danger, textAlign: 'center' }]}>
                  {isWipingData ? 'Wiping Data...' : '⚠️ Wipe All Orphaned Data'}
                </Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Orders Link - For Customers */}
      {isCustomer && (
        <Pressable
          style={({ pressed }) => [styles.ordersBtnWrap, pressed && styles.pressed]}
          onPress={() => router.push('/(tabs)/orders')}
        >
          <LinearGradient
            colors={themeColors.cardGradients.default}
            style={[styles.ordersBtn, { borderColor: themeColors.primary + '50' }]}
          >
            <Text style={styles.ordersBtnIcon}>📦</Text>
            <Text style={styles.ordersBtnText}>View My Orders</Text>
          </LinearGradient>
        </Pressable>
      )}

      <Pressable style={({ pressed }) => [styles.logoutBtnWrap, pressed && styles.pressed]} onPress={handleLogoutPress}>
        <LinearGradient
          colors={themeColors.cardGradients.default}
          style={[styles.logoutBtn, { borderColor: themeColors.danger + '50' }]}
        >
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </LinearGradient>
      </Pressable>

      <Pressable style={({ pressed }) => [styles.logoutBtnWrap, pressed && styles.pressed, { marginTop: spacing.md }]} onPress={() => setShowDeleteAccountModal(true)}>
        <LinearGradient
          colors={themeColors.cardGradients.default}
          style={[styles.logoutBtn, { borderColor: themeColors.danger + '80', backgroundColor: themeColors.danger + '10' }]}
        >
          <Text style={[styles.logoutBtnText, { color: themeColors.danger }]}>Delete My Account</Text>
        </LinearGradient>
      </Pressable>

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
            <Text style={styles.modalMessage}>Are you sure you want to sign out?</Text>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnCancel, pressed && styles.pressed]}
                onPress={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnConfirm, pressed && styles.pressed]}
                onPress={handleConfirmLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <Text style={styles.modalBtnConfirmText}>Signing out...</Text>
                ) : (
                  <Text style={styles.modalBtnConfirmText}>Sign Out</Text>
                )}
              </Pressable>
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
            <Text style={styles.modalMessage}>Are you completely sure you want to permanently delete your account and all associated data? This action cannot be undone.</Text>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnCancel, pressed && styles.pressed]}
                onPress={() => setShowDeleteAccountModal(false)}
                disabled={isDeletingAccount}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnConfirm, pressed && styles.pressed]}
                onPress={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Enter new password (min 6 chars)"
                placeholderTextColor={themeColors.textMuted}
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnCancel, pressed && styles.pressed]}
                onPress={() => setShowPasswordModal(false)}
                disabled={isChangingPassword}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, { backgroundColor: themeColors.primary }, pressed && styles.pressed]}
                onPress={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <ActivityIndicator color={themeColors.background} size="small" />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>Update Password</Text>
                )}
              </Pressable>
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
          <LinearGradient colors={themeColors.cardGradients.default} style={[styles.modalContent, styles.editProfileModal]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Pressable onPress={() => !isSavingProfile && setIsEditingProfile(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.editFormScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.formSectionTitle}>Personal Details</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.name}
                  onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.phone}
                  onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                  keyboardType="phone-pad"
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>

              {isFarmer && (
                <>
                  <Text style={[styles.formSectionTitle, { marginTop: spacing.md }]}>Farm & Extra Details</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Farm Name</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.farm_name}
                      onChangeText={(text) => setEditForm({ ...editForm, farm_name: text })}
                      placeholderTextColor={themeColors.textMuted}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Farm Location</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.farm_location}
                      onChangeText={(text) => setEditForm({ ...editForm, farm_location: text })}
                      placeholderTextColor={themeColors.textMuted}
                    />
                  </View>
                  <View style={styles.rowInputs}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                      <Text style={styles.inputLabel}>Farm Size (Acres)</Text>
                      <TextInput
                        style={styles.input}
                        value={editForm.farm_size}
                        onChangeText={(text) => setEditForm({ ...editForm, farm_size: text })}
                        keyboardType="numeric"
                        placeholderTextColor={themeColors.textMuted}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Experience (Yrs)</Text>
                      <TextInput
                        style={styles.input}
                        value={editForm.experience}
                        onChangeText={(text) => setEditForm({ ...editForm, experience: text })}
                        keyboardType="numeric"
                        placeholderTextColor={themeColors.textMuted}
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Specialized Crops (comma separated)</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.crops}
                      onChangeText={(text) => setEditForm({ ...editForm, crops: text })}
                      placeholder="e.g. Tomatoes, Lettuce, Basil"
                      placeholderTextColor={themeColors.textMuted}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>UPI ID (for receiving payments)</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.upi_id}
                      onChangeText={(text) => setEditForm({ ...editForm, upi_id: text })}
                      placeholder="e.g. yourname@upi"
                      placeholderTextColor={themeColors.textMuted}
                    />
                  </View>
                </>
              )}

              <Text style={[styles.formSectionTitle, { marginTop: spacing.md }]}>Address</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Street Address</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.address}
                  onChangeText={(text) => setEditForm({ ...editForm, address: text })}
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>
              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.city}
                    onChangeText={(text) => setEditForm({ ...editForm, city: text })}
                    placeholderTextColor={themeColors.textMuted}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>State</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.state}
                    onChangeText={(text) => setEditForm({ ...editForm, state: text })}
                    placeholderTextColor={themeColors.textMuted}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Pincode</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.pincode}
                  onChangeText={(text) => setEditForm({ ...editForm, pincode: text })}
                  keyboardType="numeric"
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnCancel, pressed && styles.pressed]}
                onPress={() => setIsEditingProfile(false)}
                disabled={isSavingProfile}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, { backgroundColor: themeColors.primary }, pressed && styles.pressed]}
                onPress={handleSaveProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <ActivityIndicator color={themeColors.background} size="small" />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>Save Changes</Text>
                )}
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      <Text style={styles.version}>HyGrow v1.0.0</Text>

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
              <Text style={styles.modalTitle}>Select Farmer Filter</Text>
              <Pressable onPress={() => setShowAdminFarmerModal(false)}>
                <Text style={styles.modalCloseText}>Done</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Pressable
                style={[styles.modalItem, !adminSelectedFarmerId && styles.modalItemActive]}
                onPress={() => {
                  setAdminSelectedFarmerId(null);
                  setShowAdminFarmerModal(false);
                }}
              >
                <Text style={[styles.modalItemText, !adminSelectedFarmerId && styles.modalItemTextActive]}>All Farmers</Text>
              </Pressable>
              {farmersList.map(farmer => (
                <View key={farmer.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Pressable
                    style={[styles.modalItem, { flex: 1 }, adminSelectedFarmerId === farmer.id && styles.modalItemActive]}
                    onPress={() => {
                      setAdminSelectedFarmerId(farmer.id);
                      setShowAdminFarmerModal(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, adminSelectedFarmerId === farmer.id && styles.modalItemTextActive]}>
                      {farmer.farm_name || farmer.name} ({farmer.email || 'No email'})
                    </Text>
                  </Pressable>
                  <Pressable
                    style={{ padding: spacing.md }}
                    onPress={() => setUserToDelete(farmer)}
                  >
                    <Text style={{ fontSize: 18 }}>🗑️</Text>
                  </Pressable>
                </View>
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
              <Text style={styles.modalTitle}>Select Customer Filter</Text>
              <Pressable onPress={() => setShowAdminCustomerModal(false)}>
                <Text style={styles.modalCloseText}>Done</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Pressable
                style={[styles.modalItem, !adminSelectedCustomerId && styles.modalItemActive]}
                onPress={() => {
                  setAdminSelectedCustomerId(null);
                  setShowAdminCustomerModal(false);
                }}
              >
                <Text style={[styles.modalItemText, !adminSelectedCustomerId && styles.modalItemTextActive]}>All Customers</Text>
              </Pressable>
              {customersList.map(customer => (
                <View key={customer.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Pressable
                    style={[styles.modalItem, { flex: 1 }, adminSelectedCustomerId === customer.id && styles.modalItemActive]}
                    onPress={() => {
                      setAdminSelectedCustomerId(customer.id);
                      setShowAdminCustomerModal(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, adminSelectedCustomerId === customer.id && styles.modalItemTextActive]}>
                      {customer.name} ({customer.email || 'No email'})
                    </Text>
                  </Pressable>
                  <Pressable
                    style={{ padding: spacing.md }}
                    onPress={() => setUserToDelete(customer)}
                  >
                    <Text style={{ fontSize: 18 }}>🗑️</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Other User Modal */}
      <Modal
        visible={!!userToDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setUserToDelete(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: themeColors.danger }]}>Delete User</Text>
            <Text style={styles.modalMessage}>Are you sure you want to permanently delete data for {userToDelete?.name}? (This only deletes app data. Auth credentials must be deleted from the Firebase Console)</Text>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnCancel, pressed && styles.pressed]}
                onPress={() => setUserToDelete(null)}
                disabled={isDeletingOther}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnConfirm, pressed && styles.pressed]}
                onPress={handleDeleteOtherUser}
                disabled={isDeletingOther}
              >
                {isDeletingOther ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>Delete User</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </PageScrollView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: theme.text,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    ...typography.label,
    color: theme.textSecondary,
    marginBottom: 0, // override
  },
  editBtnText: {
    ...typography.bodySmall,
    color: theme.primary,
    fontWeight: '600',
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.primary + '40',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.primary,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    ...typography.h2,
    marginBottom: 4,
    color: theme.text,
  },
  userEmail: {
    ...typography.body,
    color: theme.textSecondary,
    marginBottom: spacing.sm,
  },
  userMeta: {
    ...typography.caption,
    color: theme.textSecondary,
    marginBottom: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  roleIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  roleText: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  settingLabel: {
    ...typography.body,
    color: theme.text,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  infoLabel: {
    ...typography.body,
    color: theme.textSecondary,
  },
  infoValue: {
    ...typography.body,
    fontWeight: '500',
    color: theme.text,
  },
  adminCardWrap: {
    ...shadows.card,
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  adminIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  adminInfo: {
    flex: 1,
  },
  adminTitle: {
    ...typography.body,
    fontWeight: '600',
    color: theme.text,
  },
  adminDesc: {
    ...typography.caption,
    color: theme.textSecondary,
    marginTop: 2,
  },
  adminArrow: {
    fontSize: 20,
    color: theme.warning,
  },
  ordersBtnWrap: {
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  ordersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    justifyContent: 'center',
  },
  ordersBtnIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  ordersBtnText: {
    ...typography.body,
    color: theme.primary,
    fontWeight: '600',
  },
  logoutBtnWrap: {
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  logoutBtn: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.8,
  },
  logoutBtnText: {
    ...typography.body,
    color: theme.danger,
    fontWeight: '600',
  },
  version: {
    ...typography.caption,
    textAlign: 'center',
    color: theme.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalTitle: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.sm,
    color: theme.text,
  },
  modalMessage: {
    ...typography.body,
    color: theme.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  adminFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 150,
  },
  adminFilterBtnText: {
    ...typography.bodySmall,
    color: theme.text,
  },
  dropdownIcon: {
    color: theme.textSecondary,
    fontSize: 10,
    marginLeft: spacing.sm,
  },
  modalScroll: {
    maxHeight: 300,
    marginTop: spacing.md,
  },
  modalItem: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  modalItemActive: {
    backgroundColor: theme.primary + '15',
  },
  modalItemText: {
    ...typography.body,
    color: theme.text,
  },
  modalItemTextActive: {
    color: theme.primary,
    fontWeight: '700',
  },
  modalCloseText: {
    ...typography.body,
    color: theme.primary,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalBtnCancelText: {
    ...typography.body,
    fontWeight: '600',
    color: theme.text,
  },
  modalBtnConfirm: {
    backgroundColor: theme.danger,
  },
  modalBtnConfirmText: {
    ...typography.body,
    fontWeight: '600',
    color: '#ffffff',
  },
  permissionIntroRow: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  permissionIntroText: {
    ...typography.bodySmall,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
  },
  permissionTextContainer: {
    flex: 1,
  },
  permissionRowTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 2,
    color: theme.text,
  },
  permissionRowDesc: {
    ...typography.caption,
    color: theme.textSecondary,
    lineHeight: 14,
  },
  grantBtn: {
    backgroundColor: theme.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  grantBtnSuccess: {
    backgroundColor: theme.successLight,
    borderColor: theme.success + '40',
  },
  grantBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: theme.text,
  },
  grantBtnTextSuccess: {
    color: theme.success,
  },
  grantAllBtnWrap: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    ...shadows.card,
  },
  grantAllBtn: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  grantAllBtnDisabled: {
    opacity: 0.2,
  },
  grantAllBtnText: {
    ...typography.body,
    fontWeight: '700',
    color: '#ffffff',
  },
  editProfileModal: {
    maxHeight: '85%',
    padding: spacing.lg,
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: spacing.sm,
  },
  closeBtn: {
    padding: spacing.xs,
    backgroundColor: theme.surfaceLight,
    borderRadius: borderRadius.full,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: theme.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  editFormScroll: {
    marginBottom: spacing.md,
  },
  formSectionTitle: {
    ...typography.body,
    fontWeight: '700',
    color: theme.primary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.label,
    color: theme.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: theme.text,
    fontSize: 16,
    ...shadows.sm,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  passwordBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  passwordBtnText: {
    ...typography.body,
    color: theme.primary,
    fontWeight: '600',
  },
});
