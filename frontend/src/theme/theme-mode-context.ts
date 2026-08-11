import { createContext } from 'react';
import type { ColorMode, ThemePreference } from '@/styles/theme';

export type ThemeModeState = {
  /** Stored preference: light, dark, or follow system. */
  preference: ThemePreference;
  /** Resolved light/dark after applying system preference. */
  mode: ColorMode;
  setPreference: (preference: ThemePreference) => void;
  /** Flip between light and dark (sets an explicit preference). */
  toggleMode: () => void;
};

export const ThemeModeContext = createContext<ThemeModeState | null>(null);
