import styled from 'styled-components';
import { Card } from '@/components/ui/primitives';
import {
  Skeleton,
  SkeletonRow,
  SkeletonStack,
  TableSkeleton,
} from '@/components/ui/Skeleton';

const KpiGrid = styled.div<{ $cols?: number }>`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[5]};

  @media (min-width: 640px) {
    grid-template-columns: repeat(
      ${({ $cols }) => Math.min($cols ?? 6, 3)},
      minmax(0, 1fr)
    );
  }

  @media (min-width: 960px) {
    grid-template-columns: repeat(${({ $cols }) => $cols ?? 6}, minmax(0, 1fr));
  }
`;

const KpiCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: 14px;
  min-width: 0;

  @media (min-width: 720px) {
    padding: ${({ theme }) => theme.space[4]};
  }
`;

const HighlightStrip = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[4]};

  @media (min-width: 560px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 900px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const HighlightCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: ${({ theme }) => theme.space[4]};
  min-width: 0;
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[4]};

  @media (min-width: 960px) {
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  }
`;

const PanelsGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[4]};

  @media (min-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Panel = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: ${({ theme }) => theme.space[4]};
  min-width: 0;

  @media (min-width: 720px) {
    padding: ${({ theme }) => theme.space[5]};
  }
`;

const ChartBlock = styled.div`
  display: flex;
  align-items: end;
  gap: 8px;
  height: 160px;
  margin-top: ${({ theme }) => theme.space[4]};
`;

const Bar = styled(Skeleton)<{ $h: string }>`
  flex: 1;
  height: ${({ $h }) => $h} !important;
  align-self: end;
`;

const SummaryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.space[4]};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[4]};

  @media (min-width: 640px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: ${({ theme }) => theme.space[4]};
  text-align: center;
`;

const TimelineList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
`;

const TimelineItem = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: ${({ theme }) => theme.space[4]};
`;

const ChatThread = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: ${({ theme }) => theme.space[4]} 0;
  min-height: 280px;
`;

const Bubble = styled.div<{ $align: 'start' | 'end' }>`
  align-self: ${({ $align }) => $align};
  width: min(72%, 360px);
  padding: 12px 14px;
  background: ${({ theme, $align }) =>
    $align === 'end' ? theme.colors.primaryTint : theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

function ChartSkeleton({ tall }: { tall?: boolean }) {
  const heights = tall
    ? ['45%', '70%', '55%', '90%', '60%', '75%', '40%', '85%']
    : ['55%', '80%', '45%', '95%', '65%', '70%', '50%'];
  return (
    <ChartBlock style={tall ? { height: 200 } : undefined}>
      {heights.map((h, i) => (
        <Bar key={i} $h={h} />
      ))}
    </ChartBlock>
  );
}

function PanelSkeleton({ withTable = true }: { withTable?: boolean }) {
  return (
    <Panel>
      <Skeleton $w="9rem" $h="1.05rem" $mb="8px" />
      <Skeleton $w="12rem" $h="0.75rem" $mb="16px" />
      <SkeletonStack $gap="8px">
        {[85, 70, 55, 40].map((w, i) => (
          <Skeleton key={i} $w={`${w}%`} $h="0.7rem" />
        ))}
      </SkeletonStack>
      {withTable ? (
        <TableSkeleton
          columns={3}
          rows={4}
          widths={['8rem', '3rem', '5rem']}
          style={{ marginTop: 18 }}
        />
      ) : null}
    </Panel>
  );
}

export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <KpiGrid $cols={6}>
        {Array.from({ length: 6 }, (_, i) => (
          <KpiCard key={i}>
            <Skeleton $w="4.5rem" $h="0.75rem" $mb="10px" />
            <Skeleton $w="70%" $h="1.35rem" $mb="8px" />
            <Skeleton $w="55%" $h="0.65rem" />
          </KpiCard>
        ))}
      </KpiGrid>

      <HighlightStrip>
        {Array.from({ length: 3 }, (_, i) => (
          <HighlightCard key={i}>
            <Skeleton $w="5rem" $h="0.7rem" $mb="10px" />
            <Skeleton $w="75%" $h="1.1rem" $mb="8px" />
            <Skeleton $w="60%" $h="0.7rem" />
          </HighlightCard>
        ))}
      </HighlightStrip>

      <ChartsGrid>
        <Panel>
          <Skeleton $w="10rem" $h="1.05rem" $mb="8px" />
          <Skeleton $w="11rem" $h="0.75rem" />
          <ChartSkeleton />
        </Panel>
        <Panel>
          <Skeleton $w="6rem" $h="1.05rem" $mb="8px" />
          <Skeleton $w="10rem" $h="0.75rem" $mb="24px" />
          <Skeleton
            $w="140px"
            $h="140px"
            $radius="50%"
            style={{ margin: '0 auto' }}
          />
        </Panel>
      </ChartsGrid>

      <Panel style={{ marginBottom: 16 }}>
        <Skeleton $w="7rem" $h="1.05rem" $mb="8px" />
        <Skeleton $w="14rem" $h="0.75rem" />
        <ChartSkeleton tall />
      </Panel>

      <PanelsGrid>
        <PanelSkeleton />
        <PanelSkeleton />
      </PanelsGrid>
      <PanelsGrid>
        <PanelSkeleton withTable />
        <PanelSkeleton withTable />
      </PanelsGrid>
    </div>
  );
}

export function ProductsSummarySkeleton() {
  return (
    <SummaryRow aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} $w="6.5rem" $h="0.9rem" />
      ))}
    </SummaryRow>
  );
}

export function ActivityStatsSkeleton() {
  return (
    <StatsGrid aria-busy="true" aria-label="Loading activity stats">
      {Array.from({ length: 4 }, (_, i) => (
        <StatCard key={i}>
          <Skeleton $w="4rem" $h="0.7rem" $mb="10px" style={{ margin: '0 auto 10px' }} />
          <Skeleton $w="3rem" $h="1.4rem" style={{ margin: '0 auto' }} />
        </StatCard>
      ))}
    </StatsGrid>
  );
}

export function ActivityListSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <TimelineList aria-busy="true" aria-label="Loading activity">
      <Skeleton $w="6rem" $h="0.7rem" $mb="4px" />
      {Array.from({ length: rows }, (_, i) => (
        <TimelineItem key={i}>
          <SkeletonRow $gap="8px" style={{ marginBottom: 10 }}>
            <Skeleton $w="4.5rem" $h="1.2rem" />
            <Skeleton $w="5.5rem" $h="1.2rem" />
            <Skeleton $w="4rem" $h="0.75rem" style={{ marginLeft: 'auto' }} />
          </SkeletonRow>
          <Skeleton $w="88%" $h="0.85rem" $mb="8px" />
          <Skeleton $w="62%" $h="0.75rem" />
        </TimelineItem>
      ))}
    </TimelineList>
  );
}

export function ReportsBodySkeleton({
  variant = 'kpis',
}: {
  variant?: 'kpis' | 'best' | 'profit';
}) {
  return (
    <div aria-busy="true" aria-label="Loading report">
      {variant !== 'profit' ? (
        <KpiGrid $cols={variant === 'best' ? 3 : 6}>
          {Array.from({ length: variant === 'best' ? 3 : 6 }, (_, i) => (
            <KpiCard key={i}>
              <Skeleton $w="5rem" $h="0.7rem" $mb="10px" />
              <Skeleton $w="65%" $h="1.25rem" />
            </KpiCard>
          ))}
        </KpiGrid>
      ) : null}

      {variant === 'best' ? (
        <Card>
          <Skeleton $w="12rem" $h="1.05rem" $mb="16px" />
          <TableSkeleton
            columns={3}
            rows={6}
            widths={['9rem', '3rem', '5rem']}
          />
        </Card>
      ) : (
        <Card>
          <SkeletonStack $gap="12px">
            <Skeleton $w="40%" $h="0.95rem" />
            <Skeleton $w="92%" $h="0.85rem" />
            <Skeleton $w="85%" $h="0.85rem" />
            <Skeleton $w="78%" $h="0.85rem" />
            <Skeleton $w="70%" $h="0.85rem" />
            <Skeleton $w="55%" $h="0.85rem" />
          </SkeletonStack>
        </Card>
      )}
    </div>
  );
}

export function SettingsProfileSkeleton() {
  return (
    <SkeletonStack $gap="20px" aria-busy="true" aria-label="Loading profile">
      <SkeletonStack $gap="8px">
        <Skeleton $w="6rem" $h="0.75rem" />
        <Skeleton $w="100%" $h="2.6rem" />
      </SkeletonStack>
      <SkeletonStack $gap="8px">
        <Skeleton $w="7rem" $h="0.75rem" />
        <Skeleton $w="100%" $h="5.5rem" />
      </SkeletonStack>
    </SkeletonStack>
  );
}

export function ChatThreadSkeleton() {
  const layout: Array<'start' | 'end'> = [
    'end',
    'start',
    'end',
    'start',
    'start',
  ];
  return (
    <ChatThread aria-busy="true" aria-label="Loading chat history">
      {layout.map((align, i) => (
        <Bubble key={i} $align={align}>
          <SkeletonStack $gap="8px">
            <Skeleton $w="90%" $h="0.8rem" />
            <Skeleton $w={i % 2 === 0 ? '70%' : '55%'} $h="0.8rem" />
            {align === 'start' && i > 1 ? (
              <Skeleton $w="40%" $h="0.8rem" />
            ) : null}
          </SkeletonStack>
        </Bubble>
      ))}
    </ChatThread>
  );
}

export function CustomerDetailSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Loading customer">
      <Skeleton $w="10rem" $h="1.2rem" $mb="12px" />
      <Skeleton $w="8rem" $h="0.9rem" $mb="20px" />
      <SkeletonRow $gap="12px" style={{ marginBottom: 24 }}>
        <Skeleton $w="10rem" $h="2.5rem" />
        <Skeleton $w="6rem" $h="2.5rem" />
      </SkeletonRow>
      <Skeleton $w="7rem" $h="1rem" $mb="12px" />
      <TableSkeleton columns={3} rows={4} widths={['7rem', '4rem', '5rem']} />
      <Skeleton $w="7rem" $h="1rem" $mt="24px" $mb="12px" />
      <TableSkeleton
        columns={4}
        rows={3}
        widths={['6rem', '5rem', '5rem', '5rem']}
      />
    </Card>
  );
}

export { TableSkeleton };
