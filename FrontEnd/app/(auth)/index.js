import { useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Animated, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import useAuth from '../../src/hooks/useAuth';
import useAppStore from '../../src/store/useAppStore';
import { borderRadius, useThemeColors, spacing, typography } from '../../src/theme/theme';

const ROLES = [
  { key: 'farmer', label: 'Farmer', icon: '🚜', description: 'Manage farm' },
  { key: 'customer', label: 'Customer', icon: '🛒', description: 'Shop produce' },
];

export default function AuthScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const { width, height } = useWindowDimensions();
  const isMobile = width <= 450;
  const styles = createStyles(themeColors, isMobile);


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
      setError('Please enter email and password');
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
      setError('Please fill required fields correctly (Min 6 chars password, match confirm)');
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
        <>
          <TextInput style={styles.input} placeholder="Farm Name" placeholderTextColor={themeColors.textMuted} value={farmName} onChangeText={setFarmName} />
          <TextInput style={styles.input} placeholder="Farm Location" placeholderTextColor={themeColors.textMuted} value={farmLocation} onChangeText={setFarmLocation} />
        </>
      );
    }
    if (role === 'customer') {
      return (
        <>
          <TextInput style={styles.input} placeholder="Shipping Address" placeholderTextColor={themeColors.textMuted} value={address} onChangeText={setAddress} />
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1, marginRight: spacing.sm }]} placeholder="City" placeholderTextColor={themeColors.textMuted} value={city} onChangeText={setCity} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="State (e.g. MH)" placeholderTextColor={themeColors.textMuted} value={state} onChangeText={setState} maxLength={2} autoCapitalize="characters" />
          </View>
          <TextInput style={styles.input} placeholder="Pincode" placeholderTextColor={themeColors.textMuted} value={pincode} onChangeText={setPincode} keyboardType="numeric" maxLength={6} />
          <TextInput style={styles.input} placeholder="Phone" placeholderTextColor={themeColors.textMuted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        </>
      );
    }
    return null;
  };

  const isWebOrTablet = !isMobile;

  // Ensure the container fits perfectly on the screen
  const cardWidth = isWebOrTablet ? 550 : width * 0.95;
  const cardHeight = isWebOrTablet ? 550 : Math.max(650, height * 0.85);

  const contentWidth = isWebOrTablet ? 400 : cardWidth * 0.9;
  const verticalPadding = isWebOrTablet ? 550 * 0.05 : 40;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.centeredContainer}>
        {/* The 3D Container */}
        <View style={[styles.coinWrapper, { width: cardWidth, height: cardHeight }]}>

          {/* Front: Login */}
          <Animated.View style={[styles.coinFace, frontAnimatedStyle, { zIndex: isLoginState ? 1 : 0 }]}>
            <View style={styles.coinInner}>
              <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: verticalPadding, paddingBottom: spacing.lg }]} showsVerticalScrollIndicator={false}>
                <View style={{ width: contentWidth, alignSelf: 'center', alignItems: 'stretch' }}>
                  <View style={styles.logoContainer}>
                    <Image source={require('../../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
                  </View>
                  <Text style={[styles.title, { marginBottom: spacing.xs }]}>Sign In</Text>

                  <View style={{ height: 40, justifyContent: 'center', marginBottom: spacing.xs }}>
                    {error && isLoginState ? <Text style={[styles.errorText, { marginBottom: 0 }]}>{error}</Text> : null}
                  </View>

                  <TextInput style={[styles.input, styles.inputLarge]} placeholder="Email" placeholderTextColor={themeColors.textMuted} value={loginEmail} onChangeText={setLoginEmail} keyboardType="email-address" autoCapitalize="none" />

                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.passwordInput, { flex: 1 }]}
                      placeholder="Password"
                      placeholderTextColor={themeColors.textMuted}
                      value={loginPassword}
                      onChangeText={setLoginPassword}
                      secureTextEntry={!showLoginPassword}
                    />
                    <Pressable onPress={() => setShowLoginPassword(!showLoginPassword)} style={styles.eyeIcon}>
                      {showLoginPassword ? <EyeOff color={themeColors.textMuted} size={20} /> : <Eye color={themeColors.textMuted} size={20} />}
                    </Pressable>
                  </View>

                  <Pressable style={({ pressed }) => [styles.button, styles.buttonLarge, pressed && styles.buttonPressed]} onPress={handleLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color={themeColors.background} /> : <Text style={[styles.buttonText, styles.buttonTextLarge]}>Sign In</Text>}
                  </Pressable>

                  <Pressable onPress={flipToSignup} style={styles.linkButton}>
                    <Text style={styles.linkText}>New here? <Text style={styles.linkTextBold}>Flip to Sign Up</Text></Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </Animated.View>

          {/* Back: Signup */}
          <Animated.View style={[styles.coinFace, backAnimatedStyle, { zIndex: isLoginState ? 0 : 1 }]}>
            <View style={styles.coinInner}>
              <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: verticalPadding, paddingBottom: spacing.lg }]} showsVerticalScrollIndicator={false}>
                <View style={{ width: contentWidth, alignSelf: 'center', alignItems: 'stretch' }}>
                  <View style={styles.logoContainer}>
                    <Image source={require('../../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
                  </View>
                  <Text style={[styles.title, { marginBottom: spacing.xs }]}>Sign Up</Text>

                  <View style={{ height: 40, justifyContent: 'center', marginBottom: spacing.xs }}>
                    {error && !isLoginState ? <Text style={[styles.errorText, { marginBottom: 0 }]}>{error}</Text> : null}
                  </View>

                  {signupStep === 1 ? (
                    <>
                      <View style={styles.roleContainer}>
                        {ROLES.map((r) => (
                          <Pressable key={r.key} style={[styles.roleCard, role === r.key && styles.roleCardActive]} onPress={() => setRole(r.key)}>
                            <Text style={[styles.roleLabel, role === r.key && styles.roleLabelActive]}>{r.icon} {r.label}</Text>
                          </Pressable>
                        ))}
                      </View>

                      <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor={themeColors.textMuted} value={name} onChangeText={setName} />
                      <TextInput style={styles.input} placeholder="Email" placeholderTextColor={themeColors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

                      <View style={styles.row}>
                        <TextInput style={[styles.input, { flex: 1, marginRight: spacing.xs }]} placeholder="Password" placeholderTextColor={themeColors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
                        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Confirm" placeholderTextColor={themeColors.textMuted} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
                      </View>

                      <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} onPress={() => {
                        if (!name.trim() || !email.trim() || password.length < 6 || password !== confirmPassword) {
                          setError('Please fill required fields (Min 6 chars password, match confirm)');
                          return;
                        }
                        setError('');
                        setSignupStep(2);
                      }}>
                        <Text style={styles.buttonText}>Next Step</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      {renderRoleSpecificFields()}

                      <View style={[styles.row, { marginTop: spacing.xs }]}>
                        <Pressable style={({ pressed }) => [styles.button, { flex: 1, marginRight: spacing.sm, backgroundColor: themeColors.surfaceLight, borderWidth: 1, borderColor: themeColors.border }, pressed && styles.buttonPressed]} onPress={() => setSignupStep(1)}>
                          <Text style={[styles.buttonText, { color: themeColors.text }]}>Back</Text>
                        </Pressable>

                        <Pressable style={({ pressed }) => [styles.button, { flex: 2 }, pressed && styles.buttonPressed]} onPress={handleSignup} disabled={loading}>
                          {loading ? <ActivityIndicator color={themeColors.background} /> : <Text style={styles.buttonText}>Complete Sign Up</Text>}
                        </Pressable>
                      </View>
                    </>
                  )}

                  {signupStep === 1 && (
                    <Pressable onPress={flipToLogin} style={styles.linkButton}>
                      <Text style={styles.linkText}>Have an account? <Text style={styles.linkTextBold}>Flip to Sign In</Text></Text>
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

const createStyles = (colors, isMobile) => StyleSheet.create({
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
  coinWrapper: {
    // 3D effect container
    shadowColor: colors.primary, // Green glow effect
    shadowOffset: { width: 0, height: 0 }, // 0 offset for a glowing halo on all sides
    shadowOpacity: 1, // maximum opacity for a vibrant glow
    shadowRadius: 50, // increased glow size
    elevation: 60, // increased android glow
    perspective: 1200, // For 3D rotation
    borderRadius: isMobile ? 24 : 9999, // Rectangular on mobile, circular on desktop
    backgroundColor: 'transparent',
  },
  coinFace: {
    width: '100%',
    height: '100%',
    borderRadius: isMobile ? 24 : 9999,
    backgroundColor: colors.surface,
    borderWidth: 7,
    borderColor: colors.border,
    backfaceVisibility: 'hidden',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinInner: {
    width: '100%',
    height: '100%',
    borderRadius: isMobile ? 24 : 9999,
    borderWidth: 5,
    borderColor: 'rgba(0,0,0,0.15)', // Soft inner shadow rim for rounded depth
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'stretch',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoImage: {
    width: 75,
    height: 75,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h2,
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.sm,
    backgroundColor: colors.danger + '20',
    padding: spacing.xs,
    borderRadius: borderRadius.md,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.xs,
    color: colors.text,
    fontSize: 14,
  },
  inputLarge: {
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  passwordInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
  },
  eyeIcon: {
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonLarge: {
    paddingVertical: 14,
    marginTop: spacing.sm,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    ...typography.body,
    fontWeight: 'bold',
    color: colors.background,
    fontSize: 14,
  },
  buttonTextLarge: {
    fontSize: 18,
  },
  linkButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
    padding: spacing.sm,
  },
  linkText: {
    ...typography.bodySmall,
    fontSize: 13,
    color: colors.textSecondary,
  },
  linkTextBold: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  roleCard: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
  },
  roleCardActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  roleLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  roleLabelActive: {
    color: colors.primary,
  },
});
