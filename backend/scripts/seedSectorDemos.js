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
import Order from "../models/Order.js";
import { DEMO_SECTORS } from "../constants/demoSectors.js";
import {
  buildDefaultPack,
  buildDefaultVariant,
  syncProductMirrors,
} from "../utils/productVariants.js";

const PAYMENT_METHODS = ["cash", "bank", "mobile", "cash", "mobile"];

function normalizeExpenseTemplate(entry) {
  if (typeof entry === "string") {
    return {
      description: entry,
      category: "other",
      amount: [15, 45],
    };
  }
  return {
    description: entry.description || "Operating expense",
    category: entry.category || "other",
    amount: Array.isArray(entry.amount) ? entry.amount : [15, 45],
  };
}

function buildExpenseDoc(shopId, template, date) {
  const [minAmt, maxAmt] = template.amount;
  const amount =
    Math.round((minAmt + Math.random() * (maxAmt - minAmt)) * 100) / 100;
  return {
    shopId,
    amount,
    description: template.description,
    category: template.category,
    paymentMethod: pick(PAYMENT_METHODS),
    date,
  };
}

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

/**
 * Map a catalog entry (flat or variants/packs) into a Product insert doc.
 * Nested _ids are assigned on insert so sale lines can reference them.
 */
function catalogEntryToProductDoc(shopId, entry, { threshold, createdAt }) {
  const trackStock = entry.trackStock !== false;

  if (Array.isArray(entry.variants) && entry.variants.length > 0) {
    const variants = entry.variants.map((v, i) => {
      const unitPrice = Number(v.price);
      const unitCost =
        v.costPrice === undefined || v.costPrice === null
          ? null
          : Number(v.costPrice);
      const packs =
        Array.isArray(v.packs) && v.packs.length > 0
          ? v.packs.map((pk, pi) =>
              buildDefaultPack({
                label: pk.label,
                unitsPerPack: pk.unitsPerPack,
                price: pk.price,
                costPrice: pk.costPrice,
                sortOrder: pk.sortOrder ?? pi,
              })
            )
          : undefined;
      return buildDefaultVariant({
        label: v.label ?? "",
        baseUnit: v.baseUnit || "piece",
        price: unitPrice,
        costPrice: unitCost,
        stock: trackStock === false || v.trackStock === false ? 0 : v.stock ?? 0,
        lowStockThreshold: v.lowStockThreshold ?? threshold,
        trackStock: trackStock && v.trackStock !== false,
        sortOrder: v.sortOrder ?? i,
        packs,
      });
    });

    const doc = {
      shopId,
      name: entry.name,
      price: variants[0].price,
      costPrice: variants[0].costPrice,
      stock: 0,
      lowStockThreshold: threshold,
      trackStock,
      variants,
      isActive: true,
      createdAt,
    };
    syncProductMirrors(doc);
    return doc;
  }

  return {
    shopId,
    name: entry.name,
    price: entry.price,
    costPrice: entry.costPrice ?? null,
    stock: trackStock ? entry.stock ?? 0 : 0,
    lowStockThreshold: threshold,
    trackStock,
    isActive: true,
    createdAt,
  };
}

function activeVariantList(product) {
  return (product.variants || []).filter((v) => v && v.isActive !== false);
}

function activePackList(variant) {
  return (variant.packs || []).filter((p) => p && p.isActive !== false);
}

/** Prefer Single packs most of the time; occasionally sell a crate/tray/box. */
function pickPack(variant) {
  const packs = activePackList(variant);
  if (!packs.length) return null;
  const multi = packs.filter((p) => (p.unitsPerPack || 1) > 1);
  if (multi.length && Math.random() < 0.28) return pick(multi);
  return packs.find((p) => (p.unitsPerPack || 1) === 1) || packs[0];
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

    const variants = activeVariantList(product);
    const variant = variants.length ? pick(variants) : null;
    const pack = variant ? pickPack(variant) : null;

    const quantity = rand(1, 2);
    const unitsPerPack = pack?.unitsPerPack || 1;
    const price = pack?.price ?? variant?.price ?? product.price;
    const packCost =
      pack?.costPrice != null
        ? Number(pack.costPrice)
        : variant?.costPrice != null
          ? Number(variant.costPrice) * unitsPerPack
          : Number(product.costPrice || 0);
    const lineTotal = quantity * price;
    const lineCost = quantity * packCost;
    const baseUnitsDeducted = quantity * unitsPerPack;
    total += lineTotal;
    costTotal += lineCost;
    items.push({
      productId: product._id,
      productName: product.name,
      variantId: variant?._id || null,
      variantLabel: variant?.label || "",
      packId: pack?._id || null,
      packLabel: pack?.label || "",
      unitsPerPack,
      baseUnitsDeducted,
      quantity,
      price,
      standardPrice: price,
      isCustomPrice: false,
      costPrice: packCost,
      costTotal: lineCost,
      total: lineTotal,
    });
  }

  return { items, total, costTotal };
}

function laybyeItemsFromSaleItems(items) {
  return items.map((it) => ({
    productId: it.productId,
    productName: it.productName,
    variantId: it.variantId || null,
    variantLabel: it.variantLabel || "",
    packId: it.packId || null,
    packLabel: it.packLabel || "",
    unitsPerPack: it.unitsPerPack || 1,
    baseUnitsDeducted: it.baseUnitsDeducted ?? it.quantity,
    quantity: it.quantity,
    price: it.price,
    total: it.total,
  }));
}

function productTracksStock(product) {
  if (product.trackStock === false) return false;
  const variants = activeVariantList(product);
  if (!variants.length) return product.trackStock !== false;
  return variants.some((v) => v.trackStock !== false);
}

async function wipeShopByUsername(username) {
  const User = (await import("../models/User.js")).default;
  const existingUser = await User.findOne({ username });
  let shopId = existingUser?.shopId;
  if (!shopId) {
    // Pre-migration leftover
    const existing = await Shop.findOne({ username });
    if (!existing) return;
    shopId = existing._id;
  }
  const ActivityLog = (await import("../models/ActivityLog.js")).default;
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
  console.log(`Removed previous ${username}`);
}

async function seedSector(sector) {
  await wipeShopByUsername(sector.username);

  const User = (await import("../models/User.js")).default;
  const hashedPin = await bcrypt.hash(sector.pin, 12);
  const years = sector.years || 1;
  const registeredAt = addDays(new Date(), -(years * 365 + 14));
  const [salesMin, salesMax] = sector.salesPerWeek || [3, 4];

  const shop = await Shop.create({
    businessName: sector.businessName,
    businessDescription: sector.businessDescription,
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

  const adminUser = await User.create({
    shopId: shop._id,
    username: sector.username,
    displayName: sector.businessName,
    pin: hashedPin,
    role: "admin",
    channels: {},
    isActive: true,
    removedAt: null,
    createdAt: registeredAt,
  });

  const shopDefaultThreshold = sector.lowStockAlert ?? 10;
  const products = await Product.insertMany(
    sector.catalog.map((p) =>
      catalogEntryToProductDoc(shop._id, p, {
        threshold: shopDefaultThreshold,
        createdAt: registeredAt,
      })
    )
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
  const expenseTemplates = (sector.expenses || ["Operating expense"]).map(
    normalizeExpenseTemplate
  );
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

    // 1–2 expenses most weeks for a readable category mix on Expenses/Reports
    const expenseCount = Math.random() < 0.85 ? rand(1, 2) : 0;
    for (let e = 0; e < expenseCount; e++) {
      expenseDocs.push(
        buildExpenseDoc(
          shop._id,
          pick(expenseTemplates),
          addDays(weekStart, rand(0, 4))
        )
      );
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
    if (!productTracksStock(p)) continue;
    for (const v of activeVariantList(p)) {
      if (v.trackStock === false) continue;
      const soldBase = salesDocs.reduce((sum, s) => {
        return (
          sum +
          s.items
            .filter(
              (it) =>
                String(it.productId) === String(p._id) &&
                String(it.variantId || "") === String(v._id)
            )
            .reduce(
              (lineSum, it) =>
                lineSum + (it.baseUnitsDeducted ?? it.quantity ?? 0),
              0
            )
        );
      }, 0);
      v.stock = Math.max(3, (v.stock || 40) - Math.floor(soldBase * 0.15));
    }
    syncProductMirrors(p);
    await p.save();
  }

  // Leave 1–2 tracked variants at/near shop low-stock default for Settings + Products UI.
  const lowStockTargets = [];
  for (const p of products) {
    if (!productTracksStock(p)) continue;
    for (const v of activeVariantList(p)) {
      if (v.trackStock === false) continue;
      lowStockTargets.push({ product: p, variant: v });
    }
  }
  for (const { product, variant } of lowStockTargets.slice(0, 2)) {
    variant.stock = Math.max(
      0,
      Math.min(variant.stock, shopDefaultThreshold)
    );
    syncProductMirrors(product);
    await product.save();
  }

  const featureExtras = await seedLaybyesAndRefunds({
    shop,
    products,
    customers,
  });

  const orderExtras = await seedOrders({ shop, products, customers });
  featureExtras.orderCount = orderExtras.orderCount;
  featureExtras.orders = orderExtras.orders;

  await seedDemoActivityLog({
    shop,
    user: adminUser,
    products,
    salesDocs,
    expenseDocs,
    sector,
    featureExtras,
  });

  console.log(
    `✓ ${sector.id.padEnd(12)} ${sector.businessName} (@${sector.username}) — ${products.length} products, ${saleCount} sales, ${expenseDocs.length} expenses, ${orderExtras.orderCount} orders, ${featureExtras.cancelledCount} refunds, ${featureExtras.laybyeCount} laybyes`
  );
}

/**
 * Seed pickup/delivery orders across pending → ready → completed → cancelled.
 * Stock is only deducted on complete in live flow; completed demo orders do not
 * re-deduct (catalog stock already adjusted from sales history).
 */
async function seedOrders({ shop, products, customers }) {
  const trackedProducts = products.filter((p) => productTracksStock(p));
  const pool = trackedProducts.length ? trackedProducts : products;
  const now = new Date();
  const orderCustomers = [...customers];

  const specs = [
    { status: "pending", daysAgo: 1, orderType: "pickup", paymentStatus: "pending" },
    { status: "pending", daysAgo: 2, orderType: "pickup", paymentStatus: "partial", advance: 0.3 },
    { status: "pending", daysAgo: 0, orderType: "delivery", paymentStatus: "pending", deliveryFee: 3 },
    { status: "confirmed", daysAgo: 3, orderType: "pickup", paymentStatus: "partial", advance: 0.4 },
    { status: "ready", daysAgo: 1, orderType: "pickup", paymentStatus: "paid", advance: 1 },
    { status: "ready", daysAgo: 2, orderType: "delivery", paymentStatus: "paid", advance: 1, deliveryFee: 4 },
    { status: "completed", daysAgo: 5, orderType: "pickup", paymentStatus: "paid", advance: 1 },
    { status: "completed", daysAgo: 9, orderType: "pickup", paymentStatus: "paid", advance: 1 },
    { status: "completed", daysAgo: 14, orderType: "delivery", paymentStatus: "paid", advance: 1, deliveryFee: 3 },
    { status: "completed", daysAgo: 21, orderType: "pickup", paymentStatus: "paid", advance: 1 },
    { status: "cancelled", daysAgo: 7, orderType: "pickup", paymentStatus: "refunded", advance: 0.2 },
    { status: "cancelled", daysAgo: 12, orderType: "delivery", paymentStatus: "pending", deliveryFee: 3 },
  ];

  const orderDocs = [];
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const customer = orderCustomers[i % orderCustomers.length];
    const { items, total } = buildLineItems(pool, rand(1, 3));
    const deliveryFee = spec.deliveryFee || 0;
    const orderTotal = Math.round((total + deliveryFee) * 100) / 100;
    const advanceRatio = spec.advance ?? 0;
    const advancePayment =
      Math.round(orderTotal * advanceRatio * 100) / 100;

    const orderDate = addDays(now, -spec.daysAgo);
    orderDate.setHours(rand(9, 17), rand(0, 59), 0, 0);

    const doc = {
      shopId: shop._id,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: laybyeItemsFromSaleItems(items),
      total: orderTotal,
      status: spec.status,
      orderType: spec.orderType,
      pickupDate:
        spec.orderType === "pickup"
          ? addDays(orderDate, rand(0, 2))
          : null,
      deliveryAddress:
        spec.orderType === "delivery"
          ? pick([
              "12 Liberation Ave",
              "Flat 4, Samora Machel",
              "Site office — Borrowdale",
              "Behind main market stall",
            ])
          : null,
      deliveryFee,
      notes: pick([
        "Demo order — call on arrival",
        "Customer prefers afternoon pickup",
        "Leave with security if late",
        "",
      ]),
      orderDate,
      advancePayment,
      paymentStatus: spec.paymentStatus,
    };

    if (spec.status === "confirmed" || ["ready", "completed"].includes(spec.status)) {
      doc.confirmedAt = addDays(orderDate, 0);
      doc.confirmedAt.setHours(orderDate.getHours() + 1);
    }
    if (spec.status === "ready" || spec.status === "completed") {
      doc.readyAt = addDays(orderDate, spec.status === "completed" ? 1 : 0);
      doc.readyAt.setHours(orderDate.getHours() + 3);
    }
    if (spec.status === "completed") {
      doc.completedAt = addDays(orderDate, rand(1, 3));
      doc.completedAt.setHours(rand(10, 16), rand(0, 59), 0, 0);
    }
    if (spec.status === "cancelled") {
      doc.cancelledAt = addDays(orderDate, rand(0, 1));
      doc.cancelledAt.setHours(orderDate.getHours() + rand(1, 5));
      doc.notes = "Demo cancelled — customer no-show";
    }

    orderDocs.push(doc);
  }

  const inserted = await Order.insertMany(orderDocs);
  return { orderCount: inserted.length, orders: inserted };
}

/**
 * Seed cancelled sales (refunds UI) + active/completed laybyes (Sales page).
 */
async function seedLaybyesAndRefunds({ shop, products, customers }) {
  const trackedProducts = products.filter((p) => productTracksStock(p));
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
      items: laybyeItemsFromSaleItems(items),
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
      items: laybyeItemsFromSaleItems(items),
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
      items: laybyeItemsFromSaleItems(items),
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
        items: laybyeItemsFromSaleItems(items),
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
  user,
  products,
  salesDocs,
  expenseDocs,
  sector,
  featureExtras,
}) {
  const ActivityLog = (await import("../models/ActivityLog.js")).default;
  const actor = user?._id != null ? String(user._id) : sector.username;
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

  // Catalog setup as chat-style turns (web) — mention options/packs when rich
  for (const p of products.slice(0, 6)) {
    const createdAt = addDays(shop.registeredAt || new Date(), rand(0, 3));
    const variants = activeVariantList(p);
    const quoted = /\s/.test(p.name) ? `"${p.name}"` : p.name;
    let input;
    let reply;
    if (variants.length > 1) {
      const labels = variants.map((v) => v.label || "default").join(", ");
      input = `add ${quoted} with options ${labels}`;
      reply = `Product added!\n\nName: ${p.name}\nOptions: ${variants
        .map(
          (v) =>
            `${v.label || "—"} $${Number(v.price).toFixed(2)} (stock ${v.stock})`
        )
        .join(" · ")}`;
    } else {
      const packs = variants[0] ? activePackList(variants[0]) : [];
      const multi = packs.filter((pk) => (pk.unitsPerPack || 1) > 1);
      input = `add ${quoted} ${Number(p.price).toFixed(2)} cost ${Number(
        p.costPrice || 0
      ).toFixed(2)} stock ${p.stock}`;
      reply = `Product added!\n\nName: ${p.name}\nPrice: $${Number(
        p.price
      ).toFixed(2)}\nStock: ${p.stock}${
        multi.length
          ? `\nPacks: ${multi
              .map((pk) => `${pk.label}(${pk.unitsPerPack})`)
              .join(", ")}`
          : ""
      }`;
    }
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
        const bits = [String(it.quantity), name];
        if (it.variantLabel) bits.push(it.variantLabel);
        if (it.packLabel && (it.unitsPerPack || 1) > 1) {
          bits.push(it.packLabel.toLowerCase());
        }
        return bits.join(" ");
      })
      .join(" ");
    const input =
      sale.type === "credit" && sale.customerName
        ? `credit sale to "${sale.customerName}" ${itemsText} due 2030-01-15`
        : `sell ${itemsText}`;
    const reply = [
      sale.type === "credit" ? "CREDIT SALE RECEIPT" : "CASH SALE RECEIPT",
      "",
      sale.customerName ? `Customer: ${sale.customerName}` : null,
      `Total: $${Number(sale.total).toFixed(2)}`,
      `Items: ${sale.items
        .map((it) => {
          const opt = [it.variantLabel, it.packLabel]
            .filter(Boolean)
            .join(" / ");
          return `${it.quantity}x ${it.productName}${opt ? ` (${opt})` : ""}`;
        })
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
      metadata: {
        amount: exp.amount,
        description: exp.description,
        category: exp.category,
      },
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
        const bits = [String(it.quantity), name];
        if (it.variantLabel) bits.push(it.variantLabel);
        if (it.packLabel && (it.unitsPerPack || 1) > 1) {
          bits.push(it.packLabel.toLowerCase());
        }
        return bits.join(" ");
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

  // Orders — pending / ready / completed for Orders page + chat history
  for (const order of featureExtras?.orders || []) {
    const itemsText = (order.items || [])
      .map((it) => {
        const name = /\s/.test(it.productName)
          ? `"${it.productName}"`
          : it.productName;
        const bits = [String(it.quantity), name];
        if (it.variantLabel) bits.push(it.variantLabel);
        if (it.packLabel && (it.unitsPerPack || 1) > 1) {
          bits.push(it.packLabel.toLowerCase());
        }
        return bits.join(" ");
      })
      .join(" ");
    const input = `order "${order.customerName}" ${itemsText}${
      order.orderType === "delivery" ? " delivery" : ""
    }`;
    const reply = [
      "ORDER PLACED",
      "",
      `Customer: ${order.customerName}`,
      `Type: ${order.orderType}`,
      `Status: ${String(order.status).toUpperCase()}`,
      `Total: $${Number(order.total).toFixed(2)}`,
      `Items: ${(order.items || [])
        .map((it) => {
          const opt = [it.variantLabel, it.packLabel]
            .filter(Boolean)
            .join(" / ");
          return `${it.quantity}x ${it.productName}${opt ? ` (${opt})` : ""}`;
        })
        .join(", ")}`,
    ].join("\n");
    push({
      channel: pick(["web", "telegram", "whatsapp"]),
      action: "chat.turn",
      entityType: "chat",
      summary: `→ ${input} · ← ${reply}`.slice(0, 400),
      metadata: { input, reply, replyType: "text" },
      createdAt: order.orderDate || new Date(),
    });
    push({
      channel: "web",
      action: `order.${order.status}`,
      entityType: "order",
      entityId: order._id,
      summary: `Order ${order.status} $${Number(order.total).toFixed(2)} · ${
        order.customerName
      } · ${order.orderType}`,
      metadata: {
        total: order.total,
        status: order.status,
        orderType: order.orderType,
        customerName: order.customerName,
      },
      createdAt:
        order.completedAt ||
        order.cancelledAt ||
        order.readyAt ||
        order.orderDate ||
        new Date(),
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

  // Redacted host so operators know which cluster they're seeding
  let hostHint = "(unknown)";
  try {
    hostHint = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, "https://")).host;
  } catch {
    /* ignore */
  }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB @ ${hostHint}`);
  console.log("Seeding sector demos (wipes shared *_demo shops only)…\n");

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
