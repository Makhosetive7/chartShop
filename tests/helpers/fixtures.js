import bcrypt from "bcryptjs";
import Shop from "../../models/Shop.js";
import Product from "../../models/Product.js";
import Customer from "../../models/Customer.js";

let counter = 0;

export function uniqueTelegramId(prefix = "p4") {
  counter += 1;
  return `${prefix}_${Date.now()}_${counter}`;
}

export async function createTestShop(overrides = {}) {
  const telegramId = overrides.telegramId || uniqueTelegramId();
  const pin = overrides.pin || "4829";
  const hashedPin = await bcrypt.hash(pin, 10);

  const shop = await Shop.create({
    telegramId,
    businessName: overrides.businessName || "Phase4 Test Shop",
    businessDescription:
      overrides.businessDescription ||
      "Phase four golden path test shop description",
    pin: hashedPin,
    isActive: true,
    settings: {
      currency: "USD",
      timezone: overrides.timezone || "Africa/Harare",
      lowStockAlert: 10,
      ...(overrides.settings || {}),
    },
  });

  return { shop, telegramId, pin };
}

export async function createTestProduct(shopId, overrides = {}) {
  return Product.create({
    shopId,
    name: overrides.name || "p4bread",
    price: overrides.price ?? 2.5,
    costPrice: overrides.costPrice ?? null,
    stock: overrides.stock ?? 10,
    lowStockThreshold: overrides.lowStockThreshold ?? 2,
    trackStock: overrides.trackStock ?? true,
    isActive: true,
  });
}

export async function createTestCustomer(shopId, overrides = {}) {
  return Customer.create({
    shopId,
    name: overrides.name || "Phase4 Cust",
    phone: overrides.phone || `555${Date.now().toString().slice(-7)}`,
    email: overrides.email || "",
    currentBalance: overrides.currentBalance ?? 0,
    isActive: true,
  });
}
