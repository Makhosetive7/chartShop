import Sale from "../../../models/Sale.js";
import CustomerService from "../../CustomerService.js";
import InventoryService from "../../InventoryService.js";
import { parseSaleItems } from "../parseSaleItems.js";
import { generateCustomerReceipt } from "../helpers.js";
import { escapeMarkdown } from "../../../utils/escapeMarkdown.js";

export async function handleCustomerCommands(shopId, text) {
  try {
    console.log("[CommandService] Customer command received:", text);
    console.log("[CommandService] Shop ID:", shopId);

    const lowerText = text.toLowerCase().trim();

    // customer add [name] [phone] [email?]
    if (lowerText.includes("add")) {
      return await handleAddCustomer(shopId, text);
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

export async function handleAddCustomer(shopId, text) {
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

export async function handleSellToCustomer(shopId, text) {
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
    const result = await processSaleWithCustomer(
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

export async function handleCustomerPayment(shopId, text) {
  try {
    console.log("[CommandService] Customer payment:", text);

    const match = text.match(
      /^payment\s+(?:"([^"]+)"|(\S+))\s+(\d+(?:\.\d+)?)$/i
    );

    if (!match) {
      return `*Invalid Format*\n\nUse: payment [customer] [amount]\n\n*Examples:*\n• payment John 50\n• payment "Jane Doe" 25.50\n• payment 0771234567 100`;
    }

    const customerIdentifier = match[1] || match[2];
    const amount = parseFloat(match[3]);

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

export async function handleCreditHistory(shopId, text) {
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


export async function processSaleWithCustomer(shopId, itemsText, customer) {
  try {
    console.log("[CommandService] Processing sale with customer:", {
      customerId: customer._id,
      customerName: customer.name,
      items: itemsText,
    });

    const items = await parseSaleItems(shopId, itemsText);
    if (typeof items === "string") return items;

    const total = items.reduce((sum, item) => sum + item.total, 0);

    const stockResult = await InventoryService.deductSaleItems(items);
    if (!stockResult.success) {
      return stockResult.message;
    }

    console.log(
      "[CommandService] Parsed items:",
      items.length,
      "Total:",
      total
    );

    let sale;
    try {
      sale = await Sale.create({
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
    } catch (createError) {
      await InventoryService.restoreSaleItems(items);
      throw createError;
    }

    console.log("[CommandService] Sale created:", sale._id);

    const linked = await CustomerService.linkSaleToCustomer(
      sale,
      customer,
      total
    );
    console.log("[CommandService] Customer linked:", linked);

    return generateCustomerReceipt(sale, customer, items);
  } catch (error) {
    console.error(
      "[CommandService] Process sale with customer error:",
      error
    );
    return `Failed to process sale: ${error.message}`;
  }
}


/**
 * Ledger-style credit (no stock deduct). Item parsing uses shared parseSaleItems.
 * Prefer `credit sale to` for full credit sales with stock + Sale records.
 */
export async function handleCustomerCredit(shopId, text) {
  try {
    const match = text.match(
      /^credit\s+(?:"([^"]+)"|(\S+))\s+(.+)$/i
    );

    if (!match) {
      return `*Invalid Format*\n\nUse: credit [customer] [qty] [product]...\n\n*Examples:*\n• credit John 10 bread\n• credit "Jane Doe" 5 bread 3 milk\n• credit 0771234567 2 sugar\n\n_For stock + invoice credit sales use:_ credit sale to [customer] [items]`;
    }

    const customerIdentifier = match[1] || match[2];
    const itemsText = match[3].trim();

    const customer = await CustomerService.findCustomer(
      shopId,
      customerIdentifier
    );

    if (!customer) {
      return `*Customer Not Found*\n\nNo customer found matching "${escapeMarkdown(customerIdentifier)}".\n\n*Add them first:*\ncustomer add ${escapeMarkdown(customerIdentifier)} [phone]`;
    }

    const items = await parseSaleItems(shopId, itemsText);
    if (typeof items === "string") return items;

    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
    const ledgerItems = items.map((item) => ({
      productName: item.product.name,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
    }));

    const itemsDescription = ledgerItems
      .map((item) => `${item.quantity}x ${item.productName}`)
      .join(", ");

    await customer.addCreditTransaction(
      totalAmount,
      ledgerItems,
      `Credit sale: ${itemsDescription}`
    );

    let receipt = `*CREDIT TRANSACTION RECORDED*\n\n`;
    receipt += `Customer: ${escapeMarkdown(customer.name)}\n`;
    receipt += `Date: ${new Date().toLocaleString()}\n\n`;
    receipt += `*ITEMS ON CREDIT*\n`;
    ledgerItems.forEach((item) => {
      receipt += `• ${item.quantity}x ${escapeMarkdown(item.productName)} @ $${item.price.toFixed(2)} = $${item.total.toFixed(2)}\n`;
    });
    receipt += `\n*Total Credit: $${totalAmount.toFixed(2)}*\n\n`;
    receipt += `*ACCOUNT BALANCE*\n`;
    receipt += `Previous: $${(customer.currentBalance - totalAmount).toFixed(2)}\n`;
    receipt += `Added: $${totalAmount.toFixed(2)}\n`;
    receipt += `Current Owes: $${customer.currentBalance.toFixed(2)}\n\n`;

    if (customer.creditLimit > 0) {
      const remaining = customer.creditLimit - customer.currentBalance;
      receipt += `Credit Limit: $${customer.creditLimit.toFixed(2)}\n`;
      receipt += `Remaining: $${remaining.toFixed(2)}\n\n`;
    }

    receipt += `Use "customer ${escapeMarkdown(customer.name)}" to view full credit history`;
    return receipt;
  } catch (error) {
    console.error("[customers] Customer credit error:", error);
    return `Failed to process credit: ${error.message}`;
  }
}

