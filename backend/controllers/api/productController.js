import Product from "../../models/Product.js";
import Sale from "../../models/Sale.js";

function serializeProduct(p) {
  return {
    id: String(p._id),
    name: p.name,
    price: p.price,
    costPrice: p.costPrice ?? null,
    stock: p.stock,
    trackStock: p.trackStock,
    lowStockThreshold: p.lowStockThreshold,
    isActive: p.isActive,
  };
}

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

export async function listProducts(req, res) {
  try {
    const products = await Product.find({
      shopId: req.shopId,
      isActive: true,
    }).sort({ name: 1 });

    return res.json({
      success: true,
      products: products.map(serializeProduct),
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
      trackStock: true,
      $expr: { $lte: ["$stock", "$lowStockThreshold"] },
    }).sort({ stock: 1 });

    return res.json({
      success: true,
      products: products.map(serializeProduct),
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
    const price = Number(req.body?.price);
    const costPrice =
      req.body?.costPrice === undefined || req.body?.costPrice === null
        ? null
        : Number(req.body.costPrice);
    const stock =
      req.body?.stock === undefined || req.body?.stock === null
        ? 0
        : parseInt(req.body.stock, 10);
    const shopDefaultThreshold =
      req.shop?.settings?.lowStockAlert != null
        ? Number(req.shop.settings.lowStockAlert)
        : 10;
    const lowStockThreshold =
      req.body?.lowStockThreshold === undefined
        ? shopDefaultThreshold
        : parseInt(req.body.lowStockThreshold, 10);
    const trackStock =
      req.body?.trackStock !== undefined
        ? Boolean(req.body.trackStock)
        : stock > 0 || req.body?.stock !== undefined;

    if (!name) {
      return res.status(400).json({ success: false, error: "name is required." });
    }
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

    const product = await Product.create({
      shopId: req.shopId,
      name,
      price,
      costPrice,
      stock,
      lowStockThreshold: Number.isFinite(lowStockThreshold)
        ? lowStockThreshold
        : Number.isFinite(shopDefaultThreshold)
          ? shopDefaultThreshold
          : 10,
      trackStock,
      isActive: true,
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

    const { name, price, costPrice, stock, lowStockThreshold, trackStock } =
      req.body || {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return res.status(400).json({ success: false, error: "Invalid name." });
      }
      product.name = trimmed;
    }
    if (price !== undefined) {
      const p = Number(price);
      if (!Number.isFinite(p) || p <= 0) {
        return res.status(400).json({ success: false, error: "Invalid price." });
      }
      product.price = p;
    }
    if (costPrice !== undefined) {
      if (costPrice === null) {
        product.costPrice = null;
      } else {
        const c = Number(costPrice);
        if (!Number.isFinite(c) || c < 0) {
          return res.status(400).json({ success: false, error: "Invalid costPrice." });
        }
        product.costPrice = c;
      }
    }
    if (stock !== undefined) {
      const s = parseInt(stock, 10);
      if (!Number.isFinite(s) || s < 0) {
        return res.status(400).json({ success: false, error: "Invalid stock." });
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
    }
    if (trackStock !== undefined) {
      product.trackStock = Boolean(trackStock);
    }

    await product.save();
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

    if (!Number.isFinite(quantity) || quantity < 0) {
      return res.status(400).json({
        success: false,
        error: "quantity must be a non-negative integer.",
      });
    }

    product.trackStock = true;
    if (op === "+" || op === "add") {
      product.stock += quantity;
    } else if (op === "-" || op === "sub" || op === "subtract") {
      product.stock = Math.max(0, product.stock - quantity);
    } else if (op === "=" || op === "set") {
      product.stock = quantity;
    } else {
      return res.status(400).json({
        success: false,
        error: 'op must be one of "+", "-", "=".',
      });
    }

    await product.save();
    return res.json({ success: true, product: serializeProduct(product) });
  } catch (error) {
    console.error("[api/products/stock]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update stock.",
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
