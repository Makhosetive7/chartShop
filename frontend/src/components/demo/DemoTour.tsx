import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '@/auth';

const STORAGE_KEY = 'chartshop_demo_tour_v2';
const POPOVER_FALLBACK_H = 200;
const POPOVER_FALLBACK_W = 320;
const VIEW_MARGIN = 12;
const TARGET_GAP = 12;
/** Bottom nav + safe area — keep popovers clear of it on phones. */
const BOTTOM_CHROME = 88;

type TourStep = {
  id: string;
  path: string;
  target: string;
  title: string;
  body: string;
};

const STEPS: TourStep[] = [
  {
    id: 'chat',
    path: '/app/chat',
    target: '[data-tour="nav-chat"]',
    title: 'Chat is the till',
    body: 'Try help, list, daily, or best — same commands as Telegram and WhatsApp. Sell commands need your own shop.',
  },
  {
    id: 'dashboard',
    path: '/app/dashboard',
    target: '[data-tour="nav-home"]',
    title: 'Home dashboard',
    body: 'A live picture of today: sales, stock alerts, and what’s moving.',
  },
  {
    id: 'products',
    path: '/app/products',
    target: '[data-tour="nav-products"]',
    title: 'Your catalogue',
    body: 'Products have options (sizes, weights) and pack types (crate, tray, box). Stock is tracked per option.',
  },
  {
    id: 'sales',
    path: '/app/sales',
    target: '[data-tour="nav-sales"]',
    title: 'Sales history',
    body: 'Cash, credit, and laybye sales — cancelled ones show in Refunds.',
  },
  {
    id: 'laybyes',
    path: '/app/laybyes',
    target: '[data-tour="laybyes-heading"]',
    title: 'Laybyes',
    body: 'Hold stock, take a deposit, collect instalments. Three active laybyes are seeded in this demo.',
  },
  {
    id: 'orders',
    path: '/app/orders',
    target: '[data-tour="orders-heading"]',
    title: 'Orders',
    body: 'Pickup and delivery orders — track them from pending through to completed or cancelled.',
  },
  {
    id: 'reports',
    path: '/app/reports',
    target: '[data-tour="reports-heading"]',
    title: 'End-of-day reports',
    body: 'Daily, weekly, and profit views. Expense categories break down where money went.',
  },
];

type DemoTourApi = {
  startTour: () => void;
  stopTour: () => void;
  isActive: boolean;
};

const DemoTourContext = createContext<DemoTourApi | null>(null);

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 70;
  pointer-events: none;
`;

const Spotlight = styled.div<{ $top: number; $left: number; $w: number; $h: number }>`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: ${({ $left }) => $left}px;
  width: ${({ $w }) => $w}px;
  height: ${({ $h }) => $h}px;
  box-shadow: 0 0 0 9999px rgba(20, 8, 8, 0.45);
  outline: 2px solid ${({ theme }) => theme.colors.coral};
  pointer-events: none;
  z-index: 71;
  transition:
    top 0.2s ease,
    left 0.2s ease,
    width 0.2s ease,
    height 0.2s ease;
`;

const Popover = styled.div<{ $top: number; $left: number }>`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: ${({ $left }) => $left}px;
  width: min(320px, calc(100vw - 24px));
  max-height: min(70vh, calc(100dvh - ${VIEW_MARGIN * 2}px - ${BOTTOM_CHROME}px));
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  z-index: 72;
  pointer-events: auto;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: 16px;
`;

const StepMeta = styled.p`
  margin: 0 0 6px;
  font-size: 0.72rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
`;

const Title = styled.h3`
  margin: 0 0 8px;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.15rem;
  color: ${({ theme }) => theme.colors.maroon};
  letter-spacing: -0.02em;
`;

const Body = styled.p`
  margin: 0 0 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.5;
  font-size: 0.92rem;
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const Btn = styled.button<{ $primary?: boolean }>`
  border: 1px solid
    ${({ theme, $primary }) =>
      $primary ? theme.colors.maroon : theme.colors.border};
  background: ${({ theme, $primary }) =>
    $primary ? theme.colors.maroon : theme.colors.surface};
  color: ${({ theme, $primary }) =>
    $primary ? theme.colors.textOnDark : theme.colors.textPrimary};
  font: inherit;
  font-size: 0.84rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  padding: 8px 12px;
  cursor: pointer;

  &:hover {
    opacity: 0.92;
  }
`;

const Skip = styled.button`
  border: none;
  background: none;
  font: inherit;
  font-size: 0.84rem;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  padding: 8px 4px;

  &:hover {
    color: ${({ theme }) => theme.colors.maroon};
  }
`;

function markTourDone() {
  try {
    localStorage.setItem(STORAGE_KEY, 'done');
  } catch {
    /* ignore */
  }
}

function hasTourBeenDone() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'done';
  } catch {
    return false;
  }
}

function measureTarget(selector: string) {
  const el = document.querySelector(selector);
  if (!el || !(el instanceof HTMLElement)) return null;
  // Skip display:none / zero-size nodes (e.g. desktop nav on phones).
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return null;
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  // Keep spotlight within the visible viewport so tall page targets
  // don't push the popover off-screen.
  const top = Math.min(Math.max(rect.top, 0), vh);
  const left = Math.min(Math.max(rect.left, 0), vw);
  const bottom = Math.min(Math.max(rect.bottom, 0), vh);
  const right = Math.min(Math.max(rect.right, 0), vw);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  if (width < 1 || height < 1) return null;
  return { top, left, width, height };
}

function placePopover(
  box: { top: number; left: number; width: number; height: number },
  popW: number,
  popH: number,
) {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const usableBottom = vh - BOTTOM_CHROME;
  const spaceBelow = usableBottom - (box.top + box.height);
  const spaceAbove = box.top;
  const targetMidY = box.top + box.height / 2;
  const preferAbove = targetMidY > usableBottom * 0.55;

  let top: number;
  if (preferAbove && spaceAbove >= popH + TARGET_GAP) {
    top = box.top - popH - TARGET_GAP;
  } else if (!preferAbove && spaceBelow >= popH + TARGET_GAP) {
    top = box.top + box.height + TARGET_GAP;
  } else if (spaceAbove >= popH + TARGET_GAP) {
    top = box.top - popH - TARGET_GAP;
  } else if (spaceBelow >= popH + TARGET_GAP) {
    top = box.top + box.height + TARGET_GAP;
  } else {
    // Neither side fits — pin in the usable band above the bottom nav.
    const band = Math.max(VIEW_MARGIN, usableBottom - popH - VIEW_MARGIN);
    top =
      popH + VIEW_MARGIN * 2 < usableBottom
        ? Math.max(VIEW_MARGIN, (usableBottom - popH) / 2)
        : band;
  }

  top = Math.max(
    VIEW_MARGIN,
    Math.min(top, Math.max(VIEW_MARGIN, usableBottom - popH - VIEW_MARGIN)),
  );
  const left = Math.max(
    VIEW_MARGIN,
    Math.min(box.left, vw - popW - VIEW_MARGIN),
  );
  return { top, left };
}

export function DemoTourProvider({ children }: { children: ReactNode }) {
  const { isDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [box, setBox] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [popSize, setPopSize] = useState({
    w: POPOVER_FALLBACK_W,
    h: POPOVER_FALLBACK_H,
  });
  const popoverRef = useRef<HTMLDivElement>(null);

  const step = STEPS[stepIndex];

  const stopTour = useCallback(() => {
    setActive(false);
    setBox(null);
    markTourDone();
  }, []);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setActive(true);
    navigate(STEPS[0].path);
  }, [navigate]);

  useEffect(() => {
    if (!isDemo) {
      setActive(false);
      return;
    }
    if (hasTourBeenDone()) return;
    const t = window.setTimeout(() => {
      if (hasTourBeenDone()) return;
      setStepIndex(0);
      setActive(true);
      navigate(STEPS[0].path);
    }, 600);
    return () => window.clearTimeout(t);
    // Auto-start once when entering demo — not on every route change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  useEffect(() => {
    if (!active || !step) return;

    if (location.pathname !== step.path) {
      navigate(step.path);
      return;
    }

    let tries = 0;
    const tick = () => {
      const el = document.querySelector(step.target);
      if (el) {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
      const next = measureTarget(step.target);
      if (next && next.width > 0 && next.height > 0) {
        setBox(next);
        return;
      }
      tries += 1;
      if (tries < 20) {
        window.setTimeout(tick, 50);
      } else {
        setBox(null);
      }
    };
    tick();

    const refresh = () => setBox(measureTarget(step.target));
    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);
    return () => {
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh, true);
    };
  }, [active, step, location.pathname, navigate]);

  useLayoutEffect(() => {
    if (!active || !popoverRef.current) return;
    const rect = popoverRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setPopSize({ w: rect.width, h: rect.height });
    }
  }, [active, stepIndex, box, step?.body, step?.title]);

  function next() {
    if (stepIndex >= STEPS.length - 1) {
      stopTour();
      return;
    }
    const upcoming = STEPS[stepIndex + 1];
    setStepIndex((i) => i + 1);
    navigate(upcoming.path);
  }

  const value = useMemo(
    () => ({ startTour, stopTour, isActive: active }),
    [startTour, stopTour, active],
  );

  const popoverPos = useMemo(() => {
    if (!box) {
      return { top: 80, left: 16 };
    }
    return placePopover(box, popSize.w, popSize.h);
  }, [box, popSize]);

  return (
    <DemoTourContext.Provider value={value}>
      {children}
      {active && isDemo && step
        ? createPortal(
            <>
              <Overlay aria-hidden />
              {box ? (
                <Spotlight
                  $top={box.top - 4}
                  $left={box.left - 4}
                  $w={box.width + 8}
                  $h={box.height + 8}
                />
              ) : null}
              <Popover
                ref={popoverRef}
                $top={popoverPos.top}
                $left={popoverPos.left}
                role="dialog"
                aria-labelledby="demo-tour-title"
              >
                <StepMeta>
                  Step {stepIndex + 1} of {STEPS.length}
                </StepMeta>
                <Title id="demo-tour-title">{step.title}</Title>
                <Body>{step.body}</Body>
                <Row>
                  <Skip type="button" onClick={stopTour}>
                    Skip tour
                  </Skip>
                  <Actions>
                    {stepIndex < STEPS.length - 1 ? (
                      <Btn type="button" $primary onClick={next}>
                        Next
                      </Btn>
                    ) : (
                      <Btn type="button" $primary onClick={stopTour}>
                        Done
                      </Btn>
                    )}
                  </Actions>
                </Row>
              </Popover>
            </>,
            document.body,
          )
        : null}
    </DemoTourContext.Provider>
  );
}

export function useDemoTour() {
  const ctx = useContext(DemoTourContext);
  if (!ctx) {
    throw new Error('useDemoTour must be used within DemoTourProvider');
  }
  return ctx;
}
