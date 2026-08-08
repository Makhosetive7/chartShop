import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '@/auth';
import { redeemRecovery } from '@/api/auth';
import { ArrowButton } from '@/components/marketing/marketingPrimitives';
import {
  AuthShell,
  AuthSwitchLink,
  ErrorText,
  Field,
  Hint,
  Input,
} from '@/components/marketing/AuthShell';

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
`;

const Success = styled.p`
  margin: 0;
  padding: 10px 12px;
  background: ${({ theme }) => theme.colors.primaryTint};
  color: ${({ theme }) => theme.colors.maroon};
  font-size: 0.9rem;
  line-height: 1.45;
`;

export function RecoverPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const user = username.trim().toLowerCase();
    if (!user || user.length < 3) {
      setError('Enter your username.');
      return;
    }
    if (!code.trim()) {
      setError('Enter a recovery code.');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setError('New PIN must be exactly 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }

    setPending(true);
    try {
      const result = await redeemRecovery({
        username: user,
        code: code.trim(),
        newPin,
      });
      if (!result.success) {
        setError(result.error || 'Recovery failed');
        return;
      }
      setSuccess(
        result.message ||
          'PIN reset. Sign in with your new PIN. Generate new recovery codes in Settings after login.',
      );
      window.setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recovery failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      headline="Reset your PIN with a recovery code"
      lead="Enter your username, one unused recovery code, and a new 4-digit PIN."
      showcaseTitle="Codes are one-time"
      showcaseLead="Each code works once. After reset, sign in and regenerate a fresh set in Settings."
      preview={[
        { label: 'Need', value: '1 code' },
        { label: 'Then', value: 'new PIN' },
        { label: 'Sign in', value: '/login' },
      ]}
      footer={
        <AuthSwitchLink prompt="Remembered your PIN?" to="/login" label="Sign in" />
      }
      onSubmit={onSubmit}
      actions={
        <ActionRow>
          <ArrowButton type="submit" loading={pending}>
            {pending ? 'Resetting…' : 'Reset PIN'}
          </ArrowButton>
        </ActionRow>
      }
    >
      <Field>
        Username
        <Hint>The username you use to sign in</Hint>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your username"
          autoComplete="username"
          required
        />
      </Field>
      <Field>
        Recovery code
        <Hint>Format like cs-xxxx-xxxx — spaces and dashes are fine</Hint>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste recovery code"
          autoComplete="off"
          spellCheck={false}
          required
        />
      </Field>
      <Field>
        New PIN
        <Hint>Exactly 4 digits — avoid 1234 / 0000</Hint>
        <Input
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={newPin}
          onChange={(e) => setNewPin(e.target.value)}
          placeholder="New 4-digit PIN"
          autoComplete="new-password"
          required
        />
      </Field>
      <Field>
        Confirm new PIN
        <Input
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value)}
          placeholder="Repeat new PIN"
          autoComplete="new-password"
          required
        />
      </Field>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {success ? (
        <Success>
          {success}{' '}
          <Link to="/login">Go to sign in</Link>
        </Success>
      ) : null}
    </AuthShell>
  );
}
