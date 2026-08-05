import { createContext } from 'react';
import type { Shop } from '@/api/client';
import type { RegisterInput } from '@/api/auth';

export type AuthState = {
  token: string | null;
  shop: Shop | null;
  isAuthenticated: boolean;
  isDemo: boolean;
  login: (username: string, pin: string) => Promise<void>;
  /** Registers without opening a session — caller must call establishSession. */
  register: (input: RegisterInput) => Promise<{
    recoveryCodes: string[];
    token: string;
    shop: Shop;
  }>;
  establishSession: (token: string, shop: Shop) => void;
  enterDemo: (sector?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateShop: (patch: Partial<Shop>) => void;
};

export const AuthContext = createContext<AuthState | null>(null);
