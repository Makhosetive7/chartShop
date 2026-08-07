import { useMemo, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Shop, User } from '@/api/client';
import {
  enterDemo as enterDemoRequest,
  fetchMe,
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

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('chartshop_user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function persistSession(token: string, shop: Shop, user: User | null) {
  localStorage.setItem('chartshop_token', token);
  localStorage.setItem('chartshop_shop', JSON.stringify(shop));
  if (user) {
    localStorage.setItem('chartshop_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('chartshop_user');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('chartshop_token'),
  );
  const [shop, setShop] = useState<Shop | null>(() => readStoredShop());
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [bootstrapping, setBootstrapping] = useState(() =>
    Boolean(localStorage.getItem('chartshop_token')),
  );

  const applySession = useCallback(
    (nextToken: string, nextShop: Shop, nextUser: User | null = null) => {
      persistSession(nextToken, nextShop, nextUser);
      queryClient.clear();
      setToken(nextToken);
      setShop(nextShop);
      setUser(nextUser);
    },
    [queryClient],
  );

  // Refresh shop + user from the API so role/team state stays current.
  useEffect(() => {
    if (!token) {
      setBootstrapping(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        setShop(me.shop);
        setUser(me.user);
        persistSession(token, me.shop, me.user);
      } catch {
        // 401 interceptor clears storage / redirects; keep local state otherwise.
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(
    async (username: string, pin: string) => {
      const result = await loginRequest(username, pin);
      if (!result.success || !result.token) {
        const err = new Error(result.error || 'Login failed') as Error & {
          code?: string;
        };
        if (result.code) err.code = result.code;
        throw err;
      }
      applySession(result.token, result.shop, result.user || null);
    },
    [applySession],
  );

  const register = useCallback(async (input: RegisterInput) => {
    const result = await registerRequest(input);
    if (!result.success || !result.token) {
      const err = new Error(result.error || 'Registration failed') as Error & {
        suggestions?: string[];
      };
      if (result.suggestions?.length) {
        err.suggestions = result.suggestions;
      }
      throw err;
    }
    return {
      recoveryCodes: result.recoveryCodes || [],
      token: result.token,
      shop: result.shop,
      user: result.user || null,
    };
  }, []);

  const establishSession = useCallback(
    (nextToken: string, nextShop: Shop, nextUser: User | null = null) => {
      applySession(nextToken, nextShop, nextUser);
    },
    [applySession],
  );

  const enterDemo = useCallback(
    async (sector?: string) => {
      const result = await enterDemoRequest(sector);
      if (!result.success || !result.token) {
        throw new Error(result.error || 'Demo is unavailable');
      }
      applySession(result.token, result.shop, result.user || null);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    await logoutRequest();
    localStorage.removeItem('chartshop_user');
    queryClient.clear();
    setToken(null);
    setShop(null);
    setUser(null);
  }, [queryClient]);

  const updateShop = useCallback((patch: Partial<Shop>) => {
    setShop((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem('chartshop_shop', JSON.stringify(next));
      return next;
    });
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem('chartshop_user', JSON.stringify(next));
      return next;
    });
    if (patch.username) {
      setShop((prev) => {
        if (!prev) return prev;
        const next = { ...prev, username: patch.username as string };
        localStorage.setItem('chartshop_shop', JSON.stringify(next));
        return next;
      });
    }
  }, []);

  const value = useMemo(
    () => ({
      token,
      shop,
      user,
      bootstrapping,
      isAuthenticated: Boolean(token),
      isDemo: Boolean(shop?.isDemo),
      isAdmin: user?.role === 'admin',
      login,
      register,
      establishSession,
      enterDemo,
      logout,
      updateShop,
      updateUser,
    }),
    [
      token,
      shop,
      user,
      bootstrapping,
      login,
      register,
      establishSession,
      enterDemo,
      logout,
      updateShop,
      updateUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
