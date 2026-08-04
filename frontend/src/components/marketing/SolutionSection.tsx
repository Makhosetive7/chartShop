import styled from 'styled-components';
import { motion } from 'framer-motion';
import { MessageCircle, Package, Wallet, FileText } from 'lucide-react';
import {
  CenterIntro,
  Eyebrow,
  SectionLead,
  SectionTitle,
} from '@/components/marketing/marketingPrimitives';

const Band = styled.section`
  background: ${({ theme }) => theme.colors.maroon};
  color: white;
  padding: clamp(4rem, 10vw, 6.5rem) clamp(1.25rem, 4vw, 2.5rem);
`;

const Grid = styled.div`
  width: min(1120px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(2rem, 5vw, 4rem);
  align-items: center;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const Demo = styled(motion.div)`
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0;
  padding: ${({ theme }) => theme.space[5]};
  backdrop-filter: blur(8px);
`;

const DemoTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.space[4]};
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);

  strong {
    color: white;
    font-size: 1rem;
  }
`;

const Cmd = styled(motion.div)`
  padding: 12px 14px;
  border-radius: 0;
  background: rgba(0, 0, 0, 0.22);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.88rem;
  color: ${({ theme }) => theme.colors.peach};
  margin-bottom: 12px;
`;

const Result = styled(motion.div)`
  display: grid;
  gap: 10px;
`;

const ResultRow = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 0;
  background: rgba(255, 255, 255, 0.95);
  color: ${({ theme }) => theme.colors.maroon};
  font-size: 0.9rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};

  span {
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.82rem;
  }
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const Item = styled(motion.li)`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: ${({ theme }) => theme.space[4]};
  padding: ${({ theme }) => theme.space[5]} 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);

  &:first-child {
    border-top: 1px solid rgba(255, 255, 255, 0.12);
  }

  h3 {
    margin: 0 0 6px;
    color: white;
    font-size: 1.15rem;
  }

  p {
    margin: 0;
    color: rgba(255, 255, 255, 0.72);
    line-height: 1.55;
  }
`;

const IconBox = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 0;
  background: white;
  color: ${({ theme }) => theme.colors.maroon};
  display: grid;
  place-items: center;
`;

const STEPS = [
  {
    icon: MessageCircle,
    title: 'Sell in one message',
    text: 'Type sold 2 bread @ 18 — ChartShop records cash, drops stock, and keeps the till honest.',
  },
  {
    icon: Package,
    title: 'Stock moves with the sale',
    text: 'Every line item updates inventory live. Low stock warnings hit before the shelf goes empty.',
  },
  {
    icon: Wallet,
    title: 'Credit with a name attached',
    text: 'credit Thabo 50 lands on the customer balance — not a sticky note that vanishes.',
  },
  {
    icon: FileText,
    title: 'Close the day without Excel',
    text: 'Pull cash in/out, top sellers, and who still owes — from chat or the web dashboard.',
  },
];

export function SolutionSection() {
  return (
    <Band id="solution">
      <CenterIntro>
        <Eyebrow $tone="onDark">How ChartShop works</Eyebrow>
        <SectionTitle $onDark>One message. Books that stay true.</SectionTitle>
        <SectionLead $onDark>
          Chat is the till. The web is the back office. Same shop, same PIN, same
          numbers — whether you are at the counter or on the road.
        </SectionLead>
      </CenterIntro>
      <Grid>
        <Demo
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <DemoTitle>
            <strong>From chat → ledger</strong>
            <span>live</span>
          </DemoTitle>
          <Cmd
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
          >
            › sold 2 brown bread @ 18
          </Cmd>
          <Result>
            {[
              { label: 'Cash', value: '+ZiG 36' },
              { label: 'Brown bread', value: '48 left' },
              { label: 'Today total', value: 'ZiG 2,450' },
              { label: 'Synced', value: 'Web dashboard' },
            ].map((row, i) => (
              <ResultRow
                key={row.label}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.28 + i * 0.08 }}
              >
                {row.value}
                <span>{row.label}</span>
              </ResultRow>
            ))}
          </Result>
        </Demo>
        <List>
          {STEPS.map((item, index) => (
            <Item
              key={item.title}
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <IconBox>
                <item.icon size={22} strokeWidth={1.75} />
              </IconBox>
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </Item>
          ))}
        </List>
      </Grid>
    </Band>
  );
}
