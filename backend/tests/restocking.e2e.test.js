/**
 * Restock / inventory fund transfer end-to-end.
 * Admin can restock; members can only record operating expenses.
 * Cash out includes restock; profit / today's expenses do not.
 */
import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "http";
import bcrypt from "bcryptjs";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  process.env.TELEGRAM_BOT_TOKEN = "000000000:RESTOCK_E2E_DUMMY_TOKEN";
}

const { connectTestDb, disconnectTestDb, wipeShopData } = await import(
  "./helpers/mongo.js"
);
const { createTestShop, createTestProduct, uniqueUsername } = await import(
  "./helpers/fixtures.js"
);
const { default: createApp } = await import("../app.js");
const { default: User } = await import("../models/User.js");
const { handleExpenseRecording, handleExpenseReports } = await import(
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

describe("Restocking fund transfer e2e", () => {
  let server;
  let shop;
  let adminUser;
  let memberUser;
  let adminUsername;
  let memberUsername;
  let pin;
  let adminToken;
  let memberToken;

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
    adminUser = created.user;
    adminUsername = created.username;
    await createTestProduct(shop._id, {
      name: "restock-bread",
      price: 10,
      costPrice: 4,
      stock: 100,
    });

    memberUsername = uniqueUsername("mem");
    memberUser = await User.create({
      shopId: shop._id,
      username: memberUsername,
      displayName: "Member",
      pin: await bcrypt.hash(pin, 10),
      role: "member",
      isActive: true,
    });

    adminToken = await login(server, adminUsername, pin);
    memberToken = await login(server, memberUsername, pin);

    const sale = await request(server, {
      method: "POST",
      path: "/api/v1/sales/cash",
      token: adminToken,
      body: { items: [{ name: "restock-bread", quantity: 10 }] },
    });
    assert.equal(sale.status, 201, sale.raw);
    assert.equal(sale.body.sale.total, 100);
  });

  afterEach(async () => {
    await wipeShopData({
      shopId: shop._id,
      username: adminUsername,
    });
    if (memberUsername) {
      await User.deleteMany({ username: memberUsername });
    }
  });

  it("lets members record operating expenses but blocks restock", async () => {
    const expense = await request(server, {
      method: "POST",
      path: "/api/v1/expenses",
      token: memberToken,
      body: {
        amount: 8,
        description: "taxi",
        category: "transport",
      },
    });
    assert.equal(expense.status, 201, expense.raw);
    assert.equal(expense.body.expense.kind, "operating_expense");

    const blocked = await request(server, {
      method: "POST",
      path: "/api/v1/expenses",
      token: memberToken,
      body: {
        amount: 20,
        description: "stock top-up",
        category: "restocking",
        kind: "inventory_fund_transfer",
      },
    });
    assert.equal(blocked.status, 403, blocked.raw);
    assert.equal(blocked.body.code, "ADMIN_REQUIRED");

    const chat = await handleExpenseRecording(
      shop._id,
      "expense 20 restock cash",
      String(memberUser._id)
    );
    assert.match(String(chat), /Only admins can record restock/i);
  });

  it("admin restock reduces till cash but not operating expenses or profit", async () => {
    const restock = await request(server, {
      method: "POST",
      path: "/api/v1/expenses",
      token: adminToken,
      body: {
        amount: 40,
        description: "Supplier stock",
        category: "restocking",
        kind: "inventory_fund_transfer",
      },
    });
    assert.equal(restock.status, 201, restock.raw);
    assert.equal(restock.body.expense.kind, "inventory_fund_transfer");
    assert.equal(restock.body.expense.category, "restocking");

    const rent = await request(server, {
      method: "POST",
      path: "/api/v1/expenses",
      token: adminToken,
      body: {
        amount: 15,
        description: "stall rent",
        category: "rent",
      },
    });
    assert.equal(rent.status, 201, rent.raw);

    const cash = await request(server, {
      path: "/api/v1/expenses/cash-available",
      token: adminToken,
    });
    assert.equal(cash.status, 200, cash.raw);
    assert.equal(cash.body.cashAvailable, 45);

    const list = await request(server, {
      path: "/api/v1/expenses?period=daily",
      token: adminToken,
    });
    assert.equal(list.status, 200, list.raw);
    assert.equal(list.body.total, 55);
    assert.equal(list.body.operatingTotal, 15);
    assert.equal(list.body.inventoryTransferTotal, 40);

    const report = await request(server, {
      path: "/api/v1/reports/daily",
      token: adminToken,
    });
    assert.equal(report.status, 200, report.raw);
    const data = report.body.data;
    assert.equal(data.cashFlow.outflows.expenses.amount, 15);
    assert.equal(data.cashFlow.outflows.inventoryTransfers.amount, 40);
    assert.equal(data.cashFlow.outflows.total, 55);
    assert.equal(data.profitability.expenses, 15);
    assert.equal(data.profitability.operatingResult, 100 - 15);
    assert.match(String(report.body.report), /Inventory Fund Transfers/i);

    const stats = await request(server, {
      path: "/api/v1/stats?days=7",
      token: adminToken,
    });
    assert.equal(stats.status, 200, stats.raw);
    assert.equal(stats.body.snapshots.todayExpenses, 15);
    assert.equal(stats.body.snapshots.todayInventoryTransfers, 40);
    assert.equal(stats.body.snapshots.todayLeft, 85);

    const chatReport = await handleExpenseReports(shop._id, "expenses daily");
    assert.match(String(chatReport), /Operating Expenses: \$15\.00/);
    assert.match(String(chatReport), /Inventory Fund Transfers: \$40\.00/);

    const chatRestock = await handleExpenseRecording(
      shop._id,
      'expense 5 "more stock" restocking cash',
      String(adminUser._id)
    );
    assert.match(String(chatRestock), /INVENTORY FUND TRANSFER/i);
  });
});
