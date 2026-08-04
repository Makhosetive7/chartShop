import Sale from "../../../models/Sale.js";
import LayBye from "../../../models/LayBye.js";
import Customer from "../../../models/Customer.js";
import Product from "../../../models/Product.js";
import CustomerService from "../../CustomerService.js";
import CancellationService from "../../CancellationService.js";
import InventoryService from "../../InventoryService.js";
import { parseSaleItems } from "../parseSaleItems.js";
import { buildSaleLineItems } from "../salePricing.js";
import {
  generateCashSaleReceipt,
  generateCreditSaleReceipt,
  generateLayByeReceipt,
  generateLayByePaymentReceipt,
  generateLayByeCompletionReceipt,
} from "../helpers.js";

export async function handleCancelSale(shopId, text) {
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

export async function handleCashSale(shopId, text) {
  try {
    const itemsText = text.replace("sell ", "").trim();
    const items = await parseSaleItems(shopId, itemsText);

    if (typeof items === "string") return items; // Error message

    const stockResult = await InventoryService.deductSaleItems(items);
    if (!stockResult.success) {
      return stockResult.message;
    }

    const { lineItems, total, costTotal, profit } = buildSaleLineItems(items);

    let sale;
    try {
      sale = await Sale.create({
        shopId,
        type: "cash",
        items: lineItems,
        total,
        costTotal,
        profit,
        status: "completed",
        amountPaid: total,
        balanceDue: 0,
      });
    } catch (createError) {
      await InventoryService.restoreSaleItems(items);
      throw createError;
    }

    return generateCashSaleReceipt(sale, items);
  } catch (error) {
    console.error("Cash sale error:", error);
    return `Failed to process cash sale: ${error.message}`;
  }
}

export async function handleCreditSale(shopId, text) {
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
    const items = await parseSaleItems(shopId, itemsText);
    if (typeof items === "string") return items; // Error message

    const { lineItems, total: totalAmount, costTotal, profit } =
      buildSaleLineItems(items);

    const stockResult = await InventoryService.deductSaleItems(items);
    if (!stockResult.success) {
      return stockResult.message;
    }

    let sale;
    try {
      // Create credit sale
      sale = await Sale.create({
        shopId,
        type: "credit",
        customerId: customer._id,
        customerName: customer.name,
        customerPhone: customer.phone,
        items: lineItems,
        total: totalAmount,
        costTotal,
        profit,
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
    } catch (createError) {
      await InventoryService.restoreSaleItems(items);
      throw createError;
    }

    // Generate receipt
    return generateCreditSaleReceipt(sale, customer, items);
  } catch (error) {
    console.error("Credit sale error:", error);
    return `Failed to process credit sale: ${error.message}`;
  }
}

export async function handleLayBye(shopId, text) {
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
    const items = await parseSaleItems(shopId, itemsText);
    if (typeof items === "string") return items; // Error message

    // Calculate totals
    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

    if (depositAmount > totalAmount) {
      return `*Deposit too high*\nTotal: $${totalAmount.toFixed(
        2
      )}\nDeposit: $${depositAmount.toFixed(2)}`;
    }

    // Model B: check availability now; deduct stock only on completion.
    // Items stay sellable until the laybye is completed.
    for (const item of items) {
      if (item.product.trackStock && item.product.stock < item.quantity) {
        return `*Insufficient Stock*\n${item.product.name}: Need ${item.quantity}, have ${item.product.stock}\n\n_Laybye does not reserve stock — ensure stock is available at completion._`;
      }
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
      reservedStock: false,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // LayBye collection is source of truth; optional customer history if present
    if (Array.isArray(customer.laybyeTransactions)) {
      customer.laybyeTransactions.push({
        laybyeId: laybye._id,
        amount: totalAmount,
        deposit: depositAmount,
        date: new Date(),
        status: "active",
      });
      await customer.save();
    }

    return generateLayByeReceipt(laybye, customer, items);
  } catch (error) {
    console.error("Laybye error:", error);
    return `Failed to process laybye: ${error.message}`;
  }
}

export async function handleLayByePayment(shopId, text) {
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
      await completeLayBye(shopId, laybye);
      return generateLayByeCompletionReceipt(laybye);
    } else {
      await laybye.save();
      return generateLayByePaymentReceipt(laybye, amount);
    }
  } catch (error) {
    console.error("Laybye payment error:", error);
    return `Failed to process laybye payment: ${error.message}`;
  }
}

export async function completeLayBye(shopId, laybye) {
  try {
    const itemsForStock = laybye.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      product: { _id: item.productId, trackStock: true },
    }));

    // Load products so non-tracked items skip deduct correctly
    for (const item of itemsForStock) {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new Error(`Product not found for laybye item ${item.productId}`);
      }
      item.product = product;
    }

    const stockResult = await InventoryService.deductSaleItems(itemsForStock);
    if (!stockResult.success) {
      throw new Error(stockResult.message.replace(/\*/g, ""));
    }

    let sale;
    try {
      // Create completed sale record
      sale = await Sale.create({
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
      laybye.reservedStock = false;
      await laybye.save();

      // Update customer
      const customer = await Customer.findById(laybye.customerId);
      if (customer) {
        customer.totalSpent += laybye.totalAmount;
        customer.totalVisits += 1;
        await customer.save();
      }
    } catch (createError) {
      await InventoryService.restoreSaleItems(itemsForStock);
      throw createError;
    }

    return sale;
  } catch (error) {
    console.error("Complete laybye error:", error);
    throw error;
  }
}

export async function handleLayByeComplete(shopId, text) {
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
    const completedSale = await completeLayBye(shopId, laybye);

    return generateLayByeCompletionReceipt(laybye);
  } catch (error) {
    console.error("Laybye complete error:", error);
    return `Failed to complete laybye: ${error.message}`;
  }
}

