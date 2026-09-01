import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  ClipboardList,
  Clock,
  Package,
} from 'lucide-react';
import { fetchActivity, type ActivityItem } from '@/api/chat';
import { type OrderAlertItem } from '@/api/ops';
import { type StockAlertItem } from '@/api/products';
import { type CreditDueItem, type LaybyeAlertItem } from '@/api/sales';
import { getErrorMessage, money } from '@/api/types';
import { Page, PageTitle, Tabs, Tab, ErrorBanner } from '@/components/ui/primitives';
import { useShopTimezone } from '@/hooks/useShopTimezone';
import { formatShopDate, formatShopDateTime } from '@/utils/dates';
import { formatSaleItemLabel } from '@/utils/productCatalog';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import {
  alertSeenKey,
  isChaseUnread,
  isPrefixedUnread,
  laybyeSeenKey,
  notificationSeenKey,
  orderSeenKey,
  stockSeenKey,
} from '@/utils/notificationUnread';

type Filter = 'all' | 'unread';

type FeedRow = {
  key: string;
  seenKey: string;
  unread: boolean;
  sort: number;
  kind: 'chase' | 'alert' | 'stock' | 'order' | 'laybye';
  chase?: CreditDueItem;
  alert?: ActivityItem;
  stock?: StockAlertItem;
  order?: OrderAlertItem;
  laybye?: LaybyeAlertItem;
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
  cursor: ${({ $unread }) => ($unread ? 'pointer' : 'default')};
  font: inherit;
  color: inherit;

  &:hover {
    background: ${({ theme, $unread }) =>
      $unread ? theme.colors.peachSoft : theme.colors.surface};
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

function stockLabel(item: StockAlertItem) {
  if (item.variantLabel) return `${item.productName} · ${item.variantLabel}`;
  return item.productName;
}

function stockCopy(item: StockAlertItem) {
  const name = stockLabel(item);
  if (item.status === 'out') {
    return (
      <>
        <strong>{name}</strong> is out of stock. Alert is {item.lowStockThreshold}{' '}
        unit{item.lowStockThreshold === 1 ? '' : 's'}.
      </>
    );
  }
  return (
    <>
      <strong>{name}</strong> is down to {item.stock} unit
      {item.stock === 1 ? '' : 's'} (alert at {item.lowStockThreshold}).
    </>
  );
}

function stockWhen(item: StockAlertItem) {
  if (item.status === 'out') return 'Out of stock';
  return `${item.stock} left · alert at ${item.lowStockThreshold}`;
}

function stockSort(item: StockAlertItem) {
  if (item.status === 'out') return 950;
  return 450 - item.stock;
}

function goodsLabel(
  items: Array<{
    productName?: string;
    quantity?: number;
    variantLabel?: string;
    packLabel?: string;
  }>,
  fallback: string,
) {
  const preview = (items || [])
    .slice(0, 2)
    .map((line) => formatSaleItemLabel(line))
    .filter(Boolean)
    .join(', ');
  if (!preview) return fallback;
  if ((items || []).length > 2) return `${preview} +${items.length - 2}`;
  return preview;
}

function orderKind(type: string) {
  if (type === 'delivery') return 'delivery';
  if (type === 'reservation') return 'reservation';
  return 'pickup';
}

function orderCopy(item: OrderAlertItem) {
  const kind = orderKind(item.orderType);
  const goods = goodsLabel(item.items, kind);
  if (item.status === 'overdue') {
    return (
      <>
        <strong>{item.customerName}</strong> still has a {kind} for {goods}. It is{' '}
        {item.daysOverdue} day{item.daysOverdue === 1 ? '' : 's'} late.
      </>
    );
  }
  if (item.status === 'due') {
    return (
      <>
        <strong>{item.customerName}</strong> has a {kind} for {goods} due today.
      </>
    );
  }
  if (item.status === 'tomorrow') {
    return (
      <>
        <strong>{item.customerName}</strong> has a {kind} for {goods} tomorrow.
      </>
    );
  }
  return (
    <>
      <strong>{item.customerName}</strong>&apos;s {kind} for {goods} is still{' '}
      {item.orderStatus} · {item.daysOpen} day{item.daysOpen === 1 ? '' : 's'}.
    </>
  );
}

function orderWhen(item: OrderAlertItem, timeZone: string) {
  if (item.status === 'overdue') {
    return item.pickupDate
      ? `${item.daysOverdue}d late · ${formatShopDate(item.pickupDate, timeZone)}`
      : `${item.daysOverdue}d late`;
  }
  if (item.status === 'due') return 'Due today';
  if (item.status === 'tomorrow') return 'Tomorrow';
  return `${item.daysOpen}d open`;
}

function orderSort(item: OrderAlertItem) {
  if (item.status === 'overdue') return 920 + item.daysOverdue;
  if (item.status === 'due') return 480;
  if (item.status === 'tomorrow') return 380;
  return 350 + item.daysOpen;
}

function laybyeCopy(item: LaybyeAlertItem) {
  const goods = goodsLabel(item.items, 'a laybye');
  if (item.status === 'overdue') {
    return (
      <>
        <strong>{item.customerName}</strong> still owes {money(item.balanceDue)} on{' '}
        {goods}. Payment is {item.daysOverdue} day
        {item.daysOverdue === 1 ? '' : 's'} late.
      </>
    );
  }
  if (item.status === 'due') {
    return (
      <>
        <strong>{item.customerName}</strong> owes {money(item.balanceDue)} on {goods}.
        Payment is due today.
      </>
    );
  }
  if (item.status === 'tomorrow') {
    return (
      <>
        <strong>{item.customerName}</strong> owes {money(item.balanceDue)} on {goods}.
        Payment is due tomorrow.
      </>
    );
  }
  return (
    <>
      <strong>{item.customerName}</strong>&apos;s laybye for {goods} has had no
      payment in {item.daysQuiet} day{item.daysQuiet === 1 ? '' : 's'} ·{' '}
      {money(item.balanceDue)} left.
    </>
  );
}

function laybyeWhen(item: LaybyeAlertItem, timeZone: string) {
  if (item.status === 'overdue' && item.dueDate) {
    return `${item.daysOverdue}d late · pay by ${formatShopDate(item.dueDate, timeZone)}`;
  }
  if (item.status === 'due') return 'Due today';
  if (item.status === 'tomorrow') return 'Tomorrow';
  return `${item.daysQuiet}d quiet`;
}

function laybyeSort(item: LaybyeAlertItem) {
  if (item.status === 'overdue') return 910 + item.daysOverdue;
  if (item.status === 'due') return 440;
  if (item.status === 'tomorrow') return 390;
  return 340 + item.daysQuiet;
}

function laybyeTone(status: LaybyeAlertItem['status']) {
  if (status === 'overdue') return 'danger' as const;
  if (status === 'due' || status === 'quiet') return 'warning' as const;
  return 'info' as const;
}

function orderTone(status: OrderAlertItem['status']) {
  if (status === 'overdue') return 'danger' as const;
  if (status === 'due' || status === 'stale') return 'warning' as const;
  return 'info' as const;
}

export function NotificationsPage() {
  const timeZone = useShopTimezone();
  const [filter, setFilter] = useState<Filter>('all');
  const {
    dueQuery: dueQ,
    stockQuery: stockQ,
    orderQuery: orderQ,
    laybyeQuery: laybyeQ,
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
    for (const item of stockQ.data || []) {
      const seenKey = stockSeenKey(item);
      const unread = isPrefixedUnread({ seenKey }, seenKeys);
      rows.push({
        key: `stock-${item.id}`,
        seenKey,
        unread,
        sort: stockSort(item) + (unread ? 10_000 : 0),
        kind: 'stock',
        stock: item,
      });
    }
    for (const item of orderQ.data || []) {
      const seenKey = orderSeenKey(item);
      const unread = isPrefixedUnread({ seenKey }, seenKeys);
      rows.push({
        key: `order-${item.id}`,
        seenKey,
        unread,
        sort: orderSort(item) + (unread ? 10_000 : 0),
        kind: 'order',
        order: item,
      });
    }
    for (const item of laybyeQ.data || []) {
      const seenKey = laybyeSeenKey(item);
      const unread = isPrefixedUnread({ seenKey }, seenKeys);
      rows.push({
        key: `laybye-${item.id}`,
        seenKey,
        unread,
        sort: laybyeSort(item) + (unread ? 10_000 : 0),
        kind: 'laybye',
        laybye: item,
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
  }, [
    alertsQ.data,
    dueQ.data?.items,
    laybyeQ.data,
    orderQ.data,
    seenKeys,
    stockQ.data,
  ]);

  const visible = filter === 'unread' ? feed.filter((row) => row.unread) : feed;
  const newRows = visible.filter((row) => row.unread);
  const earlierRows = visible.filter((row) => !row.unread);
  const loading =
    dueQ.isLoading ||
    stockQ.isLoading ||
    orderQ.isLoading ||
    laybyeQ.isLoading ||
    alertsQ.isLoading;
  const feedUnread = feed.filter((row) => row.unread).length;

  function markRowRead(row: FeedRow) {
    if (!row.unread) return;
    markKeysRead([row.seenKey]);
  }

  function markAll() {
    const extra = (alertsQ.data || []).map((alert) => alertSeenKey(alert.id));
    markNotificationsRead(dueQ.data?.items || [], extra);
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

        {dueQ.isError || stockQ.isError || orderQ.isError || laybyeQ.isError ? (
          <ErrorBanner>
            {getErrorMessage(
              dueQ.error || stockQ.error || orderQ.error || laybyeQ.error,
              'Could not load notifications.',
            )}
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
                  ? 'Credit, stock, orders, and laybyes stay here until you read them.'
                  : 'Credit due, low stock, waiting orders, and quiet laybyes land here.'}
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
                  timeZone={timeZone}
                  onMarkRead={() => markRowRead(row)}
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
                  timeZone={timeZone}
                  onMarkRead={() => markRowRead(row)}
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
  timeZone,
  onMarkRead,
}: {
  row: FeedRow;
  timeZone: string;
  onMarkRead: () => void;
}) {
  if (row.kind === 'alert' && row.alert) {
    return (
      <RowBtn
        type="button"
        $unread={row.unread}
        disabled={!row.unread}
        onClick={onMarkRead}
      >
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
    );
  }

  if (row.kind === 'stock' && row.stock) {
    const item = row.stock;
    const tone = item.status === 'out' ? 'danger' : 'warning';
    return (
      <RowBtn
        type="button"
        $unread={row.unread}
        disabled={!row.unread}
        onClick={onMarkRead}
      >
        <Avatar $tone={tone}>
          {initials(item.productName)}
          <BadgeIcon $tone={tone}>
            <Package size={11} strokeWidth={2.4} />
          </BadgeIcon>
        </Avatar>
        <Body>
          <Copy>{stockCopy(item)}</Copy>
          <Meta $unread={row.unread}>{stockWhen(item)}</Meta>
        </Body>
        {row.unread ? <Dot /> : null}
      </RowBtn>
    );
  }

  if (row.kind === 'order' && row.order) {
    const item = row.order;
    const tone = orderTone(item.status);
    return (
      <RowBtn
        type="button"
        $unread={row.unread}
        disabled={!row.unread}
        onClick={onMarkRead}
      >
        <Avatar $tone={tone}>
          {initials(item.customerName)}
          <BadgeIcon $tone={tone}>
            <ClipboardList size={11} strokeWidth={2.4} />
          </BadgeIcon>
        </Avatar>
        <Body>
          <Copy>{orderCopy(item)}</Copy>
          <Meta $unread={row.unread}>{orderWhen(item, timeZone)}</Meta>
        </Body>
        {row.unread ? <Dot /> : null}
      </RowBtn>
    );
  }

  if (row.kind === 'laybye' && row.laybye) {
    const item = row.laybye;
    const tone = laybyeTone(item.status);
    return (
      <RowBtn
        type="button"
        $unread={row.unread}
        disabled={!row.unread}
        onClick={onMarkRead}
      >
        <Avatar $tone={tone}>
          {initials(item.customerName)}
          <BadgeIcon $tone={tone}>
            <CalendarClock size={11} strokeWidth={2.4} />
          </BadgeIcon>
        </Avatar>
        <Body>
          <Copy>{laybyeCopy(item)}</Copy>
          <Meta $unread={row.unread}>{laybyeWhen(item, timeZone)}</Meta>
        </Body>
        {row.unread ? <Dot /> : null}
      </RowBtn>
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
    <RowBtn
      type="button"
      $unread={row.unread}
      disabled={!row.unread}
      onClick={onMarkRead}
    >
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
  );
}
