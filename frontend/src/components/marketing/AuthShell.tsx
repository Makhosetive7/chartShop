import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Eyebrow } from '@/components/marketing/marketingPrimitives';

const float = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -10px, 0); }
`;

const Page = styled.div`
  position: relative;
  min-height: calc(100vh - 72px);
  display: grid;
  place-items: center;
  padding: clamp(1.5rem, 4vw, 2.5rem);
  overflow: hidden;
  background:
    radial-gradient(ellipse 60% 45% at 15% 10%, rgba(245, 160, 122, 0.22), transparent 55%),
    radial-gradient(ellipse 50% 40% at 90% 80%, rgba(196, 59, 90, 0.12), transparent 50%),
    ${({ theme }) => theme.colors.background};
`;

const Shell = styled(motion.div)`
  width: min(980px, 100%);
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  border-radius: 0;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.float};

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const FormPane = styled.div`
  padding: clamp(1.75rem, 4vw, 2.75rem);
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[5]};
`;

const Intro = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]};
`;

const Brand = styled.p`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: clamp(2rem, 4vw, 2.6rem);
  letter-spacing: -0.04em;
  line-height: 0.95;
  color: ${({ theme }) => theme.colors.maroon};
`;

const Headline = styled.h1`
  margin: 0;
  font-size: clamp(1.25rem, 2.4vw, 1.55rem);
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.textPrimary};
  max-width: 18ch;
`;

const Lead = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.55;
  font-size: 0.98rem;
  max-width: 34ch;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]};
`;

const FooterNote = styled.div`
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.92rem;
  color: ${({ theme }) => theme.colors.textSecondary};

  a {
    color: ${({ theme }) => theme.colors.maroon};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const Showcase = styled.aside`
  position: relative;
  padding: clamp(1.5rem, 3.5vw, 2.25rem);
  background:
    radial-gradient(circle at 18% 20%, rgba(245, 160, 122, 0.35), transparent 40%),
    radial-gradient(circle at 85% 75%, rgba(196, 59, 90, 0.25), transparent 42%),
    linear-gradient(150deg, #6a1530 0%, #4a0e1c 48%, #2f0812 100%);
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[5]};
  min-height: 420px;

  @media (max-width: 820px) {
    min-height: 280px;
  }
`;

const Orb = styled.div<{ $size: number; $x: string; $y: string }>`
  position: absolute;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  left: ${({ $x }) => $x};
  top: ${({ $y }) => $y};
  border-radius: 0;
  background: radial-gradient(
    circle at 30% 30%,
    rgba(255, 190, 170, 0.5),
    rgba(196, 59, 90, 0.1) 60%,
    transparent 72%
  );
  animation: ${float} 7s ease-in-out infinite;
  pointer-events: none;
`;

const ShowcaseCopy = styled.div`
  position: relative;
  z-index: 1;

  h2 {
    margin: 0 0 10px;
    color: white;
    font-size: clamp(1.35rem, 2.5vw, 1.7rem);
    max-width: 14ch;
  }

  p {
    margin: 0;
    color: rgba(255, 255, 255, 0.78);
    line-height: 1.55;
    font-size: 0.95rem;
    max-width: 28ch;
  }
`;

const Preview = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
`;

const PreviewLine = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 0;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 0.88rem;

  strong {
    color: ${({ theme }) => theme.colors.peach};
  }
`;

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.88rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const Hint = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.regular};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.8rem;
`;

export const Input = styled.input`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  padding: 13px 14px;
  background: ${({ theme }) => theme.colors.cream};
  color: ${({ theme }) => theme.colors.textPrimary};
  font: inherit;

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.borderStrong};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryTint};
    background: ${({ theme }) => theme.colors.surface};
  }
`;

export const ErrorText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.danger};
  background: ${({ theme }) => theme.colors.dangerTint};
  border-radius: 0;
  padding: 10px 12px;
  font-size: 0.9rem;
`;

type AuthShellProps = {
  eyebrow: string;
  headline: string;
  lead: string;
  showcaseTitle: string;
  showcaseLead: string;
  preview: Array<{ label: string; value: string }>;
  footer?: ReactNode;
  onSubmit?: (event: FormEvent) => void;
  children: ReactNode;
  actions?: ReactNode;
};

export function AuthShell({
  eyebrow,
  headline,
  lead,
  showcaseTitle,
  showcaseLead,
  preview,
  footer = null,
  onSubmit,
  children,
  actions = null,
}: AuthShellProps) {
  return (
    <Page>
      <Shell
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <FormPane>
          <Intro>
            <Eyebrow>{eyebrow}</Eyebrow>
            <div>
              <Brand>ChartShop</Brand>
              <Headline>{headline}</Headline>
            </div>
            <Lead>{lead}</Lead>
          </Intro>
          <Form
            onSubmit={(event) => {
              if (onSubmit) onSubmit(event);
              else event.preventDefault();
            }}
          >
            {children}
            {actions}
          </Form>
          {footer ? <FooterNote>{footer}</FooterNote> : null}
        </FormPane>

        <Showcase>
          <Orb $size={140} $x="8%" $y="12%" />
          <Orb $size={80} $x="70%" $y="62%" />
          <ShowcaseCopy>
            <h2>{showcaseTitle}</h2>
            <p>{showcaseLead}</p>
          </ShowcaseCopy>
          <Preview>
            {preview.map((row) => (
              <PreviewLine key={row.label}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </PreviewLine>
            ))}
          </Preview>
        </Showcase>
      </Shell>
    </Page>
  );
}

export function AuthSwitchLink({
  prompt,
  to,
  label,
}: {
  prompt: string;
  to: string;
  label: string;
}) {
  return (
    <>
      {prompt} <Link to={to}>{label}</Link>
    </>
  );
}
