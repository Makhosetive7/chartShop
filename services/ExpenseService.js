import Expense from "../models/Expense.js";
import Sale from "../models/Sale.js";

class ExpenseService {
  /**
   * Record a new expense
   */
  async recordExpense(
    shopId,
    amount,
    description,
    category = "other",
    paymentMethod = "cash",
    receiptNumber = ""
  ) {
    try {
      // Validate amount
      if (!amount || amount <= 0) {
        return {
          success: false,
          message:
            "Invalid amount. Please use a positive number greater than 0.",
        };
      }

      if (!description.trim()) {
        return {
          success: false,
          message: "Expense description is required.",
        };
      }

      const validCategories = [
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
        "other",
        "purchases",
        "sales",
        "salary_wages",
        "equipment",
        "market_fees",
        "table_rental",
        "stall_decor",
        "generator",
        "bank_fees",
        "internet_data",
        "software",
        "pos_fees",
        "discounts",
        "refunds",
        "loyalty",
        "office",
        "cleaning",
        "security",
        "licenses",
      ];

      if (!validCategories.includes(category)) {
        return {
          success: false,
          message: `Invalid category. Available: ${validCategories.join(", ")}`,
        };
      }

      // Create expense
      const expense = await Expense.create({
        shopId,
        amount: parseFloat(amount),
        description: description.trim(),
        category,
        paymentMethod,
        receiptNumber: receiptNumber.trim(),
        date: new Date(),
      });

      return {
        success: true,
        message: this.generateExpenseRecordedMessage(expense),
        expense,
      };
    } catch (error) {
      console.error("Record expense error:", error);
      return {
        success: false,
        message: "Failed to record expense. Please try again.",
      };
    }
  }

  /**
   * Get expenses for a specific period
   */
  async getExpenses(shopId, period = "daily", days = null) {
    try {
      const startDate = new Date();
      let endDate = new Date();

      switch (period) {
        case "today":
        case "daily":
          startDate.setHours(0, 0, 0, 0);
          break;
        case "yesterday":
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "weekly":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "monthly":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "custom":
          if (days) {
            startDate.setDate(startDate.getDate() - days);
          }
          break;
      }

      const expenses = await Expense.find({
        shopId,
        date: { $gte: startDate, $lte: endDate },
      }).sort({ date: -1 });

      return {
        success: true,
        expenses,
        total: expenses.reduce((sum, exp) => sum + exp.amount, 0),
        startDate,
        endDate,
      };
    } catch (error) {
      console.error("Get expenses error:", error);
      return {
        success: false,
        message: "Failed to fetch expenses. Please try again.",
      };
    }
  }

  /**
   * Calculate profit (Revenue - Expenses)
   */
  async calculateProfit(shopId, period = "daily") {
    try {
      // Get expenses for period
      const expenseResult = await this.getExpenses(shopId, period);
      if (!expenseResult.success) {
        return expenseResult;
      }

      // Get sales for same period
      const startDate = expenseResult.startDate;
      const endDate = expenseResult.endDate;

      const sales = await Sale.find({
        shopId,
        date: { $gte: startDate, $lte: endDate },
        isCancelled: false,
      });

      const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
      const totalExpenses = expenseResult.total;
      const profit = totalRevenue - totalExpenses;

      return {
        success: true,
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit,
        period,
        startDate,
        endDate,
        salesCount: sales.length,
        expensesCount: expenseResult.expenses.length,
      };
    } catch (error) {
      console.error("Calculate profit error:", error);
      return {
        success: false,
        message: "Failed to calculate profit. Please try again.",
      };
    }
  }

  /**
   * Get expense breakdown by category
   */
  async getExpenseBreakdown(shopId, period = "monthly") {
    try {
      const expenseResult = await this.getExpenses(shopId, period);
      if (!expenseResult.success) {
        return expenseResult;
      }

      const categoryBreakdown = {};
      expenseResult.expenses.forEach((expense) => {
        if (!categoryBreakdown[expense.category]) {
          categoryBreakdown[expense.category] = {
            total: 0,
            count: 0,
            expenses: [],
          };
        }
        categoryBreakdown[expense.category].total += expense.amount;
        categoryBreakdown[expense.category].count += 1;
        categoryBreakdown[expense.category].expenses.push(expense);
      });

      // Sort categories by total amount (descending)
      const sortedCategories = Object.entries(categoryBreakdown).sort(
        (a, b) => b[1].total - a[1].total
      );

      return {
        success: true,
        breakdown: sortedCategories,
        total: expenseResult.total,
        period,
        startDate: expenseResult.startDate,
        endDate: expenseResult.endDate,
      };
    } catch (error) {
      console.error("Expense breakdown error:", error);
      return {
        success: false,
        message: "Failed to generate expense breakdown. Please try again.",
      };
    }
  }

  /**
   * Generate expense recorded message
   */
  generateExpenseRecordedMessage(expense) {
    let message = ` *EXPENSE RECORDED*\n\n`;
    message += `Amount: $${expense.amount.toFixed(2)}\n`;
    message += `Description: ${expense.description}\n`;
    message += `Category: ${expense.category.toUpperCase()}\n`;
    message += `Payment: ${expense.paymentMethod.toUpperCase()}\n`;
    message += `Date: ${expense.date.toLocaleString()}\n`;

    if (expense.receiptNumber) {
      message += `Receipt: ${expense.receiptNumber}\n`;
    }

    message += `\nUse "expenses daily" to track your spending.`;

    return message;
  }

  /**
   * Generate expenses report message
   */
  generateExpensesReportMessage(expenses, total, period, startDate, endDate) {
    const periodText =
      period === "daily"
        ? "TODAY"
        : period === "weekly"
        ? "THIS WEEK"
        : period === "monthly"
        ? "THIS MONTH"
        : period.toUpperCase();

    let message = `*EXPENSES REPORT - ${periodText}*\n\n`;
    message += `Period: ${startDate.toDateString()} - ${endDate.toDateString()}\n`;
    message += `Total Expenses: $${total.toFixed(2)}\n`;
    message += `Number of Expenses: ${expenses.length}\n\n`;

    if (expenses.length === 0) {
      message += `No expenses recorded for this period.`;
      return message;
    }

    message += `*RECENT EXPENSES:*\n\n`;

    expenses.slice(0, 5).forEach((expense, index) => {
      message += `${index + 1}. $${expense.amount.toFixed(2)}\n`;
      message += `   ${expense.description}\n`;
      message += `   Category: ${expense.category}\n`;
      message += `   Date: ${expense.date.toLocaleDateString()}\n\n`;
    });

    if (expenses.length > 5) {
      message += `... and ${expenses.length - 5} more expenses\n\n`;
    }

    message += `*Insights:*\n`;

    let daysInPeriod = 1;
    if (period === "weekly") {
      daysInPeriod = 7;
    } else if (period === "monthly") {
      daysInPeriod = 30;
    }

    const dailyAverage = expenses.length > 0 ? total / daysInPeriod : 0;
    message += `• Daily Average: $${dailyAverage.toFixed(2)}\n`;

    // Safely calculate largest expense
    if (expenses.length > 0) {
      const maxAmount = Math.max(...expenses.map((e) => e.amount));
      message += `• Largest Expense: $${maxAmount.toFixed(2)}\n`;
    } else {
      message += `• Largest Expense: $0.00\n`;
    }

    message += `• Use "expense breakdown" to see by category`;

    return message;
  }

  /**
   * Generate profit report message
   */
  generateProfitReportMessage(profitData) {
    const periodText =
      profitData.period === "daily"
        ? "TODAY"
        : profitData.period === "weekly"
        ? "THIS WEEK"
        : profitData.period === "monthly"
        ? "THIS MONTH"
        : profitData.period.toUpperCase();

    let message = `*PROFIT & LOSS - ${periodText}*\n\n`;
    message += `Period: ${profitData.startDate.toDateString()} - ${profitData.endDate.toDateString()}\n\n`;

    message += `*REVENUE*\n`;
    message += `Total Sales: $${profitData.revenue.toFixed(2)}\n`;
    message += `Transactions: ${profitData.salesCount}\n\n`;

    message += `*EXPENSES*\n`;
    message += `Total Expenses: $${profitData.expenses.toFixed(2)}\n`;
    message += `Expense Items: ${profitData.expensesCount}\n\n`;

    message += ` *PROFIT/LOSS*\n`;
    const profitColor = profitData.profit >= 0 ? "🟢" : "🔴";
    const profitStatus = profitData.profit >= 0 ? "PROFIT" : "LOSS";
    message += `${profitColor} ${profitStatus}: $${Math.abs(
      profitData.profit
    ).toFixed(2)}\n\n`;

    // Calculate margins
    const profitMargin =
      profitData.revenue > 0
        ? (profitData.profit / profitData.revenue) * 100
        : 0;
    const expenseRatio =
      profitData.revenue > 0
        ? (profitData.expenses / profitData.revenue) * 100
        : 0;

    message += `*BUSINESS METRICS*\n`;
    message += `Profit Margin: ${profitMargin.toFixed(1)}%\n`;
    message += `Expense Ratio: ${expenseRatio.toFixed(1)}%\n`;
    message += `Net per Transaction: $${(
      profitData.profit / (profitData.salesCount || 1)
    ).toFixed(2)}\n\n`;

    message += `*Recommendations:*\n`;
    if (profitData.profit < 0) {
      message += `• Review your expenses with "expense breakdown"\n`;
      message += `• Consider increasing prices or reducing costs\n`;
    } else if (profitMargin < 10) {
      message += `• Thin margins, look for cost savings\n`;
      message += `• Use "expense breakdown" to identify areas\n`;
    } else {
      message += `• Healthy profit margin! Keep it up\n`;
    }

    return message;
  }

  /**
   * Generate expense breakdown message
   */
  generateExpenseBreakdownMessage(breakdownResult) {
    const periodText =
      {
        daily: "TODAY",
        weekly: "THIS WEEK",
        monthly: "THIS MONTH",
      }[breakdownResult.period] || breakdownResult.period.toUpperCase();

    let message = `*EXPENSE BREAKDOWN - ${periodText}*\n\n`;
    message += `Period: ${breakdownResult.startDate.toDateString()} - ${breakdownResult.endDate.toDateString()}\n`;
    message += `Total Expenses: $${breakdownResult.total.toFixed(2)}\n\n`;

    const categoryNames = {
      supplies: "Supplies",
      utilities: "Utilities",
      rent: "Rent",
      salary: "Salary",
      transport: "Transport",
      marketing: "Marketing",
      maintenance: "Maintenance",
      taxes: "Taxes",
      insurance: "Insurance",
      packaging: "Packaging",
      other: "Other",
      purchases: "Purchases",
      sales: "Sales",
      salary_wages: "Salary & Wages",
      equipment: "Equipment",
      market_fees: "Market Fees",
      table_rental: "Table Rental",
      stall_decor: "Stall Decor",
      generator: "Generator",
      bank_fees: "Bank Fees",
      internet_data: "Internet & Data",
      software: "Software",
      pos_fees: "POS Fees",
      discounts: "Discounts",
      refunds: "Refunds",
      loyalty: "Loyalty Program",
      office: "Office Supplies",
      cleaning: "Cleaning",
      security: "Security",
      licenses: "Licenses",
    };

    message += `*BY CATEGORY:*\n\n`;

    if (!breakdownResult.breakdown || breakdownResult.breakdown.length === 0) {
      message += `No expense data available.`;
      return message;
    }

    breakdownResult.breakdown.forEach(([category, data]) => {
      const percentage = ((data.total / breakdownResult.total) * 100).toFixed(
        1
      );
      const categoryName = categoryNames[category] || category;

      message += `*${categoryName}*\n`;
      message += `   Amount: $${data.total.toFixed(2)} (${percentage}%)\n`;
      message += `   Items: ${data.count}\n`;
      message += `   Average: $${(data.total / data.count).toFixed(2)}\n\n`;
    });

    // Largest category insight
    const largestCategory = breakdownResult.breakdown[0]; // Assuming sorted
    if (largestCategory) {
      const largestPercentage = (
        (largestCategory[1].total / breakdownResult.total) *
        100
      ).toFixed(0);
      const largestName =
        categoryNames[largestCategory[0]] || largestCategory[0];
      message += `*Insight:* Largest expense is ${largestName} (${largestPercentage}% of total)`;
    }

    return message;
  }
}

export default new ExpenseService();
