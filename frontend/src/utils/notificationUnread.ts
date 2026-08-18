import type { StockAlertItem } from '@/api/products';
import type { CreditDueItem } from '@/api/sales';

const ACTIONABLE = new Set(['overdue', 'due', 'tomorrow']);
const PREFIXED = ['stock:', 'order:', 'laybye:'] as const;

export type PrefixedSeen = { seenKey: string };

export function notificationSeenKey(item: Pick<CreditDueItem, 'id' | 'status'>) {
  return `${item.id}:${item.status}`;
}

export function stockSeenKey(item: Pick<StockAlertItem, 'id' | 'status'>) {
  return `stock:${item.id}:${item.status}`;
}

export function orderSeenKey(item: Pick<{ id: string; status: string }, 'id' | 'status'>) {
  return `order:${item.id}:${item.status}`;
}

export function laybyeSeenKey(item: Pick<{ id: string; status: string }, 'id' | 'status'>) {
  return `laybye:${item.id}:${item.status}`;
}

export function alertSeenKey(id: string) {
  return `alert:${id}`;
}

export function isActionableNotification(status: string) {
  return ACTIONABLE.has(status);
}

function storageKey(shopId: string) {
  return `chartshop_notif_seen_${shopId}`;
}

function sameSet(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

function isPrefixedKey(key: string) {
  return PREFIXED.some((prefix) => key.startsWith(prefix));
}

export function readSeenKeys(shopId: string): Set<string> {
  if (!shopId || typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(storageKey(shopId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value) => typeof value === 'string'));
  } catch {
    return new Set();
  }
}

export function writeSeenKeys(shopId: string, keys: Iterable<string>) {
  if (!shopId || typeof localStorage === 'undefined') return;
  localStorage.setItem(storageKey(shopId), JSON.stringify([...keys]));
}

export function isChaseUnread(
  item: Pick<CreditDueItem, 'id' | 'status'>,
  seen: Set<string>,
) {
  return (
    isActionableNotification(item.status) &&
    !seen.has(notificationSeenKey(item))
  );
}

export function isPrefixedUnread(item: PrefixedSeen, seen: Set<string>) {
  return !seen.has(item.seenKey);
}

export function isStockUnread(
  item: Pick<StockAlertItem, 'id' | 'status'>,
  seen: Set<string>,
) {
  return isPrefixedUnread({ seenKey: stockSeenKey(item) }, seen);
}

export function addSeenKeys(shopId: string, keys: string[]) {
  const next = readSeenKeys(shopId);
  for (const key of keys) next.add(key);
  writeSeenKeys(shopId, next);
  return next;
}

export function countUnreadNotifications(
  items: Pick<CreditDueItem, 'id' | 'status'>[],
  seen: Set<string>,
  prefixedItems: PrefixedSeen[] = [],
) {
  return (
    items.filter((item) => isChaseUnread(item, seen)).length +
    prefixedItems.filter((item) => isPrefixedUnread(item, seen)).length
  );
}

/** Keep seen keys that still match a live credit/prefixed row (plus alert events). */
export function liveSeenKeys(
  stored: Set<string>,
  creditItems: Pick<CreditDueItem, 'id' | 'status'>[],
  prefixedItems: PrefixedSeen[] = [],
) {
  const liveCreditIds = new Set(creditItems.map((item) => item.id));
  const livePrefixed = new Set(prefixedItems.map((item) => item.seenKey));
  const next = new Set<string>();
  for (const key of stored) {
    if (key.startsWith('alert:')) {
      next.add(key);
      continue;
    }
    if (isPrefixedKey(key)) {
      if (livePrefixed.has(key)) next.add(key);
      continue;
    }
    const id = key.split(':')[0];
    if (liveCreditIds.has(id)) next.add(key);
  }
  return next;
}

/** Drop seen keys for rows that left the live lists (e.g. restocked). */
export function pruneSeenKeys(
  shopId: string,
  creditItems: Pick<CreditDueItem, 'id' | 'status'>[],
  prefixedItems: PrefixedSeen[] = [],
) {
  const prev = readSeenKeys(shopId);
  const next = liveSeenKeys(prev, creditItems, prefixedItems);
  if (sameSet(prev, next)) return prev;
  writeSeenKeys(shopId, next);
  return next;
}

/** Merge current items as seen; drop keys for rows that are no longer listed. */
export function markNotificationsSeen(
  shopId: string,
  items: Pick<CreditDueItem, 'id' | 'status'>[],
  extraKeys: string[] = [],
  prefixedItems: PrefixedSeen[] = [],
) {
  const next = liveSeenKeys(readSeenKeys(shopId), items, prefixedItems);
  for (const item of items) {
    next.add(notificationSeenKey(item));
  }
  for (const item of prefixedItems) {
    next.add(item.seenKey);
  }
  for (const key of extraKeys) next.add(key);
  writeSeenKeys(shopId, next);
  return next;
}
