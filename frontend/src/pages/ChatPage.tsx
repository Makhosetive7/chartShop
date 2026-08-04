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
  width: 100%;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(
      1100px 480px at 8% -8%,
      rgba(227, 18, 88, 0.09),
      transparent 55%
    ),
    radial-gradient(
      900px 420px at 96% 4%,
      rgba(255, 71, 126, 0.07),
      transparent 50%
    ),
    linear-gradient(180deg, #fff8fa 0%, #fbfcfd 45%, #f7f8fa 100%);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.5;
    background-image: url("data:image/svg+xml,%3Csvg width='96' height='96' viewBox='0 0 96 96' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23E31258' stroke-opacity='0.09' stroke-width='1.25'%3E%3Crect x='14' y='18' width='20' height='14' rx='3'/%3E%3Cpath d='M52 20l12 7v14l-12 7-12-7V27z'/%3E%3Ccircle cx='24' cy='62' r='10'/%3E%3Cpath d='M58 58h22M69 58v18M18 82h22'/%3E%3C/g%3E%3C/svg%3E");
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
  display: grid;
  grid-template-rows: auto 1fr auto;
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  background: transparent;
`;

const Content = styled.div`
  width: min(820px, 100%);
  margin: 0 auto;
  padding-inline: clamp(16px, 3vw, 28px);
`;

const Header = styled.header`
  position: relative;
  z-index: 2;
  padding: 18px 0 14px;
  background: linear-gradient(
    180deg,
    rgba(255, 248, 250, 0.92) 0%,
    rgba(255, 248, 250, 0.55) 70%,
    transparent 100%
  );

  ${Content} {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`;

const Avatar = styled.div`
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: linear-gradient(
    145deg,
    ${({ theme }) => theme.colors.primaryLight},
    ${({ theme }) => theme.colors.primaryDark}
  );
  color: #fff;
  box-shadow:
    0 8px 20px rgba(227, 18, 88, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
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
  border-radius: 999px;
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
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.success};
    animation: ${pulse} 1.6s ease-in-out infinite;
  }
`;

const NewChatBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textPrimary};
  border-radius: 999px;
  padding: 9px 16px;
  font-size: 0.88rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  white-space: nowrap;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primaryTint};
    color: ${({ theme }) => theme.colors.primaryDark};
    box-shadow: 0 6px 16px rgba(227, 18, 88, 0.12);
    transform: translateY(-1px);
  }
`;

const Thread = styled.div`
  position: relative;
  overflow-y: auto;
  padding: 8px 0 20px;
  display: flex;
  flex-direction: column;
  background: transparent;
`;

const ThreadInner = styled(Content)`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 100%;
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
    border-radius: 999px;
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
  align-items: flex-end;
  justify-content: ${({ $mine }) => ($mine ? 'flex-end' : 'flex-start')};
  gap: 10px;
`;

const BubbleAvatar = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
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
  box-shadow: 0 4px 10px rgba(227, 18, 88, 0.22);
`;

const Bubble = styled.div<{ $mine?: boolean }>`
  max-width: min(78%, 520px);
  padding: 13px 15px 9px;
  border-radius: ${({ $mine }) =>
    $mine ? '20px 20px 6px 20px' : '20px 20px 20px 6px'};
  background: ${({ theme, $mine }) =>
    $mine
      ? `linear-gradient(145deg, ${theme.colors.primaryLight}, ${theme.colors.primary})`
      : theme.colors.surface};
  color: ${({ theme, $mine }) =>
    $mine ? theme.colors.surface : theme.colors.textPrimary};
  border: 1px solid
    ${({ theme, $mine }) => ($mine ? 'transparent' : theme.colors.border)};
  box-shadow: ${({ $mine }) =>
    $mine
      ? '0 10px 24px rgba(227, 18, 88, 0.22)'
      : '0 6px 18px rgba(17, 24, 39, 0.05)'};
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.95rem;
  line-height: 1.55;
`;

const Meta = styled.div<{ $mine?: boolean }>`
  margin-top: 7px;
  text-align: ${({ $mine }) => ($mine ? 'right' : 'left')};
  font-size: 0.68rem;
  color: ${({ $mine }) => ($mine ? 'rgba(255,255,255,0.78)' : '#9CA3AF')};
`;

const Footer = styled.div`
  position: relative;
  z-index: 2;
  padding: 12px 0 14px;
  background: linear-gradient(
    0deg,
    rgba(255, 248, 250, 0.96) 0%,
    rgba(255, 248, 250, 0.7) 55%,
    transparent 100%
  );
`;

const FooterInner = styled(Content)``;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
`;

const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
  border-radius: 999px;
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
`;

const InputShell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 56px;
  padding: 6px 6px 6px 16px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: #fff;
  box-shadow:
    0 1px 2px rgba(17, 24, 39, 0.04),
    0 10px 28px rgba(227, 18, 88, 0.06);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;

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
    color: #9ca3af;
  }
`;

const SendBtn = styled.button`
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(
    145deg,
    ${({ theme }) => theme.colors.primaryLight},
    ${({ theme }) => theme.colors.primary}
  );
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 6px 16px rgba(227, 18, 88, 0.32);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    opacity 0.15s ease;

  &:hover:not(:disabled) {
    transform: scale(1.06);
    box-shadow: 0 8px 20px rgba(227, 18, 88, 0.4);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }
`;

const Disclaimer = styled.p`
  margin: 12px 0 0;
  text-align: center;
  font-size: 0.72rem;
  color: #9ca3af;
  line-height: 1.4;
`;

const Empty = styled(motion.div)`
  margin: auto;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
  max-width: 28rem;
  padding: 48px 16px;

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    margin-bottom: 16px;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.primaryTint};
    color: ${({ theme }) => theme.colors.primaryDark};
    font-size: 0.78rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.textPrimary};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.45rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    margin-bottom: 10px;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0 0 22px;
    line-height: 1.55;
  }
`;

const EmptyActions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const EmptyAction = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  padding: 12px 14px;
  border-radius: 14px;
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

    strong {
      margin: 0;
      font-size: 0.88rem;
      font-family: ${({ theme }) => theme.fonts.body};
      font-weight: ${({ theme }) => theme.fontWeights.semibold};
    }

    em {
      font-style: normal;
      font-size: 0.75rem;
      color: ${({ theme }) => theme.colors.textMuted};
    }
  }

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.primary};
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-2px);
    box-shadow: 0 10px 22px rgba(227, 18, 88, 0.1);
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
  border-radius: 50%;
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
              <Avatar>
                <MessageCircle size={22} />
              </Avatar>
              <HeaderText>
                <h1>
                  {shop?.businessName || 'ChartShop'}
                  <Online>Online</Online>
                </h1>
                <p>Your shop assistant — same commands as Telegram & WhatsApp</p>
              </HeaderText>
            </HeaderLeft>
            <NewChatBtn type="button" onClick={startNewConversation}>
              <Plus size={16} />
              New conversation
            </NewChatBtn>
          </Content>
        </Header>

        <Thread>
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
                  placeholder="Type a command or ask about your shop…"
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
