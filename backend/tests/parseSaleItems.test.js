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
import { parseSaleItems } from "../services/commands/parseSaleItems.js";

describe("parseSaleItems", () => {
  let shop;

  before(async () => {
    await connectTestDb();
  });

  after(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    const created = await createTestShop();
    shop = created.shop;
    await createTestProduct(shop._id, {
      name: "brown bread",
      price: 2.5,
      stock: 20,
    });
    await createTestProduct(shop._id, {
      name: "milk",
      price: 3.2,
      stock: 10,
    });
    await createTestProduct(shop._id, {
      name: "bread",
      price: 2.5,
      stock: 20,
      costPrice: 1.0,
    });
  });

  afterEach(async () => {
    await wipeShopData({ shopId: shop._id, username: shop.username });
  });

  it("parses quoted multi-word product names", async () => {
    const items = await parseSaleItems(shop._id, '2 "brown bread"');
    assert.ok(Array.isArray(items), items);
    assert.equal(items.length, 1);
    assert.equal(items[0].productName, "brown bread");
    assert.equal(items[0].quantity, 2);
    assert.equal(items[0].price, 2.5);
    assert.equal(items[0].total, 5);
    assert.equal(items[0].isCustomPrice, false);
  });

  it("applies custom unit price when provided", async () => {
    const items = await parseSaleItems(shop._id, '1 "brown bread" 1.75');
    assert.ok(Array.isArray(items), items);
    assert.equal(items[0].price, 1.75);
    assert.equal(items[0].standardPrice, 2.5);
    assert.equal(items[0].isCustomPrice, true);
    assert.equal(items[0].total, 1.75);
  });

  it("parses 2 milk 1 bread as two items (not custom price)", async () => {
    const items = await parseSaleItems(shop._id, "2 milk 1 bread");
    assert.ok(Array.isArray(items), items);
    assert.equal(items.length, 2);
    assert.equal(items[0].productName, "milk");
    assert.equal(items[0].quantity, 2);
    assert.equal(items[0].isCustomPrice, false);
    assert.equal(items[0].price, 3.2);
    assert.equal(items[1].productName, "bread");
    assert.equal(items[1].quantity, 1);
  });

  it("parses custom price then another item", async () => {
    const items = await parseSaleItems(
      shop._id,
      '1 "brown bread" 1.75 2 milk'
    );
    assert.ok(Array.isArray(items), items);
    assert.equal(items.length, 2);
    assert.equal(items[0].price, 1.75);
    assert.equal(items[0].isCustomPrice, true);
    assert.equal(items[1].productName, "milk");
    assert.equal(items[1].quantity, 2);
  });

  it("includes costPrice from product when set", async () => {
    const items = await parseSaleItems(shop._id, "2 bread");
    assert.ok(Array.isArray(items), items);
    assert.equal(items[0].costPrice, 1);
    assert.equal(items[0].costTotal, 2);
  });

  it("returns an error string for unknown products", async () => {
    const result = await parseSaleItems(shop._id, "1 unicornjuice");
    assert.equal(typeof result, "string");
    assert.match(result, /not found/i);
  });
});
