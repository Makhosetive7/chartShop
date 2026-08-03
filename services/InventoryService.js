import Product from "../models/Product.js";

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

class InventoryService {
  /**
   * Atomically deduct stock if enough is available.
   * Non-tracked products are a no-op success.
   */
  async deductStock(productId, quantity, session = null) {
    const options = { new: true };
    if (session) options.session = session;

    const updated = await Product.findOneAndUpdate(
      {
        _id: productId,
        trackStock: true,
        stock: { $gte: quantity },
      },
      { $inc: { stock: -quantity } },
      options
    );

    if (updated) {
      return updated;
    }

    const query = Product.findById(productId);
    if (session) query.session(session);
    const existing = await query;

    if (!existing) {
      throw new Error("Product not found");
    }

    if (!existing.trackStock) {
      return existing;
    }

    throw new InsufficientStockError(
      existing.name,
      quantity,
      existing.stock
    );
  }

  /**
   * Atomically restore stock for a tracked product.
   */
  async restoreStock(productId, quantity, session = null) {
    const options = { new: true };
    if (session) options.session = session;

    const updated = await Product.findOneAndUpdate(
      {
        _id: productId,
        trackStock: true,
      },
      { $inc: { stock: quantity } },
      options
    );

    if (updated) {
      return updated;
    }

    const query = Product.findById(productId);
    if (session) query.session(session);
    const existing = await query;

    if (!existing) {
      throw new Error("Product not found");
    }

    // Not tracking stock — nothing to restore
    return existing;
  }

  /**
   * Deduct stock for a list of sale items.
   * On failure mid-way, restores already-deducted items (compensating).
   *
   * @param {Array<{ product: object, quantity: number }>} items
   * @returns {{ success: true, products: object[] } | { success: false, message: string }}
   */
  async deductSaleItems(items, session = null) {
    const deducted = [];

    try {
      for (const item of items) {
        const productId = item.product?._id || item.productId;
        const updated = await this.deductStock(
          productId,
          item.quantity,
          session
        );
        deducted.push({ productId, quantity: item.quantity, product: updated });
        item.product = updated;
      }

      return {
        success: true,
        products: deducted.map((d) => d.product),
      };
    } catch (error) {
      // Compensate prior deductions unless a Mongo session will roll them back
      if (!session) {
        for (const entry of deducted.reverse()) {
          try {
            await this.restoreStock(entry.productId, entry.quantity);
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

      const updated = await this.restoreStock(
        productId,
        item.quantity,
        session
      );
      restored.push(updated);
    }

    return restored;
  }
}

export { InsufficientStockError };
export default new InventoryService();
