import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { Globe, MessageCircle, Phone, Search, Server } from 'lucide-react';
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
import { Modal } from '@/components/ui/Modal';
import {
  ActivityListSkeleton,
  ActivityStatsSkeleton,
} from '@/components/skeletons/PageSkeletons';
import { useShopTimezone } from '@/hooks/useShopTimezone';
import { formatShopDayLabel, formatShopTime, shopDayKey } from '@/utils/dates';

const CHANNELS = ['all', 'web', 'telegram', 'whatsapp', 'system'] as const;
const ACTIONS = [
  'all',
  'chat.turn',
  'auth.login',
  'sale.cash',
  'sale.credit',
  'sale.cancelled',
  'expense.recorded',
  'product.create',
  'product.stock',
] as const;

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

const DetailTrigger = styled.button`
  margin-top: 10px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.maroon};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: 0.82rem;
  cursor: pointer;
  padding: 0;

  &:hover {
    text-decoration: underline;
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
  if (action === 'sale.cash') return 'Cash sale';
  if (action === 'sale.credit') return 'Credit sale';
  if (action === 'sale.to_customer') return 'Sale';
  if (action === 'sale.cancelled') return 'Cancelled';
  if (action === 'expense.recorded') return 'Expense';
  if (action === 'product.create') return 'New product';
  if (action === 'product.update') return 'Product edit';
  if (action === 'product.stock') return 'Stock';
  if (action === 'product.delete') return 'Product removed';
  if (action === 'product.variant.add') return 'Product option';
  if (action === 'product.pack.add') return 'Product pack';
  if (action === 'customer.create') return 'Customer';
  if (action === 'customer.credit') return 'Credit';
  if (action === 'customer.payment') return 'Payment';
  if (action === 'laybye.created') return 'Laybye';
  if (action === 'laybye.payment') return 'Laybye pay';
  if (action === 'laybye.completed') return 'Laybye done';
  if (action === 'order.create') return 'Order';
  if (action === 'order.status') return 'Order status';
  if (action.startsWith('team.')) return 'Team';
  if (action === 'shop.name') return 'Shop name';
  if (action === 'shop.description') return 'Shop about';
  if (action === 'shop.settings') return 'Settings';
  if (action === 'auth.username') return 'Username';
  if (action === 'auth.display_name') return 'Display name';
  if (action === 'auth.pin') return 'PIN change';
  if (action === 'auth.setup_pin') return 'PIN setup';
  if (action === 'team.member.setup_code') return 'Setup code';
  return action;
}

function actorLabel(row: ActivityItem) {
  if (row.actorDisplayName && row.actorUsername) {
    return `${row.actorDisplayName} (@${row.actorUsername})`;
  }
  if (row.actorUsername) return `@${row.actorUsername}`;
  if (row.actorDisplayName) return row.actorDisplayName;
  if (row.actorId && !/^[a-f0-9]{24}$/i.test(row.actorId)) return row.actorId;
  return null;
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
  const [mineOnly, setMineOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [detailItem, setDetailItem] = useState<ActivityItem | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['activity', channel, action, mineOnly],
    queryFn: () =>
      fetchActivity({
        limit: 120,
        channel: channel === 'all' ? undefined : channel,
        action: action === 'all' ? undefined : action,
        mine: mineOnly || undefined,
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
      const actor =
        `${row.actorDisplayName || ''} ${row.actorUsername || ''} ${row.actorId || ''}`.toLowerCase();
      return (
        row.summary.toLowerCase().includes(q) ||
        row.action.toLowerCase().includes(q) ||
        row.channel.toLowerCase().includes(q) ||
        actor.includes(q) ||
        input.toLowerCase().includes(q) ||
        reply.toLowerCase().includes(q)
      );
    });
  }, [items, query]);

  let lastDay = '';
  const detailParts = detailItem ? getChatParts(detailItem) : null;

  return (
    <Page>
      <Header>
        <PageTitle style={{ marginBottom: 8 }}>Activity</PageTitle>
        <PageLead style={{ marginBottom: 0 }}>
          Shop timeline across web, Telegram, and WhatsApp — see who did what.
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
          <Tab type="button" $active={!mineOnly} onClick={() => setMineOnly(false)}>
            Everyone
          </Tab>
          <Tab type="button" $active={mineOnly} onClick={() => setMineOnly(true)}>
            My activity
          </Tab>
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
            const canShowDetails = Boolean(input || reply);
            const who = actorLabel(row);

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
                      {who ? <Badge $tone="info">{who}</Badge> : null}
                    </Meta>
                    <Time>{formatShopTime(row.createdAt, timeZone)}</Time>
                  </Top>

                  <Summary>{row.summary}</Summary>

                  {canShowDetails ? (
                    <DetailTrigger type="button" onClick={() => setDetailItem(row)}>
                      Show command & reply
                    </DetailTrigger>
                  ) : null}
                </Item>
              </div>
            );
          })}
        </List>
      )}

      <Modal
        open={Boolean(detailItem)}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null);
        }}
        title="Command & reply"
        description={detailItem?.summary}
        size="md"
        showDone
      >
        {detailParts ? (
          <Detail>
            {detailParts.input ? (
              <Bubble $tone="in">
                <strong>Command</strong>
                {detailParts.input}
              </Bubble>
            ) : null}
            {detailParts.reply ? (
              <Bubble $tone="out">
                <strong>Reply</strong>
                {detailParts.reply}
              </Bubble>
            ) : null}
          </Detail>
        ) : null}
      </Modal>

      {!isLoading && filtered.length === 0 ? (
        <Card>
          <Empty>
            <strong>{items.length === 0 ? 'No activity yet' : 'No matches'}</strong>
            {items.length === 0
              ? 'Open Chat and send help, or sign in again to see the first events.'
              : 'Try another channel, action, or search term.'}
          </Empty>
        </Card>
      ) : null}
    </Page>
  );
}
