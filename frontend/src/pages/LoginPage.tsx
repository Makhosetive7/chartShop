import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth';
import { ArrowButton } from '@/components/marketing/marketingPrimitives';
import {
  AuthShell,
  AuthSwitchLink,
  ErrorText,
  Field,
  Hint,
  Input,
} from '@/components/marketing/AuthShell';

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(userId.trim(), pin.trim());
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      headline="Open the till again"
      lead="Sign in with the same user ID and PIN you use in Telegram or WhatsApp."
      showcaseTitle="Your shop picks up where you left off"
      showcaseLead="Sales, stock, and credit stay synced — chat or web, same books."
      preview={[
        { label: 'sold 2 bread @ 18', value: '+ZiG 36' },
        { label: 'Stock synced', value: '48 left' },
        { label: 'Dashboard', value: 'live' },
      ]}
      footer={
        <AuthSwitchLink
          prompt="New shop?"
          to="/register"
          label="Register ChartShop"
        />
      }
      onSubmit={onSubmit}
      actions={
        <ArrowButton type="submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </ArrowButton>
      }
    >
      <Field>
        User ID
        <Hint>Telegram id, wa:phone, or your web id</Hint>
        <Input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="e.g. 123456789 or wa:+27…"
          autoComplete="username"
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
