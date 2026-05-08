export type ThemeName = 'dark' | 'light' | 'monochrome';

export const themes: Record<ThemeName, {
  background: string;
  surface: string;
  surfaceAlt: string;
  primary: string;
  success: string;
  warning: string;
  danger: string;
  text: string;
  textSecondary: string;
  border: string;
  envelopeMandatory: string;
  envelopeNonMandatory: string;
  envelopeInvestments: string;
  envelopeDreams: string;
}> = {
  dark: {
    background: '#0A0A0A',
    surface: '#141414',
    surfaceAlt: '#1E1E1E',
    primary: '#6366F1',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    text: '#F5F5F5',
    textSecondary: '#A3A3A3',
    border: '#262626',
    envelopeMandatory: '#6366F1',
    envelopeNonMandatory: '#22C55E',
    envelopeInvestments: '#F59E0B',
    envelopeDreams: '#EC4899',
  },
  light: {
    background: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceAlt: '#F0F0F0',
    primary: '#4F46E5',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    text: '#171717',
    textSecondary: '#737373',
    border: '#E5E5E5',
    envelopeMandatory: '#4F46E5',
    envelopeNonMandatory: '#16A34A',
    envelopeInvestments: '#D97706',
    envelopeDreams: '#EC4899',
  },
  monochrome: {
    background: '#0A0A0A',
    surface: '#141414',
    surfaceAlt: '#1E1E1E',
    primary: '#A3A3A3',
    success: '#D4D4D4',
    warning: '#A3A3A3',
    danger: '#737373',
    text: '#F5F5F5',
    textSecondary: '#737373',
    border: '#262626',
    envelopeMandatory: '#D4D4D4',
    envelopeNonMandatory: '#A3A3A3',
    envelopeInvestments: '#737373',
    envelopeDreams: '#525252',
  },
};

export type ThemeColors = typeof themes.dark;

export const colors = themes.dark;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const fontSize = { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, xxl: 36 };
