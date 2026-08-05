import { Link } from 'react-router-dom';
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

export function DemoBanner() {
  const { isDemo, shop } = useAuth();
  const { startTour, isActive } = useDemoTour();
  if (!isDemo) return null;

  const sectorHint = shop?.demoSector
    ? ` (${shop.demoSector.replace(/_/g, ' ')})`
    : '';

  return (
    <Bar role="status">
      <Message>
        You&apos;re exploring a demo shop{sectorHint} — browse freely. Create
        yours to save changes.
      </Message>
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
