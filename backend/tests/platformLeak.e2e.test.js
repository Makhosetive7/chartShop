/**
 * Platform-wide leak / regression harness.
 * API + chat surfaces for variants/packs and classic simple-product flows.
 */
import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "http";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  process.env.TELEGRAM_BOT_TOKEN = "000000000:PLATFORM_LEAK_DUMMY_TOKEN";
}

const { connectTestDb, disconnectTestDb, wipeShopData } = await import(
  "./helpers/mongo.js"
);
const { createTestShop } = await import("./helpers/fixtures.js");
const { default: createApp } = await import("../app.js");
const { default: Product } = await import("../models/Product.js");
const { default: Sale } = await import("../models/Sale.js");
const { parseSaleItems } = await import(
  "../services/commands/parseSaleItems.js"
);
const {
  handleVariantAdd,
  handlePackAdd,
  handleUpdateStock,
  handleListProducts,
  handleAddProduct,
} = await import("../services/commands/handlers/inventory.js");
const { handleCashSale } = await import(
  "../services/commands/handlers/sales.js"
);
const { getHelpText } = await import(
  "../services/commands/handlers/help.js"
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

describe("Platform leak sweep — API + chat", () => {
  let server;
  let shop;
  let username;
  let pin;
  let token;
  let user;

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
    user = created.user;
    token = await login(server, username, pin);
  });

  afterEach(async () => {
    await wipeShopData({ shopId: shop._id, username });
  });

  it("simple product: API sell → cancel restores stock (no leak)", async () => {
    const create = await request(server, {
      method: "POST",
      path: "/api/v1/products",
      token,
      body: { name: "Bread", price: 2, stock: 10 },
    });
    assert.equal(create.status, 201, create.raw);
    const id = create.body.product.id;

    const sale = await request(server, {
      method: "POST",
      path: "/api/v1/sales/cash",
      token,
      body: { items: [{ productId: id, quantity: 3 }] },
    });
    assert.equal(sale.status, 201, sale.raw);

    let fresh = await Product.findById(id);
    assert.equal(fresh.stock, 7);
    assert.equal(fresh.variants[0].stock, 7);

    const cancel = await request(server, {
      method: "POST",
      path: `/api/v1/sales/${sale.body.sale.id}/cancel`,
      token,
      body: { reason: "leak check" },
    });
    assert.equal(cancel.status, 200, cancel.raw);

    fresh = await Product.findById(id);
    assert.equal(fresh.stock, 10);
    assert.equal(fresh.variants[0].stock, 10);
  });

  it("multi-variant pack sale does not touch sibling variant stock", async () => {
    const create = await request(server, {
      method: "POST",
      path: "/api/v1/products",
      token,
      body: {
        name: "Coke",
        variants: [
          { label: "500ml", price: 1.2, stock: 48 },
          { label: "2L", price: 2.5, stock: 12 },
        ],
      },
    });
    assert.equal(create.status, 201, create.raw);
    const product = create.body.product;
    const v500 = product.variants.find((v) => v.label === "500ml");

    const pack = await request(server, {
      method: "POST",
      path: `/api/v1/products/${product.id}/variants/${v500.id}/packs`,
      token,
      body: { label: "Crate", unitsPerPack: 24, price: 25 },
    });
    assert.equal(pack.status, 201, pack.raw);
    const crate = pack.body.product.variants
      .find((v) => v.id === v500.id)
      .packs.find((p) => p.label === "Crate");

    for (let n = 0; n < 2; n += 1) {
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
    }

    let fresh = await Product.findById(product.id);
    assert.equal(fresh.variants.find((v) => v.label === "500ml").stock, 0);
    assert.equal(fresh.variants.find((v) => v.label === "2L").stock, 12);
    assert.equal(fresh.stock, 12);

    const oversell = await request(server, {
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
    assert.ok(oversell.status >= 400, oversell.raw);

    fresh = await Product.findById(product.id);
    assert.equal(fresh.variants.find((v) => v.label === "500ml").stock, 0);
    assert.equal(fresh.variants.find((v) => v.label === "2L").stock, 12);
  });

  it("chat sell crate + stock by variant mirrors API math", async () => {
    const create = await request(server, {
      method: "POST",
      path: "/api/v1/products",
      token,
      body: {
        name: "Coke",
        variants: [
          { label: "500ml", price: 1.2, stock: 48 },
          { label: "2L", price: 2.5, stock: 12 },
        ],
      },
    });
    assert.equal(create.status, 201, create.raw);

    const packMsg = await handlePackAdd(
      shop._id,
      "pack add Coke 500ml Crate 24 25"
    );
    assert.match(packMsg, /Pack added/i, packMsg);

    const parsed = await parseSaleItems(shop._id, "1 coke crate");
    assert.ok(Array.isArray(parsed), parsed);
    assert.equal(parsed[0].baseUnitsDeducted, 24);

    const saleMsg = await handleCashSale(
      shop._id,
      "sell 1 coke crate",
      String(user._id)
    );
    assert.ok(
      !/failed|insufficient|not found/i.test(saleMsg),
      saleMsg
    );

    const fresh = await Product.findOne({ shopId: shop._id, name: "Coke" });
    assert.equal(fresh.variants.find((v) => v.label === "500ml").stock, 24);
    assert.equal(fresh.variants.find((v) => v.label === "2L").stock, 12);

    const stockMsg = await handleUpdateStock(shop._id, "stock +coke 2L 5");
    assert.match(stockMsg, /Stock Updated/i, stockMsg);
    const after = await Product.findById(fresh._id);
    assert.equal(after.variants.find((v) => v.label === "2L").stock, 17);
    assert.equal(after.variants.find((v) => v.label === "500ml").stock, 24);
  });

  it("order complete deducts only ordered variant; cancel restores", async () => {
    const cust = await request(server, {
      method: "POST",
      path: "/api/v1/customers",
      token,
      body: { name: "Leak Cust", phone: "5550199999" },
    });
    assert.equal(cust.status, 201, cust.raw);

    const create = await request(server, {
      method: "POST",
      path: "/api/v1/products",
      token,
      body: {
        name: "Shoes",
        variants: [
          { label: "Size 1", price: 100, stock: 5 },
          { label: "Size 2", price: 100, stock: 8 },
        ],
      },
    });
    assert.equal(create.status, 201, create.raw);
    const product = create.body.product;
    const size2 = product.variants.find((v) => v.label === "Size 2");

    const order = await request(server, {
      method: "POST",
      path: "/api/v1/orders",
      token,
      body: {
        customer: "Leak Cust",
        items: [{ productId: product.id, variantId: size2.id, quantity: 2 }],
      },
    });
    assert.equal(order.status, 201, order.raw);

    let fresh = await Product.findById(product.id);
    assert.equal(fresh.variants.find((v) => v.label === "Size 2").stock, 8);

    const done = await request(server, {
      method: "PATCH",
      path: `/api/v1/orders/${order.body.order.id}/status`,
      token,
      body: { status: "completed" },
    });
    assert.equal(done.status, 200, done.raw);

    fresh = await Product.findById(product.id);
    assert.equal(fresh.variants.find((v) => v.label === "Size 1").stock, 5);
    assert.equal(fresh.variants.find((v) => v.label === "Size 2").stock, 6);

    const sale = await request(server, {
      method: "POST",
      path: "/api/v1/sales/cash",
      token,
      body: {
        items: [{ productId: product.id, variantId: size2.id, quantity: 1 }],
      },
    });
    assert.equal(sale.status, 201, sale.raw);
    fresh = await Product.findById(product.id);
    assert.equal(fresh.variants.find((v) => v.label === "Size 2").stock, 5);

    const cancel = await request(server, {
      method: "POST",
      path: `/api/v1/sales/${sale.body.sale.id}/cancel`,
      token,
      body: { reason: "restore" },
    });
    assert.equal(cancel.status, 200, cancel.raw);
    fresh = await Product.findById(product.id);
    assert.equal(fresh.variants.find((v) => v.label === "Size 2").stock, 6);
  });

  it("laybye full deposit completes and deducts tray pack units", async () => {
    const cust = await request(server, {
      method: "POST",
      path: "/api/v1/customers",
      token,
      body: { name: "Laybye Pack", phone: "5550188888" },
    });
    assert.equal(cust.status, 201, cust.raw);

    const create = await request(server, {
      method: "POST",
      path: "/api/v1/products",
      token,
      body: {
        name: "Eggs",
        variants: [{ label: "", price: 0.5, stock: 60 }],
      },
    });
    assert.equal(create.status, 201, create.raw);
    const product = create.body.product;
    const variant = product.variants[0];
    const packRes = await request(server, {
      method: "POST",
      path: `/api/v1/products/${product.id}/variants/${variant.id}/packs`,
      token,
      body: { label: "Tray", unitsPerPack: 30, price: 12 },
    });
    assert.equal(packRes.status, 201, packRes.raw);
    const tray = packRes.body.product.variants[0].packs.find(
      (p) => p.label === "Tray"
    );

    const laybye = await request(server, {
      method: "POST",
      path: "/api/v1/laybye",
      token,
      body: {
        customer: "Laybye Pack",
        deposit: 12,
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
    assert.equal(laybye.status, 201, laybye.raw);
    assert.equal(laybye.body.completed, true, laybye.raw);

    const fresh = await Product.findById(product.id);
    assert.equal(fresh.variants[0].stock, 30);
    assert.equal(fresh.stock, 30);
  });

  it("soft-delete hides product; selling deleted id fails closed", async () => {
    const create = await request(server, {
      method: "POST",
      path: "/api/v1/products",
      token,
      body: { name: "TempGone", price: 9, stock: 3 },
    });
    assert.equal(create.status, 201, create.raw);
    const id = create.body.product.id;

    const del = await request(server, {
      method: "DELETE",
      path: `/api/v1/products/${id}`,
      token,
      body: { confirm: true },
    });
    assert.equal(del.status, 200, del.raw);

    const list = await request(server, {
      method: "GET",
      path: "/api/v1/products",
      token,
    });
    assert.equal(list.status, 200);
    assert.ok(!(list.body.products || []).some((p) => p.id === id));

    const sale = await request(server, {
      method: "POST",
      path: "/api/v1/sales/cash",
      token,
      body: { items: [{ productId: id, quantity: 1 }] },
    });
    assert.ok(sale.status >= 400, sale.raw);
  });

  it("chat list/help/variant commands stay healthy", async () => {
    await handleAddProduct(shop._id, "add Soap 1.5 stock 20", String(user._id));
    const v = await handleVariantAdd(
      shop._id,
      "variant add Soap Large 2.5 stock 10"
    );
    assert.match(v, /Variant added/i, v);

    const list = await handleListProducts(shop._id);
    assert.match(list, /Soap/i, list);
    assert.match(list, /Large/i, list);

    const help = getHelpText();
    assert.match(help, /variant add/i);
    assert.match(help, /pack add/i);
    assert.match(help, /sell 1 coke crate/i);

    const sales = await Sale.countDocuments({ shopId: shop._id });
    assert.equal(sales, 0);
  });

  it("credit sale + payment path does not double-deduct stock", async () => {
    const cust = await request(server, {
      method: "POST",
      path: "/api/v1/customers",
      token,
      body: { name: "Credit Cust", phone: "5550177777" },
    });
    assert.equal(cust.status, 201, cust.raw);

    const create = await request(server, {
      method: "POST",
      path: "/api/v1/products",
      token,
      body: { name: "Milk", price: 3, stock: 10 },
    });
    assert.equal(create.status, 201, create.raw);
    const id = create.body.product.id;

    const credit = await request(server, {
      method: "POST",
      path: "/api/v1/sales/credit",
      token,
      body: {
        customer: "Credit Cust",
        items: [{ productId: id, quantity: 2 }],
      },
    });
    assert.equal(credit.status, 201, credit.raw);

    let fresh = await Product.findById(id);
    assert.equal(fresh.stock, 8);

    const pay = await request(server, {
      method: "POST",
      path: `/api/v1/customers/${cust.body.customer.id}/payment`,
      token,
      body: { amount: 6 },
    });
    assert.ok([200, 201].includes(pay.status), pay.raw);

    fresh = await Product.findById(id);
    assert.equal(fresh.stock, 8, "payment must not deduct stock again");
  });
});
