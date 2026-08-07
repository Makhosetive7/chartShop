import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  NavLink,
  Outlet,
  useNavigate,
  useLocation,
  matchPath,
} from 'react-router-dom';
import {
  MessageCircle,
  LayoutDashboard,
  History,
  Package,
  ShoppingCart,
  CalendarClock,
  Users,
  ClipboardList,
  Wallet,
  FileBarChart,
  Settings,
  Ellipsis,
  X,
} from 'lucide-react';
import { useAuth } from '@/auth';
import { Button } from '@/components/ui/Button';
import { BrandMark } from '@/components/ui/BrandMark';
import { DemoBanner } from '@/components/demo/DemoBanner';

const NAV_HEIGHT_MOBILE = '64px';
const NAV_HEIGHT_DESKTOP = '76px';

type LinkItem = {
  to: string;
  end?: boolean;
  icon: typeof MessageCircle;
  label: string;
  short?: string;
  tour?: string;
};

const PRIMARY: LinkItem[] = [
  { to: '/app', end: true, icon: MessageCircle, label: 'Chat', tour: 'nav-chat' },
  {
    to: '/app/dashboard',
    icon: LayoutDashboard,
    label: 'Home',
    short: 'Home',
    tour: 'nav-home',
  },
  { to: '/app/products', icon: Package, label: 'Products', tour: 'nav-products' },
  { to: '/app/sales', icon: ShoppingCart, label: 'Sales', tour: 'nav-sales' },
];

const MORE: LinkItem[] = [
  { to: '/app/laybyes', icon: CalendarClock, label: 'Laybyes' },
  { to: '/app/customers', icon: Users, label: 'Customers' },
  { to: '/app/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/app/expenses', icon: Wallet, label: 'Expenses' },
  { to: '/app/reports', icon: FileBarChart, label: 'Reports', tour: 'nav-reports' },
  { to: '/app/activity', icon: History, label: 'Activity' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
];

const ALL = [...PRIMARY, ...MORE];

const Shell = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  max-width: 100vw;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background};
  overflow-x: clip;
`;

const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  padding-top: max(10px, env(safe-area-inset-top));
  background: rgba(247, 241, 235, 0.92);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (min-width: 720px) {
    padding: 12px clamp(16px, 3vw, 28px);
    padding-top: max(12px, env(safe-area-inset-top));
  }
`;

const BrandBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`;

const BrandText = styled.div`
  min-width: 0;

  strong {
    display: block;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-weight: ${({ theme }) => theme.fontWeights.bold};
    font-size: 1rem;
    letter-spacing: -0.03em;
    color: ${({ theme }) => theme.colors.maroon};
    line-height: 1.1;

    @media (min-width: 720px) {
      font-size: 1.05rem;
    }
  }
`;

const ShopChip = styled.span`
  display: block;
  margin-top: 2px;
  font-size: 0.72rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: min(48vw, 240px);
`;

const LogoutSlot = styled.div`
  display: none;
  flex-shrink: 0;

  @media (min-width: 720px) {
    display: inline-flex;
  }
`;

const Main = styled.main<{ $flush?: boolean }>`
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  width: 100%;
  max-width: 100%;
  padding: ${({ $flush }) => ($flush ? '0' : '16px 12px')};
  padding-bottom: ${({ $flush }) =>
    $flush
      ? `calc(${NAV_HEIGHT_MOBILE} + env(safe-area-inset-bottom))`
      : `calc(${NAV_HEIGHT_MOBILE} + env(safe-area-inset-bottom) + 16px)`};
  background:
    radial-gradient(ellipse 55% 40% at 0% 0%, rgba(245, 160, 122, 0.14), transparent 55%),
    radial-gradient(ellipse 45% 35% at 100% 0%, rgba(196, 59, 90, 0.08), transparent 50%),
    ${({ theme }) => theme.colors.background};
  overflow-x: hidden;
  overflow-y: auto;

  @media (min-width: 720px) {
    padding: ${({ theme, $flush }) => ($flush ? '0' : theme.space[5])};
    padding-bottom: ${({ $flush }) =>
      $flush
        ? `calc(${NAV_HEIGHT_DESKTOP} + env(safe-area-inset-bottom))`
        : `calc(${NAV_HEIGHT_DESKTOP} + env(safe-area-inset-bottom) + 24px)`};
  }

  ${({ $flush }) =>
    $flush
      ? `
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `
      : ''}
`;

const MainInner = styled.div<{ $flush?: boolean }>`
  width: 100%;
  max-width: 100%;
  min-width: 0;

  ${({ $flush }) =>
    $flush
      ? `
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  `
      : ''}
`;

const BottomNav = styled.nav`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  padding: 6px 8px max(6px, env(safe-area-inset-bottom));
  background: rgba(247, 241, 235, 0.94);
  backdrop-filter: blur(16px);
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  @media (min-width: 720px) {
    padding: 8px 12px max(8px, env(safe-area-inset-bottom));
  }
`;

const NavTrack = styled.div`
  width: min(1100px, 100%);
  margin: 0 auto;
`;

const MobileNav = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 2px;
  padding: 4px;
  border-radius: 0;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};

  @media (min-width: 900px) {
    display: none;
  }
`;

const DesktopNav = styled.div`
  display: none;

  @media (min-width: 900px) {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    gap: 2px;
    padding: 4px;
    border-radius: 0;
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid ${({ theme }) => theme.colors.border};
    box-shadow: ${({ theme }) => theme.shadows.card};
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

const Item = styled(NavLink)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 0;
  padding: 8px 4px;
  border-radius: 0;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  font-size: 0.65rem;
  line-height: 1.1;
  transition: color 0.15s ease;

  span {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  svg {
    flex-shrink: 0;
  }

  &:hover,
  &.active {
    color: ${({ theme }) => theme.colors.maroon};
  }

  &.active {
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }

  @media (min-width: 720px) {
    font-size: 0.72rem;
    padding: 10px 6px;
    gap: 4px;
  }

  @media (min-width: 900px) {
    flex: 1 1 0;
    min-width: 64px;
    padding: 10px 6px;
  }
`;

const MoreTrigger = styled.button<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 0;
  padding: 8px 4px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.maroon : theme.colors.textMuted};
  font-weight: ${({ theme, $active }) =>
    $active ? theme.fontWeights.semibold : theme.fontWeights.medium};
  font-size: 0.65rem;
  font-family: inherit;
  line-height: 1.1;
  cursor: pointer;

  @media (min-width: 720px) {
    font-size: 0.72rem;
    padding: 10px 6px;
    gap: 4px;
  }
`;

const Scrim = styled.button`
  position: fixed;
  inset: 0;
  z-index: 60;
  border: none;
  background: rgba(26, 10, 10, 0.45);
  cursor: pointer;
`;

const Sheet = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 70;
  padding: 12px 12px max(16px, env(safe-area-inset-bottom));
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 0;
  box-shadow: ${({ theme }) => theme.shadows.float};
  max-height: min(70vh, 520px);
  overflow-y: auto;
`;

const SheetHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  h2 {
    margin: 0;
    font-size: 1.05rem;
    color: ${({ theme }) => theme.colors.maroon};
  }
`;

const CloseBtn = styled.button`
  width: 36px;
  height: 36px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  background: ${({ theme }) => theme.colors.cream};
  color: ${({ theme }) => theme.colors.maroon};
  display: grid;
  place-items: center;
  cursor: pointer;
`;

const SheetGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const SheetLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 8px;
  border-radius: 0;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  background: transparent;
  border: none;
  font-size: 0.95rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  text-align: left;

  &.active,
  &:hover {
    color: ${({ theme }) => theme.colors.maroon};
  }
`;

const SheetLogout = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

function pathMatches(pathname: string, to: string, end?: boolean) {
  return Boolean(matchPath({ path: to, end: Boolean(end) }, pathname));
}

export function AppLayout() {
  const { shop, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const flush = location.pathname === '/app' || location.pathname === '/app/';
  const moreActive = MORE.some((link) =>
    pathMatches(location.pathname, link.to, link.end),
  );

  const shopName = useMemo(
    () => shop?.businessName || 'Your shop',
    [shop?.businessName],
  );
  const userLabel = useMemo(() => {
    if (!user?.username) return null;
    const role = user.role === 'admin' ? 'admin' : 'member';
    return `@${user.username} · ${role}`;
  }, [user?.username, user?.role]);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  async function handleLogout() {
    setMoreOpen(false);
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <Shell>
      <TopBar>
        <BrandBlock>
          <BrandMark size={34} />
          <BrandText>
            <strong>ChartShop</strong>
            <ShopChip title={userLabel ? `${shopName} · ${userLabel}` : shopName}>
              {shopName}
              {userLabel ? ` · ${userLabel}` : ''}
            </ShopChip>
          </BrandText>
        </BrandBlock>
        <LogoutSlot>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void handleLogout()}
          >
            Log out
          </Button>
        </LogoutSlot>
      </TopBar>

      <DemoBanner />

      <Main $flush={flush}>
        <MainInner $flush={flush}>
          <Outlet />
        </MainInner>
      </Main>

      <BottomNav aria-label="Primary">
        <NavTrack>
          <MobileNav>
            {PRIMARY.map(({ to, icon: Icon, label, short, end, tour }) => (
              <Item
                key={to}
                to={to}
                end={Boolean(end)}
                data-tour={tour}
              >
                <Icon size={20} strokeWidth={1.85} />
                <span>{short || label}</span>
              </Item>
            ))}
            <MoreTrigger
              type="button"
              $active={moreActive || moreOpen}
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              onClick={() => setMoreOpen(true)}
            >
              <Ellipsis size={20} strokeWidth={1.85} />
              <span>More</span>
            </MoreTrigger>
          </MobileNav>

          <DesktopNav>
            {ALL.map(({ to, icon: Icon, label, end, tour }) => (
              <Item
                key={to}
                to={to}
                end={Boolean(end)}
                data-tour={tour}
              >
                <Icon size={20} strokeWidth={1.85} />
                <span>{label}</span>
              </Item>
            ))}
          </DesktopNav>
        </NavTrack>
      </BottomNav>

      {moreOpen ? (
        <>
          <Scrim aria-label="Close menu" onClick={() => setMoreOpen(false)} />
          <Sheet role="dialog" aria-modal="true" aria-label="More destinations">
            <SheetHead>
              <h2>More</h2>
              <CloseBtn type="button" aria-label="Close" onClick={() => setMoreOpen(false)}>
                <X size={18} />
              </CloseBtn>
            </SheetHead>
            <SheetGrid>
              {MORE.map(({ to, icon: Icon, label, end }) => (
                <SheetLink key={to} to={to} end={Boolean(end)}>
                  <Icon size={22} strokeWidth={1.85} />
                  {label}
                </SheetLink>
              ))}
              <SheetLogout>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void handleLogout()}
                >
                  Log out
                </Button>
              </SheetLogout>
            </SheetGrid>
          </Sheet>
        </>
      ) : null}
    </Shell>
  );
}
