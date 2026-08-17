/**
 * Order + laybye notification alerts: stale/overdue open orders and
 * quiet/overdue laybyes, then drop after complete / payment.
 */
import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "http";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  process.env.TELEGRAM_BOT_TOKEN = "000000000:CHASE_ALERT_E2E_DUMMY_TOKEN";
}

const { connectTestDb, disconnectTestDb, wipeShopData } = await import(
  "./helpers/mongo.js"
);
const { createTestShop, createTestCustomer } = await import(
  "./helpers/fixtures.js"
);
const { default: createApp } = await import("../app.js");
const { default: Order } = await import("../models/Order.js");
const { default: LayBye } = await import("../models/LayBye.js");

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

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

describe("Order and laybye notification alerts e2e", () => {
  let server;
  let shop;
  let username;
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
    const created = await createTestShop({ pin: "4829" });
    shop = created.shop;
    username = created.username;
    const login = await request(server, {
      method: "POST",
      path: "/api/v1/auth/login",
      body: { username, pin: "4829" },
    });
    assert.equal(login.status, 200, login.raw);
    token = login.body.token;
  });

  afterEach(async () => {
    await wipeShopData({ shopId: shop._id, username });
  });

  it("lists a stale pending order and drops it after complete", async () => {
    const product = await request(server, {
      method: "POST",
      path: "/api/v1/products",
      token,
      body: { name: "alert-bread", price: 2, stock: 20 },
    });
    assert.equal(product.status, 201, product.raw);

    const customer = await request(server, {
      method: "POST",
      path: "/api/v1/customers",
      token,
      body: { name: "Stale Pickup", phone: "5550100777" },
    });
    assert.equal(customer.status, 201, customer.raw);

    const created = await request(server, {
      method: "POST",
      path: "/api/v1/orders",
      token,
      body: {
        customer: "Stale Pickup",
        orderType: "pickup",
        items: [{ productId: product.body.product.id, quantity: 1 }],
      },
    });
    assert.equal(created.status, 201, created.raw);
    const orderId = created.body.order.id;

    const fresh = await request(server, {
      path: "/api/v1/orders/alerts",
      token,
    });
    assert.equal(fresh.status, 200, fresh.raw);
    assert.equal((fresh.body.items || []).length, 0);

    await Order.updateOne(
      { _id: orderId },
      { $set: { orderDate: daysAgo(3) } }
    );

    const listed = await request(server, {
      path: "/api/v1/orders/alerts",
      token,
    });
    assert.equal(listed.status, 200, listed.raw);
    assert.equal(listed.body.summary.stale, 1);
    assert.equal(listed.body.items[0].customerName, "Stale Pickup");
    assert.equal(listed.body.items[0].status, "stale");

    const done = await request(server, {
      method: "PATCH",
      path: `/api/v1/orders/${orderId}/status`,
      token,
      body: { status: "completed" },
    });
    assert.equal(done.status, 200, done.raw);

    const after = await request(server, {
      path: "/api/v1/orders/alerts",
      token,
    });
    assert.equal(after.status, 200, after.raw);
    assert.equal((after.body.items || []).length, 0);
  });

  it("lists a quiet laybye and drops it after payment", async () => {
    const customer = await createTestCustomer(shop._id, {
      name: "Quiet Laybye",
      phone: "5550100888",
    });

    const laybye = await LayBye.create({
      shopId: shop._id,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: [{ productName: "Jacket", quantity: 1, price: 80, total: 80 }],
      totalAmount: 80,
      amountPaid: 20,
      balanceDue: 60,
      installments: [{ amount: 20, date: daysAgo(20), paymentMethod: "cash" }],
      status: "active",
      startDate: daysAgo(20),
      dueDate: daysAgo(-20),
      reservedStock: false,
    });

    const listed = await request(server, {
      path: "/api/v1/laybye/alerts",
      token,
    });
    assert.equal(listed.status, 200, listed.raw);
    assert.ok(
      (listed.body.items || []).some(
        (item) => item.id === String(laybye._id) && item.status === "quiet"
      ),
      listed.raw
    );

    const paid = await request(server, {
      method: "POST",
      path: "/api/v1/laybye/pay",
      token,
      body: { customer: "Quiet Laybye", amount: 10 },
    });
    assert.equal(paid.status, 200, paid.raw);

    const after = await request(server, {
      path: "/api/v1/laybye/alerts",
      token,
    });
    assert.equal(after.status, 200, after.raw);
    assert.equal((after.body.items || []).length, 0);
  });
});
