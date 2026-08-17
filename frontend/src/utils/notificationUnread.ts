import type { CreditDueItem } from '@/api/sales';

const ACTIONABLE = new Set(['overdue', 'due', 'tomorrow']);

export function notificationSeenKey(item: Pick<CreditDueItem, 'id' | 'status'>) {
  return `${item.id}:${item.status}`;
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

export function addSeenKeys(shopId: string, keys: string[]) {
  const next = readSeenKeys(shopId);
  for (const key of keys) next.add(key);
  writeSeenKeys(shopId, next);
  return next;
}

export function countUnreadNotifications(
  items: Pick<CreditDueItem, 'id' | 'status'>[],
  seen: Set<string>,
) {
  return items.filter((item) => isChaseUnread(item, seen)).length;
}

/** Merge current items as seen; drop keys for sales that are no longer listed. */
export function markNotificationsSeen(
  shopId: string,
  items: Pick<CreditDueItem, 'id' | 'status'>[],
  extraKeys: string[] = [],
) {
  const liveIds = new Set(items.map((item) => item.id));
  const next = new Set<string>();
  for (const key of readSeenKeys(shopId)) {
    if (key.startsWith('alert:')) {
      next.add(key);
      continue;
    }
    const id = key.split(':')[0];
    if (liveIds.has(id)) next.add(key);
  }
  for (const item of items) {
    next.add(notificationSeenKey(item));
  }
  for (const key of extraKeys) next.add(key);
  writeSeenKeys(shopId, next);
  return next;
}
