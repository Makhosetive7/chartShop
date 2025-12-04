import Customer from "../models/Customer.js";
import Sale from "../models/Sale.js";

class CustomerService {
  // Add a new customer with comprehensive validation
  async addCustomer(shopId, name, phone, email = "") {
    try {
      console.log('[CustomerService] Adding customer:', { shopId, name, phone, email });

      // Validate inputs
      if (!name || name.trim().length === 0) {
        console.log('[CustomerService] Invalid name');
        return {
          success: false,
          message: "Please provide a valid customer name.",
        };
      }

      if (!phone || phone.trim().length === 0) {
        console.log('[CustomerService] Invalid phone');
        return {
          success: false,
          message: "Please provide a valid phone number.",
        };
      }

      // Normalize phone
      const normalizedPhone = this.normalizePhone(phone);
      console.log('[CustomerService] Normalized phone:', normalizedPhone);

      // Check if customer already exists
      const existingCustomer = await Customer.findOne({
        shopId,
        phone: normalizedPhone,
      });

      if (existingCustomer) {
        console.log('[CustomerService] Customer already exists:', existingCustomer._id);
        return {
          success: false,
          message: `*Customer Already Exists*\n\nName: ${
            existingCustomer.name
          }\nPhone: ${existingCustomer.phone}\nTotal Spent: $${existingCustomer.totalSpent.toFixed(
            2
          )}\n\nUse "customer ${existingCustomer.name}" to view details.`,
        };
      }

      // Create new customer
      const customerData = {
        shopId,
        name: name.trim(),
        phone: normalizedPhone,
        email: email ? email.trim() : "",
        firstPurchaseDate: new Date(),
        totalSpent: 0,
        totalVisits: 0,
        loyaltyPoints: 0,
        currentBalance: 0,
        isActive: true,
      };

      console.log('[CustomerService] Creating customer with data:', customerData);
      const customer = await Customer.create(customerData);
      console.log('[CustomerService] Customer created successfully:', customer._id);

      return {
        success: true,
        message: this.generateCustomerAddedMessage(customer),
        customer,
      };
    } catch (error) {
      console.error("[CustomerService] Add customer error:", error);
      console.error("[CustomerService] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      // Handle duplicate key error
      if (error.code === 11000) {
        return {
          success: false,
          message: "A customer with this phone number already exists for your shop.",
        };
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return {
          success: false,
          message: `Validation error: ${messages.join(', ')}`,
        };
      }

      return {
        success: false,
        message: `Failed to add customer: ${error.message}`,
      };
    }
  }

  /**
   * Find customer by phone or name
   */
  async findCustomer(shopId, identifier) {
    try {
      console.log('[CustomerService] Finding customer:', { shopId, identifier });

      if (!identifier || identifier.trim().length === 0) {
        console.log('[CustomerService] Empty identifier');
        return null;
      }

      // Try to find by normalized phone first
      const normalizedPhone = this.normalizePhone(identifier);
      console.log('[CustomerService] Searching by phone:', normalizedPhone);

      let customer = await Customer.findOne({
        shopId,
        phone: normalizedPhone,
        isActive: true,
      });

      if (customer) {
        console.log('[CustomerService] Found customer by phone:', customer._id);
        return customer;
      }

      // If not found by phone, search by name (case-insensitive)
      console.log('[CustomerService] Searching by name:', identifier);
      customer = await Customer.findOne({
        shopId,
        name: new RegExp(`^${identifier}$`, "i"),
        isActive: true,
      });

      if (customer) {
        console.log('[CustomerService] Found customer by name:', customer._id);
      } else {
        console.log('[CustomerService] Customer not found');
      }

      return customer;
    } catch (error) {
      console.error("[CustomerService] Find customer error:", error);
      return null;
    }
  }

  /**
   * Link sale to customer and update statistics
   */
  async linkSaleToCustomer(sale, customer, saleTotal) {
    try {
      console.log('[CustomerService] Linking sale to customer:', {
        saleId: sale._id,
        customerId: customer._id,
        saleTotal,
      });

      // Update customer statistics
      customer.totalSpent += saleTotal;
      customer.totalVisits += 1;
      customer.lastPurchaseDate = new Date();

      // Add loyalty points (1 point per $1 spent)
      customer.loyaltyPoints += Math.floor(saleTotal);

      await customer.save();
      console.log('[CustomerService] Customer updated:', {
        totalSpent: customer.totalSpent,
        totalVisits: customer.totalVisits,
        loyaltyPoints: customer.loyaltyPoints,
      });

      // Update sale with customer reference
      sale.customerId = customer._id;
      sale.customerName = customer.name;
      sale.customerPhone = customer.phone;
      await sale.save();
      console.log('[CustomerService] Sale updated with customer info');

      return true;
    } catch (error) {
      console.error("[CustomerService] Link sale to customer error:", error);
      return false;
    }
  }

  /**
   * Get customer history with all purchases
   */
  async getCustomerHistory(shopId, customerIdentifier) {
    try {
      console.log('[CustomerService] Getting customer history:', customerIdentifier);

      const customer = await this.findCustomer(shopId, customerIdentifier);

      if (!customer) {
        console.log('[CustomerService] Customer not found for history');
        return {
          success: false,
          message: `*Customer Not Found*\n\nNo customer found matching "${customerIdentifier}".\n\nUse "customers" to see all customers\nOr "customer add [name] [phone]" to add new.`,
        };
      }

      // Get customer's sales history
      const sales = await Sale.find({
        shopId,
        customerId: customer._id,
        isCancelled: false,
      })
        .sort({ date: -1 })
        .limit(20);

      console.log('[CustomerService] Found sales:', sales.length);

      return {
        success: true,
        message: this.generateCustomerHistoryMessage(customer, sales),
        customer,
        sales,
      };
    } catch (error) {
      console.error("[CustomerService] Get customer history error:", error);
      return {
        success: false,
        message: "Failed to get customer history. Please try again.",
      };
    }
  }

  /**
   * List all customers with optional filtering
   */
  async listCustomers(shopId, filter = "all") {
    try {
      console.log('[CustomerService] Listing customers with filter:', filter);

      let query = { shopId, isActive: true };

      // Apply filters
      if (filter === "active") {
        query.lastPurchaseDate = {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        };
      }

      const customers = await Customer.find(query).sort({ totalSpent: -1 });
      console.log('[CustomerService] Found customers:', customers.length);

      if (customers.length === 0) {
        return {
          success: false,
          message:
            '*NO CUSTOMERS YET*\n\nAdd your first customer:\ncustomer add [name] [phone]\n\nExample:\ncustomer add John 0771234567\ncustomer add "Jane Doe" +263771234567',
        };
      }

      return {
        success: true,
        message: this.generateCustomersListMessage(customers, filter),
        customers,
      };
    } catch (error) {
      console.error("[CustomerService] List customers error:", error);
      return {
        success: false,
        message: "Failed to fetch customers. Please try again.",
      };
    }
  }

  /**
   * Update customer balance (credit/payment)
   */
  async updateCustomerBalance(
    shopId,
    customerIdentifier,
    amount,
    type = "credit"
  ) {
    try {
      console.log('[CustomerService] Updating customer balance:', {
        customerIdentifier,
        amount,
        type,
      });

      const customer = await this.findCustomer(shopId, customerIdentifier);

      if (!customer) {
        return {
          success: false,
          message: `*Customer Not Found*\n\nNo customer found matching "${customerIdentifier}".`,
        };
      }

      if (type === "credit") {
        customer.currentBalance += amount;
      } else if (type === "payment") {
        customer.currentBalance -= amount;
        if (customer.currentBalance < 0) customer.currentBalance = 0;
      }

      await customer.save();
      console.log('[CustomerService] Balance updated:', customer.currentBalance);

      return {
        success: true,
        message: `*${
          type === "credit" ? "CREDIT" : "PAYMENT"
        } RECORDED*\n\nCustomer: ${customer.name}\nAmount: $${amount.toFixed(
          2
        )}\nNew Balance: $${customer.currentBalance.toFixed(2)}`,
        customer,
      };
    } catch (error) {
      console.error("[CustomerService] Update customer balance error:", error);
      return {
        success: false,
        message: "Failed to update customer balance. Please try again.",
      };
    }
  }

  /**
   * Normalize phone number (remove non-digits)
   */
  normalizePhone(phone) {
    if (!phone) return "";
    // Remove all non-digit characters
    return phone.replace(/\D/g, "");
  }

  /**
   * Generate customer added success message
   */
  generateCustomerAddedMessage(customer) {
    return `*CUSTOMER ADDED SUCCESSFULLY* \n\nName: ${customer.name}\nPhone: ${
      customer.phone
    }\n${
      customer.email ? `Email: ${customer.email}\n` : ""
    }\n*Next Steps:*\n• View: customer ${
      customer.name
    }\n• Sell: sell to ${customer.name} 2 bread 1 milk\n• Sell by phone: sell to ${
      customer.phone
    } 1 sugar`;
  }

  /**
   * Generate customer history message
   */
generateCustomerHistoryMessage(customer, sales) {
  let message = `*CUSTOMER PROFILE* 👤\n\n`;
  message += `Name: ${customer.name}\n`;
  message += `Phone: ${customer.phone}\n`;
  
  if (customer.email) {
    message += `Email: ${customer.email}\n`;
  }

  message += `\n*STATISTICS*\n`;
  message += `Total Spent: $${customer.totalSpent.toFixed(2)}\n`;
  message += `Total Visits: ${customer.totalVisits}\n`;
  message += `Loyalty Points: ${customer.loyaltyPoints}\n`;

  // Enhanced balance display
  if (customer.currentBalance !== 0) {
    message += `\n*ACCOUNT BALANCE* \n`;
    if (customer.currentBalance > 0) {
      message += `Currently Owes: $${customer.currentBalance.toFixed(2)}\n`;
      if (customer.creditLimit > 0) {
        const remaining = customer.creditLimit - customer.currentBalance;
        message += `Credit Limit: $${customer.creditLimit.toFixed(2)}\n`;
        message += `Available Credit: $${remaining.toFixed(2)}\n`;
      }
    } else {
      message += `Credit Available: $${Math.abs(customer.currentBalance).toFixed(2)}\n`;
    }
  }

  message += `\nFirst Purchase: ${
    customer.firstPurchaseDate
      ? customer.firstPurchaseDate.toLocaleDateString()
      : "Never"
  }\n`;
  
  message += `Last Purchase: ${
    customer.lastPurchaseDate
      ? customer.lastPurchaseDate.toLocaleDateString()
      : "Never"
  }\n`;

  // Show recent credit transactions
  if (customer.creditTransactions && customer.creditTransactions.length > 0) {
    const recentCredits = customer.creditTransactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    message += `\n*RECENT CREDIT ACTIVITY* (Last ${recentCredits.length})\n\n`;

    recentCredits.forEach((trans, index) => {
      const icon = trans.type === 'credit' ? 'Card' : 'Cash';
      const sign = trans.type === 'credit' ? '+' : '-';
      const timeAgo = this.getTimeAgo(trans.date);
      
      message += `${index + 1}. ${icon} ${trans.type.toUpperCase()}\n`;
      message += `   ${sign}$${trans.amount.toFixed(2)} | ${timeAgo}\n`;
      
      if (trans.items && trans.items.length > 0) {
        const itemsSummary = trans.items
          .slice(0, 2)
          .map(item => `${item.quantity}x ${item.productName}`)
          .join(', ');
        message += `   Items: ${itemsSummary}`;
        if (trans.items.length > 2) {
          message += ` +${trans.items.length - 2} more`;
        }
        message += '\n';
      }
      message += '\n';
    });

    if (customer.creditTransactions.length > 5) {
      message += `Use "credit history ${customer.name}" for full history\n`;
    }
  }

  // Show regular purchase history
  if (sales.length > 0) {
    message += `\n*REGULAR PURCHASES* (Last ${Math.min(sales.length, 5)})\n\n`;

    sales.slice(0, 5).forEach((sale, index) => {
      const topItems = sale.items
        .slice(0, 2)
        .map((item) => `${item.quantity}x ${item.productName}`)
        .join(", ");

      const timeAgo = this.getTimeAgo(sale.date);
      
      message += `${index + 1}. ${sale.date.toLocaleDateString()}\n`;
      message += `   $${sale.total.toFixed(2)} | ${timeAgo}\n`;
      message += `   ${topItems}${
        sale.items.length > 2 ? ` +${sale.items.length - 2} more` : ""
      }\n\n`;
    });

    if (sales.length > 5) {
      message += `... and ${sales.length - 5} more purchases\n`;
    }
  } else {
    message += `\n*No regular purchases yet.*\n`;
  }

  message += `\nCommands:\n`;
  message += `• credit ${customer.name} [qty] [product] - Add credit\n`;
  message += `• payment ${customer.name} [amount] - Record payment\n`;
  message += `• sell to ${customer.name} [items] - Regular sale`;

  return message;
}


  /**
   * Generate customers list message
   */
  generateCustomersListMessage(customers, filter) {
    let message = `*CUSTOMERS LIST* 👥`;

    if (filter === "active") {
      message += ` - ACTIVE (Last 30 Days)`;
    } else if (filter === "top") {
      message += ` - TOP SPENDERS`;
    }

    message += `\n\nTotal: ${customers.length} customers\n\n`;

    customers.slice(0, 20).forEach((customer, index) => {
      const medals = ["Gold", "Silver", "Bronze"];
      const rank = index < 3 ? medals[index] : `${index + 1}.`;
      
      const lastPurchase = customer.lastPurchaseDate
        ? this.getTimeAgo(customer.lastPurchaseDate)
        : "Never";

      message += `${rank} *${customer.name}*\n`;
      message += `   ${customer.phone}\n`;
      message += `   ${customer.totalSpent.toFixed(2)} spent\n`;
      message += `   ${customer.totalVisits} visits\n`;
      message += `   ${lastPurchase}\n`;

      if (customer.currentBalance > 0) {
        message += `  Owes: $${customer.currentBalance.toFixed(2)}\n`;
      }

      message += `\n`;
    });

    if (customers.length > 20) {
      message += `... and ${customers.length - 20} more\n\n`;
    }

    message += `*Commands:*\n`;
    message += `• customer [name] - View details\n`;
    message += `• customers active - Active only\n`;
    message += `• sell to [name] [items] - Record sale`;

    return message;
  }

  /**
   * Helper: Get time ago string
   */
  getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
    
    return date.toLocaleDateString();
  }

  /**
   * Debug: List all customers for a shop
   */
  async debugListCustomers(shopId) {
    try {
      const customers = await Customer.find({ shopId });
      console.log('[DEBUG] All customers for shop:', shopId);
      console.log('[DEBUG] Count:', customers.length);
      customers.forEach(c => {
        console.log('[DEBUG] Customer:', {
          id: c._id,
          name: c.name,
          phone: c.phone,
          totalSpent: c.totalSpent,
          isActive: c.isActive,
        });
      });
      return customers;
    } catch (error) {
      console.error('[DEBUG] Error:', error);
      return [];
    }
  }
}

export default new CustomerService();