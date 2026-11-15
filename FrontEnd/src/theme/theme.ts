/**
 * HyGrow — Nature-Tech SaaS Design System & Tokens
 *
 * Visual Identity: Modern Nature-Tech SaaS
 * - Primary: Deep Forest Green (#0A4D3C / Dark #10B981)
 * - Secondary: Sage Green (#4D7C6F / Dark #84A98C)
 * - Background: Soft Off-White (#F7F9F7 / Dark #0B130E)
 * - Cards: Pure White with subtle nature-neutral hairline borders (#E1E8E2)
 * - Typography: Inter / Geist aesthetic with tight negative tracking
 * - Clean minimal data visualization and enterprise component states
 */

import { Platform, TextStyle } from 'react-native';
import useAppStore from '../store/useAppStore';

export const darkColors = {
  // Brand accents: Deep Nature Forest to Emerald
  primary: '#10B981', // Crisp emerald on dark
  primaryDark: '#059669',
  primaryLight: '#34D399',
  primaryGlow: 'rgba(16, 185, 129, 0.22)',
  
  secondary: '#84A98C', // Sage green
  secondaryDark: '#52796F',
  secondaryLight: '#A3B18A',

  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#38BDF8',
  
  // Backgrounds: Organic Obsidian Slate (identical to cinematic landing page)
  globalBackground: ['#08120D', '#0B1710', '#070D09'], 
  background: '#08120D', // Nature Obsidian
  
  // Elevated Surfaces
  surface: '#0E1A13', // Deep forest card
  surfaceLight: '#14251B', // Sage-tinted card surface
  surfaceMuted: '#070E0A',
  surfaceGlass: 'rgba(14, 26, 19, 0.88)',
  
  // Text
  text: '#F8FAF8', // Pure crisp white
  textSecondary: '#9CB0A2', // Muted sage slate
  textMuted: '#687D70', // Subtle slate
  
  // Borders & Dividers with Emerald Luminosity
  border: 'rgba(52, 211, 153, 0.16)',
  borderStrong: 'rgba(52, 211, 153, 0.28)',
  borderActive: '#10B981',
  card: '#0E1A13',
  cardBackground: '#0E1A13',
  overlay: 'rgba(0, 0, 0, 0.75)',
  tabBar: 'rgba(8, 18, 13, 0.96)',
  tabBarBorder: 'rgba(52, 211, 153, 0.16)',

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
  
  // Refined Gradients
  gradients: {
    primary: ['#0A4D3C', '#10B981'],
    primaryVertical: ['#10B981', '#059669'],
    heroGlow: ['rgba(16, 185, 129, 0.15)', 'rgba(132, 169, 140, 0.04)', 'transparent'],
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

  cardGradients: {
    default: ['#0E1A13', '#070E0A'],
    temperature: ['rgba(249, 115, 22, 0.12)', 'rgba(234, 88, 12, 0.02)'],
    humidity: ['rgba(6, 182, 212, 0.12)', 'rgba(2, 132, 199, 0.02)'],
    ph: ['rgba(168, 85, 247, 0.12)', 'rgba(126, 34, 206, 0.02)'],
    ec: ['rgba(59, 130, 246, 0.12)', 'rgba(29, 78, 216, 0.02)'],
    waterLevel: ['rgba(16, 185, 129, 0.12)', 'rgba(5, 150, 105, 0.02)'],
    lightIntensity: ['rgba(245, 158, 11, 0.12)', 'rgba(180, 83, 9, 0.02)'],
    vpd: ['rgba(236, 72, 153, 0.12)', 'rgba(190, 24, 93, 0.02)'],
    waterTemp: ['rgba(2, 132, 199, 0.12)', 'rgba(3, 105, 161, 0.02)'],
    co2: ['rgba(20, 184, 166, 0.12)', 'rgba(15, 118, 110, 0.02)'],
  },

  successLight: 'rgba(16, 185, 129, 0.15)',
  warningLight: 'rgba(245, 158, 11, 0.15)',
  dangerLight: 'rgba(239, 68, 68, 0.15)',
  infoLight: 'rgba(56, 189, 248, 0.15)',
  
  successDark: '#10B981',
  warningDark: '#F59E0B',
  dangerDark: '#EF4444',
  dangerBorder: 'rgba(239, 68, 68, 0.35)',
};

export const lightColors = {
  // Brand accents: Deep Forest Green
  primary: '#0A4D3C', // Deep forest green
  primaryDark: '#06372B', // Dark forest shade
  primaryLight: '#136F58', // Foliage green
  primaryGlow: 'rgba(10, 77, 60, 0.15)',
  
  // Secondary: Sage Green
  secondary: '#4D7C6F', // Elegant sage green
  secondaryDark: '#385F54',
  secondaryLight: '#6E9C90',

  success: '#0A5C44',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#0284C7',
  
  // Backgrounds: Soft Off-White Nature Ceramic
  globalBackground: ['#F7F9F7', '#EDF2EE'], 
  background: '#F7F9F7', // Soft off-white
  
  // Elevated Surfaces
  surface: '#FFFFFF', // Pure white
  surfaceLight: '#F0F4F1', // Subtle sage-tinted light surface
  surfaceMuted: '#F5F8F5',
  surfaceGlass: 'rgba(255, 255, 255, 0.94)',
  
  // Text
  text: '#111914', // Deep organic slate
  textSecondary: '#4A5D52', // Sage-slate secondary
  textMuted: '#7D9184', // Subtle sage muted
  
  // Borders & Dividers
  border: '#E1E8E2', // Subtle nature hairline border
  borderStrong: '#CAD4CB',
  borderActive: '#0A4D3C',
  card: '#FFFFFF',
  cardBackground: '#FFFFFF',
  overlay: 'rgba(10, 25, 18, 0.45)',
  tabBar: 'rgba(255, 255, 255, 0.96)',
  tabBarBorder: '#E1E8E2',

  sensor: {
    temperature: '#EA580C',
    humidity: '#0284C7',
    ph: '#7C3AED',
    ec: '#2563EB',
    waterLevel: '#0A4D3C',
    lightIntensity: '#D97706',
    vpd: '#DB2777',
    waterTemp: '#0EA5E9',
    co2: '#0D9488',
  },
  
  gradients: {
    primary: ['#0A4D3C', '#1E6B55'],
    primaryVertical: ['#0A4D3C', '#06372B'],
    heroGlow: ['rgba(10, 77, 60, 0.12)', 'rgba(77, 124, 111, 0.03)', 'transparent'],
    temperature: ['#EA580C', '#C2410C'],
    humidity: ['#0284C7', '#0369A1'],
    ph: ['#7C3AED', '#6D28D9'],
    ec: ['#2563EB', '#1D4ED8'],
    waterLevel: ['#0A4D3C', '#136F58'],
    lightIntensity: ['#D97706', '#B45309'],
    vpd: ['#DB2777', '#BE185D'],
    waterTemp: ['#0EA5E9', '#0284C7'],
    co2: ['#0D9488', '#0F766E'],
  },

  cardGradients: {
    default: ['#FFFFFF', '#F7F9F7'], 
    temperature: ['rgba(234, 88, 12, 0.06)', 'rgba(234, 88, 12, 0.01)'],
    humidity: ['rgba(2, 132, 199, 0.06)', 'rgba(2, 132, 199, 0.01)'],
    ph: ['rgba(124, 58, 237, 0.06)', 'rgba(124, 58, 237, 0.01)'],
    ec: ['rgba(37, 99, 235, 0.06)', 'rgba(37, 99, 235, 0.01)'],
    waterLevel: ['rgba(10, 77, 60, 0.06)', 'rgba(10, 77, 60, 0.01)'],
    lightIntensity: ['rgba(217, 119, 6, 0.06)', 'rgba(217, 119, 6, 0.01)'],
    vpd: ['rgba(219, 39, 119, 0.06)', 'rgba(219, 39, 119, 0.01)'],
    waterTemp: ['rgba(14, 165, 233, 0.06)', 'rgba(14, 165, 233, 0.01)'],
    co2: ['rgba(13, 148, 136, 0.06)', 'rgba(13, 148, 136, 0.01)'],
  },

  successLight: 'rgba(10, 77, 60, 0.10)',
  warningLight: 'rgba(217, 119, 6, 0.10)',
  dangerLight: 'rgba(220, 38, 38, 0.10)',
  infoLight: 'rgba(2, 132, 199, 0.10)',
  
  successDark: '#0A4D3C',
  warningDark: '#B45309',
  dangerDark: '#991B1B',
  dangerBorder: 'rgba(220, 38, 38, 0.25)',
};

export const colors = darkColors;

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
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  full: 9999,
};

export const typography: Record<string, TextStyle> = {
  display: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1.2,
    lineHeight: 46,
  },
  h1: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.7,
    lineHeight: 36,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  h4: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  unit: {
    fontSize: 13,
    fontWeight: '600',
  },
};

export const shadows = {
  card: Platform.select({
    web: {
      boxShadow: '0 1px 3px 0 rgba(10, 25, 18, 0.04), 0 1px 2px -1px rgba(10, 25, 18, 0.04)',
    },
    default: {
      shadowColor: '#0A1912',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
  }),
  cardHover: Platform.select({
    web: {
      boxShadow: '0 4px 16px -2px rgba(10, 25, 18, 0.08), 0 2px 6px -1px rgba(10, 25, 18, 0.04)',
    },
    default: {
      shadowColor: '#0A1912',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 10,
      elevation: 4,
    },
  }),
  small: Platform.select({
    web: {
      boxShadow: '0 1px 2px 0 rgba(10, 25, 18, 0.03)',
    },
    default: {
      shadowColor: '#0A1912',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
  }),
  glow: (color: string) =>
    Platform.select({
      web: {
        boxShadow: `0 0 20px ${color}25`,
      },
      default: {
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
};

export function useThemeColors() {
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  return isDarkMode ? darkColors : lightColors;
}

const theme = { colors, darkColors, lightColors, spacing, borderRadius, typography, shadows };
export default theme;
