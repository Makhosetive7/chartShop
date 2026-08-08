import { api } from './client';
import type { Expense, Order, SaleItemInput } from './types';

export async function listOrders(status = 'all', limit = 30) {
  const { data } = await api.get<{ success: boolean; orders: Order[] }>(
    `/orders?status=${status}&limit=${limit}`,
  );
  return data.orders || [];
}

export async function createOrder(body: {
  customer: string;
  items: SaleItemInput[];
  orderType?: string;
  notes?: string;
}) {
  const { data } = await api.post<{ success: boolean; order: Order }>(
    '/orders',
    body,
  );
  return data.order;
}

export async function updateOrderStatus(
  id: string,
  status: string,
  notes?: string,
) {
  const { data } = await api.patch<{ success: boolean; order: Order }>(
    `/orders/${id}/status`,
    { status, notes },
  );
  return data.order;
}

export async function listExpenses(period = 'daily') {
  const { data } = await api.get<{
    success: boolean;
    expenses: Expense[];
    total?: number;
  }>(`/expenses?period=${period}`);
  return data;
}

export async function getCashAvailable() {
  const { data } = await api.get<{
    success: boolean;
    cashAvailable: number;
    breakdown?: {
      cashSales?: number;
      debtPayments?: number;
      laybyePayments?: number;
      ownerCashIns?: number;
      expenses?: number;
      refunds?: number;
    };
  }>('/expenses/cash-available');
  return data;
}

export async function createExpense(body: {
  amount: number;
  description: string;
  category?: string;
  paymentMethod?: string;
  allowOverspend?: boolean;
}) {
  const { data } = await api.post<{
    success: boolean;
    expense: Expense;
    ownerCashIn?: number;
    cashAvailable?: number;
  }>('/expenses', body);
  return data;
}

export async function expenseBreakdown(period = 'monthly') {
  const { data } = await api.get<{
    success: boolean;
    total?: number;
    breakdown?: unknown;
  }>(`/expenses/breakdown?period=${period}`);
  return data;
}
