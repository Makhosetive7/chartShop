import styled from 'styled-components';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  MessageCircle,
  LayoutDashboard,
  History,
  Package,
  ShoppingCart,
  Users,
  ClipboardList,
  Wallet,
  FileBarChart,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/auth';

const Shell = styled.div`
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;

  @media (max-width: 840px) {
    grid-template-columns: 1fr;
  }
`;

const Sidebar = styled.aside`
  padding: ${({ theme }) => theme.space[5]};
  background: ${({ theme }) => theme.colors.primaryDark};
  color: ${({ theme }) => theme.colors.surface};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]};
  overflow-y: auto;
`;

const Brand = styled.div`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: 1.5rem;
  line-height: 1.15;
`;

const ShopName = styled.p`
  margin: ${({ theme }) => theme.space[2]} 0 0;
  color: ${({ theme }) => theme.colors.primaryTint};
  font-size: 0.9rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
`;

const Item = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  padding: 9px 12px;
  border-radius: ${({ theme }) => theme.radii.md};
  text-decoration: none;
  color: ${({ theme }) => theme.colors.surface};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  font-size: 0.92rem;
  opacity: 0.85;

  &:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.1);
  }

  &.active {
    opacity: 1;
    background: ${({ theme }) => theme.colors.primary};
  }
`;

const Main = styled.main<{ $flush?: boolean }>`
  padding: ${({ theme, $flush }) => ($flush ? '0' : theme.space[6])};
  background: ${({ theme }) => theme.colors.background};
  min-width: 0;
  overflow-x: auto;
  ${({ $flush }) =>
    $flush
      ? `
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `
      : ''}
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: inherit;
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 10px 12px;
  cursor: pointer;
  font-weight: ${({ theme }) => theme.fontWeights.medium};

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const links = [
  { to: '/app', end: true, icon: MessageCircle, label: 'Chat' },
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/products', icon: Package, label: 'Products' },
  { to: '/app/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/app/customers', icon: Users, label: 'Customers' },
  { to: '/app/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/app/expenses', icon: Wallet, label: 'Expenses' },
  { to: '/app/reports', icon: FileBarChart, label: 'Reports' },
  { to: '/app/activity', icon: History, label: 'Activity' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
] as const;

export function AppLayout() {
  const { shop, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const flush = location.pathname === '/app' || location.pathname === '/app/';

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <Shell>
      <Sidebar>
        <div>
          <Brand>ChartShop</Brand>
          <ShopName>{shop?.businessName || 'Your shop'}</ShopName>
        </div>
        <Nav>
          {links.map(({ to, icon: Icon, label, ...rest }) => (
            <Item key={to} to={to} end={'end' in rest ? rest.end : false}>
              <Icon size={18} />
              {label}
            </Item>
          ))}
        </Nav>
        <LogoutButton type="button" onClick={() => void handleLogout()}>
          <LogOut size={18} />
          Log out
        </LogoutButton>
      </Sidebar>
      <Main $flush={flush}>
        <Outlet />
      </Main>
    </Shell>
  );
}
