import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "http";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  process.env.TELEGRAM_BOT_TOKEN = "000000000:SETTINGS_LAYBYE_TEST_TOKEN";
}

const { connectTestDb, disconnectTestDb, wipeShopData } = await import(
  "./helpers/mongo.js"
);
const { createTestShop } = await import("./helpers/fixtures.js");
const { default: createApp } = await import("../app.js");

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

describe("settings + laybye + refunds API", () => {
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

  it("patches settings, lists/pays/completes laybye, returns structured refunds", async () => {
    const login = await request(server, {
      method: "POST",
      path: "/api/v1/auth/login",
      body: { username, pin },
    });
    assert.equal(login.status, 200);
    const token = login.body.token;

    const settingsBad = await request(server, {
      method: "PATCH",
      path: "/api/v1/auth/profile/settings",
      token,
      body: { timezone: "Not/AZone" },
    });
    assert.equal(settingsBad.status, 400);

    const settings = await request(server, {
      method: "PATCH",
      path: "/api/v1/auth/profile/settings",
      token,
      body: { timezone: "Africa/Johannesburg", lowStockAlert: 7 },
    });
    assert.equal(settings.status, 200);
    assert.equal(settings.body.shop.settings.timezone, "Africa/Johannesburg");
    assert.equal(settings.body.shop.settings.lowStockAlert, 7);
    assert.equal(settings.body.shop.settings.currency, "USD");

    const product = await request(server, {
      method: "POST",
      path: "/api/v1/products",
      token,
      body: { name: "laybye-shoes", price: 40, stock: 5 },
    });
    assert.equal(product.status, 201);
    assert.equal(product.body.product.lowStockThreshold, 7);

    const customer = await request(server, {
      method: "POST",
      path: "/api/v1/customers",
      token,
      body: { name: "Laybye Client", phone: "0779999888" },
    });
    assert.equal(customer.status, 201);

    const partial = await request(server, {
      method: "POST",
      path: "/api/v1/laybye",
      token,
      body: {
        customer: "Laybye Client",
        items: [{ name: "laybye-shoes", quantity: 1 }],
        deposit: 10,
      },
    });
    assert.equal(partial.status, 201);
    assert.equal(partial.body.completed, false);
    assert.equal(partial.body.laybye.balanceDue, 30);

    const listed = await request(server, {
      path: "/api/v1/laybye?status=active",
      token,
    });
    assert.equal(listed.status, 200);
    assert.equal(listed.body.laybyes.length, 1);

    const pay = await request(server, {
      method: "POST",
      path: "/api/v1/laybye/pay",
      token,
      body: { customer: "Laybye Client", amount: 30 },
    });
    assert.equal(pay.status, 200);
    assert.equal(pay.body.completed, true);

    const customer2 = await request(server, {
      method: "POST",
      path: "/api/v1/customers",
      token,
      body: { name: "Full Deposit", phone: "0779999777" },
    });
    assert.equal(customer2.status, 201);

    const full = await request(server, {
      method: "POST",
      path: "/api/v1/laybye",
      token,
      body: {
        customer: "Full Deposit",
        items: [{ name: "laybye-shoes", quantity: 1 }],
        deposit: 40,
      },
    });
    assert.equal(full.status, 201);
    assert.equal(full.body.completed, true);
    assert.equal(full.body.laybye.status, "completed");

    const namedSale = await request(server, {
      method: "POST",
      path: "/api/v1/sales/to-customer",
      token,
      body: {
        customer: "Laybye Client",
        items: [{ name: "laybye-shoes", quantity: 1 }],
      },
    });
    assert.equal(namedSale.status, 201);
    const saleId = namedSale.body.sale.id;

    const recent = await request(server, {
      path: "/api/v1/sales/recent?limit=5",
      token,
    });
    assert.equal(recent.status, 200);
    const named = (recent.body.sales || []).find((s) => s.id === saleId);
    assert.ok(named);
    assert.equal(named.customerName, "Laybye Client");

    const cancel = await request(server, {
      method: "POST",
      path: `/api/v1/sales/${saleId}/cancel`,
      token,
      body: { reason: "Test cancel" },
    });
    assert.equal(cancel.status, 200);

    const refunds = await request(server, {
      path: "/api/v1/sales/refunds?days=30",
      token,
    });
    assert.equal(refunds.status, 200);
    assert.ok(Array.isArray(refunds.body.sales));
    assert.ok(refunds.body.sales.some((s) => s.id === saleId));
    assert.equal(typeof refunds.body.totalRefundAmount, "number");
  });
});
