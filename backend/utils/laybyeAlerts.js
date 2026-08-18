import { creditChaseStatus } from "./creditDueReminders.js";
import {
  DEFAULT_TIMEZONE,
  getZonedYmd,
  ymdDiffDays,
} from "./dateBounds.js";

export const LAYBYE_QUIET_DAYS = 14;

function itemsPreview(items) {
  return (items || []).slice(0, 2).map((item) => ({
    productName: item.productName,
    quantity: item.quantity,
    variantLabel: item.variantLabel || "",
    packLabel: item.packLabel || "",
  }));
}

export function lastLaybyeActivityAt(laybye) {
  const payments = [];
  for (const installment of laybye?.installments || []) {
    if (installment?.date) payments.push(new Date(installment.date).getTime());
  }
  if (payments.length) return new Date(Math.max(...payments));
  if (laybye?.startDate) return new Date(laybye.startDate);
  if (laybye?.createdAt) return new Date(laybye.createdAt);
  return null;
}

/**
 * Live chase for an active laybye with a remaining balance.
 * Due-date buckets match credit; otherwise 14+ days without a payment is quiet.
 */
export function laybyeAlertStatus(
  laybye,
  now = new Date(),
  timeZone = DEFAULT_TIMEZONE
) {
  if (!laybye || laybye.status !== "active") return null;
  if (!(Number(laybye.balanceDue) > 0)) return null;

  const lastAt = lastLaybyeActivityAt(laybye);
  const daysQuiet = lastAt
    ? ymdDiffDays(getZonedYmd(lastAt, timeZone), getZonedYmd(now, timeZone))
    : LAYBYE_QUIET_DAYS;

  const due = laybye.dueDate
    ? creditChaseStatus(laybye.dueDate, now, timeZone)
    : null;
  if (due && due.status !== "upcoming") {
    return { ...due, daysQuiet };
  }
  if (daysQuiet >= LAYBYE_QUIET_DAYS) {
    return {
      status: "quiet",
      daysOverdue: 0,
      daysUntilDue: due?.daysUntilDue ?? 0,
      daysQuiet,
    };
  }
  return null;
}

export function collectLaybyeAlerts(
  laybyes,
  now = new Date(),
  timeZone = DEFAULT_TIMEZONE
) {
  const items = [];
  for (const laybye of laybyes || []) {
    const chase = laybyeAlertStatus(laybye, now, timeZone);
    if (!chase) continue;
    items.push({
      id: String(laybye._id || laybye.id),
      customerId: laybye.customerId ? String(laybye.customerId) : null,
      customerName: laybye.customerName || "Customer",
      customerPhone: laybye.customerPhone || null,
      totalAmount: laybye.totalAmount || 0,
      amountPaid: laybye.amountPaid || 0,
      balanceDue: laybye.balanceDue || 0,
      dueDate: laybye.dueDate || null,
      lastPaymentAt: lastLaybyeActivityAt(laybye),
      items: itemsPreview(laybye.items),
      ...chase,
    });
  }

  const rank = { overdue: 0, due: 1, tomorrow: 2, quiet: 3 };
  items.sort((a, b) => {
    const byStatus = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
    if (byStatus !== 0) return byStatus;
    if (a.status === "overdue") return b.daysOverdue - a.daysOverdue;
    if (a.status === "quiet") return b.daysQuiet - a.daysQuiet;
    return 0;
  });
  return items;
}
