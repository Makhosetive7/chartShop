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
import FinancialService from "./FinancialService.js";
import AuthService from "./AuthService.js";
import crypto from 'crypto';

class CommandService {
  async processCommand(telegramId, text) {
    const command = text.trim().toLowerCase();

    // Register command
    if (command.startsWith("register") || command === "register") {
      return await this.handleRegister(telegramId, text);
    }

    // Check if user is in registration flow
    const regStatus = AuthService.getRegistrationStatus(telegramId);
    if (regStatus && !command.startsWith("/")) {
      const result = await AuthService.processRegistrationStep(
        telegramId,
        text
      );
      return result.message;
    }

    // Login command
    if (command.startsWith("login") || command === "login") {
      return await this.handleLogin(telegramId, text);
    }

    // logout command
    if (command === "logout") {
      return await this.handleLogout(telegramId);
    }

    // Account info
    if (command === "account" || command === "profile") {
      return await this.handleAccount(telegramId);
    }

    // Status check
    if (command === "status") {
      return await this.handleStatus(telegramId);
    }

    if (!AuthService.isAuthenticated(telegramId)) {
      return `*Welcome to Chart Shop!*\n\nHi there! You need to be logged in.\n\n*To get started:*\n• Register: \`register\`\n• Login: \`login\`\n\nNeed help? Type *help*`;
    }

    // Update activity
    AuthService.updateActivity(telegramId);

    const shop = await Shop.findOne({ telegramId, isActive: true });
    if (!shop) {
      return `*Session Error*\n\nPlease login again: \`login\``;
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

    if (
      command.startsWith("expense breakdown") ||
      command.startsWith("expenses breakdown")
    ) {
      return await this.handleExpenseBreakdown(shop._id, text);
    }

    // Update existing daily command:
    if (command === "daily" || command === "total") {
      return await this.handleDailyTotal(shop._id);
    }

    // Update existing weekly command:
    if (command.startsWith("weekly") || command.startsWith("week")) {
      return await this.handleWeeklyReport(shop._id);
    }

    // Update existing monthly command:
    if (command.startsWith("monthly") || command.startsWith("month")) {
      return await this.handleMonthlyReport(shop._id);
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
    receipt += `Stock deducted immediately\n`;
    receipt += `Profit recognized: $${sale.profit.toFixed(2)}\n`;
    receipt += `Customer balance increased\n`;
    receipt += `Payment due: ${new Date(
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
    receipt += `Stock reserved (not deducted)\n`;
    receipt += `No profit recognized yet\n`;
    receipt += `Product will be released upon full payment\n`;
    receipt += `Payments accepted: cash, bank, mobile\n`;
    receipt += `Make payments with: laybye pay ${customer.name} [amount]`;

    return receipt;
  }

  async handleRegister(telegramId, text) {
    try {
      // Check if this is the old format: register "Business Name" 1234
      const oldFormatMatch =
        text.match(/register\s+"([^"]+)"\s+(\d{4})/i) ||
        text.match(/register\s+(\S+(?:\s+\S+)*?)\s+(\d{4})/i);

      if (oldFormatMatch) {
        // Old format - convert to new progressive registration
        const businessName = oldFormatMatch[1];
        const pin = oldFormatMatch[2];

        // Validate PIN
        const pinValidation = AuthService.validatePin(pin);
        if (!pinValidation.valid) {
          return `❌ *Weak PIN*\n\n${pinValidation.message}\n\nPlease choose a stronger 4-digit PIN.`;
        }

        // Check if already registered
        const existing = await Shop.findOne({ telegramId });
        if (existing) {
          return "*Already Registered!*\n\nYou already have an account.\n\n• To login: `login 1234`\n\nYou can only have one shop per Telegram account.";
        }

        // Hash PIN and create shop
        const hashedPin = await bcrypt.hash(pin, 12);

        const shop = await Shop.create({
          telegramId,
          businessName: businessName,
          businessDescription: "General merchandise", // Default description
          pin: hashedPin,
          isActive: true,
          registeredAt: new Date(),
        });

        // Auto-login
        const sessionToken = crypto.randomBytes(32).toString("hex");
        AuthService.activeSessions.set(telegramId, {
          sessionToken,
          loginTime: new Date(),
          lastActivity: new Date(),
          shopId: shop._id,
        });

        return `*Registration Complete!*\n\n ${businessName} is ready!\n\n *Quick Start:*\n\n*Add Products:*\n• add bread 2.50 stock 50\n• list - View products\n\n*Record Sales:*\n• sell 2 bread 1 milk\n• daily - View report\n\n*Get Help:*\n• help - See all commands\n\n💡 _Start by adding some products!_`;
      }

      if (text.trim().toLowerCase() === "register") {
        const result = await AuthService.startRegistration(telegramId, {
          firstName: "",
          lastName: "",
          username: "",
        });

        return result.message;
      }

      // If user is in registration flow, process the step
      const regStatus = AuthService.getRegistrationStatus(telegramId);
      if (regStatus) {
        const result = await AuthService.processRegistrationStep(
          telegramId,
          text
        );
        return result.message;
      }

      // No match - show help
      return `*Registration Format*\n\n*Quick Registration:*\n\`register "Business Name" 1234\`\n\n*Or Progressive Registration:*\nJust type: \`register\`\n\n*Examples:*\n• \`register "Family Bakery" 5678\`\n• \`register\` (step-by-step)\n\n*Security Tip:* Use a unique 4-digit PIN.`;
    } catch (error) {
      console.error("Register error:", error);
      return "Registration failed. Please try again.";
    }
  }

  //LOGIN
  async handleLogin(telegramId, text) {
    try {
      // Check if already logged in
      if (AuthService.isAuthenticated(telegramId)) {
        const shop = await Shop.findOne({ telegramId });
        return `*Already logged in*\n\n ${shop.shopName}\n\n*Quick Actions:*\n• sell - Record a sale\n• daily - View today's summary\n• products - Check inventory`;
      }

      // Old format: login 1234
      const oldFormatMatch = text.match(/^login\s+(\d{4})$/i);

      if (oldFormatMatch) {
        const pin = oldFormatMatch[1];
        const result = await AuthService.login(telegramId, pin);

        // Update shop isActive status for backward compatibility
        if (result.success) {
          const shop = await Shop.findOne({ telegramId });
          if (shop) {
            shop.isActive = true;
            await shop.save();
          }
        }

        return result.message;
      }

      if (text.trim().toLowerCase() === "login") {
        return `*Login*\n\nPlease enter your 4-digit PIN.`;
      }

      // Check if this is a PIN entry (4 digits)
      const pinMatch = text.match(/^\d{4}$/);
      if (pinMatch) {
        const pin = pinMatch[0];
        const result = await AuthService.login(telegramId, pin);

        // Update shop isActive status for backward compatibility
        if (result.success) {
          const shop = await Shop.findOne({ telegramId });
          if (shop) {
            shop.isActive = true;
            await shop.save();
          }
        }

        return result.message;
      }

      return "Invalid PIN format.\n\nUse: `login 1234`\nOr just type: `login`";
    } catch (error) {
      console.error("Login error:", error);
      return "Login failed. Please try again.";
    }
  }
  async handleLogout(telegramId) {
    try {
      // Use AuthService logout
      const result = await AuthService.logout(telegramId);

      const shop = await Shop.findOne({ telegramId });
      if (shop) {
        shop.isActive = false;
        await shop.save();
      }

      return result.message;
    } catch (error) {
      console.error("Logout error:", error);
      return "Failed to logout. Please try again.";
    }
  }

  // Handle account info commanD
  async handleAccount(telegramId) {
    try {
      if (!AuthService.isAuthenticated(telegramId)) {
        return "Please login first using `login 1234`";
      }

      const shop = await Shop.findOne({ telegramId });
      const session = AuthService.activeSessions.get(telegramId);

      if (!shop) {
        return "Account not found.";
      }

      let message = "*Your Account*\n\n";
      message += `*Shop:* ${shop.shopName}\n`;

      if (shop.shopDescription) {
        message += `*Description:* ${shop.shopDescription}\n`;
      }

      message += `*Status:* Active\n\n`;
      message += `*Registered:* ${shop.registeredAt.toLocaleDateString()}\n`;
      message += `*Last Login:* ${
        shop.lastLogin ? this.formatLastLogin(shop.lastLogin) : "N/A"
      }\n\n`;

      message += "*Commands:*\n";
      message += "• logout - End session\n";
      message += "• help - Get help";

      return message;
    } catch (error) {
      console.error("Account error:", error);
      return "Failed to get account info.";
    }
  }

  //Handle status command
  async handleStatus(telegramId) {
    try {
      // Check registration status
      const regStatus = AuthService.getRegistrationStatus(telegramId);
      if (regStatus) {
        return `*Registration in progress*\n\nStep ${regStatus.stepNumber}/${
          regStatus.totalSteps
        }: ${regStatus.stepName}\n\n${
          regStatus.data.shopName
            ? `✅ Shop Name: ${regStatus.data.shopName}\n`
            : ""
        }${
          regStatus.data.shopDescription
            ? `✅ Description: ${regStatus.data.shopDescription}\n`
            : ""
        }\n💡 Continue where you left off, or type a different command to start over.`;
      }

      // Check authentication status
      if (AuthService.isAuthenticated(telegramId)) {
        const shop = await Shop.findOne({ telegramId });
        return `*Logged in*\n\n${shop.shopName}\n\nUse \`account\` for more details.`;
      }

      // Not registered or logged in
      return `*Status*\n\n Not logged in\n\n*New user?* Use \`register\`\n*Existing user?* Use \`login\``;
    } catch (error) {
      console.error("Status error:", error);
      return "Failed to check status.";
    }
  }

  // Format last login timE
  formatLastLogin(lastLogin) {
    const now = new Date();
    const diff = now - new Date(lastLogin);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
    return lastLogin.toLocaleDateString();
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
      // Remove the "add " prefix
      const input = text.replace("add ", "").trim();

      // Regex to match quoted product names or single words
      const match = input.match(
        /^(?:"([^"]+)"|(\S+))\s+([\d.]+)(?:\s+stock\s+(\d+))?(?:\s+threshold\s+(\d+))?$/i
      );

      if (!match) {
        return 'Invalid format.\n\nUse: add [product] [price]\nWith stock: add [product] [price] stock [qty]\nWith threshold: add [product] [price] stock [qty] threshold [num]\n\nExamples:\nadd bread 2.50\nadd "carex condoms" 1.50 stock 100\nadd "blue butterfly heels" 25.00 stock 20 threshold 5';
      }

      const name = match[1] || match[2]; // Group 1 is quoted, group 2 is unquoted
      const price = parseFloat(match[3]);
      const stock = match[4] ? parseInt(match[4]) : 0;
      const lowStockThreshold = match[5] ? parseInt(match[5]) : 10;
      const trackStock = !!match[4]; // If stock is provided, track it

      if (isNaN(price) || price <= 0) {
        return "Invalid price. Please use a positive number.\nExample: 2.50";
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
        stock,
        lowStockThreshold,
        trackStock,
      });

      let response = `*Product added!*\n\n`;
      response += `Name: ${name}\n`;
      response += `Price: $${price.toFixed(2)}\n`;
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

  async handleUpdateStock(shopId, text) {
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
  async handleEditProduct(shopId, text) {
    try {
      // Remove the "edit " prefix
      const input = text.replace("edit ", "").trim();

      // Match: product-name field value (supports quoted product names and multi-word values)
      // New regex handles both quoted and unquoted product names, and captures all remaining text as value
      const match = input.match(
        /^(?:"([^"]+)"|(\S+))\s+(price|stock|threshold|name)\s+(.+)$/i
      );

      if (!match) {
        return 'Invalid format.\n\nUse: edit [product] [field] [value]\n\nAvailable fields:\n• price [amount]\n• stock [quantity]\n• threshold [quantity]\n• name [new-name]\n\nExamples:\n• edit bread price 3.00\n• edit "carex condoms" stock 100\n• edit milk threshold 10\n• edit bread name "White Bread"\n• edit "old name" name "New Product Name"';
      }

      const productName = match[1] || match[2]; // Group 1 is quoted, group 2 is unquoted
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

  async handleSetThreshold(shopId, text) {
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
      console.log(
        "[CommandService] Generating daily report using FinancialService"
      );

      const result = await FinancialService.getDailyCashFlow(shopId);

      if (!result.success) {
        return `*Error Generating Report*\n\n${result.message}`;
      }

      return result.report;
    } catch (error) {
      console.error("[CommandService] Daily report error:", error);
      return `Failed to generate daily report: ${error.message}`;
    }
  }

  async handleWeeklyReport(shopId) {
    try {
      console.log(
        "[CommandService] Generating weekly report using FinancialService"
      );

      const result = await FinancialService.getWeeklyCashFlow(shopId);

      if (!result.success) {
        return `*Error Generating Report*\n\n${result.message}`;
      }

      return result.report;
    } catch (error) {
      console.error("[CommandService] Weekly report error:", error);
      return `Failed to generate weekly report: ${error.message}`;
    }
  }

  async handleMonthlyReport(shopId) {
    try {
      console.log(
        "[CommandService] Generating monthly report using FinancialService"
      );

      const result = await FinancialService.getMonthlyCashFlow(shopId);

      if (!result.success) {
        return `*Error Generating Report*\n\n${result.message}`;
      }

      return result.report;
    } catch (error) {
      console.error("[CommandService] Monthly report error:", error);
      return `Failed to generate monthly report: ${error.message}`;
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
          "4th: ",
          "5th: ",
          "6th: ",
          "7th: ",
          "8th: ",
          "9th: ",
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
      const parts = text
        .toLowerCase()
        .replace("export", "")
        .replace("pdf", "")
        .trim()
        .split(" ");
      const reportType = parts[0] || "daily";

      console.log("[CommandService] Exporting", reportType, "report");

      let pdfMethod;
      let periodName;

      switch (reportType) {
        case "daily":
        case "today":
          pdfMethod = "generateEnhancedDailyReportPDF";
          periodName = "Daily";
          break;

        case "weekly":
        case "week":
          pdfMethod = "generateEnhancedWeeklyReportPDF";
          periodName = "Weekly";
          break;

        case "monthly":
        case "month":
          pdfMethod = "generateEnhancedMonthlyReportPDF";
          periodName = "Monthly";
          break;

        default:
          return `Invalid report type: "${reportType}"\n\nAvailable:\n• export daily\n• export weekly\n• export monthly`;
      }

      // Return promise for PDF generation
      return new Promise((resolve, reject) => {
        PDFService[pdfMethod](shop, (error, result) => {
          if (error) {
            console.error("[CommandService] PDF generation error:", error);
            resolve(`*PDF Generation Failed*\n\n${error.message}`);
          } else {
            resolve({
              type: "pdf",
              message: `*${periodName} Financial Report Generated!*\n\nYour comprehensive financial report is ready with:\n\nCash flow analysis\nRevenue breakdown\nExpense details by category\nProfitability metrics\nOutstanding balances\n\nComplete financial transparency at your fingertips.`,
              filePath: result.filePath,
              fileName: result.filename,
            });
          }
        });
      });
    } catch (error) {
      console.error("[CommandService] Export report error:", error);
      return `*Export Failed*\n\n${error.message}`;
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

      let cleanText = text.replace(/^customers?\s+add\s+/i, "").trim();
      console.log("[CommandService] Clean text:", cleanText);

      const match = cleanText.match(
        /^(?:"([^"]+)"|(\S+))\s+(\S+)(?:\s+(.+))?$/
      );

      if (!match) {
        console.log("[CommandService] Invalid format");
        return `*Invalid Format*\n\nUse: customer add [name] [phone] [email?]\n\n*Examples:*\n• customer add John 0771234567\n• customer add "Jane Doe" +263771234567\n• customer add Mike 0771234567 mike@email.com\n• customer add "John Smith" 0771234567 john@example.com`;
      }

      const name = match[1] || match[2]; // Group 1 is quoted name, group 2 is unquoted name
      const phone = match[3];
      const email = (match[4] || "").trim();

      console.log("[CommandService] Parsed:", {
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

      const match = text.match(/^sell\s+to\s+(?:"([^"]+)"|(\S+))\s+(.+)$/i);

      if (!match) {
        return `*Invalid Format*\n\nUse: sell to [customer] [items]\n\n*Examples:*\n• sell to John 2 bread 1 milk\n• sell to "Jane Doe" 3 eggs 2.50\n• sell to 0771234567 2 bread\n• sell to "John Smith" 1 "carex condoms" 2.50`;
      }

      const customerIdentifier = match[1] || match[2];
      const itemsText = match[3];

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

      // Parse items using regex with support for multi-word names
      const items = [];
      const regex = /(\d+)\s+(?:"([^"]+)"|(\S+))(?:\s+([\d.]+))?(?=\s|$)/g;

      let match;
      while ((match = regex.exec(itemsText)) !== null) {
        const quantity = parseInt(match[1]);

        if (isNaN(quantity) || quantity <= 0) {
          return `Invalid quantity: "${match[1]}"`;
        }

        let productName = match[2] || match[3];

        if (!productName) {
          return `Missing product name for quantity ${quantity}.`;
        }

        let price = match[4] ? parseFloat(match[4]) : null;

        // Clean product name
        productName = productName.replace(/^"+|"+$/g, "").trim();

        // Find product
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
          return `Product "${productName}" not found. Type "list" to see products.`;
        }

        const finalPrice = price !== null ? price : product.price;
        const itemTotal = quantity * finalPrice;
        const isCustomPrice = price !== null;

        items.push({
          productId: product._id,
          product: product,
          productName: product.name,
          quantity,
          price: finalPrice,
          standardPrice: product.price,
          isCustomPrice,
          total: itemTotal,
        });
      }

      if (items.length === 0) {
        return `No valid items found. Format: [quantity] [product] [price?]\nExamples:\n• 2 bread 1 milk\n• 2 "mince meat" 1.20\n• 1 "carex condoms" 1.50`;
      }

      let total = 0;

      // Check stock
      for (const item of items) {
        if (item.product.trackStock && item.product.stock < item.quantity) {
          return `*INSUFFICIENT STOCK*\n\n${item.product.name}\nRequested: ${item.quantity}\nAvailable: ${item.product.stock}`;
        }
        total += item.total;
      }

      // Deduct stock
      for (const item of items) {
        if (item.product.trackStock) {
          item.product.stock -= item.quantity;
          await item.product.save();
        }
      }

      console.log(
        "[CommandService] Parsed items:",
        items.length,
        "Total:",
        total
      );

      // Create sale with customer reference
      const sale = await Sale.create({
        shopId,
        items: items.map((item) => ({
          productId: item.product._id,
          productName: item.product.name,
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

      // Generate receipt
      return this.generateCustomerReceipt(sale, customer, items);
    } catch (error) {
      console.error(
        "[CommandService] Process sale with customer error:",
        error
      );
      return `Failed to process sale: ${error.message}`;
    }
  }

  // Helper function to generate receipt
  generateCustomerReceipt(sale, customer, items) {
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
      receipt += `${index + 1}. ${item.product.name}\n`;
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
      "TOTAL AMOUNT:".padEnd(30) + `$${sale.total.toFixed(2)}`.padStart(10);
    receipt += "\n" + "=".repeat(40) + "\n\n";

    receipt += "CUSTOMER SUMMARY\n";
    receipt += "-".repeat(40) + "\n";
    receipt += `Total Spent: $${customer.totalSpent.toFixed(2)}\n`;
    receipt += `Total Visits: ${customer.totalVisits}\n`;
    receipt += `Loyalty Points: ${customer.loyaltyPoints}\n\n`;

    receipt += "Thank you for your business!";

    return receipt;
  }

  /**
   * Parse sale items from text
   */
  async parseSaleItems(shopId, itemsText) {
    try {
      console.log("[parseSaleItems] Input text:", itemsText);

      const items = [];
      const regex = /(\d+)\s+(?:"([^"]+)"|(\S+))(?:\s+([\d.]+))?(?=\s|$)/g;

      let match;
      while ((match = regex.exec(itemsText)) !== null) {
        console.log("[parseSaleItems] Match found:", match);

        const quantity = parseInt(match[1]);

        if (isNaN(quantity) || quantity <= 0) {
          return `Invalid quantity: "${match[1]}"`;
        }

        let productName = match[2] || match[3];

        if (!productName) {
          return `Missing product name for quantity ${quantity}.`;
        }

        let price = match[4] ? parseFloat(match[4]) : null;

        // Clean product name
        const originalName = productName;
        productName = productName.replace(/^"+|"+$/g, "").trim();
        console.log(
          "[parseSaleItems] Product name cleaned:",
          originalName,
          "->",
          productName
        );

        // Escape regex characters
        const escapedProductName = productName.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );
        console.log("[parseSaleItems] Searching for:", escapedProductName);

        // Find product
        const product = await Product.findOne({
          shopId,
          name: { $regex: new RegExp(`^${escapedProductName}$`, "i") },
          isActive: true,
        });

        console.log("[parseSaleItems] Found product:", product);

        if (!product) {
          // Try a partial match as fallback
          const productPartial = await Product.findOne({
            shopId,
            name: { $regex: productName, $options: "i" },
            isActive: true,
          });

          if (!productPartial) {
            return `Product "${productName}" not found. Type "list" to see products.`;
          }

          const finalPrice = price !== null ? price : productPartial.price;
          const itemTotal = quantity * finalPrice;

          items.push({
            productId: productPartial._id,
            product: productPartial,
            productName: productPartial.name,
            quantity,
            price: finalPrice,
            total: itemTotal,
          });
        } else {
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
        }
      }

      if (items.length === 0) {
        return `No valid items found. Please check format.`;
      }

      console.log("[parseSaleItems] Parsed items:", items);
      return items;
    } catch (error) {
      console.error("[parseSaleItems] Error:", error);
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

      // Create sale
      const sale = await Sale.create({
        shopId,
        type: "cash",
        items: items.map((item) => ({
          productId: item.product._id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
        total,
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
      const match = text.match(
        /^credit\s+sale\s+to\s+(?:"([^"]+)"|(\S+))\s+(.+)$/i
      );

      if (!match) {
        return `*Invalid Format*\n\nUse: credit sale to [customer] [items]\n\n*Examples:*\n• credit sale to John 2 bread 1 milk\n• credit sale to "Jane Doe" 3 eggs\n• credit sale to 0771234567 2 bread\n• credit sale to "John Smith" 1 "carex condoms" 2.50`;
      }

      const customerIdentifier = match[1] || match[2];
      const itemsText = match[3];

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
        })),
        total: totalAmount,
        amountPaid: 0,
        balanceDue: totalAmount,
        status: "completed",
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
      const match = text.match(
        /^laybye\s+(?:for\s+)?(?:"([^"]+)"|(\S+))\s+(.+?)(?:\s+deposit\s+(\d+(?:\.\d+)?))?$/i
      );

      if (!match) {
        return `*Invalid Format*\n\nUse: laybye [customer] [items] deposit [amount]\n\n*Examples:*\n• laybye John 2 bread 1 milk deposit 50\n• laybye "Jane Doe" 1 "blue butterfly heels" deposit 25\n• laybye 0771234567 3 eggs 2 milk\n• laybye for "John Smith" 2 "carex condoms" 1 bread deposit 30`;
      }

      const customerIdentifier = match[1] || match[2];
      const itemsText = match[3];
      const depositAmount = match[4] ? parseFloat(match[4]) : 0;

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
        reservedStock: true,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
      const match = text.match(
        /^laybye\s+pay\s+(?:"([^"]+)"|(\S+))\s+(\d+(?:\.\d+)?)$/i
      );

      if (!match) {
        return `*Invalid Format*\n\nUse: laybye pay [customer] [amount]\n\n*Examples:*\n• laybye pay John 25\n• laybye pay "Jane Doe" 50.50\n• laybye pay 0771234567 30`;
      }

      const customerIdentifier = match[1] || match[2];
      const amount = parseFloat(match[3]);

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
   * Generate cash sale receipt (simple version)
   */
  generateCashSaleReceipt(sale, items) {
    let receipt = `CASH SALE RECEIPT\n\n`;
    receipt += `Invoice: CASH-${sale._id.toString().slice(-8)}\n`;
    receipt += `Date: ${new Date().toLocaleString()}\n\n`;

    receipt += `ITEMS\n`;
    items.forEach((item, index) => {
      receipt += `${index + 1}. ${item.productName} x ${item.quantity}\n`;
      receipt += `   Price: $${item.price.toFixed(2)} each\n`;
      receipt += `   Subtotal: $${item.total.toFixed(2)}\n\n`;
    });

    receipt += `SUMMARY\n`;
    receipt += `Total: $${sale.total.toFixed(2)}\n`;
    receipt += `Payment Method: Cash (paid in full)\n`;

    return receipt;
  }

  /**
   * Generate credit sale receipt (simple version)
   */
  generateCreditSaleReceipt(sale, customer, items) {
    let receipt = `CREDIT SALE RECEIPT\n\n`;
    receipt += `Invoice: CR-${sale._id.toString().slice(-8)}\n`;
    receipt += `Customer: ${customer.name}\n`;
    receipt += `Date: ${new Date().toLocaleString()}\n`;
    receipt += `Status: Product Delivered\n\n`;

    receipt += `ITEMS\n`;
    items.forEach((item, index) => {
      receipt += `${index + 1}. ${item.productName} x ${item.quantity}\n`;
      receipt += `   Price: $${item.price.toFixed(2)} each\n`;
      receipt += `   Subtotal: $${item.total.toFixed(2)}\n\n`;
    });

    receipt += `FINANCIAL SUMMARY\n`;
    receipt += `Total Amount: $${sale.total.toFixed(2)}\n`;
    receipt += `Amount Paid: $${sale.amountPaid.toFixed(2)}\n`;
    receipt += `Balance Due: $${sale.balanceDue.toFixed(2)}\n\n`;

    receipt += `NOTES\n`;
    receipt += `Stock has been deducted.\n`;
    receipt += `Customer owes the balance shown above.\n`;
    receipt += `Make payments using: payment ${customer.name} [amount]\n`;

    return receipt;
  }

  /**
   * Generate laybye agreement receipt
   */
  generateLayByeReceipt(laybye, customer, items) {
    let receipt = `LAYBYE AGREEMENT\n\n`;
    receipt += `Agreement Number: LB-${laybye._id.toString().slice(-8)}\n`;
    receipt += `Customer: ${customer.name}\n`;
    receipt += `Start Date: ${laybye.startDate.toLocaleDateString()}\n`;
    receipt += `Due Date: ${laybye.dueDate.toLocaleDateString()}\n\n`;

    receipt += `ITEMS RESERVED\n`;
    items.forEach((item, index) => {
      receipt += `${index + 1}. ${item.productName} x ${item.quantity}\n`;
      receipt += `   Price: $${item.price.toFixed(2)} each\n`;
      receipt += `   Subtotal: $${item.total.toFixed(2)}\n\n`;
    });

    receipt += `PAYMENT DETAILS\n`;
    receipt += `Total Value: $${laybye.totalAmount.toFixed(2)}\n`;
    receipt += `Deposit Paid: $${laybye.amountPaid.toFixed(2)}\n`;
    receipt += `Balance Due: $${laybye.balanceDue.toFixed(2)}\n`;
    receipt += `Number of Installments: ${laybye.installments.length}\n\n`;

    receipt += `TERMS\n`;
    receipt += `Items are reserved (stock not removed yet).\n`;
    receipt += `Items will be collected after full payment.\n`;
    receipt += `Make payments using: laybye pay ${customer.name} [amount]\n`;
    receipt += `Complete when fully paid: laybye complete ${customer.name}\n`;

    return receipt;
  }

  /**
   * Generate laybye payment receipt
   */
  generateLayByePaymentReceipt(laybye, amount) {
    let receipt = `LAYBYE PAYMENT RECEIPT\n\n`;
    receipt += `Agreement Number: LB-${laybye._id.toString().slice(-8)}\n`;
    receipt += `Customer: ${laybye.customerName}\n`;
    receipt += `Date: ${new Date().toLocaleString()}\n\n`;

    receipt += `PAYMENT DETAILS\n`;
    receipt += `Amount Paid: $${amount.toFixed(2)}\n`;
    receipt += `Previous Balance: $${(laybye.balanceDue + amount).notfixed(
      2
    )}\n`;
    receipt += `New Balance: $${laybye.balanceDue.toFixed(2)}\n`;
    receipt += `Total Paid So Far: $${laybye.amountPaid.toFixed(2)}\n\n`;

    receipt += `NEXT STEPS\n`;
    if (laybye.balanceDue > 0) {
      receipt += `Remaining Balance: $${laybye.balanceDue.toFixed(2)}\n`;
      receipt += `Continue paying using: laybye pay ${laybye.customerName} [amount]\n`;
    } else {
      receipt += `Laybye is fully paid.\n`;
      receipt += `Collect items using: laybye complete ${laybye.customerName}\n`;
    }

    return receipt;
  }

  /**
   * Generate laybye completion receipt
   */
  generateLayByeCompletionReceipt(laybye) {
    let receipt = `LAYBYE COMPLETION RECEIPT\n\n`;
    receipt += `Agreement Number: LB-${laybye._id.toString().slice(-8)}\n`;
    receipt += `Customer: ${laybye.customerName}\n`;
    receipt += `Completed On: ${new Date().toLocaleString()}\n\n`;

    receipt += `SUMMARY\n`;
    receipt += `Total Value: $${laybye.totalAmount.toFixed(2)}\n`;
    receipt += `Total Paid: $${laybye.amountPaid.toFixed(2)}\n`;
    receipt += `Installments Made: ${laybye.installments.length}\n\n`;

    receipt += `ITEMS RELEASED\n`;
    laybye.items.forEach((item, index) => {
      receipt += `${index + 1}. ${item.productName} x ${item.quantity}\n`;
    });

    receipt += `\nNOTES\n`;
    receipt += `Stock has now been removed from inventory.\n`;
    receipt += `Items are ready for collection.\n`;

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
            message: `*Insufficient Stock*\n${item.product.name}: Need ${item.quantity}, have ${item.product.stock}`,
          };
        }
      }

      // Optional: You could implement a reserved stock system here
      // For now, we just check availability
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: `Stock reservation failed: ${error.message}`,
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
          { customerName: new RegExp(`^${customerIdentifier}$`, "i") },
          { customerPhone: customerIdentifier },
        ],
        status: "active",
        balanceDue: 0,
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
      console.error("Laybye complete error:", error);
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
        receipt += `• ${item.quantity}x ${
          item.productName
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
        return `*Payment Exceeds Debt*\n\n${
          customer.name
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
        return `*No Credit History*\n\n${
          customer.name
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
        history += `... and ${
          customer.creditTransactions.length - 10
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
      console.log("[processNewOrder] Input:", orderText);

      // Regex to match: customer (quoted or unquoted) items type? notes?
      // Example: "John Doe" 2 bread 1 milk delivery "Leave at door"
      const match = orderText.match(
        /^(?:"([^"]+)"|(\S+))\s+(.+?)(?:\s+(pickup|delivery|reservation)\s+(?:"([^"]+)"|(.+))?)?$/i
      );

      if (!match) {
        return 'Please specify customer and items.\n\nUse: order [customer] [items] [type?] [notes?]\n\nExamples:\n• order John 2 bread 1 milk\n• order "Jane Doe" 2 "mince meat" 1 milk delivery\n• order 1234567890 3 eggs 1 sugar pickup "Need by 5pm"\n• order John 2 "carex condoms" 1 bread pickup';
      }

      const customerIdentifier = match[1] || match[2]; // Quoted or unquoted customer name
      let itemsText = match[3].trim();
      const orderType = match[4] ? match[4].toLowerCase() : "pickup";
      let notes = match[5] || match[6] || ""; // Quoted or unquoted notes

      console.log("[processNewOrder] Parsed:", {
        customerIdentifier,
        itemsText,
        orderType,
        notes,
      });

      if (!itemsText) {
        return 'Please specify items for the order.\n\nUse: order [customer] [items]\nExamples:\n• order John 2 bread 1 milk\n• order "John Doe" 2 "mince meat" 1 milk';
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
      return `Failed to place order: ${error.message}`;
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

  async handleExpenseBreakdown(shopId, text) {
    try {
      console.log("[CommandService] Generating expense breakdown");

      // Determine period from command
      const lowerText = text.toLowerCase();
      let period = "daily";

      if (lowerText.includes("week")) {
        period = "weekly";
      } else if (lowerText.includes("month")) {
        period = "monthly";
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();

      if (period === "daily") {
        startDate.setHours(0, 0, 0, 0);
      } else if (period === "weekly") {
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
      }

      const result = await FinancialService.categorizeExpenses(
        shopId,
        startDate,
        endDate
      );

      if (!result.success) {
        return `*Error*\n\n${result.message}`;
      }

      if (result.categories.length === 0) {
        const periodName =
          period === "daily"
            ? "today"
            : period === "weekly"
            ? "this week"
            : "this month";
        return `*No Expenses*\n\nNo expenses recorded ${periodName}.`;
      }

      let report = `*EXPENSE BREAKDOWN - ${period.toUpperCase()}*\n\n`;
      report += `Period: ${startDate.toDateString()} - ${endDate.toDateString()}\n`;
      report += `Total Expenses: $${result.total.toFixed(2)}\n`;
      report += `Categories: ${result.categories.length}\n\n`;

      result.categories.forEach((cat, index) => {
        const categoryName =
          cat.category.charAt(0).toUpperCase() + cat.category.slice(1);
        report += `${index + 1}. *${categoryName}*\n`;
        report += `   Total: $${cat.total.toFixed(2)} (${cat.percentage.toFixed(
          1
        )}%)\n`;
        report += `   Items: ${cat.count}\n`;

        // Show top 3 items in category
        cat.items.slice(0, 3).forEach((item) => {
          report += `   • ${
            item.description || "No description"
          }: $${item.amount.toFixed(2)}\n`;
        });

        if (cat.items.length > 3) {
          report += `   ... and ${cat.items.length - 3} more items\n`;
        }
        report += "\n";
      });

      return report;
    } catch (error) {
      console.error("[CommandService] Expense breakdown error:", error);
      return `Failed to generate expense breakdown: ${error.message}`;
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
• register - Step-by-step setup
• register "Business Name" 1234 - Quick setup
• login - Login with PIN
• login 1234 - Quick login
• logout - End session
• account - View account info
• status - Check registration/login status

==================
PRODUCT MANAGEMENT
==================
Add/Edit:
• add bread 2.50 stock 100 - Add product
• price bread 2.75 - Update price
• stock +bread 80 - Update stock
• stock +"sports shoes" 30
• stock -bread 20 - Reduce stock
• stock -"blue butterfly heels" 30
• edit bread price 2.60 - Edit details
• edit "brown bread" name "Whole Wheat Bread"
• edit "blue butterfly heels" trackstock false
• edit "blue butterfly heels" threshold 5
• edit "mince meat" price 1.50
• delete bread - Remove product

View:
• list - All products
• low stock - Low inventory

====================
SALES & TRANSACTIONS
====================
Record Sales:
• sell 2 bread 1 milk - Standard sale
• sell 2 "velvet cake" 1.50 1 "blue butterfly heels" 25.00
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
• sell to "Jane Doe" 3 eggs
• sell to 0771234567 2 bread 2.50
• sell to "John Smith" 1 "Brown Bread" 2.50

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
• order John 2 "mince meat" 1 milk
• order "Jane Doe" 2 "mince meat" 1 "blue butterfly heels" delivery

Manage Orders:
• order - All orders
• order pending - Pending
• order ready - Ready
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
