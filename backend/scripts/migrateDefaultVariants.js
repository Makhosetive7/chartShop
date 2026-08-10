/**
 * One-time migration: legacy products with empty/missing variants →
 * Product + 1 default Variant + Single pack(1).
 *
 * Usage (from backend/):
 *   node scripts/migrateDefaultVariants.js
 *   node scripts/migrateDefaultVariants.js --dry-run
 *
 * Safe to re-run: skips products that already have variants.
 */
import "dotenv/config";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import {
  ensureVariants,
  syncProductMirrors,
} from "../utils/productVariants.js";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  await mongoose.connect(uri);

  const legacy = await Product.find({
    $or: [
      { variants: { $exists: false } },
      { variants: { $size: 0 } },
      { variants: null },
    ],
  });

  console.log(
    `Found ${legacy.length} product(s) without variants${dryRun ? " (dry-run)" : ""}`
  );

  let saved = 0;
  for (const product of legacy) {
    ensureVariants(product);
    syncProductMirrors(product);
    if (dryRun) {
      console.log(
        `  would migrate ${product._id} "${product.name}" stock=${product.stock} price=${product.price}`
      );
      continue;
    }
    await product.save();
    saved += 1;
    console.log(`  migrated ${product._id} "${product.name}"`);
  }

  console.log(
    dryRun
      ? `Dry-run complete. ${legacy.length} product(s) would be updated.`
      : `Done. Persisted default variants on ${saved} product(s).`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
