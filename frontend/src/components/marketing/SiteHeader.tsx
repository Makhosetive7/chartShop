import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '@/auth';
import { ArrowButton } from './marketingPrimitives';
import { BrandMark } from '@/components/ui/BrandMark';

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[4]};
  padding: 16px clamp(1.25rem, 4vw, 2.5rem);
  background: rgba(247, 241, 235, 0.86);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid transparent;
`;

const Brand = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const BrandName = styled.span`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: 1.15rem;
  letter-spacing: -0.03em;
`;

const Links = styled.nav`
  display: flex;
  align-items: center;
  gap: clamp(1rem, 2.5vw, 1.75rem);

  @media (max-width: 820px) {
    display: none;
  }
`;

const Anchor = styled.a`
  color: ${({ theme }) => theme.colors.textSecondary};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  font-size: 0.92rem;

  &:hover {
    color: ${({ theme }) => theme.colors.maroon};
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
`;

const Ghost = styled(Link)`
  color: ${({ theme }) => theme.colors.textPrimary};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  font-size: 0.92rem;

  @media (max-width: 520px) {
    display: none;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.maroon};
  }
`;

export function SiteHeader() {
  const { isAuthenticated } = useAuth();

  return (
    <Bar>
      <Brand to="/">
        <BrandMark size={28} />
        <BrandName>ChartShop</BrandName>
      </Brand>
      <Links>
        <Anchor href="/#problem">The Friday feeling</Anchor>
        <Anchor href="/#solution">How it works</Anchor>
        <Anchor href="/#use-cases">On the floor</Anchor>
        <Anchor href="/#channels">Channels</Anchor>
      </Links>
      <Actions>
        {isAuthenticated ? (
          <ArrowButton to="/app/dashboard">Open dashboard</ArrowButton>
        ) : (
          <>
            <Ghost to="/login">Sign in</Ghost>
            <ArrowButton to="/register">Get started</ArrowButton>
          </>
        )}
      </Actions>
    </Bar>
  );
}
