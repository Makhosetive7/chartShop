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
  await Promise.all([
    Sale.deleteMany({ shopId }),
    Expense.deleteMany({ shopId }),
    Product.deleteMany({ shopId }),
    Customer.deleteMany({ shopId }),
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

  console.log(
    `✓ ${sector.id.padEnd(12)} ${sector.businessName} (@${sector.username}) — ${products.length} products, ${saleCount} sales`
  );
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB\nSeeding sector demos…\n");

  // Drop legacy unique indexes that block multiple shops with null channel ids
  for (const name of ["telegramId_1", "telegramChatId_1", "whatsappPhone_1"]) {
    try {
      await Shop.collection.dropIndex(name);
      console.log(`Dropped legacy index ${name}`);
    } catch {
      /* missing index is fine */
    }
  }

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
