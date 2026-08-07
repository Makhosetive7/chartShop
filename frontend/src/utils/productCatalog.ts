import type { Product, ProductPack, ProductVariant, SaleItemInput } from '@/api/types';

export type CatalogLine = {
  productId: string;
  variantId: string;
  packId: string;
  quantity: string;
  price: string;
};

export function emptyCatalogLine(): CatalogLine {
  return {
    productId: '',
    variantId: '',
    packId: '',
    quantity: '1',
    price: '',
  };
}

export function activeVariants(product: Product | undefined): ProductVariant[] {
  return (product?.variants || []).filter((v) => v.isActive !== false);
}

export function activePacks(
  product: Product | undefined,
  variantId: string,
): ProductPack[] {
  const variant = activeVariants(product).find((v) => v.id === variantId);
  return (variant?.packs || []).filter((pk) => pk.isActive !== false);
}

export function pickDefaultIds(product: Product | undefined): {
  variantId: string;
  packId: string;
} {
  const variants = activeVariants(product);
  const variant = variants[0];
  const packs = variant ? activePacks(product, variant.id) : [];
  const pack = packs.find((pk) => pk.unitsPerPack === 1) || packs[0];
  return {
    variantId: variant?.id || '',
    packId: pack?.id || '',
  };
}

export function showVariantPicker(product: Product | undefined): boolean {
  const variants = activeVariants(product);
  return variants.length > 1 || variants.some((v) => Boolean(v.label && v.label.trim()));
}

export function showPackPicker(product: Product | undefined, variantId: string): boolean {
  return activePacks(product, variantId).length > 1;
}

export function lineToSaleItem(line: CatalogLine): SaleItemInput | null {
  if (!line.productId || !(Number(line.quantity) > 0)) return null;
  return {
    productId: line.productId,
    ...(line.variantId ? { variantId: line.variantId } : {}),
    ...(line.packId ? { packId: line.packId } : {}),
    quantity: Number(line.quantity),
    ...(line.price !== '' ? { price: Number(line.price) } : {}),
  };
}

export function formatSaleItemLabel(item: {
  productName?: string;
  variantLabel?: string;
  packLabel?: string;
  quantity?: number;
}): string {
  // Strip legacy "Name (variant)" snapshots; show base name only.
  const rawName = String(item.productName || 'Item').trim();
  const name = rawName.replace(/\s*\([^)]*\)\s*$/, '').trim() || rawName;

  const pack = item.packLabel?.trim();
  const variant = item.variantLabel?.trim();
  // Prefer the last qualifier: pack when it isn't the default Single, else variant.
  const last =
    pack && pack !== 'Single' ? pack : variant && variant.length ? variant : '';

  const label = last ? `${name} · ${last}` : name;
  return item.quantity != null ? `${item.quantity}× ${label}` : label;
}

export function productHasOptions(product: Product | undefined): boolean {
  if (!product) return false;
  const variants = activeVariants(product);
  if (variants.length > 1) return true;
  if (variants.some((v) => Boolean(v.label?.trim()))) return true;
  return variants.some((v) => activePacks(product, v.id).length > 1);
}
