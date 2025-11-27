import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

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
      text: '#2c3e50'
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
    // Business name
    doc.fontSize(22)
       .fillColor(this.colors.primary)
       .font('Helvetica-Bold')
       .text(shop.businessName, 50, 50, { align: 'center' });

    // Report title
    doc.fontSize(16)
       .fillColor(this.colors.dark)
       .font('Helvetica')
       .text(title, 50, 80, { align: 'center' });

    // Subtitle (date range)
    if (subtitle) {
      doc.fontSize(11)
         .fillColor(this.colors.text)
         .text(subtitle, 50, 105, { align: 'center' });
    }

    // Horizontal line
    doc.strokeColor(this.colors.primary)
       .lineWidth(2)
       .moveTo(50, 130)
       .lineTo(550, 130)
       .stroke();

    return 150; // Return starting Y position for content
  }

  /**
   * Helper method to add footer to document
   */
  addFooter(doc) {
    const pageCount = doc.bufferedPageRange().count;
    
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Footer line
      doc.strokeColor(this.colors.light)
         .lineWidth(1)
         .moveTo(50, 750)
         .lineTo(550, 750)
         .stroke();

      // Footer text
      doc.fontSize(8)
         .fillColor(this.colors.text)
         .font('Helvetica')
         .text(
           `Generated on ${new Date().toLocaleString()} | Smart Shop Assistant`,
           50,
           760,
           { align: 'center', width: 500 }
         );

      // Page number
      doc.text(
        `Page ${i + 1} of ${pageCount}`,
        0,
        760,
        { align: 'right' }
      );
    }
  }

  /**
   * Helper method to add summary box
   */
  addSummaryBox(doc, yPos, items) {
    const boxWidth = 500;
    const boxHeight = 20 + (items.length * 25);
    
    // Box background
    doc.rect(50, yPos, boxWidth, boxHeight)
       .fillAndStroke(this.colors.light, this.colors.primary);

    // Add items
    let itemY = yPos + 15;
    items.forEach(item => {
      doc.fontSize(11)
         .fillColor(this.colors.dark)
         .font('Helvetica-Bold')
         .text(item.label + ':', 70, itemY, { width: 200, continued: false });
      
      doc.font('Helvetica')
         .fillColor(item.color || this.colors.text)
         .text(item.value, 250, itemY, { width: 280 });
      
      itemY += 25;
    });

    return yPos + boxHeight + 20;
  }

  /**
   * Helper method to add growth indicator
   */
  addGrowthIndicator(doc, yPos, label, current, previous) {
    const growth = previous > 0 ? ((current - previous) / previous) * 100 : 100;
    const growthColor = growth >= 0 ? this.colors.success : this.colors.danger;
    const arrow = growth >= 0 ? '↑' : '↓';

    doc.fontSize(10)
       .fillColor(this.colors.text)
       .font('Helvetica')
       .text(label, 70, yPos, { width: 200 });

    doc.fillColor(growthColor)
       .font('Helvetica-Bold')
       .text(
         `${arrow} ${Math.abs(growth).toFixed(1)}%`,
         300,
         yPos,
         { width: 250 }
       );

    return yPos + 20;
  }

  /**
   * Generate Daily Report PDF
   */
  generateDailyReportPDF(shop, sales, date, callback) {
    const doc = new PDFDocument({ margin: 50 });
    const filename = `${shop.businessName.replace(/\s+/g, '_')}_Daily_${date.toISOString().split('T')[0]}.pdf`;
    const filePath = path.join(this.ensureReportsDirectory(), filename);

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    try {
      // Header
      let yPos = this.addHeader(
        doc,
        shop,
        'DAILY BUSINESS REPORT',
        `Date: ${date.toDateString()}`
      );

      // Calculate metrics
      const total = sales.reduce((sum, sale) => sum + sale.total, 0);
      const itemCount = sales.reduce(
        (sum, sale) => sum + sale.items.reduce((s, item) => s + item.quantity, 0),
        0
      );
      const avgPerTransaction = sales.length > 0 ? total / sales.length : 0;

      // Summary section
      doc.fontSize(14)
         .fillColor(this.colors.primary)
         .font('Helvetica-Bold')
         .text('SALES SUMMARY', 50, yPos);
      
      yPos += 30;

      yPos = this.addSummaryBox(doc, yPos, [
        { label: 'Total Revenue', value: `$${total.toFixed(2)}`, color: this.colors.primary },
        { label: 'Items Sold', value: itemCount.toString(), color: this.colors.success },
        { label: 'Transactions', value: sales.length.toString(), color: this.colors.warning },
        { label: 'Average per Transaction', value: `$${avgPerTransaction.toFixed(2)}`, color: this.colors.dark }
      ]);

      // Product breakdown
      doc.fontSize(14)
         .fillColor(this.colors.primary)
         .font('Helvetica-Bold')
         .text('PRODUCT BREAKDOWN', 50, yPos);
      
      yPos += 30;

      const productSales = {};
      sales.forEach(sale => {
        sale.items.forEach(item => {
          if (!productSales[item.productName]) {
            productSales[item.productName] = { quantity: 0, revenue: 0 };
          }
          productSales[item.productName].quantity += item.quantity;
          productSales[item.productName].revenue += item.total;
        });
      });

      // Table header
      doc.fontSize(10)
         .fillColor('white')
         .font('Helvetica-Bold');
      
      doc.rect(50, yPos, 500, 25)
         .fill(this.colors.primary);
      
      doc.text('Product', 70, yPos + 8, { width: 200 });
      doc.text('Qty Sold', 270, yPos + 8, { width: 80, align: 'center' });
      doc.text('Revenue', 350, yPos + 8, { width: 100, align: 'right' });
      doc.text('Avg Price', 450, yPos + 8, { width: 80, align: 'right' });

      yPos += 25;

      // Table rows
      let rowIndex = 0;
      Object.entries(productSales)
        .sort((a, b) => b[1].quantity - a[1].quantity)
        .forEach(([product, data]) => {
          if (yPos > 700) {
            doc.addPage();
            yPos = 50;
          }

          const avgPrice = data.revenue / data.quantity;
          const bgColor = rowIndex % 2 === 0 ? '#ffffff' : this.colors.light;

          doc.rect(50, yPos, 500, 25).fill(bgColor);

          doc.fontSize(9)
             .fillColor(this.colors.text)
             .font('Helvetica')
             .text(product, 70, yPos + 8, { width: 180 });
          
          doc.text(data.quantity.toString(), 270, yPos + 8, { width: 80, align: 'center' });
          doc.text(`$${data.revenue.toFixed(2)}`, 350, yPos + 8, { width: 100, align: 'right' });
          doc.text(`$${avgPrice.toFixed(2)}`, 450, yPos + 8, { width: 80, align: 'right' });

          yPos += 25;
          rowIndex++;
        });

      // Best seller highlight
      const bestSeller = Object.entries(productSales)
        .sort((a, b) => b[1].quantity - a[1].quantity)[0];

      if (bestSeller) {
        yPos += 20;
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }

        doc.rect(50, yPos, 500, 40)
           .fill('#fff3cd')
           .stroke(this.colors.warning);

        doc.fontSize(11)
           .fillColor(this.colors.dark)
           .font('Helvetica-Bold')
           .text('Today\'s Star Product', 70, yPos + 10);

        doc.fontSize(10)
           .font('Helvetica')
           .text(
             `${bestSeller[0]} - ${bestSeller[1].quantity} units sold`,
             70,
             yPos + 25,
             { width: 460 }
           );
      }

      // Footer
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

  /**
   * Generate Weekly Report PDF
   */
  generateWeeklyReportPDF(shop, sales, startDate, endDate, callback) {
    const doc = new PDFDocument({ margin: 50 });
    const filename = `${shop.businessName.replace(/\s+/g, '_')}_Weekly_${startDate.toISOString().split('T')[0]}.pdf`;
    const filePath = path.join(this.ensureReportsDirectory(), filename);

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    try {
      // Header
      let yPos = this.addHeader(
        doc,
        shop,
        'WEEKLY BUSINESS REPORT',
        `Period: ${startDate.toDateString()} - ${endDate.toDateString()}`
      );

      // Calculate metrics
      const total = sales.reduce((sum, sale) => sum + sale.total, 0);
      const itemCount = sales.reduce(
        (sum, sale) => sum + sale.items.reduce((s, item) => s + item.quantity, 0),
        0
      );

      // Summary section
      doc.fontSize(14)
         .fillColor(this.colors.primary)
         .font('Helvetica-Bold')
         .text('WEEKLY SUMMARY', 50, yPos);
      
      yPos += 30;

      yPos = this.addSummaryBox(doc, yPos, [
        { label: 'Total Revenue', value: `$${total.toFixed(2)}`, color: this.colors.primary },
        { label: 'Items Sold', value: itemCount.toString(), color: this.colors.success },
        { label: 'Transactions', value: sales.length.toString(), color: this.colors.warning },
        { label: 'Daily Average', value: `$${(total / 7).toFixed(2)}`, color: this.colors.dark }
      ]);

      // Daily breakdown
      doc.fontSize(14)
         .fillColor(this.colors.primary)
         .font('Helvetica-Bold')
         .text('DAILY PERFORMANCE', 50, yPos);
      
      yPos += 30;

      const dailyBreakdown = {};
      sales.forEach(sale => {
        const day = sale.date.toDateString();
        if (!dailyBreakdown[day]) {
          dailyBreakdown[day] = { sales: 0, items: 0, transactions: 0 };
        }
        dailyBreakdown[day].sales += sale.total;
        dailyBreakdown[day].items += sale.items.reduce((sum, item) => sum + item.quantity, 0);
        dailyBreakdown[day].transactions += 1;
      });

      // Table header
      doc.fontSize(10)
         .fillColor('white')
         .font('Helvetica-Bold');
      
      doc.rect(50, yPos, 500, 25)
         .fill(this.colors.primary);
      
      doc.text('Day', 70, yPos + 8, { width: 180 });
      doc.text('Sales', 250, yPos + 8, { width: 100, align: 'right' });
      doc.text('Items', 350, yPos + 8, { width: 80, align: 'center' });
      doc.text('Transactions', 430, yPos + 8, { width: 100, align: 'center' });

      yPos += 25;

      // Table rows
      let rowIndex = 0;
      Object.entries(dailyBreakdown).forEach(([day, data]) => {
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }

        const bgColor = rowIndex % 2 === 0 ? '#ffffff' : this.colors.light;
        const dayDate = new Date(day);
        const dayName = dayDate.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });

        doc.rect(50, yPos, 500, 25).fill(bgColor);

        doc.fontSize(9)
           .fillColor(this.colors.text)
           .font('Helvetica')
           .text(dayName, 70, yPos + 8, { width: 180 });
        
        doc.text(`$${data.sales.toFixed(2)}`, 250, yPos + 8, { width: 100, align: 'right' });
        doc.text(data.items.toString(), 350, yPos + 8, { width: 80, align: 'center' });
        doc.text(data.transactions.toString(), 430, yPos + 8, { width: 100, align: 'center' });

        yPos += 25;
        rowIndex++;
      });

      // Top products section
      yPos += 20;
      if (yPos > 650) {
        doc.addPage();
        yPos = 50;
      }

      doc.fontSize(14)
         .fillColor(this.colors.primary)
         .font('Helvetica-Bold')
         .text('TOP 5 PRODUCTS', 50, yPos);
      
      yPos += 30;

      const productSales = {};
      sales.forEach(sale => {
        sale.items.forEach(item => {
          if (!productSales[item.productName]) {
            productSales[item.productName] = { quantity: 0, revenue: 0 };
          }
          productSales[item.productName].quantity += item.quantity;
          productSales[item.productName].revenue += item.total;
        });
      });

      const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1].quantity - a[1].quantity)
        .slice(0, 5);

      const medals = ['Gold', 'Silver', 'Bronze', '4th', '5th'];
      
      topProducts.forEach(([product, data], index) => {
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }

        doc.rect(50, yPos, 500, 50)
           .fill(index < 3 ? '#fff3cd' : this.colors.light);

        doc.fontSize(11)
           .fillColor(this.colors.dark)
           .font('Helvetica-Bold')
           .text(`${medals[index]} ${product}`, 70, yPos + 10, { width: 300 });

        doc.fontSize(9)
           .font('Helvetica')
           .text(`Units: ${data.quantity}  •  Revenue: $${data.revenue.toFixed(2)}`, 70, yPos + 30, { width: 460 });

        yPos += 55;
      });

      // Footer
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

  /**
   * Generate Monthly Report PDF
   */
  generateMonthlyReportPDF(shop, sales, startDate, endDate, callback) {
    const doc = new PDFDocument({ margin: 50 });
    const filename = `${shop.businessName.replace(/\s+/g, '_')}_Monthly_${startDate.toISOString().split('T')[0]}.pdf`;
    const filePath = path.join(this.ensureReportsDirectory(), filename);

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    try {
      // Header
      let yPos = this.addHeader(
        doc,
        shop,
        'MONTHLY BUSINESS REPORT',
        `Period: ${startDate.toDateString()} - ${endDate.toDateString()}`
      );

      // Calculate metrics
      const total = sales.reduce((sum, sale) => sum + sale.total, 0);
      const itemCount = sales.reduce(
        (sum, sale) => sum + sale.items.reduce((s, item) => s + item.quantity, 0),
        0
      );

      // Summary section
      doc.fontSize(14)
         .fillColor(this.colors.primary)
         .font('Helvetica-Bold')
         .text('MONTHLY SUMMARY', 50, yPos);
      
      yPos += 30;

      yPos = this.addSummaryBox(doc, yPos, [
        { label: 'Total Revenue', value: `$${total.toFixed(2)}`, color: this.colors.primary },
        { label: 'Items Sold', value: itemCount.toString(), color: this.colors.success },
        { label: 'Transactions', value: sales.length.toString(), color: this.colors.warning },
        { label: 'Daily Average', value: `$${(total / 30).toFixed(2)}`, color: this.colors.dark },
        { label: 'Items per Day', value: (itemCount / 30).toFixed(1), color: this.colors.text }
      ]);

      // Weekly breakdown
      doc.fontSize(14)
         .fillColor(this.colors.primary)
         .font('Helvetica-Bold')
         .text('WEEKLY PERFORMANCE', 50, yPos);
      
      yPos += 30;

      const weeklyBreakdown = {};
      sales.forEach(sale => {
        const weekStart = new Date(sale.date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toDateString();

        if (!weeklyBreakdown[weekKey]) {
          weeklyBreakdown[weekKey] = { sales: 0, items: 0, transactions: 0 };
        }
        weeklyBreakdown[weekKey].sales += sale.total;
        weeklyBreakdown[weekKey].items += sale.items.reduce((sum, item) => sum + item.quantity, 0);
        weeklyBreakdown[weekKey].transactions += 1;
      });

      // Table header
      doc.fontSize(10)
         .fillColor('white')
         .font('Helvetica-Bold');
      
      doc.rect(50, yPos, 500, 25)
         .fill(this.colors.primary);
      
      doc.text('Week', 70, yPos + 8, { width: 180 });
      doc.text('Sales', 250, yPos + 8, { width: 100, align: 'right' });
      doc.text('Items', 350, yPos + 8, { width: 80, align: 'center' });
      doc.text('Transactions', 430, yPos + 8, { width: 100, align: 'center' });

      yPos += 25;

      // Table rows
      let rowIndex = 0;
      Object.entries(weeklyBreakdown).forEach(([week, data], index) => {
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }

        const bgColor = rowIndex % 2 === 0 ? '#ffffff' : this.colors.light;

        doc.rect(50, yPos, 500, 25).fill(bgColor);

        doc.fontSize(9)
           .fillColor(this.colors.text)
           .font('Helvetica')
           .text(`Week ${index + 1}`, 70, yPos + 8, { width: 180 });
        
        doc.text(`$${data.sales.toFixed(2)}`, 250, yPos + 8, { width: 100, align: 'right' });
        doc.text(data.items.toString(), 350, yPos + 8, { width: 80, align: 'center' });
        doc.text(data.transactions.toString(), 430, yPos + 8, { width: 100, align: 'center' });

        yPos += 25;
        rowIndex++;
      });

      // Top products section
      yPos += 20;
      if (yPos > 600) {
        doc.addPage();
        yPos = 50;
      }

      doc.fontSize(14)
         .fillColor(this.colors.primary)
         .font('Helvetica-Bold')
         .text('TOP 8 PRODUCTS', 50, yPos);
      
      yPos += 30;

      const productSales = {};
      sales.forEach(sale => {
        sale.items.forEach(item => {
          if (!productSales[item.productName]) {
            productSales[item.productName] = { quantity: 0, revenue: 0 };
          }
          productSales[item.productName].quantity += item.quantity;
          productSales[item.productName].revenue += item.total;
        });
      });

      const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1].quantity - a[1].quantity)
        .slice(0, 8);

      // Table header
      doc.fontSize(10)
         .fillColor('white')
         .font('Helvetica-Bold');
      
      doc.rect(50, yPos, 500, 25)
         .fill(this.colors.success);
      
      doc.text('Rank', 70, yPos + 8, { width: 50 });
      doc.text('Product', 120, yPos + 8, { width: 180 });
      doc.text('Units', 300, yPos + 8, { width: 80, align: 'center' });
      doc.text('Revenue', 380, yPos + 8, { width: 90, align: 'right' });
      doc.text('Avg Price', 470, yPos + 8, { width: 60, align: 'right' });

      yPos += 25;

      // Table rows
      const medals = ['Gold', 'Silver', 'Bronze', '4th', '5th', '6️th', '7️th', '8️th'];
      rowIndex = 0;
      
      topProducts.forEach(([product, data], index) => {
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }

        const bgColor = rowIndex % 2 === 0 ? '#ffffff' : this.colors.light;
        const avgPrice = data.revenue / data.quantity;

        doc.rect(50, yPos, 500, 25).fill(bgColor);

        doc.fontSize(9)
           .fillColor(this.colors.text)
           .font('Helvetica')
           .text(medals[index], 70, yPos + 8, { width: 50 });
        
        doc.text(product, 120, yPos + 8, { width: 180 });
        doc.text(data.quantity.toString(), 300, yPos + 8, { width: 80, align: 'center' });
        doc.text(`$${data.revenue.toFixed(2)}`, 380, yPos + 8, { width: 90, align: 'right' });
        doc.text(`$${avgPrice.toFixed(2)}`, 470, yPos + 8, { width: 60, align: 'right' });

        yPos += 25;
        rowIndex++;
      });

      // Insights box
      yPos += 20;
      if (yPos > 680) {
        doc.addPage();
        yPos = 50;
      }

      const topRevenue = topProducts.slice(0, 3).reduce((sum, [_, data]) => sum + data.revenue, 0);
      const topPercentage = ((topRevenue / total) * 100).toFixed(0);

      doc.rect(50, yPos, 500, 60)
         .fill('#d1ecf1')
         .stroke(this.colors.primary);

      doc.fontSize(11)
         .fillColor(this.colors.dark)
         .font('Helvetica-Bold')
         .text('📈 Monthly Insights', 70, yPos + 10);

      doc.fontSize(9)
         .font('Helvetica')
         .text(
           `• Top 3 products generate ${topPercentage}% of total revenue\n` +
           `• Best seller: ${topProducts[0][0]} with ${topProducts[0][1].quantity} units\n` +
           `• Average transaction value: $${(total / sales.length).toFixed(2)}`,
           70,
           yPos + 30,
           { width: 460, lineGap: 3 }
         );

      // Footer
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

  /**
   * Generate Best Sellers Report PDF
   */
  generateBestSellersReportPDF(shop, sales, startDate, endDate, days, callback) {
    const doc = new PDFDocument({ margin: 50 });
    const periodText = days === 1 ? 'Today' : days === 7 ? 'Weekly' : 'Monthly';
    const filename = `${shop.businessName.replace(/\s+/g, '_')}_BestSellers_${periodText}_${startDate.toISOString().split('T')[0]}.pdf`;
    const filePath = path.join(this.ensureReportsDirectory(), filename);

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    try {
      // Header
      const reportTitle = days === 1 ? 'BEST SELLERS - TODAY' : 
                         days === 7 ? 'BEST SELLERS - THIS WEEK' : 
                         'BEST SELLERS - THIS MONTH';
      
      let yPos = this.addHeader(
        doc,
        shop,
        reportTitle,
        `Analysis Period: ${startDate.toDateString()} - ${endDate.toDateString()}`
      );

      // Aggregate product sales
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

      // Summary section
      doc.fontSize(14)
         .fillColor(this.colors.primary)
         .font('Helvetica-Bold')
         .text('SUMMARY', 50, yPos);
      
      yPos += 30;

      yPos = this.addSummaryBox(doc, yPos, [
        { label: 'Total Items Sold', value: totalItems.toString(), color: this.colors.primary },
        { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, color: this.colors.success },
        { label: 'Unique Products', value: Object.keys(productSales).length.toString(), color: this.colors.warning },
        { label: 'Total Transactions', value: sales.length.toString(), color: this.colors.dark }
      ]);

      // Product ranking
      doc.fontSize(14)
         .fillColor(this.colors.primary)
         .font('Helvetica-Bold')
         .text('PRODUCT RANKING', 50, yPos);
      
      yPos += 30;

      const sortedProducts = Object.entries(productSales)
        .sort((a, b) => b[1].quantity - a[1].quantity);

      // Table header
      doc.fontSize(10)
         .fillColor('white')
         .font('Helvetica-Bold');
      
      doc.rect(50, yPos, 500, 25)
         .fill(this.colors.primary);
      
      doc.text('#', 70, yPos + 8, { width: 30 });
      doc.text('Product', 100, yPos + 8, { width: 160 });
      doc.text('Units', 260, yPos + 8, { width: 60, align: 'center' });
      doc.text('Revenue', 320, yPos + 8, { width: 80, align: 'right' });
      doc.text('Avg Price', 400, yPos + 8, { width: 70, align: 'right' });
      doc.text('Share', 470, yPos + 8, { width: 60, align: 'center' });

      yPos += 25;

      // Table rows
      let rowIndex = 0;
      sortedProducts.forEach(([product, data], index) => {
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }

        const bgColor = rowIndex % 2 === 0 ? '#ffffff' : this.colors.light;
        const avgPrice = data.revenue / data.quantity;
        const share = ((data.quantity / totalItems) * 100).toFixed(1);

        doc.rect(50, yPos, 500, 25).fill(bgColor);

        doc.fontSize(9)
           .fillColor(this.colors.text)
           .font('Helvetica-Bold')
           .text((index + 1).toString(), 70, yPos + 8, { width: 30 });
        
        doc.font('Helvetica')
           .text(product, 100, yPos + 8, { width: 160 });
        
        doc.text(data.quantity.toString(), 260, yPos + 8, { width: 60, align: 'center' });
        doc.text(`$${data.revenue.toFixed(2)}`, 320, yPos + 8, { width: 80, align: 'right' });
        doc.text(`$${avgPrice.toFixed(2)}`, 400, yPos + 8, { width: 70, align: 'right' });
        doc.text(`${share}%`, 470, yPos + 8, { width: 60, align: 'center' });

        yPos += 25;
        rowIndex++;
      });

      // Insights section
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

      // Footer
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