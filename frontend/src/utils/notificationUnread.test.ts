import { describe, expect, it, beforeEach } from 'vitest';
import {
  countUnreadNotifications,
  markNotificationsSeen,
  notificationSeenKey,
  pruneSeenKeys,
  readSeenKeys,
  stockSeenKey,
  orderSeenKey,
  laybyeSeenKey,
} from './notificationUnread';

describe('notificationUnread', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('counts actionable items that have not been seen', () => {
    const items = [
      { id: 'a', status: 'overdue' as const },
      { id: 'b', status: 'due' as const },
      { id: 'c', status: 'upcoming' as const },
    ];
    expect(countUnreadNotifications(items, new Set())).toBe(2);
    expect(
      countUnreadNotifications(
        items,
        new Set([notificationSeenKey(items[0])]),
      ),
    ).toBe(1);
  });

  it('marks current items seen and re-alerts when status changes', () => {
    markNotificationsSeen('shop-1', [{ id: 'a', status: 'tomorrow' }]);
    expect(readSeenKeys('shop-1').has('a:tomorrow')).toBe(true);
    expect(
      countUnreadNotifications(
        [{ id: 'a', status: 'due' }],
        readSeenKeys('shop-1'),
      ),
    ).toBe(1);
  });

  it('counts prefixed stock, order, and laybye rows until they are read', () => {
    const prefixed = [
      { seenKey: stockSeenKey({ id: 'milk:2l', status: 'out' }) },
      { seenKey: orderSeenKey({ id: 'ord1', status: 'stale' }) },
      { seenKey: laybyeSeenKey({ id: 'lb1', status: 'quiet' }) },
    ];
    expect(countUnreadNotifications([], new Set(), prefixed)).toBe(3);
    expect(
      countUnreadNotifications(
        [],
        new Set([prefixed[0].seenKey]),
        prefixed,
      ),
    ).toBe(2);
  });

  it('re-alerts prefixed rows after they leave the list and come back', () => {
    const low = { seenKey: stockSeenKey({ id: 'milk:2l', status: 'low' }) };
    markNotificationsSeen('shop-1', [], [], [low]);
    expect(readSeenKeys('shop-1').has(low.seenKey)).toBe(true);

    pruneSeenKeys('shop-1', [], []);
    expect(readSeenKeys('shop-1').has(low.seenKey)).toBe(false);
    expect(
      countUnreadNotifications([], readSeenKeys('shop-1'), [low]),
    ).toBe(1);
  });
});
