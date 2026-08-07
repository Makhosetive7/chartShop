import { createContext } from 'react';
import type { Shop, User } from '@/api/client';
import type { RegisterInput } from '@/api/auth';

export type AuthState = {
  token: string | null;
  shop: Shop | null;
  user: User | null;
  /** True while refreshing /auth/me after a stored token load. */
  bootstrapping: boolean;
  isAuthenticated: boolean;
  isDemo: boolean;
  isAdmin: boolean;
  login: (username: string, pin: string) => Promise<void>;
  /** Registers without opening a session — caller must call establishSession. */
  register: (input: RegisterInput) => Promise<{
    recoveryCodes: string[];
    token: string;
    shop: Shop;
    user: User | null;
  }>;
  establishSession: (token: string, shop: Shop, user?: User | null) => void;
  enterDemo: (sector?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateShop: (patch: Partial<Shop>) => void;
  updateUser: (patch: Partial<User>) => void;
};

export const AuthContext = createContext<AuthState | null>(null);
