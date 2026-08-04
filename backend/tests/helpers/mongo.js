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

export async function connectTestDb() {
  const uri = testMongoUri();
  if (mongoose.connection.readyState === 1) {
    return uri;
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
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
export async function wipeShopData({ shopId, telegramId } = {}) {
  const Product = (await import("../../models/Product.js")).default;
  const Sale = (await import("../../models/Sale.js")).default;
  const Customer = (await import("../../models/Customer.js")).default;
  const Shop = (await import("../../models/Shop.js")).default;
  const Expense = (await import("../../models/Expense.js")).default;

  if (shopId) {
    await Promise.all([
      Product.deleteMany({ shopId }),
      Sale.deleteMany({ shopId }),
      Customer.deleteMany({ shopId }),
      Expense.deleteMany({ shopId }),
      Shop.deleteOne({ _id: shopId }),
    ]);
  }

  if (telegramId) {
    await mongoose.connection.db
      .collection("authsessions")
      .deleteMany({ telegramId });
    await Shop.deleteMany({ telegramId });
  }
}
