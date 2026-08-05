import { useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Shop } from '@/api/client';
import {
  enterDemo as enterDemoRequest,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  type RegisterInput,
} from '@/api/auth';
import { AuthContext } from './auth-context';

function readStoredShop(): Shop | null {
  try {
    const raw = localStorage.getItem('chartshop_shop');
    return raw ? (JSON.parse(raw) as Shop) : null;
  } catch {
    return null;
  }
}

function persistSession(token: string, shop: Shop) {
  localStorage.setItem('chartshop_token', token);
  localStorage.setItem('chartshop_shop', JSON.stringify(shop));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('chartshop_token'),
  );
  const [shop, setShop] = useState<Shop | null>(() => readStoredShop());

  const login = useCallback(async (username: string, pin: string) => {
    const result = await loginRequest(username, pin);
    if (!result.success || !result.token) {
      throw new Error(result.error || 'Login failed');
    }
    persistSession(result.token, result.shop);
    setToken(result.token);
    setShop(result.shop);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await registerRequest(input);
    if (!result.success || !result.token) {
      throw new Error(result.error || 'Registration failed');
    }
    persistSession(result.token, result.shop);
    setToken(result.token);
    setShop(result.shop);
  }, []);

  const enterDemo = useCallback(async (sector?: string) => {
    const result = await enterDemoRequest(sector);
    if (!result.success || !result.token) {
      throw new Error(result.error || 'Demo is unavailable');
    }
    persistSession(result.token, result.shop);
    setToken(result.token);
    setShop(result.shop);
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setToken(null);
    setShop(null);
  }, []);

  const updateShop = useCallback((patch: Partial<Shop>) => {
    setShop((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem('chartshop_shop', JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      token,
      shop,
      isAuthenticated: Boolean(token),
      isDemo: Boolean(shop?.isDemo),
      login,
      register,
      enterDemo,
      logout,
      updateShop,
    }),
    [token, shop, login, register, enterDemo, logout, updateShop],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
