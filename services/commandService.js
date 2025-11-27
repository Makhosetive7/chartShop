import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import Shop from "../models/Shop.js";
import bcrypt from "bcrypt";
import PDFService from "./PDFService.js";

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

    // Daily total command
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

    //update price command
    if (command.startsWith("price ")) {
      return await this.handleUpdatePrice(shop._id, text);
    }

    //delete product command
    if (command.startsWith("delete ")) {
      return await this.handleDeleteProduct(shop._id, text);
    }

    //edit product command
    if (command.startsWith("edit ")) {
      return await this.handleEditProduct(shop._id, text);
    }

    //weekely report command
    if (command.startsWith("weekly") || command.startsWith("week")) {
      return await this.handleWeeklyReport(shop._id);
    }

    //monthly report command
    if (command.startsWith("monthly") || command.startsWith("month")) {
      return await this.handleMonthlyReport(shop._id);
    }
    //best seling product command
    if (
      command.startsWith("best selling") ||
      command.startsWith("bestselling") ||
      command.startsWith("best")
    ) {
      return await this.handleBestSellingProducts(shop._id, text);
    }

        // PDF Export commands - Enhanced handling
    if (command.startsWith("export ") || command.startsWith("pdf ")) {
      return await this.handleExportReport(shop, text);
    }

    // Help
    if (command === "help") {
      return this.getHelpText();
    }

    return 'Unknown command. Type "help" for available commands.';
  }

  getWeeklyInsight(revenueGrowth, volumeGrowth) {
    if (revenueGrowth > 20 && volumeGrowth > 20) {
      return "Excellent week! Both revenue and volume growing strongly.";
    } else if (revenueGrowth > 10 && volumeGrowth > 10) {
      return "Good growth week. Business is trending up!";
    } else if (revenueGrowth > 0 && volumeGrowth > 0) {
      return "Steady growth. Consider promotions to accelerate.";
    } else if (revenueGrowth < 0 || volumeGrowth < 0) {
      return "Sales declined this week. Check pricing and promotions.";
    } else {
      return "Stable performance. Look for new growth opportunities.";
    }
  }

  getMonthlyInsight(revenueGrowth, totalRevenue) {
    if (revenueGrowth > 25) {
      return "Outstanding month! You're growing rapidly.";
    } else if (revenueGrowth > 10) {
      return "Strong monthly growth. Business is healthy!";
    } else if (revenueGrowth > 0) {
      return "Moderate growth. Time to optimize operations.";
    } else {
      return "Challenging month. Review strategy and customer needs.";
    }
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

  async handleUpdatePrice(shopId, text) {
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

  async handleDeleteProduct(shopId, text) {
    try {
      const parts = text.replace("delete ", "").trim().split(" ");
      const productName = parts[0];
      const isConfirmed = parts[1] && parts[1].toLowerCase() === "confirm";

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
        warningMessage += `Sales History: ${salesCount} transactions\n\n`;

        if (salesCount > 0) {
          warningMessage += `This product has sales history and will be *archived*.\n`;
          warningMessage += `Sales reports will still show this product.\n\n`;
        }

        warningMessage += `Type: *delete ${product.name} confirm* to proceed.`;
        return warningMessage;
      }

      // soft delete - always preserve data
      product.isActive = false;
      await product.save();

      if (salesCount > 0) {
        return `*Product Archived Successfully!*\n\n${product.name} has been archived.\n\n Note: This product appears in ${salesCount} past sales and will remain in your sales history reports.`;
      } else {
        return `*Product Deleted Successfully!*\n\n${product.name} has been removed from your product list.`;
      }
    } catch (error) {
      console.error("Delete product error:", error);
      return "Failed to delete product. Please try again.";
    }
  }

  async handleEditProduct(shopId, text) {
    try {
      const parts = text.replace("edit ", "").trim().split(" ");

      if (parts.length < 3) {
        return 'Invalid format.\n\nUse: edit [product] [field] [value]\n\nAvailable fields:\n• price [amount]\n• stock [quantity]\n• threshold [quantity]\n• name [new-name]\n\nExamples:\n• edit bread price 3.00\n• edit milk stock 25\n• edit sugar threshold 10\n• edit bread name "White Bread"';
      }

      const productName = parts[0];
      const field = parts[1].toLowerCase();
      const value = parts[2];

      const product = await Product.findOne({
        shopId,
        name: new RegExp(`^${productName}$`, "i"),
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

        case "stock":
          newValue = parseInt(value);
          if (isNaN(newValue) || newValue < 0) {
            return "Invalid stock quantity.\nExample: 50";
          }
          oldValue = product.stock;
          product.stock = newValue;
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
          // Check if new name already exists
          const existingProduct = await Product.findOne({
            shopId,
            name: new RegExp(`^${newValue}$`, "i"),
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

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const sales = await Sale.find({
        shopId,
        date: { $gte: today },
      });

      const yesterdaySales = await Sale.find({
        shopId,
        date: { $gte: yesterday, $lt: today },
      });

      if (sales.length === 0) {
        return `*DAILY REPORT - ${today.toDateString()}*\n\nNo sales today yet.\n\nYesterday's Total: $${yesterdaySales
          .reduce((sum, sale) => sum + sale.total, 0)
          .toFixed(2)}`;
      }

      const total = sales.reduce((sum, sale) => sum + sale.total, 0);
      const itemCount = sales.reduce(
        (sum, sale) =>
          sum + sale.items.reduce((s, item) => s + item.quantity, 0),
        0
      );

      const yesterdayTotal = yesterdaySales.reduce(
        (sum, sale) => sum + sale.total,
        0
      );
      const growth =
        yesterdayTotal > 0
          ? ((total - yesterdayTotal) / yesterdayTotal) * 100
          : 100;

      // Product breakdown
      const productSales = {};
      sales.forEach((sale) => {
        sale.items.forEach((item) => {
          if (!productSales[item.productName]) {
            productSales[item.productName] = { quantity: 0, revenue: 0 };
          }
          productSales[item.productName].quantity += item.quantity;
          productSales[item.productName].revenue += item.total;
        });
      });

      let report = `*DAILY BUSINESS REPORT*\n\n`;
      report += `Date: ${today.toDateString()}\n\n`;

      report += `*TODAY'S SUMMARY*\n`;
      report += `Total Sales: $${total.toFixed(2)}\n`;
      report += `Items Sold: ${itemCount}\n`;
      report += `Transactions: ${sales.length}\n`;
      report += `Average per Sale: $${(total / sales.length).toFixed(2)}\n`;
      report += `Vs Yesterday: ${
        growth >= 0 ? "Increase" : "Decrease"
      } ${Math.abs(growth).toFixed(1)}%\n\n`;

      report += `🛍️ *PRODUCT BREAKDOWN*\n`;
      Object.entries(productSales).forEach(([product, data]) => {
        report += `• ${product}: ${
          data.quantity
        } units ($${data.revenue.toFixed(2)})\n`;
      });

      // Today's best seller
      const todayBestSeller = Object.entries(productSales).sort(
        (a, b) => b[1].quantity - a[1].quantity
      )[0];

      if (todayBestSeller) {
        report += `\n*TODAY'S STAR*: ${todayBestSeller[0]} (${todayBestSeller[1].quantity} sold)`;
      }

      return report;
    } catch (error) {
      console.error("Daily total error:", error);
      return "Failed to get daily report. Please try again.";
    }
  }

  async handleWeeklyReport(shopId) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);

      // Get current period data
      const currentSales = await Sale.find({
        shopId,
        date: { $gte: startDate, $lte: endDate },
      });

      // Get previous period data for comparison
      const prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 7);
      const prevEndDate = new Date(startDate);

      const previousSales = await Sale.find({
        shopId,
        date: { $gte: prevStartDate, $lte: prevEndDate },
      });

      if (currentSales.length === 0) {
        return `*WEEKLY REPORT*\n\nNo sales in the last 7 days.\nPeriod: ${startDate.toDateString()} - ${endDate.toDateString()}`;
      }

      // Calculate totals
      const currentTotal = currentSales.reduce(
        (sum, sale) => sum + sale.total,
        0
      );
      const currentItems = currentSales.reduce(
        (sum, sale) =>
          sum +
          sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
      );

      const previousTotal = previousSales.reduce(
        (sum, sale) => sum + sale.total,
        0
      );
      const previousItems = previousSales.reduce(
        (sum, sale) =>
          sum +
          sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
      );

      // Calculate growth
      const revenueGrowth =
        previousTotal > 0
          ? ((currentTotal - previousTotal) / previousTotal) * 100
          : 100;
      const volumeGrowth =
        previousItems > 0
          ? ((currentItems - previousItems) / previousItems) * 100
          : 100;

      // Daily breakdown
      const dailyBreakdown = {};
      currentSales.forEach((sale) => {
        const day = sale.date.toDateString();
        if (!dailyBreakdown[day]) {
          dailyBreakdown[day] = { sales: 0, items: 0, transactions: 0 };
        }
        dailyBreakdown[day].sales += sale.total;
        dailyBreakdown[day].items += sale.items.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
        dailyBreakdown[day].transactions += 1;
      });

      // Top products
      const productSales = {};
      currentSales.forEach((sale) => {
        sale.items.forEach((item) => {
          if (!productSales[item.productName]) {
            productSales[item.productName] = { quantity: 0, revenue: 0 };
          }
          productSales[item.productName].quantity += item.quantity;
          productSales[item.productName].revenue += item.total;
        });
      });

      const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1].quantity - a[1].quantity)
        .slice(0, 5);

      let report = `*WEEKLY BUSINESS REPORT*\n\n`;
      report += `Period: ${startDate.toDateString()} - ${endDate.toDateString()}\n`;
      report += `Compared to: ${prevStartDate.toDateString()} - ${prevEndDate.toDateString()}\n\n`;

      report += `*FINANCIAL SUMMARY*\n`;
      report += `Total Revenue: $${currentTotal.toFixed(2)}\n`;
      report += `Previous Week: $${previousTotal.toFixed(2)}\n`;
      report += `Growth: ${
        revenueGrowth >= 0 ? "Increase" : "Decrease"
      } ${Math.abs(revenueGrowth).toFixed(1)}%\n\n`;

      report += `*VOLUME SUMMARY*\n`;
      report += `Items Sold: ${currentItems}\n`;
      report += `Previous Week: ${previousItems}\n`;
      report += `Growth: ${
        volumeGrowth >= 0 ? "Increase" : "Decrease"
      } ${Math.abs(volumeGrowth).toFixed(1)}%\n\n`;

      report += `*TRANSACTION SUMMARY*\n`;
      report += `Total Transactions: ${currentSales.length}\n`;
      report += `Avg per Transaction: $${(
        currentTotal / currentSales.length
      ).toFixed(2)}\n\n`;

      report += `*DAILY BREAKDOWN*\n`;
      Object.entries(dailyBreakdown).forEach(([day, data]) => {
        report += `${new Date(day).toLocaleDateString("en", {
          weekday: "short",
        })}: $${data.sales.toFixed(2)} (${data.items} items)\n`;
      });

      if (topProducts.length > 0) {
        report += `\n*TOP 5 PRODUCTS THIS WEEK*\n`;
        topProducts.forEach(([product, data], index) => {
          const medals = ["Gold", "Silver", "Bronze", "4th", "5️th"];
          report += `${medals[index]} ${product}: ${
            data.quantity
          } sold ($${data.revenue.toFixed(2)})\n`;
        });
      }

      report += `\n*Insight:* ${this.getWeeklyInsight(
        revenueGrowth,
        volumeGrowth
      )}`;

      return report;
    } catch (error) {
      console.error("Weekly report error:", error);
      return "Failed to generate weekly report. Please try again.";
    }
  }

  async handleMonthlyReport(shopId) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);

      // Get current period data
      const currentSales = await Sale.find({
        shopId,
        date: { $gte: startDate, $lte: endDate },
      });

      // Get previous period data
      const prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 30);
      const prevEndDate = new Date(startDate);

      const previousSales = await Sale.find({
        shopId,
        date: { $gte: prevStartDate, $lte: prevEndDate },
      });

      if (currentSales.length === 0) {
        return `*MONTHLY REPORT*\n\nNo sales in the last 30 days.\nPeriod: ${startDate.toDateString()} - ${endDate.toDateString()}`;
      }

      // Calculate totals
      const currentTotal = currentSales.reduce(
        (sum, sale) => sum + sale.total,
        0
      );
      const currentItems = currentSales.reduce(
        (sum, sale) =>
          sum +
          sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
      );

      const previousTotal = previousSales.reduce(
        (sum, sale) => sum + sale.total,
        0
      );
      const previousItems = previousSales.reduce(
        (sum, sale) =>
          sum +
          sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
      );

      // Calculate growth
      const revenueGrowth =
        previousTotal > 0
          ? ((currentTotal - previousTotal) / previousTotal) * 100
          : 100;
      const volumeGrowth =
        previousItems > 0
          ? ((currentItems - previousItems) / previousItems) * 100
          : 100;

      // Weekly breakdown
      const weeklyBreakdown = {};
      currentSales.forEach((sale) => {
        const weekStart = new Date(sale.date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toDateString();

        if (!weeklyBreakdown[weekKey]) {
          weeklyBreakdown[weekKey] = { sales: 0, items: 0, transactions: 0 };
        }
        weeklyBreakdown[weekKey].sales += sale.total;
        weeklyBreakdown[weekKey].items += sale.items.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
        weeklyBreakdown[weekKey].transactions += 1;
      });

      // Top products
      const productSales = {};
      currentSales.forEach((sale) => {
        sale.items.forEach((item) => {
          if (!productSales[item.productName]) {
            productSales[item.productName] = { quantity: 0, revenue: 0 };
          }
          productSales[item.productName].quantity += item.quantity;
          productSales[item.productName].revenue += item.total;
        });
      });

      const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1].quantity - a[1].quantity)
        .slice(0, 8);

      let report = `*MONTHLY BUSINESS REPORT*\n\n`;
      report += `Period: ${startDate.toDateString()} - ${endDate.toDateString()}\n`;
      report += `Compared to previous 30 days\n\n`;

      report += `*FINANCIAL SUMMARY*\n`;
      report += `Total Revenue: $${currentTotal.toFixed(2)}\n`;
      report += `Previous Period: $${previousTotal.toFixed(2)}\n`;
      report += `Growth: ${
        revenueGrowth >= 0 ? "Increase" : "Decrease"
      } ${Math.abs(revenueGrowth).toFixed(1)}%\n\n`;

      report += `*VOLUME SUMMARY*\n`;
      report += `Items Sold: ${currentItems}\n`;
      report += `Previous Period: ${previousItems}\n`;
      report += `Growth: ${
        volumeGrowth >= 0 ? "Increase" : "Decrease"
      } ${Math.abs(volumeGrowth).toFixed(1)}%\n\n`;

      report += `*BUSINESS METRICS*\n`;
      report += `Total Transactions: ${currentSales.length}\n`;
      report += `Daily Average: $${(currentTotal / 30).toFixed(2)}\n`;
      report += `Items per Day: ${(currentItems / 30).toFixed(1)}\n\n`;

      report += `*WEEKLY PERFORMANCE*\n`;
      Object.entries(weeklyBreakdown).forEach(([week, data], index) => {
        report += `Week ${index + 1}: $${data.sales.toFixed(2)} (${
          data.items
        } items)\n`;
      });

      if (topProducts.length > 0) {
        report += `\n*TOP PRODUCTS THIS MONTH*\n`;
        topProducts.forEach(([product, data], index) => {
          const medals = [
            "Gold",
            "Silver",
            "Bronze",
            "4️th",
            "5️th",
            "6️th",
            "7️th",
            "8️th",
          ];
          report += `${medals[index]} ${product}: ${
            data.quantity
          } sold ($${data.revenue.toFixed(2)})\n`;
        });
      }

      report += `\n*Monthly Insight:* ${this.getMonthlyInsight(
        revenueGrowth,
        currentTotal
      )}`;

      return report;
    } catch (error) {
      console.error("Monthly report error:", error);
      return "Failed to generate monthly report. Please try again.";
    }
  }

  async handleBestSellingProducts(shopId, text) {
    try {
      const parts = text.replace("bestsellers", "").replace("best", "").trim();
      let days = 7; // Default to weekly

      if (parts.includes("month") || parts.includes("30")) {
        days = 30;
      } else if (parts.includes("today") || parts.includes("1")) {
        days = 1;
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const sales = await Sale.find({
        shopId,
        date: { $gte: startDate },
      });

      if (sales.length === 0) {
        return `*BEST SELLERS*\n\nNo sales in the last ${days} days.`;
      }

      // Aggregate product sales
      const productSales = {};
      sales.forEach((sale) => {
        sale.items.forEach((item) => {
          if (!productSales[item.productName]) {
            productSales[item.productName] = {
              quantity: 0,
              revenue: 0,
              transactions: 0,
            };
          }
          productSales[item.productName].quantity += item.quantity;
          productSales[item.productName].revenue += item.total;
          productSales[item.productName].transactions += 1;
        });
      });

      // Sort by quantity sold
      const sortedProducts = Object.entries(productSales).sort(
        (a, b) => b[1].quantity - a[1].quantity
      );

      const periodText =
        days === 1 ? "TODAY" : days === 7 ? "THIS WEEK" : "THIS MONTH";

      let report = `*BEST SELLERS - ${periodText}*\n\n`;
      report += `Period: Last ${days} days\n`;
      report += `Total Items Sold: ${sortedProducts.reduce(
        (sum, [_, data]) => sum + data.quantity,
        0
      )}\n`;
      report += `Total Revenue: $${sortedProducts
        .reduce((sum, [_, data]) => sum + data.revenue, 0)
        .toFixed(2)}\n\n`;

      report += `*TOP PERFORMING PRODUCTS:*\n\n`;

      sortedProducts.forEach(([product, data], index) => {
        const medals = [
          "Gold",
          "Silver",
          "Bronze",
          "4️th",
          "5️th",
          "6️th",
          "7️th",
          "8th",
          "9️th",
          "10th",
        ];
        const medal = index < 10 ? medals[index] : `${index + 1}.`;

        const avgPrice = data.revenue / data.quantity;
        const popularity = (
          (data.quantity /
            sortedProducts.reduce((sum, [_, d]) => sum + d.quantity, 0)) *
          100
        ).toFixed(1);

        report += `${medal} *${product}*\n`;
        report += `   Quantity: ${data.quantity} units\n`;
        report += `   Revenue: $${data.revenue.toFixed(2)}\n`;
        report += `   Avg Price: $${avgPrice.toFixed(2)}\n`;
        report += `   Popularity: ${popularity}% of sales\n`;
        report += `   Transactions: ${data.transactions}\n\n`;
      });

      // Add insights
      if (sortedProducts.length > 0) {
        const topProduct = sortedProducts[0];
        const bottomProduct = sortedProducts[sortedProducts.length - 1];

        report += `*QUICK INSIGHTS*\n`;
        report += `• Your best seller is *${topProduct[0]}* with ${topProduct[1].quantity} units\n`;

        if (sortedProducts.length > 1) {
          report += `• Consider promoting *${bottomProduct[0]}* (only ${bottomProduct[1].quantity} sold)\n`;
        }

        const totalRevenue = sortedProducts.reduce(
          (sum, [_, data]) => sum + data.revenue,
          0
        );
        const top3Revenue = sortedProducts
          .slice(0, 3)
          .reduce((sum, [_, data]) => sum + data.revenue, 0);
        const top3Percentage = ((top3Revenue / totalRevenue) * 100).toFixed(0);

        report += `Top 3 products make up ${top3Percentage}% of revenue`;
      }

      return report;
    } catch (error) {
      console.error("Best sellers error:", error);
      return "Failed to generate best sellers report. Please try again.";
    }
  }

  async handleExportReport(shop, text) {
    try {
      // Parse command
      const parts = text
        .toLowerCase()
        .replace("export", "")
        .replace("pdf", "")
        .trim()
        .split(" ");
      const reportType = parts[0] || "daily";

      let startDate, endDate, sales, days;

      // Determine report type and date range
      switch (reportType) {
        case "daily":
        case "today":
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date();
          days = 1;

          sales = await Sale.find({
            shopId: shop._id,
            date: { $gte: startDate, $lte: endDate },
          });
          break;

        case "weekly":
        case "week":
          endDate = new Date();
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          days = 7;

          sales = await Sale.find({
            shopId: shop._id,
            date: { $gte: startDate, $lte: endDate },
          });
          break;

        case "monthly":
        case "month":
          endDate = new Date();
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          startDate.setHours(0, 0, 0, 0);
          days = 30;

          sales = await Sale.find({
            shopId: shop._id,
            date: { $gte: startDate, $lte: endDate },
          });
          break;

        case "best":
        case "bestsellers":
          // Check for period modifier
          if (parts[1] === "month" || parts[1] === "monthly") {
            days = 30;
          } else if (parts[1] === "today") {
            days = 1;
          } else {
            days = 7; // Default to weekly
          }

          endDate = new Date();
          startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
          startDate.setHours(0, 0, 0, 0);

          sales = await Sale.find({
            shopId: shop._id,
            date: { $gte: startDate, $lte: endDate },
          });
          break;

        default:
          return `Invalid report type: "${reportType}"\n\nAvailable options:\n• export daily\n• export weekly\n• export monthly\n• export best\n• export best month`;
      }

      // Check if we have data
      if (!sales || sales.length === 0) {
        return `*No Sales Data Available*\n\nThere are no sales recorded for the requested period.\n\nPeriod: ${startDate.toDateString()} - ${endDate.toDateString()}`;
      }

      // Return immediate response
      const periodName =
        reportType === "best"
          ? days === 1
            ? "today's"
            : days === 7
            ? "weekly"
            : "monthly"
          : reportType;

      const response = {
        type: "pdf_generating",
        message: `*Generating ${periodName.toUpperCase()} PDF Report...*\n\nYour professional business report is being created. This will take a few seconds.\n\nSales data: ${
          sales.length
        } transactions\nPeriod: ${startDate.toDateString()} - ${endDate.toDateString()}`,
      };

      // Generate PDF asynchronously and return file info
      return new Promise((resolve, reject) => {
        // Choose appropriate PDF generation method
        let pdfMethod;

        if (reportType === "daily" || reportType === "today") {
          pdfMethod = PDFService.generateDailyReportPDF.bind(PDFService);
          PDFService.generateDailyReportPDF(
            shop,
            sales,
            startDate,
            (error, result) => {
              if (error) {
                console.error("PDF generation error:", error);
                resolve(
                  `Failed to generate PDF report.\n\nError: ${error.message}\n\nPlease try again or contact support.`
                );
              } else {
                resolve({
                  type: "pdf",
                  message: `*Daily Report Generated Successfully!*\n\nYour comprehensive daily business report is ready.\n\n${sales.length} transactions analyzed\nComplete financial breakdown included`,
                  filePath: result.filePath,
                  fileName: result.filename,
                });
              }
            }
          );
        } else if (reportType === "weekly" || reportType === "week") {
          PDFService.generateWeeklyReportPDF(
            shop,
            sales,
            startDate,
            endDate,
            (error, result) => {
              if (error) {
                console.error("PDF generation error:", error);
                resolve(
                  `Failed to generate PDF report.\n\nError: ${error.message}\n\nPlease try again or contact support.`
                );
              } else {
                resolve({
                  type: "pdf",
                  message: `*Weekly Report Generated Successfully!*\n\nYour 7-day business analysis is ready.\n\nDaily breakdown included\nTop products ranked\nGrowth insights provided`,
                  filePath: result.filePath,
                  fileName: result.filename,
                });
              }
            }
          );
        } else if (reportType === "monthly" || reportType === "month") {
          PDFService.generateMonthlyReportPDF(
            shop,
            sales,
            startDate,
            endDate,
            (error, result) => {
              if (error) {
                console.error("PDF generation error:", error);
                resolve(
                  `Failed to generate PDF report.\n\nError: ${error.message}\n\nPlease try again or contact support.`
                );
              } else {
                resolve({
                  type: "pdf",
                  message: `*Monthly Report Generated Successfully!*\n\nYour 30-day comprehensive report is ready.\n\nWeekly performance breakdown\nTop 8 products analyzed\nStrategic insights included`,
                  filePath: result.filePath,
                  fileName: result.filename,
                });
              }
            }
          );
        } else if (reportType === "best" || reportType === "bestsellers") {
          PDFService.generateBestSellersReportPDF(
            shop,
            sales,
            startDate,
            endDate,
            days,
            (error, result) => {
              if (error) {
                console.error("PDF generation error:", error);
                resolve(
                  `Failed to generate PDF report.\n\nError: ${error.message}\n\nPlease try again or contact support.`
                );
              } else {
                const periodText =
                  days === 1 ? "Today's" : days === 7 ? "Weekly" : "Monthly";
                resolve({
                  type: "pdf",
                  message: `*${periodText} Best Sellers Report Generated!*\n\nYour product performance analysis is ready.\n\nComplete product rankings\nRevenue share analysis\nPromotional insights included`,
                  filePath: result.filePath,
                  fileName: result.filename,
                });
              }
            }
          );
        }
      });
    } catch (error) {
      console.error("Export report error:", error);
      return `*Report Generation Failed*\n\nAn error occurred while generating your report.\n\nError: ${error.message}\n\nPlease try again or type "help" for assistance.`;
    }
  }

  getHelpText() {
    return `*SMART SHOP ASSISTANT* - Complete Business Management

*PRODUCT MANAGEMENT*
• add bread 2.50 stock 100 - Add new product
• price bread 2.75 - Update price
• stock bread 80 - Update stock
• edit bread price 2.60 - Edit product details
• delete bread - Remove product
• list - View all products
• low stock - Check low inventory

*SALES & TRANSACTIONS*
• sell 2 bread 1 milk - Record sale
• sell 3 bread 2.25 - Custom pricing
• daily - Today's report
• weekly - 7-day analysis
• monthly - 30-day report
• best - Top selling products

*PDF REPORTS & EXPORT*
• export daily - Generate daily PDF report
• export weekly - Generate weekly PDF report  
• export monthly - Generate monthly PDF report
• export best - Generate weekly best sellers PDF
• export best month - Generate monthly best sellers PDF
• pdf daily - Same as export daily (alternative syntax)

*ACCOUNT MANAGEMENT*
• login 1234 - Access your account
• logout - Secure logout
• help - Show this guide

*Pro Tips:*
📊 PDF reports include professional charts and insights
💾 Reports are automatically saved with timestamps
📈 Use monthly reports for strategic planning
🏆 Best sellers reports help optimize inventory

Type any command to get started!`;
  }
}

export default new CommandService();
