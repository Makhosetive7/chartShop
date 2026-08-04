import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  connectTestDb,
  disconnectTestDb,
  wipeShopData,
} from "./helpers/mongo.js";
import {
  createTestShop,
  createTestProduct,
} from "./helpers/fixtures.js";
import InventoryService from "../services/InventoryService.js";
import Product from "../models/Product.js";

describe("InventoryService stock atomics", () => {
  let shop;
  let product;

  before(async () => {
    await connectTestDb();
  });

  after(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    const created = await createTestShop();
    shop = created.shop;
    product = await createTestProduct(shop._id, {
      name: "p4stock",
      price: 1,
      stock: 5,
    });
  });

  afterEach(async () => {
    await wipeShopData({ shopId: shop._id, telegramId: shop.telegramId });
  });

  it("deducts stock when quantity is available", async () => {
    const updated = await InventoryService.deductStock(product._id, 3);
    assert.equal(updated.stock, 2);

    const fresh = await Product.findById(product._id);
    assert.equal(fresh.stock, 2);
  });

  it("rejects deduct that would go negative and leaves stock unchanged", async () => {
    await assert.rejects(
      () => InventoryService.deductStock(product._id, 6),
      /Insufficient Stock/
    );

    const fresh = await Product.findById(product._id);
    assert.equal(fresh.stock, 5);
  });

  it("deductSaleItems fails closed and compensates prior lines", async () => {
    const other = await createTestProduct(shop._id, {
      name: "p4other",
      price: 1,
      stock: 2,
    });

    const items = [
      { product, quantity: 2 },
      { product: other, quantity: 5 }, // will fail
    ];

    const result = await InventoryService.deductSaleItems(items);
    assert.equal(result.success, false);
    assert.match(result.message, /Insufficient Stock/i);

    const first = await Product.findById(product._id);
    const second = await Product.findById(other._id);
    assert.equal(first.stock, 5, "first line should be restored after failure");
    assert.equal(second.stock, 2);
  });

  it("restores stock on cancel path", async () => {
    await InventoryService.deductStock(product._id, 4);
    await InventoryService.restoreStock(product._id, 4);

    const fresh = await Product.findById(product._id);
    assert.equal(fresh.stock, 5);
  });
});
