import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "http";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  process.env.TELEGRAM_BOT_TOKEN = "000000000:VARIANT_E2E_DUMMY_TOKEN";
}

const { connectTestDb, disconnectTestDb, wipeShopData } = await import(
  "./helpers/mongo.js"
);
const { createTestShop } = await import("./helpers/fixtures.js");
const { default: createApp } = await import("../app.js");
const { default: Product } = await import("../models/Product.js");
const { default: Sale } = await import("../models/Sale.js");
const { default: Order } = await import("../models/Order.js");
const { parseSaleItems } = await import(
  "../services/commands/parseSaleItems.js"
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

describe("E2E product variants + packs", () => {
  let server;
  let username;
  let pin;
  let shop;
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
    const login = await request(server, {
      method: "POST",
      path: "/api/v1/auth/login",
      body: { username, pin },
    });
    assert.equal(login.status, 200, login.raw);
    token = login.body.token;
  });

  afterEach(async () => {
    await wipeShopData({ shopId: shop._id, username });
  });

  it("creates Coke with variants/packs, sells crate, keeps 2L stock independent", async () => {
    const create = await request(server, {
      method: "POST",
      path: "/api/v1/products",
      token,
      body: {
        name: "Coca-Cola",
        variants: [
          {
            label: "500ml",
            price: 1.2,
            costPrice: 0.7,
            stock: 48,
          },
          {
            label: "2L",
            price: 2.5,
            stock: 12,
          },
        ],
      },
    });
    assert.equal(create.status, 201, create.raw);
    const product = create.body.product;
    assert.equal(product.variants.length, 2);
    assert.equal(product.stock, 60);

    const v500 = product.variants.find((v) => v.label === "500ml");
    const v2L = product.variants.find((v) => v.label === "2L");
    assert.ok(v500?.id);
    assert.ok(v2L?.id);

    const packRes = await request(server, {
      method: "POST",
      path: `/api/v1/products/${product.id}/variants/${v500.id}/packs`,
      token,
      body: { label: "Crate", unitsPerPack: 24, price: 25 },
    });
    assert.equal(packRes.status, 201, packRes.raw);
    const crate = packRes.body.product.variants
      .find((v) => v.id === v500.id)
      .packs.find((p) => p.label === "Crate");
    assert.ok(crate?.id);
    assert.equal(crate.unitsPerPack, 24);

    const sale = await request(server, {
      method: "POST",
      path: "/api/v1/sales/cash",
      token,
      body: {
        items: [
          {
            productId: product.id,
            variantId: v500.id,
            packId: crate.id,
            quantity: 1,
          },
        ],
      },
    });
    assert.equal(sale.status, 201, sale.raw);
    assert.equal(sale.body.sale.total, 25);
    const line = sale.body.sale.items[0];
    assert.equal(line.baseUnitsDeducted, 24);
    assert.equal(String(line.variantId), v500.id);
    assert.equal(String(line.packId), crate.id);

    const fresh = await Product.findById(product.id);
    const fresh500 = fresh.variants.find((v) => String(v._id) === v500.id);
    const fresh2L = fresh.variants.find((v) => String(v._id) === v2L.id);
    assert.equal(fresh500.stock, 24);
    assert.equal(fresh2L.stock, 12);
    assert.equal(fresh.stock, 36);

    const listed = await request(server, {
      method: "GET",
      path: "/api/v1/products",
      token,
    });
    assert.equal(listed.status, 200);
    const listedCoke = listed.body.products.find((p) => p.id === product.id);
    assert.equal(listedCoke.stock, 36);
    assert.equal(
      listedCoke.variants.find((v) => v.label === "500ml").packs.length,
      2
    );
  });

  it("keeps shoe size stocks independent through API sale + cancel restore", async () => {
    const create = await request(server, {
      method: "POST",
      path: "/api/v1/products",
      token,
      body: {
        name: "Cavela shoes",
        variants: [
          { label: "Size 1", price: 450, stock: 5 },
          { label: "Size 2", price: 450, stock: 8 },
          { label: "Size 3", price: 480, stock: 2 },
        ],
      },
    });
    assert.equal(create.status, 201, create.raw);
    const product = create.body.product;
    const size2 = product.variants.find((v) => v.label === "Size 2");

    const sale = await request(server, {
      method: "POST",
      path: "/api/v1/sales/cash",
      token,
      body: {
        items: [
          {
            productId: product.id,
            variantId: size2.id,
            quantity: 2,
          },
        ],
      },
    });
    assert.equal(sale.status, 201, sale.raw);
    assert.equal(sale.body.sale.total, 900);

    let fresh = await Product.findById(product.id);
    assert.equal(fresh.variants.find((v) => v.label === "Size 1").stock, 5);
    assert.equal(fresh.variants.find((v) => v.label === "Size 2").stock, 6);
    assert.equal(fresh.variants.find((v) => v.label === "Size 3").stock, 2);

    const cancel = await request(server, {
      method: "POST",
      path: `/api/v1/sales/${sale.body.sale.id}/cancel`,
      token,
      body: { reason: "e2e restore check" },
    });
    assert.equal(cancel.status, 200, cancel.raw);

    fresh = await Product.findById(product.id);
    assert.equal(fresh.variants.find((v) => v.label === "Size 2").stock, 8);
    assert.equal(fresh.stock, 15);
  });

  it("orders resolve variant/pack and deduct on complete", async () => {
    const customer = await request(server, {
      method: "POST",
      path: "/api/v1/customers",
      token,
      body: { name: "Order Cust", phone: "5550100111" },
    });
    assert.equal(customer.status, 201, customer.raw);

    const create = await request(server, {
      method: "POST",
      path: "/api/v1/products",
      token,
      body: {
        name: "Sugar",
        variants: [
          { label: "1kg", price: 45, stock: 20 },
          { label: "2kg", price: 85, stock: 10 },
        ],
      },
    });
    assert.equal(create.status, 201, create.raw);
    const product = create.body.product;
    const kg2 = product.variants.find((v) => v.label === "2kg");

    const order = await request(server, {
      method: "POST",
      path: "/api/v1/orders",
      token,
      body: {
        customer: "Order Cust",
        orderType: "pickup",
        items: [
          {
            productId: product.id,
            variantId: kg2.id,
            quantity: 3,
          },
        ],
      },
    });
    assert.equal(order.status, 201, order.raw);
    assert.equal(order.body.order.total, 255);
    const item = order.body.order.items[0];
    assert.equal(String(item.variantId), kg2.id);
    assert.equal(item.baseUnitsDeducted, 3);

    // Pending order should not deduct yet
    let fresh = await Product.findById(product.id);
    assert.equal(fresh.variants.find((v) => v.label === "2kg").stock, 10);

    const complete = await request(server, {
      method: "PATCH",
      path: `/api/v1/orders/${order.body.order.id}/status`,
      token,
      body: { status: "completed" },
    });
    assert.equal(complete.status, 200, complete.raw);

    fresh = await Product.findById(product.id);
    assert.equal(fresh.variants.find((v) => v.label === "2kg").stock, 7);
    assert.equal(fresh.variants.find((v) => v.label === "1kg").stock, 20);

    const dbOrder = await Order.findById(order.body.order.id);
    assert.equal(dbOrder.status, "completed");
  });

  it("simple product create + chat sell still works (backward compatible)", async () => {
    const create = await request(server, {
      method: "POST",
      path: "/api/v1/products",
      token,
      body: { name: "Bread", price: 1.5, stock: 10 },
    });
    assert.equal(create.status, 201, create.raw);
    assert.equal(create.body.product.variants.length, 1);
    assert.equal(create.body.product.variants[0].packs[0].unitsPerPack, 1);

    const parsed = await parseSaleItems(shop._id, "2 Bread");
    assert.ok(Array.isArray(parsed), parsed);
    assert.equal(parsed[0].quantity, 2);
    assert.equal(parsed[0].baseUnitsDeducted, 2);

    const sale = await request(server, {
      method: "POST",
      path: "/api/v1/sales/cash",
      token,
      body: {
        items: [{ productId: create.body.product.id, quantity: 2 }],
      },
    });
    assert.equal(sale.status, 201, sale.raw);

    const fresh = await Product.findById(create.body.product.id);
    assert.equal(fresh.stock, 8);
    assert.equal(fresh.variants[0].stock, 8);

    const sales = await Sale.find({ shopId: shop._id });
    assert.equal(sales.length, 1);
  });

  it("rejects pack sale when variant stock is insufficient", async () => {
    const create = await request(server, {
      method: "POST",
      path: "/api/v1/products",
      token,
      body: {
        name: "Eggs",
        variants: [{ label: "", price: 5.5, stock: 20 }],
      },
    });
    assert.equal(create.status, 201, create.raw);
    const product = create.body.product;
    const variant = product.variants[0];

    const packRes = await request(server, {
      method: "POST",
      path: `/api/v1/products/${product.id}/variants/${variant.id}/packs`,
      token,
      body: { label: "Tray", unitsPerPack: 30, price: 5.5 },
    });
    assert.equal(packRes.status, 201, packRes.raw);
    const tray = packRes.body.product.variants[0].packs.find(
      (p) => p.label === "Tray"
    );

    const sale = await request(server, {
      method: "POST",
      path: "/api/v1/sales/cash",
      token,
      body: {
        items: [
          {
            productId: product.id,
            variantId: variant.id,
            packId: tray.id,
            quantity: 1,
          },
        ],
      },
    });
    assert.ok(sale.status >= 400, sale.raw);

    const fresh = await Product.findById(product.id);
    assert.equal(fresh.variants[0].stock, 20);
  });
});
