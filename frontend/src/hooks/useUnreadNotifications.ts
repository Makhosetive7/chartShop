import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listOrderAlerts } from '@/api/ops';
import { listStockAlerts } from '@/api/products';
import { listCreditDue, listLaybyeAlerts, type CreditDueItem } from '@/api/sales';
import { useAuth } from '@/auth';
import {
  addSeenKeys,
  countUnreadNotifications,
  laybyeSeenKey,
  markNotificationsSeen,
  orderSeenKey,
  pruneSeenKeys,
  readSeenKeys,
  stockSeenKey,
  type PrefixedSeen,
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

  const orderQ = useQuery({
    queryKey: ['order-alerts'],
    queryFn: listOrderAlerts,
    enabled: Boolean(shopId),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 60_000,
  });

  const laybyeQ = useQuery({
    queryKey: ['laybye-alerts'],
    queryFn: listLaybyeAlerts,
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

  const prefixedItems = useMemo<PrefixedSeen[]>(
    () => [
      ...(stockQ.data || []).map((item) => ({ seenKey: stockSeenKey(item) })),
      ...(orderQ.data || []).map((item) => ({ seenKey: orderSeenKey(item) })),
      ...(laybyeQ.data || []).map((item) => ({ seenKey: laybyeSeenKey(item) })),
    ],
    [laybyeQ.data, orderQ.data, stockQ.data],
  );

  const persistSeen = useCallback(
    (next: Set<string>) => {
      queryClient.setQueryData(['credit-due-seen', shopId], [...next]);
    },
    [queryClient, shopId],
  );

  const loading =
    dueQ.isLoading || stockQ.isLoading || orderQ.isLoading || laybyeQ.isLoading;
  const errored =
    dueQ.isError || stockQ.isError || orderQ.isError || laybyeQ.isError;

  useEffect(() => {
    if (!shopId || loading || errored) return;
    persistSeen(
      pruneSeenKeys(shopId, dueQ.data?.items || [], prefixedItems),
    );
  }, [
    shopId,
    loading,
    errored,
    dueQ.data?.items,
    prefixedItems,
    persistSeen,
  ]);

  const unreadCount = useMemo(
    () =>
      countUnreadNotifications(
        dueQ.data?.items || [],
        seenKeys,
        prefixedItems,
      ),
    [dueQ.data?.items, prefixedItems, seenKeys],
  );

  const markNotificationsRead = useCallback(
    (items: CreditDueItem[], extraKeys: string[] = []) => {
      if (!shopId) return;
      persistSeen(
        markNotificationsSeen(shopId, items, extraKeys, prefixedItems),
      );
    },
    [persistSeen, prefixedItems, shopId],
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
    orderQuery: orderQ,
    laybyeQuery: laybyeQ,
  };
}
