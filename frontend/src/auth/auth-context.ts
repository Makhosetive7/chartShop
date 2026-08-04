import { createContext } from 'react';
import type { Shop } from '@/api/client';

export type AuthState = {
  token: string | null;
  shop: Shop | null;
  isAuthenticated: boolean;
  login: (userId: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  updateShop: (patch: Partial<Shop>) => void;
};

export const AuthContext = createContext<AuthState | null>(null);
