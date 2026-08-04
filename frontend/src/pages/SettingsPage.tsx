import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import styled from 'styled-components';
import {
  Building2,
  Clock3,
  KeyRound,
  LogOut,
  Shield,
  UserRound,
} from 'lucide-react';
import {
  fetchProfile,
  updateProfileName,
  updateProfileDescription,
  updateProfilePin,
} from '@/api/reports';
import { getErrorMessage } from '@/api/types';
import { useAuth } from '@/auth';
import {
  Page,
  PageTitle,
  PageLead,
  Card,
  Row,
  Field,
  Input,
  TextArea,
  Button,
  ErrorBanner,
  SuccessBanner,
  Badge,
} from '@/components/ui/primitives';

const Header = styled.div`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.space[5]};
`;

const CardTitle = styled.h2`
  margin: 0 0 ${({ theme }) => theme.space[2]};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CardHint = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[4]};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.88rem;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.space[3]};
`;

const InfoItem = styled.div`
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};

  span {
    display: block;
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.textMuted};
    margin-bottom: 4px;
    font-weight: ${({ theme }) => theme.fontWeights.medium};
  }

  strong {
    color: ${({ theme }) => theme.colors.textPrimary};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    word-break: break-word;
  }
`;

const FormActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: ${({ theme }) => theme.space[4]};
`;

const DangerZone = styled(Card)`
  border-color: ${({ theme }) => theme.colors.dangerTint};
`;

type ProfilePayload = {
  businessName?: string;
  businessDescription?: string;
  registeredAt?: string;
  lastLogin?: string | null;
  isLoggedIn?: boolean;
};

function formatDate(value?: string | null) {
  if (!value) return 'Never';
  try {
    return format(new Date(value), 'd MMM yyyy · HH:mm');
  } catch {
    return '—';
  }
}

export function SettingsPage() {
  const { shop, logout, updateShop } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState(shop?.businessName || '');
  const [description, setDescription] = useState(
    shop?.businessDescription || '',
  );
  const [pins, setPins] = useState({ oldPin: '', newPin: '', confirmPin: '' });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const profileQ = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  });

  const profile = profileQ.data?.profile as ProfilePayload | undefined;
  const settings = (profileQ.data?.shop?.settings ||
    shop?.settings ||
    {}) as {
    currency?: string;
    timezone?: string;
    lowStockAlert?: number;
  };

  useEffect(() => {
    const loaded = profileQ.data?.shop;
    if (!loaded) return;
    setName(loaded.businessName || '');
    setDescription(loaded.businessDescription || '');
  }, [profileQ.data?.shop]);

  useEffect(() => {
    if (!ok && !error) return;
    const t = window.setTimeout(() => {
      setOk(null);
      setError(null);
    }, 3500);
    return () => window.clearTimeout(t);
  }, [ok, error]);

  const saveName = useMutation({
    mutationFn: () => updateProfileName(name.trim()),
    onSuccess: () => {
      setOk('Business name updated.');
      setError(null);
      updateShop({ businessName: name.trim() });
      void qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const saveDesc = useMutation({
    mutationFn: () => updateProfileDescription(description.trim()),
    onSuccess: () => {
      setOk('Description updated.');
      setError(null);
      updateShop({ businessDescription: description.trim() });
      void qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const savePin = useMutation({
    mutationFn: () => updateProfilePin(pins.oldPin, pins.newPin),
    onSuccess: () => {
      setOk('PIN updated.');
      setError(null);
      setPins({ oldPin: '', newPin: '', confirmPin: '' });
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  function onName(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Business name is required.');
      return;
    }
    saveName.mutate();
  }

  function onDesc(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }
    saveDesc.mutate();
  }

  function onPin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (pins.newPin.length < 4) {
      setError('New PIN must be at least 4 characters.');
      return;
    }
    if (pins.newPin !== pins.confirmPin) {
      setError('New PIN and confirmation do not match.');
      return;
    }
    savePin.mutate();
  }

  async function onLogout() {
    await logout();
    window.location.assign('/');
  }

  return (
    <Page>
      <Header>
        <PageTitle style={{ marginBottom: 8 }}>Settings</PageTitle>
        <PageLead style={{ marginBottom: 0 }}>
          Shop profile and security — same options as chat profile commands.
        </PageLead>
      </Header>

      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      {ok ? <SuccessBanner>{ok}</SuccessBanner> : null}

      <Card>
        <CardTitle>
          <UserRound size={18} />
          Account
        </CardTitle>
        <CardHint>
          Live shop details from the same profile used by Telegram and WhatsApp.
        </CardHint>
        {profileQ.isLoading ? <p>Loading profile…</p> : null}
        <InfoGrid>
          <InfoItem>
            <span>User ID</span>
            <strong>{shop?.userId || '—'}</strong>
          </InfoItem>
          <InfoItem>
            <span>Business</span>
            <strong>{profile?.businessName || shop?.businessName || '—'}</strong>
          </InfoItem>
          <InfoItem>
            <span>Status</span>
            <strong>
              {profile?.isLoggedIn || shop ? (
                <Badge $tone="success">Logged in</Badge>
              ) : (
                <Badge $tone="warning">Logged out</Badge>
              )}
            </strong>
          </InfoItem>
          <InfoItem>
            <span>Last login</span>
            <strong>
              {formatDate(profile?.lastLogin || shop?.lastLogin || null)}
            </strong>
          </InfoItem>
          <InfoItem>
            <span>Currency</span>
            <strong>{settings.currency || 'USD'}</strong>
          </InfoItem>
          <InfoItem>
            <span>Timezone</span>
            <strong>{settings.timezone || '—'}</strong>
          </InfoItem>
          <InfoItem>
            <span>Low-stock default</span>
            <strong>{settings.lowStockAlert ?? 10}</strong>
          </InfoItem>
          <InfoItem>
            <span>Registered</span>
            <strong>{formatDate(profile?.registeredAt)}</strong>
          </InfoItem>
        </InfoGrid>
      </Card>

      <Card>
        <CardTitle>
          <Building2 size={18} />
          Business name
        </CardTitle>
        <CardHint>
          Shown in the sidebar and on PDF reports. Chat:{' '}
          <code>profile edit name &quot;…&quot;</code>
        </CardHint>
        <form onSubmit={onName}>
          <Field>
            Name
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your shop name"
              required
            />
          </Field>
          <FormActions>
            <Button type="submit" disabled={saveName.isPending}>
              {saveName.isPending ? 'Saving…' : 'Save name'}
            </Button>
          </FormActions>
        </form>
      </Card>

      <Card>
        <CardTitle>
          <Clock3 size={18} />
          Description
        </CardTitle>
        <CardHint>
          Short note about what you sell. Chat:{' '}
          <code>profile edit description &quot;…&quot;</code>
        </CardHint>
        <form onSubmit={onDesc}>
          <Field>
            Description
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Women’s clothing boutique"
              required
            />
          </Field>
          <FormActions>
            <Button type="submit" disabled={saveDesc.isPending}>
              {saveDesc.isPending ? 'Saving…' : 'Save description'}
            </Button>
          </FormActions>
        </form>
      </Card>

      <Card>
        <CardTitle>
          <KeyRound size={18} />
          Change PIN
        </CardTitle>
        <CardHint>
          Used for web, Telegram, and WhatsApp login. Chat:{' '}
          <code>profile edit pin</code>
        </CardHint>
        <form onSubmit={onPin}>
          <Row>
            <Field>
              Current PIN
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                value={pins.oldPin}
                onChange={(e) => setPins({ ...pins, oldPin: e.target.value })}
                required
              />
            </Field>
            <Field>
              New PIN
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={pins.newPin}
                onChange={(e) => setPins({ ...pins, newPin: e.target.value })}
                required
              />
            </Field>
            <Field>
              Confirm new PIN
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={pins.confirmPin}
                onChange={(e) =>
                  setPins({ ...pins, confirmPin: e.target.value })
                }
                required
              />
            </Field>
          </Row>
          <FormActions>
            <Button type="submit" disabled={savePin.isPending}>
              <span
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Shield size={16} />
                {savePin.isPending ? 'Updating…' : 'Update PIN'}
              </span>
            </Button>
          </FormActions>
        </form>
      </Card>

      <DangerZone>
        <CardTitle>
          <LogOut size={18} />
          Session
        </CardTitle>
        <CardHint>Sign out of this browser. Chat sessions stay separate.</CardHint>
        <Button type="button" $variant="danger" onClick={() => void onLogout()}>
          Log out
        </Button>
      </DangerZone>
    </Page>
  );
}
