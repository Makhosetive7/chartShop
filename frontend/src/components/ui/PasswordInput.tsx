import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
} from 'react';
import styled, { css } from 'styled-components';
import { Eye, EyeOff } from 'lucide-react';

type PasswordInputVariant = 'auth' | 'app';

export type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  /** Visual match for auth forms vs in-app settings forms. */
  variant?: PasswordInputVariant;
  $invalid?: boolean;
};

const Wrap = styled.div`
  position: relative;
  width: 100%;
  max-width: 100%;
`;

const sharedFocus = css<{ $invalid?: boolean }>`
  &:focus {
    outline: none;
    border-color: ${({ theme, $invalid }) =>
      $invalid ? theme.colors.danger : theme.colors.borderStrong};
    box-shadow: 0 0 0 3px
      ${({ theme, $invalid }) =>
        $invalid ? theme.colors.dangerTint : theme.colors.primaryTint};
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const Field = styled.input<{
  $variant: PasswordInputVariant;
  $invalid?: boolean;
}>`
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  border: 1px solid
    ${({ theme, $invalid }) =>
      $invalid ? theme.colors.danger : theme.colors.border};
  border-radius: 0;
  font: inherit;
  color: ${({ theme }) => theme.colors.textPrimary};
  padding: ${({ $variant }) =>
    $variant === 'auth' ? '13px 44px 13px 14px' : '11px 44px 11px 13px'};
  background: ${({ theme, $invalid }) =>
    $invalid ? theme.colors.dangerTint : theme.colors.cream};
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }

  ${sharedFocus}
`;

const Toggle = styled.button`
  position: absolute;
  top: 50%;
  right: 6px;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  line-height: 0;

  &:hover {
    color: ${({ theme }) => theme.colors.maroon};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryTint};
    color: ${({ theme }) => theme.colors.maroon};
  }
`;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      variant = 'app',
      $invalid,
      id,
      className,
      disabled,
      ...rest
    },
    ref,
  ) {
    const [visible, setVisible] = useState(false);
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <Wrap className={className}>
        <Field
          {...rest}
          ref={ref}
          id={inputId}
          type={visible ? 'text' : 'password'}
          $variant={variant}
          $invalid={$invalid}
          disabled={disabled}
        />
        <Toggle
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-controls={inputId}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOff size={18} strokeWidth={2} aria-hidden />
          ) : (
            <Eye size={18} strokeWidth={2} aria-hidden />
          )}
        </Toggle>
      </Wrap>
    );
  },
);
