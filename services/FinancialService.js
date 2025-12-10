import Sale from '../models/Sale.js';
import Customer from '../models/Customer.js';
import Expense from '../models/Expense.js';
import LayBye from '../models/LayBye.js';
import mongoose from 'mongoose';

class FinancialService {
  /**
   * Helper to ensure shopId is an ObjectId
   */
  toObjectId(id) {
    if (id instanceof mongoose.Types.ObjectId) {
      return id;
    }
    return new mongoose.Types.ObjectId(id);
  }

  async calculateCashFlow(shopId, startDate, endDate) {
    try {
      const shopObjectId = this.toObjectId(shopId);

      const cashSales = await Sale.find({
        shopId,
        date: { $gte: startDate, $lte: endDate },
        type: 'cash',
        isCancelled: false,
      });

      const cashSalesTotal = cashSales.reduce((sum, sale) => sum + sale.total, 0);

      const customerPayments = await Customer.aggregate([
        { $match: { shopId: shopObjectId } },
        { $unwind: '$creditTransactions' },
        {
          $match: {
            'creditTransactions.type': 'payment',
            'creditTransactions.date': { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$creditTransactions.amount' },
            count: { $sum: 1 },
          },
        },
      ]);

      const debtPaymentsTotal = customerPayments[0]?.total || 0;
      const debtPaymentsCount = customerPayments[0]?.count || 0;

      const laybyePayments = await LayBye.aggregate([
        {
          $match: {
            shopId: shopObjectId,
            'installments.date': { $gte: startDate, $lte: endDate },
          },
        },
        { $unwind: '$installments' },
        {
          $match: {
            'installments.date': { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$installments.amount' },
            count: { $sum: 1 },
          },
        },
      ]);

      const laybyePaymentsTotal = laybyePayments[0]?.total || 0;
      const laybyePaymentsCount = laybyePayments[0]?.count || 0;

      const totalCashIn = cashSalesTotal + debtPaymentsTotal + laybyePaymentsTotal;

      const expenses = await Expense.find({
        shopId,
        date: { $gte: startDate, $lte: endDate },
      });

      const expensesTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);

      const refunds = await Sale.find({
        shopId,
        cancelledAt: { $gte: startDate, $lte: endDate },
        isCancelled: true,
      });

      const refundsTotal = refunds.reduce((sum, sale) => sum + sale.total, 0);

      const totalCashOut = expensesTotal + refundsTotal;

      const netCashFlow = totalCashIn - totalCashOut;

      const creditSales = await Sale.find({
        shopId,
        date: { $gte: startDate, $lte: endDate },
        type: 'credit',
        isCancelled: false,
      });

      const creditSalesTotal = creditSales.reduce((sum, sale) => sum + sale.total, 0);

      const completedLaybyes = await Sale.find({
        shopId,
        date: { $gte: startDate, $lte: endDate },
        type: 'completed_laybye',
        isCancelled: false,
      });

      const completedLaybyesTotal = completedLaybyes.reduce(
        (sum, sale) => sum + sale.total,
        0
      );

      const totalRevenue = cashSalesTotal + creditSalesTotal + completedLaybyesTotal;

      const grossProfit = 
        cashSales.reduce((sum, sale) => sum + (sale.profit || 0), 0) +
        creditSales.reduce((sum, sale) => sum + (sale.profit || 0), 0) +
        completedLaybyes.reduce((sum, sale) => sum + (sale.profit || 0), 0);

      const netProfit = grossProfit - expensesTotal;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      const activeLaybyes = await LayBye.find({ shopId, status: 'active' });
      const totalLaybyeDue = activeLaybyes.reduce((sum, lb) => sum + lb.balanceDue, 0);

      const customersWithCredit = await Customer.find({
        shopId,
        currentBalance: { $gt: 0 },
      });
      const totalCreditDue = customersWithCredit.reduce(
        (sum, c) => sum + c.currentBalance,
        0
      );

      return {
        success: true,
        period: { startDate, endDate },

        // Cash Flow (actual money movement)
        cashFlow: {
          inflows: {
            cashSales: { amount: cashSalesTotal, count: cashSales.length },
            debtPayments: { amount: debtPaymentsTotal, count: debtPaymentsCount },
            laybyePayments: { amount: laybyePaymentsTotal, count: laybyePaymentsCount },
            total: totalCashIn,
          },
          outflows: {
            expenses: { amount: expensesTotal, count: expenses.length },
            refunds: { amount: refundsTotal, count: refunds.length },
            total: totalCashOut,
          },
          net: netCashFlow,
        },

        // Revenue Recognition (accrual basis)
        revenue: {
          cash: { amount: cashSalesTotal, count: cashSales.length },
          credit: { amount: creditSalesTotal, count: creditSales.length },
          completedLaybyes: {
            amount: completedLaybyesTotal,
            count: completedLaybyes.length,
          },
          total: totalRevenue,
        },

        // Profitability
        profitability: {
          grossProfit,
          expenses: expensesTotal,
          netProfit,
          profitMargin,
        },

        // Outstanding
        outstanding: {
          creditDue: { amount: totalCreditDue, customers: customersWithCredit.length },
          laybyeDue: { amount: totalLaybyeDue, count: activeLaybyes.length },
          total: totalCreditDue + totalLaybyeDue,
        },

        // Transaction counts
        transactions: {
          totalSales: cashSales.length + creditSales.length + completedLaybyes.length,
          expenses: expenses.length,
          refunds: refunds.length,
        },

        // Detailed data for reports
        details: {
          expenses,
          cashSales,
          creditSales,
          completedLaybyes,
          refunds,
        },
      };
    } catch (error) {
      console.error('[FinancialService] Cash flow calculation error:', error);
      return {
        success: false,
        message: `Failed to calculate cash flow: ${error.message}`,
      };
    }
  }

  /**
   * Get expense breakdown by category
   */
  async categorizeExpenses(shopId, startDate, endDate) {
    try {
      const expenses = await Expense.find({
        shopId,
        date: { $gte: startDate, $lte: endDate },
      });

      const categoryBreakdown = {};
      let total = 0;

      expenses.forEach((expense) => {
        if (!categoryBreakdown[expense.category]) {
          categoryBreakdown[expense.category] = {
            total: 0,
            count: 0,
            items: [],
          };
        }
        categoryBreakdown[expense.category].total += expense.amount;
        categoryBreakdown[expense.category].count += 1;
        categoryBreakdown[expense.category].items.push(expense);
        total += expense.amount;
      });

      // Sort by total amount
      const sorted = Object.entries(categoryBreakdown)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([category, data]) => ({
          category,
          ...data,
          percentage: total > 0 ? (data.total / total) * 100 : 0,
        }));

      return {
        success: true,
        categories: sorted,
        total,
        count: expenses.length,
      };
    } catch (error) {
      console.error('[FinancialService] Expense categorization error:', error);
      return {
        success: false,
        message: `Failed to categorize expenses: ${error.message}`,
      };
    }
  }
async generateCashFlowReport(shopId, startDate, endDate, period = 'daily') {
  try {
    const cashFlow = await this.calculateCashFlow(shopId, startDate, endDate);
    if (!cashFlow.success) return cashFlow;

    const expenseBreakdown = await this.categorizeExpenses(shopId, startDate, endDate);

    const periodText =
      period === 'daily' ? 'TODAY' :
      period === 'weekly' ? 'THIS WEEK' :
      'THIS MONTH';

    let report = `FINANCIAL REPORT - ${periodText}\n\n`;
    report += `Period: ${startDate.toDateString()} to ${endDate.toDateString()}\n\n`;

    // CASH FLOW
    report += `CASH FLOW (Real Money In and Out)\n`;
    report += `----------------------------------------\n\n`;

    report += `MONEY IN:\n`;
    report += `- Cash Sales: $${cashFlow.cashFlow.inflows.cashSales.amount.toFixed(2)} (${cashFlow.cashFlow.inflows.cashSales.count} sales)\n`;
    report += `- Debt Payments Received: $${cashFlow.cashFlow.inflows.debtPayments.amount.toFixed(2)} (${cashFlow.cashFlow.inflows.debtPayments.count} payments)\n`;
    report += `- Laybye Payments Received: $${cashFlow.cashFlow.inflows.laybyePayments.amount.toFixed(2)} (${cashFlow.cashFlow.inflows.laybyePayments.count} payments)\n`;
    report += `Total Money In: $${cashFlow.cashFlow.inflows.total.toFixed(2)}\n\n`;

    report += `MONEY OUT:\n`;
    report += `- Expenses Paid: $${cashFlow.cashFlow.outflows.expenses.amount.toFixed(2)} (${cashFlow.cashFlow.outflows.expenses.count} items)\n`;
    report += `- Refunds Given: $${cashFlow.cashFlow.outflows.refunds.amount.toFixed(2)} (${cashFlow.cashFlow.outflows.refunds.count} refunds)\n`;
    report += `Total Money Out: $${cashFlow.cashFlow.outflows.total.toFixed(2)}\n\n`;

    const netText =
      cashFlow.cashFlow.net >= 0
        ? `Net Cash Flow (Money Left Over): $${cashFlow.cashFlow.net.toFixed(2)}\n\n`
        : `Net Cash Flow (Money Lost): -$${Math.abs(cashFlow.cashFlow.net).toFixed(2)}\n\n`;

    report += netText;

    // REVENUE (Accrual)
    report += `REVENUE (Recorded Sales)\n`;
    report += `----------------------------------------\n\n`;
    report += `- Cash Sales: $${cashFlow.revenue.cash.amount.toFixed(2)} (${cashFlow.revenue.cash.count})\n`;
    report += `- Credit Sales: $${cashFlow.revenue.credit.amount.toFixed(2)} (${cashFlow.revenue.credit.count})\n`;
    report += `- Completed Laybyes: $${cashFlow.revenue.completedLaybyes.amount.toFixed(2)} (${cashFlow.revenue.completedLaybyes.count})\n`;
    report += `Total Revenue: $${cashFlow.revenue.total.toFixed(2)}\n\n`;

    // PROFITABILITY
    report += `PROFIT\n`;
    report += `----------------------------------------\n\n`;
    report += `- Gross Profit: $${cashFlow.profitability.grossProfit.toFixed(2)}\n`;
    report += `- Total Expenses: $${cashFlow.profitability.expenses.toFixed(2)}\n`;
    report += `- Net Profit: $${cashFlow.profitability.netProfit.toFixed(2)}\n`;
    report += `- Profit Margin: ${cashFlow.profitability.profitMargin.toFixed(1)}%\n\n`;

    // EXPENSE BREAKDOWN
    if (expenseBreakdown.success && expenseBreakdown.categories.length > 0) {
      report += `EXPENSE BREAKDOWN\n`;
      report += `----------------------------------------\n\n`;

      expenseBreakdown.categories.slice(0, 5).forEach((cat) => {
        const categoryName = cat.category.charAt(0).toUpperCase() + cat.category.slice(1);
        report += `- ${categoryName}: $${cat.total.toFixed(2)} (${cat.percentage.toFixed(1)}%)\n`;
      });

      if (expenseBreakdown.categories.length > 5) {
        report += `... plus ${expenseBreakdown.categories.length - 5} more categories\n`;
      }

      report += `\nUse "expense breakdown" for full details.\n\n`;
    }

    // OUTSTANDING BALANCES
    report += `OUTSTANDING BALANCES (Money Owed)\n`;
    report += `----------------------------------------\n\n`;
    report += `- Customer Credit Owed: $${cashFlow.outstanding.creditDue.amount.toFixed(2)} (${cashFlow.outstanding.creditDue.customers} customers)\n`;
    report += `- Active Laybyes Owed: $${cashFlow.outstanding.laybyeDue.amount.toFixed(2)} (${cashFlow.outstanding.laybyeDue.count} laybyes)\n`;
    report += `Total Money Owed to Shop: $${cashFlow.outstanding.total.toFixed(2)}\n\n`;

    // SIMPLE INSIGHTS
    report += `INSIGHTS (Simple Notes)\n`;
    report += `----------------------------------------\n\n`;

    // Cash flow insight
    if (cashFlow.cashFlow.net > 0) {
      report += `- You have more money coming in than going out.\n`;
    } else if (cashFlow.cashFlow.net < 0) {
      report += `- You spent more money than you received. Consider reducing expenses or collecting money owed.\n`;
    }

    // Credit sales insight
    const creditPercent =
      cashFlow.revenue.total > 0
        ? (cashFlow.revenue.credit.amount / cashFlow.revenue.total) * 100
        : 0;

    if (creditPercent > 30) {
      report += `- Credit sales are high. Too many people buying on credit can be risky.\n`;
    }

    // Outstanding debt insight
    if (cashFlow.outstanding.total > cashFlow.revenue.total * 0.5) {
      report += `- Money owed to you is more than half of total revenue. This is dangerous.\n`;
    }

    // Expense ratio insight
    const expenseRatio =
      cashFlow.revenue.total > 0
        ? (cashFlow.profitability.expenses / cashFlow.revenue.total) * 100
        : 0;

    if (expenseRatio > 40) {
      report += `- Your expenses are too high. Try to reduce spending.\n`;
    } else {
      report += `- Your expenses are reasonable.\n`;
    }

    return {
      success: true,
      report,
      data: cashFlow,
    };

  } catch (error) {
    console.error('[FinancialService] Report error:', error);
    return {
      success: false,
      message: `Could not generate report: ${error.message}`,
    };
  }
}


  /**
   * Quick helper methods for common periods
   */
  async getDailyCashFlow(shopId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date();
    return await this.generateCashFlowReport(shopId, today, endDate, 'daily');
  }

  async getWeeklyCashFlow(shopId) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
    return await this.generateCashFlowReport(shopId, startDate, endDate, 'weekly');
  }

  async getMonthlyCashFlow(shopId) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);
    return await this.generateCashFlowReport(shopId, startDate, endDate, 'monthly');
  }
}

export default new FinancialService();