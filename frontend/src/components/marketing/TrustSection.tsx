import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Shield, Smartphone, FileCheck, Lock, Plug, Sparkles } from 'lucide-react';
import {
  ArrowButton,
  CenterIntro,
  Eyebrow,
  SectionLead,
  SectionTitle,
} from '@/components/marketing/marketingPrimitives';

const Band = styled.section`
  position: relative;
  padding: clamp(4rem, 10vw, 6.5rem) clamp(1.25rem, 4vw, 2.5rem);
  background:
    radial-gradient(ellipse at 15% 20%, rgba(245, 160, 122, 0.3), transparent 45%),
    radial-gradient(ellipse at 85% 70%, rgba(232, 90, 79, 0.15), transparent 40%),
    ${({ theme }) => theme.colors.background};
`;

const Grid = styled.div`
  width: min(1080px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.space[4]};

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled(motion.article)<{ $cta?: boolean }>`
  padding: ${({ theme }) => theme.space[5]};
  border-radius: 0;
  background: ${({ theme, $cta }) =>
    $cta
      ? `linear-gradient(145deg, ${theme.colors.coral}, ${theme.colors.primaryLight})`
      : theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};
  color: ${({ $cta }) => ($cta ? 'white' : 'inherit')};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  min-height: 190px;

  h3 {
    margin: 0;
    font-size: 1.1rem;
    color: ${({ theme, $cta }) => ($cta ? 'white' : theme.colors.textPrimary)};
  }

  p {
    margin: 0;
    line-height: 1.55;
    color: ${({ theme, $cta }) =>
      $cta ? 'rgba(255,255,255,0.9)' : theme.colors.textSecondary};
    flex: 1;
  }
`;

const Icon = styled.div<{ $cta?: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 0;
  display: grid;
  place-items: center;
  background: ${({ theme, $cta }) =>
    $cta ? 'rgba(255,255,255,0.2)' : theme.colors.primaryTint};
  color: ${({ theme, $cta }) => ($cta ? 'white' : theme.colors.maroon)};
`;

const ITEMS = [
  {
    icon: Shield,
    title: 'Your shop, your login',
    text: 'Each shop uses its own user ID and PIN — not a shared mystery password on the till phone.',
  },
  {
    icon: Smartphone,
    title: 'Same books everywhere',
    text: 'A sale in Telegram shows on the web. Credit on WhatsApp is the same balance at the desk.',
  },
  {
    icon: FileCheck,
    title: 'A trail you can check',
    text: 'Sales, stock moves, and customer changes leave footprints you can review later.',
  },
  {
    icon: Lock,
    title: 'PIN where it counts',
    text: 'Sensitive actions stay behind the same PIN you already tap in chat.',
  },
  {
    icon: Plug,
    title: 'Not locked to one device',
    text: 'Built for bots and a growing web POS — the shop moves with you, not the hardware.',
  },
];

export function TrustSection() {
  return (
    <Band id="security">
      <CenterIntro>
        <Eyebrow>Trust the till</Eyebrow>
        <SectionTitle>Practical control for a chat-first shop</SectionTitle>
        <SectionLead>
          No enterprise theatre — just clear ownership of who can sell, change stock,
          and see the books.
        </SectionLead>
      </CenterIntro>
      <Grid>
        {ITEMS.map((item, index) => (
          <Card
            key={item.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.04 }}
          >
            <Icon>
              <item.icon size={20} strokeWidth={1.75} />
            </Icon>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </Card>
        ))}
        <Card $cta>
          <Icon $cta>
            <Sparkles size={20} />
          </Icon>
          <h3>Ready when the next customer walks in</h3>
          <p>Create your shop, then use the same user ID and PIN in chat.</p>
          <div>
            <ArrowButton to="/register" variant="light">
              Create shop
            </ArrowButton>
          </div>
        </Card>
      </Grid>
    </Band>
  );
}
