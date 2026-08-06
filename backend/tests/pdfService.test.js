import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import PDFService from "../services/PDFService.js";

function emptyCashFlow() {
  return {
    period: {
      startDate: new Date("2026-08-05"),
      endDate: new Date("2026-08-05"),
    },
    cashFlow: {
      inflows: {
        cashSales: { amount: 0, count: 0 },
        debtPayments: { amount: 0, count: 0 },
        laybyePayments: { amount: 0, count: 0 },
        total: 0,
      },
      outflows: {
        expenses: { amount: 0, count: 0 },
        refunds: { amount: 0, count: 0 },
        total: 0,
      },
      net: 0,
    },
    revenue: {
      cash: { amount: 0, count: 0 },
      credit: { amount: 0, count: 0 },
      completedLaybyes: { amount: 0, count: 0 },
      total: 0,
    },
    profitability: {
      expenses: 0,
      operatingResult: 0,
      profitMargin: 0,
      netProfit: 0,
      hasProductCosts: false,
    },
    outstanding: {
      creditDue: { amount: 0, customers: 0 },
      laybyeDue: { amount: 0, count: 0 },
      total: 0,
    },
    transactions: { totalSales: 0, expenses: 0, refunds: 0 },
    details: {
      expenses: [],
      cashSales: [],
      creditSales: [],
      completedLaybyes: [],
      refunds: [],
    },
  };
}

function writeReportPdf(filePath, data) {
  return new Promise((resolve, reject) => {
    const shop = { _id: "test", businessName: "Renal Consumables" };
    const doc = new PDFDocument({
      margin: PDFService.margin,
      size: "A4",
      bufferPages: true,
    });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const badge = PDFService.buildStatusBadge(data, "today");
    let y = PDFService.addReportHeader(
      doc,
      shop,
      "Daily financial report",
      PDFService.formatDateLong(new Date("2026-08-05")),
      badge
    );
    PDFService.addMainReportBody(doc, data, y, { periodWord: "today" });
    PDFService.addFooter(doc);
    doc.end();

    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

describe("PDFService redesign", () => {
  const outDir = path.join(process.cwd(), "reports");
  const emptyPath = path.join(outDir, "test-redesign-empty.pdf");
  const activePath = path.join(outDir, "test-redesign-active.pdf");

  before(() => {
    fs.mkdirSync(outDir, { recursive: true });
  });

  after(() => {
    for (const p of [emptyPath, activePath]) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  });

  it("uses frontend brand colors", () => {
    assert.equal(PDFService.colors.primary, "#8B1E3A");
    assert.equal(PDFService.colors.primaryTint, "#F8E8EC");
    assert.equal(PDFService.colors.cream, "#F7F1EB");
    assert.equal(PDFService.colors.textPrimary, "#1A0A0A");
  });

  it("flags empty activity with a status badge", () => {
    assert.equal(
      PDFService.buildStatusBadge(emptyCashFlow(), "today"),
      "No activity today"
    );
  });

  it("writes a valid empty daily report PDF", async () => {
    await writeReportPdf(emptyPath, emptyCashFlow());
    const stat = fs.statSync(emptyPath);
    assert.ok(stat.size > 500, `expected PDF bytes, got ${stat.size}`);
    const head = fs.readFileSync(emptyPath).subarray(0, 5).toString("utf8");
    assert.equal(head, "%PDF-");
  });

  it("writes a valid active daily report PDF with sales", async () => {
    const data = emptyCashFlow();
    data.cashFlow.inflows.cashSales = { amount: 1250.5, count: 2 };
    data.cashFlow.inflows.total = 1250.5;
    data.cashFlow.outflows.expenses = { amount: 100, count: 1 };
    data.cashFlow.outflows.total = 100;
    data.cashFlow.net = 1150.5;
    data.revenue.cash = { amount: 1250.5, count: 2 };
    data.revenue.total = 1250.5;
    data.transactions.totalSales = 2;
    data.transactions.expenses = 1;
    data.details.cashSales = [
      {
        date: new Date("2026-08-05T10:00:00"),
        type: "cash",
        total: 250,
        items: [{ quantity: 2, productName: "Dialysis kit" }],
      },
      {
        date: new Date("2026-08-05T14:00:00"),
        type: "cash",
        total: 1000.5,
        items: [{ quantity: 1, productName: "Filter set" }],
      },
    ];
    data.details.expenses = [
      {
        date: new Date("2026-08-05"),
        amount: 100,
        description: "Transport",
        category: "transport",
        paymentMethod: "cash",
      },
    ];

    assert.equal(PDFService.buildStatusBadge(data, "today"), null);
    assert.ok(PDFService.buildRecommendations(data).length >= 1);

    await writeReportPdf(activePath, data);
    const stat = fs.statSync(activePath);
    assert.ok(stat.size > 500, `expected PDF bytes, got ${stat.size}`);
    const head = fs.readFileSync(activePath).subarray(0, 5).toString("utf8");
    assert.equal(head, "%PDF-");
  });
});
