import bcrypt from "bcryptjs";
import crypto from "crypto";
import Shop from "../../models/Shop.js";
import User from "../../models/User.js";
import Product from "../../models/Product.js";
import Customer from "../../models/Customer.js";

let counter = 0;

export function uniqueUsername(prefix = "shop") {
  counter += 1;
  const letters = String(prefix)
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, 8) || "shop";
  const suffix = `${Date.now().toString(36)}${counter}${crypto
    .randomBytes(2)
    .toString("hex")}`
    .replace(/[^a-z0-9]/g, "");
  // New policy: letters then trailing digits, max 15. Digits-only suffix keeps it valid.
  const digits = suffix.replace(/[^0-9]/g, "").slice(-6) || String(counter);
  return `${letters.slice(0, 15 - Math.min(digits.length, 6))}${digits}`.slice(
    0,
    15
  );
}

/** @deprecated Use uniqueUsername — kept for older test call sites. */
export function uniqueTelegramId(prefix = "p4") {
  return uniqueUsername(prefix);
}

export async function createTestShop(overrides = {}) {
  const username = normalizeOverrideUsername(
    overrides.username || overrides.telegramId
  );
  const pin = overrides.pin || "4829";
  const hashedPin = await bcrypt.hash(pin, 10);

  const channels = {
    telegramChatId: overrides.telegramChatId || null,
    whatsappPhone: overrides.whatsappPhone || null,
    ...(overrides.channels || {}),
  };

  // Convenience: if caller still passes telegramId as a chat id, link it.
  if (overrides.telegramId && !overrides.username && !channels.telegramChatId) {
    const raw = String(overrides.telegramId);
    if (raw.startsWith("wa:")) {
      channels.whatsappPhone = raw.slice(3);
    } else if (/^\d+$/.test(raw)) {
      channels.telegramChatId = raw;
    }
  }

  const shop = await Shop.create({
    businessName: overrides.businessName || "Phase4 Test Shop",
    businessDescription:
      overrides.businessDescription ||
      "Phase four golden path test shop description",
    isActive: true,
    isDemo: Boolean(overrides.isDemo),
    demoSector: overrides.demoSector || null,
    settings: {
      currency: "USD",
      timezone: overrides.timezone || "Africa/Harare",
      lowStockAlert: 10,
      ...(overrides.settings || {}),
    },
  });

  const user = await User.create({
    shopId: shop._id,
    username,
    displayName: overrides.displayName || username,
    pin: hashedPin,
    role: overrides.role || "admin",
    channels,
    isActive: true,
    removedAt: null,
  });

  return {
    shop,
    user,
    username: user.username,
    telegramId: user.username, // legacy alias used by older tests
    pin,
  };
}

function normalizeOverrideUsername(value) {
  // Tests may still create grandfathered shops with underscores via Shop.create.
  if (value && /^[a-z0-9_]{3,32}$/i.test(String(value))) {
    return String(value).toLowerCase();
  }
  return uniqueUsername();
}

export async function createTestProduct(shopId, overrides = {}) {
  const price = overrides.price ?? 2.5;
  const costPrice = overrides.costPrice ?? null;
  const stock = overrides.stock ?? 10;
  const lowStockThreshold = overrides.lowStockThreshold ?? 2;
  const trackStock = overrides.trackStock ?? true;
  const name = overrides.name || "p4bread";

  return Product.create({
    shopId,
    name,
    price,
    costPrice,
    stock,
    lowStockThreshold,
    trackStock,
    isActive: true,
    ...(overrides.variants
      ? { variants: overrides.variants }
      : {}),
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
