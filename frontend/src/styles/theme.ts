export const theme = {
  colors: {
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
  },
  fonts: {
    heading: '"Space Grotesk", system-ui, sans-serif',
    body: '"Manrope", system-ui, sans-serif',
  },
  fontWeights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  radii: {
    sm: '0',
    md: '0',
    lg: '0',
    xl: '0',
    pill: '0',
  },
  shadows: {
    soft: '0 20px 50px rgba(74, 14, 28, 0.08)',
    card: '0 8px 28px rgba(26, 10, 10, 0.06)',
    float: '0 24px 60px rgba(74, 14, 28, 0.14)',
  },
  space: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '24px',
    6: '32px',
    7: '48px',
  },
} as const;

export type AppTheme = typeof theme;

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends AppTheme {}
}
