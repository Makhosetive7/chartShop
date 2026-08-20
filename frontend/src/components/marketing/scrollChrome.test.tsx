import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { ThemeProvider } from 'styled-components';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '@/styles/theme';
import {
  BACK_TO_TOP_THRESHOLD,
  getScrollProgress,
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

  it('shows back-to-top past the threshold', () => {
    expect(shouldShowBackToTop(0)).toBe(false);
    expect(shouldShowBackToTop(BACK_TO_TOP_THRESHOLD - 1)).toBe(false);
    expect(shouldShowBackToTop(BACK_TO_TOP_THRESHOLD)).toBe(true);
    expect(shouldShowBackToTop(BACK_TO_TOP_THRESHOLD + 100)).toBe(true);
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

  it('renders a fixed progress track', () => {
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
    Object.defineProperty(window, 'scrollY', {
      value: BACK_TO_TOP_THRESHOLD + 20,
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
