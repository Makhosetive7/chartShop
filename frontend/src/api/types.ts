import axios from 'axios';

export function getErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    return data?.error || error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export type Product = {
  id: string;
  name: string;
  price: number;
  costPrice: number | null;
  stock: number;
  trackStock: boolean;
  lowStockThreshold: number;
  isActive: boolean;
};

export type SaleItemInput = {
  productId?: string;
  name?: string;
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
