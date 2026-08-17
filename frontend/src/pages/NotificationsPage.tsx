import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  Clock,
} from 'lucide-react';
import { fetchActivity, type ActivityItem } from '@/api/chat';
import { recordPayment } from '@/api/customers';
import { type CreditDueItem } from '@/api/sales';
import { getErrorMessage, money } from '@/api/types';
import {
  Page,
  PageTitle,
  Tabs,
  Tab,
  ErrorBanner,
  Input,
  Button,
} from '@/components/ui/primitives';
import { useGuardDemoWrite } from '@/components/demo/DemoUpgradeProvider';
import { toastError, toastSuccess } from '@/lib/toast';
import { useShopTimezone } from '@/hooks/useShopTimezone';
import { formatShopDate, formatShopDateTime } from '@/utils/dates';
import { formatSaleItemLabel } from '@/utils/productCatalog';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import {
  alertSeenKey,
  isChaseUnread,
  notificationSeenKey,
} from '@/utils/notificationUnread';

type Filter = 'all' | 'unread';

type FeedRow = {
  key: string;
  seenKey: string;
  unread: boolean;
  sort: number;
  kind: 'chase' | 'alert';
  chase?: CreditDueItem;
  alert?: ActivityItem;
};

const Shell = styled.div`
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
`;

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
`;

const MarkAll = styled.button`
  border: none;
  background: none;
  padding: 6px 0;
  font: inherit;
  font-size: 0.88rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.maroon};
  cursor: pointer;
  white-space: nowrap;

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }

  &:hover:not(:disabled) {
    text-decoration: underline;
  }
`;

const Feed = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const SectionLabel = styled.div`
  padding: 14px 16px 6px;
  font-size: 1.02rem;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.maroon};
  letter-spacing: -0.02em;
`;

const RowBtn = styled.button<{ $unread?: boolean }>`
  display: flex;
  width: 100%;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  background: ${({ theme, $unread }) =>
    $unread ? theme.colors.primaryTint : theme.colors.surface};
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;

  &:hover {
    background: ${({ theme, $unread }) =>
      $unread ? theme.colors.peachSoft : theme.colors.cream};
  }
`;

const Avatar = styled.span<{ $tone: 'danger' | 'warning' | 'info' | 'muted' }>`
  position: relative;
  flex: 0 0 48px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: 0.92rem;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.textOnDark};
  background: ${({ theme, $tone }) => {
    if ($tone === 'danger') return theme.colors.danger;
    if ($tone === 'warning') return theme.colors.secondary;
    if ($tone === 'info') return theme.colors.primaryLight;
    return theme.colors.maroon;
  }};
`;

const BadgeIcon = styled.span<{ $tone: 'danger' | 'warning' | 'info' | 'muted' }>`
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: ${({ theme, $tone }) => {
    if ($tone === 'danger') return theme.colors.danger;
    if ($tone === 'warning') return theme.colors.warning;
    if ($tone === 'info') return theme.colors.info;
    return theme.colors.maroon;
  }};
  color: ${({ theme }) => theme.colors.textOnDark};
  box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.surface};
`;

const Body = styled.div`
  min-width: 0;
  flex: 1;
`;

const Copy = styled.p`
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.textPrimary};

  strong {
    font-weight: ${({ theme }) => theme.fontWeights.bold};
  }
`;

const Meta = styled.span<{ $unread?: boolean }>`
  display: block;
  margin-top: 4px;
  font-size: 0.8rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme, $unread }) =>
    $unread ? theme.colors.primaryLight : theme.colors.textMuted};
`;

const Dot = styled.span`
  flex: 0 0 12px;
  width: 12px;
  height: 12px;
  margin-top: 18px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primaryLight};
`;

const Expand = styled.div`
  padding: 0 16px 14px 76px;
  background: ${({ theme }) => theme.colors.cream};
`;

const PayForm = styled.form`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`;

const AmountInput = styled(Input)`
  width: 7.5rem;
  flex: 0 0 auto;
  background: ${({ theme }) => theme.colors.surface};
`;

const EmptyState = styled.div`
  padding: 48px 20px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.textPrimary};
    font-size: 1.05rem;
    margin: 10px 0 6px;
  }

  p {
    margin: 0 auto;
    max-width: 22rem;
    font-size: 0.9rem;
    line-height: 1.45;
  }
`;

const SkeletonFeed = styled.div`
  padding: 12px 16px;
`;

const SkelRow = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px 0;

  span {
    display: block;
    background: ${({ theme }) => theme.colors.cream};
  }
`;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function itemsLabel(item: CreditDueItem) {
  const preview = (item.items || [])
    .slice(0, 2)
    .map((line) => formatSaleItemLabel(line))
    .join(', ');
  if (!preview) return 'a credit sale';
  if ((item.items || []).length > 2) return `${preview} +${item.items.length - 2}`;
  return preview;
}

function chaseTone(status: CreditDueItem['status']) {
  if (status === 'overdue') return 'danger' as const;
  if (status === 'due') return 'warning' as const;
  if (status === 'tomorrow') return 'info' as const;
  return 'muted' as const;
}

function chaseCopy(item: CreditDueItem) {
  const goods = itemsLabel(item);
  if (item.status === 'overdue') {
    return (
      <>
        <strong>{item.customerName}</strong> still owes {money(item.customerBalance)}{' '}
        for {goods}. Payment is {item.daysOverdue} day
        {item.daysOverdue === 1 ? '' : 's'} late.
      </>
    );
  }
  if (item.status === 'due') {
    return (
      <>
        <strong>{item.customerName}</strong> owes {money(item.customerBalance)} for{' '}
        {goods}. Payment is due today.
      </>
    );
  }
  if (item.status === 'tomorrow') {
    return (
      <>
        <strong>{item.customerName}</strong> owes {money(item.customerBalance)} for{' '}
        {goods}. Payment is due tomorrow.
      </>
    );
  }
  return (
    <>
      <strong>{item.customerName}</strong> owes {money(item.customerBalance)} for{' '}
      {goods}. Payment is in {item.daysUntilDue} day
      {item.daysUntilDue === 1 ? '' : 's'}.
    </>
  );
}

function chaseWhen(item: CreditDueItem, timeZone: string) {
  if (item.status === 'overdue') {
    return `${item.daysOverdue}d late · pay by ${formatShopDate(item.dueDate, timeZone)}`;
  }
  if (item.status === 'due') return 'Due today';
  if (item.status === 'tomorrow') return 'Tomorrow';
  return formatShopDate(item.dueDate, timeZone);
}

function chaseSort(item: CreditDueItem) {
  if (item.status === 'overdue') return 1000 + item.daysOverdue;
  if (item.status === 'due') return 500;
  if (item.status === 'tomorrow') return 400;
  return 100 - item.daysUntilDue;
}

function PayTowardBalance({ item }: { item: CreditDueItem }) {
  const qc = useQueryClient();
  const guardDemoWrite = useGuardDemoWrite();
  const [amount, setAmount] = useState(
    String(Number(item.customerBalance || 0).toFixed(2)),
  );

  const payM = useMutation({
    mutationFn: () => recordPayment(item.customerId, Number(amount)),
    onSuccess: (data) => {
      toastSuccess(`Recorded ${money(data.amountPaid)} from ${item.customerName}.`);
      void qc.invalidateQueries({ queryKey: ['credit-due'] });
      void qc.invalidateQueries({ queryKey: ['customers'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      void qc.invalidateQueries({ queryKey: ['activity'] });
    },
    onError: (error) => toastError(getErrorMessage(error)),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (guardDemoWrite('record a payment')) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toastError('Enter a payment amount.');
      return;
    }
    payM.mutate();
  }

  return (
    <PayForm onSubmit={onSubmit} onClick={(event) => event.stopPropagation()}>
      <AmountInput
        type="number"
        min="0.01"
        step="0.01"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        aria-label={`Payment from ${item.customerName}`}
      />
      <Button type="submit" $size="sm" loading={payM.isPending}>
        Record payment
      </Button>
    </PayForm>
  );
}

export function NotificationsPage() {
  const timeZone = useShopTimezone();
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const {
    dueQuery: dueQ,
    seenKeys,
    markNotificationsRead,
    markKeysRead,
  } = useUnreadNotifications();
  const alertsQ = useQuery({
    queryKey: ['activity', 'credit.reminder'],
    queryFn: () => fetchActivity({ action: 'credit.reminder', limit: 20 }),
  });

  const feed = useMemo(() => {
    const rows: FeedRow[] = [];
    for (const item of dueQ.data?.items || []) {
      const unread = isChaseUnread(item, seenKeys);
      rows.push({
        key: `chase-${item.id}`,
        seenKey: notificationSeenKey(item),
        unread,
        sort: chaseSort(item) + (unread ? 10_000 : 0),
        kind: 'chase',
        chase: item,
      });
    }
    for (const alert of alertsQ.data || []) {
      const seenKey = alertSeenKey(alert.id);
      const unread = !seenKeys.has(seenKey);
      rows.push({
        key: `alert-${alert.id}`,
        seenKey,
        unread,
        sort: unread ? 200 : 10,
        kind: 'alert',
        alert,
      });
    }
    rows.sort((a, b) => b.sort - a.sort);
    return rows;
  }, [alertsQ.data, dueQ.data?.items, seenKeys]);

  const visible = filter === 'unread' ? feed.filter((row) => row.unread) : feed;
  const newRows = visible.filter((row) => row.unread);
  const earlierRows = visible.filter((row) => !row.unread);
  const loading = dueQ.isLoading || alertsQ.isLoading;
  const feedUnread = feed.filter((row) => row.unread).length;

  function openRow(row: FeedRow) {
    if (row.unread) markKeysRead([row.seenKey]);
    setOpenId((current) => (current === row.key ? null : row.key));
  }

  function markAll() {
    const extra = (alertsQ.data || []).map((alert) => alertSeenKey(alert.id));
    markNotificationsRead(dueQ.data?.items || [], extra);
    setOpenId(null);
  }

  return (
    <Page>
      <Shell>
        <Head>
          <PageTitle>Notifications</PageTitle>
          <MarkAll type="button" disabled={feedUnread === 0} onClick={markAll}>
            Mark all as read
          </MarkAll>
        </Head>

        {dueQ.isError ? (
          <ErrorBanner>
            {getErrorMessage(dueQ.error, 'Could not load notifications.')}
          </ErrorBanner>
        ) : null}

        <Tabs>
          <Tab type="button" $active={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </Tab>
          <Tab
            type="button"
            $active={filter === 'unread'}
            onClick={() => setFilter('unread')}
          >
            Unread{feedUnread ? ` · ${feedUnread}` : ''}
          </Tab>
        </Tabs>

        <Feed>
          {loading ? (
            <SkeletonFeed>
              {[0, 1, 2, 3].map((i) => (
                <SkelRow key={i}>
                  <span style={{ width: 48, height: 48, borderRadius: '50%' }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ height: 12, width: '80%', marginBottom: 8 }} />
                    <span style={{ height: 10, width: '40%' }} />
                  </div>
                </SkelRow>
              ))}
            </SkeletonFeed>
          ) : null}

          {!loading && !visible.length ? (
            <EmptyState>
              <Bell size={28} strokeWidth={1.7} />
              <strong>
                {filter === 'unread' ? "You're all caught up" : 'No notifications yet'}
              </strong>
              <p>
                {filter === 'unread'
                  ? 'Credit due today, tomorrow, and overdue will show here until you read them.'
                  : 'Credit sales with a pay-by date land here, along with chase alerts.'}
              </p>
            </EmptyState>
          ) : null}

          {!loading && newRows.length ? (
            <>
              <SectionLabel>New</SectionLabel>
              {newRows.map((row) => (
                <NotificationRow
                  key={row.key}
                  row={row}
                  open={openId === row.key}
                  timeZone={timeZone}
                  onOpen={() => openRow(row)}
                />
              ))}
            </>
          ) : null}

          {!loading && earlierRows.length ? (
            <>
              <SectionLabel>Earlier</SectionLabel>
              {earlierRows.map((row) => (
                <NotificationRow
                  key={row.key}
                  row={row}
                  open={openId === row.key}
                  timeZone={timeZone}
                  onOpen={() => openRow(row)}
                />
              ))}
            </>
          ) : null}
        </Feed>
      </Shell>
    </Page>
  );
}

function NotificationRow({
  row,
  open,
  timeZone,
  onOpen,
}: {
  row: FeedRow;
  open: boolean;
  timeZone: string;
  onOpen: () => void;
}) {
  if (row.kind === 'alert' && row.alert) {
    return (
      <div>
        <RowBtn type="button" $unread={row.unread} onClick={onOpen}>
          <Avatar $tone="muted">
            <Bell size={22} strokeWidth={1.8} />
            <BadgeIcon $tone="muted">
              <Bell size={11} strokeWidth={2.4} />
            </BadgeIcon>
          </Avatar>
          <Body>
            <Copy>{row.alert.summary}</Copy>
            <Meta $unread={row.unread}>
              {formatShopDateTime(row.alert.createdAt, timeZone)}
            </Meta>
          </Body>
          {row.unread ? <Dot /> : null}
        </RowBtn>
      </div>
    );
  }

  const item = row.chase;
  if (!item) return null;
  const tone = chaseTone(item.status);
  const Icon =
    item.status === 'overdue'
      ? AlertTriangle
      : item.status === 'upcoming'
        ? CalendarClock
        : Clock;

  return (
    <div>
      <RowBtn type="button" $unread={row.unread} onClick={onOpen}>
        <Avatar $tone={tone}>
          {initials(item.customerName)}
          <BadgeIcon $tone={tone}>
            <Icon size={11} strokeWidth={2.4} />
          </BadgeIcon>
        </Avatar>
        <Body>
          <Copy>{chaseCopy(item)}</Copy>
          <Meta $unread={row.unread}>{chaseWhen(item, timeZone)}</Meta>
        </Body>
        {row.unread ? <Dot /> : null}
      </RowBtn>
      {open ? (
        <Expand>
          <PayTowardBalance
            key={`${item.id}-${item.customerBalance}`}
            item={item}
          />
        </Expand>
      ) : null}
    </div>
  );
}
