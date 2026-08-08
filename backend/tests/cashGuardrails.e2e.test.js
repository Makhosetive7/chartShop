/**
 * Cash guardrails + hustler dashboard KPI end-to-end.
 * Covers till math, overspend confirm, credit≠cash, shop isolation, stats fields.
 */
import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "http";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  process.env.TELEGRAM_BOT_TOKEN = "000000000:CASH_GUARD_E2E_DUMMY_TOKEN";
}

const { connectTestDb, disconnectTestDb, wipeShopData } = await import(
  "./helpers/mongo.js"
);
const { createTestShop, createTestProduct } = await import(
  "./helpers/fixtures.js"
);
const { default: createApp } = await import("../app.js");
const { default: Shop } = await import("../models/Shop.js");
const { default: FinancialService } = await import(
  "../services/FinancialService.js"
);
const { handleExpenseRecording } = await import(
  "../services/commands/handlers/expenses.js"
);

function request(server, { method = "GET", path, body, token } = {}) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const payload = body != null ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: addr.port,
        path,
        method,
        headers: {
          ...(payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch {
            json = raw;
          }
          resolve({ status: res.statusCode, body: json, raw });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function login(server, username, pin) {
  const res = await request(server, {
    method: "POST",
    path: "/api/v1/auth/login",
    body: { username, pin },
  });
  assert.equal(res.status, 200, res.raw);
  return res.body.token;
}

describe("Cash guardrails + dashboard KPIs e2e", () => {
  let server;
  let shop;
  let username;
  let pin;
  let token;

  before(async () => {
    await connectTestDb();
    const app = createApp();
    server = await new Promise((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
  });

  after(async () => {
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
    await disconnectTestDb();
  });

  beforeEach(async () => {
    pin = "4829";
    const created = await createTestShop({ pin });
    shop = created.shop;
    username = created.username;
    await createTestProduct(shop._id, {
      name: "till-bread",
      price: 10,
      costPrice: 4,
      stock: 100,
    });
    token = await login(server, username, pin);
  });

  afterEach(async () => {
    await wipeShopData({ shopId: shop._id, username });
  });

  it("starts with empty till and blocks silent overspend", async () => {
    const cash = await request(server, {
      path: "/api/v1/expenses/cash-available",
      token,
    });
    assert.equal(cash.status, 200, cash.raw);
    assert.equal(cash.body.cashAvailable, 0);

    const blocked = await request(server, {
      method: "POST",
      path: "/api/v1/expenses",
      token,
      body: {
        amount: 50,
        description: "rent without cash",
        category: "rent",
      },
    });
    assert.equal(blocked.status, 409, blocked.raw);
    assert.equal(blocked.body.code, "INSUFFICIENT_CASH");
    assert.equal(blocked.body.cashAvailable, 0);
    assert.equal(blocked.body.amount, 50);
    assert.equal(blocked.body.shortfall, 50);
    assert.equal(blocked.body.success, false);
  });

  it("cash sale fills till; expense within cash succeeds; credit sale does not", async () => {
    const sale = await request(server, {
      method: "POST",
      path: "/api/v1/sales/cash",
      token,
      body: { items: [{ name: "till-bread", quantity: 3 }] },
    });
    assert.equal(sale.status, 201, sale.raw);
    assert.equal(sale.body.sale.total, 30);

    let cash = await request(server, {
      path: "/api/v1/expenses/cash-available",
      token,
    });
    assert.equal(cash.body.cashAvailable, 30);

    const okExpense = await request(server, {
      method: "POST",
      path: "/api/v1/expenses",
      token,
      body: {
        amount: 12,
        description: "transport",
        category: "transport",
      },
    });
    assert.equal(okExpense.status, 201, okExpense.raw);
    assert.equal(okExpense.body.ownerCashIn || 0, 0);

    cash = await request(server, {
      path: "/api/v1/expenses/cash-available",
      token,
    });
    assert.equal(cash.body.cashAvailable, 18);

    // Credit sale must not inflate till
    const customer = await request(server, {
      method: "POST",
      path: "/api/v1/customers",
      token,
      body: { name: "Till Debtor", phone: "0770000111" },
    });
    assert.equal(customer.status, 201);

    const credit = await request(server, {
      method: "POST",
      path: "/api/v1/sales/credit",
      token,
      body: {
        customer: "Till Debtor",
        items: [{ name: "till-bread", quantity: 2 }],
      },
    });
    assert.equal(credit.status, 201, credit.raw);

    cash = await request(server, {
      path: "/api/v1/expenses/cash-available",
      token,
    });
    assert.equal(
      cash.body.cashAvailable,
      18,
      "credit sale must not change till cash"
    );

    // Debt payment does add cash
    const pay = await request(server, {
      method: "POST",
      path: `/api/v1/customers/${customer.body.customer.id}/payment`,
      token,
      body: { amount: 20 },
    });
    assert.equal(pay.status, 200, pay.raw);

    cash = await request(server, {
      path: "/api/v1/expenses/cash-available",
      token,
    });
    assert.equal(cash.body.cashAvailable, 38);
  });

  it("override records owner cash-in for shortfall and keeps till coherent", async () => {
    const sale = await request(server, {
      method: "POST",
      path: "/api/v1/sales/cash",
      token,
      body: { items: [{ name: "till-bread", quantity: 1 }] },
    });
    assert.equal(sale.status, 201);
    // till = 10

    const blocked = await request(server, {
      method: "POST",
      path: "/api/v1/expenses",
      token,
      body: {
        amount: 25,
        description: "generator fuel",
        category: "other",
      },
    });
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.shortfall, 15);

    const forced = await request(server, {
      method: "POST",
      path: "/api/v1/expenses",
      token,
      body: {
        amount: 25,
        description: "generator fuel",
        category: "other",
        allowOverspend: true,
      },
    });
    assert.equal(forced.status, 201, forced.raw);
    assert.equal(forced.body.ownerCashIn, 15);
    assert.equal(forced.body.cashAvailable, 0);

    const shopDoc = await Shop.findById(shop._id).lean();
    const cashIns = shopDoc.ownerCashIns || [];
    assert.equal(cashIns.length, 1);
    assert.equal(cashIns[0].amount, 15);

    const cash = await FinancialService.getCashAvailable(shop._id);
    assert.equal(cash.available, 0);
    assert.equal(cash.breakdown.ownerCashIns, 15);
    assert.equal(cash.breakdown.expenses, 25);
    assert.equal(cash.breakdown.cashSales, 10);
  });

  it("chat expense requires confirm suffix when till is short", async () => {
    const warn = await handleExpenseRecording(
      shop._id,
      'expense 40 "market fees" market_fees'
    );
    assert.match(String(warn), /confirm/i);
    assert.match(String(warn), /Not enough recorded cash/i);

    const ok = await handleExpenseRecording(
      shop._id,
      'expense 40 "market fees" market_fees confirm'
    );
    assert.match(String(ok), /EXPENSE RECORDED/i);
    assert.match(String(ok), /Owner cash-in/i);

    const cash = await FinancialService.getCashAvailable(shop._id);
    assert.equal(cash.available, 0);
  });

  it("stats overview exposes hustler KPI fields without leaking other shops", async () => {
    const other = await createTestShop({ pin: "7391" });
    await createTestProduct(other.shop._id, {
      name: "other-secret",
      price: 99,
      stock: 5,
      lowStockThreshold: 10,
    });
    const otherToken = await login(server, other.username, other.pin);
    await request(server, {
      method: "POST",
      path: "/api/v1/sales/cash",
      token: otherToken,
      body: { items: [{ name: "other-secret", quantity: 1 }] },
    });

    // Our shop activity
    await request(server, {
      method: "POST",
      path: "/api/v1/sales/cash",
      token,
      body: { items: [{ name: "till-bread", quantity: 2 }] },
    });
    await request(server, {
      method: "POST",
      path: "/api/v1/expenses",
      token,
      body: { amount: 5, description: "airtime", category: "other" },
    });

    const customer = await request(server, {
      method: "POST",
      path: "/api/v1/customers",
      token,
      body: { name: "KPI Debtor", phone: "0772222333" },
    });
    await request(server, {
      method: "POST",
      path: "/api/v1/sales/credit",
      token,
      body: {
        customer: "KPI Debtor",
        items: [{ name: "till-bread", quantity: 1 }],
      },
    });

    const laybye = await request(server, {
      method: "POST",
      path: "/api/v1/laybye",
      token,
      body: {
        customer: "KPI Debtor",
        items: [{ name: "till-bread", quantity: 1 }],
        deposit: 2,
      },
    });
    assert.equal(laybye.status, 201, laybye.raw);

    const stats = await request(server, {
      path: "/api/v1/stats?days=30&limit=5",
      token,
    });
    assert.equal(stats.status, 200, stats.raw);
    const snap = stats.body.snapshots;
    assert.ok(snap, "snapshots required");
    assert.equal(typeof snap.cashAvailable, "number");
    assert.equal(typeof snap.todayExpenses, "number");
    assert.equal(typeof snap.todayLeft, "number");
    assert.ok(snap.today.byType);
    assert.equal(typeof snap.today.byType.cash, "number");
    assert.equal(typeof snap.today.byType.credit, "number");
    assert.ok(snap.laybyeDue);
    assert.equal(typeof snap.laybyeDue.amount, "number");
    assert.equal(typeof snap.laybyeDue.count, "number");

    // Cash: 20 sale + 2 laybye deposit − 5 expense = 17
    assert.equal(snap.cashAvailable, 17);
    assert.equal(snap.today.byType.cash, 20);
    assert.equal(snap.today.byType.credit, 10);
    assert.equal(snap.todayExpenses, 5);
    assert.equal(snap.todayLeft, snap.today.revenue - snap.todayExpenses);
    assert.ok(snap.laybyeDue.count >= 1);
    assert.ok(snap.laybyeDue.amount > 0);
    assert.ok(stats.body.customers.totals.totalOutstanding >= 10);
    assert.equal(typeof stats.body.inventory.lowStock, "number");
    assert.equal(typeof stats.body.inventory.outOfStock, "number");

    const blob = JSON.stringify(stats.body);
    assert.ok(!/other-secret/i.test(blob), "must not leak other shop products");
    assert.ok(!/99/.test(String(snap.cashAvailable)));

    // Other shop till independent
    const otherCash = await request(server, {
      path: "/api/v1/expenses/cash-available",
      token: otherToken,
    });
    assert.equal(otherCash.body.cashAvailable, 99);

    await wipeShopData({
      shopId: other.shop._id,
      username: other.username,
    });
  });

  it("daily report includes cashAvailable and period insights", async () => {
    await request(server, {
      method: "POST",
      path: "/api/v1/sales/cash",
      token,
      body: { items: [{ name: "till-bread", quantity: 1 }] },
    });
    await request(server, {
      method: "POST",
      path: "/api/v1/expenses",
      token,
      body: {
        amount: 50,
        description: "big rent",
        category: "rent",
        allowOverspend: true,
      },
    });

    const daily = await request(server, {
      path: "/api/v1/reports/daily",
      token,
    });
    assert.equal(daily.status, 200, daily.raw);
    assert.ok(Array.isArray(daily.body.data.insights));
    assert.ok(daily.body.data.insights.length > 0);
    assert.equal(typeof daily.body.data.cashAvailable, "number");
    assert.match(daily.body.report || "", /Cash available|earlier days|Expenses/i);
  });
});
