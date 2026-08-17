import Sale from "../models/Sale.js";
import Shop from "../models/Shop.js";
import User from "../models/User.js";
import Customer from "../models/Customer.js";
import ActivityService from "./ActivityService.js";
import { escapeMarkdown } from "../utils/escapeMarkdown.js";
import {
  DEFAULT_TIMEZONE,
  formatYmd,
  getZonedYmd,
  zonedLocalToUtc,
} from "../utils/dateBounds.js";
import {
  creditDueQueryWindow,
  reminderSlotForToday,
} from "../utils/creditDueReminders.js";
import { isWhatsAppConfigured } from "../adapters/whatsapp.js";

function money(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function itemSummary(sale) {
  const items = sale.items || [];
  if (!items.length) return "credit sale";
  return items
    .slice(0, 3)
    .map((item) => `${item.quantity}x ${item.productName}`)
    .join(", ");
}

function formatDayLabel(ymd) {
  const utc = Date.UTC(ymd.year, ymd.month - 1, ymd.day, 12, 0, 0);
  return new Date(utc).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function kindHeading(kind, daysOverdue) {
  if (kind === "before") return "Due tomorrow";
  if (kind === "due") return "Due today";
  return `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue`;
}

export function buildReminderMessage(todayYmd, rows) {
  const lines = [`*Credit chase — ${formatDayLabel(todayYmd)}*`, ""];

  const groups = [
    rows.filter((row) => row.slot.kind === "before"),
    rows.filter((row) => row.slot.kind === "due"),
    rows.filter((row) => row.slot.kind === "overdue"),
  ];

  for (const group of groups) {
    if (!group.length) continue;
    const heading =
      group[0].slot.kind === "overdue"
        ? "Overdue"
        : kindHeading(group[0].slot.kind, group[0].slot.daysOverdue);
    lines.push(`*${heading}*`);
    for (const row of group) {
      const name = escapeMarkdown(row.customerName || "Customer");
      const items = escapeMarkdown(itemSummary(row.sale));
      const extra =
        row.slot.kind === "overdue"
          ? ` — ${row.slot.daysOverdue} days late`
          : "";
      lines.push(
        `• ${name} — ${money(row.sale.total)}${extra} — ${items}`
      );
    }
    lines.push("");
  }

  lines.push("Record a payment: payment [name] [amount]");
  return lines.join("\n").trim();
}

async function destinationsForShop(shopId) {
  const users = await User.find({
    shopId,
    isActive: true,
    removedAt: null,
  })
    .select("role channels")
    .lean();

  const withChannel = users.filter(
    (user) =>
      user.channels?.telegramChatId || user.channels?.whatsappPhone
  );
  const preferred = withChannel.some((user) => user.role === "admin")
    ? withChannel.filter((user) => user.role === "admin")
    : withChannel;

  const telegram = new Set();
  const whatsapp = new Set();
  for (const user of preferred) {
    if (user.channels?.telegramChatId) {
      telegram.add(String(user.channels.telegramChatId));
    }
    if (user.channels?.whatsappPhone) {
      whatsapp.add(String(user.channels.whatsappPhone));
    }
  }

  return {
    telegram: [...telegram],
    whatsapp: [...whatsapp],
  };
}

async function sendTelegram(chatId, text) {
  try {
    const { default: telegramService } = await import("./telegramService.js");
    await telegramService.sendMessage(chatId, text);
    return true;
  } catch (error) {
    console.error("[credit-due] telegram send failed:", error.message);
    return false;
  }
}

async function sendWhatsApp(phone, text) {
  if (!isWhatsAppConfigured()) return false;
  try {
    const { sendWhatsAppText } = await import("../adapters/whatsapp.js");
    await sendWhatsAppText(phone, text);
    return true;
  } catch (error) {
    console.error("[credit-due] whatsapp send failed:", error.message);
    return false;
  }
}

async function claimSaleReminder(saleId, key) {
  const result = await Sale.updateOne(
    { _id: saleId, creditReminderKeys: { $ne: key } },
    { $addToSet: { creditReminderKeys: key } }
  );
  return result.modifiedCount === 1;
}

async function releaseSaleReminder(saleId, key) {
  await Sale.updateOne({ _id: saleId }, { $pull: { creditReminderKeys: key } });
}

/**
 * Send credit due alerts for the calendar day of `now`.
 * Idempotent per sale + reminder slot (before / due / overdue:N).
 */
export async function runCreditDueReminders(now = new Date()) {
  const timeZone = DEFAULT_TIMEZONE;
  const { todayYmd, startYmd, endYmd } = creditDueQueryWindow(now, timeZone);
  const windowStart = zonedLocalToUtc(
    startYmd.year,
    startYmd.month,
    startYmd.day,
    0,
    0,
    0,
    0,
    timeZone
  );
  const windowEnd = zonedLocalToUtc(
    endYmd.year,
    endYmd.month,
    endYmd.day,
    0,
    0,
    0,
    0,
    timeZone
  );

  const sales = await Sale.find({
    type: "credit",
    isCancelled: { $ne: true },
    status: { $ne: "cancelled" },
    dueDate: { $gte: windowStart, $lte: windowEnd },
  }).lean();

  const shopIds = [...new Set(sales.map((sale) => String(sale.shopId)))];
  const shops = await Shop.find({
    _id: { $in: shopIds },
    isActive: true,
    isDemo: { $ne: true },
  })
    .select("_id")
    .lean();
  const activeShopIds = new Set(shops.map((shop) => String(shop._id)));

  const customerIds = [
    ...new Set(
      sales
        .map((sale) => (sale.customerId ? String(sale.customerId) : null))
        .filter(Boolean)
    ),
  ];
  const customers = await Customer.find({
    _id: { $in: customerIds },
    currentBalance: { $gt: 0 },
  })
    .select("_id currentBalance name")
    .lean();
  const owing = new Map(
    customers.map((customer) => [String(customer._id), customer])
  );

  const byShop = new Map();

  for (const sale of sales) {
    if (!activeShopIds.has(String(sale.shopId))) continue;
    if (!sale.customerId || !owing.has(String(sale.customerId))) continue;

    const slot = reminderSlotForToday(sale.dueDate, now, timeZone);
    if (!slot) continue;
    if ((sale.creditReminderKeys || []).includes(slot.key)) continue;

    const shopKey = String(sale.shopId);
    if (!byShop.has(shopKey)) byShop.set(shopKey, []);
    const customer = owing.get(String(sale.customerId));
    byShop.get(shopKey).push({
      sale,
      slot,
      customerName: customer?.name || sale.customerName,
    });
  }

  let shopsNotified = 0;
  let salesReminded = 0;
  let messagesSent = 0;

  for (const [shopId, rows] of byShop) {
    const claimed = [];
    for (const row of rows) {
      const ok = await claimSaleReminder(row.sale._id, row.slot.key);
      if (ok) claimed.push(row);
    }
    if (!claimed.length) continue;

    const message = buildReminderMessage(todayYmd, claimed);
    const dest = await destinationsForShop(shopId);
    let delivered = dest.telegram.length === 0 && dest.whatsapp.length === 0;

    for (const chatId of dest.telegram) {
      if (await sendTelegram(chatId, message)) {
        delivered = true;
        messagesSent += 1;
      }
    }
    for (const phone of dest.whatsapp) {
      if (await sendWhatsApp(phone, message)) {
        delivered = true;
        messagesSent += 1;
      }
    }

    if (!delivered) {
      for (const row of claimed) {
        await releaseSaleReminder(row.sale._id, row.slot.key);
      }
      continue;
    }

    await ActivityService.log({
      shopId,
      userId: "system",
      channel: "system",
      action: "credit.reminder",
      summary: `Credit chase: ${claimed.length} sale${claimed.length === 1 ? "" : "s"}`,
      entityType: "sale",
      metadata: {
        date: formatYmd(todayYmd),
        count: claimed.length,
        keys: claimed.map((row) => row.slot.key),
      },
    });

    shopsNotified += 1;
    salesReminded += claimed.length;
  }

  return {
    date: formatYmd(todayYmd),
    shopsNotified,
    salesReminded,
    messagesSent,
    scanned: sales.length,
  };
}

export function todayYmdLabel(now = new Date(), timeZone = DEFAULT_TIMEZONE) {
  return formatYmd(getZonedYmd(now, timeZone));
}
