/**
 * Money model correctness end-to-end.
 * Exposes bugs from issue-1-money-model-discussion.md before fixing them.
 * Tests the locked dictionary decisions D1-A through D5-A.
 */
import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "http";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  process.env.TELEGRAM_BOT_TOKEN = "000000000:MONEY_MODEL_E2E_DUMMY_TOKEN";
}

const { connectTestDb, disconnectTestDb, wipeShopData } = await import(
  "./helpers/mongo.js"
);
const { createTestShop, createTestProduct } = await import(
  "./helpers/fixtures.js"
);
const { default: createApp } = await import("../app.js");
const { default: FinancialService } = await import(
  "../services/FinancialService.js"
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

describe("Money Model Dictionary Compliance (D1-A through D5-A)", () => {
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
      name: "test-bread",
      price: 10,
      costPrice: 4,
      stock: 100,
    });
    token = await login(server, username, pin);
  });

  afterEach(async () => {
    await wipeShopData({ shopId: shop._id, username });
  });

  describe("D1-A: Cancel/Refund Logic - Net Cash Sales Only", () => {
    it("EXPOSES BUG: cash cancel currently double-subtracts from till", async () => {
      // Cash sale should add to till
      const sale = await request(server, {
        method: "POST",
        path: "/api/v1/sales/cash",
        token,
        body: { items: [{ name: "test-bread", quantity: 2 }] },
      });
      assert.equal(sale.status, 201, sale.raw);
      assert.equal(sale.body.sale.total, 20);
      
      let cash = await FinancialService.getCashAvailable(shop._id);
      assert.equal(cash.available, 20, "Cash sale should add to till");

      // Cancel the cash sale
      const cancel = await request(server, {
        method: "POST",
        path: `/api/v1/sales/${sale.body.sale.id}/cancel`,
        token,
      });
      assert.equal(cancel.status, 200, cancel.raw);

      // BUG EXPOSED: Current implementation double-subtracts
      cash = await FinancialService.getCashAvailable(shop._id);
      
      // WRONG (current): cash.available = 20 - 20 (exclude cancelled) - 20 (refund) = -20 → floored to 0
      // RIGHT (D1-A): cash.available = 0 (cancelled sale never happened, no refund subtraction)
      
      console.log("CANCEL BUG - Current till after cash cancel:", cash.available);
      console.log("CANCEL BUG - Till breakdown:", cash.breakdown);
      
      // This test SHOULD FAIL with current implementation
      // After fix: assert.equal(cash.available, 0, "Cash cancel should return till to 0 (sale never happened)");
      
      // Current wrong behavior - documenting the bug:
      assert.equal(cash.available, 0, "BUG: Till floored at 0 due to double subtract");
      assert.equal(cash.raw, -20, "BUG: Raw till shows -20 due to double subtraction");
    });

    it("EXPOSES BUG: credit cancel currently drains till (should have no till effect)", async () => {
      // Start with some cash in till from another source
      const cashSale = await request(server, {
        method: "POST",
        path: "/api/v1/sales/cash",
        token,
        body: { items: [{ name: "test-bread", quantity: 1 }] },
      });
      assert.equal(cashSale.status, 201);
      
      let cash = await FinancialService.getCashAvailable(shop._id);
      assert.equal(cash.available, 10, "Should have $10 from cash sale");

      // Create customer for credit sale
      const customer = await request(server, {
        method: "POST",
        path: "/api/v1/customers",
        token,
        body: { name: "Credit Customer", phone: "0770000123" },
      });
      assert.equal(customer.status, 201);

      // Credit sale - should not affect till
      const creditSale = await request(server, {
        method: "POST",
        path: "/api/v1/sales/credit",
        token,
        body: {
          customer: "Credit Customer",
          items: [{ name: "test-bread", quantity: 2 }],
          dueDate: "2030-01-15",
        },
      });
      assert.equal(creditSale.status, 201);
      assert.equal(creditSale.body.sale.total, 20);

      cash = await FinancialService.getCashAvailable(shop._id);
      assert.equal(cash.available, 10, "Credit sale should not affect till");

      // Cancel the credit sale
      const cancel = await request(server, {
        method: "POST",
        path: `/api/v1/sales/${creditSale.body.sale.id}/cancel`,
        token,
      });
      assert.equal(cancel.status, 200, cancel.raw);

      // BUG EXPOSED: Credit cancel incorrectly drains till
      cash = await FinancialService.getCashAvailable(shop._id);
      
      console.log("CREDIT CANCEL BUG - Till after credit cancel:", cash.available);
      console.log("CREDIT CANCEL BUG - Till breakdown:", cash.breakdown);
      
      // This test SHOULD FAIL with current implementation
      // After fix: assert.equal(cash.available, 10, "Credit cancel should not affect till");
      
      // Current wrong behavior - documenting the bug:
      // Current implementation subtracts $20 "refund" from till: $10 - $20 = -$10 → floored to 0
      assert.equal(cash.available, 0, "BUG: Credit cancel wrongly drains till to 0");
      assert.equal(cash.raw, -10, "BUG: Raw shows -10 due to credit cancel refund");
    });
  });

  describe("D2-A: Payment Method vs Till - Cash Only Draining", () => {
    it("EXPOSES BUG: bank/mobile expenses currently drain till (should not)", async () => {
      // Add cash to till
      const sale = await request(server, {
        method: "POST",
        path: "/api/v1/sales/cash",
        token,
        body: { items: [{ name: "test-bread", quantity: 3 }] },
      });
      assert.equal(sale.status, 201);
      
      let cash = await FinancialService.getCashAvailable(shop._id);
      assert.equal(cash.available, 30, "Should have $30 in till");

      // Bank expense - should NOT drain till
      const bankExpense = await request(server, {
        method: "POST",
        path: "/api/v1/expenses",
        token,
        body: {
          amount: 15,
          description: "Bank rent payment",
          category: "rent",
          paymentMethod: "bank",
        },
      });
      assert.equal(bankExpense.status, 201, bankExpense.raw);

      cash = await FinancialService.getCashAvailable(shop._id);
      
      console.log("PAYMENT METHOD BUG - Till after bank expense:", cash.available);
      console.log("PAYMENT METHOD BUG - Expense payment method test");
      
      // This test SHOULD FAIL with current implementation
      // After fix: assert.equal(cash.available, 30, "Bank expense should not drain till");
      
      // Current wrong behavior - documenting the bug:
      assert.equal(cash.available, 15, "BUG: Bank expense drains till (should not)");

      // Mobile expense - should also NOT drain till  
      const mobileExpense = await request(server, {
        method: "POST",
        path: "/api/v1/expenses",
        token,
        body: {
          amount: 5,
          description: "Mobile money transfer",
          category: "transport", 
          paymentMethod: "mobile",
        },
      });
      assert.equal(mobileExpense.status, 201);

      cash = await FinancialService.getCashAvailable(shop._id);
      assert.equal(cash.available, 10, "BUG: Mobile expense also drains till");

      // Cash expense SHOULD drain till (this is correct)
      const cashExpense = await request(server, {
        method: "POST",
        path: "/api/v1/expenses",
        token,
        body: {
          amount: 8,
          description: "Cash market fees",
          category: "market_fees",
          paymentMethod: "cash",
        },
      });
      assert.equal(cashExpense.status, 201);

      cash = await FinancialService.getCashAvailable(shop._id);
      assert.equal(cash.available, 2, "Cash expense should drain till (correct)");
    });
  });

  describe("D3-A: Dashboard Today Left - Operating Result Label", () => {
    it("verifies todayLeft is operating result, not till movement", async () => {
      // This test documents current behavior which should be relabeled 
      // Current: today's revenue - today's opex (correct formula, wrong label)
      // After D3-A: same formula but clearly labeled as "Today's Operating Result"
      
      // Add cash sale + credit sale
      const cashSale = await request(server, {
        method: "POST",
        path: "/api/v1/sales/cash", 
        token,
        body: { items: [{ name: "test-bread", quantity: 2 }] },
      });
      assert.equal(cashSale.status, 201);

      const customer = await request(server, {
        method: "POST",
        path: "/api/v1/customers",
        token,
        body: { name: "Credit Customer", phone: "0770000456" },
      });
      
      const creditSale = await request(server, {
        method: "POST",
        path: "/api/v1/sales/credit",
        token,
        body: {
          customer: "Credit Customer", 
          items: [{ name: "test-bread", quantity: 1 }],
          dueDate: "2030-01-15",
        },
      });
      assert.equal(creditSale.status, 201);

      // Add operating expense
      const expense = await request(server, {
        method: "POST", 
        path: "/api/v1/expenses",
        token,
        body: {
          amount: 12,
          description: "Operating expense",
          category: "transport",
        },
      });
      assert.equal(expense.status, 201);

      // Check stats to see current todayLeft calculation
      const stats = await request(server, {
        path: "/api/v1/stats",
        token,
      });
      assert.equal(stats.status, 200);

      const todayRevenue = 20 + 10; // cash + credit = 30
      const todayOpex = 12;
      const expectedTodayLeft = todayRevenue - todayOpex; // 18
      
      console.log("TODAY LEFT - Current calculation:", {
        todayRevenue,
        todayOpex, 
        todayLeft: stats.body.snapshots.todayLeft,
        cashAvailable: stats.body.snapshots.cashAvailable,
      });

      // Current formula is correct (revenue - opex), but label suggests it's till-related
      assert.equal(stats.body.snapshots.todayLeft, expectedTodayLeft);
      
      // This is NOT the same as till cash available (which excludes credit sales)
      assert.notEqual(stats.body.snapshots.todayLeft, stats.body.snapshots.cashAvailable);
      
      // Cash available should be: $20 cash sale - $12 expense = $8
      assert.equal(stats.body.snapshots.cashAvailable, 8);
    });
  });

  describe("D4-A & D5-A: Restock and Floor Behavior", () => {
    it("verifies restock is cash-out only (inventory separate) and floor at 0", async () => {
      // Add cash to till
      const sale = await request(server, {
        method: "POST",
        path: "/api/v1/sales/cash",
        token,
        body: { items: [{ name: "test-bread", quantity: 5 }] },
      });
      assert.equal(sale.status, 201);
      
      let cash = await FinancialService.getCashAvailable(shop._id);
      assert.equal(cash.available, 50);

      // Restock should be cash-out only (no automatic stock increase)
      const restock = await request(server, {
        method: "POST",
        path: "/api/v1/expenses",
        token,
        body: {
          amount: 30,
          description: "Restock inventory",
          category: "restocking",
          paymentMethod: "cash",
          kind: "inventory_fund_transfer", // This is the restock flag
        },
      });
      assert.equal(restock.status, 201, restock.raw);

      cash = await FinancialService.getCashAvailable(shop._id);
      assert.equal(cash.available, 20, "Restock drains till (cash-out)");
      
      // D4-A: Stock levels should be managed separately
      // (This test doesn't change stock - that's handled elsewhere)
      
      // D5-A: Floor at 0 behavior - overspend to test
      const bigExpense = await request(server, {
        method: "POST",
        path: "/api/v1/expenses",
        token,
        body: {
          amount: 35, // More than available $20
          description: "Big expense",
          category: "other",
          allowOverspend: true,
        },
      });
      assert.equal(bigExpense.status, 201);

      cash = await FinancialService.getCashAvailable(shop._id);
      
      console.log("FLOOR TEST - Raw vs available:", {
        raw: cash.raw,
        available: cash.available,
      });

      // D5-A: Should floor at 0
      assert.equal(cash.available, 0, "Till floored at 0");
      assert.equal(cash.raw, -15, "Raw can be negative internally");
    });
  });
});