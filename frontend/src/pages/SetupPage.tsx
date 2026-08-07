import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '@/auth';
import { setupPin } from '@/api/auth';
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

export function SetupPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState(params.get('username') || '');
  const [setupCode, setSetupCode] = useState(params.get('code') || '');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
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
    if (!setupCode.trim()) {
      setError('Enter the setup code from your admin.');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }

    setPending(true);
    try {
      const result = await setupPin({
        username: user,
        setupCode: setupCode.trim(),
        newPin,
      });
      if (!result.success) {
        setError(result.error || 'Could not set PIN');
        return;
      }
      setSuccess(result.message || 'PIN set. You can sign in now.');
      window.setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set PIN');
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Team invite"
      headline="Set your PIN"
      lead="Your admin invited you. Use your username, the one-time setup code, and choose a 4-digit PIN."
      showcaseTitle="One-time setup"
      showcaseLead="After this, sign in with username + PIN on web, Telegram, and WhatsApp."
      preview={[
        { label: 'Need', value: 'setup code' },
        { label: 'Choose', value: 'your PIN' },
        { label: 'Then', value: 'sign in' },
      ]}
      footer={
        <AuthSwitchLink prompt="Already set your PIN?" to="/login" label="Sign in" />
      }
      onSubmit={onSubmit}
      actions={
        <ActionRow>
          <ArrowButton type="submit" loading={pending}>
            {pending ? 'Saving…' : 'Set PIN'}
          </ArrowButton>
        </ActionRow>
      }
    >
      {error ? <ErrorText>{error}</ErrorText> : null}
      {success ? <Success>{success}</Success> : null}
      <Field>
        Username
        <Hint>The username your admin created for you</Hint>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. thabo"
          autoComplete="username"
          required
        />
      </Field>
      <Field>
        Setup code
        <Hint>Shown once to your admin — format like cs-xxxx-xxxx</Hint>
        <Input
          value={setupCode}
          onChange={(e) => setSetupCode(e.target.value)}
          placeholder="cs-xxxx-xxxx"
          autoComplete="off"
          spellCheck={false}
          required
        />
      </Field>
      <Field>
        Your PIN
        <Hint>Exactly 4 digits — avoid 1234 / 0000</Hint>
        <Input
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={newPin}
          onChange={(e) => setNewPin(e.target.value)}
          autoComplete="new-password"
          required
        />
      </Field>
      <Field>
        Confirm PIN
        <Input
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value)}
          autoComplete="new-password"
          required
        />
      </Field>
    </AuthShell>
  );
}
