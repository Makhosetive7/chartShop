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

    // Get shop for authenticated commands
    const shop = await Shop.findOne({ telegramId, isActive: true });
    if (!shop) {
      return 'Please register first.\n\nUse: register [business name] [pin]\nExample: register "My Shop" 1234';
    }

    // Sell command
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

    // Daily total
    if (command === "daily" || command === "total") {
      return await this.handleDailyTotal(shop._id);
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
      });

      return `*Registration successful!*\n\nBusiness: ${businessName}\n\nYou can now:\n• add bread 2.50 - Add products\n• list - View products\n• sell 2 bread - Record sales\n• daily - View report\n\nType "help" for more commands.`;
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

      return `*Welcome back, ${shop.businessName}!*\n\nType "help" to see available commands.`;
    } catch (error) {
      console.error("Login error:", error);
      return "Login failed. Please try again.";
    }
  }

  async handleSell(shopId, text) {
    try {
      const parts = text.replace("sell ", "").trim().split(" ");

      const items = [];
      let total = 0;

      for (let i = 0; i < parts.length; i += 2) {
        const quantity = parseInt(parts[i]);
        const productName = parts[i + 1];

        if (isNaN(quantity) || !productName) {
          return "Invalid format.\n\nUse: sell [qty] [product] [qty] [product]...\nExample: sell 2 bread 1 milk";
        }

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
          productId: product._id,
          productName: product.name,
          quantity,
          price: product.price,
          total: itemTotal,
        });

        total += itemTotal;
      }

      await Sale.create({
        shopId,
        items,
        total,
      });

      let receipt = "*SALE RECORDED*\n\n";
      items.forEach((item) => {
        receipt += `${item.quantity}x ${
          item.productName
        } @ $${item.price.toFixed(2)}\n`;
      });
      receipt += `\n*Total: $${total.toFixed(2)}*`;

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
        return "Invalid format.\n\nUse: add [product] [price]\nExample: add bread 2.50\n\nWith stock: add bread 2.50 stock 50";
      }

      const name = parts[0];
      const price = parseFloat(parts[1]);

      if (isNaN(price)) {
        return "Invalid price. Please use a number.\nExample: 2.50";
      }

      let stock = 0;
      const stockIndex = parts.indexOf("stock");
      if (stockIndex !== -1 && parts[stockIndex + 1]) {
        stock = parseInt(parts[stockIndex + 1]);
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
      });

      return `*Product added!*\n\nName: ${name}\nPrice: $${price.toFixed(
        2
      )}\nStock: ${stock}`;
    } catch (error) {
      console.error("Add product error:", error);
      return "Failed to add product. Please try again.";
    }
  }

  async handleListProducts(shopId) {
    try {
      const products = await Product.find({ shopId, isActive: true });

      if (products.length === 0) {
        return "*No products yet.*\n\nAdd your first product:\nadd [product] [price]\n\nExample: add bread 2.50";
      }

      let list = "*PRODUCT LIST*\n\n";
      products.forEach((product) => {
        list += `• ${product.name} - $${product.price.toFixed(2)}`;
        if (product.stock > 0) {
          list += ` (${product.stock} in stock)`;
        }
        list += "\n";
      });

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
      });

      if (sales.length === 0) {
        return "*No sales today yet.*";
      }

      const total = sales.reduce((sum, sale) => sum + sale.total, 0);
      const itemCount = sales.reduce(
        (sum, sale) =>
          sum + sale.items.reduce((s, item) => s + item.quantity, 0),
        0
      );

      let report = "*DAILY REPORT*\n\n";
      report += `Total Sales: $${total.toFixed(2)}\n`;
      report += `Transactions: ${sales.length}\n`;
      report += `Items Sold: ${itemCount}\n`;
      report += `Average: $${(total / sales.length).toFixed(2)}`;

      return report;
    } catch (error) {
      console.error("Daily total error:", error);
      return "Failed to get report. Please try again.";
    }
  }

  getHelpText() {
    return `*CHATSHOP COMMANDS*

*Setup:*
• register "Shop Name" 1234
• login 1234

*Sales:*
• sell [qty] [item] [qty] [item]...
  _Example:_ sell 2 bread 1 milk

*Products:*
• add [product] [price]
  _Example:_ add bread 2.50
• add [product] [price] stock [qty]
  _Example:_ add bread 2.50 stock 50
• list - Show all products

*Reports:*
• daily - Today's summary

*Help:*
• help - Show this message

Type any command to get started! 👆`;
  }
}

export default new CommandService();
