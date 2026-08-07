import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '@/auth';
import { ArrowButton } from '@/components/marketing/marketingPrimitives';
import { TryDemoButton } from '@/components/demo/TryDemoButton';
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

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(username.trim().toLowerCase(), pin.trim());
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: string }).code || '')
          : '';
      if (code === 'MUST_SET_PIN') {
        navigate(
          `/setup?username=${encodeURIComponent(username.trim().toLowerCase())}`,
          { replace: true },
        );
        return;
      }
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      headline="Open the till again"
      lead="Sign in with your username and PIN."
      showcaseTitle="Your shop picks up where you left off"
      showcaseLead="Sales, stock, and credit stay synced on the web — Telegram if you use it."
      preview={[
        { label: 'sold 2 bread @ 18', value: '+ZiG 36' },
        { label: 'Stock synced', value: '48 left' },
        { label: 'Dashboard', value: 'live' },
      ]}
      footer={
        <div>
          <AuthSwitchLink
            prompt="New shop?"
            to="/register"
            label="Register ChartShop"
          />
          <div>
            <AuthSwitchLink
              prompt="Forgot PIN?"
              to="/recover"
              label="Use a recovery code"
            />
          </div>
          <div>
            <AuthSwitchLink
              prompt="Invited to a team?"
              to="/setup"
              label="Set your PIN"
            />
          </div>
        </div>
      }
      onSubmit={onSubmit}
      actions={
        <ActionRow>
          <ArrowButton type="submit" loading={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </ArrowButton>
          <TryDemoButton variant="ghost" />
        </ActionRow>
      }
    >
      <Field>
        Username
        <Hint>Your personal login — same on web, Telegram, and WhatsApp</Hint>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. tinasales"
          autoComplete="username"
          pattern="[A-Za-z0-9_]{3,32}"
          required
        />
      </Field>
      <Field>
        PIN
        <Hint>4-digit PIN</Hint>
        <Input
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••"
          autoComplete="current-password"
          required
        />
      </Field>
      {error ? <ErrorText>{error}</ErrorText> : null}
    </AuthShell>
  );
}
