import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import Shop from "../models/Shop.js";
import LayBye from "../models/LayBye.js";
import bcrypt from "bcrypt";
import PDFService from "./PDFService.js";
import CancellationService from "./CancellationService.js";
import CustomerService from "./CustomerService.js";
import OrderService from "./OrderService.js";
import ExpenseService from "./ExpenseService.js";

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
      return `*Welcome to Chart Shop!*

Hi there! I don't see an active shop setup for your account.

*To get started:*
• Register a new shop: \`register "Your Business Name" 1234\`
• Login to existing shop: \`login 1234\`

*Example:* 
\`register "Bella's Boutique" 5678\`
\`login 5678\`

Need help? Just type *help* anytime!`;
    }

    if (command.startsWith("sell to")) {
      return await this.handleSellToCustomer(shop._id, text);
    }

    if (
      command.startsWith("sell ") &&
      !command.includes("to") &&
      !command.includes("credit")
    ) {
      return await this.handleCashSale(shop._id, text);
    }

    if (command.startsWith("credit sale")) {
      return await this.handleCreditSale(shop._id, text);
    }

    // Laybye commands
    if (command.startsWith("laybye pay")) {
      return await this.handleLayByePayment(shop._id, text);
    }

    if (command.startsWith("laybye complete")) {
      return await this.handleLayByeComplete(shop._id, text);
    }

    if (command.startsWith("laybye")) {
      return await this.handleLayBye(shop._id, text);
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

    if (command.startsWith("cancel")) {
      return await this.handleCancelSale(shop._id, text);
    }

    if (command.startsWith("customer") || command.startsWith("customers")) {
      return await this.handleCustomerCommands(shop._id, text);
    }
    if (command.startsWith("credit history")) {
      return await this.handleCreditHistory(shop._id, text);
    }

    if (command.startsWith("credit ")) {
      return await this.handleCustomerCredit(shop._id, text);
    }

    if (command.startsWith("payment ")) {
      return await this.handleCustomerPayment(shop._id, text);
    }

    if (command.startsWith("order") || command.startsWith("orders")) {
      return await this.handleOrderCommands(shop._id, text);
    }

    if (
      command.startsWith("confirm order") ||
      command.startsWith("ready order") ||
      command.startsWith("complete order") ||
      command.startsWith("cancel order")
    ) {
      return await this.handleOrderStatusUpdate(shop._id, text);
    }

    if (command.startsWith("expense ") && !command.startsWith("expenses")) {
      return await this.handleExpenseRecording(shop._id, text);
    }

    if (command.startsWith("expenses")) {
      return await this.handleExpenseReports(shop._id, text);
    }

    if (command.startsWith("profit")) {
      return await this.handleProfitCalculation(shop._id, text);
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

  /**
   * Helper method: Reserve stock for laybye
   */
  async reserveStockForLaybye(shopId, items) {
    try {
      // Check if all items have enough stock
      for (const item of items) {
        if (item.product.trackStock && item.product.stock < item.quantity) {
          return {
            success: false,
            message: `*Insufficient Stock*\n${item.product.name}: Need ${item.quantity}, have ${item.product.stock}`,
          };
        }
      }

      // Optional: Create a reserved stock field in Product model
      // Or track in a separate collection
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: `Stock reservation failed: ${error.message}`,
      };
    }
  }

  /**
   * Helper method: Generate credit sale receipt
   */
  generateCreditSaleReceipt(sale, customer, items) {
    let receipt = `*CREDIT SALE RECEIPT*\n\n`;
    receipt += `Invoice: CR-${sale._id.toString().slice(-8)}\n`;
    receipt += `Customer: ${customer.name}\n`;
    receipt += `Date: ${new Date().toLocaleString()}\n`;
    receipt += `Status: Product Delivered\n\n`;

    receipt += `ITEMS:\n`;
    items.forEach((item, index) => {
      receipt += `${index + 1}. ${item.product.name} x ${item.quantity}\n`;
      receipt += `   Price: $${item.price.toFixed(2)} each\n`;
      receipt += `   Subtotal: $${item.total.toFixed(2)}\n\n`;
    });

    receipt += `*FINANCIAL SUMMARY*\n`;
    receipt += `Total Amount: $${sale.total.toFixed(2)}\n`;
    receipt += `Amount Paid: $${sale.amountPaid.toFixed(2)}\n`;
    receipt += `Balance Due: $${sale.balanceDue.toFixed(2)}\n\n`;

    receipt += `*IMPORTANT NOTES*\n`;
    receipt += `✓ Stock deducted immediately\n`;
    receipt += `✓ Profit recognized: $${sale.profit.toFixed(2)}\n`;
    receipt += `✓ Customer balance increased\n`;
    receipt += `✓ Payment due: ${new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toDateString()}`;

    return receipt;
  }

  /**
   * Helper method: Generate laybye receipt
   */
  generateLayByeReceipt(laybye, customer, items) {
    let receipt = `*LAYBYE AGREEMENT*\n\n`;
    receipt += `Agreement #: LB-${laybye._id.toString().slice(-8)}\n`;
    receipt += `Customer: ${customer.name}\n`;
    receipt += `Start Date: ${new Date().toLocaleDateString()}\n`;
    receipt += `Due Date: ${laybye.dueDate.toLocaleDateString()}\n\n`;

    receipt += `RESERVED ITEMS:\n`;
    items.forEach((item, index) => {
      receipt += `${index + 1}. ${item.product.name} x ${item.quantity}\n`;
      receipt += `   Price: $${item.price.toFixed(2)} each\n`;
      receipt += `   Subtotal: $${item.total.toFixed(2)}\n\n`;
    });

    receipt += `*PAYMENT TERMS*\n`;
    receipt += `Total Value: $${laybye.totalAmount.toFixed(2)}\n`;
    receipt += `Deposit Paid: $${laybye.amountPaid.toFixed(2)}\n`;
    receipt += `Balance Due: $${laybye.balanceDue.toFixed(2)}\n`;
    receipt += `Installments: ${laybye.installments.length}\n\n`;

    receipt += `*TERMS & CONDITIONS*\n`;
    receipt += `✓ Stock reserved (not deducted)\n`;
    receipt += `✓ No profit recognized yet\n`;
    receipt += `✓ Product will be released upon full payment\n`;
    receipt += `✓ Payments accepted: cash, bank, mobile\n`;
    receipt += `✓ Make payments with: laybye pay ${customer.name} [amount]`;

    return receipt;
  }

  async handleRegister(telegramId, text) {
    try {
      const match =
        text.match(/register\s+"([^"]+)"\s+(\d{4})/i) ||
        text.match(/register\s+(\S+(?:\s+\S+)*?)\s+(\d{4})/i);

      if (!match) {
        return ' *Registration Format*\n\nPlease use:\n• `register "Business Name" 1234`\n• `register BusinessName 1234`\n\n*Example:*\n`register "Family Bakery" 5678`\n`register QuickMart 4321`\n\n *Security Tip:* Use a unique 4-digit PIN you will remember.';
      }

      const businessName = match[1];
      const pin = match[2];

      const existing = await Shop.findOne({ telegramId });
      if (existing) {
        return "*Already Registered!*\n\nWelcome back! It looks like you already have an account.\n\n• To login: `login ${existing.businessName.substring(0, 3)}***`\n• Forgot PIN? Contact support.\n\nYou can only have one shop per Telegram account.";
      }

      const hashedPin = await bcrypt.hash(pin, 10);

      await Shop.create({
        telegramId,
        businessName,
        pin: hashedPin,
        isActive: true,
      });

      return `*Registration successful!*\n\nWelcome, ${businessName}!\n\nYou have been automatically logged in.\n\nUse: login [pin] for future access to your account.`;
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
          price: finalPrice,
          standardPrice: product.price,
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
          price: item.price,
          standardPrice: item.standardPrice,
          isCustomPrice: item.isCustomPrice,
          total: item.total,
        })),
        total,
      });

      // Format receipt
      const now = new Date();
      let receipt = `INVOICE #${Date.now().toString().slice(-6)}\n`;
      receipt += `Date: ${now.toLocaleDateString()} ${now.toLocaleTimeString(
        [],
        { hour: "2-digit", minute: "2-digit" }
      )}\n`;
      receipt += "-".repeat(35) + "\n\n";

      items.forEach((item, index) => {
        const lineTotal = item.quantity * item.price;
        receipt += `${index + 1}. ${item.productName}\n`;
        receipt += `   Qty: ${item.quantity}`.padEnd(15);
        receipt += `Price: $${item.price.toFixed(2)}`.padEnd(20);
        receipt += `Subtotal: $${lineTotal.toFixed(2)}`;

        if (item.isCustomPrice) {
          receipt += `\n   Note: Custom price (standard: $${item.standardPrice.toFixed(
            2
          )})`;
        }

        if (item.product.trackStock) {
          receipt += `\n   Stock remaining: ${item.product.stock}`;
          if (item.product.stock <= item.product.lowStockThreshold) {
            receipt += ` - LOW STOCK`;
          }
        }
        receipt += "\n\n";
      });

      receipt += "-".repeat(35) + "\n";
      receipt +=
        "GRAND TOTAL:".padEnd(25) + `$${total.toFixed(2)}`.padStart(10);
      receipt += "\n" + "=".repeat(35);
      receipt += "\nThank you for your business!";

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
        return "Invalid format.\n\nUse:\n• stock [product] [quantity] - Add to stock\n• stock =[product] [quantity] - Set exact stock\n• stock -[product] [quantity] - Remove from stock\n\nExamples:\n• stock bread 50 - Add 50 units\n• stock =bread 50 - Set to exactly 50\n• stock -bread 10 - Remove 10 units";
      }

      let productName = parts[0];
      let quantity = parseInt(parts[1]);
      let operation = "add";

      if (productName.startsWith("=")) {
        operation = "set";
        productName = productName.slice(1);
      } else if (productName.startsWith("-")) {
        operation = "remove";
        productName = productName.slice(1);
      } else if (productName.startsWith("+")) {
        operation = "add";
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
      const oldStock = product.stock;

      switch (operation) {
        case "add":
          newStock = product.stock + quantity;
          message = `Added ${quantity} units (was ${oldStock})`;
          break;
        case "remove":
          newStock = product.stock - quantity;
          if (newStock < 0) {
            return `Cannot remove ${quantity} units. Current stock: ${product.stock}`;
          }
          message = `Removed ${quantity} units (was ${oldStock})`;
          break;
        case "set":
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

      return `*Price Updated Successfully!*\n\n${product.name
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
          response = `*Price Updated!*\n\n${product.name
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

  /**
   * Handle daily reports with credit/laybye separation
   */
  async handleDailyTotal(shopId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get different types of sales
      const cashSales = await Sale.find({
        shopId,
        date: { $gte: today },
        type: "cash",
        isCancelled: false,
      });

      const creditSales = await Sale.find({
        shopId,
        date: { $gte: today },
        type: "credit",
        isCancelled: false,
      });

      const completedLaybyes = await Sale.find({
        shopId,
        date: { $gte: today },
        type: "completed_laybye",
        isCancelled: false,
      });

      // Calculate totals
      const cashTotal = cashSales.reduce((sum, sale) => sum + sale.total, 0);
      const creditTotal = creditSales.reduce(
        (sum, sale) => sum + sale.total,
        0
      );
      const laybyeTotal = completedLaybyes.reduce(
        (sum, sale) => sum + sale.total,
        0
      );
      const totalRevenue = cashTotal + creditTotal + laybyeTotal;

      // Calculate profit
      const cashProfit = cashSales.reduce(
        (sum, sale) => sum + (sale.profit || 0),
        0
      );
      const creditProfit = creditSales.reduce(
        (sum, sale) => sum + (sale.profit || 0),
        0
      );
      const laybyeProfit = completedLaybyes.reduce(
        (sum, sale) => sum + (sale.profit || 0),
        0
      );
      const totalProfit = cashProfit + creditProfit + laybyeProfit;

      // Get laybye payments (cash flow)
      const laybyePayments = await LayBye.aggregate([
        {
          $match: {
            shopId: mongoose.Types.ObjectId(shopId),
            "installments.date": { $gte: today },
          },
        },
        { $unwind: "$installments" },
        {
          $match: {
            "installments.date": { $gte: today },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$installments.amount" },
          },
        },
      ]);

      const laybyeCashFlow = laybyePayments[0]?.total || 0;

      // Get credit payments (cash flow)
      const creditPayments = await Customer.aggregate([
        {
          $match: { shopId: mongoose.Types.ObjectId(shopId) },
        },
        { $unwind: "$creditTransactions" },
        {
          $match: {
            "creditTransactions.type": "payment",
            "creditTransactions.date": { $gte: today },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$creditTransactions.amount" },
          },
        },
      ]);

      const creditCashFlow = creditPayments[0]?.total || 0;

      // Calculate total cash flow
      const totalCashFlow = cashTotal + laybyeCashFlow + creditCashFlow;

      // Generate report
      let report = `*DAILY BUSINESS REPORT*\n\n`;
      report += `Date: ${today.toDateString()}\n\n`;

      report += `*SALES RECOGNITION*\n`;
      report += `Cash Sales: $${cashTotal.toFixed(2)}\n`;
      report += `Credit Sales: $${creditTotal.toFixed(2)}\n`;
      report += `Completed Laybyes: $${laybyeTotal.toFixed(2)}\n`;
      report += `Total Revenue: $${totalRevenue.toFixed(2)}\n\n`;

      report += `*PROFIT RECOGNITION*\n`;
      report += `Cash Profit: $${cashProfit.toFixed(2)}\n`;
      report += `Credit Profit: $${creditProfit.toFixed(2)}\n`;
      report += `Laybye Profit: $${laybyeProfit.toFixed(2)}\n`;
      report += `Total Profit: $${totalProfit.toFixed(2)}\n\n`;

      report += `*CASH FLOW TODAY*\n`;
      report += `Cash Sales: $${cashTotal.toFixed(2)}\n`;
      report += `Laybye Payments: $${laybyeCashFlow.toFixed(2)}\n`;
      report += `Credit Payments: $${creditCashFlow.toFixed(2)}\n`;
      report += `Total Cash In: $${totalCashFlow.toFixed(2)}\n\n`;

      report += `*OUTSTANDING BALANCES*\n`;

      // Active laybyes
      const activeLaybyes = await LayBye.find({
        shopId,
        status: "active",
      });

      const totalLaybyeDue = activeLaybyes.reduce(
        (sum, lb) => sum + lb.balanceDue,
        0
      );
      report += `Active Laybyes: $${totalLaybyeDue.toFixed(2)} (${activeLaybyes.length
        })\n`;

      // Credit balances
      const customersWithCredit = await Customer.find({
        shopId,
        currentBalance: { $gt: 0 },
      });

      const totalCreditDue = customersWithCredit.reduce(
        (sum, c) => sum + c.currentBalance,
        0
      );
      report += `Credit Balances: $${totalCreditDue.toFixed(2)} (${customersWithCredit.length
        } customers)\n`;

      return report;
    } catch (error) {
      console.error("Daily report error:", error);
      return "Failed to generate daily report. Please try again.";
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
        isCancelled: false,
      });

      // Get previous period data for comparison
      const prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 7);
      const prevEndDate = new Date(startDate);

      const previousSales = await Sale.find({
        shopId,
        date: { $gte: prevStartDate, $lte: prevEndDate },
        isCancelled: false,
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
      report += `Growth: ${revenueGrowth >= 0 ? "Increase" : "Decrease"
        } ${Math.abs(revenueGrowth).toFixed(1)}%\n\n`;

      report += `*VOLUME SUMMARY*\n`;
      report += `Items Sold: ${currentItems}\n`;
      report += `Previous Week: ${previousItems}\n`;
      report += `Growth: ${volumeGrowth >= 0 ? "Increase" : "Decrease"
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
          const medals = ["1st", "2nd", "3rd", "4th", "5️th"];
          report += `${medals[index]} ${product}: ${data.quantity
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
        isCancelled: false,
      });

      // Get previous period data
      const prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 30);
      const prevEndDate = new Date(startDate);

      const previousSales = await Sale.find({
        shopId,
        date: { $gte: prevStartDate, $lte: prevEndDate },
        isCancelled: false,
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
      report += `Growth: ${revenueGrowth >= 0 ? "Increase" : "Decrease"
        } ${Math.abs(revenueGrowth).toFixed(1)}%\n\n`;

      report += `*VOLUME SUMMARY*\n`;
      report += `Items Sold: ${currentItems}\n`;
      report += `Previous Period: ${previousItems}\n`;
      report += `Growth: ${volumeGrowth >= 0 ? "Increase" : "Decrease"
        } ${Math.abs(volumeGrowth).toFixed(1)}%\n\n`;

      report += `*BUSINESS METRICS*\n`;
      report += `Total Transactions: ${currentSales.length}\n`;
      report += `Daily Average: $${(currentTotal / 30).toFixed(2)}\n`;
      report += `Items per Day: ${(currentItems / 30).toFixed(1)}\n\n`;

      report += `*WEEKLY PERFORMANCE*\n`;
      Object.entries(weeklyBreakdown).forEach(([week, data], index) => {
        report += `Week ${index + 1}: $${data.sales.toFixed(2)} (${data.items
          } items)\n`;
      });

      if (topProducts.length > 0) {
        report += `\n*TOP PRODUCTS THIS MONTH*\n`;
        topProducts.forEach(([product, data], index) => {
          const medals = [
            "1st",
            "2nd",
            "3rd",
            "4️th",
            "5️th",
            "6️th",
            "7️th",
            "8️th",
          ];
          report += `${medals[index]} ${product}: ${data.quantity
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
        isCancelled: false,
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
          "1st: ",
          "2nd: ",
          "3rd: ",
          "4️th: ",
          "5️th: ",
          "6️th: ",
          "7️th: ",
          "8th: ",
          "9️th: ",
          "10th: ",
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
            isCancelled: false,
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
        message: `*Generating ${periodName.toUpperCase()} PDF Report...*\n\nYour professional business report is being created. This will take a few seconds.\n\nSales data: ${sales.length
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

  async handleCancelSale(shopId, text) {
    try {
      const parts = text.replace("cancel", "").trim().split(" ");
      const command = parts[0]?.toLowerCase();

      if (!command) {
        // Show recent sales for cancellation
        const result = await CancellationService.getRecentSalesForCancellation(
          shopId
        );
        return result.message;
      }

      if (command === "last") {
        const reason = parts.slice(1).join(" ") || "No reason provided";
        const result = await CancellationService.cancelLastSale(shopId, reason);
        return result.message;
      }

      if (command === "sale") {
        const saleIdentifier = parts[1];
        const reason = parts.slice(2).join(" ") || "No reason provided";

        if (!saleIdentifier) {
          return 'Please specify which sale to cancel.\n\nUse: cancel sale [number]\nExample: cancel sale 2 "Wrong price"\n\nType "cancel" to see recent sales.';
        }

        const result = await CancellationService.cancelSpecificSale(
          shopId,
          saleIdentifier,
          reason
        );
        return result.message;
      }

      if (command === "report" || command === "refunds") {
        const days = parseInt(parts[1]) || 30;
        return await CancellationService.getRefundsReport(shopId, days);
      }

      // If it's a number, treat as sale index
      if (!isNaN(parseInt(command))) {
        const reason = parts.slice(1).join(" ") || "No reason provided";
        const result = await CancellationService.cancelSpecificSale(
          shopId,
          command,
          reason
        );
        return result.message;
      }

      return `Invalid cancel command. Use:\n• cancel - Show recent sales\n• cancel last [reason] - Cancel last sale\n• cancel sale [number] [reason] - Cancel specific sale\n• cancel refunds - Show refunds report`;
    } catch (error) {
      console.error("Cancel sale error:", error);
      return "Failed to process cancellation. Please try again.";
    }
  }

  /**
   * Handle customer management commands with debugging
   */
  async handleCustomerCommands(shopId, text) {
    try {
      console.log("[CommandService] Customer command received:", text);
      console.log("[CommandService] Shop ID:", shopId);

      const lowerText = text.toLowerCase().trim();

      // customer add [name] [phone] [email?]
      if (lowerText.includes("add")) {
        return await this.handleAddCustomer(shopId, text);
      }

      // customers (list all)
      if (lowerText === "customers" || lowerText === "customer") {
        console.log("[CommandService] Listing all customers");
        const result = await CustomerService.listCustomers(shopId, "all");
        return result.message;
      }

      // customers active
      if (lowerText === "customers active" || lowerText === "customer active") {
        console.log("[CommandService] Listing active customers");
        const result = await CustomerService.listCustomers(shopId, "active");
        return result.message;
      }

      // customers top
      if (lowerText === "customers top" || lowerText === "customer top") {
        console.log("[CommandService] Listing top customers");
        const result = await CustomerService.listCustomers(shopId, "top");
        return result.message;
      }

      // customer [name/phone] - view specific customer
      const customerIdentifier = text.replace(/^customers?/i, "").trim();
      if (customerIdentifier) {
        console.log(
          "[CommandService] Looking up customer:",
          customerIdentifier
        );
        const result = await CustomerService.getCustomerHistory(
          shopId,
          customerIdentifier
        );
        return result.message;
      }

      // Default help
      return `*CUSTOMER COMMANDS*\n\n*Add Customer:*\n• customer add John 0771234567\n• customer add "Jane Doe" +263771234567 jane@email.com\n\n*View Customers:*\n• customers - List all\n• customers active - Last 30 days\n• customers top - Top spenders\n• customer John - View details\n\n*Sales:*\n• sell to John 2 bread 1 milk\n\n*Credit:*\n• credit John 50\n• payment John 25`;
    } catch (error) {
      console.error("[CommandService] Customer command error:", error);
      return "Failed to process customer command. Please try again.";
    }
  }

  /**
   * Handle adding a new customer
   */
  async handleAddCustomer(shopId, text) {
    try {
      console.log("[CommandService] Adding customer from text:", text);

      // Remove "customer add" or "customers add" prefix
      let cleanText = text.replace(/^customers?\s+add\s+/i, "").trim();
      console.log("[CommandService] Clean text:", cleanText);

      // Try to match quoted name first: "John Doe" 1234567890
      let nameMatch = cleanText.match(/^"([^"]+)"\s+(\S+)\s*(.*)/);

      if (nameMatch) {
        const name = nameMatch[1];
        const phone = nameMatch[2];
        const email = nameMatch[3] || "";

        console.log("[CommandService] Parsed (quoted):", {
          name,
          phone,
          email,
        });
        const result = await CustomerService.addCustomer(
          shopId,
          name,
          phone,
          email
        );
        return result.message;
      }

      // Try unquoted name: John 1234567890
      nameMatch = cleanText.match(/^(\S+)\s+(\S+)\s*(.*)/);

      if (nameMatch) {
        const name = nameMatch[1];
        const phone = nameMatch[2];
        const email = nameMatch[3] || "";

        console.log("[CommandService] Parsed (unquoted):", {
          name,
          phone,
          email,
        });
        const result = await CustomerService.addCustomer(
          shopId,
          name,
          phone,
          email
        );
        return result.message;
      }

      // Invalid format
      console.log("[CommandService] Invalid format");
      return `*Invalid Format*\n\nUse: customer add [name] [phone] [email?]\n\n*Examples:*\n• customer add John 0771234567\n• customer add "Jane Doe" +263771234567\n• customer add Mike 0771234567 mike@email.com`;
    } catch (error) {
      console.error("[CommandService] Add customer error:", error);
      return `Failed to add customer: ${error.message}`;
    }
  }

  /**
   * Handle sales to specific customers
   */
  async handleSellToCustomer(shopId, text) {
    try {
      console.log("[CommandService] Sell to customer:", text);

      // Format: sell to John 2 bread 1 milk
      // OR: sell to "John Doe" 2 bread 1 milk
      // OR: sell to 0771234567 2 bread 1 milk

      let match = text.match(/sell\s+to\s+"([^"]+)"\s+(.+)/i);

      if (!match) {
        match = text.match(/sell\s+to\s+(\S+)\s+(.+)/i);
      }

      if (!match) {
        return `*Invalid Format*\n\nUse: sell to [customer] [items]\n\n*Examples:*\n• sell to John 2 bread 1 milk\n• sell to "Jane Doe" 3 eggs\n• sell to 0771234567 2 bread 2.50`;
      }

      const customerIdentifier = match[1];
      const itemsText = match[2];

      console.log("[CommandService] Customer identifier:", customerIdentifier);
      console.log("[CommandService] Items text:", itemsText);

      // Find customer
      const customer = await CustomerService.findCustomer(
        shopId,
        customerIdentifier
      );

      if (!customer) {
        return `*Customer Not Found* \n\nNo customer found matching "${customerIdentifier}".\n\n*Add them first:*\ncustomer add "${customerIdentifier}" [phone]`;
      }

      console.log("[CommandService] Found customer:", customer.name);

      // Process the sale
      const result = await this.processSaleWithCustomer(
        shopId,
        itemsText,
        customer
      );
      return result;
    } catch (error) {
      console.error("[CommandService] Sell to customer error:", error);
      return `Failed to process sale: ${error.message}`;
    }
  }

  /**
   * Process sale with customer linking
   */
  async processSaleWithCustomer(shopId, itemsText, customer) {
    try {
      console.log("[CommandService] Processing sale with customer:", {
        customerId: customer._id,
        customerName: customer.name,
        items: itemsText,
      });

      // Parse items (reuse existing logic)
      const parts = itemsText.trim().split(" ");
      const items = [];
      let total = 0;

      let i = 0;
      while (i < parts.length) {
        const quantity = parseInt(parts[i]);

        if (isNaN(quantity)) {
          return `Invalid quantity: "${parts[i]}"`;
        }

        const productName = parts[i + 1];
        if (!productName) {
          return "Missing product name after quantity.";
        }

        let price = null;
        let nextIndex = i + 2;

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

        if (product.trackStock && product.stock < quantity) {
          return `INSUFFICIENT STOCK\n\n${product.name}\nRequested: ${quantity}\nAvailable: ${product.stock}`;
        }

        const finalPrice = price !== null ? price : product.price;
        const itemTotal = quantity * finalPrice;

        items.push({
          productId: product._id,
          product: product,
          productName: product.name,
          quantity,
          price: finalPrice,
          standardPrice: product.price,
          isCustomPrice: price !== null,
          total: itemTotal,
        });

        total += itemTotal;
        i = nextIndex;
      }

      console.log(
        "[CommandService] Parsed items:",
        items.length,
        "Total:",
        total
      );

      // Deduct stock
      for (const item of items) {
        if (item.product.trackStock) {
          item.product.stock -= item.quantity;
          await item.product.save();
        }
      }

      // Create sale with customer reference
      const sale = await Sale.create({
        shopId,
        items: items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          standardPrice: item.standardPrice,
          isCustomPrice: item.isCustomPrice,
          total: item.total,
        })),
        total,
        customerId: customer._id,
        customerName: customer.name,
        customerPhone: customer.phone,
      });

      console.log("[CommandService] Sale created:", sale._id);

      // Update customer statistics
      const linked = await CustomerService.linkSaleToCustomer(
        sale,
        customer,
        total
      );
      console.log("[CommandService] Customer linked:", linked);

      // Generate professional invoice-style receipt
      const now = new Date();
      const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;

      let receipt = `INVOICE: ${invoiceNumber}\n`;
      receipt += "=".repeat(40) + "\n";
      receipt += `CUSTOMER: ${customer.name.toUpperCase()}\n`;
      if (customer.phone) {
        receipt += `PHONE: ${customer.phone}\n`;
      }
      receipt += `DATE: ${now.toLocaleDateString()}\n`;
      receipt += `TIME: ${now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}\n`;
      receipt += "-".repeat(40) + "\n\n";

      receipt += "ITEM DETAILS:\n";
      receipt += "-".repeat(40) + "\n";

      items.forEach((item, index) => {
        receipt += `${index + 1}. ${item.productName}\n`;
        receipt += `   Quantity: ${item.quantity}`.padEnd(20);
        receipt += `Price: $${item.price.toFixed(2)}\n`;
        receipt += `   Subtotal: $${item.total.toFixed(2)}\n`;

        if (item.isCustomPrice) {
          receipt += `   Note: Custom price (standard: $${item.standardPrice.toFixed(
            2
          )})\n`;
        }

        if (item.product.trackStock) {
          receipt += `   Stock after sale: ${item.product.stock}`;
          if (item.product.stock <= item.product.lowStockThreshold) {
            receipt += ` [LOW STOCK]`;
          }
          receipt += "\n";
        }
        receipt += "\n";
      });

      receipt += "-".repeat(40) + "\n";
      receipt +=
        "TOTAL AMOUNT:".padEnd(30) + `$${total.toFixed(2)}`.padStart(10);
      receipt += "\n" + "=".repeat(40) + "\n\n";

      receipt += "CUSTOMER SUMMARY\n";
      receipt += "-".repeat(40) + "\n";
      receipt += `Total Spent: $${customer.totalSpent.toFixed(2)}\n`;
      receipt += `Total Visits: ${customer.totalVisits}\n`;
      receipt += `Loyalty Points: ${customer.loyaltyPoints}\n\n`;

      receipt += "Thank you for your business!";

      return receipt;
    } catch (error) {
      console.error(
        "[CommandService] Process sale with customer error:",
        error
      );
      throw error;
    }
  }

  /**
   * Parse sale items from text
   */
  async parseSaleItems(shopId, itemsText) {
    try {
      const parts = itemsText.trim().split(" ");
      const items = [];

      let i = 0;
      while (i < parts.length) {
        const quantity = parseInt(parts[i]);

        if (isNaN(quantity) || quantity <= 0) {
          return `Invalid quantity: "${parts[i]}"`;
        }

        const productName = parts[i + 1];
        if (!productName) {
          return "Missing product name after quantity.";
        }

        let price = null;
        let nextIndex = i + 2;

        // Check if next part is a price
        if (nextIndex < parts.length && !isNaN(parseFloat(parts[nextIndex]))) {
          price = parseFloat(parts[nextIndex]);
          nextIndex++;
        }

        // Find product
        const product = await Product.findOne({
          shopId,
          name: new RegExp(`^${productName}$`, "i"),
          isActive: true,
        });

        if (!product) {
          return `Product "${productName}" not found. Type "list" to see products.`;
        }

        const finalPrice = price !== null ? price : product.price;
        const itemTotal = quantity * finalPrice;

        items.push({
          productId: product._id,
          product: product,
          productName: product.name,
          quantity,
          price: finalPrice,
          total: itemTotal,
        });

        i = nextIndex;
      }

      return items;
    } catch (error) {
      console.error("Parse sale items error:", error);
      return `Failed to parse items: ${error.message}`;
    }
  }

  /**
   * Handle cash sales (existing sell command)
   */
  async handleCashSale(shopId, text) {
    try {
      const itemsText = text.replace("sell ", "").trim();
      const items = await this.parseSaleItems(shopId, itemsText);

      if (typeof items === "string") return items; // Error message

      // Check stock
      for (const item of items) {
        if (item.product.trackStock && item.product.stock < item.quantity) {
          return `*Insufficient Stock*\n${item.product.name}: Need ${item.quantity}, have ${item.product.stock}`;
        }
      }

      // Deduct stock
      for (const item of items) {
        if (item.product.trackStock) {
          item.product.stock -= item.quantity;
          await item.product.save();
        }
      }

      // Calculate totals
      const total = items.reduce((sum, item) => sum + item.total, 0);
      const profit = items.reduce((sum, item) => {
        const cost = item.product.costPrice || item.price * 0.6; // Default 40% margin
        return sum + (item.price - cost) * item.quantity;
      }, 0);

      // Create sale
      const sale = await Sale.create({
        shopId,
        type: "cash",
        items: items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
        total,
        profit,
        status: "completed",
        amountPaid: total,
        balanceDue: 0,
      });

      return this.generateCashSaleReceipt(sale, items);
    } catch (error) {
      console.error("Cash sale error:", error);
      return `Failed to process cash sale: ${error.message}`;
    }
  }
  async handleCreditSale(shopId, text) {
    try {
      // Format: credit sale to John 2 bread 1 milk
      const match = text.match(/credit\s+sale\s+to\s+(\S+)\s+(.+)/i);

      if (!match) {
        return `*Invalid Format*\n\nUse: credit sale to [customer] [items]\nExample: credit sale to John 2 bread 1 milk`;
      }

      const customerIdentifier = match[1];
      const itemsText = match[2];

      // Find customer
      const customer = await CustomerService.findCustomer(
        shopId,
        customerIdentifier
      );
      if (!customer) {
        return `*Customer Not Found*\n\nAdd them first: customer add "${customerIdentifier}" [phone]`;
      }

      // Parse items
      const items = await this.parseSaleItems(shopId, itemsText);
      if (typeof items === "string") return items; // Error message

      // Calculate totals
      const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

      // Check stock before proceeding
      for (const item of items) {
        if (item.product.trackStock && item.product.stock < item.quantity) {
          return `*Insufficient Stock*\n${item.product.name}: Need ${item.quantity}, have ${item.product.stock}`;
        }
      }

      // DEDUCT STOCK IMMEDIATELY (Key difference from laybye)
      for (const item of items) {
        if (item.product.trackStock) {
          item.product.stock -= item.quantity;
          await item.product.save();
        }
      }

      // Create credit sale
      const sale = await Sale.create({
        shopId,
        type: "credit",
        customerId: customer._id,
        customerName: customer.name,
        customerPhone: customer.phone,
        items: items.map((item) => ({
          productId: item.product._id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          costPrice: item.product.costPrice || item.price * 0.6, // Assuming 40% profit margin
        })),
        total: totalAmount,
        amountPaid: 0,
        balanceDue: totalAmount,
        status: "completed", // Credit sales are completed immediately
        profit: items.reduce((sum, item) => {
          const cost = item.product.costPrice || item.price * 0.6;
          return sum + (item.price - cost) * item.quantity;
        }, 0),
      });

      // Update customer balance
      customer.currentBalance += totalAmount;
      customer.creditTransactions.push({
        type: "credit",
        amount: totalAmount,
        description: `Credit sale: ${items
          .map((i) => `${i.quantity}x ${i.product.name}`)
          .join(", ")}`,
        date: new Date(),
        balanceBefore: customer.currentBalance - totalAmount,
        balanceAfter: customer.currentBalance,
      });
      await customer.save();

      // Generate receipt
      return this.generateCreditSaleReceipt(sale, customer, items);
    } catch (error) {
      console.error("Credit sale error:", error);
      return `Failed to process credit sale: ${error.message}`;
    }
  }

  /**
   * Handle laybye (layaway) sales
   */
  async handleLayBye(shopId, text) {
    try {
      // Format: laybye for John 2 bread 1 milk deposit 20
      const match = text.match(
        /laybye\s+(?:for\s+)?(\S+)\s+(.+?)(?:\s+deposit\s+(\d+(?:\.\d+)?))?/i
      );

      if (!match) {
        return `*Invalid Format*\n\nUse: laybye for [customer] [items] deposit [amount]\nExample: laybye for John 2 bread 1 milk deposit 50`;
      }

      const customerIdentifier = match[1];
      const itemsText = match[2];
      const depositAmount = match[3] ? parseFloat(match[3]) : 0;

      // Find customer
      const customer = await CustomerService.findCustomer(
        shopId,
        customerIdentifier
      );
      if (!customer) {
        return `*Customer Not Found*\n\nAdd them first: customer add "${customerIdentifier}" [phone]`;
      }

      // Parse items
      const items = await this.parseSaleItems(shopId, itemsText);
      if (typeof items === "string") return items; // Error message

      // Calculate totals
      const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

      if (depositAmount > totalAmount) {
        return `*Deposit too high*\nTotal: $${totalAmount.toFixed(
          2
        )}\nDeposit: $${depositAmount.toFixed(2)}`;
      }

      // DO NOT DEDUCT STOCK (Key difference from credit)
      // Optionally reserve stock if needed
      const reserveStock = await this.reserveStockForLaybye(shopId, items);
      if (!reserveStock.success) {
        return reserveStock.message;
      }

      // Create laybye record
      const laybye = await LayBye.create({
        shopId,
        customerId: customer._id,
        customerName: customer.name,
        customerPhone: customer.phone,
        items: items.map((item) => ({
          productId: item.product._id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
        totalAmount,
        amountPaid: depositAmount,
        balanceDue: totalAmount - depositAmount,
        installments:
          depositAmount > 0
            ? [
              {
                amount: depositAmount,
                date: new Date(),
                paymentMethod: "cash",
              },
            ]
            : [],
        status: "active",
        reservedStock: true, // Set to true if you want to reserve stock
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      });

      // Update customer laybye history
      customer.laybyeTransactions.push({
        laybyeId: laybye._id,
        amount: totalAmount,
        deposit: depositAmount,
        date: new Date(),
        status: "active",
      });
      await customer.save();

      return this.generateLayByeReceipt(laybye, customer, items);
    } catch (error) {
      console.error("Laybye error:", error);
      return `Failed to process laybye: ${error.message}`;
    }
  }

  /**
   * Handle laybye payments
   */
  async handleLayByePayment(shopId, text) {
    try {
      // Format: laybye pay John 50
      const match = text.match(/laybye\s+pay\s+(\S+)\s+(\d+(?:\.\d+)?)/i);

      if (!match) {
        return `*Invalid Format*\n\nUse: laybye pay [customer] [amount]\nExample: laybye pay John 25`;
      }

      const customerIdentifier = match[1];
      const amount = parseFloat(match[2]);

      // Find active laybye for customer
      const laybye = await LayBye.findOne({
        shopId,
        $or: [
          { customerName: new RegExp(`^${customerIdentifier}$`, "i") },
          { customerPhone: customerIdentifier },
        ],
        status: "active",
      });

      if (!laybye) {
        return `*No Active LayBye Found*\n\nNo active laybye found for ${customerIdentifier}`;
      }

      // Check if payment exceeds balance
      if (amount > laybye.balanceDue) {
        return `*Payment too high*\nBalance due: $${laybye.balanceDue.toFixed(
          2
        )}\nPayment: $${amount.toFixed(2)}`;
      }

      // Record payment
      laybye.amountPaid += amount;
      laybye.balanceDue -= amount;
      laybye.installments.push({
        amount,
        date: new Date(),
        paymentMethod: "cash",
      });

      // Check if fully paid
      if (laybye.balanceDue <= 0) {
        await this.completeLayBye(shopId, laybye);
        return this.generateLayByeCompletionReceipt(laybye);
      } else {
        await laybye.save();
        return this.generateLayByePaymentReceipt(laybye, amount);
      }
    } catch (error) {
      console.error("Laybye payment error:", error);
      return `Failed to process laybye payment: ${error.message}`;
    }
  }

  /**
   * Complete laybye and convert to sale
   */
  async completeLayBye(shopId, laybye) {
    try {
      // DEDUCT STOCK NOW (when fully paid)
      for (const item of laybye.items) {
        const product = await Product.findById(item.productId);
        if (product && product.trackStock) {
          product.stock -= item.quantity;
          await product.save();
        }
      }

      // Create completed sale record
      const sale = await Sale.create({
        shopId,
        type: "completed_laybye",
        customerId: laybye.customerId,
        customerName: laybye.customerName,
        customerPhone: laybye.customerPhone,
        items: laybye.items,
        total: laybye.totalAmount,
        amountPaid: laybye.amountPaid,
        balanceDue: 0,
        status: "completed",
        profit: laybye.items.reduce((sum, item) => {
          const cost = item.costPrice || item.price * 0.6;
          return sum + (item.price - cost) * item.quantity;
        }, 0),
        laybyeId: laybye._id,
      });

      // Update laybye status
      laybye.status = "completed";
      laybye.completedDate = new Date();
      await laybye.save();

      // Update customer
      const customer = await Customer.findById(laybye.customerId);
      if (customer) {
        customer.totalSpent += laybye.totalAmount;
        customer.totalVisits += 1;
        await customer.save();
      }

      return sale;
    } catch (error) {
      console.error("Complete laybye error:", error);
      throw error;
    }
  }


  /**
   * Generate cash sale receipt
   */
  generateCashSaleReceipt(sale, items) {
    let receipt = `*CASH SALE RECEIPT*\n\n`;
    receipt += `Invoice: CASH-${sale._id.toString().slice(-8)}\n`;
    receipt += `Date: ${new Date().toLocaleString()}\n\n`;

    receipt += `ITEMS:\n`;
    items.forEach((item, index) => {
      receipt += `${index + 1}. ${item.productName} x ${item.quantity}\n`;
      receipt += `   Price: $${item.price.toFixed(2)} each\n`;
      receipt += `   Subtotal: $${item.total.toFixed(2)}\n\n`;
    });

    receipt += `*SUMMARY*\n`;
    receipt += `Total: $${sale.total.toFixed(2)}\n`;
    receipt += `Profit: $${sale.profit.toFixed(2)}\n`;
    receipt += `Payment: Cash (paid in full)`;

    return receipt;
  }

  /**
   * Generate credit sale receipt
   */
  generateCreditSaleReceipt(sale, customer, items) {
    let receipt = `*CREDIT SALE RECEIPT*\n\n`;
    receipt += `Invoice: CR-${sale._id.toString().slice(-8)}\n`;
    receipt += `Customer: ${customer.name}\n`;
    receipt += `Date: ${new Date().toLocaleString()}\n`;
    receipt += `Status: Product Delivered\n\n`;

    receipt += `ITEMS:\n`;
    items.forEach((item, index) => {
      receipt += `${index + 1}. ${item.productName} x ${item.quantity}\n`;
      receipt += `   Price: $${item.price.toFixed(2)} each\n`;
      receipt += `   Subtotal: $${item.total.toFixed(2)}\n\n`;
    });

    receipt += `*FINANCIAL SUMMARY*\n`;
    receipt += `Total Amount: $${sale.total.toFixed(2)}\n`;
    receipt += `Amount Paid: $${sale.amountPaid.toFixed(2)}\n`;
    receipt += `Balance Due: $${sale.balanceDue.toFixed(2)}\n`;
    receipt += `Profit Recognized: $${sale.profit.toFixed(2)}\n\n`;

    receipt += `*IMPORTANT NOTES*\n`;
    receipt += `✓ Stock deducted immediately\n`;
    receipt += `✓ Profit recognized immediately\n`;
    receipt += `✓ Customer balance increased by $${sale.total.toFixed(2)}\n`;
    receipt += `✓ Make payments with: payment ${customer.name} [amount]`;

    return receipt;
  }

  /**
   * Generate laybye receipt
   */
  generateLayByeReceipt(laybye, customer, items) {
    let receipt = `*LAYBYE AGREEMENT*\n\n`;
    receipt += `Agreement #: LB-${laybye._id.toString().slice(-8)}\n`;
    receipt += `Customer: ${customer.name}\n`;
    receipt += `Start Date: ${laybye.startDate.toLocaleDateString()}\n`;
    receipt += `Due Date: ${laybye.dueDate.toLocaleDateString()}\n\n`;

    receipt += `RESERVED ITEMS:\n`;
    items.forEach((item, index) => {
      receipt += `${index + 1}. ${item.productName} x ${item.quantity}\n`;
      receipt += `   Price: $${item.price.toFixed(2)} each\n`;
      receipt += `   Subtotal: $${item.total.toFixed(2)}\n\n`;
    });

    receipt += `*PAYMENT TERMS*\n`;
    receipt += `Total Value: $${laybye.totalAmount.toFixed(2)}\n`;
    receipt += `Deposit Paid: $${laybye.amountPaid.toFixed(2)}\n`;
    receipt += `Balance Due: $${laybye.balanceDue.toFixed(2)}\n`;
    receipt += `Installments: ${laybye.installments.length}\n\n`;

    receipt += `*TERMS & CONDITIONS*\n`;
    receipt += `✓ Stock reserved (not deducted)\n`;
    receipt += `✓ No profit recognized yet\n`;
    receipt += `✓ Product will be released upon full payment\n`;
    receipt += `✓ Make payments: laybye pay ${customer.name} [amount]\n`;
    receipt += `✓ Complete when paid: laybye complete ${customer.name}`;

    return receipt;
  }

  /**
   * Generate laybye payment receipt
   */
  generateLayByePaymentReceipt(laybye, amount) {
    let receipt = `*LAYBYE PAYMENT RECEIPT*\n\n`;
    receipt += `Agreement #: LB-${laybye._id.toString().slice(-8)}\n`;
    receipt += `Customer: ${laybye.customerName}\n`;
    receipt += `Date: ${new Date().toLocaleString()}\n\n`;

    receipt += `*PAYMENT DETAILS*\n`;
    receipt += `Amount Paid: $${amount.toFixed(2)}\n`;
    receipt += `Previous Balance: $${(laybye.balanceDue + amount).toFixed(2)}\n`;
    receipt += `New Balance: $${laybye.balanceDue.toFixed(2)}\n`;
    receipt += `Total Paid to Date: $${laybye.amountPaid.toFixed(2)}\n\n`;

    receipt += `*NEXT STEPS*\n`;
    if (laybye.balanceDue > 0) {
      receipt += `Amount still due: $${laybye.balanceDue.toFixed(2)}\n`;
      receipt += `Continue payments: laybye pay ${laybye.customerName} [amount]`;
    } else {
      receipt += `Congratulations! Laybye fully paid!\n`;
      receipt += `Collect your items: laybye complete ${laybye.customerName}`;
    }

    return receipt;
  }

  /**
   * Generate laybye completion receipt
   */
  generateLayByeCompletionReceipt(laybye) {
    let receipt = `*LAYBYE COMPLETED*\n\n`;
    receipt += `Agreement #: LB-${laybye._id.toString().slice(-8)}\n`;
    receipt += `Customer: ${laybye.customerName}\n`;
    receipt += `Completed: ${new Date().toLocaleString()}\n\n`;

    receipt += `*SUMMARY*\n`;
    receipt += `Total Value: $${laybye.totalAmount.toFixed(2)}\n`;
    receipt += `Total Paid: $${laybye.amountPaid.toFixed(2)}\n`;
    receipt += `Installments: ${laybye.installments.length}\n\n`;

    receipt += `*ITEMS RELEASED*\n`;
    laybye.items.forEach((item, index) => {
      receipt += `${index + 1}. ${item.productName} x ${item.quantity}\n`;
    });

    receipt += `\n*NOTES*\n`;
    receipt += `✓ Stock deducted from inventory\n`;
    receipt += `✓ Profit now recognized: $${laybye.items.reduce((sum, item) => {
      const cost = item.costPrice || (item.price * 0.6);
      return sum + ((item.price - cost) * item.quantity);
    }, 0).toFixed(2)}\n`;
    receipt += `✓ Products ready for collection`;

    return receipt;
  }

  /**
  * Reserve stock for laybye
  */
  async reserveStockForLaybye(shopId, items) {
    try {
      // Check if all items have enough stock
      for (const item of items) {
        if (item.product.trackStock && item.product.stock < item.quantity) {
          return {
            success: false,
            message: `*Insufficient Stock*\n${item.product.name}: Need ${item.quantity}, have ${item.product.stock}`
          };
        }
      }

      // Optional: You could implement a reserved stock system here
      // For now, we just check availability
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: `Stock reservation failed: ${error.message}`
      };
    }
  }

  /**
   * Handle laybye completion
   */
  async handleLayByeComplete(shopId, text) {
    try {
      const match = text.match(/laybye\s+complete\s+(\S+)/i);

      if (!match) {
        return `*Invalid Format*\n\nUse: laybye complete [customer]\nExample: laybye complete John`;
      }

      const customerIdentifier = match[1];

      // Find completed laybye (balance due = 0)
      const laybye = await LayBye.findOne({
        shopId,
        $or: [
          { customerName: new RegExp(`^${customerIdentifier}$`, 'i') },
          { customerPhone: customerIdentifier }
        ],
        status: 'active',
        balanceDue: 0
      });

      if (!laybye) {
        return `*No Fully Paid LayBye Found*\n\nEither:
1. No laybye found for ${customerIdentifier}
2. Laybye not fully paid yet
3. Laybye already completed

Check balance: laybye pay ${customerIdentifier} 0`;
      }

      // Complete the laybye
      const completedSale = await this.completeLayBye(shopId, laybye);

      return this.generateLayByeCompletionReceipt(laybye);
    } catch (error) {
      console.error('Laybye complete error:', error);
      return `Failed to complete laybye: ${error.message}`;
    }
  }

  async handleCustomerCredit(shopId, text) {
    try {
      console.log("[CommandService] Customer credit:", text);

      // Remove "credit " prefix
      const cleanText = text.replace(/^credit\s+/i, "").trim();

      // Parse: John 10 bread 5 milk
      const parts = cleanText.split(/\s+/);

      if (parts.length < 3) {
        return `*Invalid Format*\n\nUse: credit [customer] [qty] [product] [qty] [product]...\n\n*Examples:*\n• credit John 10 bread\n• credit John 5 bread 3 milk\n• credit 0771234567 2 sugar 1 flour`;
      }

      const customerIdentifier = parts[0];

      // Find customer
      const customer = await CustomerService.findCustomer(
        shopId,
        customerIdentifier
      );

      if (!customer) {
        return `*Customer Not Found* \n\nNo customer found matching "${customerIdentifier}".\n\n*Add them first:*\ncustomer add ${customerIdentifier} [phone]`;
      }

      // Parse items: 10 bread 5 milk
      const items = [];
      let totalAmount = 0;
      let i = 1; // Start after customer name

      while (i < parts.length) {
        const quantity = parseInt(parts[i]);

        if (isNaN(quantity)) {
          return `Invalid quantity: "${parts[i]}"\n\nFormat: credit [customer] [qty] [product] [qty] [product]...`;
        }

        const productName = parts[i + 1];
        if (!productName) {
          return "Missing product name after quantity.";
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

        const itemTotal = quantity * product.price;

        items.push({
          productName: product.name,
          quantity,
          price: product.price,
          total: itemTotal,
        });

        totalAmount += itemTotal;
        i += 2;
      }

      if (items.length === 0) {
        return `No items found.\n\nUse: credit ${customerIdentifier} [qty] [product]...`;
      }

      // Create description
      const itemsDescription = items
        .map((item) => `${item.quantity}x ${item.productName}`)
        .join(", ");

      // Add credit transaction
      await customer.addCreditTransaction(
        totalAmount,
        items,
        `Credit sale: ${itemsDescription}`
      );

      // Generate receipt
      let receipt = `*CREDIT TRANSACTION RECORDED*\n\n`;
      receipt += `Customer: ${customer.name}\n`;
      receipt += `Date: ${new Date().toLocaleString()}\n\n`;

      receipt += `*ITEMS ON CREDIT*\n`;
      items.forEach((item) => {
        receipt += `• ${item.quantity}x ${item.productName
          } @ $${item.price.toFixed(2)} = $${item.total.toFixed(2)}\n`;
      });

      receipt += `\n*Total Credit: $${totalAmount.toFixed(2)}*\n\n`;
      receipt += `*ACCOUNT BALANCE*\n`;
      receipt += `Previous: $${(customer.currentBalance - totalAmount).toFixed(
        2
      )}\n`;
      receipt += `Added: $${totalAmount.toFixed(2)}\n`;
      receipt += `Current Owes: $${customer.currentBalance.toFixed(2)}\n\n`;

      if (customer.creditLimit > 0) {
        const remaining = customer.creditLimit - customer.currentBalance;
        receipt += `Credit Limit: $${customer.creditLimit.toFixed(2)}\n`;
        receipt += `Remaining: $${remaining.toFixed(2)}\n\n`;
      }

      receipt += `Use "customer ${customer.name}" to view full credit history`;

      return receipt;
    } catch (error) {
      console.error("[CommandService] Customer credit error:", error);
      return `Failed to process credit: ${error.message}`;
    }
  }

  /**
   * Handle customer payments
   */
  async handleCustomerPayment(shopId, text) {
    try {
      console.log("[CommandService] Customer payment:", text);

      // Format: payment John 50.00
      const parts = text
        .replace(/^payment\s+/i, "")
        .trim()
        .split(/\s+/);

      if (parts.length < 2) {
        return `*Invalid Format*\n\nUse: payment [customer] [amount]\n\n*Examples:*\n• payment John 50\n• payment John 25.50\n• payment 0771234567 100`;
      }

      const customerIdentifier = parts[0];
      const amount = parseFloat(parts[1]);

      if (isNaN(amount) || amount <= 0) {
        return "Invalid amount. Please use a positive number.\n\nExample: payment John 50.00";
      }

      // Find customer
      const customer = await CustomerService.findCustomer(
        shopId,
        customerIdentifier
      );

      if (!customer) {
        return `*Customer Not Found* \n\nNo customer found matching "${customerIdentifier}".`;
      }

      if (customer.currentBalance === 0) {
        return `*No Outstanding Balance* \n\n${customer.name} doesn't owe anything.\n\nCurrent Balance: $0.00`;
      }

      if (amount > customer.currentBalance) {
        return `*Payment Exceeds Debt*\n\n${customer.name
          } owes: $${customer.currentBalance.toFixed(
            2
          )}\nPayment amount: $${amount.toFixed(2)}\n\nOverpayment: $${(
            amount - customer.currentBalance
          ).toFixed(2)}\n\nPlease enter exact or smaller amount.`;
      }

      const previousBalance = customer.currentBalance;

      // Record payment
      await customer.recordPayment(
        amount,
        `Payment received: $${amount.toFixed(2)}`
      );

      // Generate receipt
      let receipt = `*PAYMENT RECEIVED* \n\n`;
      receipt += `Customer: ${customer.name}\n`;
      receipt += `Date: ${new Date().toLocaleString()}\n\n`;

      receipt += `*PAYMENT DETAILS*\n`;
      receipt += `Amount Paid: $${amount.toFixed(2)}\n\n`;

      receipt += `*ACCOUNT BALANCE*\n`;
      receipt += `Previous Owed: $${previousBalance.toFixed(2)}\n`;
      receipt += `Payment: -$${amount.toFixed(2)}\n`;
      receipt += `Current Owes: $${customer.currentBalance.toFixed(2)}`;

      if (customer.currentBalance === 0) {
        receipt += `\n\n*Account Cleared!* ${customer.name}'s account is now paid in full.`;
      } else {
        receipt += `\n\n*Remaining Balance:* $${customer.currentBalance.toFixed(
          2
        )} still owed`;
      }

      receipt += `\n\nUse "customer ${customer.name}" to view full payment history`;

      return receipt;
    } catch (error) {
      console.error("[CommandService] Customer payment error:", error);
      return `Failed to process payment: ${error.message}`;
    }
  }

  async handleCreditHistory(shopId, text) {
    try {
      const parts = text.replace(/^credit\s+history\s+/i, "").trim();
      const customerIdentifier = parts;

      const customer = await CustomerService.findCustomer(
        shopId,
        customerIdentifier
      );

      if (!customer) {
        return `*Customer Not Found* \n\nNo customer found matching "${customerIdentifier}".`;
      }

      if (
        !customer.creditTransactions ||
        customer.creditTransactions.length === 0
      ) {
        return `*No Credit History*\n\n${customer.name
          } has no credit transactions yet.\n\nCurrent Balance: $${customer.currentBalance.toFixed(
            2
          )}`;
      }

      let history = `*CREDIT HISTORY*\n\n`;
      history += `Customer: ${customer.name}\n`;
      history += `Current Balance: $${customer.currentBalance.toFixed(2)}\n`;
      history += `Total Transactions: ${customer.creditTransactions.length}\n\n`;

      // Show last 10 transactions
      const recentTransactions = customer.creditTransactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);

      recentTransactions.forEach((trans, index) => {
        const icon = trans.type === "credit" ? "Ecocash" : "Cash";
        const sign = trans.type === "credit" ? "+" : "-";

        history += `${index + 1}. ${icon} ${trans.type.toUpperCase()}\n`;
        history += `   Date: ${new Date(trans.date).toLocaleDateString()}\n`;
        history += `   Amount: ${sign}$${trans.amount.toFixed(2)}\n`;

        if (trans.items && trans.items.length > 0) {
          history += `   Items: `;
          history += trans.items
            .map((item) => `${item.quantity}x ${item.productName}`)
            .join(", ");
          history += "\n";
        }

        history += `   Balance: $${trans.balanceBefore.toFixed(
          2
        )} → $${trans.balanceAfter.toFixed(2)}\n`;
        history += `   Note: ${trans.description}\n\n`;
      });

      if (customer.creditTransactions.length > 10) {
        history += `... and ${customer.creditTransactions.length - 10
          } more transactions`;
      }

      return history;
    } catch (error) {
      console.error("[CommandService] Credit history error:", error);
      return `Failed to get credit history: ${error.message}`;
    }
  }

  /**
   * Handle order placement and management
   */
  async handleOrderCommands(shopId, text) {
    try {
      const parts = text
        .replace("order", "")
        .replace("orders", "")
        .trim()
        .split(" ");
      const command = parts[0]?.toLowerCase();

      if (!command) {
        // Show all orders
        const result = await OrderService.listOrders(shopId);
        return result.message;
      }

      if (command === "place" || command === "new") {
        // Format: order place John 2 bread 1 milk
        const remainingText = text
          .replace("place", "")
          .replace("new", "")
          .trim();
        return await this.processNewOrder(shopId, remainingText);
      }

      if (
        command === "pending" ||
        command === "confirmed" ||
        command === "ready" ||
        command === "completed" ||
        command === "cancelled"
      ) {
        const result = await OrderService.listOrders(shopId, command);
        return result.message;
      }

      if (command === "details") {
        const orderIdentifier = parts[1];
        if (!orderIdentifier) {
          return "Please specify order ID.\n\nUse: order details [order-id]\nExample: order details A1B2";
        }
        const result = await OrderService.getOrderDetails(
          shopId,
          orderIdentifier
        );
        return result.message;
      }

      // If no specific command, treat as new order
      return await this.processNewOrder(
        shopId,
        text.replace("order", "").trim()
      );
    } catch (error) {
      console.error("Order command error:", error);
      return "Failed to process order command. Please try again.";
    }
  }

  /**
   * Process new order placement
   */
  async processNewOrder(shopId, orderText) {
    try {
      // Format: John 2 bread 1 milk pickup "Need by Friday"
      const parts = orderText.trim().split(" ");
      const customerIdentifier = parts[0];

      if (!customerIdentifier) {
        return 'Please specify customer.\n\nUse: order [customer] [items] [type?] [notes?]\nExamples:\n• order John 2 bread 1 milk\n• order John 2 bread 1 milk delivery "Leave at door"\n• order 1234567890 3 eggs 1 sugar pickup';
      }

      // Extract order type and notes
      let itemsText = "";
      let orderType = "pickup";
      let notes = "";

      const typeIndex = parts.findIndex((part) =>
        ["pickup", "delivery", "reservation"].includes(part.toLowerCase())
      );

      if (typeIndex !== -1) {
        itemsText = parts.slice(1, typeIndex).join(" ");
        orderType = parts[typeIndex].toLowerCase();
        notes = parts.slice(typeIndex + 1).join(" ");
      } else {
        itemsText = parts.slice(1).join(" ");
      }

      if (!itemsText.trim()) {
        return "Please specify items for the order.\n\nUse: order [customer] [items]\nExample: order John 2 bread 1 milk";
      }

      const result = await OrderService.placeOrder(
        shopId,
        customerIdentifier,
        itemsText,
        orderType,
        notes
      );
      return result.message;
    } catch (error) {
      console.error("Process new order error:", error);
      return "Failed to place order. Please try again.";
    }
  }

  /**
   * Handle order status updates
   */
  async handleOrderStatusUpdate(shopId, text) {
    try {
      const parts = text.trim().split(" ");
      const action = parts[0].toLowerCase();
      const command = parts[1]?.toLowerCase();
      const orderIdentifier = parts[2];
      const notes = parts.slice(3).join(" ");

      if (!["confirm", "ready", "complete", "cancel"].includes(action)) {
        return "Invalid order action. Use: confirm, ready, complete, or cancel.";
      }

      if (command !== "order") {
        return "Invalid format. Use: [action] order [order-id]\nExample: confirm order A1B2";
      }

      if (!orderIdentifier) {
        return "Please specify order ID.\n\nUse: [action] order [order-id]\nExample: confirm order A1B2";
      }

      let newStatus;
      switch (action) {
        case "confirm":
          newStatus = "confirmed";
          break;
        case "ready":
          newStatus = "ready";
          break;
        case "complete":
          newStatus = "completed";
          break;
        case "cancel":
          newStatus = "cancelled";
          break;
      }

      const result = await OrderService.updateOrderStatus(
        shopId,
        orderIdentifier,
        newStatus,
        notes
      );
      return result.message;
    } catch (error) {
      console.error("Order status update error:", error);
      return "Failed to update order status. Please try again.";
    }
  }

  /**
   * Handle expense recording
   */
  async handleExpenseRecording(shopId, text) {
    try {
      // Format: expense 50.00 "supplier payment" supplies bank INV001
      // or: expense 50.00 supplier payment
      const parts = text.replace("expense", "").trim().split(" ");

      if (parts.length < 2) {
        return 'Invalid format.\n\nUse: expense [amount] [description] [category?] [payment?] [receipt?]\n\nExamples:\n• expense 50.00 "supplier payment"\n• expense 25.50 transport cash\n• expense 1000.00 rent bank "July rent"\n• expense 150.00 supplies cash INV123';
      }

      const amount = parseFloat(parts[0]);
      if (isNaN(amount) || amount <= 0) {
        return "Invalid amount. Please use a positive number greater than 0.\nExample: 50.00";
      }

      // Parse description (could be in quotes or multiple words)
      let description = "";
      let category = "other";
      let paymentMethod = "cash";
      let receiptNumber = "";

      // Check if description is in quotes
      if (parts[1].startsWith('"')) {
        const quoteMatch = text.match(/expense\s+[\d.]+\s+"([^"]+)"/);
        if (quoteMatch) {
          description = quoteMatch[1];
          const remaining = text
            .replace(`expense ${parts[0]} "${description}"`, "")
            .trim()
            .split(" ");
          if (remaining[0]) category = remaining[0];
          if (remaining[1]) paymentMethod = remaining[1];
          if (remaining[2]) receiptNumber = remaining[2];
        }
      } else {
        // Simple format
        description = parts.slice(1).join(" ");

        // Try to extract known categories and payment methods
        const knownCategories = [
          "supplies",
          "utilities",
          "rent",
          "salary",
          "transport",
          "marketing",
          "maintenance",
          "taxes",
          "insurance",
          "packaging",
        ];

        const knownPayments = ["cash", "bank", "mobile", "credit"];

        // Split description to find category and payment
        const words = description.split(" ");
        for (let i = words.length - 1; i >= 0; i--) {
          const word = words[i].toLowerCase();
          if (knownPayments.includes(word) && paymentMethod === "cash") {
            paymentMethod = word;
            words.splice(i, 1);
          } else if (knownCategories.includes(word) && category === "other") {
            category = word;
            words.splice(i, 1);
          } else if (word.match(/^[A-Z0-9]{3,}$/) && !receiptNumber) {
            // Looks like a receipt number
            receiptNumber = word;
            words.splice(i, 1);
          }
        }

        description = words.join(" ").trim();
      }

      if (!description.trim()) {
        return 'Expense description is required.\n\nExample: expense 50.00 "supplier payment"';
      }

      const result = await ExpenseService.recordExpense(
        shopId,
        amount,
        description,
        category,
        paymentMethod,
        receiptNumber
      );

      return result.message;
    } catch (error) {
      console.error("Expense recording error:", error);
      return "Failed to record expense. Please try again.";
    }
  }

  /**
   * Handle expense reports
   */
  async handleExpenseReports(shopId, text) {
    try {
      const parts = text.replace("expenses", "").trim().split(" ");
      const period = parts[0]?.toLowerCase() || "daily";

      if (period === "breakdown") {
        const breakdownPeriod = parts[1] || "monthly";
        const result = await ExpenseService.getExpenseBreakdown(
          shopId,
          breakdownPeriod
        );

        if (!result.success) {
          return result.message;
        }

        return ExpenseService.generateExpenseBreakdownMessage(result);
      }

      // Valid periods
      const validPeriods = ["daily", "today", "yesterday", "weekly", "monthly"];
      if (!validPeriods.includes(period)) {
        return `Invalid period. Use: daily, weekly, or monthly.\n\nExample: expenses weekly`;
      }

      const actualPeriod = period === "today" ? "daily" : period;
      const result = await ExpenseService.getExpenses(shopId, actualPeriod);

      if (!result.success) {
        return result.message;
      }

      return ExpenseService.generateExpensesReportMessage(
        result.expenses,
        result.total,
        actualPeriod,
        result.startDate,
        result.endDate
      );
    } catch (error) {
      console.error("Expense reports error:", error);
      return "Failed to generate expense report. Please try again.";
    }
  }

  /**
   * Handle profit calculations
   */
  async handleProfitCalculation(shopId, text) {
    try {
      const parts = text.replace("profit", "").trim().split(" ");
      const period = parts[0]?.toLowerCase() || "daily";

      const validPeriods = ["daily", "today", "yesterday", "weekly", "monthly"];
      if (!validPeriods.includes(period)) {
        return `Invalid period. Use: daily, weekly, or monthly.\n\nExample: profit weekly`;
      }

      const actualPeriod = period === "today" ? "daily" : period;
      const result = await ExpenseService.calculateProfit(shopId, actualPeriod);

      if (!result.success) {
        return result.message;
      }

      return ExpenseService.generateProfitReportMessage(result);
    } catch (error) {
      console.error("Profit calculation error:", error);
      return "Failed to calculate profit. Please try again.";
    }
  }

  getHelpText() {
    return `SMART SHOP ASSISTANT - Business Management Tool

===============
 CORE COMMANDS
===============
• help - Show this guide
• register "Hello World" 1234
• login 1234 - Access your account
• logout - End session

==================
PRODUCT MANAGEMENT
==================
Add/Edit:
• add bread 2.50 stock 100 - Add product
• price bread 2.75 - Update price
• stock +bread 80 - Update stock
• stock -bread 20 - Reduce stock
• edit bread price 2.60 - Edit details
• delete bread - Remove product

View:
• list - All products
• low stock - Low inventory

====================
SALES & TRANSACTIONS
====================
Record Sales:
• sell 2 bread 1 milk - Standard sale
• sell 3 bread 2.25 - Custom price 

Reports:
• daily - Today's report
• weekly - 7-day analysis
• monthly - 30-day report
• best - Top products

Cancel Sales:
• cancel - Recent sales
• cancel last [reason] - Cancel latest
• cancel sale 2 [reason] - Cancel specific
• cancel refunds - Refunds report

===================
CUSTOMER MANAGEMENT
===================
Customers:
• customer add "John" 1234567890 - Add
• customers - All customers
• customers active - Active (30 days)
• customer John - Profile & history
• customer 1234567890 - Find by phone

Customer Sales:
• sell to John 2 bread 1 milk
• sell to 1234567890 3 eggs 1 sugar

=================
CREDIT & PAYMENTS
=================
• credit John 50.00 - Add credit
• payment John 50.00 - Record payment
• credit history John - Credit history

=============
ORDERS SYSTEM
=============
Place Orders:
• order John 2 bread 1 milk - Pickup
• order John 2 bread 1 milk delivery
• order John 2 bread 1 milk reservation

Manage Orders:
• orders - All orders
• orders pending - Pending
• orders ready - Ready
• order details A1B2 - Details
• confirm order A1B2 - Confirm
• ready order A1B2 - Mark ready
• complete order A1B2 - Complete
• cancel order A1B2 "reason" - Cancel

=================
EXPENSES & PROFIT
=================
Expenses:
• expense 50.00 "supplier" - Basic
• expense 25.50 transport cash
• expense 1000.00 rent bank "July rent"

View Expenses:
• expenses daily - Today
• expenses weekly - Week
• expenses monthly - Month
• expenses breakdown - Categories

Profit:
• profit daily - Today's profit
• profit weekly - Weekly
• profit monthly - Monthly

===========
PDF REPORTS
===========
• export daily - Daily PDF
• export weekly - Weekly PDF  
• export monthly - Monthly PDF
• export best - Weekly best sellers
• export best month - Monthly best
• pdf daily - Alternative syntax

===========
QUICK START
===========
1. add bread 2.50
2. sell 2 bread
3. daily - Check sales
4. profit daily - Calculate profit

For detailed help on any command, type the command alone.`;
  }
}

export default new CommandService();
