/**
 * Low-stock notifications: variant-level alerts on GET /products/low-stock,
 * and restock dropping a row.
 */
import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "http";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  process.env.TELEGRAM_BOT_TOKEN = "000000000:STOCK_ALERT_E2E_DUMMY_TOKEN";
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

describe("Low-stock notification items e2e", () => {
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

  it("returns out-of-stock and low variants, then drops after restock", async () => {
    const created = await request(server, {
      method: "POST",
      path: "/api/v1/products",
      token,
      body: {
        name: "Cola",
        variants: [
          {
            label: "500ml",
            price: 1.5,
            stock: 0,
            lowStockThreshold: 6,
          },
          {
            label: "2L",
            price: 3,
            stock: 2,
            lowStockThreshold: 6,
          },
          {
            label: "Crate",
            price: 12,
            stock: 40,
            lowStockThreshold: 6,
          },
        ],
      },
    });
    assert.equal(created.status, 201, created.raw);
    const productId = created.body.product.id;
    const outVariant = created.body.product.variants.find(
      (v) => v.label === "500ml"
    );
    const lowVariant = created.body.product.variants.find(
      (v) => v.label === "2L"
    );
    assert.ok(outVariant && lowVariant);

    const listed = await request(server, {
      path: "/api/v1/products/low-stock",
      token,
    });
    assert.equal(listed.status, 200, listed.raw);
    const items = listed.body.items || [];
    assert.equal(listed.body.summary.out, 1);
    assert.equal(listed.body.summary.low, 1);
    assert.equal(items.length, 2);
    assert.equal(items[0].status, "out");
    assert.equal(items[0].variantLabel, "500ml");
    assert.equal(items[1].status, "low");
    assert.equal(items[1].variantLabel, "2L");
    assert.ok(!items.some((item) => item.variantLabel === "Crate"));

    const restock = await request(server, {
      method: "POST",
      path: `/api/v1/products/${productId}/stock`,
      token,
      body: { op: "+", quantity: 20, variantId: outVariant.id },
    });
    assert.equal(restock.status, 200, restock.raw);

    const afterOut = await request(server, {
      path: "/api/v1/products/low-stock",
      token,
    });
    assert.equal(afterOut.status, 200, afterOut.raw);
    const remaining = afterOut.body.items || [];
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].variantId, lowVariant.id);

    const restockLow = await request(server, {
      method: "POST",
      path: `/api/v1/products/${productId}/stock`,
      token,
      body: { op: "+", quantity: 10, variantId: lowVariant.id },
    });
    assert.equal(restockLow.status, 200, restockLow.raw);

    const cleared = await request(server, {
      path: "/api/v1/products/low-stock",
      token,
    });
    assert.equal(cleared.status, 200, cleared.raw);
    assert.equal((cleared.body.items || []).length, 0);
  });
});
