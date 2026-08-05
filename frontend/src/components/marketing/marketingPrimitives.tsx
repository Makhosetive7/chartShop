import styled from 'styled-components';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

export const Eyebrow = styled.span<{ $tone?: 'light' | 'dark' | 'onDark' }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 0;
  background: ${({ theme, $tone }) =>
    $tone === 'onDark'
      ? 'rgba(232, 90, 79, 0.22)'
      : $tone === 'dark'
        ? theme.colors.peach
        : theme.colors.peach};
  color: ${({ theme, $tone }) =>
    $tone === 'onDark' ? theme.colors.textOnDark : theme.colors.maroon};
  font-size: 0.72rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-family: ${({ theme }) => theme.fonts.body};

  &::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 0;
    background: ${({ theme, $tone }) =>
      $tone === 'onDark' ? theme.colors.coral : theme.colors.primary};
  }
`;

type ArrowButtonProps = {
  children: ReactNode;
  variant?: 'filled' | 'light' | 'ghost';
  to?: string;
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
};

export function ArrowButton({
  children,
  variant = 'filled',
  to,
  href,
  onClick,
  type = 'button',
  disabled,
  loading,
}: ArrowButtonProps) {
  const mapped =
    variant === 'ghost' ? 'ghost' : variant === 'light' ? 'light' : 'filled';

  if (to) {
    return (
      <Button to={to} variant={mapped} onClick={onClick}>
        {children}
      </Button>
    );
  }
  if (href) {
    return (
      <Button href={href} variant={mapped} onClick={onClick}>
        {children}
      </Button>
    );
  }
  return (
    <Button
      type={type}
      variant={mapped}
      disabled={disabled}
      loading={loading}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export const SectionShell = styled.section`
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: clamp(3.5rem, 9vw, 6.5rem) clamp(1.25rem, 4vw, 2.5rem);
`;

export const CenterIntro = styled.div`
  text-align: center;
  max-width: 42rem;
  margin: 0 auto ${({ theme }) => theme.space[6]};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space[4]};
`;

export const SectionTitle = styled.h2<{ $onDark?: boolean }>`
  margin: 0;
  font-size: clamp(1.85rem, 4vw, 2.75rem);
  line-height: 1.12;
  letter-spacing: -0.03em;
  color: ${({ theme, $onDark }) =>
    $onDark ? theme.colors.textOnDark : theme.colors.maroon};
`;

export const SectionLead = styled.p<{ $onDark?: boolean }>`
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.65;
  color: ${({ theme, $onDark }) =>
    $onDark ? theme.colors.textOnDarkMuted : theme.colors.textSecondary};
`;
