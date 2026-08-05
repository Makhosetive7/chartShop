import axios from 'axios';
import { api, type LoginResponse, type Shop } from './client';
import {
  DEMO_PIN,
  DEMO_SECTOR_FALLBACK,
  demoUsernameForSector,
  isKnownDemoUsername,
} from '@/constants/demoSectors';

function markDemoShop(shop: Shop, sector?: string): Shop {
  if (!shop) return shop;
  if (shop.isDemo || isKnownDemoUsername(shop.username)) {
    return {
      ...shop,
      isDemo: true,
      demoSector: shop.demoSector || sector || null,
    };
  }
  return shop;
}

export async function login(
  username: string,
  pin: string,
): Promise<LoginResponse> {
  try {
    const { data } = await api.post<LoginResponse>('/auth/login', {
      username,
      pin,
    });
    if (data.success && data.shop) {
      data.shop = markDemoShop(data.shop);
    }
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
    if (data.success && data.shop) {
      data.shop = markDemoShop(data.shop, sector);
    }
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      // Stale production API (pre demo-shop deploy): fall back to demo login.
      if (status === 404 || status === 405) {
        const username = demoUsernameForSector(sector);
        const viaLogin = await login(username, DEMO_PIN);
        if (viaLogin.success && viaLogin.shop) {
          viaLogin.shop = markDemoShop(viaLogin.shop, sector);
          return viaLogin;
        }
        return {
          success: false,
          token: '',
          shop: null as unknown as Shop,
          error:
            viaLogin.error ||
            'Demo login failed. Redeploy the API with /auth/demo, or run seed:demos.',
        };
      }
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
  try {
    const { data } = await api.get<{ success: boolean; demos: DemoSector[] }>(
      '/auth/demos',
    );
    return data.demos || [];
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      // API not redeployed yet — still show the sector picker.
      return DEMO_SECTOR_FALLBACK.map((s) => ({ ...s, available: true }));
    }
    throw error;
  }
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
      const payload = error.response?.data as
        | { error?: string; suggestions?: string[] }
        | undefined;
      const message = payload?.error || 'Registration failed';
      return {
        success: false,
        token: '',
        shop: null as unknown as Shop,
        error: message,
        suggestions: payload?.suggestions,
      };
    }
    throw error;
  }
}

export type UsernameCheckResult = {
  success: boolean;
  available: boolean;
  valid: boolean;
  username: string;
  message?: string;
  suggestions?: string[];
  error?: string;
};

export async function checkUsername(
  username: string,
): Promise<UsernameCheckResult> {
  try {
    const { data } = await api.get<UsernameCheckResult>('/auth/username', {
      params: { username },
    });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { error?: string } | undefined)?.error ||
        'Could not check username';
      return {
        success: false,
        available: false,
        valid: false,
        username,
        error: message,
      };
    }
    throw error;
  }
}

export type RedeemRecoveryInput = {
  username: string;
  code: string;
  newPin: string;
};

export type RedeemRecoveryResult = {
  success: boolean;
  message?: string;
  remaining?: number;
  mustRegenerate?: boolean;
  error?: string;
};

export async function redeemRecovery(
  input: RedeemRecoveryInput,
): Promise<RedeemRecoveryResult> {
  try {
    const { data } = await api.post<RedeemRecoveryResult>(
      '/auth/recovery/redeem',
      input,
    );
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { error?: string } | undefined)?.error ||
        'Recovery failed';
      return { success: false, error: message };
    }
    throw error;
  }
}

export type RecoveryStatus = {
  success: boolean;
  hasCodes: boolean;
  remaining: number;
  lastIssuedAt?: string | null;
  error?: string;
};

export async function fetchRecoveryStatus(): Promise<RecoveryStatus> {
  const { data } = await api.get<RecoveryStatus>('/auth/recovery');
  return data;
}

export async function regenerateRecoveryCodes(): Promise<{
  success: boolean;
  recoveryCodes?: string[];
  remaining?: number;
  message?: string;
  error?: string;
}> {
  try {
    const { data } = await api.post<{
      success: boolean;
      recoveryCodes?: string[];
      remaining?: number;
      message?: string;
    }>('/auth/recovery/regenerate');
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { error?: string } | undefined)?.error ||
        'Could not regenerate codes';
      return { success: false, error: message };
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
  return markDemoShop(data.shop);
}

export type { StatsOverview } from './stats';
