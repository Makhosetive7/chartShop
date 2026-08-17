import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listCreditDue, type CreditDueItem } from '@/api/sales';
import { useAuth } from '@/auth';
import {
  addSeenKeys,
  countUnreadNotifications,
  markNotificationsSeen,
  readSeenKeys,
} from '@/utils/notificationUnread';

export function useUnreadNotifications() {
  const { shop } = useAuth();
  const shopId = shop?.id || '';
  const queryClient = useQueryClient();

  const dueQ = useQuery({
    queryKey: ['credit-due'],
    queryFn: listCreditDue,
    enabled: Boolean(shopId),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 60_000,
  });

  const seenQ = useQuery({
    queryKey: ['credit-due-seen', shopId],
    queryFn: () => [...readSeenKeys(shopId)],
    enabled: Boolean(shopId),
    staleTime: Infinity,
  });

  const seenKeys = useMemo(() => new Set(seenQ.data || []), [seenQ.data]);

  const unreadCount = useMemo(
    () => countUnreadNotifications(dueQ.data?.items || [], seenKeys),
    [dueQ.data?.items, seenKeys],
  );

  const persistSeen = useCallback(
    (next: Set<string>) => {
      queryClient.setQueryData(['credit-due-seen', shopId], [...next]);
    },
    [queryClient, shopId],
  );

  const markNotificationsRead = useCallback(
    (items: CreditDueItem[], extraKeys: string[] = []) => {
      if (!shopId) return;
      persistSeen(markNotificationsSeen(shopId, items, extraKeys));
    },
    [persistSeen, shopId],
  );

  const markKeysRead = useCallback(
    (keys: string[]) => {
      if (!shopId || !keys.length) return;
      persistSeen(addSeenKeys(shopId, keys));
    },
    [persistSeen, shopId],
  );

  return {
    unreadCount,
    seenKeys,
    markNotificationsRead,
    markKeysRead,
    dueQuery: dueQ,
  };
}
