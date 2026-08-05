import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { X } from 'lucide-react';
import { useAuth } from '@/auth';
import { listDemos, type DemoSector } from '@/api/auth';
import { ArrowButton } from '@/components/marketing/marketingPrimitives';
import { Button } from '@/components/ui/Button';

type Props = {
  variant?: 'filled' | 'light' | 'ghost';
  children?: string;
};

const Scrim = styled.div`
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(20, 8, 8, 0.48);
  display: grid;
  place-items: end center;
  padding: 16px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));

  @media (min-width: 640px) {
    place-items: center;
  }
`;

const Panel = styled.div`
  width: min(480px, 100%);
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: 16px 14px 14px;
  position: relative;
`;

const Close = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  padding: 4px;
  line-height: 0;

  &:hover {
    color: ${({ theme }) => theme.colors.maroon};
  }
`;

const Eyebrow = styled.p`
  margin: 0 0 4px;
  font-size: 0.62rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
`;

const Title = styled.h2`
  margin: 0 0 4px;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.05rem;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.maroon};
  padding-right: 24px;
`;

const Lead = styled.p`
  margin: 0 0 10px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.35;
  font-size: 0.75rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

const SectorBtn = styled.button<{ $active?: boolean; $disabled?: boolean }>`
  text-align: left;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.maroon : theme.colors.border};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primaryTint : theme.colors.cream};
  padding: 8px 9px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};
  font: inherit;
  min-width: 0;

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.maroon};
    font-size: 0.78rem;
    margin-bottom: 2px;
    line-height: 1.2;
  }

  span {
    display: block;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.68rem;
    line-height: 1.3;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
`;

const ErrorText = styled.p`
  margin: 8px 0 0;
  color: ${({ theme }) => theme.colors.danger};
  font-size: 0.75rem;
`;

const Fallback = styled.span`
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
`;

export function TryDemoButton({
  variant = 'filled',
  children = 'Try demo',
}: Props) {
  const { enterDemo } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [demos, setDemos] = useState<DemoSector[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingList(true);
    setError(null);
    void listDemos()
      .then((list) => {
        if (cancelled) return;
        setDemos(list);
        const firstAvailable = list.find((d) => d.available);
        setSelected(firstAvailable?.id || list[0]?.id || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load demos');
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function confirm() {
    if (!selected || pending) return;
    const sector = demos.find((d) => d.id === selected);
    if (sector && !sector.available) {
      setError('That demo is not seeded yet. Run npm run seed:demos on the API.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await enterDemo(selected);
      setOpen(false);
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo is unavailable');
      setPending(false);
    }
  }

  return (
    <Fallback>
      <ArrowButton
        type="button"
        variant={variant}
        disabled={pending}
        onClick={() => setOpen(true)}
      >
        {children}
      </ArrowButton>

      {open ? (
        <Scrim
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget && !pending) setOpen(false);
          }}
        >
          <Panel
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-sector-title"
          >
            <Close
              type="button"
              aria-label="Close"
              onClick={() => !pending && setOpen(false)}
            >
              <X size={18} />
            </Close>
            <Eyebrow>Try before you register</Eyebrow>
            <Title id="demo-sector-title">Pick a shop sector</Title>
            <Lead>
              Sample tills by sector. Read-only — register when you want to save.
            </Lead>

            {loadingList ? (
              <Lead>Loading demos…</Lead>
            ) : (
              <Grid>
                {demos.map((demo) => (
                  <SectorBtn
                    key={demo.id}
                    type="button"
                    $active={selected === demo.id}
                    $disabled={!demo.available}
                    disabled={!demo.available}
                    onClick={() => setSelected(demo.id)}
                  >
                    <strong>{demo.label}</strong>
                    <span>
                      {demo.blurb}
                      {!demo.available ? ' (not seeded yet)' : ''}
                    </span>
                  </SectorBtn>
                ))}
              </Grid>
            )}

            {error ? <ErrorText>{error}</ErrorText> : null}

            <Actions>
              <Button
                type="button"
                variant="filled"
                size="sm"
                disabled={pending || !selected || loadingList}
                onClick={() => void confirm()}
              >
                {pending ? 'Opening demo…' : 'Enter demo'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </Actions>
          </Panel>
        </Scrim>
      ) : null}
    </Fallback>
  );
}
