import Sale from '../models/Sale.js';
import Product from '../models/Product.js';

class CancellationService {
    /**
     * Cancel the most recent sale
     */
    async cancelLastSale(shopId, reason = 'No reason provided') {
        try {
            // Find the most recent non-cancelled sale
            const lastSale = await Sale.findOne({
                shopId,
                isCancelled: false
            }).sort({ date: -1 });

            if (!lastSale) {
                return { success: false, message: 'No recent sales found to cancel.' };
            }

            return await this.processCancellation(lastSale, reason);
        } catch (error) {
            console.error('Cancel last sale error:', error);
            return { success: false, message: 'Failed to cancel sale. Please try again.' };
        }
    }

    /**
     * Cancel a specific sale by ID or index
     */
    async cancelSpecificSale(shopId, saleIdentifier, reason = 'No reason provided') {
        try {
            let sale;

            // Check if it's a MongoDB ID
            if (saleIdentifier.match(/^[0-9a-fA-F]{24}$/)) {
                sale = await Sale.findOne({
                    _id: saleIdentifier,
                    shopId,
                    isCancelled: false
                });
            } else {
                // Treat as recent sales index (e.g., "cancel sale 3" for 3rd most recent)
                const sales = await Sale.find({
                    shopId,
                    isCancelled: false
                }).sort({ date: -1 }).limit(10);

                const index = parseInt(saleIdentifier) - 1;
                if (index >= 0 && index < sales.length) {
                    sale = sales[index];
                }
            }

            if (!sale) {
                return {
                    success: false,
                    message: `Sale "${saleIdentifier}" not found or already cancelled.`
                };
            }

            return await this.processCancellation(sale, reason);
        } catch (error) {
            console.error('Cancel specific sale error:', error);
            return { success: false, message: 'Failed to cancel sale. Please try again.' };
        }
    }

    /**
     * Process the actual cancellation
     */
    async processCancellation(sale, reason) {
        try {
            // Restore stock for all items in the sale
            for (const item of sale.items) {
                const product = await Product.findById(item.productId);
                if (product && product.trackStock) {
                    product.stock += item.quantity;
                    await product.save();
                }
            }

            // Mark sale as cancelled
            sale.isCancelled = true;
            sale.cancelledAt = new Date();
            sale.cancellationReason = reason;
            sale.cancelledBy = 'owner';
            await sale.save();

            return {
                success: true,
                message: this.generateCancellationMessage(sale, reason),
                sale: sale
            };
        } catch (error) {
            console.error('Process cancellation error:', error);
            throw new Error('Failed to process cancellation');
        }
    }

    /**
     * Generate cancellation confirmation message
     */
    generateCancellationMessage(sale, reason) {
        let message = `*SALE CANCELLED SUCCESSFULLY*\n\n`;
        message += `Original Sale: ${sale.date.toLocaleString()}\n`;
        message += `Items Returned to Stock:\n`;

        sale.items.forEach(item => {
            message += `• ${item.quantity}x ${item.productName}\n`;
        });

        message += `\nRefund Amount: $${sale.total.toFixed(2)}\n`;
        message += `Reason: ${reason}\n`;
        message += `Cancelled: ${new Date().toLocaleString()}\n\n`;
        message += `Stock levels have been updated.`;

        return message;
    }

    /**
     * Get refunds report
     */
    async getRefundsReport(shopId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const cancelledSales = await Sale.find({
                shopId,
                isCancelled: true,
                cancelledAt: { $gte: startDate }
            }).sort({ cancelledAt: -1 });

            if (cancelledSales.length === 0) {
                return `*REFUNDS REPORT*\n\nNo refunds/cancellations in the last ${days} days.`;
            }

            const totalRefundAmount = cancelledSales.reduce((sum, sale) => sum + sale.total, 0);

            let report = `*REFUNDS REPORT - Last ${days} Days*\n\n`;
            report += `Total Refunded: $${totalRefundAmount.toFixed(2)}\n`;
            report += `Total Cancellations: ${cancelledSales.length}\n`;
            report += `Refund Rate: ${((cancelledSales.length / (cancelledSales.length + 100)) * 100).toFixed(1)}%\n\n`;

            report += `*Recent Cancellations:*\n`;
            cancelledSales.slice(0, 10).forEach((sale, index) => {
                const itemsSummary = sale.items.map(item =>
                    `${item.quantity}x ${item.productName}`
                ).join(', ');

                report += `\n${index + 1}. ${sale.cancelledAt.toLocaleDateString()}\n`;
                report += `   Amount: $${sale.total.toFixed(2)}\n`;
                report += `   Items: ${itemsSummary}\n`;
                report += `   Reason: ${sale.cancellationReason}\n`;
            });

            if (cancelledSales.length > 10) {
                report += `\n... and ${cancelledSales.length - 10} more cancellations`;
            }

            return report;
        } catch (error) {
            console.error('Refunds report error:', error);
            return 'Failed to generate refunds report. Please try again.';
        }
    }

    /**
     * Get recent sales for cancellation selection
     */
    async getRecentSalesForCancellation(shopId, limit = 5) {
        try {
            const recentSales = await Sale.find({
                shopId,
                isCancelled: false
            })
                .sort({ date: -1 })
                .limit(limit)
                .select('date total items');

            if (recentSales.length === 0) {
                return { success: false, message: 'No recent sales found.' };
            }

            let message = `*RECENT SALES - Select to Cancel*\n\n`;

            recentSales.forEach((sale, index) => {
                const itemsSummary = sale.items.slice(0, 2)
                    .map(item => `${item.quantity}x ${item.productName}`)
                    .join(', ');

                const moreItems = sale.items.length > 2 ? ` +${sale.items.length - 2} more` : '';

                message += `${index + 1}. ${sale.date.toLocaleString()}\n`;
                message += `   Amount: $${sale.total.toFixed(2)}\n`;
                message += `   Items: ${itemsSummary}${moreItems}\n\n`;
            });

            message += `*Usage:*\n`;
            message += `• "cancel last" - Cancel most recent sale\n`;
            message += `• "cancel sale 2" - Cancel sale #2 from this list\n`;
            message += `• "cancel sale [reason]" - Add cancellation reason`;

            return {
                success: true,
                message,
                sales: recentSales
            };
        } catch (error) {
            console.error('Get recent sales error:', error);
            return { success: false, message: 'Failed to fetch recent sales.' };
        }
    }
}

export default new CancellationService();