export const theme = {
  colors: {
    // Primary
    primary: '#E31258',
    primaryLight: '#FF477E',
    primaryDark: '#B00E46',
    primaryTint: '#FFE4EC',

    // Secondary
    secondary: '#6366F1',
    secondaryLight: '#818CF8',

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
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',

    // Borders & backgrounds
    border: '#F3D6E0',
    borderStrong: '#E5B8C7',
    background: '#FFF8FA',
    surface: '#FFFFFF',
  },
  fonts: {
    heading: '"Poppins", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
  },
  fontWeights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  radii: {
    sm: '6px',
    md: '10px',
    lg: '16px',
  },
  shadows: {
    soft: '0 10px 30px rgba(227, 18, 88, 0.08)',
    card: '0 4px 16px rgba(17, 24, 39, 0.06)',
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
