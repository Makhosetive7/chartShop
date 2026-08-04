import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowRight } from 'lucide-react';

const HEIGHT = {
  md: 48,
  sm: 40,
} as const;

type Tone = 'filled' | 'light' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

const Root = styled.button<{ $size: Size }>`
  border: none;
  background: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  font: inherit;
  line-height: 0;
  display: inline-flex;
  align-items: stretch;
  vertical-align: middle;
  flex-shrink: 1;
  max-width: 100%;
  height: ${({ $size }) => HEIGHT[$size]}px;
  box-sizing: border-box;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &:disabled > span {
    transform: none !important;
  }
`;

const LinkRoot = styled(Link)<{ $size: Size }>`
  display: inline-flex;
  align-items: stretch;
  text-decoration: none;
  color: inherit;
  flex-shrink: 1;
  max-width: 100%;
  line-height: 0;
  height: ${({ $size }) => HEIGHT[$size]}px;
  box-sizing: border-box;
  vertical-align: middle;
`;

const AnchorRoot = styled.a<{ $size: Size }>`
  display: inline-flex;
  align-items: stretch;
  text-decoration: none;
  color: inherit;
  flex-shrink: 1;
  max-width: 100%;
  line-height: 0;
  height: ${({ $size }) => HEIGHT[$size]}px;
  box-sizing: border-box;
  vertical-align: middle;
`;

const Base = styled.span<{ $tone: Tone; $size: Size }>`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  width: 100%;
  height: 100%;
  border-radius: 0;
  overflow: hidden;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ $size }) => ($size === 'sm' ? '0.85rem' : '0.95rem')};
  line-height: 1;
  box-sizing: border-box;
  border: 1px solid
    ${({ theme, $tone }) => {
      if ($tone === 'filled') return theme.colors.maroonDeep;
      if ($tone === 'danger') return '#9f1239';
      return theme.colors.maroon;
    }};
  transition: transform 0.2s ease;

  ${Root}:hover:not(:disabled) &,
  ${LinkRoot}:hover &,
  ${AnchorRoot}:hover & {
    transform: translateY(-1px);
  }
`;

const Label = styled.span<{ $tone: Tone; $size: Size }>`
  display: flex;
  align-items: center;
  align-self: stretch;
  gap: 8px;
  flex: 1 1 auto;
  height: auto;
  min-height: 100%;
  min-width: 0;
  padding: ${({ $size }) => ($size === 'sm' ? '0 14px 0 16px' : '0 18px 0 20px')};
  box-sizing: border-box;
  border: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
  background: ${({ theme, $tone }) => {
    if ($tone === 'filled') return theme.colors.maroon;
    if ($tone === 'light') return theme.colors.surface;
    if ($tone === 'danger') return theme.colors.danger;
    return 'transparent';
  }};
  color: ${({ theme, $tone }) => {
    if ($tone === 'ghost') return theme.colors.maroon;
    if ($tone === 'light') return theme.colors.maroon;
    return theme.colors.textOnDark;
  }};
`;

const IconBox = styled.span<{ $tone: Tone; $size: Size }>`
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  flex: 0 0 auto;
  aspect-ratio: 1 / 1;
  height: auto;
  width: auto;
  box-sizing: border-box;
  border: none;
  border-left: 1px solid
    ${({ theme, $tone }) => {
      if ($tone === 'filled') return 'rgba(255, 255, 255, 0.18)';
      if ($tone === 'danger') return 'rgba(255, 255, 255, 0.2)';
      return theme.colors.maroon;
    }};
  margin: 0;
  line-height: 0;
  background: ${({ theme, $tone }) => {
    if ($tone === 'filled') return theme.colors.maroonDeep;
    if ($tone === 'danger') return '#9f1239';
    return theme.colors.maroon;
  }};
  color: ${({ theme }) => theme.colors.textOnDark};

  svg {
    display: block;
    flex-shrink: 0;
  }
`;

function mapVariant(
  variant: 'primary' | 'ghost' | 'danger' | 'filled' | 'light' | undefined,
): Tone {
  if (variant === 'ghost') return 'ghost';
  if (variant === 'danger') return 'danger';
  if (variant === 'light') return 'light';
  if (variant === 'filled') return 'filled';
  return 'filled';
}

type CommonProps = {
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'danger' | 'filled' | 'light';
  /** @deprecated prefer variant — kept for existing call sites */
  $variant?: 'primary' | 'ghost' | 'danger';
  size?: Size;
  $size?: Size;
  disabled?: boolean;
  className?: string;
};

export type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    to?: never;
    href?: never;
  };

type LinkButtonProps = CommonProps & {
  to: string;
  href?: never;
  type?: never;
  onClick?: () => void;
};

type AnchorButtonProps = CommonProps & {
  href: string;
  to?: never;
  type?: never;
  onClick?: () => void;
};

function ArrowFace({
  children,
  tone,
  size,
}: {
  children: ReactNode;
  tone: Tone;
  size: Size;
}) {
  return (
    <Base $tone={tone} $size={size}>
      <Label $tone={tone} $size={size}>
        {children}
      </Label>
      <IconBox $tone={tone} $size={size}>
        <ArrowRight size={size === 'sm' ? 16 : 18} strokeWidth={2.25} />
      </IconBox>
    </Base>
  );
}

export function Button({
  children,
  variant,
  $variant,
  size,
  $size,
  disabled,
  className,
  type = 'button',
  to,
  href,
  onClick,
  ...rest
}: ButtonProps | LinkButtonProps | AnchorButtonProps) {
  const tone = mapVariant(variant ?? $variant);
  const sz = size ?? $size ?? 'md';
  const face = (
    <ArrowFace tone={tone} size={sz}>
      {children}
    </ArrowFace>
  );

  if (to) {
    return (
      <LinkRoot to={to} $size={sz} className={className} onClick={onClick}>
        {face}
      </LinkRoot>
    );
  }

  if (href) {
    return (
      <AnchorRoot href={href} $size={sz} className={className} onClick={onClick}>
        {face}
      </AnchorRoot>
    );
  }

  return (
    <Root
      type={type}
      $size={sz}
      disabled={disabled}
      className={className}
      onClick={onClick}
      {...rest}
    >
      {face}
    </Root>
  );
}
