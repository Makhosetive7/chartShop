import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '@/auth';
import { useDemoTour } from '@/components/demo/DemoTour';

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding: 10px 14px;
  background: ${({ theme }) => theme.colors.peach};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 0.88rem;
  line-height: 1.4;
`;

const Message = styled.p`
  margin: 0;
  flex: 1 1 12rem;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
`;

const Primary = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  background: ${({ theme }) => theme.colors.maroon};
  color: ${({ theme }) => theme.colors.textOnDark};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: 0.84rem;

  &:hover {
    opacity: 0.92;
  }
`;

const Ghost = styled.button`
  border: none;
  background: transparent;
  padding: 8px 4px;
  cursor: pointer;
  font: inherit;
  font-size: 0.84rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.maroon};

  &:hover {
    text-decoration: underline;
  }
`;

const QuickLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-top: 4px;
  font-size: 0.8rem;
`;

const QuickLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.fontWeights.medium};

  &:hover {
    text-decoration: underline;
  }
`;

/** Pages that have their own rich content — show value-path shortcuts on other pages. */
const VALUE_LINKS = [
  { to: '/app/laybyes', label: 'Laybyes' },
  { to: '/app/orders', label: 'Orders' },
  { to: '/app/reports', label: 'Reports' },
  { to: '/app/activity', label: 'Activity' },
];

export function DemoBanner() {
  const { isDemo, shop } = useAuth();
  const { startTour, isActive } = useDemoTour();
  const location = useLocation();
  if (!isDemo) return null;

  const sectorHint = shop?.demoSector
    ? ` (${shop.demoSector.replace(/_/g, ' ')})`
    : '';

  const hiddenLinks = VALUE_LINKS.filter(
    (l) => !location.pathname.startsWith(l.to),
  );

  return (
    <Bar role="status">
      <div style={{ flex: '1 1 12rem', minWidth: 0 }}>
        <Message>
          You&apos;re exploring a demo shop{sectorHint} — browse freely. Create
          yours to save changes.
        </Message>
        {hiddenLinks.length > 0 ? (
          <QuickLinks>
            <span style={{ color: 'inherit', opacity: 0.6 }}>Also try:</span>
            {hiddenLinks.map((l) => (
              <QuickLink key={l.to} to={l.to}>
                {l.label}
              </QuickLink>
            ))}
          </QuickLinks>
        ) : null}
      </div>
      <Actions>
        {!isActive ? (
          <Ghost type="button" onClick={startTour}>
            Replay tour
          </Ghost>
        ) : null}
        <Primary to="/register">Create your shop</Primary>
      </Actions>
    </Bar>
  );
}
