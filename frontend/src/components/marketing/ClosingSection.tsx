import styled from 'styled-components';
import { motion } from 'framer-motion';
import { ArrowButton } from '@/components/marketing/marketingPrimitives';
import { TryDemoButton } from '@/components/demo/TryDemoButton';

const Wrap = styled.section`
  padding: 0 clamp(1.25rem, 4vw, 2.5rem) clamp(3.5rem, 8vw, 5rem);
`;

const Banner = styled(motion.div)`
  width: min(1080px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: ${({ theme }) => theme.space[5]};
  align-items: center;
  padding: clamp(2rem, 5vw, 3rem);
  border-radius: 0;
  background:
    radial-gradient(circle at 88% 40%, rgba(245, 160, 122, 0.3), transparent 42%),
    linear-gradient(145deg, #5c1024, #4a0e1c 55%, #3d0a16);
  color: white;
  overflow: hidden;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }

  h2 {
    margin: 0 0 ${({ theme }) => theme.space[3]};
    color: white;
    font-size: clamp(1.85rem, 3.5vw, 2.5rem);
    max-width: 14ch;
  }

  p {
    margin: 0 0 ${({ theme }) => theme.space[5]};
    color: rgba(255, 255, 255, 0.78);
    line-height: 1.6;
    max-width: 32rem;
  }
`;

const CtaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
`;

const Graphic = styled.div`
  display: grid;
  gap: 10px;
`;

const Line = styled(motion.div)`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 0;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 0.9rem;

  strong {
    color: ${({ theme }) => theme.colors.peach};
  }
`;

export function ClosingSection() {
  return (
    <Wrap>
      <Banner
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div>
          <h2>Open your shop on the web</h2>
          <p>
            First sale on the dashboard. Stock that stays honest. Credit you can
            collect. Telegram works today — WhatsApp is coming next.
          </p>
            <CtaRow>
              <TryDemoButton variant="light" />
              <ArrowButton to="/register" variant="ghost">
                Create your shop
              </ArrowButton>
            </CtaRow>
        </div>
        <Graphic aria-hidden>
          {[
            { k: 'sold 2 bread @ 18', v: '+ZiG 36' },
            { k: 'Stock synced', v: '48 left' },
            { k: 'Web dashboard', v: 'live' },
          ].map((row, i) => (
            <Line
              key={row.k}
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + i * 0.08 }}
            >
              <span>{row.k}</span>
              <strong>{row.v}</strong>
            </Line>
          ))}
        </Graphic>
      </Banner>
    </Wrap>
  );
}
