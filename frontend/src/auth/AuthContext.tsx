import { useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Shop } from '@/api/client';
import { login as loginRequest, logout as logoutRequest } from '@/api/auth';
import { AuthContext } from './auth-context';

function readStoredShop(): Shop | null {
  try {
    const raw = localStorage.getItem('chartshop_shop');
    return raw ? (JSON.parse(raw) as Shop) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('chartshop_token'),
  );
  const [shop, setShop] = useState<Shop | null>(() => readStoredShop());

  const login = useCallback(async (userId: string, pin: string) => {
    const result = await loginRequest(userId, pin);
    if (!result.success || !result.token) {
      throw new Error(result.error || 'Login failed');
    }
    localStorage.setItem('chartshop_token', result.token);
    localStorage.setItem('chartshop_shop', JSON.stringify(result.shop));
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
      login,
      logout,
      updateShop,
    }),
    [token, shop, login, logout, updateShop],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
