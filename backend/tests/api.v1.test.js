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
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          const raw = buf.toString("utf8");
          let json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch {
            json = raw;
          }
          resolve({
            status: res.statusCode,
            body: json,
            raw,
            buffer: buf,
            headers: res.headers,
          });
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
  let username;
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
    username = created.username;
  });

  afterEach(async () => {
    await wipeShopData({ shopId: shop._id, username });
  });

  it("login → create product → cash sale → daily", async () => {
    const bad = await request(server, {
      method: "POST",
      path: "/api/v1/auth/login",
      body: { username, pin: "0000" },
    });
    assert.equal(bad.status, 401);
    assert.equal(bad.body.success, false);

    const login = await request(server, {
      method: "POST",
      path: "/api/v1/auth/login",
      body: { username, pin },
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.success, true);
    assert.ok(login.body.token);
    assert.equal(login.body.shop.businessName, shop.businessName);
    assert.equal(login.body.shop.pin, undefined);
    assert.equal(login.body.shop.username, username);

    const token = login.body.token;

    const me = await request(server, {
      path: "/api/v1/auth/me",
      token,
    });
    assert.equal(me.status, 200);
    assert.equal(me.body.shop.username, username);

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
      body: { username, pin },
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

    const profit = await request(server, {
      path: "/api/v1/reports/profit?period=daily",
      token,
    });
    assert.equal(profit.status, 200);
    assert.equal(profit.body.success, true);
    assert.ok(profit.body.data);
    assert.equal(typeof profit.body.data.revenue, "number");
    assert.equal(typeof profit.body.data.profit, "number");

    for (const type of ["daily", "weekly", "monthly"]) {
      const pdf = await request(server, {
        path: `/api/v1/reports/export?type=${type}&download=1`,
        token,
      });
      assert.equal(
        pdf.status,
        200,
        `PDF ${type} failed: ${pdf.raw?.slice?.(0, 200) || pdf.status}`
      );
      assert.match(String(pdf.headers["content-type"] || ""), /pdf/i);
      assert.equal(pdf.buffer.subarray(0, 5).toString("utf8"), "%PDF-");
      assert.ok(pdf.buffer.length > 500, `${type} PDF too small`);
    }

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
    const newUsername = `apireg${Date.now().toString().slice(-6)}`.slice(0, 15);
    const reg = await request(server, {
      method: "POST",
      path: "/api/v1/auth/register",
      body: {
        username: newUsername,
        businessName: `API Shop ${Date.now()}`,
        pin: "4829",
        businessDescription: "General merchandise for API register test",
      },
    });
    assert.equal(
      reg.status,
      201,
      `register failed: ${JSON.stringify(reg.body)}`
    );
    assert.ok(reg.body.token);
    assert.equal(reg.body.shop.username, newUsername);

    await wipeShopData({
      shopId: reg.body.shop.id,
      username: newUsername,
    });
  });

  it("checks username availability and rejects reserved names", async () => {
    const taken = await request(server, {
      method: "GET",
      path: `/api/v1/auth/username?username=${encodeURIComponent(username)}`,
    });
    assert.equal(taken.status, 200);
    assert.equal(taken.body.available, false);
    assert.ok(Array.isArray(taken.body.suggestions));
    assert.ok(taken.body.suggestions.length >= 1);

    const reserved = await request(server, {
      method: "GET",
      path: "/api/v1/auth/username?username=admin",
    });
    assert.equal(reserved.status, 200);
    assert.equal(reserved.body.available, false);
    assert.equal(reserved.body.valid, false);
    assert.ok(Array.isArray(reserved.body.suggestions));
    assert.ok(reserved.body.suggestions.length >= 1);
    assert.ok(reserved.body.suggestions.every((s) => s !== "admin"));

    const okName = `ok${Date.now().toString().slice(-8)}`.slice(0, 15);
    const free = await request(server, {
      method: "GET",
      path: `/api/v1/auth/username?username=${encodeURIComponent(okName)}`,
    });
    assert.equal(free.status, 200);
    assert.equal(free.body.available, true);
    assert.equal(free.body.username, okName);
  });

  it("changes username via profile API", async () => {
    const login = await request(server, {
      method: "POST",
      path: "/api/v1/auth/login",
      body: { username, pin },
    });
    assert.equal(login.status, 200);
    const token = login.body.token;

    const selfCheck = await request(server, {
      method: "GET",
      path: `/api/v1/auth/username?username=${encodeURIComponent(username)}`,
      token,
    });
    assert.equal(selfCheck.status, 200);
    assert.equal(selfCheck.body.available, true);

    const next = `ren${Date.now().toString().slice(-8)}`.slice(0, 15);
    const changed = await request(server, {
      method: "PATCH",
      path: "/api/v1/auth/profile/username",
      token,
      body: { username: next },
    });
    assert.equal(
      changed.status,
      200,
      `username change failed: ${JSON.stringify(changed.body)}`
    );
    assert.equal(changed.body.shop.username, next);

    const oldLogin = await request(server, {
      method: "POST",
      path: "/api/v1/auth/login",
      body: { username, pin },
    });
    assert.equal(oldLogin.status, 401);

    const newLogin = await request(server, {
      method: "POST",
      path: "/api/v1/auth/login",
      body: { username: next, pin },
    });
    assert.equal(newLogin.status, 200);
    assert.equal(newLogin.body.shop.username, next);

    // afterEach wipe uses this username
    username = next;
  });

  it("issues recovery codes on register and redeems one to reset PIN", async () => {
    const newUsername = `recv${Date.now().toString().slice(-8)}`.slice(0, 15);
    const reg = await request(server, {
      method: "POST",
      path: "/api/v1/auth/register",
      body: {
        username: newUsername,
        businessName: `Recv Shop ${Date.now()}`,
        pin: "4829",
        businessDescription: "General merchandise for recovery test",
      },
    });
    assert.equal(reg.status, 201, JSON.stringify(reg.body));
    assert.ok(Array.isArray(reg.body.recoveryCodes));
    assert.equal(reg.body.recoveryCodes.length, 8);
    const token = reg.body.token;
    const code = reg.body.recoveryCodes[0];

    const status = await request(server, {
      method: "GET",
      path: "/api/v1/auth/recovery",
      token,
    });
    assert.equal(status.status, 200);
    assert.equal(status.body.remaining, 8);

    const redeem = await request(server, {
      method: "POST",
      path: "/api/v1/auth/recovery/redeem",
      body: {
        username: newUsername,
        code,
        newPin: "5731",
      },
    });
    assert.equal(redeem.status, 200, JSON.stringify(redeem.body));
    assert.equal(redeem.body.remaining, 7);

    const reuse = await request(server, {
      method: "POST",
      path: "/api/v1/auth/recovery/redeem",
      body: {
        username: newUsername,
        code,
        newPin: "5820",
      },
    });
    assert.equal(reuse.status, 401);

    const oldLogin = await request(server, {
      method: "POST",
      path: "/api/v1/auth/login",
      body: { username: newUsername, pin: "4829" },
    });
    assert.equal(oldLogin.status, 401);

    const newLogin = await request(server, {
      method: "POST",
      path: "/api/v1/auth/login",
      body: { username: newUsername, pin: "5731" },
    });
    assert.equal(newLogin.status, 200);

    await wipeShopData({
      shopId: reg.body.shop.id,
      username: newUsername,
    });
  });
});