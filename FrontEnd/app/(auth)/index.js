import { useRouter } from 'expo-router';
import { useEffect, useState, useRef, useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User as UserIcon,
  Tractor,
  ShoppingBag,
  MapPin,
  Phone,
  Warehouse,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react-native';
import useAuth from '../../src/hooks/useAuth';
import useAppStore from '../../src/store/useAppStore';
import { borderRadius, useThemeColors, spacing, typography, shadows } from '../../src/theme/theme';
import { PressableScale } from '../../src/components/PressableScale';

const ROLES = [
  { key: 'farmer', label: 'Farmer / Grower', icon: Tractor, description: 'IoT sensors & farm operations' },
  { key: 'customer', label: 'Customer', icon: ShoppingBag, description: 'Direct-from-farm produce market' },
];

export default function AuthScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const { width, height } = useWindowDimensions();
  const isMobile = width <= 600;
  const styles = useMemo(() => createStyles(themeColors, isMobile), [themeColors, isMobile]);

  const { login, signup, loading: authLoading, authInitialized } = useAuth();
  const user = useAppStore((state) => state.user);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  const [isLoginState, setIsLoginState] = useState(true);
  const [signupStep, setSignupStep] = useState(1);
  const flipAnim = useRef(new Animated.Value(0)).current;

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [role, setRole] = useState('farmer');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [farmName, setFarmName] = useState('');
  const [farmLocation, setFarmLocation] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (authInitialized && isAuthenticated && user) {
      if (user.role === 'customer') {
        router.replace('/(tabs)/market');
      } else {
        router.replace('/(tabs)/dashboard');
      }
    }
  }, [authInitialized, isAuthenticated, user, router]);

  const flipToSignup = () => {
    setError('');
    setSignupStep(1);
    setIsLoginState(false);
    Animated.spring(flipAnim, {
      toValue: 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  };

  const flipToLogin = () => {
    setError('');
    setIsLoginState(true);
    Animated.spring(flipAnim, {
      toValue: 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('Please enter both email and password');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await login(loginEmail.trim(), loginPassword);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || password.length < 6 || password !== confirmPassword) {
      setError('Please ensure password has at least 6 characters and matches confirmation');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
        farm_name: role === 'farmer' ? farmName.trim() : undefined,
        farm_location: role === 'farmer' ? farmLocation.trim() : undefined,
      });
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (!authInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  const frontAnimatedStyle = {
    transform: [
      {
        rotateY: flipAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '180deg'],
        }),
      },
    ],
  };

  const backAnimatedStyle = {
    transform: [
      {
        rotateY: flipAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['180deg', '360deg'],
        }),
      },
    ],
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  };

  const renderRoleSpecificFields = () => {
    if (role === 'farmer') {
      return (
        <View style={styles.fieldsGroup}>
          <Text style={styles.sectionSubtitle}>Farm Profile Details</Text>
          <View style={styles.inputWrapper}>
            <Warehouse size={18} color={themeColors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Farm or Facility Name"
              placeholderTextColor={themeColors.textMuted}
              value={farmName}
              onChangeText={setFarmName}
            />
          </View>

          <View style={styles.inputWrapper}>
            <MapPin size={18} color={themeColors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Farm Location (e.g. Pune, MH)"
              placeholderTextColor={themeColors.textMuted}
              value={farmLocation}
              onChangeText={setFarmLocation}
            />
          </View>
        </View>
      );
    }
    if (role === 'customer') {
      return (
        <View style={styles.fieldsGroup}>
          <Text style={styles.sectionSubtitle}>Delivery Details</Text>
          <View style={styles.inputWrapper}>
            <MapPin size={18} color={themeColors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Delivery Street Address"
              placeholderTextColor={themeColors.textMuted}
              value={address}
              onChangeText={setAddress}
            />
          </View>

          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 2, marginRight: spacing.sm }]}
              placeholder="City"
              placeholderTextColor={themeColors.textMuted}
              value={city}
              onChangeText={setCity}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="State"
              placeholderTextColor={themeColors.textMuted}
              value={state}
              onChangeText={setState}
              maxLength={4}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: spacing.sm }]}
              placeholder="Pincode"
              placeholderTextColor={themeColors.textMuted}
              value={pincode}
              onChangeText={setPincode}
              keyboardType="numeric"
              maxLength={6}
            />
            <View style={[styles.inputWrapper, { flex: 2 }]}>
              <Phone size={16} color={themeColors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Mobile Phone"
                placeholderTextColor={themeColors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>
      );
    }
    return null;
  };

  const cardWidth = isMobile ? Math.min(width * 0.94, 460) : 480;
  const cardHeight = isMobile ? Math.max(620, height * 0.82) : 660;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.centeredContainer}>
        {/* Glow halo background on desktop */}
        <View style={[styles.cardWrapper, { width: cardWidth, minHeight: cardHeight }]}>
          {/* Front Face: Login */}
          <Animated.View style={[styles.cardFace, frontAnimatedStyle, { zIndex: isLoginState ? 1 : 0 }]}>
            <View style={styles.cardInner}>
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Logo & Header */}
                <View style={styles.header}>
                  <View style={styles.logoBadge}>
                    <Image source={require('../../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
                  </View>
                  <Text style={styles.brandTitle}>HYGROW</Text>
                  <Text style={styles.title}>Sign in to your account</Text>
                  <Text style={styles.subtitle}>Access real-time farm telemetry & produce marketplace</Text>
                </View>

                {/* Error Banner */}
                {!!error && isLoginState && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Form Fields */}
                <View style={styles.formContent}>
                  <View style={styles.inputWrapper}>
                    <Mail size={18} color={themeColors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="Email address"
                      placeholderTextColor={themeColors.textMuted}
                      value={loginEmail}
                      onChangeText={setLoginEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Lock size={18} color={themeColors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.inputWithIcon, { paddingRight: 44 }]}
                      placeholder="Password"
                      placeholderTextColor={themeColors.textMuted}
                      value={loginPassword}
                      onChangeText={setLoginPassword}
                      secureTextEntry={!showLoginPassword}
                    />
                    <Pressable
                      onPress={() => setShowLoginPassword(!showLoginPassword)}
                      style={styles.eyeIcon}
                      hitSlop={8}
                    >
                      {showLoginPassword ? (
                        <EyeOff color={themeColors.textMuted} size={18} />
                      ) : (
                        <Eye color={themeColors.textMuted} size={18} />
                      )}
                    </Pressable>
                  </View>

                  {/* Sign In Button */}
                  <PressableScale
                    style={styles.primaryButton}
                    onPress={handleLogin}
                    disabled={loading}
                    activeScale={0.97}
                  >
                    {loading ? (
                      <ActivityIndicator color="#090D16" />
                    ) : (
                      <View style={styles.buttonInner}>
                        <Text style={styles.primaryButtonText}>Sign In</Text>
                        <ArrowRight size={16} color="#090D16" />
                      </View>
                    )}
                  </PressableScale>

                  {/* Flip to Sign Up */}
                  <Pressable onPress={flipToSignup} style={styles.switchModeButton}>
                    <Text style={styles.switchModeText}>
                      Don't have an account? <Text style={styles.switchModeHighlight}>Create an Account</Text>
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </Animated.View>

          {/* Back Face: Sign Up */}
          <Animated.View style={[styles.cardFace, backAnimatedStyle, { zIndex: isLoginState ? 0 : 1 }]}>
            <View style={styles.cardInner}>
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.logoBadge}>
                    <Image source={require('../../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
                  </View>
                  <Text style={styles.brandTitle}>HYGROW</Text>
                  <Text style={styles.title}>
                    {signupStep === 1 ? 'Create Account' : 'Complete Setup'}
                  </Text>
                  <Text style={styles.subtitle}>
                    {signupStep === 1 ? 'Step 1 of 2: Basic credentials' : 'Step 2 of 2: Profile settings'}
                  </Text>
                </View>

                {/* Error Banner */}
                {!!error && !isLoginState && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <View style={styles.formContent}>
                  {signupStep === 1 ? (
                    <>
                      {/* Role Selector */}
                      <Text style={styles.inputGroupLabel}>Choose Your Role</Text>
                      <View style={styles.roleContainer}>
                        {ROLES.map((r) => {
                          const IconComponent = r.icon;
                          const isActive = role === r.key;
                          return (
                            <PressableScale
                              key={r.key}
                              style={[styles.roleCard, isActive && styles.roleCardActive]}
                              onPress={() => setRole(r.key)}
                              activeScale={0.97}
                            >
                              <View style={[styles.roleIconWrap, isActive && styles.roleIconWrapActive]}>
                                <IconComponent size={20} color={isActive ? '#10B981' : themeColors.textMuted} />
                              </View>
                              <Text style={[styles.roleLabel, isActive && styles.roleLabelActive]}>
                                {r.label}
                              </Text>
                            </PressableScale>
                          );
                        })}
                      </View>

                      <View style={styles.inputWrapper}>
                        <UserIcon size={18} color={themeColors.textMuted} style={styles.inputIcon} />
                        <TextInput
                          style={styles.inputWithIcon}
                          placeholder="Full Name"
                          placeholderTextColor={themeColors.textMuted}
                          value={name}
                          onChangeText={setName}
                        />
                      </View>

                      <View style={styles.inputWrapper}>
                        <Mail size={18} color={themeColors.textMuted} style={styles.inputIcon} />
                        <TextInput
                          style={styles.inputWithIcon}
                          placeholder="Email address"
                          placeholderTextColor={themeColors.textMuted}
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                      </View>

                      <View style={styles.row}>
                        <View style={[styles.inputWrapper, { flex: 1, marginRight: spacing.sm }]}>
                          <Lock size={16} color={themeColors.textMuted} style={styles.inputIcon} />
                          <TextInput
                            style={styles.inputWithIcon}
                            placeholder="Password (6+)"
                            placeholderTextColor={themeColors.textMuted}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showSignupPassword}
                          />
                        </View>
                        <View style={[styles.inputWrapper, { flex: 1 }]}>
                          <Lock size={16} color={themeColors.textMuted} style={styles.inputIcon} />
                          <TextInput
                            style={styles.inputWithIcon}
                            placeholder="Confirm"
                            placeholderTextColor={themeColors.textMuted}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showSignupPassword}
                          />
                        </View>
                      </View>

                      <PressableScale
                        style={styles.primaryButton}
                        onPress={() => {
                          if (!name.trim() || !email.trim() || password.length < 6 || password !== confirmPassword) {
                            setError('Please provide valid details (min 6-character password matching confirm)');
                            return;
                          }
                          setError('');
                          setSignupStep(2);
                        }}
                        activeScale={0.97}
                      >
                        <View style={styles.buttonInner}>
                          <Text style={styles.primaryButtonText}>Continue to Step 2</Text>
                          <ArrowRight size={16} color="#090D16" />
                        </View>
                      </PressableScale>
                    </>
                  ) : (
                    <>
                      {renderRoleSpecificFields()}

                      <View style={[styles.row, { marginTop: spacing.md }]}>
                        <PressableScale
                          style={[styles.secondaryButton, { flex: 1, marginRight: spacing.sm }]}
                          onPress={() => setSignupStep(1)}
                          activeScale={0.97}
                        >
                          <View style={styles.buttonInner}>
                            <ArrowLeft size={16} color={themeColors.text} />
                            <Text style={styles.secondaryButtonText}>Back</Text>
                          </View>
                        </PressableScale>

                        <PressableScale
                          style={[styles.primaryButton, { flex: 2 }]}
                          onPress={handleSignup}
                          disabled={loading}
                          activeScale={0.97}
                        >
                          {loading ? (
                            <ActivityIndicator color="#090D16" />
                          ) : (
                            <View style={styles.buttonInner}>
                              <Text style={styles.primaryButtonText}>Complete Setup</Text>
                              <CheckCircle2 size={16} color="#090D16" />
                            </View>
                          )}
                        </PressableScale>
                      </View>
                    </>
                  )}

                  {/* Switch to Sign In */}
                  {signupStep === 1 && (
                    <Pressable onPress={flipToLogin} style={styles.switchModeButton}>
                      <Text style={styles.switchModeText}>
                        Already registered? <Text style={styles.switchModeHighlight}>Sign In instead</Text>
                      </Text>
                    </Pressable>
                  )}
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors, isMobile) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    centeredContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.md,
    },
    cardWrapper: {
      position: 'relative',
      perspective: 1200,
      ...Platform.select({
        web: {
          boxShadow: `0 12px 32px -4px ${colors.primary}25`,
        },
        default: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.15,
          shadowRadius: 32,
          elevation: 12,
        },
      }),
    },
    cardFace: {
      width: '100%',
      height: '100%',
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      backfaceVisibility: 'hidden',
      overflow: 'hidden',
    },
    cardInner: {
      width: '100%',
      height: '100%',
    },
    scrollContent: {
      flexGrow: 1,
      padding: spacing.xl,
      justifyContent: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    logoBadge: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: colors.primary + '14',
      borderWidth: 1,
      borderColor: colors.primary + '30',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    logoImage: {
      width: 32,
      height: 32,
    },
    brandTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 2,
      marginBottom: 4,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
      textAlign: 'center',
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: 340,
    },
    errorContainer: {
      backgroundColor: colors.danger + '15',
      borderWidth: 1,
      borderColor: colors.danger + '35',
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderRadius: 12,
      marginBottom: spacing.md,
    },
    errorText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: '500',
      textAlign: 'center',
    },
    formContent: {
      width: '100%',
    },
    fieldsGroup: {
      marginBottom: spacing.sm,
    },
    sectionSubtitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    inputGroupLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    roleContainer: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: spacing.md,
    },
    roleCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceLight,
    },
    roleCardActive: {
      backgroundColor: colors.primary + '18',
      borderColor: colors.primary,
    },
    roleIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    roleIconWrapActive: {
      backgroundColor: colors.primary + '25',
    },
    roleLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    roleLabelActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      marginBottom: spacing.md,
      position: 'relative',
    },
    inputIcon: {
      marginLeft: 14,
    },
    inputWithIcon: {
      flex: 1,
      paddingVertical: 13,
      paddingLeft: 10,
      paddingRight: 14,
      fontSize: 14,
      color: colors.text,
    },
    input: {
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 14,
      color: colors.text,
      marginBottom: spacing.md,
    },
    eyeIcon: {
      position: 'absolute',
      right: 14,
      padding: 4,
    },
    row: {
      flexDirection: 'row',
    },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.xs,
      ...Platform.select({
        web: {
          boxShadow: `0 4px 14px ${colors.primary}40`,
        },
        default: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 5,
        },
      }),
    },
    buttonInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    primaryButtonText: {
      color: '#090D16',
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    secondaryButton: {
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    switchModeButton: {
      marginTop: spacing.lg,
      alignItems: 'center',
      paddingVertical: 8,
    },
    switchModeText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    switchModeHighlight: {
      color: colors.primary,
      fontWeight: '700',
    },
  });
