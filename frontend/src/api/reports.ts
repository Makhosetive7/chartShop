import { api } from './client';
import type { Shop } from './client';

export type CashFlowData = {
  cashFlow?: {
    inflows?: { total?: number };
    outflows?: { total?: number };
    net?: number;
  };
  revenue?: { total?: number };
  profitability?: {
    expenses?: number;
    operatingResult?: number;
    profitMargin?: number;
    netProfit?: number;
  };
  outstanding?: { total?: number };
  transactions?: { totalSales?: number; expenses?: number; refunds?: number };
};

export type ReportResponse = {
  success: boolean;
  report?: string;
  message?: string;
  data?: CashFlowData;
  monthInfo?: { label?: string; year?: number };
  days?: number;
  products?: Array<{
    productName: string;
    quantity: number;
    revenue: number;
    transactions?: number;
  }>;
  totalQuantity?: number;
  totalRevenue?: number;
  period?: string;
  error?: string;
};

export async function fetchDailyReport() {
  const { data } = await api.get<ReportResponse>('/reports/daily');
  return data;
}

export async function fetchWeeklyReport() {
  const { data } = await api.get<ReportResponse>('/reports/weekly');
  return data;
}

export async function fetchMonthlyReport(month?: string) {
  const qs = month ? `?month=${encodeURIComponent(month)}` : '';
  const { data } = await api.get<ReportResponse>(`/reports/monthly${qs}`);
  return data;
}

export async function fetchBestSellers(days = 7) {
  const { data } = await api.get<ReportResponse>(
    `/reports/best-sellers?days=${days}`,
  );
  return data;
}

export async function fetchProfit(period = 'daily') {
  const { data } = await api.get<ReportResponse>(
    `/reports/profit?period=${period}`,
  );
  return data;
}

/** Same PDF generator used by Telegram `export daily|weekly|monthly`. */
export async function downloadReportPdf(
  type: 'daily' | 'weekly' | 'monthly',
  month?: string,
) {
  const { data, headers } = await api.get<Blob>('/reports/export', {
    params: {
      type,
      download: 1,
      ...(type === 'monthly' && month ? { month } : {}),
    },
    responseType: 'blob',
  });

  if (data.type && data.type.includes('json')) {
    const text = await data.text();
    let message = 'Failed to download PDF.';
    try {
      message = (JSON.parse(text) as { error?: string }).error || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const disposition = String(headers['content-disposition'] || '');
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const fileName =
    match?.[1] ||
    `chartshop-${type}-report-${new Date().toISOString().slice(0, 10)}.pdf`;

  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  return fileName;
}

export async function fetchProfile() {
  const { data } = await api.get<{
    success: boolean;
    shop: Shop;
    profile?: Record<string, unknown>;
  }>('/auth/profile');
  return data;
}

export async function updateProfileName(businessName: string) {
  const { data } = await api.patch('/auth/profile/name', { businessName });
  return data;
}

export async function updateProfileDescription(businessDescription: string) {
  const { data } = await api.patch('/auth/profile/description', {
    businessDescription,
  });
  return data;
}

export async function updateProfilePin(oldPin: string, newPin: string) {
  const { data } = await api.patch('/auth/profile/pin', { oldPin, newPin });
  return data;
}
