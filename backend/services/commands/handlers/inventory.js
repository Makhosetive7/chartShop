import Product from "../../../models/Product.js";
import Sale from "../../../models/Sale.js";
import Shop from "../../../models/Shop.js";

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
    // Remove the "stock " prefix
    const input = text.replace("stock ", "").trim();

    // Regex to match: operation? + quoted/word product name + quantity
    const match = input.match(/^(?:(=|[\+\-])?)(?:"([^"]+)"|(\S+))\s+(\d+)$/);

    if (!match) {
      return 'Invalid format.\n\nUse:\n• stock [product] [quantity] - Add to stock\n• stock =[product] [quantity] - Set exact stock\n• stock -[product] [quantity] - Remove from stock\n• stock +[product] [quantity] - Add to stock\n\nExamples:\n• stock bread 50\n• stock "carex condoms" 100\n• stock ="blue butterfly heels" 25\n• stock -"premium headphones" 5';
    }

    const operation = match[1] || "+"; // Default to add
    const productName = match[2] || match[3]; // Group 2 is quoted, group 3 is unquoted
    const quantity = parseInt(match[4]);

    if (isNaN(quantity) || quantity < 0) {
      return "Invalid quantity. Please use a positive number.";
    }

    // Find product
    const product = await Product.findOne({
      shopId,
      name: new RegExp(`^${productName}$`, "i"),
      isActive: true,
    });

    if (!product) {
      return `Product "${productName}" not found.\n\nType "list" to see available products.`;
    }

    if (!product.trackStock) {
      return `Product "${productName}" is not configured to track stock.\n\nUpdate the product first to enable stock tracking.`;
    }

    // Update stock based on operation
    let newStock;
    let message;
    const oldStock = product.stock;

    switch (operation) {
      case "+":
      case "": // No prefix means add
        newStock = product.stock + quantity;
        message = `Added ${quantity} units (was ${oldStock})`;
        break;
      case "-":
        newStock = product.stock - quantity;
        if (newStock < 0) {
          return `Cannot remove ${quantity} units. Current stock: ${product.stock}`;
        }
        message = `Removed ${quantity} units (was ${oldStock})`;
        break;
      case "=":
        newStock = quantity;
        message = `Set to exactly ${quantity} units (was ${oldStock})`;
        break;
    }

    product.stock = newStock;
    await product.save();

    // Check if stock is low
    const isLowStock =
      product.trackStock && newStock <= product.lowStockThreshold;
    const lowStockWarning = isLowStock ? `\n\n*LOW STOCK WARNING!*` : "";

    return `*Stock Updated!*\n\n${product.name}\n${message}\nNew stock: ${newStock}${lowStockWarning}`;
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
      const stockStatus = product.trackStock
        ? product.stock <= product.lowStockThreshold
          ? product.stock === 0
            ? "🔴"
            : "🟠"
          : "🟢"
        : "⚪";

      list += `${stockStatus} *${product.name}* - $${product.price.toFixed(
        2
      )}\n`;
      if (product.costPrice != null) {
        list += `   Cost: $${Number(product.costPrice).toFixed(2)} (margin $${(
          product.price - product.costPrice
        ).toFixed(2)})\n`;
      }

      if (product.trackStock) {
        list += `   Stock: ${product.stock}`;
        if (product.stock <= product.lowStockThreshold) {
          list += ` LOW`;
        }
        list += "\n";
      }
    });

    list += "\n🟢 Good stock  🟠 Low  🔴 Out";

    return list;
  } catch (error) {
    console.error("List products error:", error);
    return "Failed to get products. Please try again.";
  }
}

