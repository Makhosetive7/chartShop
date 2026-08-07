/**
 * One-time migration: Shop credentials → User (admin).
 *
 * Usage (from backend/):
 *   node --env-file=.env scripts/migrateUsersFromShops.js
 *
 * For each shop that still has legacy username+pin and no User yet:
 * - Create an admin User with those credentials/channels/lockout fields
 * - Unset credential fields from the Shop document
 * - Delete login sessions (users must re-login)
 */
import "dotenv/config";
import mongoose from "mongoose";

const LEGACY_UNSET = {
  username: "",
  pin: "",
  channels: "",
  loginAttempts: "",
  lockedUntil: "",
  lastLogin: "",
  lastLogout: "",
};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const shops = db.collection("shops");
  const users = db.collection("users");
  const sessions = db.collection("authsessions");

  // Drop BEFORE unsetting credentials — unique username_1 treats missing as null
  // and fails on the second shop with E11000 dup key { username: null }.
  for (const name of [
    "username_1",
    "channels.telegramChatId_1",
    "channels.whatsappPhone_1",
  ]) {
    try {
      await shops.dropIndex(name);
      console.log(`Dropped shops.${name}`);
    } catch {
      /* index may not exist */
    }
  }

  await users.createIndex({ username: 1 }, { unique: true });
  await users.createIndex({ shopId: 1, isActive: 1 });

  const legacy = await shops
    .find({
      username: { $exists: true, $nin: [null, ""] },
      pin: { $exists: true, $nin: [null, ""] },
    })
    .toArray();

  console.log(`Found ${legacy.length} shop(s) with legacy credentials`);

  let created = 0;
  let skipped = 0;

  for (const shop of legacy) {
    const existing = await users.findOne({ shopId: shop._id });
    if (existing) {
      await shops.updateOne({ _id: shop._id }, { $unset: LEGACY_UNSET });
      skipped += 1;
      console.log(`  ${shop._id} already has user @${existing.username} — unset shop credentials`);
      continue;
    }

    const username = String(shop.username).toLowerCase().trim();
    const taken = await users.findOne({ username });
    if (taken) {
      console.warn(
        `  SKIP ${shop._id}: username @${username} already on user ${taken._id}`
      );
      skipped += 1;
      continue;
    }

    const now = new Date();
    await users.insertOne({
      shopId: shop._id,
      username,
      displayName: username,
      pin: shop.pin,
      role: "admin",
      channels: {
        telegramChatId: shop.channels?.telegramChatId || null,
        whatsappPhone: shop.channels?.whatsappPhone || null,
      },
      isActive: true,
      removedAt: null,
      createdAt: shop.registeredAt || shop.createdAt || now,
      lastLogin: shop.lastLogin || null,
      lastLogout: shop.lastLogout || null,
      loginAttempts: shop.loginAttempts || 0,
      lockedUntil: shop.lockedUntil || null,
    });

    await shops.updateOne({ _id: shop._id }, { $unset: LEGACY_UNSET });
    created += 1;
    console.log(`  ${shop._id} → admin @${username}`);
  }

  const deletedSessions = await sessions.deleteMany({ type: "session" });
  console.log(
    `Done. created=${created} skipped=${skipped} sessionsCleared=${deletedSessions.deletedCount}`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
