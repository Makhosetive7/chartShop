import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import styled from 'styled-components';
import { X } from 'lucide-react';
import { useAuth } from '@/auth';
import { Button } from '@/components/ui/Button';
import {
  openDemoUpgrade,
  setDemoUpgradeListener,
  type DemoUpgradePayload,
} from './demoUpgradeBridge';

type DemoUpgradeApi = {
  promptUpgrade: (payload?: DemoUpgradePayload) => void;
};

const DemoUpgradeContext = createContext<DemoUpgradeApi | null>(null);

const Scrim = styled.div`
  position: fixed;
  inset: 0;
  z-index: 80;
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
  width: min(420px, 100%);
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: 22px 20px 18px;
  position: relative;
`;

const Close = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
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
  margin: 0 0 8px;
  font-size: 0.72rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
`;

const Title = styled.h2`
  margin: 0 0 10px;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.35rem;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.maroon};
  padding-right: 28px;
`;

const Body = styled.p`
  margin: 0 0 20px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.55;
  font-size: 0.95rem;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
`;

const GhostLink = styled.button`
  border: none;
  background: none;
  padding: 10px 4px;
  cursor: pointer;
  font: inherit;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: ${({ theme }) => theme.fontWeights.medium};

  &:hover {
    color: ${({ theme }) => theme.colors.maroon};
  }
`;

export function DemoUpgradeProvider({ children }: { children: ReactNode }) {
  const { isDemo } = useAuth();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<DemoUpgradePayload>({});

  const promptUpgrade = useCallback((next: DemoUpgradePayload = {}) => {
    setPayload(next);
    setOpen(true);
  }, []);

  useEffect(() => {
    setDemoUpgradeListener((next) => {
      setPayload(next);
      setOpen(true);
    });
    return () => setDemoUpgradeListener(null);
  }, []);

  const value = useMemo(() => ({ promptUpgrade }), [promptUpgrade]);

  function close() {
    setOpen(false);
  }

  const action = payload.action || 'save changes';

  return (
    <DemoUpgradeContext.Provider value={value}>
      {children}
      {open && isDemo ? (
        <Scrim
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <Panel
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-upgrade-title"
          >
            <Close type="button" aria-label="Close" onClick={close}>
              <X size={18} />
            </Close>
            <Eyebrow>Demo shop</Eyebrow>
            <Title id="demo-upgrade-title">Create a shop to {action}</Title>
            <Body>
              {payload.message ||
                'This shared demo is read-only so everyone sees the same sample business. Register once with a username and PIN — then your sales, stock, and chat stay yours.'}
            </Body>
            <Actions>
              <Button to="/register" variant="filled" onClick={close}>
                Create your shop
              </Button>
              <GhostLink type="button" onClick={close}>
                Keep browsing
              </GhostLink>
            </Actions>
          </Panel>
        </Scrim>
      ) : null}
    </DemoUpgradeContext.Provider>
  );
}

export function useDemoUpgrade() {
  const ctx = useContext(DemoUpgradeContext);
  if (!ctx) {
    throw new Error('useDemoUpgrade must be used within DemoUpgradeProvider');
  }
  return ctx;
}

/** Returns true when the write was blocked (demo). */
export function useGuardDemoWrite() {
  const { isDemo } = useAuth();
  const { promptUpgrade } = useDemoUpgrade();

  return useCallback(
    (action?: string) => {
      if (!isDemo) return false;
      promptUpgrade({ action });
      return true;
    },
    [isDemo, promptUpgrade],
  );
}

/** Optional helper when provider may be absent (tests). */
export function useOptionalDemoUpgrade() {
  return useContext(DemoUpgradeContext);
}

export { openDemoUpgrade };
