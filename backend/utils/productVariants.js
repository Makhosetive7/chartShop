/**
 * Product → Variant → Pack helpers.
 * Stock lives on variants (base units). Product.price/stock/… are mirrors for legacy paths.
 */

export function buildDefaultPack({
  label = "Single",
  unitsPerPack = 1,
  price,
  costPrice = null,
  sortOrder = 0,
} = {}) {
  return {
    label,
    unitsPerPack: Math.max(1, parseInt(unitsPerPack, 10) || 1),
    price: Number(price),
    costPrice:
      costPrice === undefined || costPrice === null ? null : Number(costPrice),
    barcode: null,
    isActive: true,
    sortOrder,
  };
}

export function buildDefaultVariant({
  label = "",
  baseUnit = "piece",
  price,
  costPrice = null,
  stock = 0,
  lowStockThreshold = 10,
  trackStock = true,
  sortOrder = 0,
  packs,
} = {}) {
  const unitPrice = Number(price);
  const unitCost =
    costPrice === undefined || costPrice === null ? null : Number(costPrice);
  return {
    label: String(label || ""),
    baseUnit: String(baseUnit || "piece"),
    price: unitPrice,
    costPrice: unitCost,
    stock: Math.max(0, parseInt(stock, 10) || 0),
    lowStockThreshold: Number.isFinite(Number(lowStockThreshold))
      ? Number(lowStockThreshold)
      : 10,
    trackStock: Boolean(trackStock),
    barcode: null,
    isActive: true,
    sortOrder,
    packs:
      Array.isArray(packs) && packs.length > 0
        ? packs
        : [
            buildDefaultPack({
              price: unitPrice,
              costPrice: unitCost,
            }),
          ],
  };
}

/** Active variants, sorted. */
export function activeVariants(product) {
  return (product?.variants || [])
    .filter((v) => v && v.isActive !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

export function activePacks(variant) {
  return (variant?.packs || [])
    .filter((p) => p && p.isActive !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

export function getPrimaryVariant(product) {
  const variants = activeVariants(product);
  return variants[0] || null;
}

export function findVariant(product, variantId) {
  if (!variantId || !product?.variants?.length) return null;
  const id = String(variantId);
  return (
    product.variants.find((v) => String(v._id) === id && v.isActive !== false) ||
    null
  );
}

export function findPack(variant, packId) {
  if (!variant) return null;
  const packs = activePacks(variant);
  if (!packId) {
    return packs.find((p) => p.unitsPerPack === 1) || packs[0] || null;
  }
  const id = String(packId);
  return packs.find((p) => String(p._id) === id) || null;
}

/**
 * If product has no variants yet (legacy doc), materialize one from top-level fields.
 * Mutates product; caller should save when persisting.
 */
export function ensureVariants(product) {
  if (!product) return product;
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return product;
  }
  product.variants = [
    buildDefaultVariant({
      label: "",
      baseUnit: "piece",
      price: product.price,
      costPrice: product.costPrice,
      stock: product.stock ?? 0,
      lowStockThreshold: product.lowStockThreshold ?? 10,
      trackStock: product.trackStock !== false,
    }),
  ];
  return product;
}

/** Recompute Product mirror fields from active variants. */
export function syncProductMirrors(product) {
  if (!product) return product;
  ensureVariants(product);
  const variants = activeVariants(product);
  if (!variants.length) return product;

  const tracked = variants.filter((v) => v.trackStock);
  product.stock = tracked.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  product.trackStock = variants.some((v) => v.trackStock);
  const primary = variants[0];
  product.price = primary.price;
  product.costPrice =
    primary.costPrice === undefined ? null : primary.costPrice;
  product.lowStockThreshold = primary.lowStockThreshold;
  return product;
}

/**
 * Resolve sell target: variant + pack + base units for a quantity of packs.
 */
export function resolveSellUnit(product, { variantId, packId, quantity } = {}) {
  ensureVariants(product);
  const variant = variantId
    ? findVariant(product, variantId)
    : getPrimaryVariant(product);
  if (!variant) {
    return { error: `No variant found for ${product.name}` };
  }
  const pack = findPack(variant, packId);
  if (!pack) {
    return { error: `No pack found for ${product.name}` };
  }
  const qty = parseInt(quantity, 10);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { error: "quantity must be a positive integer." };
  }
  const unitsPerPack = Math.max(1, parseInt(pack.unitsPerPack, 10) || 1);
  const baseUnits = qty * unitsPerPack;
  const packCost =
    typeof pack.costPrice === "number" && pack.costPrice >= 0
      ? pack.costPrice
      : typeof variant.costPrice === "number" && variant.costPrice >= 0
        ? variant.costPrice * unitsPerPack
        : null;

  return {
    variant,
    pack,
    unitsPerPack,
    baseUnits,
    packCost,
    displayName: product.name,
  };
}

export function serializePack(pack) {
  if (!pack) return null;
  return {
    id: String(pack._id),
    label: pack.label,
    unitsPerPack: pack.unitsPerPack,
    price: pack.price,
    costPrice: pack.costPrice ?? null,
    barcode: pack.barcode ?? null,
    isActive: pack.isActive !== false,
    sortOrder: pack.sortOrder || 0,
  };
}

export function serializeVariant(variant) {
  if (!variant) return null;
  return {
    id: String(variant._id),
    label: variant.label || "",
    baseUnit: variant.baseUnit || "piece",
    price: variant.price,
    costPrice: variant.costPrice ?? null,
    stock: variant.stock ?? 0,
    lowStockThreshold: variant.lowStockThreshold,
    trackStock: variant.trackStock !== false,
    barcode: variant.barcode ?? null,
    isActive: variant.isActive !== false,
    sortOrder: variant.sortOrder || 0,
    packs: activePacks(variant).map(serializePack),
  };
}

export function serializeProduct(product) {
  if (!product) return null;
  ensureVariants(product);
  const variants = activeVariants(product).map(serializeVariant);
  return {
    id: String(product._id),
    name: product.name,
    price: product.price,
    costPrice: product.costPrice ?? null,
    stock: product.stock,
    trackStock: product.trackStock,
    lowStockThreshold: product.lowStockThreshold,
    isActive: product.isActive,
    variants,
  };
}
