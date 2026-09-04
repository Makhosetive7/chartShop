/**
 * Notification API Client
 * 
 * Handles server-side notification read state for cross-device sync.
 * Replaces localStorage-based tracking with persistent server state.
 */

import { api } from './client';

export type NotificationReadState = {
  seenKeys: string[];
  lastUpdated: string | null;
  count: number;
};

export type UpdateReadStateRequest = {
  seenKeys: string[];
  merge?: boolean;
  source?: 'web' | 'mobile' | 'migration';
};

export type MigrateLocalStorageRequest = {
  localStorageKeys: string[];
};

export type ReadStateStats = {
  totalUsers: number;
  totalKeys: number;
  avgKeysPerUser: number;
  lastUpdated: string | null;
  oldestUpdated: string | null;
};

/**
 * Get current user's notification read state from server
 */
export async function getNotificationReadState(): Promise<NotificationReadState> {
  const { data } = await api.get<{
    success: boolean;
    seenKeys: string[];
    lastUpdated: string | null;
    count: number;
  }>('/notifications/read-state');
  
  return {
    seenKeys: data.seenKeys || [],
    lastUpdated: data.lastUpdated,
    count: data.count || 0
  };
}

/**
 * Update user's notification read state on server
 */
export async function updateNotificationReadState(
  request: UpdateReadStateRequest
): Promise<NotificationReadState> {
  const { data } = await api.post<{
    success: boolean;
    seenKeys: string[];
    count: number;
    merged: boolean;
    added: number | null;
  }>('/notifications/read-state', request);
  
  return {
    seenKeys: data.seenKeys || [],
    lastUpdated: new Date().toISOString(),
    count: data.count || 0
  };
}

/**
 * Add new seen keys to existing read state (always merges)
 */
export async function addSeenNotificationKeys(keys: string[]): Promise<NotificationReadState> {
  const { data } = await api.post<{
    success: boolean;
    seenKeys: string[];
    count: number;
    added: number;
  }>('/notifications/read-state/add', { keys });
  
  return {
    seenKeys: data.seenKeys || [],
    lastUpdated: new Date().toISOString(),
    count: data.count || 0
  };
}

/**
 * One-time migration from localStorage to server-side read state
 */
export async function migrateLocalStorageReadState(
  request: MigrateLocalStorageRequest
): Promise<NotificationReadState> {
  const { data } = await api.post<{
    success: boolean;
    seenKeys: string[];
    count: number;
    migrated: number;
    message: string;
  }>('/notifications/read-state/migrate', request);
  
  return {
    seenKeys: data.seenKeys || [],
    lastUpdated: new Date().toISOString(),
    count: data.count || 0
  };
}

/**
 * Clear all read state for current user (reset notifications)
 */
export async function clearNotificationReadState(): Promise<void> {
  await api.delete<{
    success: boolean;
    message: string;
  }>('/notifications/read-state');
}

/**
 * Get read state statistics for shop (admin only)
 */
export async function getNotificationReadStateStats(): Promise<ReadStateStats> {
  const { data } = await api.get<{
    success: boolean;
    stats: ReadStateStats;
  }>('/notifications/stats');
  
  return data.stats;
}