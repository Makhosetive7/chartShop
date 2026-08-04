import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import styled from 'styled-components';
import {
  Building2,
  KeyRound,
  LogOut,
  Shield,
} from 'lucide-react';
import {
  fetchProfile,
  updateProfileName,
  updateProfileDescription,
  updateProfilePin,
} from '@/api/reports';
import { getErrorMessage } from '@/api/types';
import { useAuth } from '@/auth';
import { BrandMark } from '@/components/ui/BrandMark';
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

const Header = styled.header`
  margin-bottom: ${({ theme }) => theme.space[5]};
`;

const Hero = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: 0;
  padding: clamp(1.25rem, 4vw, 1.85rem);
  margin-bottom: ${({ theme }) => theme.space[5]};
  color: white;
  background:
    radial-gradient(circle at 14% 20%, rgba(245, 160, 122, 0.35), transparent 42%),
    radial-gradient(circle at 88% 80%, rgba(196, 59, 90, 0.28), transparent 40%),
    linear-gradient(150deg, #6a1530 0%, #4a0e1c 50%, #2f0812 100%);
  box-shadow: ${({ theme }) => theme.shadows.soft};
`;

const HeroTop = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
`;

const ShopBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

const ShopMeta = styled.div`
  min-width: 0;

  strong {
    display: block;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.15rem, 3vw, 1.45rem);
    letter-spacing: -0.03em;
    line-height: 1.15;
  }

  span {
    display: block;
    margin-top: 4px;
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.72);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: min(70vw, 320px);
  }
`;

const HeroGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (min-width: 720px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const HeroStat = styled.div`
  padding: 12px 14px;
  border-radius: 0;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);

  span {
    display: block;
    font-size: 0.68rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.62);
    margin-bottom: 6px;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }

  strong {
    display: block;
    font-size: 0.95rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    word-break: break-word;
    line-height: 1.3;
  }
`;

const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]};
`;

const SectionHead = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: ${({ theme }) => theme.space[4]};
`;

const IconBadge = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 0;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.peachSoft};
  color: ${({ theme }) => theme.colors.maroon};
`;

const SectionCopy = styled.div`
  min-width: 0;

  h2 {
    margin: 0 0 4px;
    font-size: 1.15rem;
    color: ${({ theme }) => theme.colors.maroon};
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.9rem;
    line-height: 1.5;
  }
`;

const Command = styled.code`
  display: inline-block;
  margin-top: 8px;
  padding: 5px 10px;
  border-radius: 0;
  background: ${({ theme }) => theme.colors.cream};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.maroon};
  font-size: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
`;

const FormActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: ${({ theme }) => theme.space[5]};
`;

const SessionCard = styled(Card)`
  background: linear-gradient(
    145deg,
    ${({ theme }) => theme.colors.peachSoft},
    ${({ theme }) => theme.colors.primaryTint}
  );
  border-color: ${({ theme }) => theme.colors.borderStrong};
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
    if (!/^\d{4}$/.test(pins.newPin)) {
      setError('New PIN must be exactly 4 digits.');
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

  const shopName = profile?.businessName || shop?.businessName || 'Your shop';

  return (
    <Page>
      <Header>
        <PageTitle>Settings</PageTitle>
        <PageLead>
          Keep the shop profile and PIN in sync across web, Telegram, and WhatsApp.
        </PageLead>
      </Header>

      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      {ok ? <SuccessBanner>{ok}</SuccessBanner> : null}

      <Hero>
        <HeroTop>
          <ShopBlock>
            <BrandMark size={48} />
            <ShopMeta>
              <strong>{shopName}</strong>
              <span>{shop?.userId || 'No user id'}</span>
            </ShopMeta>
          </ShopBlock>
          {profile?.isLoggedIn || shop ? (
            <Badge $tone="success">Logged in</Badge>
          ) : (
            <Badge $tone="warning">Logged out</Badge>
          )}
        </HeroTop>
        <HeroGrid>
          <HeroStat>
            <span>Last login</span>
            <strong>{formatDate(profile?.lastLogin || shop?.lastLogin || null)}</strong>
          </HeroStat>
          <HeroStat>
            <span>Registered</span>
            <strong>{formatDate(profile?.registeredAt)}</strong>
          </HeroStat>
          <HeroStat>
            <span>Currency</span>
            <strong>{settings.currency || 'USD'}</strong>
          </HeroStat>
          <HeroStat>
            <span>Low-stock alert</span>
            <strong>{settings.lowStockAlert ?? 10}</strong>
          </HeroStat>
        </HeroGrid>
      </Hero>

      <Stack>
        <Card>
          <SectionHead>
            <IconBadge>
              <Building2 size={18} />
            </IconBadge>
            <SectionCopy>
              <h2>Shop profile</h2>
              <p>Name and description shown on reports and in the app header.</p>
              <Command>profile edit name · profile edit description</Command>
            </SectionCopy>
          </SectionHead>

          {profileQ.isLoading ? <p>Loading profile…</p> : null}

          <form onSubmit={onName}>
            <Field>
              Business name
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Luna Spaza"
                required
              />
            </Field>
            <FormActions>
              <Button type="submit" disabled={saveName.isPending}>
                {saveName.isPending ? 'Saving…' : 'Save name'}
              </Button>
            </FormActions>
          </form>

          <form onSubmit={onDesc} style={{ marginTop: 28 }}>
            <Field>
              What you sell
              <TextArea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Groceries, airtime & household"
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
          <SectionHead>
            <IconBadge>
              <KeyRound size={18} />
            </IconBadge>
            <SectionCopy>
              <h2>Security PIN</h2>
              <p>
                Same 4-digit PIN for web and chat. Keep it private — it unlocks the
                till everywhere.
              </p>
              <Command>profile edit pin</Command>
            </SectionCopy>
          </SectionHead>

          <form onSubmit={onPin}>
            <Row>
              <Field>
                Current PIN
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  autoComplete="current-password"
                  value={pins.oldPin}
                  onChange={(e) => setPins({ ...pins, oldPin: e.target.value })}
                  placeholder="••••"
                  required
                />
              </Field>
              <Field>
                New PIN
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  autoComplete="new-password"
                  value={pins.newPin}
                  onChange={(e) => setPins({ ...pins, newPin: e.target.value })}
                  placeholder="••••"
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
                  autoComplete="new-password"
                  value={pins.confirmPin}
                  onChange={(e) =>
                    setPins({ ...pins, confirmPin: e.target.value })
                  }
                  placeholder="••••"
                  required
                />
              </Field>
            </Row>
            <FormActions>
              <Button type="submit" disabled={savePin.isPending}>
                <Shield size={16} />
                {savePin.isPending ? 'Updating…' : 'Update PIN'}
              </Button>
            </FormActions>
          </form>
        </Card>

        <SessionCard>
          <SectionHead>
            <IconBadge>
              <LogOut size={18} />
            </IconBadge>
            <SectionCopy>
              <h2>Session</h2>
              <p>
                Sign out of this browser only. Telegram and WhatsApp sessions stay
                open until you log out there.
              </p>
            </SectionCopy>
          </SectionHead>
          <Button type="button" $variant="danger" onClick={() => void onLogout()}>
            Log out
          </Button>
        </SessionCard>
      </Stack>
    </Page>
  );
}
