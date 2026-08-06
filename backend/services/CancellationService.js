import mongoose from "mongoose";
import Sale from "../models/Sale.js";
import Customer from "../models/Customer.js";
import InventoryService from "./InventoryService.js";

class CancellationService {
  /**
   * Cancel the most recent sale
   */
  async cancelLastSale(shopId, reason = "No reason provided") {
    try {
      const lastSale = await Sale.findOne({
        shopId,
        isCancelled: false,
      }).sort({ date: -1 });

      if (!lastSale) {
        return { success: false, message: "No recent sales found to cancel." };
      }

      return await this.processCancellation(lastSale, reason);
    } catch (error) {
      console.error("Cancel last sale error:", error);
      return {
        success: false,
        message: "Failed to cancel sale. Please try again.",
      };
    }
  }

  /**
   * Cancel a specific sale by ID or index
   */
  async cancelSpecificSale(
    shopId,
    saleIdentifier,
    reason = "No reason provided"
  ) {
    try {
      let sale;

      if (saleIdentifier.match(/^[0-9a-fA-F]{24}$/)) {
        sale = await Sale.findOne({
          _id: saleIdentifier,
          shopId,
          isCancelled: false,
        });
      } else {
        const sales = await Sale.find({
          shopId,
          isCancelled: false,
        })
          .sort({ date: -1 })
          .limit(10);

        const index = parseInt(saleIdentifier) - 1;
        if (index >= 0 && index < sales.length) {
          sale = sales[index];
        }
      }

      if (!sale) {
        return {
          success: false,
          message: `Sale "${saleIdentifier}" not found or already cancelled.`,
        };
      }

      return await this.processCancellation(sale, reason);
    } catch (error) {
      console.error("Cancel specific sale error:", error);
      return {
        success: false,
        message: "Failed to cancel sale. Please try again.",
      };
    }
  }

  /**
   * Run work inside a Mongo transaction when supported; otherwise run plain.
   */
  async withOptionalTransaction(work) {
    let session = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      const result = await work(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch (_) {
          /* ignore */
        }
      }

      const needsFallback =
        /replica set|transactions? (are|is) not supported|Transaction numbers/i.test(
          error.message || ""
        );

      if (needsFallback) {
        return await work(null);
      }

      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  /**
   * Full reversal: restore stock, reverse credit balance if needed, mark cancelled.
   */
  async processCancellation(sale, reason) {
    try {
      if (sale.isCancelled) {
        return {
          success: false,
          message: "This sale is already cancelled.",
        };
      }

      await this.withOptionalTransaction(async (session) => {
        await InventoryService.restoreSaleItems(sale.items, session);

        if (sale.type === "credit" && sale.customerId) {
          await this.reverseCreditSale(sale, reason, session);
        }

        sale.isCancelled = true;
        sale.cancelledAt = new Date();
        sale.cancellationReason = reason;
        sale.cancelledBy = "owner";
        sale.status = "cancelled";

        if (session) {
          await sale.save({ session });
        } else {
          await sale.save();
        }
      });

      return {
        success: true,
        message: this.generateCancellationMessage(sale, reason),
        sale,
      };
    } catch (error) {
      console.error("Process cancellation error:", error);
      return {
        success: false,
        message: `Failed to process cancellation: ${error.message}`,
      };
    }
  }

  /**
   * Reverse customer balance for a cancelled credit sale.
   */
  async reverseCreditSale(sale, reason, session = null) {
    const query = Customer.findById(sale.customerId);
    if (session) query.session(session);
    const customer = await query;

    if (!customer) {
      console.warn(
        `[CancellationService] Customer ${sale.customerId} not found for credit reversal`
      );
      return;
    }

    const reverseAmount = sale.balanceDue > 0 ? sale.balanceDue : sale.total;
    const balanceBefore = customer.currentBalance;
    customer.currentBalance = Math.max(
      0,
      customer.currentBalance - reverseAmount
    );

    customer.creditTransactions.push({
      type: "reversal",
      amount: reverseAmount,
      items: sale.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      })),
      description: `Sale cancelled: ${reason}`,
      date: new Date(),
      balanceBefore,
      balanceAfter: customer.currentBalance,
    });

    if (session) {
      await customer.save({ session });
    } else {
      await customer.save();
    }
  }

  /**
   * Generate cancellation confirmation message
   */
  generateCancellationMessage(sale, reason) {
    let message = `*SALE CANCELLED SUCCESSFULLY*\n\n`;
    message += `Original Sale: ${sale.date.toLocaleString()}\n`;
    message += `Type: ${sale.type || "cash"}\n`;
    message += `Items Returned to Stock:\n`;

    sale.items.forEach((item) => {
      message += `• ${item.quantity}x ${item.productName}\n`;
    });

    message += `\nRefund Amount: $${sale.total.toFixed(2)}\n`;

    if (sale.type === "credit") {
      message += `Customer credit balance reversed.\n`;
    }

    message += `Reason: ${reason}\n`;
    message += `Cancelled: ${new Date().toLocaleString()}\n\n`;
    message += `Stock levels have been updated.`;

    return message;
  }

  /**
   * Structured refunds data for API + chat formatting.
   */
  async getRefundsData(shopId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const cancelledSales = await Sale.find({
      shopId,
      isCancelled: true,
      cancelledAt: { $gte: startDate },
    }).sort({ cancelledAt: -1 });

    const totalRefundAmount = cancelledSales.reduce(
      (sum, sale) => sum + sale.total,
      0
    );

    const sales = cancelledSales.map((sale) => ({
      id: String(sale._id),
      type: sale.type,
      total: sale.total,
      customerName: sale.customerName || null,
      items: sale.items,
      cancelledAt: sale.cancelledAt,
      cancellationReason: sale.cancellationReason || null,
      date: sale.date,
    }));

    return { days, sales, totalRefundAmount };
  }

  formatRefundsMessage({ days, sales, totalRefundAmount }) {
    if (!sales.length) {
      return `*REFUNDS REPORT*\n\nNo refunds/cancellations in the last ${days} days.`;
    }

    let report = `*REFUNDS REPORT - Last ${days} Days*\n\n`;
    report += `Total Refunded: $${totalRefundAmount.toFixed(2)}\n`;
    report += `Total Cancellations: ${sales.length}\n`;
    report += `Refund Rate: ${(
      (sales.length / (sales.length + 100)) *
      100
    ).toFixed(1)}%\n\n`;

    report += `*Recent Cancellations:*\n`;
    sales.slice(0, 10).forEach((sale, index) => {
      const itemsSummary = (sale.items || [])
        .map((item) => `${item.quantity}x ${item.productName}`)
        .join(", ");
      const when = sale.cancelledAt
        ? new Date(sale.cancelledAt).toLocaleDateString()
        : "—";

      report += `\n${index + 1}. ${when}\n`;
      report += `   Amount: $${sale.total.toFixed(2)}\n`;
      report += `   Items: ${itemsSummary}\n`;
      report += `   Reason: ${sale.cancellationReason || "—"}\n`;
    });

    if (sales.length > 10) {
      report += `\n... and ${sales.length - 10} more cancellations`;
    }

    return report;
  }

  /**
   * Get refunds report (chat-formatted text)
   */
  async getRefundsReport(shopId, days = 30) {
    try {
      const data = await this.getRefundsData(shopId, days);
      return this.formatRefundsMessage(data);
    } catch (error) {
      console.error("Refunds report error:", error);
      return "Failed to generate refunds report. Please try again.";
    }
  }

  /**
   * Get recent sales for cancellation selection
   */
  async getRecentSalesForCancellation(shopId, limit = 5) {
    try {
      const recentSales = await Sale.find({
        shopId,
        isCancelled: false,
      })
        .sort({ date: -1 })
        .limit(limit)
        .select(
          "date total items type status amountPaid balanceDue costTotal profit isCancelled customerId customerName customerPhone"
        );

      if (recentSales.length === 0) {
        return { success: false, message: "No recent sales found." };
      }

      let message = `*RECENT SALES - Select to Cancel*\n\n`;

      recentSales.forEach((sale, index) => {
        const itemsSummary = sale.items
          .slice(0, 2)
          .map((item) => `${item.quantity}x ${item.productName}`)
          .join(", ");

        const moreItems =
          sale.items.length > 2 ? ` +${sale.items.length - 2} more` : "";

        message += `${index + 1}. ${sale.date.toLocaleString()}\n`;
        message += `   Amount: $${sale.total.toFixed(2)} (${sale.type || "cash"})\n`;
        if (sale.customerName) {
          message += `   Customer: ${sale.customerName}\n`;
        }
        message += `   Items: ${itemsSummary}${moreItems}\n\n`;
      });

      message += `*Usage:*\n`;
      message += `• "cancel last" - Cancel most recent sale\n`;
      message += `• "cancel sale 2" - Cancel sale #2 from this list\n`;
      message += `• "cancel sale [reason]" - Add cancellation reason`;

      return {
        success: true,
        message,
        sales: recentSales,
      };
    } catch (error) {
      console.error("Get recent sales error:", error);
      return { success: false, message: "Failed to fetch recent sales." };
    }
  }
}

export default new CancellationService();
