import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '@/auth';
import type { Shop, User } from '@/api/client';
import { checkUsername } from '@/api/auth';
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
import {
  buildLocalSuggestions,
  sanitizeUsernameInput,
  validateUsername,
} from '@/utils/username';
import { RecoveryCodesPanel } from '@/components/auth/RecoveryCodesPanel';

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
`;

const Preview = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textSecondary};

  strong {
    color: ${({ theme }) => theme.colors.maroon};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }
`;

const Availability = styled.p<{ $tone: 'ok' | 'bad' | 'muted' }>`
  margin: 0;
  font-size: 0.82rem;
  color: ${({ theme, $tone }) =>
    $tone === 'ok'
      ? theme.colors.success
      : $tone === 'bad'
        ? theme.colors.danger
        : theme.colors.textMuted};
`;

const SuggestionBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SuggestionLabel = styled.span`
  font-size: 0.8rem;
  font-weight: ${({ theme }) => theme.fontWeights.regular};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const SuggestionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const SuggestionChip = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.cream};
  color: ${({ theme }) => theme.colors.textPrimary};
  padding: 6px 10px;
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.borderStrong};
    background: ${({ theme }) => theme.colors.surface};
  }
`;

type AvailabilityState =
  | { status: 'idle' }
  | { status: 'checking' }
  | {
      status: 'ready';
      available: boolean;
      message?: string;
      suggestions: string[];
    };

function mergeSuggestions(
  primary: string[] | undefined,
  desired: string,
): string[] {
  const fromApi = primary?.filter(Boolean) ?? [];
  if (fromApi.length >= 3) return fromApi.slice(0, 3);
  const local = buildLocalSuggestions(desired, 3, fromApi);
  return [...fromApi, ...local].slice(0, 3);
}

export function RegisterPage() {
  const { isAuthenticated, register, establishSession } = useAuth();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityState>({
    status: 'idle',
  });
  const [issuedCodes, setIssuedCodes] = useState<string[] | null>(null);
  const [pendingSession, setPendingSession] = useState<{
    token: string;
    shop: Shop;
    user: User | null;
  } | null>(null);

  useEffect(() => {
    const normalized = username.trim().toLowerCase();
    if (!normalized) {
      setAvailability({ status: 'idle' });
      return;
    }

    const validation = validateUsername(normalized);
    const localSuggestions = buildLocalSuggestions(normalized);
    let cancelled = false;

    // Show local reason + suggestions immediately for reserved / invalid names.
    if (!validation.valid) {
      setAvailability({
        status: 'ready',
        available: false,
        message: validation.message,
        suggestions: localSuggestions,
      });
    } else {
      setAvailability({ status: 'checking' });
    }

    const timer = window.setTimeout(async () => {
      try {
        const result = await checkUsername(normalized);
        if (cancelled) return;

        const available = Boolean(result.available);
        setAvailability({
          status: 'ready',
          available,
          message:
            result.message ||
            result.error ||
            (validation.valid ? undefined : validation.message),
          suggestions: available
            ? []
            : mergeSuggestions(result.suggestions, normalized),
        });
      } catch {
        if (cancelled) return;
        if (!validation.valid) {
          setAvailability({
            status: 'ready',
            available: false,
            message: validation.message,
            suggestions: localSuggestions,
          });
        } else {
          setAvailability({ status: 'idle' });
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [username]);

  if (isAuthenticated && !issuedCodes) {
    return <Navigate to="/app/dashboard" replace />;
  }

  function finishRegistration() {
    if (pendingSession) {
      establishSession(
        pendingSession.token,
        pendingSession.shop,
        pendingSession.user,
      );
    }
    setIssuedCodes(null);
    setPendingSession(null);
    navigate('/app/dashboard', { replace: true });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const validation = validateUsername(username);
    if (!validation.valid) {
      setError(validation.message);
      setAvailability({
        status: 'ready',
        available: false,
        message: validation.message,
        suggestions: mergeSuggestions(undefined, username),
      });
      return;
    }
    if (
      availability.status === 'ready' &&
      !availability.available &&
      availability.message
    ) {
      setError(availability.message);
      return;
    }
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
      const result = await register({
        username: validation.normalized,
        businessName: businessName.trim(),
        pin: pin.trim(),
        businessDescription:
          businessDescription.trim() || 'General merchandise',
      });
      if (result.recoveryCodes.length > 0) {
        setPendingSession({
          token: result.token,
          shop: result.shop,
          user: result.user,
        });
        setIssuedCodes(result.recoveryCodes);
      } else {
        establishSession(result.token, result.shop, result.user);
        navigate('/app/dashboard', { replace: true });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      const fromErr =
        err && typeof err === 'object' && 'suggestions' in err
          ? (err as { suggestions?: string[] }).suggestions
          : undefined;
      let nextSuggestions = mergeSuggestions(fromErr, validation.normalized);
      if (!fromErr?.length) {
        try {
          const check = await checkUsername(validation.normalized);
          nextSuggestions = mergeSuggestions(
            check.suggestions,
            validation.normalized,
          );
        } catch {
          /* keep local merge */
        }
      }
      setAvailability({
        status: 'ready',
        available: false,
        message,
        suggestions: nextSuggestions,
      });
    } finally {
      setPending(false);
    }
  }

  function applySuggestion(value: string) {
    setUsername(value);
    setError(null);
  }

  const previewName = username || null;

  let availabilityTone: 'ok' | 'bad' | 'muted' = 'muted';
  let availabilityText = '';
  if (availability.status === 'checking') {
    availabilityText = 'Checking availability…';
  } else if (availability.status === 'ready') {
    if (availability.available) {
      availabilityTone = 'ok';
      availabilityText = 'Username is available';
    } else {
      availabilityTone = 'bad';
      availabilityText = availability.message || 'Username is not available';
    }
  }

  const chipSuggestions =
    availability.status === 'ready' && !availability.available
      ? availability.suggestions
      : [];

  if (issuedCodes) {
    return (
      <AuthShell
        eyebrow="Save these codes"
        headline="Your only free way to reset a lost PIN"
        lead="Copy or download them now. ChartShop never shows plaintext recovery codes again."
        showcaseTitle="Keep them offline"
        showcaseLead="Losing both your PIN and these codes can lock the shop permanently."
        preview={[
          { label: 'Codes', value: String(issuedCodes.length) },
          { label: 'Use once', value: 'each' },
          { label: 'Reset', value: '/recover' },
        ]}
        actions={null}
      >
        <RecoveryCodesPanel
          codes={issuedCodes}
          username={pendingSession?.shop.username || username}
          onContinue={finishRegistration}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Open your shop"
      headline="Register the till in minutes"
      lead="Create the shop and your admin login. You can add teammates later in Settings."
      showcaseTitle="First sale starts on the web"
      showcaseLead="After register, run the shop from the dashboard. Telegram works today — WhatsApp is next."
      preview={[
        { label: 'Shop ready', value: '✓' },
        { label: 'Try', value: 'sold 1 milk @ 22' },
        { label: 'Books', value: 'synced' },
      ]}
      footer={
        <div>
          <AuthSwitchLink
            prompt="Already registered?"
            to="/login"
            label="Sign in"
          />
          <div>
            <AuthSwitchLink
              prompt="Lost your PIN?"
              to="/recover"
              label="Use a recovery code"
            />
          </div>
        </div>
      }
      onSubmit={onSubmit}
      actions={
        <ActionRow>
          <ArrowButton type="submit" loading={pending}>
            {pending ? 'Creating shop…' : 'Create shop'}
          </ArrowButton>
          <TryDemoButton variant="ghost" />
        </ActionRow>
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
        Username
        <Hint>
          3–15 lowercase letters · optional digits at the end · used on all
          platforms
        </Hint>
        <Input
          value={username}
          onChange={(e) => {
            setUsername(sanitizeUsernameInput(e.target.value));
            setError(null);
          }}
          placeholder="e.g. musa"
          autoComplete="username"
          maxLength={15}
          spellCheck={false}
          required
        />
        {previewName ? (
          <Preview>
            Your username will be <strong>@{previewName}</strong>
          </Preview>
        ) : null}
        {availabilityText ? (
          <Availability $tone={availabilityTone}>{availabilityText}</Availability>
        ) : null}
        {chipSuggestions.length > 0 ? (
          <SuggestionBlock>
            <SuggestionLabel>Try one of these instead</SuggestionLabel>
            <SuggestionRow>
              {chipSuggestions.map((s) => (
                <SuggestionChip
                  key={s}
                  type="button"
                  onClick={() => applySuggestion(s)}
                >
                  @{s}
                </SuggestionChip>
              ))}
            </SuggestionRow>
          </SuggestionBlock>
        ) : null}
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
      <Hint as="p" style={{ margin: 0 }}>
        After signup you will get recovery codes once. Save them — they are the
        free way to reset a lost PIN.
      </Hint>
      {error ? <ErrorText>{error}</ErrorText> : null}
    </AuthShell>
  );
}
