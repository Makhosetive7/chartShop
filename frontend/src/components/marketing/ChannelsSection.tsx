import { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import {
  CenterIntro,
  Eyebrow,
  SectionLead,
  SectionTitle,
} from '@/components/marketing/marketingPrimitives';

const Band = styled.section`
  padding: clamp(4rem, 10vw, 6rem) clamp(1.25rem, 4vw, 2.5rem);
  background:
    radial-gradient(ellipse at 20% 30%, rgba(120, 140, 110, 0.18), transparent 45%),
    radial-gradient(ellipse at 80% 60%, rgba(90, 70, 70, 0.22), transparent 50%),
    #2a1a1c;
`;

const ChannelTabs = styled.div`
  width: min(520px, 100%);
  margin: 0 auto ${({ theme }) => theme.space[5]};
  display: flex;
  gap: 6px;
  padding: 6px;
  border-radius: 0;
  background: rgba(255, 255, 255, 0.08);
`;

const ChannelTab = styled.button<{ $active: boolean }>`
  flex: 1;
  border: none;
  cursor: pointer;
  padding: 12px 14px;
  border-radius: 0;
  background: ${({ $active }) => ($active ? 'white' : 'transparent')};
  color: ${({ theme, $active }) => ($active ? theme.colors.maroon : 'rgba(255,255,255,0.75)')};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: 0.9rem;
  font-family: inherit;
`;

const Card = styled(motion.div)`
  width: min(980px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: ${({ theme }) => theme.space[5]};
  padding: ${({ theme }) => theme.space[5]};
  background: white;
  border-radius: 0;
  box-shadow: ${({ theme }) => theme.shadows.float};

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
`;

const Visual = styled.div<{ $tone: string }>`
  border-radius: 0;
  min-height: 300px;
  background: ${({ $tone }) => $tone};
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Bubble = styled.div<{ $own?: boolean }>`
  align-self: ${({ $own }) => ($own ? 'flex-end' : 'flex-start')};
  max-width: 90%;
  padding: 10px 12px;
  border-radius: 0;
  background: ${({ $own }) => ($own ? 'rgba(74,14,28,0.9)' : 'rgba(255,255,255,0.92)')};
  color: ${({ $own }) => ($own ? 'white' : '#4A0E1C')};
  font-size: 0.85rem;
  line-height: 1.4;
`;

const DashRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 0;
  background: rgba(255, 255, 255, 0.92);
  color: #4a0e1c;
  font-size: 0.88rem;
  font-weight: 600;
`;

const Body = styled.div`
  h3 {
    margin: 0 0 4px;
    font-size: 1.45rem;
    color: ${({ theme }) => theme.colors.textPrimary};
  }

  .sub {
    margin: 0 0 ${({ theme }) => theme.space[4]};
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const Row = styled.div`
  padding: ${({ theme }) => theme.space[3]} 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  .label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.72rem;
    font-weight: ${({ theme }) => theme.fontWeights.bold};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.coral};
    margin-bottom: 6px;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.55;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 8px;
  }

  li {
    display: flex;
    gap: 8px;
    align-items: start;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.45;

    svg {
      color: ${({ theme }) => theme.colors.primary};
      flex-shrink: 0;
      margin-top: 2px;
    }
  }
`;

const Dot = styled.span`
  width: 8px;
  height: 8px;
  background: ${({ theme }) => theme.colors.coral};
  display: inline-block;
  border-radius: 0;
`;

const CHANNELS = [
  {
    id: 'telegram',
    label: 'Telegram',
    title: 'Full shop ops from Telegram',
    sub: 'At the counter or on the pavement',
    tone: 'linear-gradient(160deg, #5c1024, #c43b5a 55%, #f5a07a)',
    challenge: 'You are busy selling — opening a laptop POS is not happening.',
    solution:
      'Message ChartShop like a colleague: sales, stock, credit, and PDF reports without leaving the chat you already live in.',
    results: [
      'Full command set for daily ops',
      'Receipts and stock updates in-thread',
      'Same PIN as the web dashboard',
    ],
    visual: 'chat' as const,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    title: 'Same books on WhatsApp',
    sub: 'When that is where your team already chats',
    tone: 'linear-gradient(160deg, #3d0a16, #8b1e3a 50%, #e85a4f)',
    challenge: 'Staff already ping each other on WhatsApp — the till should meet them there.',
    solution:
      'Enable WhatsApp Cloud API and keep the same business rules: sell, stock, credit — mirrored to the web.',
    results: [
      'Familiar app for the whole team',
      'Parity with Telegram shop logic',
      'One ledger, not a second notebook',
    ],
    visual: 'chat' as const,
  },
  {
    id: 'web',
    label: 'Web',
    title: 'The desk view when you need depth',
    sub: 'Dashboard for stats, stock screens, and growing POS UI',
    tone: 'linear-gradient(160deg, #2a1014, #4a0e1c 45%, #f5a07a)',
    challenge: 'Chat is fast — but sometimes you want the whole day on one screen.',
    solution:
      'Sign in with the same user ID and PIN. Browse inventory, customers, and reports without typing commands.',
    results: [
      'Today’s till at a glance',
      'Inventory and customer screens',
      'Built for when you sit down',
    ],
    visual: 'web' as const,
  },
] as const;

export function ChannelsSection() {
  const [id, setId] = useState<(typeof CHANNELS)[number]['id']>('telegram');
  const active = CHANNELS.find((c) => c.id === id) ?? CHANNELS[0];

  return (
    <Band id="channels">
      <CenterIntro>
        <Eyebrow $tone="onDark">Three doors, one shop</Eyebrow>
        <SectionTitle $onDark>Counter, stall, or desk — same books</SectionTitle>
        <SectionLead $onDark>
          Pick the channel that fits the moment. ChartShop keeps the ledger in sync.
        </SectionLead>
      </CenterIntro>
      <ChannelTabs role="tablist" aria-label="Channels">
        {CHANNELS.map((c) => (
          <ChannelTab
            key={c.id}
            role="tab"
            $active={id === c.id}
            aria-selected={id === c.id}
            onClick={() => setId(c.id)}
          >
            {c.label}
          </ChannelTab>
        ))}
      </ChannelTabs>
      <AnimatePresence mode="wait">
        <Card
          key={active.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <Visual $tone={active.tone}>
            {active.visual === 'chat' ? (
              <>
                <Bubble $own>sold 1 milk @ 22</Bubble>
                <Bubble>
                  ✓ Sale recorded
                  <br />
                  Cash +ZiG 22 · Milk 11 left
                </Bubble>
                <Bubble $own>stock milk</Bubble>
                <Bubble>Milk 1L · 11 on hand · low soon</Bubble>
              </>
            ) : (
              <>
                <DashRow>
                  <span>Cash in</span>
                  <span>ZiG 2,450</span>
                </DashRow>
                <DashRow>
                  <span>Credit due</span>
                  <span>ZiG 480</span>
                </DashRow>
                <DashRow>
                  <span>Low stock</span>
                  <span>Milk · 4</span>
                </DashRow>
                <DashRow>
                  <span>Top seller</span>
                  <span>Bread ×41</span>
                </DashRow>
              </>
            )}
          </Visual>
          <Body>
            <h3>{active.title}</h3>
            <p className="sub">{active.sub}</p>
            <Row>
              <div className="label">
                <Dot /> Challenge
              </div>
              <p>{active.challenge}</p>
            </Row>
            <Row>
              <div className="label">
                <Dot /> Solution
              </div>
              <p>{active.solution}</p>
            </Row>
            <Row>
              <div className="label">
                <Dot /> Results
              </div>
              <ul>
                {active.results.map((r) => (
                  <li key={r}>
                    <CheckCircle2 size={16} /> {r}
                  </li>
                ))}
              </ul>
            </Row>
          </Body>
        </Card>
      </AnimatePresence>
    </Band>
  );
}
