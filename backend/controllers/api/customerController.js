import CustomerService from "../../services/CustomerService.js";
import { parseApiSaleItems } from "../../utils/apiSaleItems.js";
import { stripMarkdown } from "../../utils/apiResponse.js";
import { logApiActivity } from "../../utils/logApiActivity.js";

function serializeCustomer(c) {
  if (!c) return null;
  return {
    id: String(c._id),
    name: c.name,
    phone: c.phone,
    email: c.email || "",
    currentBalance: c.currentBalance,
    totalSpent: c.totalSpent,
    totalVisits: c.totalVisits,
    loyaltyPoints: c.loyaltyPoints,
    firstPurchaseDate: c.firstPurchaseDate,
    lastPurchaseDate: c.lastPurchaseDate,
    isActive: c.isActive,
  };
}

export async function listCustomers(req, res) {
  try {
    const filter = String(req.query.filter || "all").toLowerCase();
    const result = await CustomerService.listCustomers(req.shopId, filter);
    return res.json({
      success: true,
      customers: (result.customers || []).map(serializeCustomer),
      message: result.customers?.length
        ? undefined
        : stripMarkdown(result.message),
    });
  } catch (error) {
    console.error("[api/customers/list]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to list customers.",
    });
  }
}

export async function createCustomer(req, res) {
  try {
    const name = String(req.body?.name || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const email = String(req.body?.email || "").trim();

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: "name and phone are required.",
      });
    }

    const result = await CustomerService.addCustomer(
      req.shopId,
      name,
      phone,
      email,
      { createdByUserId: req.userId }
    );
    if (!result.success) {
      return res.status(409).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }

    await logApiActivity(req, {
      action: "customer.create",
      summary: `Added customer ${result.customer.name}`,
      entityType: "customer",
      entityId: result.customer._id,
      metadata: { name: result.customer.name, phone: result.customer.phone },
    });

    return res.status(201).json({
      success: true,
      customer: serializeCustomer(result.customer),
    });
  } catch (error) {
    console.error("[api/customers/create]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create customer.",
    });
  }
}

export async function getCustomer(req, res) {
  try {
    const customer = await CustomerService.findCustomer(
      req.shopId,
      req.params.id
    );
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "Customer not found.",
      });
    }
    return res.json({
      success: true,
      customer: serializeCustomer(customer),
    });
  } catch (error) {
    console.error("[api/customers/get]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get customer.",
    });
  }
}

export async function customerHistory(req, res) {
  try {
    const result = await CustomerService.getCustomerHistory(
      req.shopId,
      req.params.id
    );
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }

    return res.json({
      success: true,
      customer: serializeCustomer(result.customer),
      sales: (result.sales || []).map((s) => ({
        id: String(s._id),
        type: s.type,
        total: s.total,
        date: s.date,
        items: s.items,
        status: s.status,
      })),
    });
  } catch (error) {
    console.error("[api/customers/history]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get customer history.",
    });
  }
}

export async function creditHistory(req, res) {
  try {
    const customer = await CustomerService.findCustomer(
      req.shopId,
      req.params.id
    );
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "Customer not found.",
      });
    }

    const transactions = [...(customer.creditTransactions || [])]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, Math.min(parseInt(req.query.limit, 10) || 20, 100));

    return res.json({
      success: true,
      customer: serializeCustomer(customer),
      transactions,
    });
  } catch (error) {
    console.error("[api/customers/credit-history]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get credit history.",
    });
  }
}

/** Ledger credit without stock deduction (chat: `credit John 2 bread`). */
export async function addCredit(req, res) {
  try {
    const customerId = String(
      req.body?.customer || req.body?.customerId || req.params.id || ""
    ).trim();
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: "customer is required.",
      });
    }

    const customer = await CustomerService.findCustomer(req.shopId, customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: `Customer not found: ${customerId}`,
      });
    }

    const parsed = await parseApiSaleItems(req.shopId, req.body?.items);
    if (!parsed.ok) {
      return res.status(parsed.status).json({
        success: false,
        error: parsed.error,
      });
    }

    const totalAmount = parsed.items.reduce((sum, item) => sum + item.total, 0);
    const ledgerItems = parsed.items.map((item) => ({
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

    await logApiActivity(req, {
      action: "customer.credit",
      summary: `Credit ${customer.name} $${totalAmount.toFixed(2)}`,
      entityType: "customer",
      entityId: customer._id,
      metadata: { amount: totalAmount, items: ledgerItems },
    });

    return res.status(201).json({
      success: true,
      amount: totalAmount,
      customer: serializeCustomer(customer),
      items: ledgerItems,
    });
  } catch (error) {
    console.error("[api/customers/credit]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to record credit.",
    });
  }
}

export async function recordPayment(req, res) {
  try {
    const customerId = String(
      req.body?.customer || req.body?.customerId || req.params.id || ""
    ).trim();
    const amount = Number(req.body?.amount);

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: "customer is required.",
      });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "amount must be a positive number.",
      });
    }

    const customer = await CustomerService.findCustomer(req.shopId, customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: `Customer not found: ${customerId}`,
      });
    }

    if (customer.currentBalance === 0) {
      return res.status(400).json({
        success: false,
        error: "Customer has no outstanding balance.",
      });
    }

    if (amount > customer.currentBalance) {
      return res.status(400).json({
        success: false,
        error: `Payment exceeds debt. Owed: ${customer.currentBalance}`,
      });
    }

    const previousBalance = customer.currentBalance;
    await customer.recordPayment(
      amount,
      `Payment received: $${amount.toFixed(2)}`
    );

    await logApiActivity(req, {
      action: "customer.payment",
      summary: `Payment ${customer.name} $${amount.toFixed(2)}`,
      entityType: "customer",
      entityId: customer._id,
      metadata: { amount, previousBalance },
    });

    return res.json({
      success: true,
      amountPaid: amount,
      previousBalance,
      customer: serializeCustomer(customer),
    });
  } catch (error) {
    console.error("[api/customers/payment]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to record payment.",
    });
  }
}
