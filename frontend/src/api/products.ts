import { api } from './client';
import type { Product } from './types';

export async function listProducts() {
  const { data } = await api.get<{ success: boolean; products: Product[] }>('/products');
  return data.products || [];
}

export async function listLowStock() {
  const { data } = await api.get<{ success: boolean; products: Product[] }>(
    '/products/low-stock',
  );
  return data.products || [];
}

export async function createProduct(body: {
  name: string;
  price?: number;
  costPrice?: number | null;
  stock?: number;
  lowStockThreshold?: number;
  variants?: Array<{
    label?: string;
    baseUnit?: string;
    price: number;
    costPrice?: number | null;
    stock?: number;
    lowStockThreshold?: number;
    trackStock?: boolean;
    packs?: Array<{
      label: string;
      unitsPerPack: number;
      price: number;
      costPrice?: number | null;
    }>;
  }>;
}) {
  const { data } = await api.post<{ success: boolean; product: Product }>(
    '/products',
    body,
  );
  return data.product;
}

export async function updateProduct(
  id: string,
  body: Partial<{
    name: string;
    price: number;
    costPrice: number | null;
    stock: number;
    lowStockThreshold: number;
    trackStock: boolean;
  }>,
) {
  const { data } = await api.patch<{ success: boolean; product: Product }>(
    `/products/${id}`,
    body,
  );
  return data.product;
}

export async function updateStock(
  id: string,
  body: { op: '+' | '-' | '='; quantity: number; variantId?: string },
) {
  const { data } = await api.post<{ success: boolean; product: Product }>(
    `/products/${id}/stock`,
    body,
  );
  return data.product;
}

export async function addVariant(
  productId: string,
  body: {
    label?: string;
    baseUnit?: string;
    price: number;
    costPrice?: number | null;
    stock?: number;
    lowStockThreshold?: number;
    trackStock?: boolean;
  },
) {
  const { data } = await api.post<{ success: boolean; product: Product }>(
    `/products/${productId}/variants`,
    body,
  );
  return data.product;
}

export async function updateVariant(
  productId: string,
  variantId: string,
  body: Partial<{
    label: string;
    baseUnit: string;
    price: number;
    costPrice: number | null;
    stock: number;
    lowStockThreshold: number;
    trackStock: boolean;
  }>,
) {
  const { data } = await api.patch<{ success: boolean; product: Product }>(
    `/products/${productId}/variants/${variantId}`,
    body,
  );
  return data.product;
}

export async function deleteVariant(productId: string, variantId: string) {
  const { data } = await api.delete<{ success: boolean; product: Product }>(
    `/products/${productId}/variants/${variantId}`,
  );
  return data.product;
}

export async function addPack(
  productId: string,
  variantId: string,
  body: {
    label: string;
    unitsPerPack: number;
    price: number;
    costPrice?: number | null;
  },
) {
  const { data } = await api.post<{ success: boolean; product: Product }>(
    `/products/${productId}/variants/${variantId}/packs`,
    body,
  );
  return data.product;
}

export async function deletePack(productId: string, variantId: string, packId: string) {
  const { data } = await api.delete<{ success: boolean; product: Product }>(
    `/products/${productId}/variants/${variantId}/packs/${packId}`,
  );
  return data.product;
}

export async function deleteProduct(id: string, confirm = true) {
  const { data } = await api.delete<{ success: boolean; message?: string }>(
    `/products/${id}`,
    { data: { confirm } },
  );
  return data;
}
