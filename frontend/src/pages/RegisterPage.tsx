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

export function RegisterPage() {
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState('');
  const [userId, setUserId] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }

    setPending(true);
    try {
      await register({
        userId: userId.trim(),
        businessName: businessName.trim(),
        pin: pin.trim(),
        businessDescription:
          businessDescription.trim() || 'General merchandise',
      });
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Open your shop"
      headline="Register the till in minutes"
      lead="Pick a shop name, a user ID, and a 4-digit PIN — same credentials work in chat later."
      showcaseTitle="First sale starts with a message"
      showcaseLead="After register, you can sell from Telegram, WhatsApp, or this dashboard."
      preview={[
        { label: 'Shop ready', value: '✓' },
        { label: 'Try', value: 'sold 1 milk @ 22' },
        { label: 'Books', value: 'synced' },
      ]}
      footer={
        <AuthSwitchLink prompt="Already registered?" to="/login" label="Sign in" />
      }
      onSubmit={onSubmit}
      actions={
        <ArrowButton type="submit" disabled={pending}>
          {pending ? 'Creating shop…' : 'Create shop'}
        </ArrowButton>
      }
    >
      <Field>
        Shop name
        <Hint>How it shows on reports</Hint>
        <Input
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="e.g. Luna Spaza"
          autoComplete="organization"
          required
        />
      </Field>
      <Field>
        User ID
        <Hint>Telegram id, wa:phone, or a web id you will reuse in chat</Hint>
        <Input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="e.g. 123456789 or wa:+27…"
          autoComplete="username"
          required
        />
      </Field>
      <Field>
        What you sell
        <Hint>Optional</Hint>
        <Input
          value={businessDescription}
          onChange={(e) => setBusinessDescription(e.target.value)}
          placeholder="e.g. Groceries & airtime"
        />
      </Field>
      <Field>
        PIN
        <Hint>Exactly 4 digits — remember it for chat login</Hint>
        <Input
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••"
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
          placeholder="••••"
          autoComplete="new-password"
          required
        />
      </Field>
      {error ? <ErrorText>{error}</ErrorText> : null}
    </AuthShell>
  );
}
