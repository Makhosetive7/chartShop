/**
 * Build Sale item payloads + totals including optional product cost / margin.
 * Supports variant/pack lines (baseUnitsDeducted, pack pricing).
 */
export function buildSaleLineItems(items) {
  let total = 0;
  let costTotal = 0;
  let hasCost = false;

  const lineItems = items.map((item) => {
    total += item.total;
    const unitCost =
      item.costPrice ??
      (typeof item.product?.costPrice === "number"
        ? item.product.costPrice
        : null);

    const line = {
      productId: item.product._id,
      productName: item.productName || item.product.name,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
    };

    if (item.variantId != null) {
      line.variantId = item.variantId;
    }
    if (item.variantLabel != null) {
      line.variantLabel = item.variantLabel;
    }
    if (item.packId != null) {
      line.packId = item.packId;
    }
    if (item.packLabel != null) {
      line.packLabel = item.packLabel;
    }
    if (item.unitsPerPack != null) {
      line.unitsPerPack = item.unitsPerPack;
    }
    if (item.baseUnitsDeducted != null) {
      line.baseUnitsDeducted = item.baseUnitsDeducted;
    }

    if (item.standardPrice != null) {
      line.standardPrice = item.standardPrice;
    }
    if (item.isCustomPrice != null) {
      line.isCustomPrice = item.isCustomPrice;
    }

    if (typeof unitCost === "number" && unitCost >= 0) {
      hasCost = true;
      const lineCost = unitCost * item.quantity;
      costTotal += lineCost;
      line.costPrice = unitCost;
      line.costTotal = lineCost;
    }

    return line;
  });

  const profit = hasCost ? total - costTotal : 0;

  return {
    lineItems,
    total,
    costTotal: hasCost ? costTotal : 0,
    profit,
    hasCost,
  };
}
