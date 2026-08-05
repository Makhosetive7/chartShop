import axios from 'axios';
import { api, type LoginResponse, type Shop } from './client';

export async function login(
  username: string,
  pin: string,
): Promise<LoginResponse> {
  try {
    const { data } = await api.post<LoginResponse>('/auth/login', {
      username,
      pin,
    });
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

export async function enterDemo(sector?: string): Promise<LoginResponse> {
  try {
    const { data } = await api.post<LoginResponse>('/auth/demo', {
      sector: sector || undefined,
    });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { error?: string } | undefined)?.error ||
        'Demo is unavailable';
      return { success: false, token: '', shop: null as unknown as Shop, error: message };
    }
    throw error;
  }
}

export type DemoSector = {
  id: string;
  label: string;
  blurb: string;
  businessName: string;
  username: string;
  available: boolean;
};

export async function listDemos(): Promise<DemoSector[]> {
  const { data } = await api.get<{ success: boolean; demos: DemoSector[] }>(
    '/auth/demos',
  );
  return data.demos || [];
}

export type RegisterInput = {
  username: string;
  businessName: string;
  pin: string;
  businessDescription?: string;
};

export async function register(input: RegisterInput): Promise<LoginResponse> {
  try {
    const { data } = await api.post<LoginResponse>('/auth/register', input);
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { error?: string } | undefined)?.error ||
        'Registration failed';
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
