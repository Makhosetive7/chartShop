import { describe, expect, it, beforeEach } from 'vitest';
import {
  countUnreadNotifications,
  markNotificationsSeen,
  notificationSeenKey,
  pruneSeenKeys,
  readSeenKeys,
  stockSeenKey,
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

  it('counts low and out-of-stock rows until they are read', () => {
    const stock = [
      { id: 'milk:2l', status: 'out' as const },
      { id: 'bread:white', status: 'low' as const },
    ];
    expect(countUnreadNotifications([], new Set(), stock)).toBe(2);
    expect(
      countUnreadNotifications(
        [],
        new Set([stockSeenKey(stock[0])]),
        stock,
      ),
    ).toBe(1);
  });

  it('re-alerts stock after it leaves the list and comes back low', () => {
    const low = { id: 'milk:2l', status: 'low' as const };
    markNotificationsSeen('shop-1', [], [], [low]);
    expect(readSeenKeys('shop-1').has(stockSeenKey(low))).toBe(true);

    pruneSeenKeys('shop-1', [], []);
    expect(readSeenKeys('shop-1').has(stockSeenKey(low))).toBe(false);
    expect(
      countUnreadNotifications([], readSeenKeys('shop-1'), [low]),
    ).toBe(1);
  });
});
