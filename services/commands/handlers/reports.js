import Sale from "../../../models/Sale.js";
import PDFService from "../../PDFService.js";
import FinancialService from "../../FinancialService.js";
import ExpenseService from "../../ExpenseService.js";

export async function handleDailyTotal(shopId) {
  try {
    console.log(
      "[CommandService] Generating daily report using FinancialService"
    );

    const result = await FinancialService.getDailyCashFlow(shopId);

    if (!result.success) {
      return `*Error Generating Report*\n\n${result.message}`;
    }

    return result.report;
  } catch (error) {
    console.error("[CommandService] Daily report error:", error);
    return `Failed to generate daily report: ${error.message}`;
  }
}

export async function handleWeeklyReport(shopId) {
  try {
    console.log(
      "[CommandService] Generating weekly report using FinancialService"
    );

    const result = await FinancialService.getWeeklyCashFlow(shopId);

    if (!result.success) {
      return `*Error Generating Report*\n\n${result.message}`;
    }

    return result.report;
  } catch (error) {
    console.error("[CommandService] Weekly report error:", error);
    return `Failed to generate weekly report: ${error.message}`;
  }
}

export async function handleMonthlyReport(shopId) {
  try {
    console.log(
      "[CommandService] Generating monthly report using FinancialService"
    );

    const result = await FinancialService.getMonthlyCashFlow(shopId);

    if (!result.success) {
      return `*Error Generating Report*\n\n${result.message}`;
    }

    return result.report;
  } catch (error) {
    console.error("[CommandService] Monthly report error:", error);
    return `Failed to generate monthly report: ${error.message}`;
  }
}

export async function handleBestSellingProducts(shopId, text) {
  try {
    const parts = text.replace("bestsellers", "").replace("best", "").trim();
    let days = 7; // Default to weekly

    if (parts.includes("month") || parts.includes("30")) {
      days = 30;
    } else if (parts.includes("today") || parts.includes("1")) {
      days = 1;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sales = await Sale.find({
      shopId,
      date: { $gte: startDate },
      isCancelled: false,
    });

    if (sales.length === 0) {
      return `*BEST SELLERS*\n\nNo sales in the last ${days} days.`;
    }

    // Aggregate product sales
    const productSales = {};
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (!productSales[item.productName]) {
          productSales[item.productName] = {
            quantity: 0,
            revenue: 0,
            transactions: 0,
          };
        }
        productSales[item.productName].quantity += item.quantity;
        productSales[item.productName].revenue += item.total;
        productSales[item.productName].transactions += 1;
      });
    });

    // Sort by quantity sold
    const sortedProducts = Object.entries(productSales).sort(
      (a, b) => b[1].quantity - a[1].quantity
    );

    const periodText =
      days === 1 ? "TODAY" : days === 7 ? "THIS WEEK" : "THIS MONTH";

    let report = `*BEST SELLERS - ${periodText}*\n\n`;
    report += `Period: Last ${days} days\n`;
    report += `Total Items Sold: ${sortedProducts.reduce(
      (sum, [_, data]) => sum + data.quantity,
      0
    )}\n`;
    report += `Total Revenue: $${sortedProducts
      .reduce((sum, [_, data]) => sum + data.revenue, 0)
      .toFixed(2)}\n\n`;

    report += `*TOP PERFORMING PRODUCTS:*\n\n`;

    sortedProducts.forEach(([product, data], index) => {
      const medals = [
        "1st: ",
        "2nd: ",
        "3rd: ",
        "4th: ",
        "5th: ",
        "6th: ",
        "7th: ",
        "8th: ",
        "9th: ",
        "10th: ",
      ];
      const medal = index < 10 ? medals[index] : `${index + 1}.`;

      const avgPrice = data.revenue / data.quantity;
      const popularity = (
        (data.quantity /
          sortedProducts.reduce((sum, [_, d]) => sum + d.quantity, 0)) *
        100
      ).toFixed(1);

      report += `${medal} *${product}*\n`;
      report += `   Quantity: ${data.quantity} units\n`;
      report += `   Revenue: $${data.revenue.toFixed(2)}\n`;
      report += `   Avg Price: $${avgPrice.toFixed(2)}\n`;
      report += `   Popularity: ${popularity}% of sales\n`;
      report += `   Transactions: ${data.transactions}\n\n`;
    });

    // Add insights
    if (sortedProducts.length > 0) {
      const topProduct = sortedProducts[0];
      const bottomProduct = sortedProducts[sortedProducts.length - 1];

      report += `*QUICK INSIGHTS*\n`;
      report += `• Your best seller is *${topProduct[0]}* with ${topProduct[1].quantity} units\n`;

      if (sortedProducts.length > 1) {
        report += `• Consider promoting *${bottomProduct[0]}* (only ${bottomProduct[1].quantity} sold)\n`;
      }

      const totalRevenue = sortedProducts.reduce(
        (sum, [_, data]) => sum + data.revenue,
        0
      );
      const top3Revenue = sortedProducts
        .slice(0, 3)
        .reduce((sum, [_, data]) => sum + data.revenue, 0);
      const top3Percentage = ((top3Revenue / totalRevenue) * 100).toFixed(0);

      report += `Top 3 products make up ${top3Percentage}% of revenue`;
    }

    return report;
  } catch (error) {
    console.error("Best sellers error:", error);
    return "Failed to generate best sellers report. Please try again.";
  }
}

export async function handleExportReport(shop, text) {
try {
  const parts = text
    .toLowerCase()
    .replace("export", "")
    .replace("pdf", "")
    .trim()
    .split(/\s+/); 
  
  const reportType = parts[0] || "daily";
  
  const monthParam = reportType === "monthly" && parts[1] ? parts[1] : null;

  console.log("[CommandService] Exporting", reportType, "report", monthParam ? `for month: ${monthParam}` : '');

  let pdfMethod;
  let periodName;

  switch (reportType) {
    case "daily":
    case "today":
      pdfMethod = "generateEnhancedDailyReportPDF";
      periodName = "Daily";
      break;

    case "weekly":
    case "week":
      pdfMethod = "generateEnhancedWeeklyReportPDF";
      periodName = "Weekly";
      break;

    case "monthly":
    case "month":
      pdfMethod = "generateEnhancedMonthlyReportPDF";
      
      if (monthParam) {
        try {
          const monthNum = parseInt(monthParam);
          if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
            const monthLabels = ['January', 'February', 'March', 'April', 'May', 'June',
                                 'July', 'August', 'September', 'October', 'November', 'December'];
            periodName = monthLabels[monthNum - 1];
          } else {
            const monthNames = {
              'jan': 'January', 'january': 'January',
              'feb': 'February', 'february': 'February',
              'mar': 'March', 'march': 'March',
              'apr': 'April', 'april': 'April',
              'may': 'May',
              'jun': 'June', 'june': 'June',
              'jul': 'July', 'july': 'July',
              'aug': 'August', 'august': 'August',
              'sep': 'September', 'september': 'September', 'sept': 'September',
              'oct': 'October', 'october': 'October',
              'nov': 'November', 'november': 'November',
              'dec': 'December', 'december': 'December'
            };
            periodName = monthNames[monthParam.toLowerCase()] || 'Monthly';
          }
        } catch (e) {
          periodName = 'Monthly';
        }
      } else {
        periodName = 'Monthly';
      }
      break;

    default:
      return `Invalid report type: "${reportType}"\n\nAvailable:\n• export daily\n• export weekly\n• export monthly\n• export monthly 1 (January)\n• export monthly march`;
  }

  return new Promise((resolve, reject) => {
    if (reportType === "monthly" || reportType === "month") {
      PDFService[pdfMethod](shop, monthParam, (error, result) => {
        if (error) {
          console.error("[CommandService] PDF generation error:", error);
          resolve(`*PDF Generation Failed*\n\n${error.message}\n\n💡 Usage:\n• export monthly\n• export monthly 1 (for January)\n• export monthly march`);
        } else {
          resolve({
            type: "pdf",
            message: `*${periodName} Financial Report Generated!*\n\nYour comprehensive financial report is ready with:\n\n✓ Cash flow analysis\n✓ Revenue breakdown\n✓ Expense details by category\n✓ Daily averages\n✓ Outstanding balances\n\nComplete financial transparency at your fingertips.`,
            filePath: result.filePath,
            fileName: result.filename,
          });
        }
      });
    } else {
      PDFService[pdfMethod](shop, (error, result) => {
        if (error) {
          console.error("[CommandService] PDF generation error:", error);
          resolve(`*PDF Generation Failed*\n\n${error.message}`);
        } else {
          resolve({
            type: "pdf",
            message: `*${periodName} Financial Report Generated!*\n\nYour comprehensive financial report is ready with:\n\n✓ Cash flow analysis\n✓ Revenue breakdown\n✓ Expense details by category\n✓ Profitability metrics\n✓ Outstanding balances\n\nComplete financial transparency at your fingertips.`,
            filePath: result.filePath,
            fileName: result.filename,
          });
        }
      });
    }
  });
} catch (error) {
  console.error("[CommandService] Export report error:", error);
  return `*Export Failed*\n\n${error.message}`;
}
}

export async function handleProfitCalculation(shopId, text) {
  try {
    const parts = text.replace("profit", "").trim().split(" ");
    const period = parts[0]?.toLowerCase() || "daily";

    const validPeriods = ["daily", "today", "yesterday", "weekly", "monthly"];
    if (!validPeriods.includes(period)) {
      return `Invalid period. Use: daily, weekly, or monthly.\n\nExample: profit weekly`;
    }

    const actualPeriod = period === "today" ? "daily" : period;
    const result = await ExpenseService.calculateProfit(shopId, actualPeriod);

    if (!result.success) {
      return result.message;
    }

    return ExpenseService.generateProfitReportMessage(result);
  } catch (error) {
    console.error("Profit calculation error:", error);
    return "Failed to calculate profit. Please try again.";
  }
}

