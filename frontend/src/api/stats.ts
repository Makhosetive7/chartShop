import { api } from '@/api/client';

export type ProductStatRow = {
  productId?: string | null;
  productName: string;
  quantity: number;
  revenue: number;
  cost?: number;
  profit?: number;
  transactions?: number;
  avgUnitPrice?: number;
  marginPercent?: number | null;
  price?: number;
  stock?: number;
};

export type CustomerStatRow = {
  customerId?: string;
  name: string;
  phone?: string;
  totalSpent?: number;
  totalVisits?: number;
  currentBalance?: number;
  lastPurchaseDate?: string | null;
  revenue?: number;
  transactions?: number;
};

export type SalesByBucket = {
  type?: string;
  hour?: number;
  day?: number;
  label?: string;
  count: number;
  revenue: number;
};

export type StatsOverview = {
  success: boolean;
  days: number;
  timeZone?: string;
  snapshots: {
    today: { count: number; revenue: number };
    week: { count: number; revenue: number };
    month: { count: number; revenue: number };
    todayExpenses: number;
    activeLaybyes: number;
    openOrders: number;
  };
  highlights: {
    mostPurchased: ProductStatRow | null;
    slowest: ProductStatRow | null;
    neverSoldCount?: number;
    bestClient: CustomerStatRow | null;
    topDebtor: CustomerStatRow | null;
    peakHour?: SalesByBucket | null;
    peakDay?: SalesByBucket | null;
    averageTicket: number;
  };
  products: {
    mostPurchased: ProductStatRow[];
    slowest: ProductStatRow[];
    neverSold: ProductStatRow[];
    topByRevenue: ProductStatRow[];
  };
  customers: {
    bestClients: CustomerStatRow[];
    debtors: CustomerStatRow[];
    mostFrequent: CustomerStatRow[];
    totals: {
      customers: number;
      withBalance: number;
      totalOutstanding: number;
      activeInPeriod: number;
    };
  };
  sales: {
    salesCount: number;
    revenue: number;
    averageTicket: number;
    costTotal: number | null;
    productProfit: number | null;
    cancelledCount: number;
    cancelledRevenue: number;
  };
  inventory: {
    products: number;
    tracked: number;
    outOfStock: number;
    lowStock: number;
    inventoryRetailValue: number;
    inventoryCostValue: number | null;
  };
};

export type SalesStats = {
  success: boolean;
  days: number;
  summary: StatsOverview['sales'];
  byType: SalesByBucket[];
  byHour: SalesByBucket[];
  byWeekday: SalesByBucket[];
  peakHour: SalesByBucket | null;
  peakDay: SalesByBucket | null;
};

export type InventoryStats = {
  success: boolean;
  totals: StatsOverview['inventory'];
  outOfStock: ProductStatRow[];
  lowStock: ProductStatRow[];
  overstocked: ProductStatRow[];
};

export async function fetchStatsOverview(days = 30, limit = 8) {
  const { data } = await api.get<StatsOverview>('/stats', {
    params: { days, limit },
  });
  return data;
}

export async function fetchSalesStats(days = 30) {
  const { data } = await api.get<SalesStats>('/stats/sales', {
    params: { days },
  });
  return data;
}

export async function fetchInventoryStats() {
  const { data } = await api.get<InventoryStats>('/stats/inventory');
  return data;
}
