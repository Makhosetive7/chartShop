import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  CenterIntro,
  Eyebrow,
  SectionLead,
  SectionTitle,
} from '@/components/marketing/marketingPrimitives';

const Band = styled.section`
  position: relative;
  padding: clamp(4rem, 10vw, 6.5rem) clamp(1.25rem, 4vw, 2.5rem);
  background:
    radial-gradient(ellipse at 50% 0%, rgba(245, 160, 122, 0.28), transparent 55%),
    ${({ theme }) => theme.colors.background};
`;

const Stack = styled.div`
  width: min(980px, 100%);
  margin: 0 auto;
  display: grid;
  gap: ${({ theme }) => theme.space[4]};
`;

const Card = styled(motion.article)`
  display: grid;
  grid-template-columns: minmax(200px, 0.95fr) 1.15fr;
  gap: ${({ theme }) => theme.space[5]};
  align-items: center;
  padding: ${({ theme }) => theme.space[5]};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 0;
  box-shadow: ${({ theme }) => theme.shadows.card};

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const Visual = styled.div<{ $bg: string }>`
  min-height: 168px;
  border-radius: 0;
  background: ${({ $bg }) => $bg};
  padding: 14px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
`;

const Body = styled.div`
  h3 {
    margin: 0 0 ${({ theme }) => theme.space[2]};
    font-size: 1.25rem;
    color: ${({ theme }) => theme.colors.maroon};
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.6;
  }
`;

const NoteLine = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 0;
  background: rgba(255, 255, 255, 0.72);
  font-size: 0.82rem;
  color: ${({ theme }) => theme.colors.textSecondary};

  strong {
    color: ${({ theme }) => theme.colors.textPrimary};
  }

  .bad {
    color: ${({ theme }) => theme.colors.danger};
    font-weight: 700;
  }
`;

const Slip = styled.div`
  padding: 12px;
  border-radius: 0;
  background: rgba(255, 255, 255, 0.78);
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.maroon};
  line-height: 1.45;

  span {
    display: block;
    font-family: ${({ theme }) => theme.fonts.body};
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.textMuted};
    margin-bottom: 4px;
  }
`;

const Sheet = styled.div`
  padding: 12px;
  border-radius: 0;
  background: rgba(255, 255, 255, 0.78);
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textSecondary};

  .row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: 1px dashed ${({ theme }) => theme.colors.border};
  }

  .late {
    margin-top: 8px;
    color: ${({ theme }) => theme.colors.coral};
    font-weight: 700;
  }
`;

const PROBLEMS = [
  {
    title: 'The till and the chat disagree',
    text: 'A sale in Telegram, a note in the book, cash in the drawer — by Friday nobody knows what actually sold.',
    bg: 'linear-gradient(160deg, #FAE8DC, #F5D5C0)',
    visual: 'till' as const,
  },
  {
    title: 'Credit lives on scraps of paper',
    text: '“Thabo owes something” is not a ledger. Collections stall when the balance only exists in someone’s head.',
    bg: 'linear-gradient(160deg, #F8E8EC, #F5D5C0)',
    visual: 'credit' as const,
  },
  {
    title: 'Closing is a spreadsheet scramble',
    text: 'You rebuild the day after the customers leave. Stockouts and slow movers only show up when it is already too late.',
    bg: 'linear-gradient(160deg, #EDE4DC, #F5D5C0)',
    visual: 'sheet' as const,
  },
];

export function ProblemSection() {
  return (
    <Band id="problem">
      <CenterIntro>
        <Eyebrow>The Friday feeling</Eyebrow>
        <SectionTitle>When the books only live in your head</SectionTitle>
        <SectionLead>
          Small shops move fast. Without one till that follows you, cash, stock, and
          credit drift apart — quietly, then painfully.
        </SectionLead>
      </CenterIntro>
      <Stack>
        {PROBLEMS.map((item, index) => (
          <Card
            key={item.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: index * 0.06 }}
          >
            <Visual $bg={item.bg}>
              {item.visual === 'till' && (
                <>
                  <NoteLine>
                    <span>Chat: sold bread ×2</span>
                    <strong>+ZiG 36?</strong>
                  </NoteLine>
                  <NoteLine>
                    <span>Notebook: ???</span>
                    <span className="bad">missing</span>
                  </NoteLine>
                  <NoteLine>
                    <span>Drawer count</span>
                    <span className="bad">off by ZiG 80</span>
                  </NoteLine>
                </>
              )}
              {item.visual === 'credit' && (
                <>
                  <Slip>
                    <span>Torn receipt · undated</span>
                    Thabo — airtime… ZiG 50?
                    <br />
                    or was it ZiG 100?
                  </Slip>
                  <NoteLine>
                    <span>Asked twice this week</span>
                    <span className="bad">still unclear</span>
                  </NoteLine>
                </>
              )}
              {item.visual === 'sheet' && (
                <Sheet>
                  <div className="row">
                    <span>Milk 1L</span>
                    <span>sold out 2pm</span>
                  </div>
                  <div className="row">
                    <span>Brown bread</span>
                    <span>guess: 12 left</span>
                  </div>
                  <div className="row">
                    <span>Cash total</span>
                    <span>rebuild tomorrow</span>
                  </div>
                  <div className="late">Report ready · after close</div>
                </Sheet>
              )}
            </Visual>
            <Body>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </Body>
          </Card>
        ))}
      </Stack>
    </Band>
  );
}
