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

async function wipeShopByUsername(username) {
  const existing = await Shop.findOne({ username });
  if (!existing) return;
  const shopId = existing._id;
  const ActivityLog = (await import("../models/ActivityLog.js")).default;
  await Promise.all([
    Sale.deleteMany({ shopId }),
    Expense.deleteMany({ shopId }),
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

  const products = await Product.insertMany(
    sector.catalog.map((p) => ({
      shopId: shop._id,
      ...p,
      lowStockThreshold: Math.max(3, Math.floor((p.stock || 20) * 0.15)),
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

      const itemCount = rand(1, 3);
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

  await seedDemoActivityLog({
    shop,
    products,
    salesDocs,
    expenseDocs,
    sector,
  });

  console.log(
    `✓ ${sector.id.padEnd(12)} ${sector.businessName} (@${sector.username}) — ${products.length} products, ${saleCount} sales`
  );
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
      `FINANCIAL REPORT - TODAY\n\nDemo snapshot for ${sector.businessName}.\nRecent sales and expenses are loaded — explore Products, Sales, and Reports.`,
      "web",
    ],
    [
      "best",
      `BEST SELLERS\n\nTop movers include: ${top}.\nOpen Reports for the full picture.`,
      "whatsapp",
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
