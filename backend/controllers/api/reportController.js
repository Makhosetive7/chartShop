import fs from "fs";
import path from "path";
import Sale from "../../models/Sale.js";
import FinancialService from "../../services/FinancialService.js";
import ExpenseService from "../../services/ExpenseService.js";
import PDFService from "../../services/PDFService.js";
import { stripMarkdown } from "../../utils/apiResponse.js";

export async function dailyReport(req, res) {
  try {
    const result = await FinancialService.getDailyCashFlow(req.shopId);
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.message || "Failed to generate daily report.",
      });
    }

    return res.json({
      success: true,
      report: result.report,
      data: result.data,
    });
  } catch (error) {
    console.error("[api/reports/daily]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate daily report.",
    });
  }
}

export async function weeklyReport(req, res) {
  try {
    const result = await FinancialService.getWeeklyCashFlow(req.shopId);
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.message || "Failed to generate weekly report.",
      });
    }

    return res.json({
      success: true,
      report: result.report,
      data: result.data,
    });
  } catch (error) {
    console.error("[api/reports/weekly]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate weekly report.",
    });
  }
}

export async function monthlyReport(req, res) {
  try {
    const month = req.query.month || null;
    const result = await FinancialService.getMonthlyCashFlow(
      req.shopId,
      month
    );
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message || "Failed to generate monthly report.",
      });
    }

    return res.json({
      success: true,
      report: result.report,
      data: result.data,
      monthInfo: result.monthInfo,
    });
  } catch (error) {
    console.error("[api/reports/monthly]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate monthly report.",
    });
  }
}

export async function bestSellers(req, res) {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 7, 90);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sales = await Sale.find({
      shopId: req.shopId,
      date: { $gte: startDate },
      isCancelled: false,
    });

    const productSales = {};
    for (const sale of sales) {
      for (const item of sale.items || []) {
        if (!productSales[item.productName]) {
          productSales[item.productName] = {
            productName: item.productName,
            quantity: 0,
            revenue: 0,
            transactions: 0,
          };
        }
        productSales[item.productName].quantity += item.quantity;
        productSales[item.productName].revenue += item.total;
        productSales[item.productName].transactions += 1;
      }
    }

    const products = Object.values(productSales).sort(
      (a, b) => b.quantity - a.quantity
    );

    return res.json({
      success: true,
      days,
      products,
      totalQuantity: products.reduce((s, p) => s + p.quantity, 0),
      totalRevenue: products.reduce((s, p) => s + p.revenue, 0),
    });
  } catch (error) {
    console.error("[api/reports/best-sellers]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate best sellers report.",
    });
  }
}

export async function profitReport(req, res) {
  try {
    let period = String(req.query.period || "daily").toLowerCase();
    if (period === "today") period = "daily";

    const valid = ["daily", "yesterday", "weekly", "monthly"];
    if (!valid.includes(period)) {
      return res.status(400).json({
        success: false,
        error: `period must be one of: ${valid.join(", ")}`,
      });
    }

    const result = await ExpenseService.calculateProfit(req.shopId, period);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }

    return res.json({
      success: true,
      period,
      data: result,
      message: stripMarkdown(
        ExpenseService.generateProfitReportMessage(result)
      ),
    });
  } catch (error) {
    console.error("[api/reports/profit]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to calculate profit.",
    });
  }
}

export async function exportPdf(req, res) {
  try {
    const reportType = String(
      req.query.type || req.body?.type || "daily"
    ).toLowerCase();
    const monthParam = req.query.month || req.body?.month || null;
    const shop = req.shop;

    const run = (method, ...args) =>
      new Promise((resolve) => {
        PDFService[method](...args, (error, result) => {
          if (error) resolve({ error });
          else resolve({ result });
        });
      });

    let out;
    if (reportType === "monthly" || reportType === "month") {
      out = await run(
        "generateEnhancedMonthlyReportPDF",
        shop,
        monthParam
      );
    } else if (reportType === "weekly" || reportType === "week") {
      out = await run("generateEnhancedWeeklyReportPDF", shop);
    } else if (
      reportType === "daily" ||
      reportType === "today" ||
      reportType === "day"
    ) {
      out = await run("generateEnhancedDailyReportPDF", shop);
    } else {
      return res.status(400).json({
        success: false,
        error: 'type must be "daily", "weekly", or "monthly".',
      });
    }

    if (out.error) {
      return res.status(500).json({
        success: false,
        error: out.error.message || "PDF generation failed.",
      });
    }

    const filePath = out.result.filePath;
    const fileName = out.result.filename || path.basename(filePath);

    if (String(req.query.download || "1") === "0") {
      return res.json({
        success: true,
        fileName,
        filePath,
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );
    const stream = fs.createReadStream(filePath);
    stream.on("error", (err) => {
      console.error("[api/reports/export]", err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: "Failed to read PDF file.",
        });
      }
    });
    stream.pipe(res);
  } catch (error) {
    console.error("[api/reports/export]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to export PDF.",
    });
  }
}
