import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "http";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  process.env.TELEGRAM_BOT_TOKEN = "000000000:API_V1_TEST_DUMMY_TOKEN";
}

const { connectTestDb, disconnectTestDb, wipeShopData } = await import(
  "./helpers/mongo.js"
);
const { createTestShop } = await import("./helpers/fixtures.js");
const { default: createApp } = await import("../app.js");
const { default: Product } = await import("../models/Product.js");
const { default: Sale } = await import("../models/Sale.js");

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
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let json = null;
          try {
            json = data ? JSON.parse(data) : null;
          } catch {
            json = data;
          }
          resolve({ status: res.statusCode, body: json, raw: data });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe("API v1", () => {
  let server;
  let userId;
  let pin;
  let shop;

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
    userId = created.telegramId;
  });

  afterEach(async () => {
    await wipeShopData({ shopId: shop._id, telegramId: userId });
  });

  it("login → create product → cash sale → daily", async () => {
    const bad = await request(server, {
      method: "POST",
      path: "/api/v1/auth/login",
      body: { userId, pin: "0000" },
    });
    assert.equal(bad.status, 401);
    assert.equal(bad.body.success, false);

    const login = await request(server, {
      method: "POST",
      path: "/api/v1/auth/login",
      body: { userId, pin },
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.success, true);
    assert.ok(login.body.token);
    assert.equal(login.body.shop.businessName, shop.businessName);
    assert.equal(login.body.shop.pin, undefined);

    const token = login.body.token;

    const me = await request(server, {
      path: "/api/v1/auth/me",
      token,
    });
    assert.equal(me.status, 200);
    assert.equal(me.body.shop.userId, userId);

    const created = await request(server, {
      method: "POST",
      path: "/api/v1/products",
      token,
      body: {
        name: "api-bread",
        price: 2.5,
        costPrice: 1.0,
        stock: 10,
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.product.name, "api-bread");
    assert.equal(created.body.product.costPrice, 1);

    const list = await request(server, {
      path: "/api/v1/products",
      token,
    });
    assert.equal(list.status, 200);
    assert.equal(list.body.products.length, 1);

    const sale = await request(server, {
      method: "POST",
      path: "/api/v1/sales/cash",
      token,
      body: {
        items: [{ name: "api-bread", quantity: 2 }],
      },
    });
    assert.equal(sale.status, 201);
    assert.equal(sale.body.sale.total, 5);
    assert.equal(sale.body.sale.costTotal, 2);
    assert.equal(sale.body.sale.profit, 3);

    const product = await Product.findById(created.body.product.id);
    assert.equal(product.stock, 8);

    const oversell = await request(server, {
      method: "POST",
      path: "/api/v1/sales/cash",
      token,
      body: {
        items: [{ name: "api-bread", quantity: 100 }],
      },
    });
    assert.equal(oversell.status, 409);

    const daily = await request(server, {
      path: "/api/v1/reports/daily",
      token,
    });
    assert.equal(daily.status, 200);
    assert.equal(daily.body.success, true);
    assert.ok(daily.body.data);
    assert.ok(daily.body.data.profitability.hasProductCosts);

    const dbSale = await Sale.findOne({ shopId: shop._id, isCancelled: false });
    assert.ok(dbSale);
    assert.equal(dbSale.total, 5);

    const logout = await request(server, {
      method: "POST",
      path: "/api/v1/auth/logout",
      token,
    });
    assert.equal(logout.status, 200);

    const afterLogout = await request(server, {
      path: "/api/v1/products",
      token,
    });
    assert.equal(afterLogout.status, 401);
  });

  it("rejects requests without a bearer token", async () => {
    const res = await request(server, { path: "/api/v1/products" });
    assert.equal(res.status, 401);
  });

  it("covers customers, expenses, reports, and help surface", async () => {
    const login = await request(server, {
      method: "POST",
      path: "/api/v1/auth/login",
      body: { userId, pin },
    });
    assert.equal(login.status, 200);
    const token = login.body.token;

    const product = await request(server, {
      method: "POST",
      path: "/api/v1/products",
      token,
      body: { name: "api-milk", price: 3, stock: 20 },
    });
    assert.equal(product.status, 201);

    const customer = await request(server, {
      method: "POST",
      path: "/api/v1/customers",
      token,
      body: { name: "Api Customer", phone: "0771111222" },
    });
    assert.equal(customer.status, 201);
    assert.equal(customer.body.customer.name, "Api Customer");

    const creditSale = await request(server, {
      method: "POST",
      path: "/api/v1/sales/credit",
      token,
      body: {
        customer: "Api Customer",
        items: [{ name: "api-milk", quantity: 1 }],
      },
    });
    assert.equal(creditSale.status, 201);
    assert.equal(creditSale.body.sale.type, "credit");

    const payment = await request(server, {
      method: "POST",
      path: `/api/v1/customers/${customer.body.customer.id}/payment`,
      token,
      body: { amount: 3 },
    });
    assert.equal(payment.status, 200);
    assert.equal(payment.body.customer.currentBalance, 0);

    const expense = await request(server, {
      method: "POST",
      path: "/api/v1/expenses",
      token,
      body: {
        amount: 5,
        description: "test supplies",
        category: "other",
      },
    });
    assert.equal(expense.status, 201);

    const weekly = await request(server, {
      path: "/api/v1/reports/weekly",
      token,
    });
    assert.equal(weekly.status, 200);
    assert.equal(weekly.body.success, true);

    const help = await request(server, {
      path: "/api/v1/help",
      token,
    });
    assert.equal(help.status, 200);
    assert.ok(Array.isArray(help.body.endpoints));
    assert.ok(help.body.endpoints.length > 20);

    const stock = await request(server, {
      method: "POST",
      path: `/api/v1/products/${product.body.product.id}/stock`,
      token,
      body: { op: "+", quantity: 5 },
    });
    assert.equal(stock.status, 200);
    assert.equal(stock.body.product.stock, 24);

    const stats = await request(server, {
      path: "/api/v1/stats?days=30&limit=5",
      token,
    });
    assert.equal(stats.status, 200);
    assert.ok(stats.body.highlights);
    assert.ok(stats.body.highlights.mostPurchased);
    assert.equal(stats.body.highlights.mostPurchased.productName, "api-milk");
    assert.ok(stats.body.customers.bestClients.length >= 1);

    const productStats = await request(server, {
      path: "/api/v1/stats/products?days=30",
      token,
    });
    assert.equal(productStats.status, 200);
    assert.ok(productStats.body.mostPurchased.length >= 1);
    assert.ok(Array.isArray(productStats.body.slowest));
    assert.ok(Array.isArray(productStats.body.neverSold));
  });

  it("registers a new shop via API", async () => {
    const newUserId = `api-reg-${Date.now()}`;
    const reg = await request(server, {
      method: "POST",
      path: "/api/v1/auth/register",
      body: {
        userId: newUserId,
        businessName: `API Shop ${Date.now()}`,
        pin: "4829",
      },
    });
    assert.equal(reg.status, 201);
    assert.ok(reg.body.token);
    assert.equal(reg.body.shop.userId, newUserId);

    await wipeShopData({
      shopId: reg.body.shop.id,
      telegramId: newUserId,
    });
  });
});
