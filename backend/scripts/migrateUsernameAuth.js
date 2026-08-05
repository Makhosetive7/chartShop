/**
 * One-time migration: telegramId-based shops → username + channels.
 *
 * Usage (from backend/):
 *   node scripts/migrateUsernameAuth.js
 *
 * For each shop that still has legacy `telegramId` and no `username`:
 * - Derive a unique username from businessName (or shop_<id>)
 * - Move telegramId into channels.telegramChatId or channels.whatsappPhone
 * - Unset telegramId
 *
 * Also drops legacy AuthSession docs keyed only by telegramId (users re-login).
 */
import "dotenv/config";
import mongoose from "mongoose";

function slugify(name) {
  return String(name || "shop")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24) || "shop";
}

async function uniqueUsername(db, base) {
  let candidate = base.slice(0, 32);
  let n = 0;
  while (await db.collection("shops").findOne({ username: candidate })) {
    n += 1;
    const suffix = `_${n}`;
    candidate = `${base.slice(0, 32 - suffix.length)}${suffix}`;
  }
  return candidate;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const shops = db.collection("shops");

  const legacy = await shops
    .find({
      telegramId: { $exists: true },
      $or: [{ username: { $exists: false } }, { username: null }, { username: "" }],
    })
    .toArray();

  console.log(`Found ${legacy.length} legacy shop(s) to migrate`);

  for (const shop of legacy) {
    const rawId = String(shop.telegramId);
    const channels = { ...(shop.channels || {}) };

    if (rawId.startsWith("wa:")) {
      channels.whatsappPhone = channels.whatsappPhone || rawId.slice(3);
    } else {
      channels.telegramChatId = channels.telegramChatId || rawId;
    }

    const username = await uniqueUsername(db, slugify(shop.businessName));

    await shops.updateOne(
      { _id: shop._id },
      {
        $set: { username, channels },
        $unset: { telegramId: "" },
      }
    );
    console.log(`  ${shop._id} → @${username} channels=${JSON.stringify(channels)}`);
  }

  // Drop obsolete session index/docs that used telegramId as identity
  const sessions = db.collection("authsessions");
  const legacySessions = await sessions.deleteMany({
    telegramId: { $exists: true },
    channel: { $exists: false },
  });
  console.log(`Removed ${legacySessions.deletedCount} legacy auth session(s)`);

  try {
    await shops.dropIndex("telegramId_1");
    console.log("Dropped shops.telegramId_1 index");
  } catch {
    /* index may not exist */
  }

  try {
    await sessions.dropIndex("telegramId_1_type_1");
    console.log("Dropped authsessions.telegramId_1_type_1 index");
  } catch {
    /* index may not exist */
  }

  await mongoose.disconnect();
  console.log("Migration complete. Users should login with username + PIN.");
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
