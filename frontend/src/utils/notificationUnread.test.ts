import { describe, expect, it, beforeEach } from 'vitest';
import {
  countUnreadNotifications,
  markNotificationsSeen,
  notificationSeenKey,
  readSeenKeys,
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
});
