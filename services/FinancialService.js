import Sale from '../models/Sale.js';
import Customer from '../models/Customer.js';
import Expense from '../models/Expense.js';
import LayBye from '../models/LayBye.js';
import mongoose from 'mongoose';

/**
 * Unified Financial Service
 * Eliminates credit code redundancy and provides comprehensive financial tracking
 * 
 * FIXED: ObjectId instantiation issues - now uses 'new mongoose.Types.ObjectId()'
 */
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

  /**
   * Calculate comprehensive cash flow for any period
   * This is the single source of truth for all financial calculations
   */
  async calculateCashFlow(shopId, startDate, endDate) {
    try {
      // Ensure shopId is ObjectId for aggregations
      const shopObjectId = this.toObjectId(shopId);

      // CASH INFLOWS
      // 1. Cash sales (immediate payment)
      const cashSales = await Sale.find({
        shopId,
        date: { $gte: startDate, $lte: endDate },
        type: 'cash',
        isCancelled: false,
      });

      const cashSalesTotal = cashSales.reduce((sum, sale) => sum + sale.total, 0);

      // 2. Customer debt payments (not sales, just payments received)
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

      // 3. Laybye installment payments (cash received for laybyes)
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

      // TOTAL CASH IN
      const totalCashIn = cashSalesTotal + debtPaymentsTotal + laybyePaymentsTotal;

      // CASH OUTFLOWS
      // 1. Business expenses
      const expenses = await Expense.find({
        shopId,
        date: { $gte: startDate, $lte: endDate },
      });

      const expensesTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);

      // 2. Refunds (cancelled sales)
      const refunds = await Sale.find({
        shopId,
        cancelledAt: { $gte: startDate, $lte: endDate },
        isCancelled: true,
      });

      const refundsTotal = refunds.reduce((sum, sale) => sum + sale.total, 0);

      // TOTAL CASH OUT
      const totalCashOut = expensesTotal + refundsTotal;

      // NET CASH FLOW
      const netCashFlow = totalCashIn - totalCashOut;

      // REVENUE RECOGNITION (Accrual basis)
      // 1. Credit sales (revenue recognized but not cash received)
      const creditSales = await Sale.find({
        shopId,
        date: { $gte: startDate, $lte: endDate },
        type: 'credit',
        isCancelled: false,
      });

      const creditSalesTotal = creditSales.reduce((sum, sale) => sum + sale.total, 0);

      // 2. Completed laybyes (revenue recognized when fully paid)
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

      // TOTAL REVENUE (all sales recognized)
      const totalRevenue = cashSalesTotal + creditSalesTotal + completedLaybyesTotal;

      // PROFITABILITY
      const grossProfit = 
        cashSales.reduce((sum, sale) => sum + (sale.profit || 0), 0) +
        creditSales.reduce((sum, sale) => sum + (sale.profit || 0), 0) +
        completedLaybyes.reduce((sum, sale) => sum + (sale.profit || 0), 0);

      const netProfit = grossProfit - expensesTotal;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // OUTSTANDING BALANCES
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

  /**
   * Generate comprehensive cash flow report with insights
   */
  async generateCashFlowReport(shopId, startDate, endDate, period = 'daily') {
    try {
      const cashFlow = await this.calculateCashFlow(shopId, startDate, endDate);

      if (!cashFlow.success) {
        return cashFlow;
      }

      const expenseBreakdown = await this.categorizeExpenses(shopId, startDate, endDate);

      const periodText =
        period === 'daily' ? 'TODAY' : period === 'weekly' ? 'THIS WEEK' : 'THIS MONTH';

      let report = `*COMPREHENSIVE FINANCIAL REPORT - ${periodText}*\n\n`;
      report += `Period: ${startDate.toDateString()} - ${endDate.toDateString()}\n\n`;

      // CASH FLOW SECTION
      report += `*💵 CASH FLOW (Actual Money Movement)*\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      report += `CASH IN:\n`;
      report += `• Cash Sales: $${cashFlow.cashFlow.inflows.cashSales.amount.toFixed(2)} (${
        cashFlow.cashFlow.inflows.cashSales.count
      } sales)\n`;
      report += `• Debt Payments: $${cashFlow.cashFlow.inflows.debtPayments.amount.toFixed(
        2
      )} (${cashFlow.cashFlow.inflows.debtPayments.count} payments)\n`;
      report += `• Laybye Payments: $${cashFlow.cashFlow.inflows.laybyePayments.amount.toFixed(
        2
      )} (${cashFlow.cashFlow.inflows.laybyePayments.count} payments)\n`;
      report += `*Total Cash In: $${cashFlow.cashFlow.inflows.total.toFixed(2)}*\n\n`;

      report += `CASH OUT:\n`;
      report += `• Expenses: $${cashFlow.cashFlow.outflows.expenses.amount.toFixed(2)} (${
        cashFlow.cashFlow.outflows.expenses.count
      } items)\n`;
      report += `• Refunds: $${cashFlow.cashFlow.outflows.refunds.amount.toFixed(2)} (${
        cashFlow.cashFlow.outflows.refunds.count
      } refunds)\n`;
      report += `*Total Cash Out: $${cashFlow.cashFlow.outflows.total.toFixed(2)}*\n\n`;

      const netIcon = cashFlow.cashFlow.net >= 0 ? '🟢' : '🔴';
      report += `${netIcon} *NET CASH FLOW: $${cashFlow.cashFlow.net.toFixed(2)}*\n\n`;

      // REVENUE RECOGNITION SECTION
      report += `*📊 REVENUE RECOGNITION (Accrual Basis)*\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      report += `• Cash Sales: $${cashFlow.revenue.cash.amount.toFixed(2)} (${
        cashFlow.revenue.cash.count
      })\n`;
      report += `• Credit Sales: $${cashFlow.revenue.credit.amount.toFixed(2)} (${
        cashFlow.revenue.credit.count
      })\n`;
      report += `• Completed Laybyes: $${cashFlow.revenue.completedLaybyes.amount.toFixed(
        2
      )} (${cashFlow.revenue.completedLaybyes.count})\n`;
      report += `*Total Revenue: $${cashFlow.revenue.total.toFixed(2)}*\n\n`;

      // PROFITABILITY SECTION
      report += `*💰 PROFITABILITY*\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      report += `• Gross Profit: $${cashFlow.profitability.grossProfit.toFixed(2)}\n`;
      report += `• Total Expenses: $${cashFlow.profitability.expenses.toFixed(2)}\n`;
      report += `• Net Profit: $${cashFlow.profitability.netProfit.toFixed(2)}\n`;
      report += `• Profit Margin: ${cashFlow.profitability.profitMargin.toFixed(1)}%\n\n`;

      // EXPENSE BREAKDOWN
      if (expenseBreakdown.success && expenseBreakdown.categories.length > 0) {
        report += `*📋 EXPENSE BREAKDOWN*\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        expenseBreakdown.categories.slice(0, 5).forEach((cat) => {
          const categoryName =
            cat.category.charAt(0).toUpperCase() + cat.category.slice(1);
          report += `• ${categoryName}: $${cat.total.toFixed(
            2
          )} (${cat.percentage.toFixed(1)}%)\n`;
        });

        if (expenseBreakdown.categories.length > 5) {
          report += `... and ${expenseBreakdown.categories.length - 5} more categories\n`;
        }
        report += `\nUse "expense breakdown" for detailed view\n\n`;
      }

      // OUTSTANDING BALANCES
      report += `*⏰ OUTSTANDING BALANCES*\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      report += `• Customer Credit: $${cashFlow.outstanding.creditDue.amount.toFixed(2)} (${
        cashFlow.outstanding.creditDue.customers
      } customers)\n`;
      report += `• Active Laybyes: $${cashFlow.outstanding.laybyeDue.amount.toFixed(2)} (${
        cashFlow.outstanding.laybyeDue.count
      } laybyes)\n`;
      report += `*Total Outstanding: $${cashFlow.outstanding.total.toFixed(2)}*\n\n`;

      // INSIGHTS
      report += `*💡 KEY INSIGHTS*\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      // Cash flow insight
      if (cashFlow.cashFlow.net > 0) {
        report += `✓ Positive cash flow of $${cashFlow.cashFlow.net.toFixed(2)}\n`;
      } else if (cashFlow.cashFlow.net < 0) {
        report += `⚠️ Negative cash flow of $${Math.abs(cashFlow.cashFlow.net).toFixed(
          2
        )}\n`;
        report += `  Consider reviewing expenses or collecting outstanding debts\n`;
      }

      // Credit sales insight
      const creditPercentage =
        cashFlow.revenue.total > 0
          ? (cashFlow.revenue.credit.amount / cashFlow.revenue.total) * 100
          : 0;
      if (creditPercentage > 30) {
        report += `⚠️ Credit sales are ${creditPercentage.toFixed(
          1
        )}% of revenue - high credit risk\n`;
      }

      // Outstanding debt insight
      if (cashFlow.outstanding.total > cashFlow.revenue.total * 0.5) {
        report += `⚠️ Outstanding debts ($${cashFlow.outstanding.total.toFixed(
          2
        )}) exceed 50% of revenue\n`;
      }

      // Expense ratio insight
      const expenseRatio =
        cashFlow.revenue.total > 0
          ? (cashFlow.profitability.expenses / cashFlow.revenue.total) * 100
          : 0;
      if (expenseRatio > 40) {
        report += `⚠️ Expenses are ${expenseRatio.toFixed(
          1
        )}% of revenue - consider cost reduction\n`;
      } else {
        report += `✓ Healthy expense ratio at ${expenseRatio.toFixed(1)}%\n`;
      }

      return {
        success: true,
        report,
        data: cashFlow,
      };
    } catch (error) {
      console.error('[FinancialService] Cash flow report error:', error);
      return {
        success: false,
        message: `Failed to generate cash flow report: ${error.message}`,
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