import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUp,
  Loader2,
  MessageCircle,
  Package,
  Pencil,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { fetchChatHistory, sendChatMessage, type ChatBubble } from '@/api/chat';
import { isDemoReadOnlyError } from '@/api/types';
import { useAuth } from '@/auth';
import { useGuardDemoWrite } from '@/components/demo/DemoUpgradeProvider';
import { BrandMark } from '@/components/ui/BrandMark';
import { ChatThreadSkeleton } from '@/components/skeletons/PageSkeletons';
import { useShopTimezone } from '@/hooks/useShopTimezone';
import {
  formatShopDayLabel,
  formatShopTime,
  shopDayKey,
} from '@/utils/dates';
const SUGGESTIONS = [
  { cmd: 'help', label: 'Help', icon: Sparkles },
  { cmd: 'list', label: 'Products', icon: Package },
  { cmd: 'daily', label: 'Today', icon: TrendingUp },
  { cmd: 'customers', label: 'Customers', icon: Users },
  { cmd: 'low stock', label: 'Low stock', icon: Package },
  { cmd: 'best', label: 'Best sellers', icon: TrendingUp },
] as const;

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.85); }
`;

const bounceDot = keyframes`
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40% { transform: translateY(-4px); opacity: 1; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Page = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(
      1100px 480px at 8% -8%,
      rgba(232, 90, 79, 0.12),
      transparent 55%
    ),
    radial-gradient(
      900px 420px at 96% 4%,
      rgba(139, 30, 58, 0.08),
      transparent 50%
    ),
    linear-gradient(180deg, #f7f1eb 0%, #faf6f2 45%, #f3ece6 100%);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.5;
    background-image: url("data:image/svg+xml,%3Csvg width='96' height='96' viewBox='0 0 96 96' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%238B1E3A' stroke-opacity='0.09' stroke-width='1.25'%3E%3Crect x='14' y='18' width='20' height='14' rx='3'/%3E%3Cpath d='M52 20l12 7v14l-12 7-12-7V27z'/%3E%3Ccircle cx='24' cy='62' r='10'/%3E%3Cpath d='M58 58h22M69 58v18M18 82h22'/%3E%3C/g%3E%3C/svg%3E");
    background-size: 96px 96px;
    mask-image: linear-gradient(
      90deg,
      transparent 0%,
      #000 12%,
      #000 88%,
      transparent 100%
    );
  }
`;

const Shell = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  background: transparent;
`;

const Content = styled.div`
  width: min(820px, 100%);
  max-width: 100%;
  min-width: 0;
  margin: 0 auto;
  padding-inline: clamp(10px, 3vw, 28px);
  box-sizing: border-box;
`;

const Header = styled.header`
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  padding: 8px 0 8px;
  background: linear-gradient(
    180deg,
    rgba(247, 241, 235, 0.94) 0%,
    rgba(247, 241, 235, 0.55) 70%,
    transparent 100%
  );

  @media (min-width: 720px) {
    padding: 18px 0 14px;
  }

  ${Content} {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;

  @media (min-width: 560px) {
    gap: 14px;
  }
`;

const BrandSlot = styled.div`
  flex-shrink: 0;
  line-height: 0;

  @media (max-width: 559px) {
    /* Compact mark without layout shift from transform */
    & > * {
      width: 34px !important;
      height: 34px !important;
    }

    svg,
    img {
      width: 34px !important;
      height: 34px !important;
    }
  }
`;

const HeaderText = styled.div`
  min-width: 0;

  h1 {
    margin: 0;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 0.95rem;
    line-height: 1.25;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.textPrimary};

    @media (min-width: 560px) {
      gap: 10px;
      font-size: 1.12rem;
    }
  }

  p {
    margin: 2px 0 0;
    font-size: 0.72rem;
    line-height: 1.35;
    color: ${({ theme }) => theme.colors.textSecondary};
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    line-clamp: 2;
    overflow: hidden;

    @media (min-width: 560px) {
      margin: 3px 0 0;
      font-size: 0.84rem;
      white-space: nowrap;
      display: block;
      -webkit-line-clamp: unset;
      line-clamp: unset;
      text-overflow: ellipsis;
    }
  }
`;

const Online = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 0;
  font-size: 0.58rem;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.success};
  background: ${({ theme }) => theme.colors.successTint};
  text-transform: uppercase;

  @media (min-width: 560px) {
    gap: 6px;
    padding: 3px 9px;
    font-size: 0.66rem;
  }

  &::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 0;
    background: ${({ theme }) => theme.colors.success};
    animation: ${pulse} 1.6s ease-in-out infinite;

    @media (min-width: 560px) {
      width: 7px;
      height: 7px;
    }
  }
`;

const NewChatBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textPrimary};
  border-radius: 0;
  padding: 7px 9px;
  font-size: 0.78rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  white-space: nowrap;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;

  span {
    display: none;
  }

  @media (min-width: 520px) {
    padding: 9px 16px;
    font-size: 0.88rem;

    span {
      display: inline;
    }
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primaryTint};
    color: ${({ theme }) => theme.colors.primaryDark};
    box-shadow: 0 6px 16px rgba(74, 14, 28, 0.12);
    transform: translateY(-1px);
  }
`;

const Thread = styled.div<{ $roomy?: boolean }>`
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 4px 0 10px;
  display: flex;
  flex-direction: column;
  background: transparent;
  /* Room for fixed composer (+ chips when present) */
  padding-bottom: ${({ $roomy }) =>
    $roomy
      ? 'calc(136px + env(safe-area-inset-bottom, 0px))'
      : 'calc(80px + env(safe-area-inset-bottom, 0px))'};

  @media (min-width: 720px) {
    padding: 8px 0 12px;
    padding-bottom: ${({ $roomy }) =>
      $roomy
        ? 'calc(168px + env(safe-area-inset-bottom, 0px))'
        : 'calc(110px + env(safe-area-inset-bottom, 0px))'};
  }
`;

const ThreadInner = styled(Content)`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  width: 100%;
  min-width: 0;

  @media (min-width: 560px) {
    gap: 12px;
  }
`;

const DayDivider = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  margin: 6px 0 2px;
  width: 100%;

  @media (min-width: 560px) {
    gap: 12px;
    margin: 10px 0 4px;
  }

  &::before {
    content: '';
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      ${({ theme }) => theme.colors.border}
    );
  }

  &::after {
    content: '';
    height: 1px;
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.colors.border},
      transparent
    );
  }

  span {
    padding: 3px 8px;
    border-radius: 0;
    background: rgba(255, 255, 255, 0.72);
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.65rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    letter-spacing: 0.01em;
    white-space: nowrap;

    @media (min-width: 560px) {
      padding: 5px 12px;
      font-size: 0.74rem;
    }
  }
`;

const MsgRow = styled(motion.div)<{ $mine?: boolean }>`
  display: flex;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  align-items: flex-end;
  justify-content: ${({ $mine }) => ($mine ? 'flex-end' : 'flex-start')};
  gap: 6px;

  @media (min-width: 560px) {
    gap: 8px;
  }
`;

const BubbleAvatar = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 0;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: linear-gradient(
    145deg,
    ${({ theme }) => theme.colors.primaryLight},
    ${({ theme }) => theme.colors.primary}
  );
  color: #fff;
  margin-bottom: 2px;
  box-shadow: 0 4px 10px rgba(74, 14, 28, 0.22);

  svg {
    width: 11px;
    height: 11px;
  }

  @media (min-width: 560px) {
    width: 28px;
    height: 28px;

    svg {
      width: 14px;
      height: 14px;
    }
  }
`;

const Bubble = styled.div<{ $mine?: boolean; $activity?: boolean }>`
  /* Leave a clear opposite gutter so left/right bubbles read side-by-side */
  flex: 0 1 auto;
  max-width: ${({ $mine }) => ($mine ? '82%' : 'calc(100% - 28px)')};
  min-width: 0;
  padding: 8px 10px 6px;
  border-radius: 0;
  background: ${({ theme, $mine, $activity }) =>
    $mine
      ? `linear-gradient(145deg, ${theme.colors.coral}, ${theme.colors.maroon})`
      : $activity
        ? 'rgba(139, 30, 58, 0.06)'
        : theme.colors.surface};
  color: ${({ theme, $mine }) =>
    $mine ? theme.colors.textOnDark : theme.colors.textPrimary};
  border: 1px solid
    ${({ theme, $mine, $activity }) =>
      $mine
        ? 'transparent'
        : $activity
          ? 'rgba(139, 30, 58, 0.18)'
          : theme.colors.border};
  box-shadow: ${({ $mine }) =>
    $mine
      ? '0 8px 18px rgba(74, 14, 28, 0.18)'
      : '0 4px 12px rgba(26, 10, 10, 0.04)'};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  font-size: 0.8rem;
  line-height: 1.4;

  @media (min-width: 560px) {
    max-width: min(72%, 520px);
    font-size: 0.95rem;
    line-height: 1.5;
    padding: 13px 15px 9px;
    box-shadow: ${({ $mine }) =>
      $mine
        ? '0 10px 24px rgba(74, 14, 28, 0.22)'
        : '0 6px 18px rgba(26, 10, 10, 0.05)'};
  }
`;

const Meta = styled.div<{ $mine?: boolean }>`
  margin-top: 5px;
  text-align: ${({ $mine }) => ($mine ? 'right' : 'left')};
  font-size: 0.6rem;
  color: ${({ theme, $mine }) =>
    $mine ? 'rgba(255,255,255,0.78)' : theme.colors.textMuted};

  @media (min-width: 560px) {
    margin-top: 7px;
    font-size: 0.68rem;
  }
`;

const Footer = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  z-index: 45;
  padding: 8px 0 10px;
  background: rgba(247, 241, 235, 0.98);
  backdrop-filter: blur(18px);
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 -10px 28px rgba(26, 10, 10, 0.08);

  @media (min-width: 720px) {
    bottom: calc(76px + env(safe-area-inset-bottom, 0px));
    padding: 12px 0 14px;
  }
`;

const FooterInner = styled(Content)``;

const Chips = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  margin-bottom: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  max-width: 100%;
  padding-bottom: 2px;

  @media (min-width: 560px) {
    gap: 8px;
    margin-bottom: 10px;
  }

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
  border-radius: 0;
  padding: 5px 9px;
  font-size: 0.7rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease,
    transform 0.15s ease;

  @media (min-width: 560px) {
    gap: 6px;
    padding: 7px 12px;
    font-size: 0.78rem;
  }

  svg {
    width: 11px;
    height: 11px;

    @media (min-width: 560px) {
      width: 13px;
      height: 13px;
    }
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primaryDark};
    background: ${({ theme }) => theme.colors.primaryTint};
    transform: translateY(-1px);
  }
`;

const Composer = styled.form`
  display: block;
  min-width: 0;
  max-width: 100%;
`;

const InputShell = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  min-width: 0;
  max-width: 100%;
  padding: 4px 4px 4px 10px;
  border-radius: 0;
  border: 1.5px solid ${({ theme }) => theme.colors.maroon};
  background: #fff;
  box-shadow:
    0 1px 2px rgba(17, 24, 39, 0.04),
    0 10px 28px rgba(74, 14, 28, 0.1);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  @media (min-width: 720px) {
    gap: 8px;
    min-height: 56px;
    padding: 6px 6px 6px 16px;
  }

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px ${({ theme }) => theme.colors.primaryTint};
  }
`;

const IconBtn = styled.span`
  display: none;
  place-items: center;
  color: ${({ theme }) => theme.colors.primary};
  flex-shrink: 0;
  opacity: 0.7;

  @media (min-width: 560px) {
    display: grid;
  }
`;

const Input = styled.textarea`
  flex: 1;
  min-width: 0;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 0.84rem;
  line-height: 1.35;
  padding: 8px 2px;
  max-height: 96px;
  color: ${({ theme }) => theme.colors.textPrimary};

  @media (min-width: 560px) {
    font-size: 0.95rem;
    line-height: 1.4;
    padding: 10px 4px;
    max-height: 120px;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const SendBtn = styled.button`
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 0;
  background: linear-gradient(
    145deg,
    ${({ theme }) => theme.colors.coral},
    ${({ theme }) => theme.colors.maroon}
  );
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 6px 16px rgba(74, 14, 28, 0.32);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    opacity 0.15s ease;

  @media (min-width: 560px) {
    width: 44px;
    height: 44px;
  }

  &:hover:not(:disabled) {
    transform: scale(1.06);
    box-shadow: 0 8px 20px rgba(74, 14, 28, 0.4);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }

  svg {
    display: block;
  }
`;

const SendSpinner = styled(Loader2)`
  animation: ${spin} 0.75s linear infinite;
`;

const Disclaimer = styled.p`
  display: none;
  margin: 12px 0 0;
  text-align: center;
  font-size: 0.72rem;
  color: #9ca3af;
  line-height: 1.4;

  @media (min-width: 720px) {
    display: block;
  }
`;

const Empty = styled(motion.div)`
  margin: auto;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
  max-width: 28rem;
  padding: 16px 4px 18px;
  width: 100%;
  box-sizing: border-box;

  @media (min-width: 560px) {
    padding: 28px 8px 24px;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    margin-bottom: 12px;
    border-radius: 0;
    background: ${({ theme }) => theme.colors.primaryTint};
    color: ${({ theme }) => theme.colors.primaryDark};
    font-size: 0.7rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};

    @media (min-width: 560px) {
      padding: 6px 12px;
      margin-bottom: 16px;
      font-size: 0.78rem;
    }
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.textPrimary};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.05rem, 4.5vw, 1.45rem);
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    margin-bottom: 8px;
    letter-spacing: -0.02em;

    @media (min-width: 560px) {
      margin-bottom: 10px;
    }
  }

  p {
    margin: 0 0 14px;
    line-height: 1.45;
    font-size: 0.82rem;

    @media (min-width: 560px) {
      margin: 0 0 18px;
      line-height: 1.55;
      font-size: 0.92rem;
    }
  }
`;

const EmptyActions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  width: 100%;

  @media (min-width: 560px) {
    gap: 8px;
  }
`;

const EmptyAction = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  text-align: left;
  min-width: 0;
  padding: 8px 9px;
  border-radius: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(255, 255, 255, 0.9);
  color: ${({ theme }) => theme.colors.textPrimary};
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(17, 24, 39, 0.04);
  transition:
    border-color 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;

  @media (min-width: 560px) {
    gap: 8px;
    padding: 10px 12px;
  }

  span {
    display: grid;
    gap: 1px;
    min-width: 0;

    strong {
      margin: 0;
      font-size: 0.74rem;
      font-family: ${({ theme }) => theme.fonts.body};
      font-weight: ${({ theme }) => theme.fontWeights.semibold};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      @media (min-width: 560px) {
        font-size: 0.84rem;
      }
    }

    em {
      font-style: normal;
      font-size: 0.64rem;
      color: ${({ theme }) => theme.colors.textMuted};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      @media (min-width: 560px) {
        font-size: 0.72rem;
      }
    }
  }

  svg {
    flex-shrink: 0;
    width: 15px;
    height: 15px;
    color: ${({ theme }) => theme.colors.primary};

    @media (min-width: 560px) {
      width: 18px;
      height: 18px;
    }
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-2px);
    box-shadow: 0 10px 22px rgba(74, 14, 28, 0.1);
  }
`;

const Typing = styled(Bubble)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 52px;
  padding-block: 10px;

  @media (min-width: 560px) {
    min-width: 64px;
    padding-block: 14px;
  }
`;

const Dot = styled.span<{ $delay: number }>`
  width: 6px;
  height: 6px;
  border-radius: 0;
  background: ${({ theme }) => theme.colors.primary};
  opacity: 0.45;
  animation: ${bounceDot} 1.1s ease-in-out infinite;
  animation-delay: ${({ $delay }) => `${$delay}ms`};

  @media (min-width: 560px) {
    width: 7px;
    height: 7px;
  }
`;

const bubbleMotion = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.22, ease: 'easeOut' as const },
};

export function ChatPage() {
  const { shop, isDemo } = useAuth();
  const timeZone = useShopTimezone();
  const queryClient = useQueryClient();
  const guardDemoWrite = useGuardDemoWrite();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState('');
  const [local, setLocal] = useState<ChatBubble[]>([]);
  const [sessionOnly, setSessionOnly] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState(() =>
    new Date().toISOString(),
  );

  const history = useQuery({
    queryKey: ['chat', 'history', shop?.id],
    queryFn: fetchChatHistory,
    enabled: Boolean(shop?.id),
    staleTime: 0,
  });

  const send = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'history'] });
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
      // Chat commands mutate the same shop data as Sales / Products / Dashboard.
      void queryClient.invalidateQueries({ queryKey: ['sales'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setLocal([]);
    },
  });

  // After login / shop switch, show full cross-channel history (not a local filter).
  useEffect(() => {
    setSessionOnly(false);
    setLocal([]);
    setSessionStartedAt(new Date().toISOString());
  }, [shop?.id]);

  const historyMessages = useMemo(() => {
    const rows = history.data?.messages || [];
    if (!sessionOnly) return rows;
    return rows.filter(
      (m) => m.createdAt && m.createdAt >= sessionStartedAt,
    );
  }, [history.data?.messages, sessionOnly, sessionStartedAt]);

  const messages = [...historyMessages, ...local];
  const isEmpty =
    messages.length === 0 && !history.isLoading && !history.isError;
  const showingDemoFeed = Boolean(isDemo || history.data?.demoFeed);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, send.isPending]);

  function startNewConversation() {
    setSessionStartedAt(new Date().toISOString());
    setSessionOnly(true);
    setLocal([]);
    setDraft('');
  }

  async function submit(text: string) {
    const message = text.trim();
    if (!message || send.isPending) return;
    if (guardDemoWrite('use chat commands')) return;

    setDraft('');
    setLocal((prev) => [
      ...prev,
      {
        role: 'user',
        text: message,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      await send.mutateAsync(message);
    } catch (err) {
      if (isDemoReadOnlyError(err)) {
        setLocal((prev) => prev.slice(0, -1));
        return;
      }
      setLocal((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            err instanceof Error
              ? err.message
              : 'Something went wrong. Please try again.',
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(draft);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit(draft);
    }
  }

  let lastDay = '';

  return (
    <Page>
      <Shell>
        <Header>
          <Content>
            <HeaderLeft>
              <BrandSlot>
                <BrandMark size={48} />
              </BrandSlot>
              <HeaderText>
                <h1>
                  {shop?.businessName || 'ChartShop'}
                  <Online>Online</Online>
                </h1>
                <p>
                  {showingDemoFeed
                    ? 'Demo activity log — sales & commands across channels'
                    : 'Web chat commands for your shop'}
                </p>
              </HeaderText>
            </HeaderLeft>
            <NewChatBtn type="button" onClick={startNewConversation} aria-label="New conversation">
              <Plus size={16} />
              <span>New conversation</span>
            </NewChatBtn>
          </Content>
        </Header>

        <Thread $roomy={!isEmpty}>
          <ThreadInner>
            <AnimatePresence>
              {history.isLoading && messages.length === 0 ? (
                <ChatThreadSkeleton />
              ) : null}
              {history.isError && messages.length === 0 ? (
                <Empty
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <strong>Couldn’t load chat history</strong>
                  <p>
                    Your past commands from web and Telegram should
                    appear here after login. Check your connection and try
                    again.
                  </p>
                  <EmptyActions>
                    <EmptyAction
                      type="button"
                      onClick={() => void history.refetch()}
                    >
                      <Sparkles size={18} />
                      <span>
                        <strong>Retry</strong>
                        <em>reload history</em>
                      </span>
                    </EmptyAction>
                  </EmptyActions>
                </Empty>
              ) : null}
              {isEmpty ? (
                <Empty
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <div className="badge">
                    <Sparkles size={14} />
                    Ready when you are
                  </div>
                  <strong>Run your shop from chat</strong>
                  <p>
                    Sell, restock, check reports — the same commands as Telegram,
                    right here on the web. WhatsApp is coming soon.
                  </p>
                  <EmptyActions>
                    {SUGGESTIONS.slice(0, 4).map(({ cmd, label, icon: Icon }) => (
                      <EmptyAction
                        key={cmd}
                        type="button"
                        onClick={() => void submit(cmd)}
                      >
                        <Icon size={18} />
                        <span>
                          <strong>{label}</strong>
                          <em>{cmd}</em>
                        </span>
                      </EmptyAction>
                    ))}
                  </EmptyActions>
                </Empty>
              ) : null}
            </AnimatePresence>

            {messages.map((msg, index) => {
              const day = shopDayKey(msg.createdAt, timeZone);
              const showDay = Boolean(day) && day !== lastDay;
              if (showDay) lastDay = day;
              const mine = msg.role === 'user';
              return (
                <div key={msg.id || `${msg.role}-${index}-${msg.createdAt}`}>
                  {showDay ? (
                    <DayDivider>
                      <span>
                        {formatShopDayLabel(msg.createdAt!, timeZone)}
                      </span>
                    </DayDivider>
                  ) : null}
                  <MsgRow
                    $mine={mine}
                    initial={bubbleMotion.initial}
                    animate={bubbleMotion.animate}
                    transition={bubbleMotion.transition}
                  >
                    {!mine ? (
                      <BubbleAvatar>
                        <MessageCircle size={14} />
                      </BubbleAvatar>
                    ) : null}
                    <Bubble $mine={mine} $activity={msg.type === 'activity'}>
                      {msg.text}
                      <Meta $mine={mine}>
                        {msg.createdAt
                          ? formatShopTime(msg.createdAt, timeZone)
                          : ''}
                        {msg.channel && !mine ? ` · ${msg.channel}` : ''}
                        {msg.type === 'activity' ? ' · log' : ''}
                      </Meta>
                    </Bubble>
                  </MsgRow>
                </div>
              );
            })}

            {send.isPending ? (
              <MsgRow
                initial={bubbleMotion.initial}
                animate={bubbleMotion.animate}
                transition={bubbleMotion.transition}
              >
                <BubbleAvatar>
                  <MessageCircle size={14} />
                </BubbleAvatar>
                <Typing aria-label="ChartShop is typing">
                  <Dot $delay={0} />
                  <Dot $delay={140} />
                  <Dot $delay={280} />
                </Typing>
              </MsgRow>
            ) : null}
            <div ref={bottomRef} />
          </ThreadInner>
        </Thread>

        <Footer>
          <FooterInner>
            {!isEmpty ? (
              <Chips>
                {SUGGESTIONS.map(({ cmd, label, icon: Icon }) => (
                  <Chip key={cmd} type="button" onClick={() => void submit(cmd)}>
                    <Icon size={13} />
                    {label}
                  </Chip>
                ))}
              </Chips>
            ) : null}

            <Composer onSubmit={onSubmit}>
              <InputShell>
                <IconBtn aria-hidden>
                  <Pencil size={18} />
                </IconBtn>
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={
                    showingDemoFeed
                      ? 'Demo is read-only — scroll the activity log above'
                      : 'Type a message'
                  }
                  disabled={showingDemoFeed}
                  readOnly={showingDemoFeed}
                  rows={1}
                />
                <SendBtn
                  type="submit"
                  disabled={
                    showingDemoFeed || !draft.trim() || send.isPending
                  }
                  aria-label={send.isPending ? 'Sending' : 'Send'}
                  aria-busy={send.isPending || undefined}
                >
                  {send.isPending ? (
                    <SendSpinner size={18} strokeWidth={2.5} aria-hidden />
                  ) : (
                    <ArrowUp size={18} strokeWidth={2.5} />
                  )}
                </SendBtn>
              </InputShell>
            </Composer>

            <Disclaimer>
              {showingDemoFeed
                ? 'This shared demo is read-only. Scroll the log to see real shop activity — then create your own shop to run commands.'
                : 'ChartShop chat uses the same command language as Telegram. Messages are logged in Activity. WhatsApp is coming soon.'}
            </Disclaimer>
          </FooterInner>
        </Footer>
      </Shell>
    </Page>
  );
}
