import Product from "../models/Product.js";
import {
  ensureVariants,
  findVariant,
  getPrimaryVariant,
  syncProductMirrors,
} from "../utils/productVariants.js";

class InsufficientStockError extends Error {
  constructor(productName, requested, available) {
    super(
      `*Insufficient Stock*\n${productName}: Need ${requested}, have ${available}`
    );
    this.name = "InsufficientStockError";
    this.productName = productName;
    this.requested = requested;
    this.available = available;
  }
}

function variantLabel(product, variant) {
  if (variant?.label) return `${product.name} · ${variant.label}`;
  return product.name;
}

class InventoryService {
  /**
   * Atomically deduct base units from a variant (default: primary).
   * Also decrements Product.stock mirror (sum of tracked stocks).
   * Non-tracked variants are a no-op success.
   *
   * @param {import('mongoose').Types.ObjectId|string} productId
   * @param {number} quantity base units
   * @param {import('mongoose').ClientSession|null} session
   * @param {{ variantId?: string|import('mongoose').Types.ObjectId }} [opts]
   */
  async deductStock(productId, quantity, session = null, opts = {}) {
    const options = { new: true };
    if (session) options.session = session;

    const loadOpts = {};
    if (session) loadOpts.session = session;
    const existing = await Product.findById(productId, null, loadOpts);
    if (!existing) {
      throw new Error("Product not found");
    }

    ensureVariants(existing);
    if (existing.isModified("variants")) {
      syncProductMirrors(existing);
      await existing.save(session ? { session } : undefined);
    }

    const variant = opts.variantId
      ? findVariant(existing, opts.variantId)
      : getPrimaryVariant(existing);

    if (!variant) {
      throw new Error("Variant not found");
    }

    if (!variant.trackStock) {
      return existing;
    }

    const updated = await Product.findOneAndUpdate(
      {
        _id: productId,
        variants: {
          $elemMatch: {
            _id: variant._id,
            trackStock: true,
            stock: { $gte: quantity },
          },
        },
      },
      {
        $inc: {
          "variants.$[v].stock": -quantity,
          stock: -quantity,
        },
      },
      {
        ...options,
        arrayFilters: [{ "v._id": variant._id }],
      }
    );

    if (updated) {
      return updated;
    }

    const fresh = await Product.findById(productId, null, loadOpts);
    const freshVariant =
      findVariant(fresh, variant._id) || getPrimaryVariant(fresh);
    throw new InsufficientStockError(
      variantLabel(fresh || existing, freshVariant || variant),
      quantity,
      freshVariant?.stock ?? variant.stock
    );
  }

  /**
   * Atomically restore base units to a variant (default: primary).
   */
  async restoreStock(productId, quantity, session = null, opts = {}) {
    const options = { new: true };
    if (session) options.session = session;

    const loadOpts = {};
    if (session) loadOpts.session = session;
    const existing = await Product.findById(productId, null, loadOpts);
    if (!existing) {
      throw new Error("Product not found");
    }

    ensureVariants(existing);
    if (existing.isModified("variants")) {
      syncProductMirrors(existing);
      await existing.save(session ? { session } : undefined);
    }

    const variant = opts.variantId
      ? findVariant(existing, opts.variantId)
      : getPrimaryVariant(existing);

    if (!variant) {
      throw new Error("Variant not found");
    }

    if (!variant.trackStock) {
      return existing;
    }

    const updated = await Product.findOneAndUpdate(
      { _id: productId },
      {
        $inc: {
          "variants.$[v].stock": quantity,
          stock: quantity,
        },
      },
      {
        ...options,
        arrayFilters: [{ "v._id": variant._id, "v.trackStock": true }],
      }
    );

    if (updated) {
      return updated;
    }

    return existing;
  }

  /**
   * Apply +/-/= stock on a variant and resync mirrors.
   */
  async adjustVariantStock(productId, quantity, op = "+", opts = {}) {
    const product = await Product.findById(productId);
    if (!product) throw new Error("Product not found");
    ensureVariants(product);
    const variant = opts.variantId
      ? findVariant(product, opts.variantId)
      : getPrimaryVariant(product);
    if (!variant) throw new Error("Variant not found");

    variant.trackStock = true;
    if (op === "+" || op === "add") {
      variant.stock += quantity;
    } else if (op === "-" || op === "sub" || op === "subtract") {
      variant.stock = Math.max(0, variant.stock - quantity);
    } else if (op === "=" || op === "set") {
      variant.stock = quantity;
    } else {
      throw new Error('op must be one of "+", "-", "=".');
    }

    syncProductMirrors(product);
    await product.save();
    return product;
  }

  /**
   * Deduct stock for sale items.
   * Uses item.baseUnitsDeducted when set (pack sales), else item.quantity.
   */
  async deductSaleItems(items, session = null) {
    const deducted = [];

    try {
      for (const item of items) {
        const productId = item.product?._id || item.productId;
        const baseUnits = item.baseUnitsDeducted ?? item.quantity;
        const variantId = item.variantId || item.variant?._id;
        const updated = await this.deductStock(productId, baseUnits, session, {
          variantId,
        });
        deducted.push({
          productId,
          quantity: baseUnits,
          variantId,
          product: updated,
        });
        item.product = updated;
      }

      return {
        success: true,
        products: deducted.map((d) => d.product),
      };
    } catch (error) {
      if (!session) {
        for (const entry of deducted.reverse()) {
          try {
            await this.restoreStock(entry.productId, entry.quantity, null, {
              variantId: entry.variantId,
            });
          } catch (restoreError) {
            console.error(
              "[InventoryService] Failed to compensate stock restore:",
              restoreError
            );
          }
        }
      }

      return {
        success: false,
        message:
          error instanceof InsufficientStockError
            ? error.message
            : `Stock update failed: ${error.message}`,
      };
    }
  }

  /**
   * Restore stock for cancelled sale items.
   */
  async restoreSaleItems(items, session = null) {
    const restored = [];

    for (const item of items) {
      const productId = item.productId || item.product?._id;
      if (!productId) continue;
      const baseUnits = item.baseUnitsDeducted ?? item.quantity;
      const variantId = item.variantId;

      const updated = await this.restoreStock(productId, baseUnits, session, {
        variantId,
      });
      restored.push(updated);
    }

    return restored;
  }
}

export { InsufficientStockError };
export default new InventoryService();
