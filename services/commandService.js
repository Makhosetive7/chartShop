import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import Shop from "../models/Shop.js";
import bcrypt from "bcrypt";

class CommandService {
  async processCommand(telegramId, text) {
    const command = text.trim().toLowerCase();

    // Register command
    if (command.startsWith("register ")) {
      return await this.handleRegister(telegramId, text);
    }

    // Login command
    if (command.startsWith("login ")) {
      return await this.handleLogin(telegramId, text);
    }

    // logout command
    if (command === "logout") {
      return await this.handleLogout(telegramId);
    }
    // Get shop for authenticated commands
    const shop = await Shop.findOne({ telegramId, isActive: true });
    if (!shop) {
      return 'Please register or login first.\n\nUse: register [business name] [pin]\nOr: login [pin]\nExample: register "My Shop" 1234';
    }

    // Sell command with optional pricing
    if (command.startsWith("sell ")) {
      return await this.handleSell(shop._id, text);
    }

    // Add product
    if (command.startsWith("add ")) {
      return await this.handleAddProduct(shop._id, text);
    }

    // List products
    if (command === "list" || command === "products") {
      return await this.handleListProducts(shop._id);
    }

    // Daily total - ENHANCED: now shows detailed product sales
    if (command === "daily" || command === "total") {
      return await this.handleDailyTotal(shop._id);
    }

    // Stock update command
    if (command.startsWith("stock ")) {
      return await this.handleUpdateStock(shop._id, text);
    }

    // Low stock report command
    if (command === "low stock" || command === "lowstock") {
      return await this.handleLowStock(shop._id);
    }

    // Set stock threshold command
    if (command.startsWith("threshold ")) {
      return await this.handleSetThreshold(shop._id, text);
    }

    // Help
    if (command === "help") {
      return this.getHelpText();
    }

    return 'Unknown command. Type "help" for available commands.';
  }

  async handleRegister(telegramId, text) {
    try {
      const match =
        text.match(/register\s+"([^"]+)"\s+(\d{4})/i) ||
        text.match(/register\s+(\w+)\s+(\d{4})/i);

      if (!match) {
        return 'Invalid format.\n\nUse: register [business name] [pin]\nExample: register "My Shop" 1234';
      }

      const businessName = match[1];
      const pin = match[2];

      const existing = await Shop.findOne({ telegramId });
      if (existing) {
        return "You are already registered!\n\nUse: login [pin]";
      }

      const hashedPin = await bcrypt.hash(pin, 10);

      await Shop.create({
        telegramId,
        businessName,
        pin: hashedPin,
        isActive: true, // NEW: Auto-login after registration
      });

      return `*Registration successful!*\n\n Welcome, ${businessName}!\n\nUse: login [pin] to access your account.`;
    } catch (error) {
      console.error("Register error:", error);
      return "Registration failed. Please try again.";
    }
  }

  async handleLogin(telegramId, text) {
    try {
      const parts = text.split(" ");
      const pin = parts[1];

      if (!pin || pin.length !== 4) {
        return "Invalid PIN.\n\nUse: login [pin]\nExample: login 1234";
      }

      const shop = await Shop.findOne({ telegramId });
      if (!shop) {
        return "Not registered.\n\nUse: register [business name] [pin]";
      }

      const isValid = await bcrypt.compare(pin, shop.pin);
      if (!isValid) {
        return "Invalid PIN. Please try again.";
      }

      shop.isActive = true;
      await shop.save();

      return `*Welcome back, ${shop.businessName}!*\n\nBusiness: ${businessName}\n\nYou can now:\n• add bread 2.50 - Add products\n• list - View products\n• sell 2 bread - Record sales\n• sell 2 bread 2.00 - Sell at custom price\n• daily - View detailed report\n\nType "help" for more commands.`;
    } catch (error) {
      console.error("Login error:", error);
      return "Login failed. Please try again.";
    }
  }

  async handleLogout(telegramId) {
    try {
      const shop = await Shop.findOne({ telegramId, isActive: true });

      if (!shop) {
        return "You are not currently logged in.";
      }

      // Deactivate the shop session
      shop.isActive = false;
      await shop.save();

      return `*Logged out successfully!*\n\nGoodbye, ${shop.businessName}! \n\nUse "login [pin]" to log back in.`;
    } catch (error) {
      console.error("Logout error:", error);
      return "Failed to logout. Please try again.";
    }
  }

  async handleSell(shopId, text) {
    try {
      const parts = text.replace("sell ", "").trim().split(" ");

      const items = [];
      let total = 0;

      // Parse items with optional custom pricing
      let i = 0;
      while (i < parts.length) {
        const quantity = parseInt(parts[i]);

        if (isNaN(quantity)) {
          return `Invalid quantity: "${parts[i]}"\n\nUse: sell [qty] [product] [price?] [qty] [product] [price?]...\nExample: sell 2 bread 1 milk\nExample with custom price: sell 2 bread 2.00 1 milk 1.50`;
        }

        const productName = parts[i + 1];
        if (!productName) {
          return "Missing product name after quantity.";
        }

        // Check if next part is a price (numeric) or another product
        let price = null;
        let nextIndex = i + 2;

        // If there's a next part and it's a number, it's a custom price
        if (nextIndex < parts.length && !isNaN(parseFloat(parts[nextIndex]))) {
          price = parseFloat(parts[nextIndex]);
          nextIndex++;
        }

        const product = await Product.findOne({
          shopId,
          name: new RegExp(`^${productName}$`, "i"),
          isActive: true,
        });

        if (!product) {
          return `Product "${productName}" not found.\n\nType "list" to see available products.`;
        }

        // Use custom price if provided, otherwise use product price
        const finalPrice = price !== null ? price : product.price;

        // Stock check
        if (product.trackStock && product.stock < quantity) {
          return `*Insufficient stock!*\n\n${product.name}\nRequested: ${quantity}\nAvailable: ${product.stock}\n\nUpdate stock with: stock ${productName} [quantity]`;
        }

        const itemTotal = quantity * finalPrice;
        items.push({
          productId: product._id,
          product: product,
          productName: product.name,
          quantity,
          price: finalPrice, // Use the actual selling price
          standardPrice: product.price, // Keep reference to standard price
          isCustomPrice: price !== null,
          total: itemTotal,
        });

        total += itemTotal;
        i = nextIndex;
      }

      // Deduct stock and save sale
      for (const item of items) {
        if (item.product.trackStock) {
          item.product.stock -= item.quantity;
          await item.product.save();
        }
      }

      // Save sale with actual prices
      await Sale.create({
        shopId,
        items: items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price, // Actual selling price
          standardPrice: item.standardPrice, // Standard price for reference
          isCustomPrice: item.isCustomPrice,
          total: item.total,
        })),
        total,
      });

      // Format receipt
      let receipt = "*SALE RECORDED*\n\n";
      items.forEach((item) => {
        const priceIndicator = item.isCustomPrice ? "💲" : "💰";
        receipt += `${priceIndicator} ${item.quantity}x ${
          item.productName
        } @ $${item.price.toFixed(2)}`;

        if (item.isCustomPrice) {
          receipt += ` (standard: $${item.standardPrice.toFixed(2)})`;
        }
        receipt += "\n";

        // Show remaining stock
        if (item.product.trackStock) {
          receipt += `   (${item.product.stock} remaining)`;

          // Low stock warning
          if (item.product.stock <= item.product.lowStockThreshold) {
            receipt += ` low stock`;
          }
          receipt += "\n";
        }
      });
      receipt += `\n*Total: $${total.toFixed(2)}*`;

      // Add low stock summary if any
      const lowStockItems = items.filter(
        (item) =>
          item.product.trackStock &&
          item.product.stock <= item.product.lowStockThreshold
      );

      if (lowStockItems.length > 0) {
        receipt += "\n\n*Low stock items:*\n";
        lowStockItems.forEach((item) => {
          receipt += `• ${item.productName} (${item.product.stock} left)\n`;
        });
      }

      return receipt;
    } catch (error) {
      console.error("Sell error:", error);
      return "Failed to record sale. Please try again.";
    }
  }

  async handleAddProduct(shopId, text) {
    try {
      const parts = text.replace("add ", "").trim().split(" ");

      if (parts.length < 2) {
        return "Invalid format.\n\nUse: add [product] [price]\nWith stock: add [product] [price] stock [qty]\n\nExample: add bread 2.50 stock 50";
      }

      const name = parts[0];
      const price = parseFloat(parts[1]);

      if (isNaN(price) || price <= 0) {
        return "Invalid price. Please use a positive number.\nExample: 2.50";
      }

      // Parse stock if provided
      let stock = 0;
      const stockIndex = parts.indexOf("stock");
      if (stockIndex !== -1 && parts[stockIndex + 1]) {
        stock = parseInt(parts[stockIndex + 1]);
        if (isNaN(stock) || stock < 0) {
          return "Invalid stock quantity.";
        }
      }

      // Parse threshold if provided
      let lowStockThreshold = 10;
      const thresholdIndex = parts.indexOf("threshold");
      if (thresholdIndex !== -1 && parts[thresholdIndex + 1]) {
        lowStockThreshold = parseInt(parts[thresholdIndex + 1]);
        if (isNaN(lowStockThreshold) || lowStockThreshold < 0) {
          return "Invalid threshold.";
        }
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
        stock,
        lowStockThreshold,
        trackStock: true,
      });

      let response = `*Product added!*\n\n`;
      response += `Name: ${name}\n`;
      response += `Price: $${price.toFixed(2)}\n`;
      response += `Stock: ${stock}\n`;
      response += `Low Stock Alert: ${lowStockThreshold}`;

      if (stock <= lowStockThreshold) {
        response += "\n\n*Stock is below threshold!*";
      }

      return response;
    } catch (error) {
      console.error("Add product error:", error);
      return "Failed to add product. Please try again.";
    }
  }

  async handleUpdateStock(shopId, text) {
    try {
      const parts = text.replace("stock ", "").trim().split(" ");

      if (parts.length < 2) {
        return "Invalid format.\n\nUse:\n• stock [product] [quantity]\n• stock +[product] [quantity] (add)\n• stock -[product] [quantity] (remove)\n\nExample: stock bread 50";
      }

      let productName = parts[0];
      let quantity = parseInt(parts[1]);
      let operation = "set";

      // Check for +/- prefix
      if (productName.startsWith("+")) {
        operation = "add";
        productName = productName.slice(1);
      } else if (productName.startsWith("-")) {
        operation = "remove";
        productName = productName.slice(1);
      }

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

      // Update stock based on operation
      let newStock;
      let message;

      switch (operation) {
        case "add":
          newStock = product.stock + quantity;
          message = `Added ${quantity} units`;
          break;
        case "remove":
          newStock = product.stock - quantity;
          if (newStock < 0) {
            return `Cannot remove ${quantity} units. Current stock: ${product.stock}`;
          }
          message = `Removed ${quantity} units`;
          break;
        case "set":
        default:
          newStock = quantity;
          message = `Set to ${quantity} units`;
          break;
      }

      product.stock = newStock;
      await product.save();

      // Check if stock is low
      const isLowStock =
        product.trackStock && newStock <= product.lowStockThreshold;
      const lowStockWarning = isLowStock ? `\n\n*LOW STOCK WARNING!*` : "";

      return `*Stock updated!*\n\n${product.name}\n${message}\nCurrent stock: ${newStock}${lowStockWarning}`;
    } catch (error) {
      console.error("Stock update error:", error);
      return "Failed to update stock. Please try again.";
    }
  }

  async handleLowStock(shopId) {
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

  async handleSetThreshold(shopId, text) {
    try {
      // Parse: threshold bread 15
      const parts = text.replace("threshold ", "").trim().split(" ");

      if (parts.length < 2) {
        return "Invalid format.\n\nUse: threshold [product] [quantity]\nExample: threshold bread 15";
      }

      const productName = parts[0];
      const threshold = parseInt(parts[1]);

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

  async handleListProducts(shopId) {
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

  async handleDailyTotal(shopId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sales = await Sale.find({
        shopId,
        date: { $gte: today },
      }).populate("items.productId");

      if (sales.length === 0) {
        return "*No sales today yet.*";
      }

      const total = sales.reduce((sum, sale) => sum + sale.total, 0);
      const itemCount = sales.reduce(
        (sum, sale) =>
          sum + sale.items.reduce((s, item) => s + item.quantity, 0),
        0
      );

      // NEW: Detailed product breakdown
      const productSales = {};
      sales.forEach((sale) => {
        sale.items.forEach((item) => {
          if (!productSales[item.productName]) {
            productSales[item.productName] = {
              quantity: 0,
              totalRevenue: 0,
              standardPrice: item.standardPrice,
              customPriceSales: 0,
            };
          }
          productSales[item.productName].quantity += item.quantity;
          productSales[item.productName].totalRevenue += item.total;
          if (item.isCustomPrice) {
            productSales[item.productName].customPriceSales += item.quantity;
          }
        });
      });

      let report = "*DAILY REPORT*\n\n";
      report += `Total Sales: $${total.toFixed(2)}\n`;
      report += `Transactions: ${sales.length}\n`;
      report += `Items Sold: ${itemCount}\n`;
      report += `Average per Transaction: $${(total / sales.length).toFixed(
        2
      )}\n\n`;

      // NEW: Product-wise breakdown
      report += "*PRODUCT BREAKDOWN*\n";
      Object.entries(productSales).forEach(([productName, data]) => {
        const avgPrice = data.totalRevenue / data.quantity;
        const priceIndicator = data.customPriceSales > 0 ? "💲" : "💰";

        report += `\n${priceIndicator} *${productName}*\n`;
        report += `   Sold: ${data.quantity} units\n`;
        report += `   Revenue: $${data.totalRevenue.toFixed(2)}\n`;
        report += `   Avg Price: $${avgPrice.toFixed(2)}`;

        if (data.standardPrice && avgPrice !== data.standardPrice) {
          report += ` (standard: $${data.standardPrice.toFixed(2)})`;
        }

        if (data.customPriceSales > 0) {
          report += `\n   Negotiated: ${data.customPriceSales} units`;
        }
      });

      return report;
    } catch (error) {
      console.error("Daily total error:", error);
      return "Failed to get report. Please try again.";
    }
  }

  getHelpText() {
    return `*CHATSHOP COMMANDS*

*Authentication:*
• register "Shop Name" 1234
• login 1234
• logout - Sign out

*Sales:*
• sell [qty] [item] [price?] [qty] [item] [price?]...
  _Example:_ sell 2 bread 1 milk
  _Example with custom price:_ sell 2 bread 2.00 1 milk 1.50

*Products:*
• add [product] [price] stock [qty]
  _Example:_ add bread 2.50 stock 50
• list - Show all products

*Stock Management:*
• stock [product] [qty] - Set stock
• stock +[product] [qty] - Add stock
• stock -[product] [qty] - Remove stock
• low stock - Show low stock items
• threshold [product] [qty] - Set alert level

*Reports:*
• daily - Today's detailed report with product prices

*Help:*
• help - Show this message

Type any command to get started!`;
  }
}

export default new CommandService();
