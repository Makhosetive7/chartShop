import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ThemeProvider } from 'styled-components';
import { useAuth } from '@/auth';
import {
  darkTheme,
  lightTheme,
  type ColorMode,
  type ThemePreference,
} from '@/styles/theme';
import { ThemeModeContext } from './theme-mode-context';

const STORAGE_KEY = 'chartshop_theme';

function readStoredPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    // ignore
  }
  return 'system';
}

function getSystemMode(): ColorMode {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function resolveMode(preference: ThemePreference): ColorMode {
  return preference === 'system' ? getSystemMode() : preference;
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [preference, setPreferenceState] =
    useState<ThemePreference>(readStoredPreference);
  const [systemMode, setSystemMode] = useState<ColorMode>(getSystemMode);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      setSystemMode(mq.matches ? 'dark' : 'light');
    };
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Theme switching is a signed-in feature; guests always see light.
  const mode: ColorMode = isAuthenticated
    ? preference === 'system'
      ? systemMode
      : preference
    : 'light';

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const toggleMode = useCallback(() => {
    setPreference(resolveMode(preference) === 'dark' ? 'light' : 'dark');
  }, [preference, setPreference]);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const theme = mode === 'dark' ? darkTheme : lightTheme;

  const value = useMemo(
    () => ({ preference, mode, setPreference, toggleMode }),
    [preference, mode, setPreference, toggleMode],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
