import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import Expense from "../models/Expense.js";
import LayBye from "../models/LayBye.js";
import Order from "../models/Order.js";
import Shop from "../models/Shop.js";
import {
  DEFAULT_TIMEZONE,
  getDayBounds,
  getWeekBounds,
  getMonthBounds,
  getZonedYmd,
} from "../utils/dateBounds.js";

function clampDays(raw, fallback = 30) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, 365);
}

function clampLimit(raw, fallback = 10) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, 50);
}

class StatsService {
  async getShopTimezone(shopId) {
    const shop = await Shop.findById(shopId).select("settings.timezone");
    return shop?.settings?.timezone || DEFAULT_TIMEZONE;
  }

  periodStart(days) {
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  async salesInPeriod(shopId, startDate) {
    return Sale.find({
      shopId,
      date: { $gte: startDate },
      isCancelled: false,
      status: { $ne: "cancelled" },
    }).lean();
  }

  /**
   * Aggregate product performance from sales.
   */
  aggregateProductStats(sales) {
    const byKey = new Map();

    for (const sale of sales) {
      for (const item of sale.items || []) {
        const key = item.productId
          ? String(item.productId)
          : `name:${item.productName}`;
        if (!byKey.has(key)) {
          byKey.set(key, {
            productId: item.productId ? String(item.productId) : null,
            productName: item.productName,
            quantity: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            transactions: 0,
            hasCost: false,
          });
        }
        const row = byKey.get(key);
        row.quantity += item.quantity || 0;
        row.revenue += item.total || 0;
        row.transactions += 1;
        if (typeof item.costTotal === "number" && item.costTotal >= 0) {
          row.cost += item.costTotal;
          row.profit += (item.total || 0) - item.costTotal;
          row.hasCost = true;
        } else if (
          typeof item.costPrice === "number" &&
          item.costPrice >= 0
        ) {
          const lineCost = item.costPrice * (item.quantity || 0);
          row.cost += lineCost;
          row.profit += (item.total || 0) - lineCost;
          row.hasCost = true;
        }
      }
    }

    return [...byKey.values()].map((row) => ({
      ...row,
      avgUnitPrice:
        row.quantity > 0 ? Math.round((row.revenue / row.quantity) * 100) / 100 : 0,
      marginPercent:
        row.hasCost && row.revenue > 0
          ? Math.round((row.profit / row.revenue) * 1000) / 10
          : null,
    }));
  }

  async productStats(shopId, { days = 30, limit = 10 } = {}) {
    days = clampDays(days);
    limit = clampLimit(limit);
    const startDate = this.periodStart(days);
    const [sales, products] = await Promise.all([
      this.salesInPeriod(shopId, startDate),
      Product.find({ shopId, isActive: true }).lean(),
    ]);

    const aggregated = this.aggregateProductStats(sales);
    const soldIds = new Set(
      aggregated.filter((p) => p.productId).map((p) => p.productId)
    );
    const soldNames = new Set(
      aggregated.map((p) => p.productName?.toLowerCase())
    );

    const neverSold = products
      .filter((p) => {
        const id = String(p._id);
        if (soldIds.has(id)) return false;
        return !soldNames.has(p.name?.toLowerCase());
      })
      .map((p) => ({
        productId: String(p._id),
        productName: p.name,
        price: p.price,
        stock: p.stock,
        costPrice: p.costPrice ?? null,
      }))
      .sort((a, b) => a.productName.localeCompare(b.productName));

    const byQuantity = [...aggregated].sort((a, b) => b.quantity - a.quantity);
    const byRevenue = [...aggregated].sort((a, b) => b.revenue - a.revenue);
    const slowest = [...aggregated]
      .filter((p) => p.quantity > 0)
      .sort((a, b) => a.quantity - b.quantity || a.revenue - b.revenue);

    const withMargin = aggregated.filter((p) => p.marginPercent != null);
    const bestMargin = [...withMargin].sort(
      (a, b) => b.marginPercent - a.marginPercent
    );
    const worstMargin = [...withMargin].sort(
      (a, b) => a.marginPercent - b.marginPercent
    );

    return {
      days,
      startDate,
      totals: {
        productsSold: aggregated.length,
        unitsSold: aggregated.reduce((s, p) => s + p.quantity, 0),
        revenue: aggregated.reduce((s, p) => s + p.revenue, 0),
        neverSoldCount: neverSold.length,
        catalogSize: products.length,
      },
      mostPurchased: byQuantity.slice(0, limit),
      topByRevenue: byRevenue.slice(0, limit),
      slowest: slowest.slice(0, limit),
      neverSold: neverSold.slice(0, limit),
      bestMargin: bestMargin.slice(0, limit),
      worstMargin: worstMargin.slice(0, limit),
    };
  }

  async customerStats(shopId, { days = 30, limit = 10 } = {}) {
    days = clampDays(days);
    limit = clampLimit(limit);
    const startDate = this.periodStart(days);

    const [customers, periodSales] = await Promise.all([
      Customer.find({ shopId, isActive: true }).lean(),
      Sale.find({
        shopId,
        date: { $gte: startDate },
        isCancelled: false,
        customerId: { $ne: null },
      }).lean(),
    ]);

    const periodSpend = new Map();
    for (const sale of periodSales) {
      const id = String(sale.customerId);
      if (!periodSpend.has(id)) {
        periodSpend.set(id, {
          customerId: id,
          revenue: 0,
          transactions: 0,
          name: sale.customerName,
        });
      }
      const row = periodSpend.get(id);
      row.revenue += sale.total || 0;
      row.transactions += 1;
    }

    const bestBySpend = [...customers]
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, limit)
      .map((c) => ({
        customerId: String(c._id),
        name: c.name,
        phone: c.phone,
        totalSpent: c.totalSpent || 0,
        totalVisits: c.totalVisits || 0,
        currentBalance: c.currentBalance || 0,
        lastPurchaseDate: c.lastPurchaseDate,
      }));

    const bestByVisits = [...customers]
      .sort((a, b) => (b.totalVisits || 0) - (a.totalVisits || 0))
      .slice(0, limit)
      .map((c) => ({
        customerId: String(c._id),
        name: c.name,
        phone: c.phone,
        totalVisits: c.totalVisits || 0,
        totalSpent: c.totalSpent || 0,
        lastPurchaseDate: c.lastPurchaseDate,
      }));

    const bestInPeriod = [...periodSpend.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    const debtors = [...customers]
      .filter((c) => (c.currentBalance || 0) > 0)
      .sort((a, b) => b.currentBalance - a.currentBalance)
      .slice(0, limit)
      .map((c) => ({
        customerId: String(c._id),
        name: c.name,
        phone: c.phone,
        currentBalance: c.currentBalance,
        totalSpent: c.totalSpent || 0,
        lastPurchaseDate: c.lastPurchaseDate,
      }));

    const inactiveCutoff = new Date();
    inactiveCutoff.setDate(inactiveCutoff.getDate() - days);
    const inactive = customers
      .filter((c) => {
        if (!c.lastPurchaseDate) return true;
        return new Date(c.lastPurchaseDate) < inactiveCutoff;
      })
      .sort((a, b) => {
        const da = a.lastPurchaseDate
          ? new Date(a.lastPurchaseDate).getTime()
          : 0;
        const db = b.lastPurchaseDate
          ? new Date(b.lastPurchaseDate).getTime()
          : 0;
        return da - db;
      })
      .slice(0, limit)
      .map((c) => ({
        customerId: String(c._id),
        name: c.name,
        phone: c.phone,
        totalSpent: c.totalSpent || 0,
        lastPurchaseDate: c.lastPurchaseDate || null,
      }));

    const totalOutstanding = customers.reduce(
      (s, c) => s + (c.currentBalance || 0),
      0
    );

    return {
      days,
      totals: {
        customers: customers.length,
        withBalance: customers.filter((c) => (c.currentBalance || 0) > 0)
          .length,
        totalOutstanding,
        activeInPeriod: periodSpend.size,
      },
      bestClients: bestBySpend,
      mostFrequent: bestByVisits,
      bestInPeriod,
      debtors,
      inactive,
    };
  }

  async salesStats(shopId, { days = 30 } = {}) {
    days = clampDays(days);
    const startDate = this.periodStart(days);
    const timeZone = await this.getShopTimezone(shopId);

    const [sales, cancelled] = await Promise.all([
      this.salesInPeriod(shopId, startDate),
      Sale.find({
        shopId,
        isCancelled: true,
        cancelledAt: { $gte: startDate },
      }).lean(),
    ]);

    const byType = {};
    let revenue = 0;
    let costTotal = 0;
    let profit = 0;
    let hasCosts = false;
    const byHour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: 0,
      revenue: 0,
    }));
    const byWeekday = Array.from({ length: 7 }, (_, day) => ({
      day,
      label: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day],
      count: 0,
      revenue: 0,
    }));

    for (const sale of sales) {
      const type = sale.type || "cash";
      if (!byType[type]) {
        byType[type] = { type, count: 0, revenue: 0 };
      }
      byType[type].count += 1;
      byType[type].revenue += sale.total || 0;
      revenue += sale.total || 0;
      if (typeof sale.costTotal === "number" && sale.costTotal > 0) {
        costTotal += sale.costTotal;
        hasCosts = true;
      }
      if (typeof sale.profit === "number") {
        profit += sale.profit;
      }

      const d = new Date(sale.date);
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "numeric",
        hour12: false,
        weekday: "short",
      }).formatToParts(d);
      const hourPart = parts.find((p) => p.type === "hour");
      const weekdayPart = parts.find((p) => p.type === "weekday");
      const hour = hourPart ? parseInt(hourPart.value, 10) % 24 : d.getHours();
      if (byHour[hour]) {
        byHour[hour].count += 1;
        byHour[hour].revenue += sale.total || 0;
      }
      const weekdayMap = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      };
      const dayIdx =
        weekdayPart && weekdayMap[weekdayPart.value] != null
          ? weekdayMap[weekdayPart.value]
          : d.getDay();
      byWeekday[dayIdx].count += 1;
      byWeekday[dayIdx].revenue += sale.total || 0;
    }

    const peakHour = [...byHour].sort((a, b) => b.count - a.count)[0];
    const peakDay = [...byWeekday].sort((a, b) => b.count - a.count)[0];
    const count = sales.length;

    return {
      days,
      startDate,
      timeZone,
      summary: {
        salesCount: count,
        revenue,
        averageTicket: count > 0 ? Math.round((revenue / count) * 100) / 100 : 0,
        costTotal: hasCosts ? costTotal : null,
        productProfit: hasCosts ? profit : null,
        cancelledCount: cancelled.length,
        cancelledRevenue: cancelled.reduce((s, x) => s + (x.total || 0), 0),
      },
      byType: Object.values(byType).sort((a, b) => b.revenue - a.revenue),
      byHour,
      byWeekday,
      peakHour,
      peakDay,
    };
  }

  async inventoryStats(shopId) {
    const products = await Product.find({ shopId, isActive: true }).lean();
    let retailValue = 0;
    let costValue = 0;
    let tracked = 0;
    let withCost = 0;

    const lowStock = [];
    const outOfStock = [];
    const overstocked = [];

    for (const p of products) {
      if (p.trackStock) {
        tracked += 1;
        retailValue += (p.stock || 0) * (p.price || 0);
        if (typeof p.costPrice === "number" && p.costPrice >= 0) {
          costValue += (p.stock || 0) * p.costPrice;
          withCost += 1;
        }
        if ((p.stock || 0) === 0) {
          outOfStock.push({
            productId: String(p._id),
            productName: p.name,
            stock: 0,
            lowStockThreshold: p.lowStockThreshold,
          });
        } else if ((p.stock || 0) <= (p.lowStockThreshold ?? 0)) {
          lowStock.push({
            productId: String(p._id),
            productName: p.name,
            stock: p.stock,
            lowStockThreshold: p.lowStockThreshold,
            price: p.price,
          });
        }
        if ((p.stock || 0) > Math.max((p.lowStockThreshold || 10) * 10, 100)) {
          overstocked.push({
            productId: String(p._id),
            productName: p.name,
            stock: p.stock,
            price: p.price,
            retailValue: (p.stock || 0) * (p.price || 0),
          });
        }
      }
    }

    lowStock.sort((a, b) => a.stock - b.stock);
    overstocked.sort((a, b) => b.retailValue - a.retailValue);

    return {
      totals: {
        products: products.length,
        tracked,
        outOfStock: outOfStock.length,
        lowStock: lowStock.length,
        inventoryRetailValue: Math.round(retailValue * 100) / 100,
        inventoryCostValue:
          withCost > 0 ? Math.round(costValue * 100) / 100 : null,
      },
      outOfStock: outOfStock.slice(0, 20),
      lowStock: lowStock.slice(0, 20),
      overstocked: overstocked.slice(0, 10),
    };
  }

  async overview(shopId, { days = 30, limit = 5 } = {}) {
    days = clampDays(days);
    limit = clampLimit(limit, 5);

    const timeZone = await this.getShopTimezone(shopId);
    const today = getDayBounds(timeZone);
    const week = getWeekBounds(timeZone);
    const { year, month } = getZonedYmd(new Date(), timeZone);
    const monthBounds = getMonthBounds(month - 1, year, timeZone);

    const [
      products,
      customers,
      todaySales,
      weekSales,
      monthSales,
      periodSalesStats,
      inventory,
      activeLaybyes,
      openOrders,
      todayExpenses,
    ] = await Promise.all([
      this.productStats(shopId, { days, limit }),
      this.customerStats(shopId, { days, limit }),
      Sale.find({
        shopId,
        date: { $gte: today.startDate, $lte: today.endDate },
        isCancelled: false,
      }).lean(),
      Sale.find({
        shopId,
        date: { $gte: week.startDate, $lte: week.endDate },
        isCancelled: false,
      }).lean(),
      Sale.find({
        shopId,
        date: { $gte: monthBounds.startDate, $lte: monthBounds.endDate },
        isCancelled: false,
      }).lean(),
      this.salesStats(shopId, { days }),
      this.inventoryStats(shopId),
      LayBye.countDocuments({ shopId, status: "active" }),
      Order.countDocuments({
        shopId,
        status: { $in: ["pending", "confirmed", "ready"] },
      }),
      Expense.find({
        shopId,
        date: { $gte: today.startDate, $lte: today.endDate },
      }).lean(),
    ]);

    const sumSales = (list) => ({
      count: list.length,
      revenue: list.reduce((s, x) => s + (x.total || 0), 0),
    });

    return {
      days,
      timeZone,
      snapshots: {
        today: sumSales(todaySales),
        week: sumSales(weekSales),
        month: sumSales(monthSales),
        todayExpenses: todayExpenses.reduce((s, e) => s + (e.amount || 0), 0),
        activeLaybyes,
        openOrders,
      },
      highlights: {
        mostPurchased: products.mostPurchased[0] || null,
        slowest: products.slowest[0] || null,
        neverSoldCount: products.totals.neverSoldCount,
        bestClient: customers.bestClients[0] || null,
        topDebtor: customers.debtors[0] || null,
        peakHour: periodSalesStats.peakHour,
        peakDay: periodSalesStats.peakDay,
        averageTicket: periodSalesStats.summary.averageTicket,
      },
      products: {
        mostPurchased: products.mostPurchased,
        slowest: products.slowest,
        neverSold: products.neverSold,
        topByRevenue: products.topByRevenue,
      },
      customers: {
        bestClients: customers.bestClients,
        debtors: customers.debtors,
        mostFrequent: customers.mostFrequent,
        totals: customers.totals,
      },
      sales: periodSalesStats.summary,
      inventory: inventory.totals,
    };
  }
}

export default new StatsService();
export { clampDays, clampLimit };
