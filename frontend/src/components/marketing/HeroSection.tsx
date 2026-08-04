import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { ArrowButton, Eyebrow } from '@/components/marketing/marketingPrimitives';
import { BrandMark } from '@/components/ui/BrandMark';

const fadeUp = {
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
};

const float = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -14px, 0); }
`;

const tickIn = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const Hero = styled.section`
  position: relative;
  padding: clamp(2.75rem, 7vw, 4.5rem) clamp(1.25rem, 4vw, 2.5rem) 0;
  overflow: hidden;
`;

const Atmosphere = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 70% 50% at 50% -10%, rgba(245, 160, 122, 0.28), transparent 60%),
    radial-gradient(ellipse 40% 35% at 85% 35%, rgba(196, 59, 90, 0.1), transparent 55%),
    radial-gradient(ellipse 35% 30% at 10% 55%, rgba(232, 90, 79, 0.08), transparent 50%);
`;

const Intro = styled(motion.div)`
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 48rem;
  margin: 0 auto clamp(2.5rem, 6vw, 3.75rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space[4]};
`;

const Brand = styled.h1`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: clamp(3.4rem, 10vw, 6rem);
  line-height: 0.9;
  letter-spacing: -0.055em;
  color: ${({ theme }) => theme.colors.maroon};
`;

const Headline = styled.p`
  margin: 0;
  max-width: 18ch;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.45rem, 3vw, 2rem);
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: 1.2;
  letter-spacing: -0.025em;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Support = styled.p`
  margin: 0;
  max-width: 32rem;
  font-size: 1.05rem;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const CtaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[3]};
  margin-top: ${({ theme }) => theme.space[1]};
`;

const Showcase = styled(motion.div)`
  position: relative;
  z-index: 1;
  width: min(1080px, 100%);
  margin: 0 auto;
  padding: clamp(1.5rem, 3.5vw, 2.5rem);
  border-radius: 0;
  background:
    radial-gradient(circle at 14% 22%, rgba(245, 160, 122, 0.38), transparent 38%),
    radial-gradient(circle at 88% 78%, rgba(196, 59, 90, 0.28), transparent 40%),
    linear-gradient(150deg, #6a1530 0%, #4a0e1c 46%, #2f0812 100%);
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.shadows.float};
`;

const GridTexture = styled.div`
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(ellipse at 40% 40%, black 20%, transparent 72%);
  pointer-events: none;
`;

const Orb = styled.div<{ $size: number; $x: string; $y: string; $delay?: string }>`
  position: absolute;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  left: ${({ $x }) => $x};
  top: ${({ $y }) => $y};
  border-radius: 0;
  background: radial-gradient(
    circle at 32% 28%,
    rgba(255, 190, 170, 0.55),
    rgba(196, 59, 90, 0.12) 58%,
    transparent 72%
  );
  filter: blur(1px);
  animation: ${float} 8s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay ?? '0s'};
  pointer-events: none;
`;

const Stage = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: ${({ theme }) => theme.space[4]};
  align-items: stretch;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const ChatPhone = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 0;
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.shadows.soft};
  display: flex;
  flex-direction: column;
  min-height: 340px;
`;

const ChatHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: linear-gradient(
    180deg,
    ${({ theme }) => theme.colors.peachSoft},
    ${({ theme }) => theme.colors.surface}
  );
`;

const ChatMeta = styled.div`
  strong {
    display: block;
    font-size: 0.95rem;
    color: ${({ theme }) => theme.colors.textPrimary};
  }

  span {
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const ChannelPill = styled.span`
  margin-left: auto;
  padding: 5px 10px;
  border-radius: 0;
  background: ${({ theme }) => theme.colors.primaryTint};
  color: ${({ theme }) => theme.colors.maroon};
  font-size: 0.7rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  letter-spacing: 0.02em;
`;

const Transcript = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background:
    radial-gradient(circle at 90% 10%, rgba(245, 213, 192, 0.35), transparent 40%),
    ${({ theme }) => theme.colors.cream};
`;

const Bubble = styled(motion.div)<{ $from: 'user' | 'bot' }>`
  align-self: ${({ $from }) => ($from === 'user' ? 'flex-end' : 'flex-start')};
  max-width: 88%;
  padding: 11px 14px;
  border-radius: 0;
  background: ${({ theme, $from }) =>
    $from === 'user' ? theme.colors.maroon : theme.colors.surface};
  color: ${({ theme, $from }) =>
    $from === 'user' ? theme.colors.textOnDark : theme.colors.textPrimary};
  font-size: 0.9rem;
  line-height: 1.45;
  box-shadow: ${({ theme }) => theme.shadows.card};

  strong {
    display: block;
    margin-bottom: 4px;
    font-size: 0.72rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    opacity: 0.7;
  }

  em {
    display: block;
    margin-top: 8px;
    font-style: normal;
    font-size: 0.8rem;
    opacity: 0.85;
  }
`;

const Composer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.85rem;

  span {
    flex: 1;
    padding: 10px 12px;
    border-radius: 0;
    background: ${({ theme }) => theme.colors.cream};
  }

  i {
    width: 34px;
    height: 34px;
    border-radius: 0;
    background: ${({ theme }) => theme.colors.maroon};
    display: grid;
    place-items: center;
    color: white;
    font-style: normal;
    font-size: 0.85rem;
  }
`;

const TillCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 0;
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.shadows.soft};
  display: flex;
  flex-direction: column;
  min-height: 340px;
`;

const TillHead = styled.div`
  padding: 16px 18px 8px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;

  h3 {
    margin: 0;
    font-size: 1rem;
    color: ${({ theme }) => theme.colors.textPrimary};
  }

  span {
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const BigStat = styled(motion.div)`
  padding: 8px 18px 18px;

  .label {
    margin: 0 0 4px;
    font-size: 0.75rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.textMuted};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }

  .value {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(2.2rem, 4vw, 2.8rem);
    letter-spacing: -0.04em;
    color: ${({ theme }) => theme.colors.maroon};
    line-height: 1;
  }
`;

const StatRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 0 18px 16px;
`;

const MiniStat = styled(motion.div)`
  padding: 12px;
  border-radius: 0;
  background: ${({ theme }) => theme.colors.cream};

  .k {
    margin: 0 0 4px;
    font-size: 0.72rem;
    color: ${({ theme }) => theme.colors.textMuted};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }

  .v {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.2rem;
    color: ${({ theme }) => theme.colors.textPrimary};
    letter-spacing: -0.02em;
  }
`;

const Feed = styled.div`
  margin-top: auto;
  padding: 14px 18px 18px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: grid;
  gap: 10px;
`;

const FeedItem = styled.div<{ $delay: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 0.85rem;
  animation: ${tickIn} 0.45s ease both;
  animation-delay: ${({ $delay }) => $delay};

  .left {
    display: flex;
    align-items: center;
    gap: 8px;
    color: ${({ theme }) => theme.colors.textSecondary};
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 0;
    background: ${({ theme }) => theme.colors.coral};
  }

  .dot.warn {
    background: ${({ theme }) => theme.colors.warning};
  }

  strong {
    color: ${({ theme }) => theme.colors.textPrimary};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }
`;

const Caption = styled.p`
  position: relative;
  z-index: 1;
  margin: ${({ theme }) => theme.space[5]} 0 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};

  &::before {
    content: '';
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-right: 8px;
    border-radius: 0;
    background: ${({ theme }) => theme.colors.coral};
    vertical-align: 1px;
  }
`;

const MESSAGES = [
  {
    from: 'user' as const,
    body: 'sold 2 brown bread @ 18',
  },
  {
    from: 'bot' as const,
    title: 'Sale recorded',
    body: 'Cash +ZiG 36 · Brown bread stock now 48',
    footer: 'Synced to web dashboard',
  },
  {
    from: 'user' as const,
    body: 'credit Thabo 1 airtime 50',
  },
  {
    from: 'bot' as const,
    title: 'Credit sale',
    body: 'Thabo balance ZiG 150 · Airtime left 23',
  },
];

export function HeroSection() {
  return (
    <Hero>
      <Atmosphere aria-hidden />

      <Intro
        initial="initial"
        animate="animate"
        transition={{ staggerChildren: 0.09 }}
      >
        <motion.div variants={fadeUp}>
          <Eyebrow>Telegram · WhatsApp · Web</Eyebrow>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Brand>ChartShop</Brand>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Headline>The till that lives in your chat.</Headline>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Support>
            Sell, track stock, and chase credit from a message — same books on the web
            when you need the full picture.
          </Support>
        </motion.div>
        <motion.div variants={fadeUp}>
          <CtaRow>
            <ArrowButton to="/register">Create shop</ArrowButton>
            <ArrowButton to="/login" variant="ghost">
              Sign in
            </ArrowButton>
          </CtaRow>
        </motion.div>
      </Intro>

      <Showcase
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <GridTexture aria-hidden />
        <Orb $size={170} $x="4%" $y="8%" />
        <Orb $size={100} $x="78%" $y="62%" $delay="1.4s" />

        <Stage>
          <ChatPhone>
            <ChatHeader>
              <BrandMark size={38} />
              <ChatMeta>
                <strong>ChartShop</strong>
                <span>online · your shop bot</span>
              </ChatMeta>
              <ChannelPill>Telegram</ChannelPill>
            </ChatHeader>
            <Transcript>
              {MESSAGES.map((msg, index) => (
                <Bubble
                  key={`${msg.from}-${index}`}
                  $from={msg.from}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.25 + index * 0.18, duration: 0.35 }}
                >
                  {msg.from === 'bot' && msg.title ? <strong>{msg.title}</strong> : null}
                  {msg.body}
                  {msg.from === 'bot' && msg.footer ? <em>{msg.footer}</em> : null}
                </Bubble>
              ))}
            </Transcript>
            <Composer aria-hidden>
              <span>Type a sale…</span>
              <i>↑</i>
            </Composer>
          </ChatPhone>

          <TillCard>
            <TillHead>
              <h3>Today at the till</h3>
              <span>Live from chat</span>
            </TillHead>
            <BigStat
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35 }}
            >
              <p className="label">Cash in</p>
              <p className="value">ZiG 2,450</p>
            </BigStat>
            <StatRow>
              <MiniStat
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.45 }}
              >
                <p className="k">Sales</p>
                <p className="v">37</p>
              </MiniStat>
              <MiniStat
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.52 }}
              >
                <p className="k">On credit</p>
                <p className="v">ZiG 480</p>
              </MiniStat>
            </StatRow>
            <Feed>
              <FeedItem $delay="0.7s">
                <div className="left">
                  <span className="dot" />
                  Brown bread ×2
                </div>
                <strong>+ZiG 36</strong>
              </FeedItem>
              <FeedItem $delay="0.9s">
                <div className="left">
                  <span className="dot" />
                  Thabo · airtime
                </div>
                <strong>credit</strong>
              </FeedItem>
              <FeedItem $delay="1.1s">
                <div className="left">
                  <span className="dot warn" />
                  Milk 1L low
                </div>
                <strong>4 left</strong>
              </FeedItem>
            </Feed>
          </TillCard>
        </Stage>

        <Caption>Sell in chat · stock and credit stay current</Caption>
      </Showcase>
    </Hero>
  );
}
