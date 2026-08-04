import { api } from './client';
import type { Customer, Sale, SaleItemInput } from './types';

export async function listCustomers(filter: 'all' | 'active' = 'all') {
  const { data } = await api.get<{ success: boolean; customers: Customer[] }>(
    `/customers?filter=${filter}`,
  );
  return data.customers || [];
}

export async function createCustomer(body: {
  name: string;
  phone: string;
  email?: string;
}) {
  const { data } = await api.post<{ success: boolean; customer: Customer }>(
    '/customers',
    body,
  );
  return data.customer;
}

export async function getCustomer(id: string) {
  const { data } = await api.get<{ success: boolean; customer: Customer }>(
    `/customers/${id}`,
  );
  return data.customer;
}

export async function getCustomerHistory(id: string) {
  const { data } = await api.get<{
    success: boolean;
    customer: Customer;
    sales: Sale[];
  }>(`/customers/${id}/history`);
  return data;
}

export async function getCreditHistory(id: string) {
  const { data } = await api.get<{
    success: boolean;
    customer: Customer;
    transactions: unknown[];
  }>(`/customers/${id}/credit-history`);
  return data;
}

export async function recordPayment(id: string, amount: number) {
  const { data } = await api.post<{
    success: boolean;
    customer: Customer;
    amountPaid: number;
  }>(`/customers/${id}/payment`, { amount });
  return data;
}

export async function addLedgerCredit(id: string, items: SaleItemInput[]) {
  const { data } = await api.post<{
    success: boolean;
    amount: number;
    customer: Customer;
  }>(`/customers/${id}/credit`, { items });
  return data;
}
