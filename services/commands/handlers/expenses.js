import ExpenseService from "../../ExpenseService.js";
import FinancialService from "../../FinancialService.js";

export async function handleExpenseRecording(shopId, text) {
  try {
    // Format: expense 50.00 "supplier payment" supplies bank INV001
    // or: expense 50.00 supplier payment
    const parts = text.replace("expense", "").trim().split(" ");

    if (parts.length < 2) {
      return 'Invalid format.\n\nUse: expense [amount] [description] [category?] [payment?] [receipt?]\n\nExamples:\n• expense 50.00 "supplier payment"\n• expense 25.50 transport cash\n• expense 1000.00 rent bank "July rent"\n• expense 150.00 supplies cash INV123';
    }

    const amount = parseFloat(parts[0]);
    if (isNaN(amount) || amount <= 0) {
      return "Invalid amount. Please use a positive number greater than 0.\nExample: 50.00";
    }

    // Parse description (could be in quotes or multiple words)
    let description = "";
    let category = "other";
    let paymentMethod = "cash";
    let receiptNumber = "";

    // Check if description is in quotes
    if (parts[1].startsWith('"')) {
      const quoteMatch = text.match(/expense\s+[\d.]+\s+"([^"]+)"/);
      if (quoteMatch) {
        description = quoteMatch[1];
        const remaining = text
          .replace(`expense ${parts[0]} "${description}"`, "")
          .trim()
          .split(" ");
        if (remaining[0]) category = remaining[0];
        if (remaining[1]) paymentMethod = remaining[1];
        if (remaining[2]) receiptNumber = remaining[2];
      }
    } else {
      // Simple format
      description = parts.slice(1).join(" ");

      // Try to extract known categories and payment methods
      const knownCategories = [
        "supplies",
        "utilities",
        "rent",
        "salary",
        "transport",
        "marketing",
        "maintenance",
        "taxes",
        "insurance",
        "packaging",
      ];

      const knownPayments = ["cash", "bank", "mobile", "credit"];

      // Split description to find category and payment
      const words = description.split(" ");
      for (let i = words.length - 1; i >= 0; i--) {
        const word = words[i].toLowerCase();
        if (knownPayments.includes(word) && paymentMethod === "cash") {
          paymentMethod = word;
          words.splice(i, 1);
        } else if (knownCategories.includes(word) && category === "other") {
          category = word;
          words.splice(i, 1);
        } else if (word.match(/^[A-Z0-9]{3,}$/) && !receiptNumber) {
          // Looks like a receipt number
          receiptNumber = word;
          words.splice(i, 1);
        }
      }

      description = words.join(" ").trim();
    }

    if (!description.trim()) {
      return 'Expense description is required.\n\nExample: expense 50.00 "supplier payment"';
    }

    const result = await ExpenseService.recordExpense(
      shopId,
      amount,
      description,
      category,
      paymentMethod,
      receiptNumber
    );

    return result.message;
  } catch (error) {
    console.error("Expense recording error:", error);
    return "Failed to record expense. Please try again.";
  }
}

export async function handleExpenseReports(shopId, text) {
  try {
    const parts = text.replace("expenses", "").trim().split(" ");
    const period = parts[0]?.toLowerCase() || "daily";

    if (period === "breakdown") {
      const breakdownPeriod = parts[1] || "monthly";
      const result = await ExpenseService.getExpenseBreakdown(
        shopId,
        breakdownPeriod
      );

      if (!result.success) {
        return result.message;
      }

      return ExpenseService.generateExpenseBreakdownMessage(result);
    }

    // Valid periods
    const validPeriods = ["daily", "today", "yesterday", "weekly", "monthly"];
    if (!validPeriods.includes(period)) {
      return `Invalid period. Use: daily, weekly, or monthly.\n\nExample: expenses weekly`;
    }

    const actualPeriod = period === "today" ? "daily" : period;
    const result = await ExpenseService.getExpenses(shopId, actualPeriod);

    if (!result.success) {
      return result.message;
    }

    return ExpenseService.generateExpensesReportMessage(
      result.expenses,
      result.total,
      actualPeriod,
      result.startDate,
      result.endDate
    );
  } catch (error) {
    console.error("Expense reports error:", error);
    return "Failed to generate expense report. Please try again.";
  }
}

export async function handleExpenseBreakdown(shopId, text) {
  try {
    console.log("[CommandService] Generating expense breakdown");

    // Determine period from command
    const lowerText = text.toLowerCase();
    let period = "daily";

    if (lowerText.includes("week")) {
      period = "weekly";
    } else if (lowerText.includes("month")) {
      period = "monthly";
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    if (period === "daily") {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "weekly") {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }

    const result = await FinancialService.categorizeExpenses(
      shopId,
      startDate,
      endDate
    );

    if (!result.success) {
      return `*Error*\n\n${result.message}`;
    }

    if (result.categories.length === 0) {
      const periodName =
        period === "daily"
          ? "today"
          : period === "weekly"
          ? "this week"
          : "this month";
      return `*No Expenses*\n\nNo expenses recorded ${periodName}.`;
    }

    let report = `*EXPENSE BREAKDOWN - ${period.toUpperCase()}*\n\n`;
    report += `Period: ${startDate.toDateString()} - ${endDate.toDateString()}\n`;
    report += `Total Expenses: $${result.total.toFixed(2)}\n`;
    report += `Categories: ${result.categories.length}\n\n`;

    result.categories.forEach((cat, index) => {
      const categoryName =
        cat.category.charAt(0).toUpperCase() + cat.category.slice(1);
      report += `${index + 1}. *${categoryName}*\n`;
      report += `   Total: $${cat.total.toFixed(2)} (${cat.percentage.toFixed(
        1
      )}%)\n`;
      report += `   Items: ${cat.count}\n`;

      // Show top 3 items in category
      cat.items.slice(0, 3).forEach((item) => {
        report += `   • ${
          item.description || "No description"
        }: $${item.amount.toFixed(2)}\n`;
      });

      if (cat.items.length > 3) {
        report += `   ... and ${cat.items.length - 3} more items\n`;
      }
      report += "\n";
    });

    return report;
  } catch (error) {
    console.error("[CommandService] Expense breakdown error:", error);
    return `Failed to generate expense breakdown: ${error.message}`;
  }
}

