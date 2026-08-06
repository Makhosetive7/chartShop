/**
 * Seed all multi-sector demo shops (read-only try-before-register).
 *
 * Usage (from backend/):
 *   npm run seed:demos
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Shop from "../models/Shop.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import Sale from "../models/Sale.js";
import Expense from "../models/Expense.js";
import LayBye from "../models/LayBye.js";
import { DEMO_SECTORS } from "../constants/demoSectors.js";

const SHARED_CUSTOMERS = [
  { name: "Thandi Ncube", phone: "0771001001" },
  { name: "Amina Chari", phone: "0771001002" },
  { name: "Grace Moyo", phone: "0771001003" },
  { name: "Rudo Sibanda", phone: "0771001004" },
  { name: "Nomsa Dube", phone: "0771001005" },
  { name: "Farai Mutasa", phone: "0771001006" },
  { name: "Chipo Mhlanga", phone: "0771001007" },
  { name: "Tendai Zhou", phone: "0771001008" },
];

const CANCEL_REASONS = [
  "Wrong price entered",
  "Customer changed mind",
  "Duplicate sale",
  "Cancelled from web",
  "Wrong item scanned",
  "Payment failed — voided",
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function saleDateInWeek(weekStart) {
  const dayOffset = rand(0, 5);
  const hour = rand(9, 17);
  const minute = rand(0, 59);
  const d = addDays(weekStart, dayOffset);
  d.setHours(hour, minute, rand(0, 59), 0);
  return d;
}

function buildLineItems(products, itemCount = 1) {
  const chosen = new Set();
  const items = [];
  let total = 0;
  let costTotal = 0;

  for (let j = 0; j < itemCount; j++) {
    let product = pick(products);
    let guard = 0;
    while (chosen.has(String(product._id)) && guard < 8) {
      product = pick(products);
      guard += 1;
    }
    chosen.add(String(product._id));

    const quantity = rand(1, 2);
    const price = product.price;
    const lineTotal = quantity * price;
    const lineCost = quantity * (product.costPrice || 0);
    total += lineTotal;
    costTotal += lineCost;
    items.push({
      productId: product._id,
      productName: product.name,
      quantity,
      price,
      standardPrice: price,
      isCustomPrice: false,
      costPrice: product.costPrice,
      costTotal: lineCost,
      total: lineTotal,
    });
  }

  return { items, total, costTotal };
}

async function wipeShopByUsername(username) {
  const existing = await Shop.findOne({ username });
  if (!existing) return;
  const shopId = existing._id;
  const ActivityLog = (await import("../models/ActivityLog.js")).default;
  await Promise.all([
    Sale.deleteMany({ shopId }),
    Expense.deleteMany({ shopId }),
    LayBye.deleteMany({ shopId }),
    Product.deleteMany({ shopId }),
    Customer.deleteMany({ shopId }),
    ActivityLog.deleteMany({ shopId }),
    Shop.deleteOne({ _id: shopId }),
  ]);
  console.log(`Removed previous ${username}`);
}

async function seedSector(sector) {
  await wipeShopByUsername(sector.username);

  const hashedPin = await bcrypt.hash(sector.pin, 12);
  const years = sector.years || 1;
  const registeredAt = addDays(new Date(), -(years * 365 + 14));
  const [salesMin, salesMax] = sector.salesPerWeek || [3, 4];

  const shop = await Shop.create({
    username: sector.username,
    businessName: sector.businessName,
    businessDescription: sector.businessDescription,
    pin: hashedPin,
    channels: {},
    isActive: true,
    isDemo: true,
    demoSector: sector.id,
    registeredAt,
    createdAt: registeredAt,
    settings: {
      currency: "USD",
      timezone: "Africa/Harare",
      lowStockAlert: sector.lowStockAlert ?? 10,
    },
  });

  const shopDefaultThreshold = sector.lowStockAlert ?? 10;
  const products = await Product.insertMany(
    sector.catalog.map((p) => ({
      shopId: shop._id,
      ...p,
      lowStockThreshold: shopDefaultThreshold,
      trackStock: true,
      isActive: true,
      createdAt: registeredAt,
    }))
  );

  const phoneOffset = sector.id.length * 100;
  const customers = await Customer.insertMany(
    SHARED_CUSTOMERS.map((c, i) => ({
      shopId: shop._id,
      name: c.name,
      phone: String(Number(c.phone) + phoneOffset + i),
      email: "",
      totalSpent: 0,
      totalVisits: 0,
      currentBalance: 0,
      loyaltyPoints: 0,
      isActive: true,
      firstPurchaseDate: null,
      lastPurchaseDate: null,
      createdAt: addDays(registeredAt, i * 7),
    }))
  );

  const start = new Date(registeredAt);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const toMonday = day === 0 ? -6 : 1 - day;
  let weekStart = addDays(start, toMonday);

  const now = new Date();
  const salesDocs = [];
  const expenseDocs = [];
  let saleCount = 0;

  while (weekStart < now) {
    const salesThisWeek = rand(salesMin, salesMax);
    for (let i = 0; i < salesThisWeek; i++) {
      const date = saleDateInWeek(weekStart);
      if (date > now) continue;

      const { items, total, costTotal } = buildLineItems(products, rand(1, 3));

      const withCustomer = Math.random() < 0.55;
      const customer = withCustomer ? pick(customers) : null;
      const isCredit = withCustomer && Math.random() < 0.12;

      salesDocs.push({
        shopId: shop._id,
        type: isCredit ? "credit" : "cash",
        status: "completed",
        items,
        total,
        costTotal,
        profit: total - costTotal,
        amountPaid: isCredit ? 0 : total,
        balanceDue: isCredit ? total : 0,
        isCancelled: false,
        customerId: customer?._id,
        customerName: customer?.name,
        customerPhone: customer?.phone,
        date,
      });
      saleCount += 1;

      if (customer) {
        customer.totalSpent += isCredit ? 0 : total;
        customer.totalVisits += 1;
        if (!customer.firstPurchaseDate) customer.firstPurchaseDate = date;
        customer.lastPurchaseDate = date;
        if (isCredit) customer.currentBalance += total;
      }
    }

    if (Math.random() < 0.7) {
      expenseDocs.push({
        shopId: shop._id,
        amount: rand(15, 45),
        description: pick(sector.expenses || ["Operating expense"]),
        category: "other",
        paymentMethod: "cash",
        date: addDays(weekStart, rand(0, 4)),
      });
    }

    weekStart = addDays(weekStart, 7);
  }

  const BATCH = 200;
  for (let i = 0; i < salesDocs.length; i += BATCH) {
    await Sale.insertMany(salesDocs.slice(i, i + BATCH));
  }
  if (expenseDocs.length) await Expense.insertMany(expenseDocs);
  for (const c of customers) await c.save();

  for (const p of products) {
    if (p.stock >= 900) continue; // service SKUs
    const sold = salesDocs.reduce((sum, s) => {
      const line = s.items.find(
        (it) => String(it.productId) === String(p._id)
      );
      return sum + (line?.quantity || 0);
    }, 0);
    p.stock = Math.max(3, (p.stock || 40) - Math.floor(sold * 0.15));
    await p.save();
  }

  // Leave 1–2 tracked products at/near shop low-stock default for Settings + Products UI.
  const tracked = products.filter((p) => p.stock < 900);
  for (const p of tracked.slice(0, 2)) {
    p.stock = Math.max(0, Math.min(p.stock, shopDefaultThreshold));
    await p.save();
  }

  const featureExtras = await seedLaybyesAndRefunds({
    shop,
    products,
    customers,
  });

  await seedDemoActivityLog({
    shop,
    products,
    salesDocs,
    expenseDocs,
    sector,
    featureExtras,
  });

  console.log(
    `✓ ${sector.id.padEnd(12)} ${sector.businessName} (@${sector.username}) — ${products.length} products, ${saleCount} sales, ${featureExtras.cancelledCount} refunds, ${featureExtras.laybyeCount} laybyes`
  );
}

/**
 * Seed cancelled sales (refunds UI) + active/completed laybyes (Sales page).
 */
async function seedLaybyesAndRefunds({ shop, products, customers }) {
  const trackedProducts = products.filter((p) => (p.stock || 0) < 900);
  const pool = trackedProducts.length ? trackedProducts : products;
  const now = new Date();

  const cancelledDocs = [];
  const cancelWindows = [2, 5, 9, 14, 21, 28, 45];
  for (let i = 0; i < cancelWindows.length; i++) {
    const daysAgo = cancelWindows[i];
    const { items, total, costTotal } = buildLineItems(pool, rand(1, 2));
    const customer = i % 2 === 0 ? pick(customers) : null;
    const saleDate = addDays(now, -daysAgo);
    saleDate.setHours(rand(10, 16), rand(0, 59), 0, 0);
    const cancelledAt = addDays(saleDate, rand(0, 1));
    cancelledAt.setHours(saleDate.getHours() + rand(1, 4), rand(0, 59), 0, 0);

    cancelledDocs.push({
      shopId: shop._id,
      type: customer && i % 3 === 0 ? "credit" : "cash",
      status: "cancelled",
      items,
      total,
      costTotal,
      profit: total - costTotal,
      amountPaid: customer && i % 3 === 0 ? 0 : total,
      balanceDue: customer && i % 3 === 0 ? total : 0,
      isCancelled: true,
      cancelledAt,
      cancellationReason: CANCEL_REASONS[i % CANCEL_REASONS.length],
      customerId: customer?._id,
      customerName: customer?.name,
      customerPhone: customer?.phone,
      date: saleDate,
    });
  }
  await Sale.insertMany(cancelledDocs);

  // Prefer distinct customers for active laybyes so Pay/Complete by name is unambiguous.
  const laybyeCustomers = [...customers].slice(0, 4);
  while (laybyeCustomers.length < 4) {
    laybyeCustomers.push(pick(customers));
  }

  const laybyeDocs = [];

  // Active — small deposit, clear balance for Pay flow
  {
    const customer = laybyeCustomers[0];
    const { items, total } = buildLineItems(pool, 2);
    const deposit = Math.max(
      1,
      Math.round(total * 0.3 * 100) / 100
    );
    const startDate = addDays(now, -12);
    laybyeDocs.push({
      shopId: shop._id,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        price: it.price,
        total: it.total,
      })),
      totalAmount: total,
      amountPaid: deposit,
      balanceDue: Math.round((total - deposit) * 100) / 100,
      installments: [
        { amount: deposit, date: startDate, paymentMethod: "cash" },
      ],
      status: "active",
      startDate,
      dueDate: addDays(startDate, 30),
      reservedStock: false,
      notes: "Demo active laybye — deposit paid",
    });
  }

  // Active — mostly paid (easy final payment)
  {
    const customer = laybyeCustomers[1];
    const { items, total } = buildLineItems(pool, 1);
    const balance = Math.min(
      total - 1,
      Math.max(2, Math.round(total * 0.15 * 100) / 100)
    );
    const paid = Math.round((total - balance) * 100) / 100;
    const startDate = addDays(now, -20);
    laybyeDocs.push({
      shopId: shop._id,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        price: it.price,
        total: it.total,
      })),
      totalAmount: total,
      amountPaid: paid,
      balanceDue: balance,
      installments: [
        {
          amount: Math.round(paid * 0.6 * 100) / 100,
          date: startDate,
          paymentMethod: "cash",
        },
        {
          amount: Math.round(paid * 0.4 * 100) / 100,
          date: addDays(startDate, 8),
          paymentMethod: "mobile",
        },
      ],
      status: "active",
      startDate,
      dueDate: addDays(startDate, 30),
      reservedStock: false,
      notes: "Demo laybye nearly paid",
    });
  }

  // Active — mid payment
  {
    const customer = laybyeCustomers[2];
    const { items, total } = buildLineItems(pool, 2);
    const deposit = Math.max(
      2,
      Math.round(total * 0.45 * 100) / 100
    );
    const startDate = addDays(now, -6);
    laybyeDocs.push({
      shopId: shop._id,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        price: it.price,
        total: it.total,
      })),
      totalAmount: total,
      amountPaid: deposit,
      balanceDue: Math.round((total - deposit) * 100) / 100,
      installments: [
        { amount: deposit, date: startDate, paymentMethod: "cash" },
      ],
      status: "active",
      startDate,
      dueDate: addDays(startDate, 30),
      reservedStock: false,
    });
  }

  // Completed laybye + matching sale
  {
    const customer = laybyeCustomers[3];
    const { items, total, costTotal } = buildLineItems(pool, 1);
    const startDate = addDays(now, -40);
    const completedDate = addDays(now, -8);
    const [laybye] = await LayBye.create([
      {
        shopId: shop._id,
        customerId: customer._id,
        customerName: customer.name,
        customerPhone: customer.phone,
        items: items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          price: it.price,
          total: it.total,
        })),
        totalAmount: total,
        amountPaid: total,
        balanceDue: 0,
        installments: [
          {
            amount: Math.round(total * 0.4 * 100) / 100,
            date: startDate,
            paymentMethod: "cash",
          },
          {
            amount: Math.round(total * 0.6 * 100) / 100,
            date: completedDate,
            paymentMethod: "cash",
          },
        ],
        status: "completed",
        startDate,
        completedDate,
        dueDate: addDays(startDate, 30),
        reservedStock: false,
        notes: "Demo completed laybye",
      },
    ]);

    await Sale.create({
      shopId: shop._id,
      type: "completed_laybye",
      status: "completed",
      items,
      total,
      costTotal,
      profit: total - costTotal,
      amountPaid: total,
      balanceDue: 0,
      isCancelled: false,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      date: completedDate,
    });

    customer.totalSpent += total;
    customer.totalVisits += 1;
    if (!customer.firstPurchaseDate) customer.firstPurchaseDate = startDate;
    customer.lastPurchaseDate = completedDate;
    await customer.save();
  }

  if (laybyeDocs.length) {
    await LayBye.insertMany(laybyeDocs);
  }

  return {
    cancelledCount: cancelledDocs.length,
    laybyeCount: laybyeDocs.length + 1,
    cancelledDocs,
    activeLaybyes: laybyeDocs,
  };
}

/**
 * Build a browsable activity + chat transcript for demo /app.
 * Caps volume so history stays readable while covering real seeded work.
 */
async function seedDemoActivityLog({
  shop,
  products,
  salesDocs,
  expenseDocs,
  sector,
  featureExtras,
}) {
  const ActivityLog = (await import("../models/ActivityLog.js")).default;
  const actor = shop.username;
  const logs = [];

  const push = (row) => {
    logs.push({
      shopId: shop._id,
      actorId: actor,
      channel: row.channel || "system",
      action: row.action,
      entityType: row.entityType || null,
      entityId: row.entityId != null ? String(row.entityId) : null,
      summary: row.summary,
      metadata: row.metadata || {},
      requestId: null,
      createdAt: row.createdAt,
    });
  };

  push({
    channel: "system",
    action: "demo.seeded",
    summary: `Demo shop ready — ${sector.businessName} (@${shop.username})`,
    metadata: { sector: sector.id },
    createdAt: shop.registeredAt || shop.createdAt || new Date(),
  });

  // Catalog setup as chat-style turns (web)
  for (const p of products.slice(0, 6)) {
    const createdAt = addDays(shop.registeredAt || new Date(), rand(0, 3));
    const input = `add ${/\s/.test(p.name) ? `"${p.name}"` : p.name} ${Number(
      p.price
    ).toFixed(2)} cost ${Number(p.costPrice || 0).toFixed(2)} stock ${p.stock}`;
    const reply = `Product added!\n\nName: ${p.name}\nPrice: $${Number(
      p.price
    ).toFixed(2)}\nStock: ${p.stock}`;
    push({
      channel: "web",
      action: "chat.turn",
      entityType: "chat",
      summary: `→ ${input} · ← ${reply}`.slice(0, 400),
      metadata: { input, reply, replyType: "text" },
      createdAt,
    });
  }

  // Recent sales → activity + chat sell turns (mix of channels)
  const recentSales = [...salesDocs]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-40);
  const channels = ["web", "telegram", "whatsapp"];

  for (let i = 0; i < recentSales.length; i++) {
    const sale = recentSales[i];
    const channel = channels[i % channels.length];
    const itemsText = sale.items
      .map((it) => {
        const name = /\s/.test(it.productName)
          ? `"${it.productName}"`
          : it.productName;
        return `${it.quantity} ${name}`;
      })
      .join(" ");
    const input =
      sale.type === "credit" && sale.customerName
        ? `credit sale to "${sale.customerName}" ${itemsText}`
        : `sell ${itemsText}`;
    const reply = [
      sale.type === "credit" ? "CREDIT SALE RECEIPT" : "CASH SALE RECEIPT",
      "",
      sale.customerName ? `Customer: ${sale.customerName}` : null,
      `Total: $${Number(sale.total).toFixed(2)}`,
      `Items: ${sale.items
        .map((it) => `${it.quantity}x ${it.productName}`)
        .join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");

    push({
      channel,
      action: "chat.turn",
      entityType: "chat",
      summary: `→ ${input} · ← ${reply}`.slice(0, 400),
      metadata: { input, reply, replyType: "text" },
      createdAt: sale.date,
    });

    push({
      channel,
      action: sale.type === "credit" ? "sale.credit" : "sale.cash",
      entityType: "sale",
      summary: `${sale.type} sale $${Number(sale.total).toFixed(2)}${
        sale.customerName ? ` · ${sale.customerName}` : ""
      }`,
      metadata: {
        total: sale.total,
        type: sale.type,
        items: sale.items.map((it) => ({
          name: it.productName,
          quantity: it.quantity,
        })),
      },
      createdAt: sale.date,
    });
  }

  const recentExpenses = [...expenseDocs]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-20);
  for (const exp of recentExpenses) {
    const input = `expense ${Number(exp.amount).toFixed(2)} "${exp.description}"`;
    const reply = `EXPENSE RECORDED\n\nAmount: $${Number(exp.amount).toFixed(
      2
    )}\nDescription: ${exp.description}`;
    push({
      channel: "web",
      action: "chat.turn",
      entityType: "chat",
      summary: `→ ${input} · ← ${reply}`.slice(0, 400),
      metadata: { input, reply, replyType: "text" },
      createdAt: exp.date,
    });
    push({
      channel: "web",
      action: "expense.recorded",
      entityType: "expense",
      summary: `Expense $${Number(exp.amount).toFixed(2)} · ${exp.description}`,
      metadata: { amount: exp.amount, description: exp.description },
      createdAt: exp.date,
    });
  }

  // Refunds / cancellations for Sales page demo
  for (const sale of featureExtras?.cancelledDocs || []) {
    push({
      channel: "web",
      action: "sale.cancelled",
      entityType: "sale",
      summary: `Cancelled $${Number(sale.total).toFixed(2)}${
        sale.customerName ? ` · ${sale.customerName}` : ""
      } — ${sale.cancellationReason}`,
      metadata: {
        total: sale.total,
        reason: sale.cancellationReason,
        type: sale.type,
      },
      createdAt: sale.cancelledAt || sale.date,
    });
  }

  // Laybye chat turns so Activity shows the new flows
  for (const lb of featureExtras?.activeLaybyes || []) {
    const itemsText = (lb.items || [])
      .map((it) => {
        const name = /\s/.test(it.productName)
          ? `"${it.productName}"`
          : it.productName;
        return `${it.quantity} ${name}`;
      })
      .join(" ");
    const input = `laybye "${lb.customerName}" ${itemsText} deposit ${Number(
      lb.amountPaid
    ).toFixed(2)}`;
    const reply = `LAYBYE CREATED\n\nCustomer: ${lb.customerName}\nTotal: $${Number(
      lb.totalAmount
    ).toFixed(2)}\nDeposit: $${Number(lb.amountPaid).toFixed(
      2
    )}\nBalance: $${Number(lb.balanceDue).toFixed(2)}`;
    push({
      channel: "web",
      action: "chat.turn",
      entityType: "chat",
      summary: `→ ${input} · ← ${reply}`.slice(0, 400),
      metadata: { input, reply, replyType: "text" },
      createdAt: lb.startDate || new Date(),
    });
    push({
      channel: "web",
      action: "laybye.created",
      entityType: "laybye",
      summary: `Laybye $${Number(lb.totalAmount).toFixed(2)} · ${lb.customerName} · balance $${Number(
        lb.balanceDue
      ).toFixed(2)}`,
      metadata: {
        total: lb.totalAmount,
        balanceDue: lb.balanceDue,
        customerName: lb.customerName,
      },
      createdAt: lb.startDate || new Date(),
    });
  }

  // Closing report turns so /app ends on something useful
  const top = products.slice(0, 3).map((p) => p.name).join(", ");
  const reportAt = new Date();
  reportAt.setHours(reportAt.getHours() - 2);
  for (const [input, reply, channel] of [
    [
      "list",
      `PRODUCT LIST\n\n${products
        .slice(0, 5)
        .map((p) => `• ${p.name} - $${Number(p.price).toFixed(2)} (stock ${p.stock})`)
        .join("\n")}\n…`,
      "telegram",
    ],
    [
      "daily",
      `FINANCIAL REPORT - TODAY\n\nDemo snapshot for ${sector.businessName}.\nRecent sales, laybyes, and refunds are loaded — explore Products, Sales, and Settings.`,
      "web",
    ],
    [
      "best",
      `BEST SELLERS\n\nTop movers include: ${top}.\nOpen Reports for the full picture.`,
      "whatsapp",
    ],
    [
      "cancel refunds",
      `REFUNDS REPORT\n\n${featureExtras?.cancelledCount || 0} cancellations seeded for this demo.\nOpen Sales → Refunds / cancellations.`,
      "web",
    ],
  ]) {
    push({
      channel,
      action: "chat.turn",
      entityType: "chat",
      summary: `→ ${input} · ← ${reply}`.slice(0, 400),
      metadata: { input, reply, replyType: "text" },
      createdAt: reportAt,
    });
  }

  logs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const BATCH = 200;
  for (let i = 0; i < logs.length; i += BATCH) {
    await ActivityLog.insertMany(logs.slice(i, i + BATCH));
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB\nSeeding sector demos…\n");

  // Drop legacy unique indexes that block multiple shops / web sessions
  const { dropLegacyAuthIndexes } = await import("../utils/dropLegacyIndexes.js");
  await dropLegacyAuthIndexes(mongoose.connection.db);

  for (const sector of DEMO_SECTORS) {
    await seedSector(sector);
  }

  console.log("\nSeed complete — PIN for all demos: 4829");
  console.log("Try demo picker will list these sectors.\n");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
