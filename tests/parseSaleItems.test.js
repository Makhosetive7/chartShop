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
  });

  afterEach(async () => {
    await wipeShopData({ shopId: shop._id, telegramId: shop.telegramId });
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

  it("parses multiple items when first has an explicit price", async () => {
    // Bare integers after a product name are treated as custom price by the parser,
    // so multi-item lines need an explicit unit price (or only one item).
    const items = await parseSaleItems(
      shop._id,
      '2 milk 3.20 1 "brown bread"'
    );
    assert.ok(Array.isArray(items), items);
    assert.equal(items.length, 2);
    assert.equal(items[0].productName, "milk");
    assert.equal(items[0].quantity, 2);
    assert.equal(items[0].price, 3.2);
    assert.equal(items[1].productName, "brown bread");
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

  it("returns an error string for unknown products", async () => {
    const result = await parseSaleItems(shop._id, "1 unicornjuice");
    assert.equal(typeof result, "string");
    assert.match(result, /not found/i);
  });
});
