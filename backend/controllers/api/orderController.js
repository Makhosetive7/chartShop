import OrderService from "../../services/OrderService.js";
import {
  itemsToCommandText,
  parseApiSaleItems,
} from "../../utils/apiSaleItems.js";
import { stripMarkdown } from "../../utils/apiResponse.js";
import { logApiActivity } from "../../utils/logApiActivity.js";

function serializeOrder(o) {
  if (!o) return null;
  return {
    id: String(o._id),
    shortId: String(o._id).slice(-4),
    customerId: o.customerId ? String(o.customerId._id || o.customerId) : null,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    items: o.items,
    total: o.total,
    orderType: o.orderType,
    status: o.status,
    notes: o.notes,
    orderDate: o.orderDate,
    confirmedAt: o.confirmedAt,
    readyAt: o.readyAt,
    completedAt: o.completedAt,
    cancelledAt: o.cancelledAt,
  };
}

export async function listOrders(req, res) {
  try {
    const status = String(req.query.status || "all").toLowerCase();
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const result = await OrderService.listOrders(req.shopId, status, limit);

    return res.json({
      success: true,
      orders: (result.orders || []).map(serializeOrder),
      message: result.orders?.length
        ? undefined
        : stripMarkdown(result.message),
    });
  } catch (error) {
    console.error("[api/orders/list]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to list orders.",
    });
  }
}

export async function createOrder(req, res) {
  try {
    const customer = String(
      req.body?.customer || req.body?.customerId || ""
    ).trim();
    if (!customer) {
      return res.status(400).json({
        success: false,
        error: "customer is required.",
      });
    }

    const orderType = String(req.body?.orderType || "pickup").toLowerCase();
    const notes = String(req.body?.notes || "");

    let itemsText = "";
    let preParsedItems = null;
    if (Array.isArray(req.body?.items) && req.body.items.length > 0) {
      const parsed = await parseApiSaleItems(req.shopId, req.body.items);
      if (!parsed.ok) {
        return res.status(parsed.status).json({
          success: false,
          error: parsed.error,
        });
      }
      preParsedItems = parsed.items;
      itemsText = itemsToCommandText(parsed.items);
    } else if (req.body?.itemsText) {
      itemsText = String(req.body.itemsText);
    }

    if (!itemsText.trim() && !preParsedItems) {
      return res.status(400).json({
        success: false,
        error: "items array or itemsText is required.",
      });
    }

    const result = await OrderService.placeOrder(
      req.shopId,
      customer,
      itemsText,
      orderType,
      notes,
      {
        createdByUserId: req.userId,
        preParsedItems,
      }
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }

    await logApiActivity(req, {
      action: "order.create",
      summary: `Order for ${result.order.customerName} $${Number(result.order.total).toFixed(2)}`,
      entityType: "order",
      entityId: result.order._id,
      metadata: { total: result.order.total, orderType },
    });

    return res.status(201).json({
      success: true,
      order: serializeOrder(result.order),
    });
  } catch (error) {
    console.error("[api/orders/create]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create order.",
    });
  }
}

export async function getOrder(req, res) {
  try {
    const result = await OrderService.getOrderDetails(
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
      order: serializeOrder(result.order),
    });
  } catch (error) {
    console.error("[api/orders/get]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get order.",
    });
  }
}

export async function updateOrderStatus(req, res) {
  try {
    const status = String(req.body?.status || "").toLowerCase();
    const notes = String(req.body?.notes || "");
    const valid = ["completed", "cancelled"];

    if (!valid.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${valid.join(", ")}`,
      });
    }

    const result = await OrderService.updateOrderStatus(
      req.shopId,
      req.params.id,
      status,
      notes
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }

    await logApiActivity(req, {
      action: "order.status",
      summary: `Order status → ${status}`,
      entityType: "order",
      entityId: result.order._id,
      metadata: { status },
    });

    return res.json({
      success: true,
      order: serializeOrder(result.order),
    });
  } catch (error) {
    console.error("[api/orders/status]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update order status.",
    });
  }
}
