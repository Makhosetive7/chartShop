/**
 * Seed a writable test shop for credit due dates, notifications, and alerts.
 *
 * Usage (from backend/):
 *   npm run seed:test
 *
 * Login:
 *   username: test
 *   pin:      1797
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Shop from "../models/Shop.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import Sale from "../models/Sale.js";
import Expense from "../models/Expense.js";
import LayBye from "../models/LayBye.js";
import Order from "../models/Order.js";
import ActivityLog from "../models/ActivityLog.js";
import {
  addYmdDays,
  getZonedYmd,
  zonedLocalToUtc,
  DEFAULT_TIMEZONE,
} from "../utils/dateBounds.js";
import {
  buildDefaultVariant,
  syncProductMirrors,
} from "../utils/productVariants.js";

const USERNAME = "test";
const PIN = "1797";
const BUSINESS_NAME = "Test Spaza";

const CATALOG = [
  { name: "Bread", price: 1.5, costPrice: 0.8, stock: 80 },
  { name: "Milk 1L", price: 2.2, costPrice: 1.4, stock: 40 },
  { name: "Airtime 10", price: 10, costPrice: 9.5, stock: 100 },
  { name: "Sugar 2kg", price: 3.8, costPrice: 2.6, stock: 35 },
  { name: "Cooking oil", price: 5.5, costPrice: 3.9, stock: 24 },
];

function dueAtOffset(daysFromToday) {
  const today = getZonedYmd(new Date(), DEFAULT_TIMEZONE);
  const ymd = addYmdDays(today, daysFromToday);
  return zonedLocalToUtc(
    ymd.year,
    ymd.month,
    ymd.day,
    0,
    0,
    0,
    0,
    DEFAULT_TIMEZONE
  );
}

function saleTime(daysAgo) {
  const date = dueAtOffset(-daysAgo);
  return new Date(date.getTime() + 10 * 60 * 60 * 1000);
}

function lineFromProduct(product, quantity) {
  const price = Number(product.price);
  const cost = Number(product.costPrice || 0);
  const variant = product.variants?.[0];
  return {
    productId: product._id,
    productName: product.name,
    variantId: variant?._id || null,
    variantLabel: variant?.label || "",
    packId: variant?.packs?.[0]?._id || null,
    packLabel: variant?.packs?.[0]?.label || "",
    unitsPerPack: 1,
    baseUnitsDeducted: quantity,
    quantity,
    price,
    standardPrice: price,
    isCustomPrice: false,
    costPrice: cost,
    costTotal: quantity * cost,
    total: quantity * price,
  };
}

async function wipeTestShop() {
  const existingUser = await User.findOne({ username: USERNAME });
  let shopId = existingUser?.shopId;
  if (!shopId) {
    const existing = await Shop.findOne({ businessName: BUSINESS_NAME });
    if (!existing) return;
    shopId = existing._id;
  }
  await Promise.all([
    Sale.deleteMany({ shopId }),
    Expense.deleteMany({ shopId }),
    LayBye.deleteMany({ shopId }),
    Order.deleteMany({ shopId }),
    Product.deleteMany({ shopId }),
    Customer.deleteMany({ shopId }),
    ActivityLog.deleteMany({ shopId }),
    User.deleteMany({ shopId }),
    Shop.deleteOne({ _id: shopId }),
  ]);
  console.log("Removed previous test shop data");
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
  await wipeTestShop();

  const hashedPin = await bcrypt.hash(PIN, 12);
  const registeredAt = saleTime(40);

  const shop = await Shop.create({
    businessName: BUSINESS_NAME,
    businessDescription:
      "Writable test shop for credit due dates, notifications, and chase alerts.",
    isActive: true,
    isDemo: false,
    registeredAt,
    createdAt: registeredAt,
    settings: {
      currency: "USD",
      timezone: DEFAULT_TIMEZONE,
      lowStockAlert: 8,
    },
  });

  await User.create({
    shopId: shop._id,
    username: USERNAME,
    displayName: "Test Admin",
    pin: hashedPin,
    role: "admin",
    channels: {},
    isActive: true,
    removedAt: null,
    createdAt: registeredAt,
  });

  const products = [];
  for (const entry of CATALOG) {
    const variant = buildDefaultVariant({
      price: entry.price,
      costPrice: entry.costPrice,
      stock: entry.stock,
      lowStockThreshold: 6,
    });
    const doc = {
      shopId: shop._id,
      name: entry.name,
      price: entry.price,
      costPrice: entry.costPrice,
      stock: entry.stock,
      lowStockThreshold: 6,
      trackStock: true,
      variants: [variant],
      isActive: true,
      createdAt: registeredAt,
    };
    syncProductMirrors(doc);
    products.push(await Product.create(doc));
  }

  const [bread, milk, airtime, sugar, oil] = products;

  const customerSeeds = [
    { name: "Thabo Ncube", phone: "0772002001" },
    { name: "Jane Moyo", phone: "0772002002" },
    { name: "Sam Dube", phone: "0772002003" },
    { name: "Rudo Sibanda", phone: "0772002004" },
    { name: "Nomsa Chari", phone: "0772002005" },
    { name: "Farai Mutasa", phone: "0772002006" },
    { name: "Chipo Mhlanga", phone: "0772002007" },
    { name: "Tendai Zhou", phone: "0772002008" },
  ];

  const customers = await Customer.insertMany(
    customerSeeds.map((c, i) => ({
      shopId: shop._id,
      name: c.name,
      phone: c.phone,
      email: "",
      totalSpent: 0,
      totalVisits: 0,
      currentBalance: 0,
      loyaltyPoints: 0,
      isActive: true,
      creditTransactions: [],
      createdAt: saleTime(30 - i),
    }))
  );

  const [
    thabo,
    jane,
    sam,
    rudo,
    nomsa,
    farai,
    chipo,
    tendai,
  ] = customers;

  const scenarios = [
    {
      customer: thabo,
      product: airtime,
      qty: 2,
      dueOffset: -6,
      saleAgo: 12,
    },
    {
      customer: jane,
      product: bread,
      qty: 4,
      dueOffset: -3,
      saleAgo: 8,
    },
    {
      customer: sam,
      product: oil,
      qty: 1,
      dueOffset: -15,
      saleAgo: 20,
    },
    {
      customer: rudo,
      product: milk,
      qty: 3,
      dueOffset: 0,
      saleAgo: 7,
    },
    {
      customer: nomsa,
      product: sugar,
      qty: 2,
      dueOffset: 1,
      saleAgo: 5,
    },
    {
      customer: farai,
      product: bread,
      qty: 6,
      dueOffset: 7,
      saleAgo: 2,
    },
    {
      customer: chipo,
      product: airtime,
      qty: 1,
      dueOffset: -30,
      saleAgo: 35,
    },
  ];

  for (const row of scenarios) {
    const items = [lineFromProduct(row.product, row.qty)];
    const total = items.reduce((sum, item) => sum + item.total, 0);
    const costTotal = items.reduce((sum, item) => sum + item.costTotal, 0);
    const date = saleTime(row.saleAgo);
    const dueDate = dueAtOffset(row.dueOffset);

    await Sale.create({
      shopId: shop._id,
      type: "credit",
      customerId: row.customer._id,
      customerName: row.customer.name,
      customerPhone: row.customer.phone,
      items,
      total,
      costTotal,
      profit: total - costTotal,
      amountPaid: 0,
      balanceDue: total,
      dueDate,
      status: "completed",
      date,
    });

    row.customer.currentBalance += total;
    row.customer.totalSpent += total;
    row.customer.totalVisits += 1;
    row.customer.lastPurchaseDate = date;
    row.customer.creditTransactions.push({
      type: "credit",
      amount: total,
      description: `Credit sale: ${row.qty}x ${row.product.name}`,
      date,
      balanceBefore: row.customer.currentBalance - total,
      balanceAfter: row.customer.currentBalance,
      items: items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      })),
    });
    await row.customer.save();
  }

  // Paid-off credit sale — should not appear on Notifications.
  const paidItems = [lineFromProduct(milk, 1)];
  const paidTotal = paidItems[0].total;
  const paidDate = saleTime(18);
  await Sale.create({
    shopId: shop._id,
    type: "credit",
    customerId: tendai._id,
    customerName: tendai.name,
    customerPhone: tendai.phone,
    items: paidItems,
    total: paidTotal,
    costTotal: paidItems[0].costTotal,
    profit: paidTotal - paidItems[0].costTotal,
    amountPaid: 0,
    balanceDue: paidTotal,
    dueDate: dueAtOffset(-10),
    status: "completed",
    date: paidDate,
  });
  tendai.creditTransactions.push(
    {
      type: "credit",
      amount: paidTotal,
      description: "Credit sale: 1x Milk 1L",
      date: paidDate,
      balanceBefore: 0,
      balanceAfter: paidTotal,
      items: [
        {
          productName: "Milk 1L",
          quantity: 1,
          price: milk.price,
          total: paidTotal,
        },
      ],
    },
    {
      type: "payment",
      amount: paidTotal,
      description: "Settled in full",
      date: saleTime(11),
      balanceBefore: paidTotal,
      balanceAfter: 0,
      items: [],
    }
  );
  tendai.totalSpent += paidTotal;
  tendai.totalVisits += 1;
  tendai.currentBalance = 0;
  tendai.lastPurchaseDate = paidDate;
  await tendai.save();

  await Sale.create({
    shopId: shop._id,
    type: "cash",
    items: [lineFromProduct(bread, 2)],
    total: bread.price * 2,
    costTotal: bread.costPrice * 2,
    profit: bread.price * 2 - bread.costPrice * 2,
    amountPaid: bread.price * 2,
    balanceDue: 0,
    status: "completed",
    date: saleTime(1),
  });

  await ActivityLog.create([
    {
      shopId: shop._id,
      actorId: "system",
      channel: "system",
      action: "credit.reminder",
      summary: "Credit chase: 1 sale",
      entityType: "sale",
      metadata: { keys: ["due"] },
      createdAt: saleTime(1),
    },
    {
      shopId: shop._id,
      actorId: "system",
      channel: "system",
      action: "credit.reminder",
      summary: "Credit chase: 3 sales",
      entityType: "sale",
      metadata: { keys: ["overdue:3", "overdue:6", "overdue:15"] },
      createdAt: saleTime(0),
    },
  ]);

  const owing = await Customer.countDocuments({
    shopId: shop._id,
    currentBalance: { $gt: 0 },
  });
  const creditSales = await Sale.countDocuments({
    shopId: shop._id,
    type: "credit",
  });

  console.log("Seeded test shop");
  console.log(`  username: ${USERNAME}`);
  console.log(`  pin:      ${PIN}`);
  console.log(`  credit sales: ${creditSales}`);
  console.log(`  customers owing: ${owing}`);
  console.log(
    "  expected notifications: overdue (Thabo, Jane, Sam, Chipo), due today (Rudo), tomorrow (Nomsa), upcoming (Farai)"
  );

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
