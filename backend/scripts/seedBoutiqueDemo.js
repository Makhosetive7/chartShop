/**
 * Seed a women's clothing boutique with ~2 years of light weekly traffic.
 *
 * Usage (from backend/):
 *   node scripts/seedBoutiqueDemo.js
 *
 * Login afterwards:
 *   username: boutique_demo
 *   pin:      4829
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Shop from "../models/Shop.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import Sale from "../models/Sale.js";
import Expense from "../models/Expense.js";

const USER_ID = "boutique_demo";
const PIN = "4829";
const BUSINESS_NAME = "Luna Atelier";
const YEARS = 2;
const SALES_PER_WEEK_MIN = 3;
const SALES_PER_WEEK_MAX = 4;

const CATALOG = [
  { name: "Floral Midi Dress", price: 45, costPrice: 22, stock: 40 },
  { name: "Linen Blouse", price: 28, costPrice: 12, stock: 55 },
  { name: "Wide-Leg Trousers", price: 38, costPrice: 18, stock: 35 },
  { name: "Denim Jacket", price: 52, costPrice: 26, stock: 25 },
  { name: "Pleated Skirt", price: 32, costPrice: 14, stock: 40 },
  { name: "Knit Cardigan", price: 36, costPrice: 16, stock: 30 },
  { name: "Silk Scarf", price: 18, costPrice: 7, stock: 60 },
  { name: "Crossbody Bag", price: 55, costPrice: 28, stock: 20 },
  { name: "Block Heels", price: 48, costPrice: 24, stock: 22 },
  { name: "Statement Earrings", price: 15, costPrice: 5, stock: 80 },
  { name: "Wrap Top", price: 26, costPrice: 11, stock: 45 },
  { name: "High-Waist Jeans", price: 42, costPrice: 20, stock: 38 },
];

const CUSTOMERS = [
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
  const dayOffset = rand(0, 5); // Mon–Sat feel
  const hour = rand(9, 17);
  const minute = rand(0, 59);
  const d = addDays(weekStart, dayOffset);
  d.setHours(hour, minute, rand(0, 59), 0);
  return d;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const existingUser = await (await import("../models/User.js")).default.findOne({
    username: USER_ID,
  });
  if (existingUser) {
    const shopId = existingUser.shopId;
    await Promise.all([
      Sale.deleteMany({ shopId }),
      Expense.deleteMany({ shopId }),
      Product.deleteMany({ shopId }),
      Customer.deleteMany({ shopId }),
      (await import("../models/User.js")).default.deleteMany({ shopId }),
      Shop.deleteOne({ _id: shopId }),
    ]);
    console.log("Removed previous boutique_demo shop data");
  }

  const hashedPin = await bcrypt.hash(PIN, 12);
  const registeredAt = addDays(new Date(), -(YEARS * 365 + 14));

  const shop = await Shop.create({
    businessName: BUSINESS_NAME,
    businessDescription:
      "Women's clothing boutique — dresses, separates, and accessories.",
    isActive: true,
    isDemo: true,
    demoSector: "clothing",
    registeredAt,
    createdAt: registeredAt,
    settings: {
      currency: "USD",
      timezone: "Africa/Harare",
      lowStockAlert: 8,
    },
  });

  const User = (await import("../models/User.js")).default;
  await User.create({
    shopId: shop._id,
    username: USER_ID,
    displayName: BUSINESS_NAME,
    pin: hashedPin,
    role: "admin",
    channels: {},
    isActive: true,
    removedAt: null,
    createdAt: registeredAt,
  });

  const products = await Product.insertMany(
    CATALOG.map((p) => ({
      shopId: shop._id,
      ...p,
      lowStockThreshold: 5,
      trackStock: true,
      isActive: true,
      createdAt: registeredAt,
    }))
  );

  const customers = await Customer.insertMany(
    CUSTOMERS.map((c, i) => ({
      shopId: shop._id,
      name: c.name,
      phone: c.phone,
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
  // Align to Monday-ish for week loops
  const day = start.getDay();
  const toMonday = day === 0 ? -6 : 1 - day;
  let weekStart = addDays(start, toMonday);

  const now = new Date();
  const salesDocs = [];
  const expenseDocs = [];
  let saleCount = 0;

  while (weekStart < now) {
    const salesThisWeek = rand(SALES_PER_WEEK_MIN, SALES_PER_WEEK_MAX);
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
        if (isCredit) {
          customer.currentBalance += total;
        }
      }
    }

    // Occasional weekly expense (rent slice / packaging / transport)
    if (Math.random() < 0.7) {
      expenseDocs.push({
        shopId: shop._id,
        amount: rand(15, 45),
        description: pick([
          "Packaging & tissue",
          "Market table rental",
          "Transport to market",
          "Social media boost",
          "Alterations thread & notions",
        ]),
        category: pick([
          "packaging",
          "market_fees",
          "transport",
          "marketing",
          "other",
        ]),
        paymentMethod: "cash",
        date: addDays(weekStart, rand(0, 4)),
      });
    }

    weekStart = addDays(weekStart, 7);
  }

  // Insert in batches
  const BATCH = 200;
  for (let i = 0; i < salesDocs.length; i += BATCH) {
    await Sale.insertMany(salesDocs.slice(i, i + BATCH));
  }
  if (expenseDocs.length) {
    await Expense.insertMany(expenseDocs);
  }

  for (const c of customers) {
    await c.save();
  }

  // Soft stock drawdown so inventory looks used
  for (const p of products) {
    const sold = salesDocs.reduce((sum, s) => {
      const line = s.items.find(
        (it) => String(it.productId) === String(p._id)
      );
      return sum + (line?.quantity || 0);
    }, 0);
    p.stock = Math.max(3, (p.stock || 40) - Math.floor(sold * 0.15));
    await p.save();
  }

  console.log("\nSeed complete");
  console.log("────────────────────────────");
  console.log(`Shop:     ${BUSINESS_NAME}`);
  console.log(`Username: ${USER_ID}`);
  console.log(`PIN:      ${PIN}`);
  console.log(`Products: ${products.length}`);
  console.log(`Customers:${customers.length}`);
  console.log(`Sales:    ${saleCount} (~${YEARS} years, ${SALES_PER_WEEK_MIN}-${SALES_PER_WEEK_MAX}/week)`);
  console.log(`Expenses: ${expenseDocs.length}`);
  console.log("────────────────────────────");
  console.log("Web login: http://localhost:5173/login");
  console.log("────────────────────────────\n");

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
