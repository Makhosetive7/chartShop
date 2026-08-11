import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeModeProvider, useThemeMode } from '@/theme';
import { ThemePreferencePicker } from '@/components/ui/ThemePreferencePicker';

const authState = vi.hoisted(() => ({
  isAuthenticated: true,
}));

vi.mock('@/auth', () => ({
  useAuth: () => ({
    isAuthenticated: authState.isAuthenticated,
  }),
}));

function ModeLabel() {
  const { mode, preference } = useThemeMode();
  return (
    <span data-testid="mode">
      {preference}:{mode}
    </span>
  );
}

describe('theme mode', () => {
  beforeEach(() => {
    localStorage.clear();
    authState.isAuthenticated = true;
  });

  it('applies an explicit preference from settings when signed in', async () => {
    const user = userEvent.setup();
    render(
      <ThemeModeProvider>
        <ModeLabel />
        <ThemePreferencePicker />
      </ThemeModeProvider>,
    );

    await user.click(screen.getByRole('radio', { name: /dark/i }));
    expect(screen.getByTestId('mode')).toHaveTextContent('dark:dark');
    expect(localStorage.getItem('chartshop_theme')).toBe('dark');
  });

  it('forces light mode for guests even if dark is stored', () => {
    localStorage.setItem('chartshop_theme', 'dark');
    authState.isAuthenticated = false;

    render(
      <ThemeModeProvider>
        <ModeLabel />
      </ThemeModeProvider>,
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('dark:light');
  });
});
