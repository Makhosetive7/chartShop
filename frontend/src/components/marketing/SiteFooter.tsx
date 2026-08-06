import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '@/auth';
import { Button } from '@/components/ui/Button';
import { BrandMark } from '@/components/ui/BrandMark';

const Foot = styled.footer`
  margin-top: auto;
  background: ${({ theme }) => theme.colors.ink};
  color: ${({ theme }) => theme.colors.textOnDarkMuted};
  padding: clamp(3rem, 7vw, 4.5rem) clamp(1.25rem, 4vw, 2.5rem)
    ${({ theme }) => theme.space[5]};
`;

const Newsletter = styled.div`
  width: min(1120px, 100%);
  margin: 0 auto ${({ theme }) => theme.space[7]};
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[5]};
`;

const NewsCopy = styled.div`
  h3 {
    margin: 0 0 ${({ theme }) => theme.space[3]};
    color: ${({ theme }) => theme.colors.textOnDark};
    font-size: clamp(1.35rem, 2.5vw, 1.75rem);
  }
`;

const FormRow = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 10px;
  width: min(420px, 100%);
`;

const Input = styled.input`
  flex: 1 1 180px;
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 0;
  padding: 0 16px;
  min-height: 48px;
  background: rgba(139, 30, 58, 0.35);
  color: ${({ theme }) => theme.colors.textOnDark};
  font: inherit;
  box-sizing: border-box;

  &::placeholder {
    color: rgba(255, 255, 255, 0.45);
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.coral};
    box-shadow: 0 0 0 2px rgba(232, 90, 79, 0.35);
  }
`;

const LinkGrid = styled.div`
  width: min(1120px, 100%);
  margin: 0 auto ${({ theme }) => theme.space[7]};
  display: grid;
  grid-template-columns: 1.4fr repeat(3, 1fr);
  gap: ${({ theme }) => theme.space[6]};

  @media (max-width: 840px) {
    grid-template-columns: 1fr 1fr;
    gap: ${({ theme }) => theme.space[5]};
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const BrandCol = styled.div`
  @media (max-width: 840px) {
    grid-column: 1 / -1;
  }
`;

const Brand = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: ${({ theme }) => theme.space[3]};
  text-decoration: none;
  color: ${({ theme }) => theme.colors.textOnDark};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: 1.25rem;
  letter-spacing: -0.03em;
`;

const Blurb = styled.p`
  margin: 0;
  max-width: 28rem;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.textOnDarkMuted};
`;

const ColTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.space[3]};
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.45);
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
    color: ${({ theme }) => theme.colors.textOnDarkMuted};
    text-decoration: none;
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    font-size: 0.95rem;

    &:hover {
      color: ${({ theme }) => theme.colors.textOnDark};
    }
  }
`;

const Wordmark = styled.p`
  width: min(1120px, 100%);
  margin: 0 auto;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: clamp(3.5rem, 14vw, 9.5rem);
  line-height: 0.85;
  letter-spacing: -0.06em;
  color: #2a1014;
  user-select: none;
  text-align: center;
`;

const Bottom = styled.div`
  width: min(1120px, 100%);
  margin: ${({ theme }) => theme.space[5]} auto 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  font-size: 0.85rem;
`;

const PRODUCT_LINKS = [
  { href: '/#problem', label: 'The Friday feeling' },
  { href: '/#solution', label: 'How it works' },
  { href: '/#use-cases', label: 'On the floor' },
  { href: '/#channels', label: 'Channels' },
] as const;

const COMPANY_LINKS = [
  { href: '/#about', label: 'Why we built it' },
  { href: '/#security', label: 'Trust the till' },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();
  const { isAuthenticated } = useAuth();

  return (
    <Foot>
      <Newsletter>
        <NewsCopy>
          <h3>Shop tips in your inbox</h3>
          <p style={{ margin: 0 }}>
            New commands, closing tricks, and ChartShop updates — no fluff.
          </p>
        </NewsCopy>
        <FormRow
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <Input type="email" placeholder="Enter your email" aria-label="Email" />
          <Button type="submit" variant="filled">
            Submit
          </Button>
        </FormRow>
      </Newsletter>

      <LinkGrid>
        <BrandCol>
          <Brand to="/">
            <BrandMark size={28} />
            ChartShop
          </Brand>
          <Blurb>
            Sales, stock, and credit on the web today — Telegram available,
            WhatsApp coming soon.
          </Blurb>
        </BrandCol>

        <div>
          <ColTitle>Product</ColTitle>
          <List>
            {PRODUCT_LINKS.map((link) => (
              <Item key={link.href}>
                <a href={link.href}>{link.label}</a>
              </Item>
            ))}
          </List>
        </div>

        <div>
          <ColTitle>Company</ColTitle>
          <List>
            {COMPANY_LINKS.map((link) => (
              <Item key={link.href}>
                <a href={link.href}>{link.label}</a>
              </Item>
            ))}
          </List>
        </div>

        <div>
          <ColTitle>Account</ColTitle>
          <List>
            {isAuthenticated ? (
              <>
                <Item>
                  <Link to="/app">Open dashboard</Link>
                </Item>
                <Item>
                  <Link to="/app/settings">Settings</Link>
                </Item>
              </>
            ) : (
              <>
                <Item>
                  <Link to="/login">Sign in</Link>
                </Item>
                <Item>
                  <Link to="/register">Create shop</Link>
                </Item>
              </>
            )}
          </List>
        </div>
      </LinkGrid>

      <Wordmark aria-hidden>ChartShop</Wordmark>

      <Bottom>
        <span>Built for shops that move fast.</span>
        <span>© {year} ChartShop. All rights reserved.</span>
      </Bottom>
    </Foot>
  );
}
