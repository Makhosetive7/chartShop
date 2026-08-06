import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import {
  Globe,
  MessageCircle,
  Phone,
  Search,
  Server,
} from 'lucide-react';
import { fetchActivity, type ActivityItem } from '@/api/chat';
import {
  Page,
  PageTitle,
  PageLead,
  Card,
  Tabs,
  Tab,
  ErrorBanner,
  Badge,
} from '@/components/ui/primitives';
import {
  ActivityListSkeleton,
  ActivityStatsSkeleton,
} from '@/components/skeletons/PageSkeletons';
import { useShopTimezone } from '@/hooks/useShopTimezone';
import {
  formatShopDayLabel,
  formatShopTime,
  shopDayKey,
} from '@/utils/dates';

const CHANNELS = ['all', 'web', 'telegram', 'whatsapp', 'system'] as const;
const ACTIONS = ['all', 'chat.turn', 'auth.login'] as const;

type ChannelFilter = (typeof CHANNELS)[number];
type ActionFilter = (typeof ACTIONS)[number];

const Header = styled.div`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.space[5]};
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[4]};

  @media (min-width: 560px) {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  }
`;

const Stat = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: ${({ theme }) => theme.space[4]};
  text-align: center;
`;

const StatLabel = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.78rem;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  margin-bottom: 6px;
  text-transform: capitalize;
`;

const StatValue = styled.div`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: 1.3rem;
  color: ${({ theme }) => theme.colors.maroon};
  letter-spacing: -0.03em;
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: ${({ theme }) => theme.space[4]};
`;

const SearchField = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: min(280px, 100%);
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  background: ${({ theme }) => theme.colors.cream};

  svg {
    color: ${({ theme }) => theme.colors.textMuted};
    flex-shrink: 0;
  }

  input {
    border: none;
    outline: none;
    width: 100%;
    background: transparent;
    font: inherit;
  }
`;

const DayLabel = styled.div`
  text-align: center;
  margin: 18px 0 10px;
  font-size: 0.8rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Item = styled.li`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: 14px 16px;
`;

const Top = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  margin-bottom: 8px;
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ChannelPill = styled.span<{ $channel: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 0;
  font-size: 0.75rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  text-transform: capitalize;
  background: ${({ theme, $channel }) => {
    if ($channel === 'web') return theme.colors.primaryTint;
    if ($channel === 'whatsapp') return theme.colors.successTint;
    if ($channel === 'system') return theme.colors.warningTint;
    return theme.colors.infoTint;
  }};
  color: ${({ theme, $channel }) => {
    if ($channel === 'web') return theme.colors.primaryDark;
    if ($channel === 'whatsapp') return theme.colors.success;
    if ($channel === 'system') return theme.colors.warning;
    return theme.colors.info;
  }};
`;

const Time = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textMuted};
  white-space: nowrap;
`;

const Summary = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textPrimary};
  white-space: pre-wrap;
  line-height: 1.5;
  font-size: 0.95rem;
`;

const Detail = styled.div`
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: grid;
  gap: 8px;
`;

const Bubble = styled.div<{ $tone: 'in' | 'out' }>`
  padding: 10px 12px;
  border-radius: 0;
  font-size: 0.88rem;
  line-height: 1.45;
  white-space: pre-wrap;
  background: ${({ theme, $tone }) =>
    $tone === 'in' ? theme.colors.primaryTint : theme.colors.background};
  color: ${({ theme }) => theme.colors.textPrimary};

  strong {
    display: block;
    margin-bottom: 4px;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

const Empty = styled.div`
  text-align: center;
  padding: 36px 16px;
  color: ${({ theme }) => theme.colors.textSecondary};

  strong {
    display: block;
    margin-bottom: 8px;
    color: ${({ theme }) => theme.colors.textPrimary};
    font-family: ${({ theme }) => theme.fonts.heading};
  }
`;

const ResultCount = styled.p`
  text-align: center;
  margin: 0 0 ${({ theme }) => theme.space[3]};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.85rem;
`;

function channelIcon(channel: string) {
  if (channel === 'web') return Globe;
  if (channel === 'whatsapp') return Phone;
  if (channel === 'system') return Server;
  return MessageCircle;
}

function actionLabel(action: string) {
  if (action === 'chat.turn') return 'Chat';
  if (action === 'auth.login') return 'Login';
  return action;
}

function getChatParts(row: ActivityItem) {
  const input = typeof row.metadata?.input === 'string' ? row.metadata.input : '';
  const reply = typeof row.metadata?.reply === 'string' ? row.metadata.reply : '';
  return { input, reply };
}

export function ActivityPage() {
  const timeZone = useShopTimezone();
  const [channel, setChannel] = useState<ChannelFilter>('all');
  const [action, setAction] = useState<ActionFilter>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ['activity', channel, action],
    queryFn: () =>
      fetchActivity({
        limit: 120,
        channel: channel === 'all' ? undefined : channel,
        action: action === 'all' ? undefined : action,
      }),
  });

  const items = data || [];

  const counts = useMemo(() => {
    const byChannel = {
      web: 0,
      telegram: 0,
      whatsapp: 0,
      system: 0,
    };
    for (const row of items) {
      if (row.channel in byChannel) {
        byChannel[row.channel as keyof typeof byChannel] += 1;
      }
    }
    return {
      total: items.length,
      web: byChannel.web,
      telegram: byChannel.telegram,
      whatsapp: byChannel.whatsapp,
      system: byChannel.system,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const { input, reply } = getChatParts(row);
      return (
        row.summary.toLowerCase().includes(q) ||
        row.action.toLowerCase().includes(q) ||
        row.channel.toLowerCase().includes(q) ||
        input.toLowerCase().includes(q) ||
        reply.toLowerCase().includes(q)
      );
    });
  }, [items, query]);

  let lastDay = '';

  return (
    <Page>
      <Header>
        <PageTitle style={{ marginBottom: 8 }}>Activity</PageTitle>
        <PageLead style={{ marginBottom: 0 }}>
          Every command from web and Telegram — one shop timeline. WhatsApp will join when it ships.
        </PageLead>
      </Header>

      {isLoading ? (
        <ActivityStatsSkeleton />
      ) : (
        <Stats>
          <Stat>
            <StatLabel>Loaded</StatLabel>
            <StatValue>{counts.total}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Web</StatLabel>
            <StatValue>{counts.web}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Telegram</StatLabel>
            <StatValue>{counts.telegram}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>WhatsApp</StatLabel>
            <StatValue>{counts.whatsapp}</StatValue>
          </Stat>
        </Stats>
      )}

      <Toolbar>
        <Tabs style={{ marginBottom: 0 }}>
          {CHANNELS.map((c) => (
            <Tab
              key={c}
              type="button"
              $active={channel === c}
              onClick={() => setChannel(c)}
            >
              {c}
            </Tab>
          ))}
        </Tabs>
        <Tabs style={{ marginBottom: 0 }}>
          {ACTIONS.map((a) => (
            <Tab
              key={a}
              type="button"
              $active={action === a}
              onClick={() => setAction(a)}
            >
              {a === 'all' ? 'All actions' : actionLabel(a)}
            </Tab>
          ))}
        </Tabs>
        <SearchField>
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands or replies…"
            aria-label="Search activity"
          />
        </SearchField>
      </Toolbar>

      {error ? <ErrorBanner>Could not load activity.</ErrorBanner> : null}

      {!isLoading ? (
        <ResultCount>
          Showing {filtered.length} event{filtered.length === 1 ? '' : 's'}
        </ResultCount>
      ) : null}

      {isLoading ? (
        <ActivityListSkeleton />
      ) : (
      <List>
        {filtered.map((row) => {
          const day = shopDayKey(row.createdAt, timeZone);
          const showDay = day !== lastDay;
          if (showDay) lastDay = day;
          const Icon = channelIcon(row.channel);
          const { input, reply } = getChatParts(row);
          const open = Boolean(expanded[row.id]);
          const canExpand = Boolean(input || reply);

          return (
            <div key={row.id}>
              {showDay ? (
                <DayLabel>{formatShopDayLabel(row.createdAt, timeZone)}</DayLabel>
              ) : null}
              <Item>
                <Top>
                  <Meta>
                    <ChannelPill $channel={row.channel}>
                      <Icon size={12} />
                      {row.channel}
                    </ChannelPill>
                    <Badge
                      $tone={
                        row.action === 'auth.login'
                          ? 'success'
                          : row.action === 'chat.turn'
                            ? 'info'
                            : 'warning'
                      }
                    >
                      {actionLabel(row.action)}
                    </Badge>
                  </Meta>
                  <Time>{formatShopTime(row.createdAt, timeZone)}</Time>
                </Top>

                <Summary>{row.summary}</Summary>

                {canExpand ? (
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [row.id]: !prev[row.id] }))
                    }
                    style={{
                      marginTop: 10,
                      border: 'none',
                      background: 'transparent',
                      color: '#8B1E3A',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {open ? 'Hide details' : 'Show command & reply'}
                  </button>
                ) : null}

                {open && canExpand ? (
                  <Detail>
                    {input ? (
                      <Bubble $tone="in">
                        <strong>Command</strong>
                        {input}
                      </Bubble>
                    ) : null}
                    {reply ? (
                      <Bubble $tone="out">
                        <strong>Reply</strong>
                        {reply}
                      </Bubble>
                    ) : null}
                  </Detail>
                ) : null}
              </Item>
            </div>
          );
        })}
      </List>
      )}

      {!isLoading && filtered.length === 0 ? (
        <Card>
          <Empty>
            <strong>
              {items.length === 0 ? 'No activity yet' : 'No matches'}
            </strong>
            {items.length === 0
              ? 'Open Chat and send help, or sign in again to see the first events.'
              : 'Try another channel, action, or search term.'}
          </Empty>
        </Card>
      ) : null}
    </Page>
  );
}
