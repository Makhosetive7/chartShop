import { api } from './client';
import type { Sale, SaleItemInput } from './types';

export type Laybye = {
  id: string;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: string;
  items?: unknown[];
  dueDate?: string;
  completedDate?: string | null;
  notes?: string | null;
};

export type RefundSale = {
  id: string;
  type: string;
  total: number;
  customerName?: string | null;
  items?: Array<{ productName: string; quantity: number }>;
  cancelledAt?: string;
  cancellationReason?: string | null;
  date?: string;
};

export async function createCashSale(items: SaleItemInput[]) {
  const { data } = await api.post<{ success: boolean; sale: Sale }>(
    '/sales/cash',
    { items },
  );
  return data.sale;
}

export async function createCreditSale(customer: string, items: SaleItemInput[]) {
  const { data } = await api.post<{
    success: boolean;
    sale: Sale;
    customerBalance?: number;
  }>('/sales/credit', { customer, items });
  return data;
}

export async function sellToCustomer(customer: string, items: SaleItemInput[]) {
  const { data } = await api.post<{ success: boolean; sale: Sale }>(
    '/sales/to-customer',
    { customer, items },
  );
  return data.sale;
}

export async function listRecentSales(limit = 20) {
  const { data } = await api.get<{
    success: boolean;
    sales?: Sale[];
    message?: string;
  }>(`/sales/recent?limit=${limit}`);
  return data.sales || [];
}

export async function cancelLastSale(reason?: string) {
  const { data } = await api.post<{
    success: boolean;
    message?: string;
    sale?: Sale;
  }>('/sales/cancel/last', { reason });
  return data;
}

export async function cancelSale(id: string, reason?: string) {
  const { data } = await api.post<{
    success: boolean;
    message?: string;
    sale?: Sale;
  }>(`/sales/${id}/cancel`, { reason });
  return data;
}

export async function fetchRefunds(days = 30) {
  const { data } = await api.get<{
    success: boolean;
    message?: string;
    days?: number;
    totalRefundAmount?: number;
    sales?: RefundSale[];
  }>(`/sales/refunds?days=${days}`);
  return data;
}

export async function createLaybye(body: {
  customer: string;
  items: SaleItemInput[];
  deposit?: number;
}) {
  const { data } = await api.post<{
    success: boolean;
    completed?: boolean;
    sale?: Sale;
    laybye: Laybye;
  }>('/laybye', body);
  return data;
}

export async function payLaybye(customer: string, amount: number) {
  const { data } = await api.post<{
    success: boolean;
    completed?: boolean;
    laybye?: Laybye;
  }>('/laybye/pay', { customer, amount });
  return data;
}

export async function completeLaybye(customer: string) {
  const { data } = await api.post<{
    success: boolean;
    sale?: Sale;
    laybyeId?: string;
  }>('/laybye/complete', { customer });
  return data;
}

export async function listLaybyes(
  status: 'active' | 'completed' | 'cancelled' | 'all' = 'active',
) {
  const { data } = await api.get<{
    success: boolean;
    laybyes?: Laybye[];
  }>(`/laybye?status=${encodeURIComponent(status)}`);
  return data.laybyes || [];
}
