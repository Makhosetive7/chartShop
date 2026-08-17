import Sale from "../../models/Sale.js";
import LayBye from "../../models/LayBye.js";
import Customer from "../../models/Customer.js";
import InventoryService from "../../services/InventoryService.js";
import CancellationService from "../../services/CancellationService.js";
import CustomerService from "../../services/CustomerService.js";
import { buildSaleLineItems } from "../../services/commands/salePricing.js";
import {
  parseApiSaleItems,
  serializeSale,
} from "../../utils/apiSaleItems.js";
import { stripMarkdown } from "../../utils/apiResponse.js";
import { logApiActivity } from "../../utils/logApiActivity.js";
import { parseCreditDueDate } from "../../utils/creditDueDate.js";
import { creditChaseStatus } from "../../utils/creditDueReminders.js";
import {
  DEFAULT_TIMEZONE,
  formatYmd,
  getZonedYmd,
} from "../../utils/dateBounds.js";

function money(amount) {
  return `$${Number(amount).toFixed(2)}`;
}

function itemCountLabel(count) {
  return `${count} item${count === 1 ? "" : "s"}`;
}

export async function createCashSale(req, res) {
  try {
    const parsed = await parseApiSaleItems(req.shopId, req.body?.items);
    if (!parsed.ok) {
      return res.status(parsed.status).json({
        success: false,
        error: parsed.error,
      });
    }

    const stockResult = await InventoryService.deductSaleItems(parsed.items);
    if (!stockResult.success) {
      return res.status(409).json({
        success: false,
        error: stripMarkdown(stockResult.message),
      });
    }

    const { lineItems, total, costTotal, profit } = buildSaleLineItems(
      parsed.items
    );

    let sale;
    try {
      sale = await Sale.create({
        shopId: req.shopId,
        type: "cash",
        items: lineItems,
        total,
        costTotal,
        profit,
        status: "completed",
        amountPaid: total,
        balanceDue: 0,
        createdByUserId: req.userId,
      });
    } catch (createError) {
      await InventoryService.restoreSaleItems(parsed.items);
      throw createError;
    }

    await logApiActivity(req, {
      action: "sale.cash",
      summary: `Cash sale ${money(total)} (${itemCountLabel(lineItems.length)})`,
      entityType: "sale",
      entityId: sale._id,
      metadata: { total, itemCount: lineItems.length },
    });

    return res.status(201).json({ success: true, sale: serializeSale(sale) });
  } catch (error) {
    console.error("[api/sales/cash]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create cash sale.",
    });
  }
}

export async function createCreditSale(req, res) {
  try {
    const customerId = String(
      req.body?.customer || req.body?.customerId || req.body?.customerName || ""
    ).trim();
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: "customer (name, phone, or id) is required.",
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

    const { lineItems, total, costTotal, profit } = buildSaleLineItems(
      parsed.items
    );

    const due = parseCreditDueDate(req.body?.dueDate);
    if (!due.ok) {
      return res.status(400).json({
        success: false,
        error: due.error,
      });
    }

    const stockResult = await InventoryService.deductSaleItems(parsed.items);
    if (!stockResult.success) {
      return res.status(409).json({
        success: false,
        error: stripMarkdown(stockResult.message),
      });
    }

    let sale;
    try {
      sale = await Sale.create({
        shopId: req.shopId,
        type: "credit",
        customerId: customer._id,
        customerName: customer.name,
        customerPhone: customer.phone,
        items: lineItems,
        total,
        costTotal,
        profit,
        amountPaid: 0,
        balanceDue: total,
        dueDate: due.dueDate,
        status: "completed",
        createdByUserId: req.userId,
      });

      customer.currentBalance += total;
      customer.creditTransactions.push({
        type: "credit",
        amount: total,
        description: `Credit sale: ${parsed.items
          .map((i) => `${i.quantity}x ${i.product.name}`)
          .join(", ")}`,
        date: new Date(),
        balanceBefore: customer.currentBalance - total,
        balanceAfter: customer.currentBalance,
        items: lineItems.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          price: i.price,
          total: i.total,
        })),
      });
      await customer.save();
    } catch (createError) {
      await InventoryService.restoreSaleItems(parsed.items);
      throw createError;
    }

    await logApiActivity(req, {
      action: "sale.credit",
      summary: `Credit sale ${money(total)} (${itemCountLabel(lineItems.length)})`,
      entityType: "sale",
      entityId: sale._id,
      metadata: {
        total,
        itemCount: lineItems.length,
        customerId: String(customer._id),
        dueDate: due.dueDate,
      },
    });

    return res.status(201).json({
      success: true,
      sale: serializeSale(sale),
      customerBalance: customer.currentBalance,
    });
  } catch (error) {
    console.error("[api/sales/credit]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create credit sale.",
    });
  }
}

export async function sellToCustomer(req, res) {
  try {
    const customerId = String(
      req.body?.customer || req.body?.customerId || req.body?.customerName || ""
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

    const { lineItems, total, costTotal, profit } = buildSaleLineItems(
      parsed.items
    );

    const stockResult = await InventoryService.deductSaleItems(parsed.items);
    if (!stockResult.success) {
      return res.status(409).json({
        success: false,
        error: stripMarkdown(stockResult.message),
      });
    }

    let sale;
    try {
      sale = await Sale.create({
        shopId: req.shopId,
        type: "cash",
        items: lineItems,
        total,
        costTotal,
        profit,
        customerId: customer._id,
        customerName: customer.name,
        customerPhone: customer.phone,
        status: "completed",
        amountPaid: total,
        balanceDue: 0,
        createdByUserId: req.userId,
      });
    } catch (createError) {
      await InventoryService.restoreSaleItems(parsed.items);
      throw createError;
    }

    await CustomerService.linkSaleToCustomer(sale, customer, total);

    await logApiActivity(req, {
      action: "sale.to_customer",
      summary: `Sale to ${customer.name} ${money(total)} (${itemCountLabel(lineItems.length)})`,
      entityType: "sale",
      entityId: sale._id,
      metadata: { total, itemCount: lineItems.length, customerId: String(customer._id) },
    });

    return res.status(201).json({ success: true, sale: serializeSale(sale) });
  } catch (error) {
    console.error("[api/sales/to-customer]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create customer sale.",
    });
  }
}

export async function listRecentSales(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 50);
    const result = await CancellationService.getRecentSalesForCancellation(
      req.shopId,
      limit
    );
    return res.json({
      success: result.success !== false,
      message: stripMarkdown(result.message),
      sales: (result.sales || []).map(serializeSale),
    });
  } catch (error) {
    console.error("[api/sales/recent]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to list recent sales.",
    });
  }
}

function chaseSortRank(status) {
  if (status === "overdue") return 0;
  if (status === "due") return 1;
  if (status === "tomorrow") return 2;
  return 3;
}

export async function listCreditDue(req, res) {
  try {
    const now = new Date();
    const sales = await Sale.find({
      shopId: req.shopId,
      type: "credit",
      isCancelled: { $ne: true },
      status: { $ne: "cancelled" },
      dueDate: { $ne: null },
    })
      .sort({ dueDate: 1 })
      .limit(200)
      .lean();

    const customerIds = [
      ...new Set(
        sales
          .map((sale) => (sale.customerId ? String(sale.customerId) : null))
          .filter(Boolean)
      ),
    ];
    const customers = await Customer.find({
      _id: { $in: customerIds },
      currentBalance: { $gt: 0 },
    })
      .select("_id name phone currentBalance")
      .lean();
    const owing = new Map(
      customers.map((customer) => [String(customer._id), customer])
    );

    const items = [];
    for (const sale of sales) {
      if (!sale.customerId || !owing.has(String(sale.customerId))) continue;
      const chase = creditChaseStatus(sale.dueDate, now, DEFAULT_TIMEZONE);
      if (!chase) continue;
      const customer = owing.get(String(sale.customerId));
      items.push({
        id: String(sale._id),
        customerId: String(sale.customerId),
        customerName: customer?.name || sale.customerName,
        customerPhone: customer?.phone || sale.customerPhone || null,
        customerBalance: customer?.currentBalance || 0,
        total: sale.total,
        dueDate: sale.dueDate,
        status: chase.status,
        daysOverdue: chase.daysOverdue,
        daysUntilDue: chase.daysUntilDue,
        items: (sale.items || []).map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          variantLabel: item.variantLabel || "",
          packLabel: item.packLabel || "",
        })),
      });
    }

    items.sort((a, b) => {
      const rank = chaseSortRank(a.status) - chaseSortRank(b.status);
      if (rank !== 0) return rank;
      if (a.status === "overdue") return b.daysOverdue - a.daysOverdue;
      return a.daysUntilDue - b.daysUntilDue;
    });

    const summary = {
      overdue: items.filter((item) => item.status === "overdue").length,
      due: items.filter((item) => item.status === "due").length,
      tomorrow: items.filter((item) => item.status === "tomorrow").length,
      upcoming: items.filter((item) => item.status === "upcoming").length,
    };

    return res.json({
      success: true,
      date: formatYmd(getZonedYmd(now, DEFAULT_TIMEZONE)),
      summary,
      items,
    });
  } catch (error) {
    console.error("[api/sales/credit-due]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to list credit due.",
    });
  }
}

export async function cancelLastSale(req, res) {
  try {
    const reason = String(req.body?.reason || "No reason provided");
    const cancelledBy = req.userId || req.username;
    const result = await CancellationService.cancelLastSale(req.shopId, reason, {
      cancelledBy,
    });
    if (result.success) {
      await logApiActivity(req, {
        action: "sale.cancelled",
        summary: "Cancelled sale",
        entityType: "sale",
        entityId: result.sale?._id,
        metadata: { reason },
      });
    }
    const status = result.success ? 200 : 400;
    return res.status(status).json({
      success: result.success,
      message: stripMarkdown(result.message),
      sale: result.sale ? serializeSale(result.sale) : undefined,
    });
  } catch (error) {
    console.error("[api/sales/cancel/last]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to cancel sale.",
    });
  }
}

export async function cancelSale(req, res) {
  try {
    const reason = String(req.body?.reason || "No reason provided");
    const id = req.params.id;
    const cancelledBy = req.userId || req.username;
    const result = await CancellationService.cancelSpecificSale(
      req.shopId,
      id,
      reason,
      { cancelledBy }
    );
    if (result.success) {
      await logApiActivity(req, {
        action: "sale.cancelled",
        summary: "Cancelled sale",
        entityType: "sale",
        entityId: result.sale?._id,
        metadata: { reason },
      });
    }
    const status = result.success ? 200 : 400;
    return res.status(status).json({
      success: result.success,
      message: stripMarkdown(result.message),
      sale: result.sale ? serializeSale(result.sale) : undefined,
    });
  } catch (error) {
    console.error("[api/sales/cancel]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to cancel sale.",
    });
  }
}

export async function refundsReport(req, res) {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const data = await CancellationService.getRefundsData(req.shopId, days);
    const message = CancellationService.formatRefundsMessage(data);
    return res.json({
      success: true,
      message: stripMarkdown(message),
      days: data.days,
      totalRefundAmount: data.totalRefundAmount,
      sales: data.sales,
    });
  } catch (error) {
    console.error("[api/sales/refunds]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate refunds report.",
    });
  }
}

function serializeLaybye(laybye) {
  if (!laybye) return null;
  return {
    id: String(laybye._id),
    customerId: laybye.customerId ? String(laybye.customerId) : null,
    customerName: laybye.customerName,
    customerPhone: laybye.customerPhone || null,
    totalAmount: laybye.totalAmount,
    amountPaid: laybye.amountPaid,
    balanceDue: laybye.balanceDue,
    status: laybye.status,
    items: laybye.items,
    dueDate: laybye.dueDate,
    completedDate: laybye.completedDate || null,
    notes: laybye.notes || null,
  };
}

export async function listLaybyes(req, res) {
  try {
    const status = String(req.query.status || "active").trim().toLowerCase();
    const allowed = new Set(["active", "completed", "cancelled", "all"]);
    if (!allowed.has(status)) {
      return res.status(400).json({
        success: false,
        error: "status must be active, completed, cancelled, or all.",
      });
    }

    const filter = { shopId: req.shopId };
    if (status !== "all") {
      filter.status = status;
    }

    const laybyes = await LayBye.find(filter)
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(100);

    return res.json({
      success: true,
      laybyes: laybyes.map(serializeLaybye),
    });
  } catch (error) {
    console.error("[api/laybye/list]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to list laybyes.",
    });
  }
}

export async function createLaybye(req, res) {
  try {
    const customerId = String(
      req.body?.customer || req.body?.customerId || ""
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

    const depositAmount = Number(req.body?.deposit || 0);
    const totalAmount = parsed.items.reduce((sum, item) => sum + item.total, 0);

    if (depositAmount > totalAmount) {
      return res.status(400).json({
        success: false,
        error: `Deposit too high. Total: ${totalAmount}, deposit: ${depositAmount}`,
      });
    }

    for (const item of parsed.items) {
      const need = item.baseUnitsDeducted ?? item.quantity;
      const variantStock =
        item.variantId && item.product.variants
          ? item.product.variants.id?.(item.variantId)?.stock ??
            item.product.stock
          : item.product.stock;
      const tracks =
        item.variantId && item.product.variants?.id?.(item.variantId)
          ? item.product.variants.id(item.variantId).trackStock
          : item.product.trackStock;
      if (tracks && variantStock < need) {
        return res.status(409).json({
          success: false,
          error: `Insufficient stock for ${item.productName || item.product.name}: need ${need}, have ${variantStock}`,
        });
      }
    }

    const laybye = await LayBye.create({
      shopId: req.shopId,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: parsed.items.map((item) => ({
        productId: item.product._id,
        productName: item.productName || item.product.name,
        variantId: item.variantId || null,
        variantLabel: item.variantLabel || "",
        packId: item.packId || null,
        packLabel: item.packLabel || "",
        unitsPerPack: item.unitsPerPack || 1,
        baseUnitsDeducted: item.baseUnitsDeducted ?? item.quantity,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      })),
      totalAmount,
      amountPaid: depositAmount,
      balanceDue: totalAmount - depositAmount,
      installments:
        depositAmount > 0
          ? [{ amount: depositAmount, date: new Date(), paymentMethod: "cash" }]
          : [],
      status: "active",
      reservedStock: false,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdByUserId: req.userId,
    });

    await logApiActivity(req, {
      action: "laybye.created",
      summary: `Laybye ${money(totalAmount)} for ${customer.name}`,
      entityType: "laybye",
      entityId: laybye._id,
      metadata: { totalAmount, depositAmount },
    });

    // Full deposit at create → complete immediately (stock + sale).
    if (laybye.balanceDue <= 0) {
      const { completeLayBye } = await import(
        "../../services/commands/handlers/sales.js"
      );
      const sale = await completeLayBye(req.shopId, laybye);
      return res.status(201).json({
        success: true,
        completed: true,
        sale: serializeSale(sale),
        laybye: serializeLaybye(laybye),
      });
    }

    return res.status(201).json({
      success: true,
      completed: false,
      laybye: serializeLaybye(laybye),
    });
  } catch (error) {
    console.error("[api/laybye]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create laybye.",
    });
  }
}

export async function payLaybye(req, res) {
  try {
    const customerId = String(
      req.body?.customer || req.body?.customerId || ""
    ).trim();
    const amount = Number(req.body?.amount);

    if (!customerId || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "customer and positive amount are required.",
      });
    }

    const laybye = await LayBye.findOne({
      shopId: req.shopId,
      $or: [
        { customerName: new RegExp(`^${customerId}$`, "i") },
        { customerPhone: customerId },
      ],
      status: "active",
    });

    if (!laybye) {
      return res.status(404).json({
        success: false,
        error: `No active laybye for ${customerId}`,
      });
    }

    if (amount > laybye.balanceDue) {
      return res.status(400).json({
        success: false,
        error: `Payment too high. Balance due: ${laybye.balanceDue}`,
      });
    }

    laybye.amountPaid += amount;
    laybye.balanceDue -= amount;
    laybye.installments.push({
      amount,
      date: new Date(),
      paymentMethod: "cash",
    });

    if (laybye.balanceDue <= 0) {
      const { completeLayBye } = await import(
        "../../services/commands/handlers/sales.js"
      );
      await completeLayBye(req.shopId, laybye);
      await logApiActivity(req, {
        action: "laybye.payment",
        summary: `Laybye payment ${money(amount)}`,
        entityType: "laybye",
        entityId: laybye._id,
        metadata: { amount, completed: true },
      });
      return res.json({
        success: true,
        completed: true,
        laybye: {
          id: String(laybye._id),
          status: "completed",
          amountPaid: laybye.amountPaid,
          balanceDue: 0,
        },
      });
    }

    await laybye.save();
    await logApiActivity(req, {
      action: "laybye.payment",
      summary: `Laybye payment ${money(amount)}`,
      entityType: "laybye",
      entityId: laybye._id,
      metadata: { amount, completed: false, balanceDue: laybye.balanceDue },
    });
    return res.json({
      success: true,
      completed: false,
      laybye: {
        id: String(laybye._id),
        status: laybye.status,
        amountPaid: laybye.amountPaid,
        balanceDue: laybye.balanceDue,
      },
    });
  } catch (error) {
    console.error("[api/laybye/pay]", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to record laybye payment.",
    });
  }
}

export async function completeLaybye(req, res) {
  try {
    const customerId = String(
      req.body?.customer || req.body?.customerId || req.params.customer || ""
    ).trim();
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: "customer is required.",
      });
    }

    const laybye = await LayBye.findOne({
      shopId: req.shopId,
      $or: [
        { customerName: new RegExp(`^${customerId}$`, "i") },
        { customerPhone: customerId },
      ],
      status: "active",
      balanceDue: 0,
    });

    if (!laybye) {
      return res.status(404).json({
        success: false,
        error: `No fully paid active laybye for ${customerId}`,
      });
    }

    const { completeLayBye } = await import(
      "../../services/commands/handlers/sales.js"
    );
    const sale = await completeLayBye(req.shopId, laybye);

    await logApiActivity(req, {
      action: "laybye.completed",
      summary: `Completed laybye for ${laybye.customerName}`,
      entityType: "laybye",
      entityId: laybye._id,
      metadata: { saleId: sale?._id ? String(sale._id) : null },
    });

    return res.json({
      success: true,
      sale: serializeSale(sale),
      laybyeId: String(laybye._id),
    });
  } catch (error) {
    console.error("[api/laybye/complete]", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to complete laybye.",
    });
  }
}
