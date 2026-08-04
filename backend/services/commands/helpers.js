import { escapeMarkdown } from "../../utils/escapeMarkdown.js";

export function generateCustomerReceipt(sale, customer, items) {
  const now = new Date();
  const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;

  let receipt = `INVOICE: ${invoiceNumber}\n`;
  receipt += "=".repeat(40) + "\n";
  receipt += `CUSTOMER: ${escapeMarkdown(customer.name.toUpperCase())}\n`;
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
    receipt += `${index + 1}. ${escapeMarkdown(item.product.name)}\n`;
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

export function generateCashSaleReceipt(sale, items) {
  let receipt = `CASH SALE RECEIPT\n\n`;
  receipt += `Invoice: CASH-${sale._id.toString().slice(-8)}\n`;
  receipt += `Date: ${new Date().toLocaleString()}\n\n`;

  receipt += `ITEMS\n`;
  items.forEach((item, index) => {
    receipt += `${index + 1}. ${escapeMarkdown(item.productName)} x ${item.quantity}\n`;
    receipt += `   Price: $${item.price.toFixed(2)} each\n`;
    receipt += `   Subtotal: $${item.total.toFixed(2)}\n\n`;
  });

  receipt += `SUMMARY\n`;
  receipt += `Total: $${sale.total.toFixed(2)}\n`;
  if ((sale.costTotal || 0) > 0) {
    receipt += `COGS: $${sale.costTotal.toFixed(2)}\n`;
    receipt += `Gross Profit: $${(sale.profit || 0).toFixed(2)}\n`;
  }
  receipt += `Payment Method: Cash (paid in full)\n`;

  return receipt;
}

export function generateCreditSaleReceipt(sale, customer, items) {
  let receipt = `CREDIT SALE RECEIPT\n\n`;
  receipt += `Invoice: CR-${sale._id.toString().slice(-8)}\n`;
  receipt += `Customer: ${escapeMarkdown(customer.name)}\n`;
  receipt += `Date: ${new Date().toLocaleString()}\n`;
  receipt += `Status: Product Delivered\n\n`;

  receipt += `ITEMS\n`;
  items.forEach((item, index) => {
    receipt += `${index + 1}. ${escapeMarkdown(item.productName)} x ${item.quantity}\n`;
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
  receipt += `Make payments using: payment ${escapeMarkdown(customer.name)} [amount]\n`;

  return receipt;
}

export function generateLayByeReceipt(laybye, customer, items) {
  let receipt = `LAYBYE AGREEMENT\n\n`;
  receipt += `Agreement Number: LB-${laybye._id.toString().slice(-8)}\n`;
  receipt += `Customer: ${escapeMarkdown(customer.name)}\n`;
  receipt += `Start Date: ${laybye.startDate.toLocaleDateString()}\n`;
  receipt += `Due Date: ${laybye.dueDate.toLocaleDateString()}\n\n`;

  receipt += `ITEMS (held for customer — stock not reserved)\n`;
  items.forEach((item, index) => {
    receipt += `${index + 1}. ${escapeMarkdown(item.productName)} x ${item.quantity}\n`;
    receipt += `   Price: $${item.price.toFixed(2)} each\n`;
    receipt += `   Subtotal: $${item.total.toFixed(2)}\n\n`;
  });

  receipt += `PAYMENT DETAILS\n`;
  receipt += `Total Value: $${laybye.totalAmount.toFixed(2)}\n`;
  receipt += `Deposit Paid: $${laybye.amountPaid.toFixed(2)}\n`;
  receipt += `Balance Due: $${laybye.balanceDue.toFixed(2)}\n`;
  receipt += `Number of Installments: ${laybye.installments.length}\n\n`;

  receipt += `TERMS\n`;
  receipt += `Stock is NOT reserved — items stay available to sell.\n`;
  receipt += `Stock is deducted when the laybye is fully paid/completed.\n`;
  receipt += `Make payments using: laybye pay ${escapeMarkdown(customer.name)} [amount]\n`;
  receipt += `Complete when fully paid: laybye complete ${escapeMarkdown(customer.name)}\n`;

  return receipt;
}

export function generateLayByePaymentReceipt(laybye, amount) {
  let receipt = `LAYBYE PAYMENT RECEIPT\n\n`;
  receipt += `Agreement Number: LB-${laybye._id.toString().slice(-8)}\n`;
  receipt += `Customer: ${laybye.customerName}\n`;
  receipt += `Date: ${new Date().toLocaleString()}\n\n`;

  receipt += `PAYMENT DETAILS\n`;
  receipt += `Amount Paid: $${amount.toFixed(2)}\n`;
  receipt += `Previous Balance: $${(laybye.balanceDue + amount).toFixed(
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

export function generateLayByeCompletionReceipt(laybye) {
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
    receipt += `${index + 1}. ${escapeMarkdown(item.productName)} x ${item.quantity}\n`;
  });

  receipt += `\nNOTES\n`;
  receipt += `Stock has now been deducted from inventory.\n`;
  receipt += `Items are ready for collection.\n`;

  return receipt;
}

