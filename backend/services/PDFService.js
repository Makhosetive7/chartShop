import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import FinancialService from './FinancialService.js';

/**
 * PDF report styling aligned with the frontend theme
 * (frontend/src/styles/theme.ts) and the daily-report redesign.
 */
class PDFService {
  constructor() {
    this.margin = 48;
    this.contentWidth = 499; // A4 595 - 2*48
    this.pageBottom = 752;

    // Mirror frontend theme colors
    this.colors = {
      primary: '#8B1E3A',
      primaryLight: '#C43B5A',
      primaryDark: '#4A0E1C',
      primaryTint: '#F8E8EC',
      cream: '#F7F1EB',
      peachSoft: '#FAE8DC',
      secondary: '#E85A4F',
      success: '#22C55E',
      successTint: '#DCFCE7',
      warning: '#F59E0B',
      warningTint: '#FEF3C7',
      danger: '#DC2626',
      dangerTint: '#FEE2E2',
      textPrimary: '#1A0A0A',
      textSecondary: '#6B5B5B',
      textMuted: '#9A8A8A',
      border: '#E8D9D0',
      borderStrong: '#D4BDB0',
      surface: '#FFFFFF',
      // Legacy aliases used by older helpers
      dark: '#1A0A0A',
      light: '#F7F1EB',
      text: '#1A0A0A',
      cashIn: '#DCFCE7',
      cashInBorder: '#22C55E',
      cashOut: '#FEE2E2',
      cashOutBorder: '#DC2626',
    };
  }

  ensureReportsDirectory() {
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    return reportsDir;
  }

  money(amount) {
    const n = Number(amount) || 0;
    return `$${n.toFixed(2)}`;
  }

  moneyParen(amount) {
    return `(${this.money(amount)})`;
  }

  formatDateLong(date) {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatGeneratedAt(date = new Date()) {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  ensureSpace(doc, y, needed = 80) {
    if (y + needed > this.pageBottom) {
      doc.addPage();
      return this.margin;
    }
    return y;
  }

  /**
   * Header: brand mark + shop name | status badge, subtitle, accent rule
   */
  addReportHeader(doc, shop, title, subtitle = '', badgeText = null) {
    const x = this.margin;
    const y = this.margin;
    const mark = 14;

    doc.roundedRect(x, y + 2, mark, mark, 3).fill(this.colors.primary);

    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor(this.colors.textPrimary)
      .text(shop.businessName, x + mark + 10, y, {
        width: this.contentWidth - 140,
        lineBreak: false,
      });

    if (badgeText) {
      const badgeWidth = Math.min(130, badgeText.length * 6.2 + 20);
      const badgeX = x + this.contentWidth - badgeWidth;
      doc.roundedRect(badgeX, y + 1, badgeWidth, 18, 9).fill(this.colors.primaryTint);
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(this.colors.primary)
        .text(badgeText, badgeX, y + 5, {
          width: badgeWidth,
          align: 'center',
        });
    }

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(this.colors.textSecondary)
      .text(`${title} · ${subtitle}`, x, y + 22, {
        width: this.contentWidth,
      });

    const ruleY = y + 42;
    doc
      .strokeColor(this.colors.primary)
      .lineWidth(1.25)
      .moveTo(x, ruleY)
      .lineTo(x + this.contentWidth, ruleY)
      .stroke();

    return ruleY + 18;
  }

  /** @deprecated Prefer addReportHeader */
  addHeader(doc, shop, title, subtitle = '') {
    return this.addReportHeader(doc, shop, title, subtitle);
  }

  addFooter(doc) {
    const range = doc.bufferedPageRange();
    const pageCount = range.count;
    const startPage = range.start;
    const generated = this.formatGeneratedAt();

    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(startPage + i);

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(this.colors.textMuted)
        .text(
          `Generated on ${generated} · Smart Shop Assistant · Page ${i + 1} of ${pageCount}`,
          this.margin,
          770,
          { width: this.contentWidth, align: 'center' }
        );
    }
  }

  drawHeroCard(doc, y, { label, value, note }) {
    const x = this.margin;
    const h = 78;
    const w = this.contentWidth;

    doc.roundedRect(x, y, w, h, 10).fill(this.colors.primaryTint);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(this.colors.primary)
      .text(label, x + 20, y + 14, { width: w - 40 });

    doc
      .fontSize(28)
      .font('Helvetica-Bold')
      .fillColor(this.colors.primaryDark)
      .text(value, x + 20, y + 28, { width: w - 40 });

    if (note) {
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.primary)
        .text(note, x + 20, y + 58, { width: w - 40 });
    }

    return y + h + 14;
  }

  drawMetricCards(doc, y, cards) {
    const gap = 10;
    const count = cards.length;
    const cardW = (this.contentWidth - gap * (count - 1)) / count;
    const cardH = 64;
    const x0 = this.margin;

    cards.forEach((card, i) => {
      const x = x0 + i * (cardW + gap);
      doc.roundedRect(x, y, cardW, cardH, 8).fill(this.colors.cream);

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(this.colors.textSecondary)
        .text(card.label, x + 10, y + 10, { width: cardW - 20 });

      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor(this.colors.textPrimary)
        .text(card.value, x + 10, y + 26, { width: cardW - 20 });

      if (card.sub) {
        doc
          .fontSize(7.5)
          .font('Helvetica')
          .fillColor(this.colors.textMuted)
          .text(card.sub, x + 10, y + 46, { width: cardW - 20 });
      }
    });

    return y + cardH + 20;
  }

  /**
   * Clean line-separated table (no grid borders).
   * rows: { label, amount, count?, accent?, bold? }[]
   * total: optional final bold row
   */
  drawCleanTable(doc, y, title, rows, total = null) {
    y = this.ensureSpace(doc, y, 40 + rows.length * 22 + (total ? 28 : 0));

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(this.colors.textPrimary)
      .text(title, this.margin, y);

    y += 18;

    const labelW = 220;
    const amountW = 160;
    const countW = this.contentWidth - labelW - amountW;
    const rowH = 20;

    const drawRow = (row, isTotal = false) => {
      y = this.ensureSpace(doc, y, rowH + 8);

      if (isTotal) {
        doc
          .strokeColor(this.colors.textPrimary)
          .lineWidth(1)
          .moveTo(this.margin, y)
          .lineTo(this.margin + this.contentWidth, y)
          .stroke();
        y += 8;
      }

      const color = row.accent
        ? this.colors.primary
        : this.colors.textPrimary;
      const font = isTotal || row.bold ? 'Helvetica-Bold' : 'Helvetica';

      doc.fontSize(9).font(font).fillColor(color);
      doc.text(row.label, this.margin, y, { width: labelW });
      doc.text(row.amount, this.margin + labelW, y, {
        width: amountW,
        align: 'right',
      });
      if (row.count !== undefined && row.count !== null && row.count !== '') {
        doc
          .fillColor(this.colors.textSecondary)
          .text(String(row.count), this.margin + labelW + amountW, y, {
            width: countW,
            align: 'right',
          });
      }

      y += rowH;

      if (!isTotal) {
        doc
          .strokeColor(this.colors.border)
          .lineWidth(0.5)
          .moveTo(this.margin, y - 4)
          .lineTo(this.margin + this.contentWidth, y - 4)
          .stroke();
      }
    };

    rows.forEach((row) => drawRow(row, false));
    if (total) drawRow(total, true);

    return y + 14;
  }

  drawEmptyState(doc, y, title, message) {
    y = this.ensureSpace(doc, y, 90);

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(this.colors.textPrimary)
      .text(title, this.margin, y);
    y += 16;

    const boxH = 56;
    doc
      .roundedRect(this.margin, y, this.contentWidth, boxH, 8)
      .fill(this.colors.cream);

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(this.colors.textPrimary)
      .text(message.title, this.margin, y + 14, {
        width: this.contentWidth,
        align: 'center',
      });

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(this.colors.textSecondary)
      .text(message.body, this.margin + 24, y + 32, {
        width: this.contentWidth - 48,
        align: 'center',
      });

    return y + boxH + 18;
  }

  drawRecommendations(doc, y, recommendations, emptyMessage) {
    y = this.ensureSpace(doc, y, 50);

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(this.colors.textPrimary)
      .text('Recommendations', this.margin, y);
    y += 16;

    if (!recommendations.length) {
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.textMuted)
        .text(emptyMessage, this.margin, y, { width: this.contentWidth });
      return y + 24;
    }

    recommendations.forEach((rec) => {
      y = this.ensureSpace(doc, y, 52);
      const priorityColor =
        rec.priority === 'HIGH'
          ? this.colors.danger
          : rec.priority === 'MEDIUM'
            ? this.colors.warning
            : this.colors.success;

      doc
        .roundedRect(this.margin, y, this.contentWidth, 46, 6)
        .fill(this.colors.cream);

      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor(priorityColor)
        .text(rec.priority, this.margin + this.contentWidth - 70, y + 8, {
          width: 58,
          align: 'right',
        });

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(this.colors.textPrimary)
        .text(rec.title, this.margin + 12, y + 8, {
          width: this.contentWidth - 90,
        });

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(this.colors.textSecondary)
        .text(rec.message, this.margin + 12, y + 24, {
          width: this.contentWidth - 24,
        });

      y += 54;
    });

    return y + 8;
  }

  buildStatusBadge(cashFlowData, periodLabel = 'today') {
    const tx =
      (cashFlowData.transactions?.totalSales || 0) +
      (cashFlowData.transactions?.expenses || 0) +
      (cashFlowData.transactions?.refunds || 0) +
      (cashFlowData.cashFlow?.inflows?.debtPayments?.count || 0) +
      (cashFlowData.cashFlow?.inflows?.laybyePayments?.count || 0);

    if (tx === 0) {
      if (periodLabel === 'today') return 'No activity today';
      if (periodLabel === 'week') return 'No activity this week';
      if (periodLabel === 'month') return 'No activity this month';
      return 'No activity';
    }
    return null;
  }

  buildRecommendations(cashFlowData) {
    const { cashFlow, outstanding, revenue, details } = cashFlowData;
    const totalExpenses = details.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const recommendations = [];

    if (cashFlow.net < 0) {
      recommendations.push({
        title: 'Negative cash flow',
        message:
          'You are spending more than you earn. Review expenses and collect outstanding debts.',
        priority: 'HIGH',
      });
    } else if (revenue.total > 0 && cashFlow.net < revenue.total * 0.1) {
      recommendations.push({
        title: 'Low cash reserve',
        message:
          'Cash flow is positive but thin. Build a reserve for quieter days.',
        priority: 'MEDIUM',
      });
    }

    const expenseRatio = revenue.total > 0 ? totalExpenses / revenue.total : 0;
    if (expenseRatio > 0.6) {
      recommendations.push({
        title: 'Very high expense ratio',
        message:
          'Expenses exceed 60% of revenue. Cut non-essential costs urgently.',
        priority: 'HIGH',
      });
    } else if (expenseRatio > 0.4) {
      recommendations.push({
        title: 'High expense ratio',
        message:
          'Expenses exceed 40% of revenue. Review costs to protect margins.',
        priority: 'MEDIUM',
      });
    }

    if (outstanding.total > revenue.total * 0.3 && outstanding.total > 0) {
      recommendations.push({
        title: 'High outstanding debt',
        message: `${this.money(outstanding.total)} is owed to you. Follow up with customers to collect.`,
        priority: 'HIGH',
      });
    }

    if (revenue.total > 0 && recommendations.length === 0) {
      recommendations.push({
        title: 'Keep growing',
        message: `You've generated ${this.money(revenue.total)} in revenue. Keep cash flow healthy and expenses in check.`,
        priority: 'LOW',
      });
    }

    return recommendations;
  }

  addMainReportBody(doc, cashFlowData, y, options = {}) {
    const { cashFlow, revenue, outstanding, details, transactions } = cashFlowData;
    const periodWord = options.periodWord || 'today';
    const inflowTx =
      cashFlow.inflows.cashSales.count +
      cashFlow.inflows.debtPayments.count +
      cashFlow.inflows.laybyePayments.count;
    const outflowItems =
      cashFlow.outflows.expenses.count + cashFlow.outflows.refunds.count;
    const revenueTx =
      revenue.cash.count + revenue.credit.count + revenue.completedLaybyes.count;
    const outstandingAccounts =
      outstanding.creditDue.customers + outstanding.laybyeDue.count;
    const totalActivity =
      (transactions?.totalSales || 0) +
      (transactions?.expenses || 0) +
      (transactions?.refunds || 0) +
      cashFlow.inflows.debtPayments.count +
      cashFlow.inflows.laybyePayments.count;

    const flowNote =
      cashFlow.net >= 0
        ? `Positive flow · ${totalActivity} transaction${totalActivity === 1 ? '' : 's'} recorded`
        : `Negative flow · ${totalActivity} transaction${totalActivity === 1 ? '' : 's'} recorded`;

    y = this.drawHeroCard(doc, y, {
      label: 'Net cash flow',
      value: this.money(cashFlow.net),
      note: flowNote,
    });

    y = this.drawMetricCards(doc, y, [
      {
        label: 'Cash in',
        value: this.money(cashFlow.inflows.total),
        sub: `${inflowTx} transaction${inflowTx === 1 ? '' : 's'}`,
      },
      {
        label: 'Cash out',
        value: this.money(cashFlow.outflows.total),
        sub: `${outflowItems} item${outflowItems === 1 ? '' : 's'}`,
      },
      {
        label: 'Total revenue',
        value: this.money(revenue.total),
        sub: `${revenueTx} transaction${revenueTx === 1 ? '' : 's'}`,
      },
      {
        label: 'Outstanding debt',
        value: this.money(outstanding.total),
        sub: `${outstandingAccounts} account${outstandingAccounts === 1 ? '' : 's'}`,
      },
    ]);

    y = this.drawCleanTable(
      doc,
      y,
      'Cash flow by source',
      [
        {
          label: 'Cash sales',
          amount: this.money(cashFlow.inflows.cashSales.amount),
          count: cashFlow.inflows.cashSales.count,
        },
        {
          label: 'Debt payments',
          amount: this.money(cashFlow.inflows.debtPayments.amount),
          count: cashFlow.inflows.debtPayments.count,
        },
        {
          label: 'Laybye payments',
          amount: this.money(cashFlow.inflows.laybyePayments.amount),
          count: cashFlow.inflows.laybyePayments.count,
        },
        {
          label: 'Expenses',
          amount: this.moneyParen(cashFlow.outflows.expenses.amount),
          count: cashFlow.outflows.expenses.count,
          accent: true,
        },
        {
          label: 'Refunds',
          amount: this.moneyParen(cashFlow.outflows.refunds.amount),
          count: cashFlow.outflows.refunds.count,
          accent: true,
        },
      ],
      {
        label: 'Net cash flow',
        amount: this.money(cashFlow.net),
        count: '',
      }
    );

    y = this.drawCleanTable(
      doc,
      y,
      'Revenue & expense summary',
      [
        {
          label: 'Cash sales',
          amount: this.money(revenue.cash.amount),
          count: revenue.cash.count,
        },
        {
          label: 'Credit sales',
          amount: this.money(revenue.credit.amount),
          count: revenue.credit.count,
        },
        {
          label: 'Completed laybyes',
          amount: this.money(revenue.completedLaybyes.amount),
          count: revenue.completedLaybyes.count,
        },
        {
          label: 'Total expenses',
          amount: this.moneyParen(cashFlow.outflows.expenses.amount),
          count: cashFlow.outflows.expenses.count,
          accent: true,
        },
      ],
      {
        label: 'Total revenue',
        amount: this.money(revenue.total),
        count: '',
      }
    );

    if (options.extraBeforeSales) {
      y = options.extraBeforeSales(doc, y);
    }

    const allSales = [
      ...details.cashSales,
      ...details.creditSales,
      ...details.completedLaybyes,
    ];

    if (allSales.length === 0) {
      y = this.drawEmptyState(doc, y, 'Sales breakdown', {
        title:
          periodWord === 'today'
            ? 'No sales recorded today'
            : `No sales recorded ${periodWord}`,
        body:
          periodWord === 'today'
            ? "Sales will appear here as they're recorded through the day."
            : 'Sales will appear here once activity is recorded for this period.',
      });
    } else {
      y = this.drawSalesBreakdown(doc, y, allSales);
    }

    const recommendations = this.buildRecommendations(cashFlowData);
    const emptyRec =
      periodWord === 'today'
        ? "No recommendations to show — check back once today's activity is recorded."
        : 'No recommendations to show — check back once activity is recorded for this period.';

    y = this.drawRecommendations(doc, y, recommendations, emptyRec);

    return y;
  }

  drawSalesBreakdown(doc, y, sales) {
    y = this.ensureSpace(doc, y, 60);

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(this.colors.textPrimary)
      .text(`Sales breakdown (${sales.length})`, this.margin, y);
    y += 16;

    const sorted = [...sales].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    const rows = sorted.slice(0, 25).map((sale) => {
      const date = new Date(sale.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const type =
        sale.type === 'cash'
          ? 'Cash'
          : sale.type === 'credit'
            ? 'Credit'
            : 'Laybye';
      const itemsSummary = (sale.items || [])
        .slice(0, 2)
        .map((item) => `${item.quantity}× ${item.productName}`)
        .join(', ');
      const more =
        (sale.items || []).length > 2
          ? ` +${sale.items.length - 2}`
          : '';

      return {
        label: `${date} · ${type} · ${itemsSummary}${more}`,
        amount: this.money(sale.total),
        count: '',
      };
    });

    // Reuse clean table row drawing without repeating the section title
    const labelW = 360;
    const amountW = this.contentWidth - labelW;

    rows.forEach((row) => {
      y = this.ensureSpace(doc, y, 22);
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(this.colors.textPrimary)
        .text(row.label, this.margin, y, { width: labelW });
      doc.text(row.amount, this.margin + labelW, y, {
        width: amountW,
        align: 'right',
      });
      y += 18;
      doc
        .strokeColor(this.colors.border)
        .lineWidth(0.5)
        .moveTo(this.margin, y - 4)
        .lineTo(this.margin + this.contentWidth, y - 4)
        .stroke();
    });

    if (sorted.length > 25) {
      y += 4;
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(this.colors.textMuted)
        .text(
          `Showing 25 of ${sorted.length} sales`,
          this.margin,
          y,
          { width: this.contentWidth }
        );
      y += 14;
    }

    return y + 12;
  }

  // ─── Public report generators ─────────────────────────────────────────

  async generateEnhancedDailyReportPDF(shop, callback) {
    try {
      console.log('[PDFService] Generating enhanced daily report');

      const financialReport = await FinancialService.getDailyCashFlow(shop._id);
      if (!financialReport.success) {
        return callback(new Error(financialReport.message), null);
      }

      const { data } = financialReport;
      const doc = new PDFDocument({ margin: this.margin, size: 'A4', bufferPages: true });
      const filename = `${shop.businessName.replace(/\s+/g, '_')}_Daily_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      const filePath = path.join(this.ensureReportsDirectory(), filename);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const badge = this.buildStatusBadge(data, 'today');
      let y = this.addReportHeader(
        doc,
        shop,
        'Daily financial report',
        this.formatDateLong(new Date()),
        badge
      );

      this.addMainReportBody(doc, data, y, { periodWord: 'today' });
      this.addFooter(doc);
      doc.end();

      stream.on('finish', () => {
        console.log('[PDFService] PDF generated successfully:', filename);
        callback(null, { filePath, filename });
      });
      stream.on('error', (error) => {
        console.error('[PDFService] Stream error:', error);
        callback(error, null);
      });
    } catch (error) {
      console.error('[PDFService] Enhanced daily report error:', error);
      callback(error, null);
    }
  }

  async generateEnhancedWeeklyReportPDF(shop, callback) {
    try {
      const financialReport = await FinancialService.getWeeklyCashFlow(shop._id);
      if (!financialReport.success) {
        return callback(new Error(financialReport.message), null);
      }

      const { data } = financialReport;
      const doc = new PDFDocument({ margin: this.margin, size: 'A4', bufferPages: true });
      const filename = `${shop.businessName.replace(/\s+/g, '_')}_Weekly_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      const filePath = path.join(this.ensureReportsDirectory(), filename);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const period = `${this.formatDateLong(data.period.startDate)} – ${this.formatDateLong(data.period.endDate)}`;
      const badge = this.buildStatusBadge(data, 'week');
      let y = this.addReportHeader(
        doc,
        shop,
        'Weekly financial report',
        period,
        badge
      );

      this.addMainReportBody(doc, data, y, { periodWord: 'this week' });
      this.addFooter(doc);
      doc.end();

      stream.on('finish', () => callback(null, { filePath, filename }));
      stream.on('error', (error) => callback(error, null));
    } catch (error) {
      console.error('[PDFService] Enhanced weekly report error:', error);
      callback(error, null);
    }
  }

  async generateEnhancedMonthlyReportPDF(shop, monthParam = null, callback) {
    try {
      if (typeof monthParam === 'function') {
        callback = monthParam;
        monthParam = null;
      }

      const financialReport = await FinancialService.getMonthlyCashFlow(
        shop._id,
        monthParam
      );
      if (!financialReport.success) {
        return callback(new Error(financialReport.message), null);
      }

      const { data, monthInfo } = financialReport;
      const doc = new PDFDocument({ margin: this.margin, size: 'A4', bufferPages: true });

      const monthLabel = monthInfo
        ? monthInfo.label
        : new Date().toLocaleString('default', { month: 'long' });
      const year = monthInfo ? monthInfo.year : new Date().getFullYear();
      const filename = `${shop.businessName.replace(/\s+/g, '_')}_Monthly_Report_${monthLabel}_${year}.pdf`;
      const filePath = path.join(this.ensureReportsDirectory(), filename);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const subtitle = monthInfo
        ? monthInfo.isCurrentMonth
          ? `${monthInfo.label} ${monthInfo.year} · ${monthInfo.daysElapsed} of ${monthInfo.daysInMonth} days`
          : `${monthInfo.label} ${monthInfo.year} · Complete month`
        : `${this.formatDateLong(data.period.startDate)} – ${this.formatDateLong(data.period.endDate)}`;

      const badge = this.buildStatusBadge(data, 'month');
      let y = this.addReportHeader(
        doc,
        shop,
        'Monthly financial report',
        subtitle,
        badge
      );

      this.addMainReportBody(doc, data, y, {
        periodWord: 'this month',
        extraBeforeSales: (d, pos) => {
          if (!monthInfo) return pos;

          const dailyRevenue = data.revenue.total / monthInfo.daysElapsed;
          const dailyCashFlow = data.cashFlow.net / monthInfo.daysElapsed;
          const dailyExpenses =
            data.cashFlow.outflows.total / monthInfo.daysElapsed;
          const dailyTx =
            data.transactions.totalSales / monthInfo.daysElapsed;

          return this.drawCleanTable(d, pos, 'Daily averages', [
            {
              label: 'Revenue',
              amount: this.money(dailyRevenue),
              count: '',
            },
            {
              label: 'Cash flow',
              amount: this.money(dailyCashFlow),
              count: '',
            },
            {
              label: 'Expenses',
              amount: this.money(dailyExpenses),
              count: '',
              accent: true,
            },
            {
              label: 'Transactions',
              amount: dailyTx.toFixed(1),
              count: '',
            },
          ]);
        },
      });

      this.addFooter(doc);
      doc.end();

      stream.on('finish', () => callback(null, { filePath, filename }));
      stream.on('error', (error) => callback(error, null));
    } catch (error) {
      console.error('[PDFService] Enhanced monthly report error:', error);
      callback(error, null);
    }
  }

  generateBestSellersReportPDF(shop, sales, startDate, endDate, days, callback) {
    const doc = new PDFDocument({ margin: this.margin, size: 'A4', bufferPages: true });
    const periodText = days === 1 ? 'Today' : days === 7 ? 'Weekly' : 'Monthly';
    const filename = `${shop.businessName.replace(/\s+/g, '_')}_BestSellers_${periodText}_${startDate.toISOString().split('T')[0]}.pdf`;
    const filePath = path.join(this.ensureReportsDirectory(), filename);
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    try {
      const reportTitle =
        days === 1
          ? 'Best sellers · Today'
          : days === 7
            ? 'Best sellers · This week'
            : 'Best sellers · This month';

      let y = this.addReportHeader(
        doc,
        shop,
        reportTitle,
        `${this.formatDateLong(startDate)} – ${this.formatDateLong(endDate)}`,
        sales.length === 0 ? 'No sales' : null
      );

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

      const totalItems = Object.values(productSales).reduce(
        (sum, p) => sum + p.quantity,
        0
      );
      const totalRevenue = Object.values(productSales).reduce(
        (sum, p) => sum + p.revenue,
        0
      );

      y = this.drawMetricCards(doc, y, [
        {
          label: 'Items sold',
          value: String(totalItems),
          sub: 'units',
        },
        {
          label: 'Revenue',
          value: this.money(totalRevenue),
          sub: 'from ranked products',
        },
        {
          label: 'Products',
          value: String(Object.keys(productSales).length),
          sub: 'unique',
        },
        {
          label: 'Transactions',
          value: String(sales.length),
          sub: 'sales',
        },
      ]);

      if (Object.keys(productSales).length === 0) {
        y = this.drawEmptyState(doc, y, 'Product ranking', {
          title: 'No products to rank',
          body: 'Best sellers will appear here once sales are recorded.',
        });
      } else {
        const sortedProducts = Object.entries(productSales).sort(
          (a, b) => b[1].quantity - a[1].quantity
        );

        y = this.drawCleanTable(
          doc,
          y,
          'Product ranking',
          sortedProducts.map(([product, data], index) => {
            const share =
              totalItems > 0
                ? ((data.quantity / totalItems) * 100).toFixed(1)
                : '0.0';
            return {
              label: `${index + 1}. ${product}`,
              amount: this.money(data.revenue),
              count: `${data.quantity} · ${share}%`,
            };
          })
        );

        const topProduct = sortedProducts[0];
        const top3Revenue = sortedProducts
          .slice(0, 3)
          .reduce((sum, [, data]) => sum + data.revenue, 0);
        const top3Percentage =
          totalRevenue > 0
            ? ((top3Revenue / totalRevenue) * 100).toFixed(0)
            : 0;

        y = this.ensureSpace(doc, y, 70);
        doc.roundedRect(this.margin, y, this.contentWidth, 58, 8).fill(
          this.colors.primaryTint
        );
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(this.colors.primaryDark)
          .text('Key insights', this.margin + 14, y + 12);
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor(this.colors.primary)
          .text(
            `Best seller: ${topProduct[0]} (${topProduct[1].quantity} units) · Top 3 generate ${top3Percentage}% of revenue · Avg price ${this.money(totalRevenue / Math.max(totalItems, 1))}`,
            this.margin + 14,
            y + 30,
            { width: this.contentWidth - 28 }
          );
      }

      this.addFooter(doc);
      doc.end();

      stream.on('finish', () => callback(null, { filePath, filename }));
      stream.on('error', (error) => callback(error, null));
    } catch (error) {
      callback(error, null);
    }
  }

  generateDailyReportPDF(shop, sales, date, callback) {
    this.generateEnhancedDailyReportPDF(shop, callback);
  }

  generateWeeklyReportPDF(shop, sales, startDate, endDate, callback) {
    this.generateEnhancedWeeklyReportPDF(shop, callback);
  }

  generateMonthlyReportPDF(shop, sales, startDate, endDate, monthParam, callback) {
    if (typeof monthParam === 'function') {
      callback = monthParam;
      monthParam = null;
    }

    if (typeof startDate === 'function') {
      callback = startDate;
      monthParam = null;
    }

    this.generateEnhancedMonthlyReportPDF(shop, monthParam, callback);
  }
}

export default new PDFService();
