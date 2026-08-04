import axios from 'axios';
import { api, type LoginResponse, type Shop } from './client';

export async function login(userId: string, pin: string): Promise<LoginResponse> {
  try {
    const { data } = await api.post<LoginResponse>('/auth/login', { userId, pin });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { error?: string } | undefined)?.error ||
        'Login failed';
      return { success: false, token: '', shop: null as unknown as Shop, error: message };
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    localStorage.removeItem('chartshop_token');
    localStorage.removeItem('chartshop_shop');
  }
}

export async function fetchMe(): Promise<Shop> {
  const { data } = await api.get<{ success: boolean; shop: Shop }>('/auth/me');
  return data.shop;
}

export type { StatsOverview } from './stats';
