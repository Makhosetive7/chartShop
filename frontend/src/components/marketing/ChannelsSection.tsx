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
  padding: 10px 8px;
  border-radius: 0;
  background: ${({ $active }) => ($active ? 'white' : 'transparent')};
  color: ${({ theme, $active }) => ($active ? theme.colors.maroon : 'rgba(255,255,255,0.75)')};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: 0.85rem;
  font-family: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const TabStatus = styled.span<{ $tone: 'live' | 'soon'; $active: boolean }>`
  font-size: 0.62rem;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ $tone, $active, theme }) => {
    if ($tone === 'live') {
      return $active ? theme.colors.success : 'rgba(140, 220, 170, 0.95)';
    }
    return $active ? theme.colors.textMuted : 'rgba(255, 255, 255, 0.5)';
  }};
`;

const StatusBadge = styled.span<{ $tone: 'live' | 'soon' }>`
  display: inline-block;
  margin-bottom: 8px;
  padding: 4px 8px;
  font-size: 0.68rem;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: ${({ $tone, theme }) =>
    $tone === 'live' ? theme.colors.success : theme.colors.textMuted};
  background: ${({ $tone, theme }) =>
    $tone === 'live' ? theme.colors.successTint : theme.colors.peachSoft};
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
    id: 'web',
    label: 'Web',
    status: 'Available' as const,
    statusTone: 'live' as const,
    title: 'Run the shop from the dashboard',
    sub: 'The primary way most shops use ChartShop today',
    tone: 'linear-gradient(160deg, #2a1014, #4a0e1c 45%, #f5a07a)',
    challenge: 'You need the whole day on one screen — sales, stock, credit, and reports.',
    solution:
      'Sign in with your username and PIN. Browse inventory, customers, and reports, or use web chat commands without leaving the browser.',
    results: [
      'Today’s till at a glance',
      'Inventory and customer screens',
      'Built for how shops work day to day',
    ],
    visual: 'web' as const,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    status: 'Coming soon' as const,
    statusTone: 'soon' as const,
    title: 'Meeting shops where they already chat',
    sub: 'On the roadmap — carefully, not rushed',
    tone: 'linear-gradient(160deg, #3d0a16, #8b1e3a 50%, #e85a4f)',
    challenge: 'Most teams in Zimbabwe already ping each other on WhatsApp — the till should meet them there.',
    solution:
      'We are wiring WhatsApp Cloud API so the same sell, stock, and credit rules mirror to the web. It takes careful setup; we will open it when it is solid.',
    results: [
      'Familiar app for the whole team',
      'Same ledger as the web dashboard',
      'Not live yet — watch this space',
    ],
    visual: 'chat' as const,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    status: 'Available' as const,
    statusTone: 'live' as const,
    title: 'Full shop ops from Telegram',
    sub: 'Ready today if your team prefers Telegram',
    tone: 'linear-gradient(160deg, #5c1024, #c43b5a 55%, #f5a07a)',
    challenge: 'Some teams already run work chats on Telegram and want the till there too.',
    solution:
      'Message ChartShop like a colleague: sales, stock, credit, and PDF reports — same PIN and books as the web.',
    results: [
      'Full command set for daily ops',
      'Receipts and stock updates in-thread',
      'Same username and PIN as the web',
    ],
    visual: 'chat' as const,
  },
] as const;

export function ChannelsSection() {
  const [id, setId] = useState<(typeof CHANNELS)[number]['id']>('web');
  const active = CHANNELS.find((c) => c.id === id) ?? CHANNELS[0];

  return (
    <Band id="channels">
      <CenterIntro>
        <Eyebrow $tone="onDark">One shop, clear channels</Eyebrow>
        <SectionTitle $onDark>Web first — chat as it lands</SectionTitle>
        <SectionLead $onDark>
          Use the dashboard now. Telegram works today. WhatsApp is coming next.
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
            <TabStatus $tone={c.statusTone} $active={id === c.id}>
              {c.status}
            </TabStatus>
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
            <StatusBadge $tone={active.statusTone}>{active.status}</StatusBadge>
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
