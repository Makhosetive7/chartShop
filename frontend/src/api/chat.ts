import { api } from './client';

export type ChatBubble = {
  id?: string;
  role: 'user' | 'assistant';
  text: string;
  type?: string;
  channel?: string;
  createdAt?: string;
};

export type ActivityItem = {
  id: string;
  actorId: string;
  actorUsername?: string | null;
  actorDisplayName?: string | null;
  channel: string;
  action: string;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export async function fetchChatHistory() {
  const { data } = await api.get<{
    success: boolean;
    demoFeed?: boolean;
    messages: ChatBubble[];
  }>('/chat/history?limit=120');
  return {
    messages: data.messages || [],
    demoFeed: Boolean(data.demoFeed),
  };
}

export async function sendChatMessage(message: string) {
  const { data } = await api.post<{
    success: boolean;
    message: ChatBubble;
    reply: ChatBubble;
    error?: string;
  }>('/chat', { message });
  return data;
}

export async function fetchActivity(params?: {
  limit?: number;
  channel?: string;
  action?: string;
  mine?: boolean;
  actorId?: string;
}) {
  const search = new URLSearchParams();
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.channel) search.set('channel', params.channel);
  if (params?.action) search.set('action', params.action);
  if (params?.mine) search.set('mine', '1');
  if (params?.actorId) search.set('actorId', params.actorId);
  const qs = search.toString();
  const { data } = await api.get<{ success: boolean; items: ActivityItem[] }>(
    `/activity${qs ? `?${qs}` : ''}`,
  );
  return data.items || [];
}
