import mongoose from "mongoose";
import Product from "../models/Product.js";

export async function resolveProduct(shopId, item) {
  if (item.productId) {
    if (!mongoose.Types.ObjectId.isValid(item.productId)) {
      return { error: `Invalid productId: ${item.productId}` };
    }
    const product = await Product.findOne({
      _id: item.productId,
      shopId,
      isActive: true,
    });
    if (!product) {
      return { error: `Product not found: ${item.productId}` };
    }
    return { product };
  }

  const name = String(item.name || "").trim();
  if (!name) {
    return { error: "Each item needs productId or name." };
  }

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let product = await Product.findOne({
    shopId,
    name: { $regex: new RegExp(`^${escaped}$`, "i") },
    isActive: true,
  });

  if (!product) {
    product = await Product.findOne({
      shopId,
      name: { $regex: name, $options: "i" },
      isActive: true,
    });
  }

  if (!product) {
    return { error: `Product not found: ${name}` };
  }

  return { product };
}

/**
 * Parse API sale items into InventoryService / salePricing shape.
 * @returns {{ ok: true, items } | { ok: false, status: number, error: string }}
 */
export async function parseApiSaleItems(shopId, rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "items must be a non-empty array.",
    };
  }

  const parsed = [];
  for (const raw of rawItems) {
    const quantity = parseInt(raw.quantity, 10);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return {
        ok: false,
        status: 400,
        error: "Each item needs a positive integer quantity.",
      };
    }

    const resolved = await resolveProduct(shopId, raw);
    if (resolved.error) {
      return { ok: false, status: 404, error: resolved.error };
    }

    const { product } = resolved;
    const customPrice =
      raw.price !== undefined && raw.price !== null ? Number(raw.price) : null;

    if (
      customPrice != null &&
      (!Number.isFinite(customPrice) || customPrice < 0)
    ) {
      return {
        ok: false,
        status: 400,
        error: `Invalid price for ${product.name}.`,
      };
    }

    const price = customPrice != null ? customPrice : product.price;
    const unitCost =
      typeof product.costPrice === "number" && product.costPrice >= 0
        ? product.costPrice
        : null;

    parsed.push({
      productId: product._id,
      product,
      productName: product.name,
      quantity,
      price,
      standardPrice: product.price,
      isCustomPrice: customPrice != null,
      costPrice: unitCost,
      costTotal: unitCost != null ? unitCost * quantity : null,
      total: quantity * price,
    });
  }

  return { ok: true, items: parsed };
}

/** Convert JSON items to chat-style text for services that still parse strings. */
export function itemsToCommandText(items) {
  return (items || [])
    .map((item) => {
      const name = item.name || item.productName;
      const quoted = /\s/.test(name) ? `"${name}"` : name;
      const price =
        item.price !== undefined && item.price !== null
          ? ` ${Number(item.price)}`
          : "";
      return `${item.quantity} ${quoted}${price}`;
    })
    .join(" ");
}

export function serializeSale(sale) {
  if (!sale) return null;
  return {
    id: String(sale._id),
    type: sale.type,
    total: sale.total,
    costTotal: sale.costTotal,
    profit: sale.profit,
    amountPaid: sale.amountPaid,
    balanceDue: sale.balanceDue,
    status: sale.status,
    isCancelled: sale.isCancelled,
    customerId: sale.customerId ? String(sale.customerId) : null,
    customerName: sale.customerName,
    items: sale.items,
    date: sale.date,
  };
}
