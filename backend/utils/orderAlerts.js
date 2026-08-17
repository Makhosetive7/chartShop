import {
  DEFAULT_TIMEZONE,
  getZonedYmd,
  ymdDiffDays,
} from "./dateBounds.js";

export const ORDER_STALE_DAYS = 2;
export const OPEN_ORDER_STATUSES = ["pending", "confirmed", "ready"];

function itemsPreview(items) {
  return (items || []).slice(0, 2).map((item) => ({
    productName: item.productName,
    quantity: item.quantity,
    variantLabel: item.variantLabel || "",
    packLabel: item.packLabel || "",
  }));
}

/**
 * Live chase status for an open order.
 * Pickup/delivery date wins when set; otherwise 2+ days open is stale.
 */
export function orderAlertStatus(
  order,
  now = new Date(),
  timeZone = DEFAULT_TIMEZONE
) {
  if (!order || !OPEN_ORDER_STATUSES.includes(order.status)) return null;

  const todayYmd = getZonedYmd(now, timeZone);
  const openedAt = order.orderDate || now;
  const daysOpen = ymdDiffDays(getZonedYmd(openedAt, timeZone), todayYmd);

  if (order.pickupDate) {
    const daysUntilPickup = ymdDiffDays(
      todayYmd,
      getZonedYmd(order.pickupDate, timeZone)
    );
    if (daysUntilPickup < 0) {
      return {
        status: "overdue",
        daysOverdue: -daysUntilPickup,
        daysUntilPickup,
        daysOpen,
      };
    }
    if (daysUntilPickup === 0) {
      return { status: "due", daysOverdue: 0, daysUntilPickup: 0, daysOpen };
    }
    if (daysUntilPickup === 1) {
      return {
        status: "tomorrow",
        daysOverdue: 0,
        daysUntilPickup: 1,
        daysOpen,
      };
    }
    return null;
  }

  if (daysOpen >= ORDER_STALE_DAYS) {
    return {
      status: "stale",
      daysOverdue: 0,
      daysUntilPickup: null,
      daysOpen,
    };
  }
  return null;
}

export function collectOrderAlerts(
  orders,
  now = new Date(),
  timeZone = DEFAULT_TIMEZONE
) {
  const items = [];
  for (const order of orders || []) {
    const chase = orderAlertStatus(order, now, timeZone);
    if (!chase) continue;
    items.push({
      id: String(order._id || order.id),
      shortId: String(order._id || order.id).slice(-4),
      customerId: order.customerId
        ? String(order.customerId._id || order.customerId)
        : null,
      customerName: order.customerName || "Customer",
      orderType: order.orderType || "pickup",
      orderStatus: order.status,
      total: order.total || 0,
      orderDate: order.orderDate || null,
      pickupDate: order.pickupDate || null,
      items: itemsPreview(order.items),
      ...chase,
    });
  }

  const rank = { overdue: 0, due: 1, tomorrow: 2, stale: 3 };
  items.sort((a, b) => {
    const byStatus = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
    if (byStatus !== 0) return byStatus;
    if (a.status === "overdue") return b.daysOverdue - a.daysOverdue;
    if (a.status === "stale") return b.daysOpen - a.daysOpen;
    return 0;
  });
  return items;
}
