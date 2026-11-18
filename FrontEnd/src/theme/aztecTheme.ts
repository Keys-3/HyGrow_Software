import { Platform, TextStyle } from 'react-native';

export const colors = {
  // Primary gradient (emerald to blue)
  primary: '#10B981', // emerald
  primaryDark: '#059669',
  primaryLight: '#6EE7B7',

  // Backgrounds (dark theme)
  background: '#0F172A', // deep dark blue
  surface: '#1E293B', // card surface
  surfaceLight: '#334155', // lighter surface (inputs, hover)

  // Text (light for contrast)
  text: '#F8FAFC', // white
  textSecondary: '#94A3B8', // muted gray
  textMuted: '#64748B', // disabled

  // Status (unchanged)
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  // Sensor accent colors (keeping original hues)
  sensor: {
    temperature: '#F97316',
    humidity: '#06B6D4',
    ph: '#A855F7',
    ec: '#3B82F6',
    waterLevel: '#22C55E',
  },

  // Gradients (adjusted for green/blue theme)
  gradients: {
    primary: ['#10B981', '#3B82F6'],
    dashboard: ['#0F172A', '#1E293B'],
    card: ['#1E293B', '#0F172A'],
  },

  border: '#334155',
  overlay: 'rgba(0,0,0,0.5)',
  tabBar: '#0F172A',
  tabBarBorder: '#1E293B',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography: Record<string, TextStyle> = {
  h1: { fontSize: 28, fontWeight: '700', color: colors.text },
  h2: { fontSize: 22, fontWeight: '600', color: colors.text },
  h3: { fontSize: 18, fontWeight: '600', color: colors.text },
  body: { fontSize: 16, fontWeight: '400', color: colors.text },
  bodySmall: { fontSize: 14, fontWeight: '400', color: colors.textSecondary },
  caption: { fontSize: 12, fontWeight: '400', color: colors.textMuted },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  value: { fontSize: 32, fontWeight: '700', color: colors.text },
  unit: { fontSize: 15, fontWeight: '400', color: colors.textSecondary },
};

export const shadows = {
  card: Platform.select({
    web: { boxShadow: '0px 4px 8px rgba(0,0,0,0.3)' },
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  }),
  small: Platform.select({
    web: { boxShadow: '0px 2px 4px rgba(0,0,0,0.2)' },
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  }),
};

const theme = { colors, spacing, borderRadius, typography, shadows };
export default theme;
