import mongoose from "mongoose";

const DEFAULT_URI = "mongodb://127.0.0.1:27017/chartshop_phase4";

export function testMongoUri() {
  return (
    process.env.TEST_MONGODB_URI ||
    process.env.E2E_MONGODB_URI ||
    process.env.MONGODB_URI ||
    DEFAULT_URI
  );
}

/**
 * Old unique indexes on telegramId treat missing fields as null and break
 * username-based shops / per-channel sessions. Drop them once per DB.
 */
export async function dropLegacyAuthIndexes() {
  const db = mongoose.connection.db;
  if (!db) return;

  const drop = async (collection, name) => {
    try {
      await db.collection(collection).dropIndex(name);
      console.log(`[test-db] dropped ${collection}.${name}`);
    } catch (err) {
      if (err?.code !== 27 && err?.codeName !== "IndexNotFound") {
        // Ignore missing index; surface anything else
        if (!/index not found/i.test(String(err.message))) {
          console.warn(`[test-db] dropIndex ${collection}.${name}:`, err.message);
        }
      }
    }
  };

  await drop("shops", "telegramId_1");
  await drop("shops", "telegramId_1_isActive_1");
  await drop("authsessions", "telegramId_1");
  await drop("authsessions", "telegramId_1_type_1");

  // Ensure new schema indexes exist
  const Shop = (await import("../../models/Shop.js")).default;
  const AuthSession = (await import("../../models/AuthSession.js")).default;
  await Promise.all([Shop.syncIndexes(), AuthSession.syncIndexes()]);
}

export async function connectTestDb() {
  const uri = testMongoUri();
  if (mongoose.connection.readyState === 1) {
    await dropLegacyAuthIndexes();
    return uri;
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  await dropLegacyAuthIndexes();
  return uri;
}

export async function disconnectTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

/**
 * Delete docs for a shop + related auth sessions.
 */
export async function wipeShopData({
  shopId,
  username,
  telegramId,
  channelKey,
} = {}) {
  const Product = (await import("../../models/Product.js")).default;
  const Sale = (await import("../../models/Sale.js")).default;
  const Customer = (await import("../../models/Customer.js")).default;
  const Shop = (await import("../../models/Shop.js")).default;
  const Expense = (await import("../../models/Expense.js")).default;
  const AuthSession = (await import("../../models/AuthSession.js")).default;

  if (shopId) {
    await Promise.all([
      Product.deleteMany({ shopId }),
      Sale.deleteMany({ shopId }),
      Customer.deleteMany({ shopId }),
      Expense.deleteMany({ shopId }),
      AuthSession.deleteMany({ shopId }),
      Shop.deleteOne({ _id: shopId }),
    ]);
  }

  const uname = username || telegramId;
  if (uname) {
    await Shop.deleteMany({ username: String(uname).toLowerCase() });
  }

  if (channelKey) {
    await AuthSession.deleteMany({ channelKey: String(channelKey) });
  }

  // Legacy cleanup for old telegramId-keyed sessions during transition
  if (telegramId) {
    await mongoose.connection.db
      .collection("authsessions")
      .deleteMany({ telegramId: String(telegramId) });
  }
}
