const fonts = {
  heading: '"Space Grotesk", system-ui, sans-serif',
  body: '"Manrope", system-ui, sans-serif',
} as const;

const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

const radii = {
  sm: '0',
  md: '0',
  lg: '0',
  xl: '0',
  pill: '0',
} as const;

const shadows = {
  soft: '0 20px 50px rgba(74, 14, 28, 0.08)',
  card: '0 8px 28px rgba(26, 10, 10, 0.06)',
  float: '0 24px 60px rgba(74, 14, 28, 0.14)',
} as const;

const darkShadows = {
  soft: '0 20px 50px rgba(0, 0, 0, 0.35)',
  card: '0 8px 28px rgba(0, 0, 0, 0.28)',
  float: '0 24px 60px rgba(0, 0, 0, 0.45)',
} as const;

const space = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '24px',
  6: '32px',
  7: '48px',
} as const;

const lightColors = {
  // Primary — deep burgundy / coral system (101 GenAI–inspired)
  primary: '#8B1E3A',
  primaryLight: '#C43B5A',
  primaryDark: '#4A0E1C',
  primaryTint: '#F8E8EC',

  // Secondary accents
  secondary: '#E85A4F',
  secondaryLight: '#F5A07A',
  peach: '#F5D5C0',
  peachSoft: '#FAE8DC',
  coral: '#E8705A',
  cream: '#F7F1EB',

  // Status
  success: '#22C55E',
  successTint: '#DCFCE7',
  warning: '#F59E0B',
  warningTint: '#FEF3C7',
  danger: '#DC2626',
  dangerTint: '#FEE2E2',
  info: '#3B82F6',
  infoTint: '#DBEAFE',

  // Text
  textPrimary: '#1A0A0A',
  textSecondary: '#6B5B5B',
  textMuted: '#9A8A8A',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: 'rgba(255, 255, 255, 0.72)',

  // Borders & backgrounds
  border: '#E8D9D0',
  borderStrong: '#D4BDB0',
  background: '#F7F1EB',
  surface: '#FFFFFF',
  ink: '#140808',
  maroon: '#4A0E1C',
  maroonDeep: '#3D0A16',

  // CTA fills — stay deep burgundy in every mode (not remapped like maroon text)
  action: '#4A0E1C',
  actionDeep: '#3D0A16',
  onAction: '#FFFFFF',

  // Translucent chrome (sticky bars, chat chrome)
  chrome: 'rgba(247, 241, 235, 0.92)',
  chromeStrong: 'rgba(247, 241, 235, 0.98)',
  chromeMuted: 'rgba(247, 241, 235, 0.86)',
  overlay: 'rgba(26, 10, 10, 0.45)',
  glowWarm: 'rgba(245, 160, 122, 0.14)',
  glowAccent: 'rgba(196, 59, 90, 0.08)',
} as const;

const darkColors = {
  primary: '#C43B5A',
  primaryLight: '#E07085',
  primaryDark: '#8B1E3A',
  primaryTint: '#2A1218',

  secondary: '#E85A4F',
  secondaryLight: '#F5A07A',
  peach: '#3D2A24',
  peachSoft: '#2A1C18',
  coral: '#E8705A',
  cream: '#1A1010',

  success: '#4ADE80',
  successTint: '#14532D',
  warning: '#FBBF24',
  warningTint: '#422006',
  danger: '#F87171',
  dangerTint: '#450A0A',
  info: '#60A5FA',
  infoTint: '#1E3A5F',

  textPrimary: '#F7F1EB',
  textSecondary: '#C4B0B0',
  textMuted: '#8A7575',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: 'rgba(255, 255, 255, 0.72)',

  border: '#3A2828',
  borderStrong: '#4A3535',
  background: '#0F0808',
  surface: '#1A1010',
  ink: '#F7F1EB',
  // Headings / brand text on dark — warm peach, not deep maroon
  maroon: '#F5D5C0',
  maroonDeep: '#E8C4B0',

  // CTA fills stay saturated so primary buttons stay readable
  action: '#C43B5A',
  actionDeep: '#8B1E3A',
  onAction: '#FFFFFF',

  chrome: 'rgba(15, 8, 8, 0.92)',
  chromeStrong: 'rgba(15, 8, 8, 0.98)',
  chromeMuted: 'rgba(15, 8, 8, 0.86)',
  overlay: 'rgba(0, 0, 0, 0.55)',
  glowWarm: 'rgba(232, 112, 90, 0.1)',
  glowAccent: 'rgba(196, 59, 90, 0.08)',
} as const;

export const lightTheme = {
  mode: 'light' as ColorMode,
  colors: lightColors,
  fonts,
  fontWeights,
  radii,
  shadows,
  space,
};

export const darkTheme = {
  mode: 'dark' as ColorMode,
  colors: darkColors,
  fonts,
  fontWeights,
  radii,
  shadows: darkShadows,
  space,
};

/** Default / light theme — kept as `theme` for existing imports. */
export const theme = lightTheme;

type ThemeColors = { [K in keyof typeof lightColors]: string };
type ThemeShadows = { [K in keyof typeof shadows]: string };

export type AppTheme = {
  mode: ColorMode;
  colors: ThemeColors;
  fonts: typeof fonts;
  fontWeights: typeof fontWeights;
  radii: typeof radii;
  shadows: ThemeShadows;
  space: typeof space;
};

export type ColorMode = 'light' | 'dark';
export type ThemePreference = ColorMode | 'system';

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends AppTheme {}
}
