import Product from "../../../models/Product.js";
import Sale from "../../../models/Sale.js";
import Shop from "../../../models/Shop.js";
import {
  buildDefaultPack,
  buildDefaultVariant,
  ensureVariants,
  syncProductMirrors,
  activeVariants,
  activePacks,
} from "../../../utils/productVariants.js";
import {
  matchProductTokens,
  matchVariantAndPack,
  normalizeLabel,
} from "../chatProductResolve.js";

function tokenize(text) {
  const tokens = [];
  const re = /"([^"]+)"|(\S+)/g;
  let match;
  while ((match = re.exec(text || "")) !== null) {
    tokens.push({
      value: (match[1] ?? match[2]).trim(),
      quoted: match[1] != null,
    });
  }
  return tokens;
}

export async function handleAddProduct(shopId, text, actorUserId = null) {
  try {
    // Remove the "add " prefix
    const input = text.replace("add ", "").trim();

    // Regex to match quoted product names or single words
    const match = input.match(
      /^(?:"([^"]+)"|(\S+))\s+([\d.]+)(?:\s+cost\s+([\d.]+))?(?:\s+stock\s+(\d+))?(?:\s+threshold\s+(\d+))?$/i
    );

    if (!match) {
      return 'Invalid format.\n\nUse: add [product] [price]\nWith cost: add [product] [price] cost [cost]\nWith stock: add [product] [price] stock [qty]\n\nExamples:\nadd bread 2.50\nadd bread 2.50 cost 1.20 stock 100\nadd "carex condoms" 1.50 stock 100';
    }

    const name = match[1] || match[2];
    const price = parseFloat(match[3]);
    const costPrice = match[4] != null ? parseFloat(match[4]) : null;
    const stock = match[5] ? parseInt(match[5]) : 0;
    const shop = await Shop.findById(shopId).select("settings.lowStockAlert");
    const shopDefaultThreshold =
      shop?.settings?.lowStockAlert != null
        ? Number(shop.settings.lowStockAlert)
        : 10;
    const lowStockThreshold = match[6]
      ? parseInt(match[6])
      : Number.isFinite(shopDefaultThreshold)
        ? shopDefaultThreshold
        : 10;
    const trackStock = !!match[5];

    if (isNaN(price) || price <= 0) {
      return "Invalid price. Please use a positive number.\nExample: 2.50";
    }

    if (costPrice != null && (isNaN(costPrice) || costPrice < 0)) {
      return "Invalid cost. Please use a number >= 0.\nExample: cost 1.20";
    }

    if (stock < 0) {
      return "Invalid stock quantity.";
    }

    if (lowStockThreshold < 0) {
      return "Invalid threshold.";
    }

    const existing = await Product.findOne({
      shopId,
      name: new RegExp(`^${name}$`, "i"),
    });

    if (existing) {
      return `Product "${name}" already exists.\n\nUse "list" to see all products.`;
    }

    await Product.create({
      shopId,
      name,
      price,
      costPrice,
      stock,
      lowStockThreshold,
      trackStock,
      ...(actorUserId ? { createdByUserId: actorUserId } : {}),
    });

    let response = `*Product added!*\n\n`;
    response += `Name: ${name}\n`;
    response += `Price: $${price.toFixed(2)}\n`;
    if (costPrice != null) {
      response += `Cost: $${costPrice.toFixed(2)}\n`;
      response += `Unit margin: $${(price - costPrice).toFixed(2)}\n`;
    }
    if (trackStock) {
      response += `Stock: ${stock}\n`;
      response += `Low Stock Alert: ${lowStockThreshold}`;

      if (stock <= lowStockThreshold) {
        response += "\n\n*Stock is below threshold!*";
      }
    }

    return response;
  } catch (error) {
    console.error("Add product error:", error);
    return "Failed to add product. Please try again.";
  }
}

export async function handleUpdateStock(shopId, text) {
  try {
    const input = text.replace(/^stock\s+/i, "").trim();
    const opMatch = input.match(/^([=+\-])/);
    const operation = opMatch ? opMatch[1] : "+";
    const rest = opMatch ? input.slice(1).trim() : input;
    const tokens = tokenize(rest);

    if (tokens.length < 2) {
      return 'Invalid format.\n\nUse:\n• stock [product] [quantity]\n• stock +[product] [quantity]\n• stock -[product] [quantity]\n• stock =[product] [quantity]\n• stock [product] [variant] [quantity]\n\nExamples:\n• stock bread 50\n• stock +"cavela shoes" size 2 5\n• stock +coke 500ml 24';
    }

    const qtyTok = tokens[tokens.length - 1];
    if (!/^\d+$/.test(qtyTok.value) || qtyTok.quoted) {
      return "Invalid quantity. Please use a positive number at the end.";
    }
    const quantity = parseInt(qtyTok.value, 10);
    if (!Number.isFinite(quantity) || quantity < 0) {
      return "Invalid quantity. Please use a positive number.";
    }

    const products = await Product.find({ shopId, isActive: true });
    const head = tokens.slice(0, -1);
    const matched = matchProductTokens(products, head, 0);
    if (!matched) {
      return `Product "${head[0]?.value || ""}" not found.\n\nType "list" to see available products.`;
    }

    const product = matched.product;
    ensureVariants(product);
    let variantIdx = matched.consumed;
    const qp = matchVariantAndPack(product, head, variantIdx);
    if (qp.error) return qp.error;
    const variant = qp.variant;
    if (!variant) {
      return `No variant found on ${product.name}.`;
    }
    if (!variant.trackStock && product.trackStock === false) {
      return `Product "${product.name}" is not configured to track stock.\n\nUpdate the product first to enable stock tracking.`;
    }

    variant.trackStock = true;
    const oldStock = variant.stock;
    let newStock;
    let message;

    switch (operation) {
      case "+":
        newStock = variant.stock + quantity;
        message = `Added ${quantity} units (was ${oldStock})`;
        break;
      case "-":
        newStock = variant.stock - quantity;
        if (newStock < 0) {
          return `Cannot remove ${quantity} units. Current stock: ${variant.stock}`;
        }
        message = `Removed ${quantity} units (was ${oldStock})`;
        break;
      case "=":
        newStock = quantity;
        message = `Set to exactly ${quantity} units (was ${oldStock})`;
        break;
      default:
        return 'op must be one of "+", "-", "=".';
    }

    variant.stock = newStock;
    syncProductMirrors(product);
    await product.save();

    const label = variant.label
      ? `${product.name} · ${variant.label}`
      : product.name;
    const isLowStock = newStock <= (variant.lowStockThreshold ?? product.lowStockThreshold);
    const lowStockWarning = isLowStock ? `\n\n*LOW STOCK WARNING!*` : "";

    return `*Stock Updated!*\n\n${label}\n${message}\nNew stock: ${newStock}${lowStockWarning}`;
  } catch (error) {
    console.error("Stock update error:", error);
    return "Failed to update stock. Please try again.";
  }
}

export async function handleLowStock(shopId) {
  try {
    const lowStockProducts = await Product.find({
      shopId,
      isActive: true,
      trackStock: true,
      $expr: { $lte: ["$stock", "$lowStockThreshold"] },
    }).sort({ stock: 1 });

    if (lowStockProducts.length === 0) {
      return "*All products well stocked!*\n\nNo items below threshold.";
    }

    let alert = "*LOW STOCK ALERT*\n\n";

    lowStockProducts.forEach((product) => {
      const percentage = Math.round(
        (product.stock / product.lowStockThreshold) * 100
      );
      const urgency =
        product.stock === 0 ? "🔴" : product.stock <= 5 ? "🟠" : "🟡";

      alert += `${urgency} *${product.name}*\n`;
      alert += `   Stock: ${product.stock} (${percentage}% of threshold)\n`;
      alert += `   Threshold: ${product.lowStockThreshold}\n`;

      if (product.stock === 0) {
        alert += `   Status: OUT OF STOCK!\n`;
      }
      alert += "\n";
    });

    alert +=
      "*Tip:* Restock these items soon!\nUse: stock [product] [quantity]";

    return alert;
  } catch (error) {
    console.error("Low stock error:", error);
    return "Failed to check stock levels. Please try again.";
  }
}

export async function handleUpdatePrice(shopId, text) {
  try {
    const parts = text.replace("price ", "").trim().split(" ");

    if (parts.length < 2) {
      return "Invalid format.\n\nUse: price [product] [new price]\nExample: price bread 3.00";
    }

    const productName = parts[0];
    const newPrice = parseFloat(parts[1]);

    if (isNaN(newPrice) || newPrice <= 0) {
      return "Invalid price. Please use a positive number greater than 0.\nExample: 2.50";
    }

    const product = await Product.findOne({
      shopId,
      name: new RegExp(`^${productName}$`, "i"),
      isActive: true,
    });

    if (!product) {
      return `Product "${productName}" not found.\n\nType "list" to see available products.`;
    }

    const oldPrice = product.price;
    product.price = newPrice;
    await product.save();

    return `*Price Updated Successfully!*\n\n${
      product.name
    }\nOld Price: $${oldPrice.toFixed(2)}\nNew Price: $${newPrice.toFixed(
      2
    )}\n\nChange: $${(newPrice - oldPrice).toFixed(2)}`;
  } catch (error) {
    console.error("Update price error:", error);
    return "Failed to update price. Please try again.";
  }
}

export async function handleDeleteProduct(shopId, text) {
  try {
    // Remove the "delete " prefix and trim
    const input = text.replace("delete ", "").trim();

    // Match: product-name (with optional quotes) + optional "confirm"
    const match = input.match(/^(?:"([^"]+)"|(\S+))(?: confirm)?$/i);

    if (!match) {
      return 'Invalid format.\n\nUse: delete [product]\nWith confirmation: delete [product] confirm\n\nExamples:\n• delete bread\n• delete "carex condoms" confirm';
    }

    const productName = match[1] || match[2]; // Group 1 is quoted, group 2 is unquoted
    const isConfirmed = input.toLowerCase().endsWith(" confirm");

    const product = await Product.findOne({
      shopId,
      name: new RegExp(`^${productName}$`, "i"),
      isActive: true,
    });

    if (!product) {
      return `Product "${productName}" not found.\n\nType "list" to see available products.`;
    }

    const salesCount = await Sale.countDocuments({
      shopId,
      "items.productId": product._id,
    });

    if (!isConfirmed) {
      let warningMessage = `*DELETE PRODUCT CONFIRMATION* ⚠️\n\n`;
      warningMessage += `Product: ${product.name}\n`;
      warningMessage += `Price: $${product.price.toFixed(2)}\n`;
      warningMessage += `Current Stock: ${product.stock}\n`;
      warningMessage += `Sales History: ${salesCount} transaction${
        salesCount !== 1 ? "s" : ""
      }\n\n`;

      if (salesCount > 0) {
        warningMessage += `This product has sales history and will be *archived*.\n`;
        warningMessage += `Sales reports will still show this product.\n\n`;
      }

      warningMessage += `Type: *delete "${product.name}" confirm* to proceed.`;
      return warningMessage;
    }

    // soft delete - always preserve data
    product.isActive = false;
    await product.save();

    if (salesCount > 0) {
      return `*Product Archived Successfully!*\n\n${product.name} has been archived.\n\nNote: This product appears in ${salesCount} past sales and will remain in your sales history reports.`;
    } else {
      return `*Product Deleted Successfully!*\n\n${product.name} has been removed from your product list.`;
    }
  } catch (error) {
    console.error("Delete product error:", error);
    return "Failed to delete product. Please try again.";
  }
}

export async function handleEditProduct(shopId, text) {
  try {
    // Remove the "edit " prefix
    const input = text.replace("edit ", "").trim();

    // Match: product-name field value (supports quoted product names and multi-word values)
    // New regex handles both quoted and unquoted product names, and captures all remaining text as value
    const match = input.match(
      /^(?:"([^"]+)"|(\S+))\s+(price|cost|stock|threshold|name)\s+(.+)$/i
    );

    if (!match) {
      return 'Invalid format.\n\nUse: edit [product] [field] [value]\n\nAvailable fields:\n• price [amount]\n• cost [amount]\n• stock [quantity]\n• threshold [quantity]\n• name [new-name]\n\nExamples:\n• edit bread price 3.00\n• edit bread cost 1.20\n• edit "carex condoms" stock 100';
    }

    const productName = match[1] || match[2];
    const field = match[3].toLowerCase();
    let value = match[4].trim();

    // For name field, remove quotes if present
    if (field === "name" && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    // Escape regex special characters in product name for search
    const escapedProductName = productName.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const product = await Product.findOne({
      shopId,
      name: { $regex: new RegExp(`^${escapedProductName}$`, "i") },
      isActive: true,
    });

    if (!product) {
      return `Product "${productName}" not found.`;
    }

    let oldValue, newValue, response;

    switch (field) {
      case "price":
        newValue = parseFloat(value);
        if (isNaN(newValue) || newValue <= 0) {
          return "Invalid price. Must be greater than 0.\nExample: 2.50";
        }
        oldValue = product.price;
        product.price = newValue;
        response = `*Price Updated!*\n\n${
          product.name
        }\nOld: $${oldValue.toFixed(2)}\nNew: $${newValue.toFixed(2)}`;
        break;

      case "cost":
        newValue = parseFloat(value);
        if (isNaN(newValue) || newValue < 0) {
          return "Invalid cost. Must be >= 0.\nExample: 1.20";
        }
        oldValue = product.costPrice;
        product.costPrice = newValue;
        response = `*Cost Updated!*\n\n${product.name}\nOld: ${
          oldValue == null ? "not set" : `$${Number(oldValue).toFixed(2)}`
        }\nNew: $${newValue.toFixed(2)}\nUnit margin at sell price: $${(
          product.price - newValue
        ).toFixed(2)}`;
        break;

      case "stock":
        newValue = parseInt(value);
        if (isNaN(newValue) || newValue < 0) {
          return "Invalid stock quantity.\nExample: 50";
        }
        oldValue = product.stock;
        product.stock = newValue;
        product.trackStock = true; // Ensure stock tracking is enabled
        response = `*Stock Updated!*\n\n${product.name}\nOld: ${oldValue} units\nNew: ${newValue} units`;

        if (newValue <= product.lowStockThreshold) {
          response += `\n\n*LOW STOCK!* Current stock (${newValue}) is at or below threshold (${product.lowStockThreshold})`;
        }
        break;

      case "threshold":
        newValue = parseInt(value);
        if (isNaN(newValue) || newValue < 0) {
          return "Invalid threshold.\nExample: 15";
        }
        oldValue = product.lowStockThreshold;
        product.lowStockThreshold = newValue;
        response = `*Low Stock Threshold Updated!*\n\n${product.name}\nOld: ${oldValue} units\nNew: ${newValue} units`;

        if (product.stock <= newValue) {
          response += `\n\n*NOTE:* Current stock (${product.stock}) is at or below new threshold`;
        }
        break;

      case "name":
        newValue = value;
        // For multi-word names, we need to check if they already exist
        // Escape regex special characters for search
        const escapedNewValue = newValue.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

        const existingProduct = await Product.findOne({
          shopId,
          name: { $regex: new RegExp(`^${escapedNewValue}$`, "i") },
          isActive: true,
          _id: { $ne: product._id },
        });

        if (existingProduct) {
          return `Product name "${newValue}" already exists.`;
        }

        oldValue = product.name;
        product.name = newValue;
        response = `*Product Renamed!*\n\nOld: ${oldValue}\nNew: ${newValue}`;
        break;

      default:
        return `Invalid field "${field}".\nAvailable fields: price, stock, threshold, name`;
    }

    await product.save();
    return response;
  } catch (error) {
    console.error("Edit product error:", error);
    return "Failed to update product. Please try again.";
  }
}

export async function handleSetThreshold(shopId, text) {
  try {
    // Remove the "threshold " prefix
    const input = text.replace("threshold ", "").trim();

    const match = input.match(/^(?:"([^"]+)"|(\S+))\s+(\d+)$/);

    if (!match) {
      return 'Invalid format.\n\nUse: threshold [product] [quantity]\n\nExamples:\n• threshold bread 15\n• threshold "carex condoms" 50\n• threshold "blue butterfly heels" 10';
    }

    const productName = match[1] || match[2]; // Group 1 is quoted, group 2 is unquoted
    const threshold = parseInt(match[3]);

    if (isNaN(threshold) || threshold < 0) {
      return "Invalid threshold. Please use a positive number.";
    }

    const product = await Product.findOne({
      shopId,
      name: new RegExp(`^${productName}$`, "i"),
      isActive: true,
    });

    if (!product) {
      return `Product "${productName}" not found.`;
    }

    product.lowStockThreshold = threshold;
    product.trackStock = true; // Enable stock tracking if setting threshold
    await product.save();

    const isLow = product.stock <= threshold;
    const warning = isLow
      ? `\n\n*Currently below threshold!*\nCurrent stock: ${product.stock}`
      : "";

    return `*Threshold updated!*\n\n${product.name}\nNew threshold: ${threshold}${warning}`;
  } catch (error) {
    console.error("Set threshold error:", error);
    return "Failed to set threshold. Please try again.";
  }
}

export async function handleListProducts(shopId) {
  try {
    const products = await Product.find({ shopId, isActive: true }).sort({
      name: 1,
    });

    if (products.length === 0) {
      return "*No products yet.*\n\nAdd your first product:\nadd [product] [price] stock [qty]\n\nExample: add bread 2.50 stock 50";
    }

    let list = "*PRODUCT LIST*\n\n";

    products.forEach((product) => {
      ensureVariants(product);
      const variants = activeVariants(product);
      const multi =
        variants.length > 1 ||
        variants.some((v) => Boolean(v.label?.trim())) ||
        variants.some((v) => activePacks(v).length > 1);

      const stockStatus = product.trackStock
        ? product.stock <= product.lowStockThreshold
          ? product.stock === 0
            ? "🔴"
            : "🟠"
          : "🟢"
        : "⚪";

      list += `${stockStatus} *${product.name}*`;
      if (!multi) {
        list += ` - $${Number(product.price).toFixed(2)}`;
        if (product.trackStock) {
          list += ` · stock ${product.stock}`;
        }
        list += "\n";
      } else {
        list += "\n";
        for (const v of variants) {
          const vName = v.label?.trim() || "Default";
          list += `   · ${vName}: $${Number(v.price).toFixed(2)}`;
          if (v.trackStock) list += ` · stock ${v.stock}`;
          const extraPacks = activePacks(v).filter(
            (p) =>
              p.unitsPerPack !== 1 || normalizeLabel(p.label) !== "single"
          );
          if (extraPacks.length) {
            list += ` · packs: ${extraPacks
              .map(
                (p) =>
                  `${p.label}(${p.unitsPerPack}) $${Number(p.price).toFixed(2)}`
              )
              .join(", ")}`;
          }
          list += "\n";
        }
      }
    });

    list +=
      "\n🟢 Good stock  🟠 Low  🔴 Out\n_Sell packs: sell 1 coke crate · Sell sizes: sell 1 cavela size 2_";

    return list;
  } catch (error) {
    console.error("List products error:", error);
    return "Failed to get products. Please try again.";
  }
}

/**
 * variant add [product] [label] [price] [stock qty?]
 * Examples:
 *   variant add coke 500ml 1.20 stock 48
 *   variant add "cavela shoes" "Size 2" 450 stock 8
 */
export async function handleVariantAdd(shopId, text) {
  try {
    const input = text.replace(/^variant\s+add\s+/i, "").trim();
    const tokens = tokenize(input);
    if (tokens.length < 2) {
      return 'Invalid format.\n\nUse: variant add [product] [label] [price] stock [qty]\n\nExamples:\n• variant add coke 500ml 1.20 stock 48\n• variant add "cavela shoes" "Size 2" 450 stock 8';
    }

    const products = await Product.find({ shopId, isActive: true });
    const matched = matchProductTokens(products, tokens, 0);
    if (!matched) {
      return `Product "${tokens[0]?.value || ""}" not found.\n\nAdd the product first: add [name] [price]`;
    }

    let i = matched.consumed;
    // Find price token (number > 0)
    let priceIdx = -1;
    for (let j = i; j < tokens.length; j += 1) {
      if (!tokens[j].quoted && /^\d+(\.\d+)?$/.test(tokens[j].value)) {
        priceIdx = j;
        break;
      }
    }
    if (priceIdx < 0 || priceIdx === i) {
      return 'Missing price.\n\nUse: variant add [product] [label] [price] stock [qty]';
    }

    const label = tokens
      .slice(i, priceIdx)
      .map((t) => t.value)
      .join(" ")
      .trim();
    if (!label) {
      return "Variant label is required (e.g. Size 2, 500ml, 1kg).";
    }

    const price = parseFloat(tokens[priceIdx].value);
    if (!Number.isFinite(price) || price <= 0) {
      return "Invalid price.";
    }

    let stock = 0;
    const after = tokens.slice(priceIdx + 1);
    if (after.length >= 2 && /^stock$/i.test(after[0].value)) {
      stock = parseInt(after[1].value, 10);
      if (!Number.isFinite(stock) || stock < 0) {
        return "Invalid stock quantity.";
      }
    } else if (after.length === 1 && /^\d+$/.test(after[0].value)) {
      stock = parseInt(after[0].value, 10);
    }

    const product = matched.product;
    ensureVariants(product);
    const exists = activeVariants(product).some((v) =>
      normalizeLabel(v.label) === normalizeLabel(label)
    );
    if (exists) {
      return `Variant "${label}" already exists on ${product.name}.`;
    }

    const shop = await Shop.findById(shopId).select("settings.lowStockAlert");
    const threshold =
      shop?.settings?.lowStockAlert != null
        ? Number(shop.settings.lowStockAlert)
        : 10;

    product.variants.push(
      buildDefaultVariant({
        label,
        price,
        stock,
        lowStockThreshold: Number.isFinite(threshold) ? threshold : 10,
        trackStock: true,
        sortOrder: product.variants.length,
      })
    );
    syncProductMirrors(product);
    await product.save();

    return `*Variant added!*\n\n${product.name} · ${label}\nPrice: $${price.toFixed(2)}\nStock: ${stock}`;
  } catch (error) {
    console.error("Variant add error:", error);
    return "Failed to add variant. Please try again.";
  }
}

/**
 * pack add [product] [variant?] [label] [units] [price]
 * Examples:
 *   pack add coke 500ml Crate 24 25
 *   pack add coke Crate 24 25   (unique pack path / primary variant)
 *   pack add eggs Tray 30 5.50
 */
export async function handlePackAdd(shopId, text) {
  try {
    const input = text.replace(/^pack\s+add\s+/i, "").trim();
    const tokens = tokenize(input);
    if (tokens.length < 3) {
      return 'Invalid format.\n\nUse: pack add [product] [variant?] [label] [units] [price]\n\nExamples:\n• pack add coke 500ml Crate 24 25\n• pack add eggs Tray 30 5.50';
    }

    const products = await Product.find({ shopId, isActive: true });
    const matched = matchProductTokens(products, tokens, 0);
    if (!matched) {
      return `Product "${tokens[0]?.value || ""}" not found.`;
    }

    const product = matched.product;
    ensureVariants(product);
    let i = matched.consumed;

    // Optional variant label before pack label
    const variants = activeVariants(product);
    let variant = null;
    const vMatch = (() => {
      for (let len = Math.min(4, tokens.length - i); len >= 1; len -= 1) {
        const slice = tokens.slice(i, i + len);
        if (slice.some((t) => !t.quoted && /^\d+(\.\d+)?$/.test(t.value))) {
          continue;
        }
        const query = slice.map((t) => t.value).join(" ");
        const hit = variants.find(
          (v) => normalizeLabel(v.label) === normalizeLabel(query)
        );
        if (hit) return { variant: hit, consumed: len };
      }
      return null;
    })();
    if (vMatch) {
      variant = vMatch.variant;
      i += vMatch.consumed;
    } else {
      variant = variants[0];
    }

    // Remaining: label units price — last two must be units + price numbers
    const rest = tokens.slice(i);
    if (rest.length < 3) {
      return 'Need pack label, units, and price.\nExample: pack add coke Crate 24 25';
    }
    const priceTok = rest[rest.length - 1];
    const unitsTok = rest[rest.length - 2];
    if (
      !/^\d+(\.\d+)?$/.test(priceTok.value) ||
      !/^\d+$/.test(unitsTok.value) ||
      priceTok.quoted ||
      unitsTok.quoted
    ) {
      return "Units and price must be numbers at the end.\nExample: pack add coke Crate 24 25";
    }
    const label = rest
      .slice(0, -2)
      .map((t) => t.value)
      .join(" ")
      .trim();
    const unitsPerPack = parseInt(unitsTok.value, 10);
    const price = parseFloat(priceTok.value);
    if (!label) return "Pack label is required.";
    if (!Number.isFinite(unitsPerPack) || unitsPerPack < 1) {
      return "units must be >= 1.";
    }
    if (!Number.isFinite(price) || price < 0) return "Invalid price.";

    const exists = activePacks(variant).some(
      (p) => normalizeLabel(p.label) === normalizeLabel(label)
    );
    if (exists) {
      return `Pack "${label}" already exists on ${product.name}${
        variant.label ? ` · ${variant.label}` : ""
      }.`;
    }

    variant.packs.push(
      buildDefaultPack({
        label,
        unitsPerPack,
        price,
        costPrice:
          typeof variant.costPrice === "number"
            ? variant.costPrice * unitsPerPack
            : null,
        sortOrder: (variant.packs || []).length,
      })
    );
    await product.save();

    const where = variant.label
      ? `${product.name} · ${variant.label}`
      : product.name;
    return `*Pack added!*\n\n${where}\n${label} (${unitsPerPack}) @ $${price.toFixed(2)}\n\nSell with: sell 1 ${product.name.split(" ")[0].toLowerCase()} ${label.toLowerCase()}`;
  } catch (error) {
    console.error("Pack add error:", error);
    return "Failed to add pack. Please try again.";
  }
}

