import { Link, NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '@/auth';

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[4]};
  padding: 14px clamp(1.25rem, 4vw, 3rem);
  background: rgba(255, 248, 250, 0.88);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Brand = styled(Link)`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: 1.35rem;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  letter-spacing: -0.03em;
`;

const Links = styled.nav`
  display: flex;
  align-items: center;
  gap: clamp(0.75rem, 2vw, 1.5rem);

  @media (max-width: 720px) {
    display: none;
  }
`;

const Anchor = styled.a`
  color: ${({ theme }) => theme.colors.textSecondary};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  font-size: 0.95rem;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
`;

const GhostLink = styled(NavLink)`
  color: ${({ theme }) => theme.colors.textPrimary};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  font-size: 0.95rem;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const PrimaryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.surface};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: 0.95rem;

  &:hover {
    background: ${({ theme }) => theme.colors.primaryLight};
  }
`;

export function SiteHeader() {
  const { isAuthenticated } = useAuth();

  return (
    <Bar>
      <Brand to="/">ChartShop</Brand>
      <Links>
        <Anchor href="/#features">Features</Anchor>
        <Anchor href="/#how-it-works">How it works</Anchor>
        <Anchor href="/#channels">Channels</Anchor>
      </Links>
      <Actions>
        {isAuthenticated ? (
          <PrimaryLink to="/app">Open dashboard</PrimaryLink>
        ) : (
          <>
            <GhostLink to="/login">Sign in</GhostLink>
            <PrimaryLink to="/login">Get started</PrimaryLink>
          </>
        )}
      </Actions>
    </Bar>
  );
}
