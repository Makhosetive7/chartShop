import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import FinancialService from './FinancialService.js';

class PDFService {
  constructor() {
    // Color scheme for professional reports
    this.colors = {
      primary: '#2980b9',
      success: '#27ae60',
      danger: '#e74c3c',
      warning: '#f39c12',
      dark: '#34495e',
      light: '#ecf0f1',
      text: '#2c3e50',
      cashIn: '#d4edda',
      cashInBorder: '#28a745',
      cashOut: '#f8d7da',
      cashOutBorder: '#dc3545',
    };
  }

  /**
   * Helper method to ensure reports directory exists
   */
  ensureReportsDirectory() {
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    return reportsDir;
  }

  /**
   * Helper method to add header to document
   */
  addHeader(doc, shop, title, subtitle = '') {
    doc.fontSize(22)
       .fillColor(this.colors.primary)
       .font('Helvetica-Bold')
       .text(shop.businessName, 50, 50, { align: 'center' });

    doc.fontSize(16)
       .fillColor(this.colors.dark)
       .font('Helvetica')
       .text(title, 50, 80, { align: 'center' });

    if (subtitle) {
      doc.fontSize(11)
         .fillColor(this.colors.text)
         .text(subtitle, 50, 105, { align: 'center' });
    }

    doc.strokeColor(this.colors.primary)
       .lineWidth(2)
       .moveTo(50, 130)
       .lineTo(550, 130)
       .stroke();

    return 150;
  }

  /**
   * Helper method to add footer to document
   */
  addFooter(doc) {
    const pageCount = doc.bufferedPageRange().count;
    
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      doc.strokeColor(this.colors.light)
         .lineWidth(1)
         .moveTo(50, 750)
         .lineTo(550, 750)
         .stroke();

      doc.fontSize(8)
         .fillColor(this.colors.text)
         .font('Helvetica')
         .text(
           `Generated on ${new Date().toLocaleString()} | Smart Shop Assistant`,
           50,
           760,
           { align: 'center', width: 500 }
         );

      doc.text(
        `Page ${i + 1} of ${pageCount}`,
        0,
        760,
        { align: 'right' }
      );
    }
  }

  /**
   * Helper method to draw tables with alternating row colors
   */
  drawTable(doc, data, x, y, columnWidths, compact = false) {
    const rowHeight = compact ? 18 : 22;
    const startY = y;

    data.forEach((row, rowIndex) => {
      if (rowIndex > 0 && rowIndex % 2 === 0) {
        doc.rect(x, y, columnWidths.reduce((a, b) => a + b, 0), rowHeight)
           .fill('#f5f5f5')
           .fillColor('#000');
      }

      const font = rowIndex === 0 || rowIndex === data.length - 1 ? 'Helvetica-Bold' : 'Helvetica';
      const fontSize = compact ? 8 : 9;
      
      doc.fontSize(fontSize).font(font);

      let cellX = x;
      row.forEach((cell, colIndex) => {
        doc.text(
          String(cell),
          cellX + 5,
          y + (rowHeight - fontSize) / 2,
          {
            width: columnWidths[colIndex] - 10,
            align: colIndex === 0 ? 'left' : 'right'
          }
        );
        cellX += columnWidths[colIndex];
      });

      y += rowHeight;
    });

    doc.rect(x, startY, columnWidths.reduce((a, b) => a + b, 0), y - startY)
       .stroke('#ddd');

    let lineX = x;
    columnWidths.forEach(width => {
      doc.moveTo(lineX, startY).lineTo(lineX, y).stroke('#ddd');
      lineX += width;
    });
    doc.moveTo(lineX, startY).lineTo(lineX, y).stroke('#ddd');

    doc.moveTo(x, startY).lineTo(x + columnWidths.reduce((a, b) => a + b, 0), startY).stroke('#ddd');
    doc.moveTo(x, y).lineTo(x + columnWidths.reduce((a, b) => a + b, 0), y).stroke('#ddd');

    return y;
  }

  /**
   * Add financial summary section with visual cash flow boxes
   */
  addFinancialSummarySection(doc, cashFlowData, y) {
    const { cashFlow, revenue, profitability } = cashFlowData;
    
    doc.fontSize(14).font('Helvetica-Bold').text('Financial Summary', 50, y);
    y += 25;

    const boxWidth = 150;
    const boxHeight = 60;
    const spacing = 20;
    
    // Cash IN box (Green)
    doc.rect(50, y, boxWidth, boxHeight)
       .fillAndStroke(this.colors.cashIn, this.colors.cashInBorder)
       .fillColor('#000');
    
    doc.fontSize(10).font('Helvetica-Bold')
       .text('CASH IN', 60, y + 10, { width: boxWidth - 20 });
    doc.fontSize(16).font('Helvetica-Bold')
       .text(`$${cashFlow.inflows.total.toFixed(2)}`, 60, y + 25, { width: boxWidth - 20 });
    doc.fontSize(8).font('Helvetica')
       .text(`From ${cashFlow.inflows.cashSales.count + cashFlow.inflows.debtPayments.count + cashFlow.inflows.laybyePayments.count} transactions`, 60, y + 43, { width: boxWidth - 20 });

    // Cash OUT box (Red)
    doc.rect(50 + boxWidth + spacing, y, boxWidth, boxHeight)
       .fillAndStroke(this.colors.cashOut, this.colors.cashOutBorder)
       .fillColor('#000');
    
    doc.fontSize(10).font('Helvetica-Bold')
       .text('CASH OUT', 60 + boxWidth + spacing, y + 10, { width: boxWidth - 20 });
    doc.fontSize(16).font('Helvetica-Bold')
       .text(`$${cashFlow.outflows.total.toFixed(2)}`, 60 + boxWidth + spacing, y + 25, { width: boxWidth - 20 });
    doc.fontSize(8).font('Helvetica')
       .text(`${cashFlow.outflows.expenses.count + cashFlow.outflows.refunds.count} items`, 60 + boxWidth + spacing, y + 43, { width: boxWidth - 20 });

    // Net Cash Flow box
    const netColor = cashFlow.net >= 0 ? this.colors.cashIn : this.colors.cashOut;
    const netBorder = cashFlow.net >= 0 ? this.colors.cashInBorder : this.colors.cashOutBorder;
    
    doc.rect(50 + (boxWidth + spacing) * 2, y, boxWidth, boxHeight)
       .fillAndStroke(netColor, netBorder)
       .fillColor('#000');
    
    doc.fontSize(10).font('Helvetica-Bold')
       .text('NET CASH FLOW', 60 + (boxWidth + spacing) * 2, y + 10, { width: boxWidth - 20 });
    doc.fontSize(16).font('Helvetica-Bold')
       .text(`$${cashFlow.net.toFixed(2)}`, 60 + (boxWidth + spacing) * 2, y + 25, { width: boxWidth - 20 });
    doc.fontSize(8).font('Helvetica')
       .text(cashFlow.net >= 0 ? 'Positive Flow' : 'Negative Flow', 60 + (boxWidth + spacing) * 2, y + 43, { width: boxWidth - 20 });

    y += boxHeight + 30;

    // Detailed Cash Flow breakdown
    doc.fontSize(12).font('Helvetica-Bold').text('Cash Flow Details', 50, y);
    y += 20;

    const tableData = [
      ['Source', 'Amount', 'Count'],
      ['Cash Sales', `$${cashFlow.inflows.cashSales.amount.toFixed(2)}`, cashFlow.inflows.cashSales.count],
      ['Debt Payments', `$${cashFlow.inflows.debtPayments.amount.toFixed(2)}`, cashFlow.inflows.debtPayments.count],
      ['Laybye Payments', `$${cashFlow.inflows.laybyePayments.amount.toFixed(2)}`, cashFlow.inflows.laybyePayments.count],
      ['', '', ''],
      ['Expenses', `($${cashFlow.outflows.expenses.amount.toFixed(2)})`, cashFlow.outflows.expenses.count],
      ['Refunds', `($${cashFlow.outflows.refunds.amount.toFixed(2)})`, cashFlow.outflows.refunds.count],
    ];

    y = this.drawTable(doc, tableData, 50, y, [200, 150, 100]);

    return y + 20;
  }

  /**
   * Add revenue and profit section
   */
  addRevenueProfitSection(doc, cashFlowData, y) {
    const { revenue, profitability } = cashFlowData;

    doc.fontSize(12).font('Helvetica-Bold').text('Revenue & Profitability', 50, y);
    y += 20;

    const revenueData = [
      ['Revenue Type', 'Amount', 'Count'],
      ['Cash Sales', `$${revenue.cash.amount.toFixed(2)}`, revenue.cash.count],
      ['Credit Sales', `$${revenue.credit.amount.toFixed(2)}`, revenue.credit.count],
      ['Completed Laybyes', `$${revenue.completedLaybyes.amount.toFixed(2)}`, revenue.completedLaybyes.count],
      ['TOTAL REVENUE', `$${revenue.total.toFixed(2)}`, ''],
    ];

    y = this.drawTable(doc, revenueData, 50, y, [200, 150, 100]);
    y += 10;

    const profitData = [
      ['Metric', 'Amount'],
      ['Gross Profit', `$${profitability.grossProfit.toFixed(2)}`],
      ['Total Expenses', `($${profitability.expenses.toFixed(2)})`],
      ['Net Profit', `$${profitability.netProfit.toFixed(2)}`],
      ['Profit Margin', `${profitability.profitMargin.toFixed(1)}%`],
    ];

    y = this.drawTable(doc, profitData, 50, y, [250, 200]);

    return y + 20;
  }

  /**
   * Add expense breakdown section with categories
   */
  addExpenseBreakdownSection(doc, expenses, y) {
    if (!expenses || expenses.length === 0) {
      return y;
    }

    if (y > 650) {
      doc.addPage();
      y = 50;
    }

    doc.fontSize(12).font('Helvetica-Bold').text('Expense Breakdown by Category', 50, y);
    y += 20;

    const categories = {};
    let total = 0;

    expenses.forEach(exp => {
      if (!categories[exp.category]) {
        categories[exp.category] = {
          total: 0,
          count: 0,
          items: []
        };
      }
      categories[exp.category].total += exp.amount;
      categories[exp.category].count++;
      categories[exp.category].items.push(exp);
      total += exp.amount;
    });

    const sortedCategories = Object.entries(categories)
      .sort((a, b) => b[1].total - a[1].total);

    const summaryData = [['Category', 'Amount', 'Count', '% of Total']];
    
    sortedCategories.forEach(([category, data]) => {
      const percentage = total > 0 ? (data.total / total * 100).toFixed(1) : 0;
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      summaryData.push([
        categoryName,
        `$${data.total.toFixed(2)}`,
        data.count,
        `${percentage}%`
      ]);
    });

    summaryData.push([
      'TOTAL',
      `$${total.toFixed(2)}`,
      expenses.length,
      '100%'
    ]);

    y = this.drawTable(doc, summaryData, 50, y, [150, 120, 80, 100]);
    y += 20;

    doc.fontSize(11).font('Helvetica-Bold').text('Detailed Expenses', 50, y);
    y += 15;

    sortedCategories.forEach(([category, data]) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      doc.fontSize(10).font('Helvetica-Bold')
         .text(`${categoryName} (${data.count} items)`, 60, y);
      y += 15;

      const categoryItems = [['Description', 'Amount', 'Date']];
      
      data.items.forEach(item => {
        const date = new Date(item.date).toLocaleDateString();
        categoryItems.push([
          item.description || 'No description',
          `$${item.amount.toFixed(2)}`,
          date
        ]);
      });

      y = this.drawTable(doc, categoryItems, 70, y, [250, 100, 100], true);
      y += 10;
    });

    return y;
  }

  /**
   * Generate Enhanced Daily Report PDF with FinancialService
   */
  async generateEnhancedDailyReportPDF(shop, callback) {
    try {
      // Get financial data from FinancialService
      const financialReport = await FinancialService.getDailyCashFlow(shop._id);
      
      if (!financialReport.success) {
        return callback(new Error(financialReport.message), null);
      }

      const { data } = financialReport;

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const filename = `${shop.businessName.replace(/\s+/g, '_')}_Daily_Enhanced_${new Date().toISOString().split('T')[0]}.pdf`;
      const filePath = path.join(this.ensureReportsDirectory(), filename);

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      let yPos = this.addHeader(
        doc,
        shop,
        'DAILY FINANCIAL REPORT',
        `Date: ${new Date().toDateString()}`
      );

      // Financial Summary Section with visual boxes
      yPos = this.addFinancialSummarySection(doc, data, yPos);

      // Revenue & Profit Section
      yPos = this.addRevenueProfitSection(doc, data, yPos);

      // Expense Breakdown Section
      if (data.details.expenses && data.details.expenses.length > 0) {
        yPos = this.addExpenseBreakdownSection(doc, data.details.expenses, yPos);
      }

      // Outstanding Receivables Warning
      if (data.outstanding.total > 0) {
        if (yPos > 650) {
          doc.addPage();
          yPos = 50;
        }

        doc.fontSize(12).font('Helvetica-Bold')
           .fillColor('#856404')
           .text('⚠️ Outstanding Receivables', 50, yPos);
        
        doc.fontSize(10).font('Helvetica')
           .fillColor('#000')
           .text(`Customer Credit Due: $${data.outstanding.creditDue.amount.toFixed(2)} (${data.outstanding.creditDue.customers} customers)`, 50, yPos + 20)
           .text(`Active Laybyes Due: $${data.outstanding.laybyeDue.amount.toFixed(2)} (${data.outstanding.laybyeDue.count} laybyes)`, 50, yPos + 35)
           .font('Helvetica-Bold')
           .text(`Total Outstanding: $${data.outstanding.total.toFixed(2)}`, 50, yPos + 50);
      }

      this.addFooter(doc);
      doc.end();

      stream.on('finish', () => {
        callback(null, { filePath, filename });
      });

      stream.on('error', (error) => {
        callback(error, null);
      });

    } catch (error) {
      console.error('[PDFService] Enhanced daily report error:', error);
      callback(error, null);
    }
  }

  /**
   * Generate Enhanced Weekly Report PDF
   */
  async generateEnhancedWeeklyReportPDF(shop, callback) {
    try {
      const financialReport = await FinancialService.getWeeklyCashFlow(shop._id);
      
      if (!financialReport.success) {
        return callback(new Error(financialReport.message), null);
      }

      const { data } = financialReport;

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const filename = `${shop.businessName.replace(/\s+/g, '_')}_Weekly_Enhanced_${new Date().toISOString().split('T')[0]}.pdf`;
      const filePath = path.join(this.ensureReportsDirectory(), filename);

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      let yPos = this.addHeader(
        doc,
        shop,
        'WEEKLY FINANCIAL REPORT',
        `Period: ${data.period.startDate.toDateString()} - ${data.period.endDate.toDateString()}`
      );

      yPos = this.addFinancialSummarySection(doc, data, yPos);
      yPos = this.addRevenueProfitSection(doc, data, yPos);

      if (data.details.expenses && data.details.expenses.length > 0) {
        yPos = this.addExpenseBreakdownSection(doc, data.details.expenses, yPos);
      }

      if (data.outstanding.total > 0) {
        if (yPos > 650) {
          doc.addPage();
          yPos = 50;
        }

        doc.fontSize(12).font('Helvetica-Bold')
           .fillColor('#856404')
           .text('⚠️ Outstanding Receivables', 50, yPos);
        
        doc.fontSize(10).font('Helvetica')
           .fillColor('#000')
           .text(`Total Outstanding: $${data.outstanding.total.toFixed(2)}`, 50, yPos + 20);
      }

      this.addFooter(doc);
      doc.end();

      stream.on('finish', () => {
        callback(null, { filePath, filename });
      });

      stream.on('error', (error) => {
        callback(error, null);
      });

    } catch (error) {
      console.error('[PDFService] Enhanced weekly report error:', error);
      callback(error, null);
    }
  }

  /**
   * Generate Enhanced Monthly Report PDF
   */
  async generateEnhancedMonthlyReportPDF(shop, callback) {
    try {
      const financialReport = await FinancialService.getMonthlyCashFlow(shop._id);
      
      if (!financialReport.success) {
        return callback(new Error(financialReport.message), null);
      }

      const { data } = financialReport;

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const filename = `${shop.businessName.replace(/\s+/g, '_')}_Monthly_Enhanced_${new Date().toISOString().split('T')[0]}.pdf`;
      const filePath = path.join(this.ensureReportsDirectory(), filename);

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      let yPos = this.addHeader(
        doc,
        shop,
        'MONTHLY FINANCIAL REPORT',
        `Period: ${data.period.startDate.toDateString()} - ${data.period.endDate.toDateString()}`
      );

      yPos = this.addFinancialSummarySection(doc, data, yPos);
      yPos = this.addRevenueProfitSection(doc, data, yPos);

      if (data.details.expenses && data.details.expenses.length > 0) {
        yPos = this.addExpenseBreakdownSection(doc, data.details.expenses, yPos);
      }

      if (data.outstanding.total > 0) {
        if (yPos > 650) {
          doc.addPage();
          yPos = 50;
        }

        doc.fontSize(12).font('Helvetica-Bold')
           .fillColor('#856404')
           .text('⚠️ Outstanding Receivables', 50, yPos);
        
        doc.fontSize(10).font('Helvetica')
           .fillColor('#000')
           .text(`Total Outstanding: $${data.outstanding.total.toFixed(2)}`, 50, yPos + 20);
      }

      this.addFooter(doc);
      doc.end();

      stream.on('finish', () => {
        callback(null, { filePath, filename });
      });

      stream.on('error', (error) => {
        callback(error, null);
      });

    } catch (error) {
      console.error('[PDFService] Enhanced monthly report error:', error);
      callback(error, null);
    }
  }

  /**
   * Legacy methods maintained for backward compatibility
   * These now use FinancialService under the hood where applicable
   */

  generateDailyReportPDF(shop, sales, date, callback) {
    // Redirect to enhanced version
    this.generateEnhancedDailyReportPDF(shop, callback);
  }

  generateWeeklyReportPDF(shop, sales, startDate, endDate, callback) {
    // Redirect to enhanced version
    this.generateEnhancedWeeklyReportPDF(shop, callback);
  }

  generateMonthlyReportPDF(shop, sales, startDate, endDate, callback) {
    // Redirect to enhanced version
    this.generateEnhancedMonthlyReportPDF(shop, callback);
  }

  /**
   * Generate Best Sellers Report PDF (uses existing sales data)
   */
  generateBestSellersReportPDF(shop, sales, startDate, endDate, days, callback) {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const periodText = days === 1 ? 'Today' : days === 7 ? 'Weekly' : 'Monthly';
    const filename = `${shop.businessName.replace(/\s+/g, '_')}_BestSellers_${periodText}_${startDate.toISOString().split('T')[0]}.pdf`;
    const filePath = path.join(this.ensureReportsDirectory(), filename);

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    try {
      const reportTitle = days === 1 ? 'BEST SELLERS - TODAY' : 
                         days === 7 ? 'BEST SELLERS - THIS WEEK' : 
                         'BEST SELLERS - THIS MONTH';
      
      let yPos = this.addHeader(
        doc,
        shop,
        reportTitle,
        `Analysis Period: ${startDate.toDateString()} - ${endDate.toDateString()}`
      );

      const productSales = {};
      sales.forEach(sale => {
        sale.items.forEach(item => {
          if (!productSales[item.productName]) {
            productSales[item.productName] = {
              quantity: 0,
              revenue: 0,
              transactions: 0
            };
          }
          productSales[item.productName].quantity += item.quantity;
          productSales[item.productName].revenue += item.total;
          productSales[item.productName].transactions += 1;
        });
      });

      const totalItems = Object.values(productSales).reduce((sum, p) => sum + p.quantity, 0);
      const totalRevenue = Object.values(productSales).reduce((sum, p) => sum + p.revenue, 0);

      doc.fontSize(14)
         .fillColor(this.colors.primary)
         .font('Helvetica-Bold')
         .text('SUMMARY', 50, yPos);
      
      yPos += 30;

      const summaryItems = [
        { label: 'Total Items Sold', value: totalItems.toString(), color: this.colors.primary },
        { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, color: this.colors.success },
        { label: 'Unique Products', value: Object.keys(productSales).length.toString(), color: this.colors.warning },
        { label: 'Total Transactions', value: sales.length.toString(), color: this.colors.dark }
      ];

      const boxWidth = 500;
      const boxHeight = 20 + (summaryItems.length * 25);
      
      doc.rect(50, yPos, boxWidth, boxHeight)
         .fillAndStroke(this.colors.light, this.colors.primary);

      let itemY = yPos + 15;
      summaryItems.forEach(item => {
        doc.fontSize(11)
           .fillColor(this.colors.dark)
           .font('Helvetica-Bold')
           .text(item.label + ':', 70, itemY, { width: 200, continued: false });
        
        doc.font('Helvetica')
           .fillColor(item.color || this.colors.text)
           .text(item.value, 250, itemY, { width: 280 });
        
        itemY += 25;
      });

      yPos += boxHeight + 30;

      doc.fontSize(14)
         .fillColor(this.colors.primary)
         .font('Helvetica-Bold')
         .text('PRODUCT RANKING', 50, yPos);
      
      yPos += 30;

      const sortedProducts = Object.entries(productSales)
        .sort((a, b) => b[1].quantity - a[1].quantity);

      const tableData = [['#', 'Product', 'Units', 'Revenue', 'Avg Price', 'Share']];
      
      sortedProducts.forEach(([product, data], index) => {
        const avgPrice = data.revenue / data.quantity;
        const share = ((data.quantity / totalItems) * 100).toFixed(1);
        
        tableData.push([
          (index + 1).toString(),
          product,
          data.quantity.toString(),
          `$${data.revenue.toFixed(2)}`,
          `$${avgPrice.toFixed(2)}`,
          `${share}%`
        ]);
      });

      yPos = this.drawTable(doc, tableData, 50, yPos, [30, 160, 60, 80, 70, 60]);

      yPos += 20;
      if (yPos > 650) {
        doc.addPage();
        yPos = 50;
      }

      const topProduct = sortedProducts[0];
      const bottomProduct = sortedProducts[sortedProducts.length - 1];
      const top3Revenue = sortedProducts
        .slice(0, 3)
        .reduce((sum, [_, data]) => sum + data.revenue, 0);
      const top3Percentage = ((top3Revenue / totalRevenue) * 100).toFixed(0);

      doc.rect(50, yPos, 500, 90)
         .fill('#d4edda')
         .stroke(this.colors.success);

      doc.fontSize(12)
         .fillColor(this.colors.dark)
         .font('Helvetica-Bold')
         .text('🎯 Key Insights', 70, yPos + 15);

      doc.fontSize(9)
         .font('Helvetica')
         .text(
           `• Best Seller: ${topProduct[0]} with ${topProduct[1].quantity} units sold\n` +
           `• Top 3 products generate ${top3Percentage}% of total revenue\n` +
           (sortedProducts.length > 1 
             ? `• Slowest Mover: ${bottomProduct[0]} (${bottomProduct[1].quantity} units)\n`
             : '') +
           `• Average price per item: $${(totalRevenue / totalItems).toFixed(2)}\n` +
           `• Most frequent buyer product: ${topProduct[0]} (${topProduct[1].transactions} transactions)`,
           70,
           yPos + 40,
           { width: 460, lineGap: 4 }
         );

      this.addFooter(doc);
      doc.end();

      stream.on('finish', () => {
        callback(null, { filePath, filename });
      });

      stream.on('error', (error) => {
        callback(error, null);
      });

    } catch (error) {
      callback(error, null);
    }
  }
}

export default new PDFService();