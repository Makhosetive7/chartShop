import ExpenseService from "../../services/ExpenseService.js";
import FinancialService from "../../services/FinancialService.js";
import { stripMarkdown } from "../../utils/apiResponse.js";
import { logApiActivity } from "../../utils/logApiActivity.js";

function serializeExpense(e) {
  if (!e) return null;
  return {
    id: String(e._id),
    amount: e.amount,
    description: e.description,
    category: e.category,
    paymentMethod: e.paymentMethod,
    receiptNumber: e.receiptNumber,
    date: e.date,
  };
}

export async function createExpense(req, res) {
  try {
    const amount = Number(req.body?.amount);
    const description = String(req.body?.description || "").trim();
    const category = String(req.body?.category || "other").toLowerCase();
    const paymentMethod = String(req.body?.paymentMethod || "cash").toLowerCase();
    const receiptNumber = String(req.body?.receiptNumber || "");
    const allowOverspend = Boolean(req.body?.allowOverspend);

    const result = await ExpenseService.recordExpense(
      req.shopId,
      amount,
      description,
      category,
      paymentMethod,
      receiptNumber,
      { createdByUserId: req.userId, allowOverspend }
    );

    if (!result.success) {
      if (result.code === "INSUFFICIENT_CASH") {
        return res.status(409).json({
          success: false,
          code: "INSUFFICIENT_CASH",
          error: stripMarkdown(result.message),
          cashAvailable: result.cashAvailable,
          amount: result.amount,
          shortfall: result.shortfall,
        });
      }

      return res.status(400).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }

    await logApiActivity(req, {
      action: "expense.recorded",
      summary: `Recorded expense $${Number(amount).toFixed(2)} — ${category}`,
      entityType: "expense",
      entityId: result.expense?._id,
      metadata: {
        amount,
        category,
        description,
        allowOverspend,
        ownerCashIn: result.ownerCashIn || 0,
      },
    });

    return res.status(201).json({
      success: true,
      expense: serializeExpense(result.expense),
      ownerCashIn: result.ownerCashIn || 0,
      cashAvailable: result.cashAvailable,
    });
  } catch (error) {
    console.error("[api/expenses/create]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to record expense.",
    });
  }
}

export async function getCashAvailable(req, res) {
  try {
    const result = await FinancialService.getCashAvailable(req.shopId);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }

    return res.json({
      success: true,
      cashAvailable: result.available,
      breakdown: result.breakdown,
    });
  } catch (error) {
    console.error("[api/expenses/cash-available]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get cash available.",
    });
  }
}

export async function listExpenses(req, res) {
  try {
    const period = String(req.query.period || "daily").toLowerCase();
    const days = req.query.days ? parseInt(req.query.days, 10) : null;
    const result = await ExpenseService.getExpenses(req.shopId, period, days);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }

    return res.json({
      success: true,
      period: result.period || period,
      total: result.total,
      expenses: (result.expenses || []).map(serializeExpense),
      message: result.message ? stripMarkdown(result.message) : undefined,
    });
  } catch (error) {
    console.error("[api/expenses/list]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to list expenses.",
    });
  }
}

export async function expenseBreakdown(req, res) {
  try {
    const period = String(req.query.period || "monthly").toLowerCase();
    const result = await ExpenseService.getExpenseBreakdown(req.shopId, period);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }

    return res.json({
      success: true,
      period: result.period || period,
      total: result.total,
      breakdown: result.breakdown,
      message: result.message ? stripMarkdown(result.message) : undefined,
    });
  } catch (error) {
    console.error("[api/expenses/breakdown]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get expense breakdown.",
    });
  }
}
