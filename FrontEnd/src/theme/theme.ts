/**
 * HyGrow — Nature-Tech SaaS Design System & Tokens
 *
 * Visual Identity: Modern Nature-Tech SaaS
 * - Primary: Deep Forest Green (#0A4D3C / Dark #10B981)
 * - Secondary: Sage Green (#4D7C6F / Dark #84A98C)
 * - Background: Soft Off-White (#F7F9F7 / Dark #0B0C0E)
 * - Cards: Pure White with subtle nature-neutral hairline borders (#E1E8E2)
 * - Typography: Inter / Geist aesthetic with tight negative tracking
 * - Clean minimal data visualization and enterprise component states
 */

import { Platform, TextStyle } from 'react-native';
import useAppStore from '../store/useAppStore';

export const darkColors = {
  leaf: '#2F9E6B',
  sage: '#35513F',
  sage2: '#2A4435',
  activeTint: '#1F3A2E',
  purple: '#A855F7',
  purpleTint: '#2A1B3B',
  // Brand accents: Deep Nature Forest to Emerald
  primary: '#A9BD9B', // Muted sage accent from the light palette
  primaryDark: '#789377',
  primaryLight: '#C0D0B4',
  primaryGlow: 'rgba(169, 189, 155, 0.18)',
  action: '#A9BD9B',
  actionText: '#111914',
  
  secondary: '#84A98C', // Sage green
  secondaryDark: '#52796F',
  secondaryLight: '#A3B18A',

  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#38BDF8',
  
  // Charcoal backgrounds and translucent surfaces
  globalBackground: ['#0D1511', '#0D1511', '#0D1511'] as const,
  background: '#0D1511',
  ambientGlow: 'rgba(0, 0, 0, 0)',
  
  // Elevated Surfaces
  surface: '#15221B',
  surfaceLight: '#1F3A2E',
  surfaceMuted: '#15221B',
  surfaceGlass: 'rgba(21, 34, 27, 0.94)',
  
  // Text
  text: '#EAF2EC',
  textSecondary: '#B9C9BE',
  textMuted: '#9DB0A5',
  
  // Borders and dividers
  border: '#243429',
  borderStrong: '#35513F',
  borderActive: '#10B981',
  card: '#15221B',
  cardBackground: '#15221B',
  overlay: 'rgba(0, 0, 0, 0.75)',
  tabBar: 'rgba(21, 34, 27, 0.93)',
  tabBarBorder: '#243429',

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
    primary: ['#0D1511', '#15221B'],
    primaryVertical: ['#15221B', '#0D1511'],
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
    default: ['#15221B', '#0D1511'],
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
  leaf: '#2F9E6B',
  sage: '#A9BD9B',
  sage2: '#8FA881',
  activeTint: '#D9E6E0',
  purple: '#A855F7',
  purpleTint: '#F1E4FD',
  // Brand accents: Deep Forest Green
  primary: '#0E4F3B', // Deep forest green from the AI Tools reference
  primaryDark: '#0A3E2F',
  primaryLight: '#2F9E6B',
  primaryGlow: 'rgba(14, 79, 59, 0.14)',
  
  // Secondary: Sage Green
  secondary: '#A9BD9B', // Sage panel tone from the AI Tools reference
  secondaryDark: '#8FA881',
  secondaryLight: '#8FA881',

  action: '#E8412C',
  actionText: '#050D08',

  success: '#0A5C44',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#0284C7',
  
  // Backgrounds: Soft Off-White Nature Ceramic
  globalBackground: ['#F6F4EF', '#F6F4EF'] as const,
  background: '#F6F4EF', // Warm off-white from the AI Tools reference
  ambientGlow: 'rgba(10, 77, 60, 0.06)',
  
  // Elevated Surfaces
  surface: '#FFFFFF', // Pure white
  surfaceLight: '#F0EFE8', // Warm tint derived from off-white
  surfaceMuted: '#D9E6E0', // Pale sage surface
  surfaceGlass: 'rgba(247, 245, 239, 0.96)',
  
  // Text
  text: '#10241B', // Organic ink from the AI Tools reference
  textSecondary: '#5D6B63',
  textMuted: '#5D6B63',
  
  // Borders & Dividers
  border: '#E3E0D6', // Warm nature-neutral hairline border
  borderStrong: '#BFC7B7',
  borderActive: '#0A4D3C',
  card: '#FFFFFF',
  cardBackground: '#FFFFFF',
  overlay: 'rgba(10, 25, 18, 0.45)',
  tabBar: 'rgba(255, 255, 255, 0.96)',
  tabBarBorder: '#D9DDD2',

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
    default: ['#FFFFFF', '#F7F5EF'],
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
  return {
    ...(isDarkMode ? darkColors : lightColors),
    isDarkMode,
    adapt: (darkValue: string, lightValue: string) => isDarkMode ? darkValue : lightValue,
  };
}

const theme = { colors, darkColors, lightColors, spacing, borderRadius, typography, shadows };
export default theme;
