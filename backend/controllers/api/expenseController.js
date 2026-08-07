import ExpenseService from "../../services/ExpenseService.js";
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

    const result = await ExpenseService.recordExpense(
      req.shopId,
      amount,
      description,
      category,
      paymentMethod,
      receiptNumber,
      { createdByUserId: req.userId }
    );

    if (!result.success) {
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
      metadata: { amount, category, description },
    });

    return res.status(201).json({
      success: true,
      expense: serializeExpense(result.expense),
    });
  } catch (error) {
    console.error("[api/expenses/create]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to record expense.",
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
