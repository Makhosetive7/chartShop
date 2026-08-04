import { Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { MessageCircle, ShoppingBag, BarChart3, Smartphone } from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

const drift = keyframes`
  0% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(2%, -3%, 0) scale(1.04); }
  100% { transform: translate3d(0, 0, 0) scale(1); }
`;

const Hero = styled.section`
  position: relative;
  min-height: calc(100vh - 64px);
  display: grid;
  align-items: end;
  overflow: hidden;
  color: ${({ theme }) => theme.colors.surface};
`;

const HeroMedia = styled.div`
  position: absolute;
  inset: 0;
  background:
    linear-gradient(120deg, rgba(176, 14, 70, 0.92) 0%, rgba(227, 18, 88, 0.78) 42%, rgba(255, 71, 126, 0.55) 100%),
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.28), transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(99, 102, 241, 0.35), transparent 45%),
    linear-gradient(160deg, #b00e46, #e31258 45%, #ff477e);
  animation: ${drift} 18s ease-in-out infinite;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.55), transparent 85%);
  }
`;

const HeroInner = styled(motion.div)`
  position: relative;
  z-index: 1;
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: clamp(4rem, 12vh, 7rem) clamp(1.25rem, 4vw, 3rem)
    clamp(3rem, 8vh, 5rem);
`;

const BrandMark = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[3]};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: clamp(2.8rem, 8vw, 5.5rem);
  line-height: 0.95;
  letter-spacing: -0.04em;
`;

const Headline = styled.h1`
  margin: 0 0 ${({ theme }) => theme.space[4]};
  max-width: 14ch;
  font-size: clamp(1.6rem, 3.4vw, 2.4rem);
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: 1.2;
  color: ${({ theme }) => theme.colors.surface};
`;

const Support = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[5]};
  max-width: 34rem;
  font-size: 1.05rem;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.9);
`;

const CtaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[3]};
`;

const CtaPrimary = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 22px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primaryDark};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};

  &:hover {
    background: ${({ theme }) => theme.colors.primaryTint};
  }
`;

const CtaSecondary = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 22px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid rgba(255, 255, 255, 0.45);
  color: ${({ theme }) => theme.colors.surface};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const Section = styled.section`
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: clamp(3.5rem, 8vw, 5.5rem) clamp(1.25rem, 4vw, 3rem);
`;

const SectionTitle = styled.h2`
  margin: 0 0 ${({ theme }) => theme.space[3]};
  font-size: clamp(1.6rem, 3vw, 2rem);
`;

const SectionLead = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[5]};
  max-width: 40rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.6;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.space[5]};

  @media (max-width: 840px) {
    grid-template-columns: 1fr;
  }
`;

const Feature = styled(motion.article)`
  padding-top: ${({ theme }) => theme.space[4]};
  border-top: 2px solid ${({ theme }) => theme.colors.primary};
`;

const FeatureIcon = styled.div`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.space[3]};
`;

const FeatureTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.space[2]};
  font-size: 1.15rem;
`;

const FeatureText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.55;
`;

const Steps = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: ${({ theme }) => theme.space[4]};
`;

const Step = styled(motion.li)`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: ${({ theme }) => theme.space[4]};
  align-items: start;
`;

const StepNum = styled.span`
  display: inline-grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primaryTint};
  color: ${({ theme }) => theme.colors.primaryDark};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-family: ${({ theme }) => theme.fonts.heading};
`;

const StepBody = styled.div`
  h3 {
    margin: 0 0 ${({ theme }) => theme.space[2]};
    font-size: 1.1rem;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.55;
  }
`;

const ChannelBand = styled.section`
  background: ${({ theme }) => theme.colors.primaryTint};
  border-block: 1px solid ${({ theme }) => theme.colors.border};
`;

const ChannelInner = styled.div`
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: clamp(3rem, 7vw, 4.5rem) clamp(1.25rem, 4vw, 3rem);
`;

const ChannelRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.space[5]};

  @media (max-width: 840px) {
    grid-template-columns: 1fr;
  }
`;

const Channel = styled.div`
  h3 {
    margin: 0 0 ${({ theme }) => theme.space[2]};
    font-size: 1.15rem;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.55;
  }
`;

const Closing = styled.section`
  text-align: center;
  padding: clamp(3.5rem, 8vw, 5rem) clamp(1.25rem, 4vw, 3rem);
`;

const ClosingTitle = styled.h2`
  margin: 0 0 ${({ theme }) => theme.space[3]};
`;

const ClosingLead = styled.p`
  margin: 0 auto ${({ theme }) => theme.space[5]};
  max-width: 32rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export function HomePage() {
  return (
    <>
      <Hero>
        <HeroMedia aria-hidden />
        <HeroInner
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.08 }}
        >
          <motion.div variants={fadeUp} transition={{ duration: 0.45 }}>
            <BrandMark>ChartShop</BrandMark>
          </motion.div>
          <motion.div variants={fadeUp} transition={{ duration: 0.45, delay: 0.05 }}>
            <Headline>Your shop, running from chat and the web.</Headline>
          </motion.div>
          <motion.div variants={fadeUp} transition={{ duration: 0.45, delay: 0.1 }}>
            <Support>
              Record sales, track stock, manage credit customers, and pull reports —
              without learning a complicated POS.
            </Support>
          </motion.div>
          <motion.div variants={fadeUp} transition={{ duration: 0.45, delay: 0.15 }}>
            <CtaRow>
              <CtaPrimary to="/login">Sign in</CtaPrimary>
              <CtaSecondary href="#features">See features</CtaSecondary>
            </CtaRow>
          </motion.div>
        </HeroInner>
      </Hero>

      <Section id="features">
        <SectionTitle>Built for how small shops actually work</SectionTitle>
        <SectionLead>
          ChartShop covers the daily loop — sell, restock, collect payment, check the
          numbers — across Telegram, WhatsApp, and a web dashboard.
        </SectionLead>
        <FeatureGrid>
          {[
            {
              icon: ShoppingBag,
              title: 'Sales & stock',
              text: 'Cash, credit, and laybye sales with live inventory so you never oversell.',
            },
            {
              icon: MessageCircle,
              title: 'Chat-first ops',
              text: 'Natural commands in Telegram or WhatsApp — register a sale in one message.',
            },
            {
              icon: BarChart3,
              title: 'Reports that matter',
              text: 'Daily cash flow, bestsellers, slow movers, and customer insights when you need them.',
            },
          ].map((item, index) => (
            <Feature
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: index * 0.06 }}
            >
              <FeatureIcon>
                <item.icon size={28} strokeWidth={1.75} />
              </FeatureIcon>
              <FeatureTitle>{item.title}</FeatureTitle>
              <FeatureText>{item.text}</FeatureText>
            </Feature>
          ))}
        </FeatureGrid>
      </Section>

      <Section id="how-it-works">
        <SectionTitle>How it works</SectionTitle>
        <SectionLead>
          Start in chat or on the web — same shop, same PIN, same books.
        </SectionLead>
        <Steps>
          {[
            {
              title: 'Register your shop',
              text: 'Create an account with a business name and a 4-digit PIN.',
            },
            {
              title: 'Add products & sell',
              text: 'Stock your catalogue, then record sales from chat or the dashboard.',
            },
            {
              title: 'Watch the numbers',
              text: 'Open daily reports, customer balances, and product stats anytime.',
            },
          ].map((step, index) => (
            <Step
              key={step.title}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: index * 0.05 }}
            >
              <StepNum>{index + 1}</StepNum>
              <StepBody>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </StepBody>
            </Step>
          ))}
        </Steps>
      </Section>

      <ChannelBand id="channels">
        <ChannelInner>
          <SectionTitle>One shop. Three ways in.</SectionTitle>
          <SectionLead>
            Pick the channel that fits the moment — counter, market stall, or desk.
          </SectionLead>
          <ChannelRow>
            <Channel>
              <h3>
                <Smartphone
                  size={18}
                  style={{ verticalAlign: '-3px', marginRight: 8 }}
                />
                Telegram
              </h3>
              <p>Full command set for sales, stock, customers, and PDF reports.</p>
            </Channel>
            <Channel>
              <h3>
                <MessageCircle
                  size={18}
                  style={{ verticalAlign: '-3px', marginRight: 8 }}
                />
                WhatsApp
              </h3>
              <p>Same business logic on WhatsApp Cloud API when you enable it.</p>
            </Channel>
            <Channel>
              <h3>
                <BarChart3
                  size={18}
                  style={{ verticalAlign: '-3px', marginRight: 8 }}
                />
                Web dashboard
              </h3>
              <p>Sign in here for stats, inventory screens, and a growing POS UI.</p>
            </Channel>
          </ChannelRow>
        </ChannelInner>
      </ChannelBand>

      <Closing>
        <ClosingTitle>Ready when your customers are.</ClosingTitle>
        <ClosingLead>
          Sign in with the same user ID and PIN you use in chat.
        </ClosingLead>
        <CtaPrimary to="/login">Sign in to ChartShop</CtaPrimary>
      </Closing>
    </>
  );
}
