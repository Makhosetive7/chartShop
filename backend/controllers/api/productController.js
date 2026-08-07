import Product from "../../models/Product.js";
import Sale from "../../models/Sale.js";
import InventoryService from "../../services/InventoryService.js";
import { logApiActivity } from "../../utils/logApiActivity.js";
import {
  buildDefaultPack,
  buildDefaultVariant,
  ensureVariants,
  findPack,
  findVariant,
  getPrimaryVariant,
  serializeProduct,
  syncProductMirrors,
} from "../../utils/productVariants.js";

async function findProduct(shopId, idOrName) {
  if (/^[0-9a-fA-F]{24}$/.test(idOrName)) {
    return Product.findOne({ _id: idOrName, shopId });
  }
  const escaped = idOrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Product.findOne({
    shopId,
    name: { $regex: new RegExp(`^${escaped}$`, "i") },
    isActive: true,
  });
}

function shopThreshold(req) {
  const shopDefaultThreshold =
    req.shop?.settings?.lowStockAlert != null
      ? Number(req.shop.settings.lowStockAlert)
      : 10;
  return Number.isFinite(shopDefaultThreshold) ? shopDefaultThreshold : 10;
}

export async function listProducts(req, res) {
  try {
    const products = await Product.find({
      shopId: req.shopId,
      isActive: true,
    }).sort({ name: 1 });

    return res.json({
      success: true,
      products: products.map((p) => {
        ensureVariants(p);
        return serializeProduct(p);
      }),
    });
  } catch (error) {
    console.error("[api/products/list]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to list products.",
    });
  }
}

export async function lowStock(req, res) {
  try {
    const products = await Product.find({
      shopId: req.shopId,
      isActive: true,
    }).sort({ stock: 1 });

    const low = products.filter((p) => {
      ensureVariants(p);
      return (p.variants || []).some(
        (v) =>
          v.isActive !== false &&
          v.trackStock &&
          (v.stock || 0) <= (v.lowStockThreshold ?? p.lowStockThreshold ?? 0)
      );
    });

    return res.json({
      success: true,
      products: low.map(serializeProduct),
    });
  } catch (error) {
    console.error("[api/products/low-stock]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to list low stock products.",
    });
  }
}

export async function createProduct(req, res) {
  try {
    const name = String(req.body?.name || "").trim();
    const defaultThreshold = shopThreshold(req);

    if (!name) {
      return res.status(400).json({ success: false, error: "name is required." });
    }

    const existing = await Product.findOne({
      shopId: req.shopId,
      name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Product "${name}" already exists.`,
      });
    }

    /** Nested create: { name, variants: [{ label, price, stock, packs: [...] }] } */
    if (Array.isArray(req.body?.variants) && req.body.variants.length > 0) {
      const variants = [];
      for (const raw of req.body.variants) {
        const price = Number(raw.price);
        if (!Number.isFinite(price) || price <= 0) {
          return res.status(400).json({
            success: false,
            error: "Each variant needs a price > 0.",
          });
        }
        const costPrice =
          raw.costPrice === undefined || raw.costPrice === null
            ? null
            : Number(raw.costPrice);
        if (costPrice != null && (!Number.isFinite(costPrice) || costPrice < 0)) {
          return res.status(400).json({
            success: false,
            error: "costPrice must be a number >= 0.",
          });
        }
        const stock =
          raw.stock === undefined || raw.stock === null
            ? 0
            : parseInt(raw.stock, 10);
        if (!Number.isFinite(stock) || stock < 0) {
          return res.status(400).json({
            success: false,
            error: "stock must be a non-negative integer.",
          });
        }

        let packs;
        if (Array.isArray(raw.packs) && raw.packs.length > 0) {
          packs = [];
          for (const pk of raw.packs) {
            const packPrice = Number(pk.price ?? price);
            const units = parseInt(pk.unitsPerPack, 10);
            if (!Number.isFinite(packPrice) || packPrice < 0) {
              return res.status(400).json({
                success: false,
                error: "Each pack needs a valid price.",
              });
            }
            if (!Number.isFinite(units) || units < 1) {
              return res.status(400).json({
                success: false,
                error: "unitsPerPack must be >= 1.",
              });
            }
            packs.push(
              buildDefaultPack({
                label: String(pk.label || "Pack").trim() || "Pack",
                unitsPerPack: units,
                price: packPrice,
                costPrice:
                  pk.costPrice === undefined || pk.costPrice === null
                    ? costPrice != null
                      ? costPrice * units
                      : null
                    : Number(pk.costPrice),
              })
            );
          }
        }

        variants.push(
          buildDefaultVariant({
            label: String(raw.label || "").trim(),
            baseUnit: String(raw.baseUnit || "piece").trim() || "piece",
            price,
            costPrice,
            stock,
            lowStockThreshold:
              raw.lowStockThreshold === undefined
                ? defaultThreshold
                : parseInt(raw.lowStockThreshold, 10),
            trackStock:
              raw.trackStock !== undefined
                ? Boolean(raw.trackStock)
                : stock > 0 || raw.stock !== undefined,
            packs,
          })
        );
      }

      const product = await Product.create({
        shopId: req.shopId,
        name,
        price: variants[0].price,
        costPrice: variants[0].costPrice,
        stock: 0,
        lowStockThreshold: variants[0].lowStockThreshold,
        trackStock: true,
        variants,
        isActive: true,
        createdByUserId: req.userId,
      });

      await logApiActivity(req, {
        action: "product.create",
        summary: `Added product ${name}`,
        entityType: "product",
        entityId: product._id,
        metadata: { name, variants: variants.length },
      });

      return res.status(201).json({
        success: true,
        product: serializeProduct(product),
      });
    }

    // Legacy flat create
    const price = Number(req.body?.price);
    const costPrice =
      req.body?.costPrice === undefined || req.body?.costPrice === null
        ? null
        : Number(req.body.costPrice);
    const stock =
      req.body?.stock === undefined || req.body?.stock === null
        ? 0
        : parseInt(req.body.stock, 10);
    const lowStockThreshold =
      req.body?.lowStockThreshold === undefined
        ? defaultThreshold
        : parseInt(req.body.lowStockThreshold, 10);
    const trackStock =
      req.body?.trackStock !== undefined
        ? Boolean(req.body.trackStock)
        : stock > 0 || req.body?.stock !== undefined;

    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        error: "price must be a number greater than 0.",
      });
    }
    if (costPrice != null && (!Number.isFinite(costPrice) || costPrice < 0)) {
      return res.status(400).json({
        success: false,
        error: "costPrice must be a number >= 0.",
      });
    }
    if (!Number.isFinite(stock) || stock < 0) {
      return res.status(400).json({
        success: false,
        error: "stock must be a non-negative integer.",
      });
    }

    const product = await Product.create({
      shopId: req.shopId,
      name,
      price,
      costPrice,
      stock,
      lowStockThreshold: Number.isFinite(lowStockThreshold)
        ? lowStockThreshold
        : defaultThreshold,
      trackStock,
      variants: [
        buildDefaultVariant({
          price,
          costPrice,
          stock,
          lowStockThreshold: Number.isFinite(lowStockThreshold)
            ? lowStockThreshold
            : defaultThreshold,
          trackStock,
        }),
      ],
      isActive: true,
      createdByUserId: req.userId,
    });

    await logApiActivity(req, {
      action: "product.create",
      summary: `Added product ${name}`,
      entityType: "product",
      entityId: product._id,
      metadata: { name, price, stock },
    });

    return res.status(201).json({
      success: true,
      product: serializeProduct(product),
    });
  } catch (error) {
    console.error("[api/products/create]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create product.",
    });
  }
}

export async function getProduct(req, res) {
  try {
    const product = await findProduct(req.shopId, req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, error: "Product not found." });
    }
    ensureVariants(product);
    return res.json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    console.error("[api/products/get]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get product.",
    });
  }
}

export async function updateProduct(req, res) {
  try {
    const product = await findProduct(req.shopId, req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, error: "Product not found." });
    }
    ensureVariants(product);

    const { name, price, costPrice, stock, lowStockThreshold, trackStock } =
      req.body || {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return res.status(400).json({ success: false, error: "Invalid name." });
      }
      product.name = trimmed;
    }

    const primary = getPrimaryVariant(product);

    if (price !== undefined) {
      const p = Number(price);
      if (!Number.isFinite(p) || p <= 0) {
        return res.status(400).json({ success: false, error: "Invalid price." });
      }
      product.price = p;
      if (primary) {
        primary.price = p;
        const single = findPack(primary, null);
        if (single && single.unitsPerPack === 1) {
          single.price = p;
        }
      }
    }
    if (costPrice !== undefined) {
      if (costPrice === null) {
        product.costPrice = null;
        if (primary) primary.costPrice = null;
      } else {
        const c = Number(costPrice);
        if (!Number.isFinite(c) || c < 0) {
          return res.status(400).json({ success: false, error: "Invalid costPrice." });
        }
        product.costPrice = c;
        if (primary) primary.costPrice = c;
      }
    }
    if (stock !== undefined) {
      const s = parseInt(stock, 10);
      if (!Number.isFinite(s) || s < 0) {
        return res.status(400).json({ success: false, error: "Invalid stock." });
      }
      if (primary) {
        primary.stock = s;
        primary.trackStock = true;
      }
      product.stock = s;
      product.trackStock = true;
    }
    if (lowStockThreshold !== undefined) {
      const t = parseInt(lowStockThreshold, 10);
      if (!Number.isFinite(t) || t < 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid lowStockThreshold.",
        });
      }
      product.lowStockThreshold = t;
      if (primary) primary.lowStockThreshold = t;
    }
    if (trackStock !== undefined) {
      product.trackStock = Boolean(trackStock);
      if (primary) primary.trackStock = Boolean(trackStock);
    }

    syncProductMirrors(product);
    await product.save();
    await logApiActivity(req, {
      action: "product.update",
      summary: `Updated product ${product.name}`,
      entityType: "product",
      entityId: product._id,
      metadata: { name: product.name },
    });
    return res.json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    console.error("[api/products/update]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update product.",
    });
  }
}

export async function updateStock(req, res) {
  try {
    const product = await findProduct(req.shopId, req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, error: "Product not found." });
    }

    const quantity = parseInt(req.body?.quantity, 10);
    const op = String(req.body?.op || "=").trim();
    const variantId = req.body?.variantId || null;

    if (!Number.isFinite(quantity) || quantity < 0) {
      return res.status(400).json({
        success: false,
        error: "quantity must be a non-negative integer.",
      });
    }

    const updated = await InventoryService.adjustVariantStock(
      product._id,
      quantity,
      op,
      { variantId }
    );

    await logApiActivity(req, {
      action: "product.stock",
      summary: `Stock update ${updated.name} → ${updated.stock}`,
      entityType: "product",
      entityId: updated._id,
      metadata: { stock: updated.stock, op, quantity, variantId },
    });
    return res.json({ success: true, product: serializeProduct(updated) });
  } catch (error) {
    console.error("[api/products/stock]", error);
    const msg = error?.message || "Failed to update stock.";
    if (/op must be|Variant not found|Product not found/.test(msg)) {
      return res.status(400).json({ success: false, error: msg });
    }
    return res.status(500).json({
      success: false,
      error: "Failed to update stock.",
    });
  }
}

export async function addVariant(req, res) {
  try {
    const product = await findProduct(req.shopId, req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, error: "Product not found." });
    }
    ensureVariants(product);

    const price = Number(req.body?.price);
    const label = String(req.body?.label || "").trim();
    const stock =
      req.body?.stock === undefined || req.body?.stock === null
        ? 0
        : parseInt(req.body.stock, 10);
    const costPrice =
      req.body?.costPrice === undefined || req.body?.costPrice === null
        ? null
        : Number(req.body.costPrice);
    const defaultThreshold = shopThreshold(req);

    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        error: "price must be a number greater than 0.",
      });
    }
    if (!Number.isFinite(stock) || stock < 0) {
      return res.status(400).json({
        success: false,
        error: "stock must be a non-negative integer.",
      });
    }

    product.variants.push(
      buildDefaultVariant({
        label,
        baseUnit: String(req.body?.baseUnit || "piece").trim() || "piece",
        price,
        costPrice,
        stock,
        lowStockThreshold:
          req.body?.lowStockThreshold === undefined
            ? defaultThreshold
            : parseInt(req.body.lowStockThreshold, 10),
        trackStock:
          req.body?.trackStock !== undefined
            ? Boolean(req.body.trackStock)
            : true,
        sortOrder: product.variants.length,
      })
    );

    syncProductMirrors(product);
    await product.save();

    await logApiActivity(req, {
      action: "product.variant.add",
      summary: `Added variant ${label || "default"} to ${product.name}`,
      entityType: "product",
      entityId: product._id,
      metadata: { label, price, stock },
    });

    return res.status(201).json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    console.error("[api/products/variant/add]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to add variant.",
    });
  }
}

export async function updateVariant(req, res) {
  try {
    const product = await findProduct(req.shopId, req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, error: "Product not found." });
    }
    ensureVariants(product);
    const variant = findVariant(product, req.params.variantId);
    if (!variant) {
      return res.status(404).json({ success: false, error: "Variant not found." });
    }

    const { label, baseUnit, price, costPrice, stock, lowStockThreshold, trackStock } =
      req.body || {};

    if (label !== undefined) variant.label = String(label).trim();
    if (baseUnit !== undefined) {
      variant.baseUnit = String(baseUnit).trim() || "piece";
    }
    if (price !== undefined) {
      const p = Number(price);
      if (!Number.isFinite(p) || p <= 0) {
        return res.status(400).json({ success: false, error: "Invalid price." });
      }
      variant.price = p;
      const single = findPack(variant, null);
      if (single && single.unitsPerPack === 1) single.price = p;
    }
    if (costPrice !== undefined) {
      if (costPrice === null) variant.costPrice = null;
      else {
        const c = Number(costPrice);
        if (!Number.isFinite(c) || c < 0) {
          return res.status(400).json({ success: false, error: "Invalid costPrice." });
        }
        variant.costPrice = c;
      }
    }
    if (stock !== undefined) {
      const s = parseInt(stock, 10);
      if (!Number.isFinite(s) || s < 0) {
        return res.status(400).json({ success: false, error: "Invalid stock." });
      }
      variant.stock = s;
      variant.trackStock = true;
    }
    if (lowStockThreshold !== undefined) {
      const t = parseInt(lowStockThreshold, 10);
      if (!Number.isFinite(t) || t < 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid lowStockThreshold.",
        });
      }
      variant.lowStockThreshold = t;
    }
    if (trackStock !== undefined) variant.trackStock = Boolean(trackStock);

    syncProductMirrors(product);
    await product.save();

    return res.json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    console.error("[api/products/variant/update]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update variant.",
    });
  }
}

export async function deleteVariant(req, res) {
  try {
    const product = await findProduct(req.shopId, req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, error: "Product not found." });
    }
    ensureVariants(product);
    const variant = findVariant(product, req.params.variantId);
    if (!variant) {
      return res.status(404).json({ success: false, error: "Variant not found." });
    }

    const active = (product.variants || []).filter((v) => v.isActive !== false);
    if (active.length <= 1) {
      return res.status(400).json({
        success: false,
        error: "Cannot remove the last variant. Delete the product instead.",
      });
    }

    variant.isActive = false;
    syncProductMirrors(product);
    await product.save();

    return res.json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    console.error("[api/products/variant/delete]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete variant.",
    });
  }
}

export async function addPack(req, res) {
  try {
    const product = await findProduct(req.shopId, req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, error: "Product not found." });
    }
    ensureVariants(product);
    const variant = findVariant(product, req.params.variantId);
    if (!variant) {
      return res.status(404).json({ success: false, error: "Variant not found." });
    }

    const label = String(req.body?.label || "").trim();
    const unitsPerPack = parseInt(req.body?.unitsPerPack, 10);
    const price = Number(req.body?.price);

    if (!label) {
      return res.status(400).json({ success: false, error: "label is required." });
    }
    if (!Number.isFinite(unitsPerPack) || unitsPerPack < 1) {
      return res.status(400).json({
        success: false,
        error: "unitsPerPack must be >= 1.",
      });
    }
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ success: false, error: "Invalid price." });
    }

    const costPrice =
      req.body?.costPrice === undefined || req.body?.costPrice === null
        ? typeof variant.costPrice === "number"
          ? variant.costPrice * unitsPerPack
          : null
        : Number(req.body.costPrice);

    variant.packs.push(
      buildDefaultPack({
        label,
        unitsPerPack,
        price,
        costPrice,
        sortOrder: (variant.packs || []).length,
      })
    );

    await product.save();

    await logApiActivity(req, {
      action: "product.pack.add",
      summary: `Added pack ${label} to ${product.name}`,
      entityType: "product",
      entityId: product._id,
      metadata: { label, unitsPerPack, price, variantId: String(variant._id) },
    });

    return res.status(201).json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    console.error("[api/products/pack/add]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to add pack.",
    });
  }
}

export async function updatePack(req, res) {
  try {
    const product = await findProduct(req.shopId, req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, error: "Product not found." });
    }
    ensureVariants(product);
    const variant = findVariant(product, req.params.variantId);
    if (!variant) {
      return res.status(404).json({ success: false, error: "Variant not found." });
    }
    const pack = findPack(variant, req.params.packId);
    if (!pack) {
      return res.status(404).json({ success: false, error: "Pack not found." });
    }

    const { label, unitsPerPack, price, costPrice } = req.body || {};
    if (label !== undefined) {
      const trimmed = String(label).trim();
      if (!trimmed) {
        return res.status(400).json({ success: false, error: "Invalid label." });
      }
      pack.label = trimmed;
    }
    if (unitsPerPack !== undefined) {
      const u = parseInt(unitsPerPack, 10);
      if (!Number.isFinite(u) || u < 1) {
        return res.status(400).json({
          success: false,
          error: "unitsPerPack must be >= 1.",
        });
      }
      pack.unitsPerPack = u;
    }
    if (price !== undefined) {
      const p = Number(price);
      if (!Number.isFinite(p) || p < 0) {
        return res.status(400).json({ success: false, error: "Invalid price." });
      }
      pack.price = p;
    }
    if (costPrice !== undefined) {
      if (costPrice === null) pack.costPrice = null;
      else {
        const c = Number(costPrice);
        if (!Number.isFinite(c) || c < 0) {
          return res.status(400).json({ success: false, error: "Invalid costPrice." });
        }
        pack.costPrice = c;
      }
    }

    await product.save();
    return res.json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    console.error("[api/products/pack/update]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update pack.",
    });
  }
}

export async function deletePack(req, res) {
  try {
    const product = await findProduct(req.shopId, req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, error: "Product not found." });
    }
    ensureVariants(product);
    const variant = findVariant(product, req.params.variantId);
    if (!variant) {
      return res.status(404).json({ success: false, error: "Variant not found." });
    }
    const pack = findPack(variant, req.params.packId);
    if (!pack) {
      return res.status(404).json({ success: false, error: "Pack not found." });
    }

    const active = (variant.packs || []).filter((p) => p.isActive !== false);
    if (active.length <= 1) {
      return res.status(400).json({
        success: false,
        error: "Cannot remove the last pack on a variant.",
      });
    }

    pack.isActive = false;
    await product.save();
    return res.json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    console.error("[api/products/pack/delete]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete pack.",
    });
  }
}

export async function deleteProduct(req, res) {
  try {
    const product = await findProduct(req.shopId, req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, error: "Product not found." });
    }

    const confirm = Boolean(req.body?.confirm || req.query.confirm);
    const salesCount = await Sale.countDocuments({
      shopId: req.shopId,
      "items.productId": product._id,
    });

    if (!confirm && salesCount > 0) {
      return res.status(409).json({
        success: false,
        error: `Product has ${salesCount} sale(s). Pass confirm: true to soft-delete.`,
        salesCount,
      });
    }

    product.isActive = false;
    await product.save();
    await logApiActivity(req, {
      action: "product.delete",
      summary: `Deleted product ${product.name}`,
      entityType: "product",
      entityId: product._id,
      metadata: { name: product.name },
    });
    return res.json({
      success: true,
      message: `Product ${product.name} deleted.`,
      product: serializeProduct(product),
    });
  } catch (error) {
    console.error("[api/products/delete]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete product.",
    });
  }
}
