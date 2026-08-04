import { api } from './client';
import type { Sale, SaleItemInput } from './types';

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

export async function createLaybye(body: {
  customer: string;
  items: SaleItemInput[];
  deposit?: number;
}) {
  const { data } = await api.post<{ success: boolean; laybye: unknown }>(
    '/laybye',
    body,
  );
  return data.laybye;
}

export async function payLaybye(customer: string, amount: number) {
  const { data } = await api.post<{
    success: boolean;
    completed?: boolean;
    laybye?: unknown;
  }>('/laybye/pay', { customer, amount });
  return data;
}
