import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  connectTestDb,
  disconnectTestDb,
  wipeShopData,
} from "./helpers/mongo.js";
import { createTestShop } from "./helpers/fixtures.js";
import Product from "../models/Product.js";
import {
  buildDefaultPack,
  buildDefaultVariant,
} from "../utils/productVariants.js";
import { parseSaleItems } from "../services/commands/parseSaleItems.js";
import {
  handleVariantAdd,
  handlePackAdd,
  handleUpdateStock,
} from "../services/commands/handlers/inventory.js";

describe("chat variants + packs", () => {
  let shop;
  let username;

  before(async () => {
    await connectTestDb();
  });

  after(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    const created = await createTestShop();
    shop = created.shop;
    username = created.username;

    await Product.create({
      shopId: shop._id,
      name: "Coke",
      price: 1.2,
      stock: 0,
      variants: [
        buildDefaultVariant({
          label: "500ml",
          price: 1.2,
          stock: 48,
          packs: [
            buildDefaultPack({ label: "Single", unitsPerPack: 1, price: 1.2 }),
            buildDefaultPack({ label: "Crate", unitsPerPack: 24, price: 25 }),
          ],
        }),
        buildDefaultVariant({
          label: "2L",
          price: 2.5,
          stock: 12,
        }),
      ],
    });

    await Product.create({
      shopId: shop._id,
      name: "Cavela shoes",
      price: 450,
      stock: 0,
      variants: [
        buildDefaultVariant({ label: "Size 1", price: 450, stock: 5 }),
        buildDefaultVariant({ label: "Size 2", price: 450, stock: 8 }),
        buildDefaultVariant({ label: "Size 3", price: 480, stock: 2 }),
      ],
    });

    await Product.create({
      shopId: shop._id,
      name: "bread",
      price: 2.5,
      stock: 20,
    });
    await Product.create({
      shopId: shop._id,
      name: "milk",
      price: 3.2,
      stock: 10,
    });
  });

  afterEach(async () => {
    await wipeShopData({ shopId: shop._id, username });
  });

  it("parses sell 1 coke crate → 24 base units on 500ml", async () => {
    const items = await parseSaleItems(shop._id, "1 coke crate");
    assert.ok(Array.isArray(items), items);
    assert.equal(items[0].baseUnitsDeducted, 24);
    assert.equal(items[0].variantLabel, "500ml");
    assert.equal(items[0].packLabel, "Crate");
    assert.equal(items[0].price, 25);
    assert.equal(items[0].productName, "Coke");
  });

  it("parses sell 1 coke 2L", async () => {
    const items = await parseSaleItems(shop._id, "1 coke 2L");
    assert.ok(Array.isArray(items), items);
    assert.equal(items[0].variantLabel, "2L");
    assert.equal(items[0].unitsPerPack, 1);
    assert.equal(items[0].price, 2.5);
  });

  it("parses sell 2 cavela size 2", async () => {
    const items = await parseSaleItems(shop._id, "2 cavela size 2");
    assert.ok(Array.isArray(items), items);
    assert.equal(items[0].productName, "Cavela shoes");
    assert.equal(items[0].variantLabel, "Size 2");
    assert.equal(items[0].quantity, 2);
    assert.equal(items[0].baseUnitsDeducted, 2);
    assert.equal(items[0].total, 900);
  });

  it("still parses 2 milk 1 bread", async () => {
    const items = await parseSaleItems(shop._id, "2 milk 1 bread");
    assert.ok(Array.isArray(items), items);
    assert.equal(items.length, 2);
    assert.equal(items[0].productName, "milk");
    assert.equal(items[1].productName, "bread");
  });

  it("variant add + pack add via chat handlers", async () => {
    await Product.create({
      shopId: shop._id,
      name: "Eggs",
      price: 0.5,
      stock: 60,
    });

    const vMsg = await handleVariantAdd(
      shop._id,
      "variant add Eggs Loose 0.5 stock 60"
    );
    // Eggs already has implicit variant — adding Loose is fine
    assert.match(vMsg, /Variant added/i);

    const pMsg = await handlePackAdd(
      shop._id,
      "pack add Eggs Tray 30 12"
    );
    assert.match(pMsg, /Pack added/i);

    const items = await parseSaleItems(shop._id, "1 eggs tray");
    assert.ok(Array.isArray(items), items);
    assert.equal(items[0].packLabel, "Tray");
    assert.equal(items[0].baseUnitsDeducted, 30);
  });

  it("stock update targets a variant", async () => {
    const msg = await handleUpdateStock(
      shop._id,
      'stock +"cavela shoes" size 2 3'
    );
    assert.match(msg, /Stock Updated/i);
    assert.match(msg, /Size 2/i);

    const product = await Product.findOne({
      shopId: shop._id,
      name: /cavela/i,
    });
    const size2 = product.variants.find((v) => v.label === "Size 2");
    assert.equal(size2.stock, 11);
  });
});
