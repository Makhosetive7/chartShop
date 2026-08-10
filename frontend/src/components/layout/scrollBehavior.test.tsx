import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { theme } from '@/styles/theme';
import { AppLayout } from '@/components/layout/AppLayout';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { App } from '@/App';

vi.mock('@/auth', () => ({
  useAuth: () => ({
    shop: { id: 'shop-1', businessName: 'Test Shop' },
    user: { username: 'luna', role: 'admin' },
    logout: vi.fn(async () => undefined),
    isDemo: false,
    isAuthenticated: true,
    bootstrapping: false,
    isAdmin: true,
    login: vi.fn(),
    register: vi.fn(),
    enterDemo: vi.fn(),
    establishSession: vi.fn(),
    updateShop: vi.fn(),
    updateUser: vi.fn(),
  }),
}));

vi.mock('@/components/demo/DemoTour', () => ({
  DemoTourProvider: ({ children }: { children: ReactNode }) => children,
  useDemoTour: () => ({
    startTour: vi.fn(),
    isActive: false,
    stopTour: vi.fn(),
  }),
}));

vi.mock('@/components/demo/DemoUpgradeProvider', () => ({
  DemoUpgradeProvider: ({ children }: { children: ReactNode }) => children,
  useDemoUpgrade: () => ({ promptUpgrade: vi.fn() }),
}));

vi.mock('@/pages/HomePage', () => ({
  HomePage: () => <div>Marketing home</div>,
}));
vi.mock('@/pages/LoginPage', () => ({
  LoginPage: () => <div>Login page</div>,
}));
vi.mock('@/pages/RegisterPage', () => ({
  RegisterPage: () => <div>Register page</div>,
}));
vi.mock('@/pages/RecoverPage', () => ({
  RecoverPage: () => <div>Recover page</div>,
}));
vi.mock('@/pages/SetupPage', () => ({
  SetupPage: () => <div>Setup page</div>,
}));
vi.mock('@/pages/DashboardPage', () => ({
  DashboardPage: () => <div>Dashboard page</div>,
}));
vi.mock('@/pages/ChatPage', () => ({
  ChatPage: () => <div>Chat page</div>,
}));
vi.mock('@/pages/ProductsPage', () => ({
  ProductsPage: () => <div>Products page</div>,
}));
vi.mock('@/pages/SalesPage', () => ({
  SalesPage: () => <div>Sales page</div>,
}));
vi.mock('@/pages/LaybyesPage', () => ({
  LaybyesPage: () => <div>Laybyes page</div>,
}));
vi.mock('@/pages/CustomersPage', () => ({
  CustomersPage: () => <div>Customers page</div>,
}));
vi.mock('@/pages/OrdersPage', () => ({
  OrdersPage: () => <div>Orders page</div>,
}));
vi.mock('@/pages/ExpensesPage', () => ({
  ExpensesPage: () => <div>Expenses page</div>,
}));
vi.mock('@/pages/ReportsPage', () => ({
  ReportsPage: () => <div>Reports page</div>,
}));
vi.mock('@/pages/ActivityPage', () => ({
  ActivityPage: () => <div>Activity page</div>,
}));
vi.mock('@/pages/SettingsPage', () => ({
  SettingsPage: () => <div>Settings page</div>,
}));

function TallPage({ label }: { label: string }) {
  return (
    <div>
      <h1>{label}</h1>
      <div style={{ height: 2400 }} data-testid="tall-content" />
    </div>
  );
}

function MarketingProbe({ label }: { label: string }) {
  return (
    <div>
      <h1>{label}</h1>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/login">Go login</Link>
        <Link to="/register">Go register</Link>
        <Link to="/recover">Go recover</Link>
        <Link to="/setup">Go setup</Link>
      </nav>
    </div>
  );
}

describe('scroll behaviour', () => {
  let windowScrollTo: ReturnType<typeof vi.fn>;
  let elementScrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    windowScrollTo = vi.fn();
    elementScrollTo = vi.fn(function (
      this: Element,
      xOrOptions?: number | ScrollToOptions,
      y?: number,
    ) {
      if (typeof xOrOptions === 'object') {
        Object.defineProperty(this, 'scrollTop', {
          configurable: true,
          value: xOrOptions.top ?? 0,
          writable: true,
        });
        return;
      }
      Object.defineProperty(this, 'scrollTop', {
        configurable: true,
        value: y ?? 0,
        writable: true,
      });
    });

    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      writable: true,
      value: windowScrollTo,
    });
    Object.defineProperty(Element.prototype, 'scrollTo', {
      configurable: true,
      writable: true,
      value: elementScrollTo,
    });
    Object.defineProperty(window.history, 'scrollRestoration', {
      configurable: true,
      writable: true,
      value: 'auto',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderMarketing(initialPath: string) {
    return render(
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route element={<MarketingLayout />}>
              <Route index element={<MarketingProbe label="Home" />} />
              <Route path="login" element={<MarketingProbe label="Login" />} />
              <Route
                path="register"
                element={<MarketingProbe label="Register" />}
              />
              <Route
                path="recover"
                element={<MarketingProbe label="Recover" />}
              />
              <Route path="setup" element={<MarketingProbe label="Setup" />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );
  }

  function renderAppShell(initialPath: string) {
    return render(
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/app" element={<AppLayout />}>
              <Route
                path="dashboard"
                element={<TallPage label="Dashboard" />}
              />
              <Route path="chat" element={<TallPage label="Chat" />} />
              <Route path="products" element={<TallPage label="Products" />} />
              <Route path="sales" element={<TallPage label="Sales" />} />
              <Route path="laybyes" element={<TallPage label="Laybyes" />} />
              <Route
                path="customers"
                element={<TallPage label="Customers" />}
              />
              <Route path="orders" element={<TallPage label="Orders" />} />
              <Route path="expenses" element={<TallPage label="Expenses" />} />
              <Route path="reports" element={<TallPage label="Reports" />} />
              <Route path="activity" element={<TallPage label="Activity" />} />
              <Route path="settings" element={<TallPage label="Settings" />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );
  }

  function mainScrollCalls() {
    return elementScrollTo.mock.instances.filter(
      (el) => el && (el as Element).tagName === 'MAIN',
    );
  }

  describe('App scrollRestoration', () => {
    it('sets history.scrollRestoration to manual on boot', async () => {
      render(
        <ThemeProvider theme={theme}>
          <App />
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(window.history.scrollRestoration).toBe('manual');
      });
    });
  });

  describe('MarketingLayout', () => {
    it('scrolls window to top on first marketing load', async () => {
      renderMarketing('/');
      await waitFor(() => {
        expect(windowScrollTo).toHaveBeenCalledWith(0, 0);
      });
    });

    it.each([
      ['/', 'Go login', 'Login'],
      ['/login', 'Go register', 'Register'],
      ['/register', 'Go recover', 'Recover'],
      ['/recover', 'Go setup', 'Setup'],
      ['/setup', 'Home', 'Home'],
    ] as const)(
      'resets window scroll when navigating %s → next marketing route',
      async (from, linkName, heading) => {
        const user = userEvent.setup();
        renderMarketing(from);
        windowScrollTo.mockClear();

        await user.click(screen.getByRole('link', { name: linkName }));
        expect(
          await screen.findByRole('heading', { name: heading }),
        ).toBeInTheDocument();
        expect(windowScrollTo).toHaveBeenCalledWith(0, 0);
      },
    );
  });

  describe('AppLayout', () => {
    it('scrolls window and main to top after login-style landing on dashboard', async () => {
      renderAppShell('/app/dashboard');

      await waitFor(() => {
        expect(windowScrollTo).toHaveBeenCalledWith(0, 0);
        expect(mainScrollCalls().length).toBeGreaterThan(0);
      });
      expect(
        screen.getByRole('heading', { name: 'Dashboard' }),
      ).toBeInTheDocument();
    });

    it('resets main scroll when switching between primary task tabs', async () => {
      const user = userEvent.setup();
      renderAppShell('/app/dashboard');
      await waitFor(() => expect(mainScrollCalls().length).toBeGreaterThan(0));

      const main = document.querySelector('main');
      expect(main).toBeTruthy();
      Object.defineProperty(main!, 'scrollTop', {
        configurable: true,
        writable: true,
        value: 800,
      });
      elementScrollTo.mockClear();
      windowScrollTo.mockClear();

      await user.click(screen.getByRole('link', { name: /^Products$/i }));
      expect(
        await screen.findByRole('heading', { name: 'Products' }),
      ).toBeInTheDocument();
      expect(windowScrollTo).toHaveBeenCalledWith(0, 0);
      expect(mainScrollCalls().length).toBeGreaterThan(0);

      elementScrollTo.mockClear();
      windowScrollTo.mockClear();
      Object.defineProperty(main!, 'scrollTop', {
        configurable: true,
        writable: true,
        value: 600,
      });

      await user.click(screen.getByRole('link', { name: /^Sales$/i }));
      expect(
        await screen.findByRole('heading', { name: 'Sales' }),
      ).toBeInTheDocument();
      expect(windowScrollTo).toHaveBeenCalledWith(0, 0);
      expect(mainScrollCalls().length).toBeGreaterThan(0);

      elementScrollTo.mockClear();
      windowScrollTo.mockClear();

      await user.click(screen.getByRole('link', { name: /^Home$/i }));
      expect(
        await screen.findByRole('heading', { name: 'Dashboard' }),
      ).toBeInTheDocument();
      expect(windowScrollTo).toHaveBeenCalledWith(0, 0);
      expect(mainScrollCalls().length).toBeGreaterThan(0);
    });

    it('does not force main to top when opening Chat (chat owns bottom scroll)', async () => {
      const user = userEvent.setup();
      renderAppShell('/app/products');
      await waitFor(() => expect(mainScrollCalls().length).toBeGreaterThan(0));

      elementScrollTo.mockClear();
      windowScrollTo.mockClear();

      await user.click(screen.getByRole('link', { name: /^Chat$/i }));
      expect(
        await screen.findByRole('heading', { name: 'Chat' }),
      ).toBeInTheDocument();

      expect(windowScrollTo).toHaveBeenCalledWith(0, 0);
      expect(mainScrollCalls()).toHaveLength(0);
    });

    it('resets main to top when leaving Chat for a task page', async () => {
      const user = userEvent.setup();
      renderAppShell('/app/chat');
      await waitFor(() => {
        expect(windowScrollTo).toHaveBeenCalledWith(0, 0);
      });
      expect(mainScrollCalls()).toHaveLength(0);

      elementScrollTo.mockClear();
      windowScrollTo.mockClear();

      await user.click(screen.getByRole('link', { name: /^Products$/i }));
      expect(
        await screen.findByRole('heading', { name: 'Products' }),
      ).toBeInTheDocument();
      expect(windowScrollTo).toHaveBeenCalledWith(0, 0);
      expect(mainScrollCalls().length).toBeGreaterThan(0);
    });

    it.each([
      ['Laybyes'],
      ['Customers'],
      ['Orders'],
      ['Expenses'],
      ['Reports'],
      ['Activity'],
      ['Settings'],
    ] as const)('resets main scroll when opening More → %s', async (label) => {
      const user = userEvent.setup();
      renderAppShell('/app/dashboard');
      await waitFor(() => expect(mainScrollCalls().length).toBeGreaterThan(0));

      elementScrollTo.mockClear();
      windowScrollTo.mockClear();

      await user.click(screen.getByRole('button', { name: /^More$/i }));
      await user.click(screen.getByRole('link', { name: label }));

      expect(
        await screen.findByRole('heading', { name: label }),
      ).toBeInTheDocument();
      expect(windowScrollTo).toHaveBeenCalledWith(0, 0);
      expect(mainScrollCalls().length).toBeGreaterThan(0);
    });
  });

  describe('login handoff (marketing → app)', () => {
    it('lands dashboard at top after navigating from login route', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route element={<MarketingLayout />}>
                <Route
                  path="login"
                  element={
                    <div>
                      <h1>Login</h1>
                      <Link to="/app/dashboard">Finish login</Link>
                    </div>
                  }
                />
              </Route>
              <Route path="/app" element={<AppLayout />}>
                <Route
                  path="dashboard"
                  element={<TallPage label="Dashboard" />}
                />
              </Route>
            </Routes>
          </MemoryRouter>
        </ThemeProvider>,
      );
      await waitFor(() => expect(windowScrollTo).toHaveBeenCalled());
      windowScrollTo.mockClear();
      elementScrollTo.mockClear();

      await user.click(screen.getByRole('link', { name: 'Finish login' }));
      expect(
        await screen.findByRole('heading', { name: 'Dashboard' }),
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(windowScrollTo).toHaveBeenCalledWith(0, 0);
        expect(mainScrollCalls().length).toBeGreaterThan(0);
      });
    });
  });
});
