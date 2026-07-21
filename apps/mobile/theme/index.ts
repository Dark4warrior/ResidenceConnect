/**
 * Design system ResidenceConnect — tokens centralisés.
 * Toute couleur / espacement / rayon / typographie doit venir d'ici
 * pour garantir une UI cohérente sur toute l'application.
 */

export const colors = {
  // Marque
  primary: '#1E3A5F',
  primaryDark: '#16293F',
  primaryLight: '#2D5280',
  primarySoft: '#EEF2F7', // fond léger teinté marque

  // Accent
  accent: '#3B82F6',

  // Fonds
  background: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',

  // Texte
  text: '#0F172A',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  textOnPrimary: '#FFFFFF',

  // Bordures
  border: '#E2E8F0',

  // États
  success: '#22C55E',
  successSoft: '#DCFCE7',
  warning: '#F59E0B',
  danger: '#EF4444',
  dangerSoft: '#FEF2F2',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 14,
  base: 16,
  lg: 18,
  xl: 22,
  xxl: 26,
  display: 30,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  brand: {
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export const theme = { colors, spacing, radius, fontSize, fontWeight, shadow };
export type Theme = typeof theme;
