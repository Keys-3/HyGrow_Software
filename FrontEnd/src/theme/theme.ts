/**
 * HyGrow — Design System & Theme
 *
 * Inspired by Linear, Stripe, Framer, and Apple:
 * - Obsidian dark backgrounds with emerald & electric cyan glows
 * - Clean ceramic light backgrounds with crisp slate typography
 * - Hairline borders with glassmorphism & ambient shadows
 */

import { Platform, TextStyle } from 'react-native';
import useAppStore from '../store/useAppStore';

export const darkColors = {
  // Brand accents (Emerald to Electric Cyan)
  primary: '#10B981', // Emerald 500
  primaryDark: '#059669', // Emerald 600
  primaryLight: '#34D399', // Emerald 400
  primaryGlow: 'rgba(16, 185, 129, 0.25)',
  
  secondary: '#0EA5E9', // Sky 500
  secondaryDark: '#0284C7',
  secondaryLight: '#38BDF8',

  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#0EA5E9',
  
  // Backgrounds (Deep Obsidian Dark)
  globalBackground: ['#090D16', '#0F172A'], 
  background: '#090D16', // Obsidian Dark
  
  // Elevated Surfaces
  surface: '#111827', // Slate 900
  surfaceLight: '#1E293B', // Slate 800
  surfaceMuted: '#0D131F', // Deep inset
  surfaceGlass: 'rgba(17, 24, 39, 0.85)',
  
  // Text
  text: '#F8FAFC', // Pure white
  textSecondary: '#94A3B8', // Slate 400
  textMuted: '#64748B', // Slate 500
  
  // Borders & Dividers
  border: 'rgba(255, 255, 255, 0.08)', // Hairline glass border
  borderStrong: 'rgba(255, 255, 255, 0.15)',
  borderActive: '#10B981',
  card: '#111827',
  overlay: 'rgba(0, 0, 0, 0.65)',
  tabBar: 'rgba(9, 13, 22, 0.95)',
  tabBarBorder: 'rgba(255, 255, 255, 0.07)',

  // Sensor accent colors
  sensor: {
    temperature: '#F97316',
    humidity: '#06B6D4',
    ph: '#A855F7',
    ec: '#3B82F6',
    waterLevel: '#10B981',
    lightIntensity: '#F59E0B',
    vpd: '#EC4899',
    waterTemp: '#0284C7',
    co2: '#14B8A6',
  },
  
  // Gradients
  gradients: {
    primary: ['#10B981', '#0EA5E9'],
    primaryVertical: ['#10B981', '#059669'],
    heroGlow: ['rgba(16, 185, 129, 0.15)', 'rgba(14, 165, 233, 0.03)', 'transparent'],
    temperature: ['#F97316', '#EA580C'],
    humidity: ['#06B6D4', '#0284C7'],
    ph: ['#A855F7', '#7E22CE'],
    ec: ['#3B82F6', '#1D4ED8'],
    waterLevel: ['#10B981', '#059669'],
    lightIntensity: ['#F59E0B', '#B45309'],
    vpd: ['#EC4899', '#BE185D'],
    waterTemp: ['#0284C7', '#0369A1'],
    co2: ['#14B8A6', '#0F766E'],
  },

  // Deep Gradient Card Backgrounds
  cardGradients: {
    default: ['#111827', '#0F172A'],
    temperature: ['rgba(249, 115, 22, 0.12)', 'rgba(234, 88, 12, 0.03)'],
    humidity: ['rgba(6, 182, 212, 0.12)', 'rgba(2, 132, 199, 0.03)'],
    ph: ['rgba(168, 85, 247, 0.12)', 'rgba(126, 34, 206, 0.03)'],
    ec: ['rgba(59, 130, 246, 0.12)', 'rgba(29, 78, 216, 0.03)'],
    waterLevel: ['rgba(16, 185, 129, 0.12)', 'rgba(5, 150, 105, 0.03)'],
    lightIntensity: ['rgba(245, 158, 11, 0.12)', 'rgba(180, 83, 9, 0.03)'],
    vpd: ['rgba(236, 72, 153, 0.12)', 'rgba(190, 24, 93, 0.03)'],
    waterTemp: ['rgba(2, 132, 199, 0.12)', 'rgba(3, 105, 161, 0.03)'],
    co2: ['rgba(20, 184, 166, 0.12)', 'rgba(15, 118, 110, 0.03)'],
  },

  successLight: 'rgba(16, 185, 129, 0.15)',
  warningLight: 'rgba(245, 158, 11, 0.15)',
  dangerLight: 'rgba(239, 68, 68, 0.15)',
  infoLight: 'rgba(14, 165, 233, 0.15)',
  
  successDark: '#10B981',
  warningDark: '#F59E0B',
  dangerDark: '#EF4444',
  dangerBorder: 'rgba(239, 68, 68, 0.35)',
};

export const lightColors = {
  primary: '#10B981',
  primaryDark: '#047857',
  primaryLight: '#34D399',
  primaryGlow: 'rgba(16, 185, 129, 0.2)',
  
  secondary: '#0EA5E9',
  secondaryDark: '#0284C7',
  secondaryLight: '#38BDF8',

  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#0EA5E9',
  
  // Backgrounds (Crisp Ceramic Light)
  globalBackground: ['#F8FAFC', '#EEF2F6'], 
  background: '#F8FAFC', // Slate 50
  
  // Elevated Surfaces
  surface: '#FFFFFF', // Pure white
  surfaceLight: '#F1F5F9', // Slate 100
  surfaceMuted: '#F8FAFC',
  surfaceGlass: 'rgba(255, 255, 255, 0.92)',
  
  // Text
  text: '#0F172A', // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#94A3B8', // Slate 400
  
  // Borders & Dividers
  border: '#E2E8F0', // Slate 200
  borderStrong: '#CBD5E1', // Slate 300
  borderActive: '#10B981',
  card: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.45)',
  tabBar: 'rgba(255, 255, 255, 0.95)',
  tabBarBorder: '#E2E8F0',

  sensor: {
    temperature: '#F97316',
    humidity: '#0EA5E9',
    ph: '#A855F7',
    ec: '#3B82F6',
    waterLevel: '#10B981',
    lightIntensity: '#F59E0B',
    vpd: '#EC4899',
    waterTemp: '#0284C7',
    co2: '#14B8A6',
  },
  
  gradients: {
    primary: ['#10B981', '#0EA5E9'],
    primaryVertical: ['#10B981', '#059669'],
    heroGlow: ['rgba(16, 185, 129, 0.12)', 'rgba(14, 165, 233, 0.02)', 'transparent'],
    temperature: ['#F97316', '#EA580C'],
    humidity: ['#0EA5E9', '#0284C7'],
    ph: ['#A855F7', '#7E22CE'],
    ec: ['#3B82F6', '#1D4ED8'],
    waterLevel: ['#10B981', '#059669'],
    lightIntensity: ['#F59E0B', '#B45309'],
    vpd: ['#EC4899', '#BE185D'],
    waterTemp: ['#0284C7', '#0369A1'],
    co2: ['#14B8A6', '#0F766E'],
  },

  cardGradients: {
    default: ['#FFFFFF', '#F8FAFC'], 
    temperature: ['rgba(249, 115, 22, 0.08)', 'rgba(249, 115, 22, 0.01)'],
    humidity: ['rgba(14, 165, 233, 0.08)', 'rgba(14, 165, 233, 0.01)'],
    ph: ['rgba(168, 85, 247, 0.08)', 'rgba(168, 85, 247, 0.01)'],
    ec: ['rgba(59, 130, 246, 0.08)', 'rgba(59, 130, 246, 0.01)'],
    waterLevel: ['rgba(16, 185, 129, 0.08)', 'rgba(16, 185, 129, 0.01)'],
    lightIntensity: ['rgba(245, 158, 11, 0.08)', 'rgba(245, 158, 11, 0.01)'],
    vpd: ['rgba(236, 72, 153, 0.08)', 'rgba(236, 72, 153, 0.01)'],
    waterTemp: ['rgba(2, 132, 199, 0.08)', 'rgba(2, 132, 199, 0.01)'],
    co2: ['rgba(20, 184, 166, 0.08)', 'rgba(20, 184, 166, 0.01)'],
  },

  successLight: 'rgba(16, 185, 129, 0.12)',
  warningLight: 'rgba(245, 158, 11, 0.12)',
  dangerLight: 'rgba(239, 68, 68, 0.12)',
  infoLight: 'rgba(14, 165, 233, 0.12)',
  
  successDark: '#047857',
  warningDark: '#B45309',
  dangerDark: '#B91C1C',
  dangerBorder: 'rgba(239, 68, 68, 0.25)',
};

export const colors = lightColors;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  hero: 64,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
};

export const typography: Record<string, TextStyle> = {
  display: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1.2,
    lineHeight: 48,
  },
  h1: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  h4: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  value: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
  },
};

export const shadows = {
  card: Platform.select({
    web: {
      boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
    },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 4,
    },
  }),
  cardHover: Platform.select({
    web: {
      boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.14), 0 4px 12px -2px rgba(0, 0, 0, 0.06)',
    },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 8,
    },
  }),
  small: Platform.select({
    web: {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
  }),
  glow: (color: string) =>
    Platform.select({
      web: {
        boxShadow: `0 0 24px ${color}30`,
      },
      default: {
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 6,
      },
    }),
};

export function useThemeColors() {
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  return isDarkMode ? darkColors : lightColors;
}

const theme = { colors, darkColors, lightColors, spacing, borderRadius, typography, shadows };
export default theme;
