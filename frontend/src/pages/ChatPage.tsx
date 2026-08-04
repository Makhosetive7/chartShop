import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  differenceInCalendarDays,
  format,
  isThisYear,
  isToday,
  isYesterday,
} from 'date-fns';
import {
  ArrowUp,
  MessageCircle,
  Package,
  Pencil,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { fetchChatHistory, sendChatMessage, type ChatBubble } from '@/api/chat';
import { useAuth } from '@/auth';
import { BrandMark } from '@/components/ui/BrandMark';

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
  padding-inline: clamp(12px, 3vw, 28px);
  box-sizing: border-box;
`;

const Header = styled.header`
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  padding: 12px 0 10px;
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
    gap: 12px;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`;

const HeaderText = styled.div`
  min-width: 0;

  h1 {
    margin: 0;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    font-size: 1.12rem;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.textPrimary};
  }

  p {
    margin: 3px 0 0;
    font-size: 0.84rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const Online = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  border-radius: 0;
  font-size: 0.66rem;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.success};
  background: ${({ theme }) => theme.colors.successTint};
  text-transform: uppercase;

  &::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 0;
    background: ${({ theme }) => theme.colors.success};
    animation: ${pulse} 1.6s ease-in-out infinite;
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
  padding: 9px 12px;
  font-size: 0.88rem;
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
  padding: 8px 0 12px;
  display: flex;
  flex-direction: column;
  background: transparent;
  /* Room for fixed composer (+ chips when present) */
  padding-bottom: ${({ $roomy }) =>
    $roomy
      ? 'calc(148px + env(safe-area-inset-bottom, 0px))'
      : 'calc(88px + env(safe-area-inset-bottom, 0px))'};

  @media (min-width: 720px) {
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
  gap: 12px;
  flex: 1;
  width: 100%;
  min-width: 0;
`;

const DayDivider = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  margin: 10px 0 4px;
  width: 100%;

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
    padding: 5px 12px;
    border-radius: 0;
    background: rgba(255, 255, 255, 0.72);
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.74rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    letter-spacing: 0.01em;
    white-space: nowrap;
  }
`;

const MsgRow = styled(motion.div)<{ $mine?: boolean }>`
  display: flex;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  align-items: flex-end;
  justify-content: ${({ $mine }) => ($mine ? 'flex-end' : 'flex-start')};
  gap: 8px;
`;

const BubbleAvatar = styled.div`
  width: 28px;
  height: 28px;
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
`;

const Bubble = styled.div<{ $mine?: boolean }>`
  /* Leave a clear opposite gutter so left/right bubbles read side-by-side */
  flex: 0 1 auto;
  max-width: ${({ $mine }) => ($mine ? '78%' : 'calc(100% - 36px)')};
  min-width: 0;
  padding: 11px 13px 8px;
  border-radius: 0;
  background: ${({ theme, $mine }) =>
    $mine
      ? `linear-gradient(145deg, ${theme.colors.coral}, ${theme.colors.maroon})`
      : theme.colors.surface};
  color: ${({ theme, $mine }) =>
    $mine ? theme.colors.textOnDark : theme.colors.textPrimary};
  border: 1px solid
    ${({ theme, $mine }) => ($mine ? 'transparent' : theme.colors.border)};
  box-shadow: ${({ $mine }) =>
    $mine
      ? '0 10px 24px rgba(74, 14, 28, 0.22)'
      : '0 6px 18px rgba(26, 10, 10, 0.05)'};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  font-size: 0.92rem;
  line-height: 1.5;

  @media (min-width: 560px) {
    max-width: min(72%, 520px);
    font-size: 0.95rem;
    padding: 13px 15px 9px;
  }
`;

const Meta = styled.div<{ $mine?: boolean }>`
  margin-top: 7px;
  text-align: ${({ $mine }) => ($mine ? 'right' : 'left')};
  font-size: 0.68rem;
  color: ${({ theme, $mine }) =>
    $mine ? 'rgba(255,255,255,0.78)' : theme.colors.textMuted};
`;

const Footer = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  z-index: 45;
  padding: 10px 0 12px;
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
  gap: 8px;
  margin-bottom: 10px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  max-width: 100%;
  padding-bottom: 2px;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
  border-radius: 0;
  padding: 7px 12px;
  font-size: 0.78rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease,
    transform 0.15s ease;

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
  gap: 8px;
  min-height: 52px;
  min-width: 0;
  max-width: 100%;
  padding: 6px 6px 6px 14px;
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
    min-height: 56px;
    padding: 6px 6px 6px 16px;
  }

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px ${({ theme }) => theme.colors.primaryTint};
  }
`;

const IconBtn = styled.span`
  display: grid;
  place-items: center;
  color: ${({ theme }) => theme.colors.primary};
  flex-shrink: 0;
  opacity: 0.7;
`;

const Input = styled.textarea`
  flex: 1;
  min-width: 0;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 0.95rem;
  line-height: 1.4;
  padding: 10px 4px;
  max-height: 120px;
  color: ${({ theme }) => theme.colors.textPrimary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const SendBtn = styled.button`
  width: 44px;
  height: 44px;
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
  padding: 28px 8px 24px;
  width: 100%;
  box-sizing: border-box;

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    margin-bottom: 16px;
    border-radius: 0;
    background: ${({ theme }) => theme.colors.primaryTint};
    color: ${({ theme }) => theme.colors.primaryDark};
    font-size: 0.78rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.textPrimary};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.2rem, 5vw, 1.45rem);
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    margin-bottom: 10px;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0 0 18px;
    line-height: 1.55;
    font-size: 0.92rem;
  }
`;

const EmptyActions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
`;

const EmptyAction = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  min-width: 0;
  padding: 10px 12px;
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

  span {
    display: grid;
    gap: 2px;
    min-width: 0;

    strong {
      margin: 0;
      font-size: 0.84rem;
      font-family: ${({ theme }) => theme.fonts.body};
      font-weight: ${({ theme }) => theme.fontWeights.semibold};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    em {
      font-style: normal;
      font-size: 0.72rem;
      color: ${({ theme }) => theme.colors.textMuted};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.primary};
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
  min-width: 64px;
  padding-block: 14px;
`;

const Dot = styled.span<{ $delay: number }>`
  width: 7px;
  height: 7px;
  border-radius: 0;
  background: ${({ theme }) => theme.colors.primary};
  opacity: 0.45;
  animation: ${bounceDot} 1.1s ease-in-out infinite;
  animation-delay: ${({ $delay }) => `${$delay}ms`};
`;

const bubbleMotion = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.22, ease: 'easeOut' as const },
};

function dayKey(iso?: string) {
  if (!iso) return '';
  return format(new Date(iso), 'yyyy-MM-dd');
}

function formatDayLabel(iso: string) {
  const date = new Date(iso);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (differenceInCalendarDays(new Date(), date) < 7) {
    return format(date, 'EEEE');
  }
  if (isThisYear(date)) {
    return format(date, 'EEEE, d MMMM');
  }
  return format(date, 'd MMMM yyyy');
}

export function ChatPage() {
  const { shop } = useAuth();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState('');
  const [local, setLocal] = useState<ChatBubble[]>([]);
  const [sessionOnly, setSessionOnly] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState(() =>
    new Date().toISOString(),
  );

  const history = useQuery({
    queryKey: ['chat', 'history'],
    queryFn: fetchChatHistory,
  });

  const send = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'history'] });
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
      setLocal([]);
    },
  });

  const historyMessages = sessionOnly
    ? (history.data || []).filter(
        (m) => m.createdAt && m.createdAt >= sessionStartedAt,
      )
    : history.data || [];

  const messages = [...historyMessages, ...local];
  const isEmpty = messages.length === 0 && !history.isLoading;

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
              <BrandMark size={48} />
              <HeaderText>
                <h1>
                  {shop?.businessName || 'ChartShop'}
                  <Online>Online</Online>
                </h1>
                <p>Your shop assistant — same commands as Telegram & WhatsApp</p>
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
                    Sell, restock, check reports — the same commands you use on
                    Telegram and WhatsApp, right here.
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
              const day = dayKey(msg.createdAt);
              const showDay = day && day !== lastDay;
              if (showDay) lastDay = day;
              const mine = msg.role === 'user';
              return (
                <div key={msg.id || `${msg.role}-${index}-${msg.createdAt}`}>
                  {showDay ? (
                    <DayDivider>
                      <span>{formatDayLabel(msg.createdAt!)}</span>
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
                    <Bubble $mine={mine}>
                      {msg.text}
                      <Meta $mine={mine}>
                        {msg.createdAt
                          ? format(new Date(msg.createdAt), 'HH:mm')
                          : ''}
                        {msg.channel && !mine ? ` · ${msg.channel}` : ''}
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
                  placeholder="Message ChartShop…"
                  rows={1}
                />
                <SendBtn
                  type="submit"
                  disabled={!draft.trim() || send.isPending}
                  aria-label="Send"
                >
                  <ArrowUp size={18} strokeWidth={2.5} />
                </SendBtn>
              </InputShell>
            </Composer>

            <Disclaimer>
              ChartShop runs the same commands as Telegram & WhatsApp. Messages
              are logged in Activity across all channels.
            </Disclaimer>
          </FooterInner>
        </Footer>
      </Shell>
    </Page>
  );
}
