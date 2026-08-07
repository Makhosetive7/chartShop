import axios from 'axios';
import {
  actionLabelFromRequestUrl,
  openDemoUpgrade,
} from '@/components/demo/demoUpgradeBridge';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('chartshop_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data as
        | { code?: string; error?: string }
        | undefined;

      if (status === 403 && data?.code === 'DEMO_READ_ONLY') {
        openDemoUpgrade({
          action: actionLabelFromRequestUrl(error.config?.url),
          message: data.error,
        });
      }

      if (status === 401) {
        localStorage.removeItem('chartshop_token');
        localStorage.removeItem('chartshop_shop');
        const path = window.location.pathname;
        const isPublic =
          path === '/' ||
          path.startsWith('/login') ||
          path.startsWith('/register') ||
          path.startsWith('/recover') ||
          path.startsWith('/setup');
        if (!isPublic) {
          window.location.assign('/login');
        }
      }
    }
    return Promise.reject(error);
  },
);

export type Shop = {
  id: string;
  username: string;
  businessName: string;
  businessDescription?: string;
  isActive?: boolean;
  isDemo?: boolean;
  demoSector?: string | null;
  settings?: Record<string, unknown>;
  lastLogin?: string;
  channels?: {
    telegramLinked?: boolean;
    whatsappLinked?: boolean;
  };
};

export type User = {
  id: string;
  shopId?: string | null;
  username: string;
  displayName: string;
  role: 'admin' | 'member';
  isActive?: boolean;
  lastLogin?: string | null;
  createdAt?: string;
  channels?: {
    telegramLinked?: boolean;
    whatsappLinked?: boolean;
  };
};

export type LoginResponse = {
  success: boolean;
  token: string;
  shop: Shop;
  user?: User | null;
  error?: string;
  code?: string;
  suggestions?: string[];
  recoveryCodes?: string[];
};
