/**
 * Enhanced Notification Read State Hook
 * 
 * Manages notification read/unread state with server-side sync and localStorage fallback.
 * Provides seamless migration and cross-device synchronization.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth';
import {
  getNotificationReadState,
  migrateLocalStorageReadState,
  updateNotificationReadState,
  type UpdateReadStateRequest
} from '@/api/notifications';
import {
  readSeenKeys,
  writeSeenKeys,
  countUnreadNotifications,
  type PrefixedSeen
} from '@/utils/notificationUnread';
import type { CreditDueItem } from '@/api/sales';

export type NotificationReadStateOptions = {
  enableServerSync?: boolean;
  fallbackToLocalStorage?: boolean;
  autoMigrate?: boolean;
};

const DEFAULT_OPTIONS: NotificationReadStateOptions = {
  enableServerSync: true,
  fallbackToLocalStorage: true,
  autoMigrate: true
};

export function useNotificationReadState(options: NotificationReadStateOptions = {}) {
  const { shop } = useAuth();
  const shopId = shop?.id || '';
  const queryClient = useQueryClient();
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [migrationCompleted, setMigrationCompleted] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);

  // Server-side read state query
  const serverReadStateQ = useQuery({
    queryKey: ['notification-read-state', shopId],
    queryFn: getNotificationReadState,
    enabled: Boolean(shopId) && opts.enableServerSync && !fallbackMode,
    staleTime: 30_000, // 30 second cache
    retry: (failureCount) => {
      // Fall back to localStorage after 2 failed attempts
      if (failureCount >= 2 && opts.fallbackToLocalStorage) {
        console.warn('[notifications] Server sync failed, falling back to localStorage');
        setFallbackMode(true);
        return false;
      }
      return failureCount < 2;
    }
  });

  // localStorage fallback query
  const localStorageReadStateQ = useQuery({
    queryKey: ['notification-read-state-local', shopId],
    queryFn: () => [...readSeenKeys(shopId)],
    enabled: Boolean(shopId) && (fallbackMode || !opts.enableServerSync),
    staleTime: Infinity
  });

  // Current seen keys (server or localStorage)
  const seenKeys = useMemo(() => {
    if (opts.enableServerSync && !fallbackMode && serverReadStateQ.data) {
      return new Set(serverReadStateQ.data.seenKeys);
    }
    return new Set(localStorageReadStateQ.data || []);
  }, [serverReadStateQ.data, localStorageReadStateQ.data, fallbackMode, opts.enableServerSync]);

  // Server update mutation
  const updateServerStateMutation = useMutation({
    mutationFn: updateNotificationReadState,
    onSuccess: (data) => {
      queryClient.setQueryData(['notification-read-state', shopId], data);
    },
    onError: () => {
      console.error('[notifications] Failed to update server read state');
      if (opts.fallbackToLocalStorage) {
        console.warn('[notifications] Falling back to localStorage');
        setFallbackMode(true);
      }
    }
  });

  // Migration mutation
  const migrationMutation = useMutation({
    mutationFn: migrateLocalStorageReadState,
    onSuccess: (data) => {
      queryClient.setQueryData(['notification-read-state', shopId], data);
      setMigrationCompleted(true);
      console.log('[notifications] Successfully migrated localStorage to server');
    },
    onError: () => {
      console.error('[notifications] Migration failed');
      setMigrationCompleted(true); // Don't retry failed migrations
    }
  });

  // Auto-migration on first load
  useEffect(() => {
    if (!opts.autoMigrate || !shopId || migrationCompleted || fallbackMode) return;
    if (!opts.enableServerSync) return;
    if (serverReadStateQ.isLoading || serverReadStateQ.isError) return;

    const localKeys = readSeenKeys(shopId);
    if (localKeys.size === 0) {
      // No localStorage state to migrate
      setMigrationCompleted(true);
      return;
    }

    const serverKeys = serverReadStateQ.data?.seenKeys || [];
    if (serverKeys.length > 0) {
      // Server already has state, no migration needed
      setMigrationCompleted(true);
      return;
    }

    // Migrate localStorage to server
    console.log(`[notifications] Migrating ${localKeys.size} keys from localStorage to server`);
    migrationMutation.mutate({
      localStorageKeys: [...localKeys]
    });
  }, [
    opts.autoMigrate,
    opts.enableServerSync,
    shopId,
    migrationCompleted,
    fallbackMode,
    serverReadStateQ.isLoading,
    serverReadStateQ.isError,
    serverReadStateQ.data,
    migrationMutation
  ]);

  // Persist seen keys (server or localStorage)
  const persistSeenKeys = useCallback(
    (keys: string[], merge = true) => {
      if (opts.enableServerSync && !fallbackMode) {
        // Update server
        const request: UpdateReadStateRequest = {
          seenKeys: keys,
          merge,
          source: 'web'
        };
        updateServerStateMutation.mutate(request);
      } else {
        // Update localStorage
        if (merge) {
          const existing = readSeenKeys(shopId);
          const merged = new Set([...existing, ...keys]);
          writeSeenKeys(shopId, merged);
        } else {
          writeSeenKeys(shopId, keys);
        }
        queryClient.setQueryData(['notification-read-state-local', shopId], keys);
      }
    },
    [opts.enableServerSync, fallbackMode, shopId, updateServerStateMutation, queryClient]
  );

  // Count unread notifications
  const countUnread = useCallback(
    (items: Pick<CreditDueItem, 'id' | 'status'>[], prefixedItems: PrefixedSeen[] = []) => {
      return countUnreadNotifications(items, seenKeys, prefixedItems);
    },
    [seenKeys]
  );

  // Mark notifications as read
  const markNotificationsRead = useCallback(
    (items: CreditDueItem[], extraKeys: string[] = [], prefixedItems: PrefixedSeen[] = []) => {
      if (!shopId) return;
      
      const keysToAdd = [
        ...items.map(item => `${item.id}:${item.status}`),
        ...extraKeys,
        ...prefixedItems.map(item => item.seenKey)
      ];
      
      persistSeenKeys(keysToAdd, true);
    },
    [shopId, persistSeenKeys]
  );

  // Mark individual keys as read
  const markKeysRead = useCallback(
    (keys: string[]) => {
      if (!shopId || !keys.length) return;
      persistSeenKeys(keys, true);
    },
    [shopId, persistSeenKeys]
  );

  // Check if specific key is seen
  const hasSeenKey = useCallback(
    (key: string) => {
      return seenKeys.has(key);
    },
    [seenKeys]
  );

  // Loading state
  const loading = opts.enableServerSync && !fallbackMode 
    ? serverReadStateQ.isLoading 
    : localStorageReadStateQ.isLoading;

  // Error state
  const error = opts.enableServerSync && !fallbackMode 
    ? serverReadStateQ.error 
    : localStorageReadStateQ.error;

  return {
    seenKeys,
    countUnread,
    markNotificationsRead,
    markKeysRead,
    hasSeenKey,
    loading,
    error,
    
    // Server sync status
    serverSyncEnabled: opts.enableServerSync && !fallbackMode,
    fallbackMode,
    migrationCompleted,
    migrationInProgress: migrationMutation.isPending,
    
    // Raw queries for advanced usage
    serverQuery: serverReadStateQ,
    localQuery: localStorageReadStateQ,
    
    // Utilities
    persistSeenKeys,
    forceServerSync: () => {
      if (fallbackMode) {
        setFallbackMode(false);
        queryClient.invalidateQueries({ queryKey: ['notification-read-state', shopId] });
      }
    },
    forceFallback: () => {
      setFallbackMode(true);
    }
  };
}