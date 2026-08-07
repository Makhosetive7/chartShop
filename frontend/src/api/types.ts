import axios from 'axios';

export function getErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; code?: string } | undefined;
    if (error.response?.status === 403 && data?.code === 'DEMO_READ_ONLY') {
      return '';
    }
    return data?.error || error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export function isDemoReadOnlyError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const data = error.response?.data as { code?: string } | undefined;
  return error.response?.status === 403 && data?.code === 'DEMO_READ_ONLY';
}

export type ProductPack = {
  id: string;
  label: string;
  unitsPerPack: number;
  price: number;
  costPrice: number | null;
  barcode?: string | null;
  isActive: boolean;
  sortOrder?: number;
};

export type ProductVariant = {
  id: string;
  label: string;
  baseUnit: string;
  price: number;
  costPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  trackStock: boolean;
  barcode?: string | null;
  isActive: boolean;
  sortOrder?: number;
  packs: ProductPack[];
};

export type Product = {
  id: string;
  name: string;
  price: number;
  costPrice: number | null;
  stock: number;
  trackStock: boolean;
  lowStockThreshold: number;
  isActive: boolean;
  variants?: ProductVariant[];
};

export type SaleItemInput = {
  productId?: string;
  name?: string;
  variantId?: string;
  packId?: string;
  quantity: number;
  price?: number;
};

export type Sale = {
  id: string;
  type: string;
  total: number;
  costTotal?: number;
  profit?: number;
  amountPaid?: number;
  balanceDue?: number;
  status: string;
  isCancelled?: boolean;
  customerId?: string | null;
  customerName?: string;
  items: Array<{
    productName: string;
    variantLabel?: string;
    packLabel?: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  date?: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  currentBalance: number;
  totalSpent: number;
  totalVisits: number;
  lastPurchaseDate?: string;
  isActive: boolean;
};

export type Order = {
  id: string;
  shortId?: string;
  customerName: string;
  customerPhone?: string;
  items: unknown[];
  total: number;
  orderType: string;
  status: string;
  notes?: string;
  orderDate?: string;
};

export type Expense = {
  id: string;
  amount: number;
  description: string;
  category: string;
  paymentMethod: string;
  date?: string;
};

export function money(n: number | null | undefined) {
  return `$${Number(n || 0).toFixed(2)}`;
}
