import { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CenterIntro,
  Eyebrow,
  SectionLead,
  SectionTitle,
} from '@/components/marketing/marketingPrimitives';

const Band = styled.section`
  padding: clamp(4rem, 10vw, 6.5rem) clamp(1.25rem, 4vw, 2.5rem);
`;

const Tabs = styled.div`
  width: min(720px, 100%);
  margin: 0 auto ${({ theme }) => theme.space[5]};
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  padding: 6px;
  border-radius: 0;
  background: ${({ theme }) => theme.colors.peachSoft};
`;

const Tab = styled.button<{ $active: boolean }>`
  border: none;
  cursor: pointer;
  padding: 12px 18px;
  border-radius: 0;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.surface : 'transparent'};
  color: ${({ theme }) => theme.colors.maroon};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: 0.9rem;
  box-shadow: ${({ theme, $active }) => ($active ? theme.shadows.card : 'none')};
  font-family: inherit;
`;

const Card = styled(motion.div)`
  width: min(1080px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space[6]};
  padding: clamp(1.75rem, 4vw, 2.75rem);
  border-radius: 0;
  background: linear-gradient(
    115deg,
    ${({ theme }) => theme.colors.coral} 0%,
    ${({ theme }) => theme.colors.peach} 55%,
    ${({ theme }) => theme.colors.peachSoft} 100%
  );
  box-shadow: ${({ theme }) => theme.shadows.soft};

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
`;

const Copy = styled.div`
  h3 {
    margin: 0 0 ${({ theme }) => theme.space[3]};
    font-size: clamp(1.4rem, 2.5vw, 1.85rem);
    color: ${({ theme }) => theme.colors.maroon};
  }

  p {
    margin: 0 0 ${({ theme }) => theme.space[4]};
    color: ${({ theme }) => theme.colors.textPrimary};
    line-height: 1.6;
    opacity: 0.9;
  }

  code {
    display: inline-block;
    margin-top: 4px;
    padding: 8px 12px;
    border-radius: 0;
    background: rgba(74, 14, 28, 0.12);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.85rem;
    color: ${({ theme }) => theme.colors.maroon};
  }
`;

const Mock = styled.div`
  background: white;
  border-radius: 0;
  padding: 16px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  display: grid;
  gap: 10px;
`;

const MockLine = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 0;
  background: ${({ theme }) => theme.colors.cream};
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textSecondary};

  strong {
    color: ${({ theme }) => theme.colors.maroon};
    font-family: ${({ theme }) => theme.fonts.heading};
  }
`;

const Grid = styled.div`
  width: min(1080px, 100%);
  margin: ${({ theme }) => theme.space[6]} auto 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.space[5]};

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }

  h4 {
    margin: 0 0 ${({ theme }) => theme.space[2]};
    color: ${({ theme }) => theme.colors.maroon};
    font-size: 1.05rem;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.55;
    font-size: 0.95rem;
  }
`;

const CASES = [
  {
    id: 'sales',
    label: 'Sales & stock',
    title: 'Ring it up without leaving chat',
    text: 'Cash, credit, and laybye stay tied to live inventory — so you never oversell the last loaf.',
    example: 'sold 2 brown bread @ 18',
    lines: [
      { left: 'Brown bread ×2', right: '+ZiG 36' },
      { left: 'Stock left', right: '48' },
      { left: 'Payment', right: 'Cash' },
      { left: 'Till today', right: 'ZiG 2,450' },
    ],
    columns: [
      {
        title: 'Counter speed',
        text: 'Customers waiting? One message beats opening a heavy POS.',
      },
      {
        title: 'Honest shelves',
        text: 'Stock drops with the sale — no end-of-day recount guessing.',
      },
      {
        title: 'Laybye ready',
        text: 'Partial payments stick to the customer, not a random notebook page.',
      },
    ],
  },
  {
    id: 'credit',
    label: 'Credit customers',
    title: 'Know who owes what — tonight',
    text: 'Named balances replace “someone owes us.” Chase collections with a number you trust.',
    example: 'credit Thabo 1 airtime 50',
    lines: [
      { left: 'Thabo', right: 'ZiG 150 due' },
      { left: 'Last sale', right: 'Airtime ZiG 50' },
      { left: 'Nomsa', right: 'ZiG 80 due' },
      { left: 'Collected today', right: 'ZiG 200' },
    ],
    columns: [
      {
        title: 'Named ledger',
        text: 'Every credit sale attaches to a customer — searchable later.',
      },
      {
        title: 'Balances that stick',
        text: 'No more arguing over who paid half last Tuesday.',
      },
      {
        title: 'Collect with context',
        text: 'See what they bought when you follow up.',
      },
    ],
  },
  {
    id: 'reports',
    label: 'Closing reports',
    title: 'Know the day before you lock up',
    text: 'Cash in, credit out, bestsellers, and low stock — without rebuilding Excel at 8pm.',
    example: 'report today',
    lines: [
      { left: 'Cash in', right: 'ZiG 2,450' },
      { left: 'On credit', right: 'ZiG 480' },
      { left: 'Top seller', right: 'Bread ×41' },
      { left: 'Low stock', right: 'Milk · 4' },
    ],
    columns: [
      {
        title: 'Daily cash flow',
        text: 'See what came in and went out before you leave the shop.',
      },
      {
        title: 'What moved',
        text: 'Bestsellers and dead stock show up while you can still act.',
      },
      {
        title: 'PDF when you need it',
        text: 'Pull a report from chat or open the full dashboard on the web.',
      },
    ],
  },
] as const;

export function UseCasesSection() {
  const [activeId, setActiveId] = useState<(typeof CASES)[number]['id']>('sales');
  const active = CASES.find((c) => c.id === activeId) ?? CASES[0];

  return (
    <Band id="use-cases">
      <CenterIntro>
        <Eyebrow>On the floor</Eyebrow>
        <SectionTitle>What you actually do with ChartShop</SectionTitle>
        <SectionLead>
          Same tools whether it is a rush at the till, a credit sale, or closing the day.
        </SectionLead>
      </CenterIntro>
      <Tabs role="tablist" aria-label="Use cases">
        {CASES.map((c) => (
          <Tab
            key={c.id}
            role="tab"
            aria-selected={activeId === c.id}
            $active={activeId === c.id}
            onClick={() => setActiveId(c.id)}
          >
            {c.label}
          </Tab>
        ))}
      </Tabs>
      <AnimatePresence mode="wait">
        <Card
          key={active.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <Copy>
            <h3>{active.title}</h3>
            <p>{active.text}</p>
            <code>{active.example}</code>
          </Copy>
          <Mock>
            {active.lines.map((line) => (
              <MockLine key={line.left}>
                <span>{line.left}</span>
                <strong>{line.right}</strong>
              </MockLine>
            ))}
          </Mock>
        </Card>
      </AnimatePresence>
      <Grid>
        {active.columns.map((col) => (
          <div key={col.title}>
            <h4>{col.title}</h4>
            <p>{col.text}</p>
          </div>
        ))}
      </Grid>
    </Band>
  );
}
