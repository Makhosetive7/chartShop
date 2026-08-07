/**
 * Promote every active (non-removed) user to admin.
 *
 * Usage (from backend/):
 *   node --env-file=.env scripts/promoteAllUsersToAdmin.js
 *
 * Use when migrating to multi-user so existing shop logins keep full access.
 */
import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected:", mongoose.connection.name);

  const filter = {
    role: { $ne: "admin" },
    isActive: { $ne: false },
    removedAt: null,
  };

  const candidates = await User.find(filter)
    .select("username role mustSetPin shopId")
    .lean();

  console.log(`Found ${candidates.length} user(s) to promote:`);
  for (const u of candidates) {
    console.log(
      `  @${u.username} (${u.role}${u.mustSetPin ? ", pending PIN" : ""})`
    );
  }

  if (candidates.length === 0) {
    console.log("Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  const result = await User.updateMany(filter, { $set: { role: "admin" } });
  console.log(
    `Done. matched=${result.matchedCount} modified=${result.modifiedCount}`
  );

  const byRole = await User.aggregate([
    {
      $match: {
        isActive: { $ne: false },
        removedAt: null,
      },
    },
    { $group: { _id: "$role", n: { $sum: 1 } } },
  ]);
  console.log("Active users by role:", byRole);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
