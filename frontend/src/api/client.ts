import axios from 'axios';

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
    if (error.response?.status === 401) {
      localStorage.removeItem('chartshop_token');
      localStorage.removeItem('chartshop_shop');
      const path = window.location.pathname;
      const isPublic = path === '/' || path.startsWith('/login');
      if (!isPublic) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

export type Shop = {
  id: string;
  userId: string;
  businessName: string;
  businessDescription?: string;
  isActive?: boolean;
  settings?: Record<string, unknown>;
  lastLogin?: string;
};

export type LoginResponse = {
  success: boolean;
  token: string;
  shop: Shop;
  error?: string;
};
