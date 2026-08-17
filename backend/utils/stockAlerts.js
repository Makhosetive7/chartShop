/**
 * Live stock alerts for Notifications: one row per tracked variant
 * that is out of stock or at/below its low-stock threshold.
 */

export function stockAlertStatus(stock, threshold) {
  const qty = Number(stock) || 0;
  const limit = Number(threshold);
  const floor = Number.isFinite(limit) ? limit : 0;
  if (qty <= 0) return "out";
  if (qty <= floor) return "low";
  return null;
}

export function variantStockAlert(product, variant) {
  if (!product || !variant || variant.isActive === false) return null;
  if (variant.trackStock === false) return null;

  const productId = String(product._id || product.id || "").trim();
  const variantId = String(variant._id || variant.id || "").trim();
  if (!productId || !variantId) return null;

  const stock = Math.max(0, Number(variant.stock) || 0);
  const threshold = Number(
    variant.lowStockThreshold ?? product.lowStockThreshold ?? 0
  );
  const status = stockAlertStatus(stock, threshold);
  if (!status) return null;

  return {
    id: `${productId}:${variantId}`,
    productId,
    variantId,
    productName: product.name || "Product",
    variantLabel: String(variant.label || "").trim(),
    stock,
    lowStockThreshold: Number.isFinite(threshold) ? threshold : 0,
    status,
  };
}

export function collectStockAlerts(products) {
  const items = [];
  for (const product of products || []) {
    for (const variant of product.variants || []) {
      const item = variantStockAlert(product, variant);
      if (item) items.push(item);
    }
  }
  items.sort((a, b) => {
    if (a.status !== b.status) return a.status === "out" ? -1 : 1;
    if (a.stock !== b.stock) return a.stock - b.stock;
    return a.productName.localeCompare(b.productName);
  });
  return items;
}
