import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listStockAlerts, type StockAlertItem } from '@/api/products';
import { listCreditDue, type CreditDueItem } from '@/api/sales';
import { useAuth } from '@/auth';
import {
  addSeenKeys,
  countUnreadNotifications,
  markNotificationsSeen,
  pruneSeenKeys,
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

  const stockQ = useQuery({
    queryKey: ['stock-alerts'],
    queryFn: listStockAlerts,
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

  const persistSeen = useCallback(
    (next: Set<string>) => {
      queryClient.setQueryData(['credit-due-seen', shopId], [...next]);
    },
    [queryClient, shopId],
  );

  useEffect(() => {
    if (!shopId || dueQ.isLoading || stockQ.isLoading) return;
    if (dueQ.isError || stockQ.isError) return;
    persistSeen(
      pruneSeenKeys(shopId, dueQ.data?.items || [], stockQ.data || []),
    );
  }, [
    shopId,
    dueQ.isLoading,
    dueQ.isError,
    dueQ.data?.items,
    stockQ.isLoading,
    stockQ.isError,
    stockQ.data,
    persistSeen,
  ]);

  const unreadCount = useMemo(
    () =>
      countUnreadNotifications(
        dueQ.data?.items || [],
        seenKeys,
        stockQ.data || [],
      ),
    [dueQ.data?.items, seenKeys, stockQ.data],
  );

  const markNotificationsRead = useCallback(
    (
      items: CreditDueItem[],
      extraKeys: string[] = [],
      stockItems: StockAlertItem[] = [],
    ) => {
      if (!shopId) return;
      persistSeen(markNotificationsSeen(shopId, items, extraKeys, stockItems));
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
    stockQuery: stockQ,
  };
}
