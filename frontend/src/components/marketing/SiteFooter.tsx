import { Link } from 'react-router-dom';
import styled from 'styled-components';

const Foot = styled.footer`
  margin-top: auto;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  padding: ${({ theme }) => theme.space[6]} clamp(1.25rem, 4vw, 3rem)
    ${({ theme }) => theme.space[5]};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1.4fr repeat(2, 1fr);
  gap: ${({ theme }) => theme.space[6]};
  max-width: 1100px;
  margin: 0 auto;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.space[5]};
  }
`;

const Brand = styled.div`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: 1.25rem;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.space[2]};
`;

const Blurb = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  max-width: 28rem;
  line-height: 1.55;
`;

const ColTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.space[3]};
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.textMuted};
  font-family: ${({ theme }) => theme.fonts.body};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
`;

const Item = styled.li`
  a {
    color: ${({ theme }) => theme.colors.textSecondary};
    text-decoration: none;
    font-weight: ${({ theme }) => theme.fontWeights.medium};

    &:hover {
      color: ${({ theme }) => theme.colors.primary};
    }
  }
`;

const Bottom = styled.div`
  max-width: 1100px;
  margin: ${({ theme }) => theme.space[6]} auto 0;
  padding-top: ${({ theme }) => theme.space[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.875rem;
`;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <Foot>
      <Grid>
        <div>
          <Brand>ChartShop</Brand>
          <Blurb>
            Run sales, stock, credit, and reports from Telegram, WhatsApp, or the web —
            built for small shops that move fast.
          </Blurb>
        </div>
        <div>
          <ColTitle>Product</ColTitle>
          <List>
            <Item>
              <a href="/#features">Features</a>
            </Item>
            <Item>
              <a href="/#how-it-works">How it works</a>
            </Item>
            <Item>
              <a href="/#channels">Channels</a>
            </Item>
          </List>
        </div>
        <div>
          <ColTitle>Account</ColTitle>
          <List>
            <Item>
              <Link to="/login">Sign in</Link>
            </Item>
            <Item>
              <Link to="/login">Get started</Link>
            </Item>
            <Item>
              <Link to="/app">Dashboard</Link>
            </Item>
          </List>
        </div>
      </Grid>
      <Bottom>© {year} ChartShop. All rights reserved.</Bottom>
    </Foot>
  );
}
