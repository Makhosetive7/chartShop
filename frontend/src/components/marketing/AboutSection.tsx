import styled from 'styled-components';
import {
  ArrowButton,
  Eyebrow,
} from '@/components/marketing/marketingPrimitives';

const Band = styled.section`
  background: linear-gradient(
    180deg,
    ${({ theme }) => theme.colors.maroon} 0%,
    #6b1f32 42%,
    ${({ theme }) => theme.colors.coral} 100%
  );
  padding: clamp(4rem, 10vw, 6.5rem) clamp(1.25rem, 4vw, 2.5rem);
  color: white;
`;

const Grid = styled.div`
  width: min(1120px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: clamp(2rem, 5vw, 3.5rem);
  align-items: start;

  @media (max-width: 840px) {
    grid-template-columns: 1fr;
  }
`;

const Copy = styled.div`
  h2 {
    margin: ${({ theme }) => theme.space[4]} 0;
    font-size: clamp(1.9rem, 4vw, 2.8rem);
    line-height: 1.12;
    color: white;
    max-width: 14ch;
  }

  p {
    margin: 0 0 ${({ theme }) => theme.space[4]};
    color: rgba(255, 255, 255, 0.78);
    line-height: 1.65;
    max-width: 36rem;
  }
`;

const Cards = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]};
`;

const Card = styled.div`
  padding: ${({ theme }) => theme.space[5]};
  border-radius: 0;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.1);

  .label {
    margin: 0 0 ${({ theme }) => theme.space[3]};
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.55);
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .chip {
    padding: 8px 12px;
    border-radius: 0;
    background: rgba(255, 255, 255, 0.1);
    font-size: 0.85rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }

  .quote {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.92);
  }
`;

export function AboutSection() {
  return (
    <Band id="about">
      <Grid>
        <Copy>
          <Eyebrow $tone="onDark">Why we built it</Eyebrow>
          <h2>Because chat was already the shop floor</h2>
          <p>
            We watched shops lose money to missing stock counts, forgotten credit, and
            end-of-day guesswork. Fancy POS tools felt heavy. Spreadsheets died by
            Wednesday. But Telegram and WhatsApp never left anyone’s pocket.
          </p>
          <p>
            So ChartShop put the till where the work already happens — and kept a web
            desk for when you need to sit down with the numbers.
          </p>
            <ArrowButton to="/register" variant="light">
              Open ChartShop
            </ArrowButton>
        </Copy>
        <Cards>
          <Card>
            <p className="label">The bet</p>
            <p className="quote">
              “If you can message a friend, you can run the till.”
            </p>
          </Card>
          <Card>
            <p className="label">Where it runs</p>
            <div className="row">
              <span className="chip">Telegram</span>
              <span className="chip">WhatsApp</span>
              <span className="chip">Web</span>
            </div>
          </Card>
          <Card>
            <p className="label">Who it is for</p>
            <div className="row">
              <span className="chip">Spaza &amp; cafés</span>
              <span className="chip">Market traders</span>
              <span className="chip">Independent retail</span>
            </div>
          </Card>
        </Cards>
      </Grid>
    </Band>
  );
}
