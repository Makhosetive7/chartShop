import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { ThemeProvider } from 'styled-components';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '@/styles/theme';
import {
  BACK_TO_TOP_VIEWPORT_RATIO,
  getBackToTopThreshold,
  getScrollProgress,
  isScrollChromeRoute,
  shouldShowBackToTop,
} from './scrollChrome';
import { ScrollProgressBar } from './ScrollProgressBar';
import { BackToTop } from './BackToTop';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('scrollChrome helpers', () => {
  it('returns 0 when content fits the viewport', () => {
    expect(getScrollProgress(0, 800, 800)).toBe(0);
    expect(getScrollProgress(100, 800, 800)).toBe(0);
  });

  it('maps scroll position to 0–1 progress', () => {
    expect(getScrollProgress(0, 2000, 1000)).toBe(0);
    expect(getScrollProgress(500, 2000, 1000)).toBe(0.5);
    expect(getScrollProgress(1000, 2000, 1000)).toBe(1);
    expect(getScrollProgress(1500, 2000, 1000)).toBe(1);
  });

  it('enables scroll chrome on homepage only', () => {
    expect(isScrollChromeRoute('/')).toBe(true);
    expect(isScrollChromeRoute('/login')).toBe(false);
    expect(isScrollChromeRoute('/register')).toBe(false);
    expect(isScrollChromeRoute('/recover')).toBe(false);
    expect(isScrollChromeRoute('/setup')).toBe(false);
  });

  it('computes back-to-top threshold from viewport height', () => {
    expect(getBackToTopThreshold(1000)).toBe(Math.round(1000 * BACK_TO_TOP_VIEWPORT_RATIO));
    expect(getBackToTopThreshold(667)).toBe(Math.round(667 * BACK_TO_TOP_VIEWPORT_RATIO));
  });

  it('shows back-to-top past the viewport threshold', () => {
    const viewport = 1000;
    const threshold = getBackToTopThreshold(viewport);

    expect(shouldShowBackToTop(0, viewport)).toBe(false);
    expect(shouldShowBackToTop(threshold - 1, viewport)).toBe(false);
    expect(shouldShowBackToTop(threshold, viewport)).toBe(true);
    expect(shouldShowBackToTop(threshold + 100, viewport)).toBe(true);
  });
});

describe('ScrollProgressBar', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 2000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, 'scrollTop', {
      value: 0,
      configurable: true,
      writable: true,
    });
  });

  it('renders a progress track', () => {
    renderWithTheme(<ScrollProgressBar />);
    expect(screen.getByTestId('scroll-progress')).toBeInTheDocument();
  });
});

describe('BackToTop', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'scrollTo',
      vi.fn((..._args: unknown[]) => undefined),
    );
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(document.documentElement, 'scrollTop', {
      value: 0,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is hidden near the top of the page', () => {
    renderWithTheme(<BackToTop />);
    expect(screen.queryByTestId('back-to-top')).not.toBeInTheDocument();
  });

  it('appears after scrolling past the threshold and scrolls to top on click', async () => {
    const user = userEvent.setup();
    const threshold = getBackToTopThreshold(1000);
    Object.defineProperty(window, 'scrollY', {
      value: threshold + 20,
      configurable: true,
      writable: true,
    });

    renderWithTheme(<BackToTop />);

    await waitFor(() => {
      expect(screen.getByTestId('back-to-top')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('back-to-top'));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
