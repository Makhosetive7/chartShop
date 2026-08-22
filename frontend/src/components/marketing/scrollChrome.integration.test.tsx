import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '@/styles/theme';
import { SiteLayout } from '@/components/marketing/SiteLayout';
import { getBackToTopThreshold } from '@/components/marketing/scrollChrome';

vi.mock('@/auth', () => ({
  useAuth: () => ({
    shop: null,
    user: null,
    logout: vi.fn(async () => undefined),
    isDemo: false,
    isAuthenticated: false,
    bootstrapping: false,
    isAdmin: false,
    login: vi.fn(),
    register: vi.fn(),
    enterDemo: vi.fn(),
    establishSession: vi.fn(),
    updateShop: vi.fn(),
    updateUser: vi.fn(),
  }),
}));

function TallHome() {
  return (
    <div>
      <h1>Home</h1>
      <nav>
        <Link to="/login">Go login</Link>
      </nav>
      <div style={{ height: 3000 }} data-testid="tall-content" />
    </div>
  );
}

function ShortLogin() {
  return (
    <div>
      <h1>Login</h1>
      <Link to="/">Go home</Link>
    </div>
  );
}

function renderSite(initialPath: string) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<TallHome />} />
            <Route path="login" element={<ShortLogin />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

function setScrollMetrics({
  scrollY,
  innerHeight = 800,
  scrollHeight = 4000,
}: {
  scrollY: number;
  innerHeight?: number;
  scrollHeight?: number;
}) {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    writable: true,
    value: scrollY,
  });
  Object.defineProperty(document.documentElement, 'scrollTop', {
    configurable: true,
    writable: true,
    value: scrollY,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: innerHeight,
  });
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: scrollHeight,
  });
}

describe('scroll chrome integration (SiteLayout)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'scrollTo',
      vi.fn((..._args: unknown[]) => undefined),
    );
    setScrollMetrics({ scrollY: 0 });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows scroll progress on homepage', () => {
    renderSite('/');
    expect(screen.getByTestId('scroll-progress')).toBeInTheDocument();
  });

  it('does not show scroll progress on login', () => {
    renderSite('/login');
    expect(screen.queryByTestId('scroll-progress')).not.toBeInTheDocument();
  });

  it('hides back-to-top at top of homepage', () => {
    renderSite('/');
    expect(screen.queryByTestId('back-to-top')).not.toBeInTheDocument();
  });

  it('does not mount back-to-top on login', () => {
    renderSite('/login');
    setScrollMetrics({ scrollY: 2000 });
    fireEvent.scroll(window);
    expect(screen.queryByTestId('back-to-top')).not.toBeInTheDocument();
  });

  it('shows back-to-top after scrolling past viewport threshold on homepage', async () => {
    renderSite('/');
    const threshold = getBackToTopThreshold(800);
    setScrollMetrics({ scrollY: threshold + 50 });
    fireEvent.scroll(window);

    await waitFor(() => {
      expect(screen.getByTestId('back-to-top')).toBeInTheDocument();
    });
  });

  it('scrolls to top when back-to-top is clicked', async () => {
    const user = userEvent.setup();
    renderSite('/');
    const threshold = getBackToTopThreshold(800);
    setScrollMetrics({ scrollY: threshold + 50 });
    fireEvent.scroll(window);

    await waitFor(() => {
      expect(screen.getByTestId('back-to-top')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('back-to-top'));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('removes scroll chrome when navigating homepage to login', async () => {
    const user = userEvent.setup();
    renderSite('/');

    expect(screen.getByTestId('scroll-progress')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Go login' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    });
    expect(screen.queryByTestId('scroll-progress')).not.toBeInTheDocument();
    expect(screen.queryByTestId('back-to-top')).not.toBeInTheDocument();
  });
});
