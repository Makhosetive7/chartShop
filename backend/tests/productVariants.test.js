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
import { parseApiSaleItems } from "../utils/apiSaleItems.js";
import {
  buildDefaultPack,
  buildDefaultVariant,
} from "../utils/productVariants.js";

describe("Product variants and packs", () => {
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
  });

  afterEach(async () => {
    await wipeShopData({ shopId: shop._id, username });
  });

  it("creates an implicit variant and Single pack on simple products", async () => {
    const product = await createTestProduct(shop._id, {
      name: "bread",
      price: 2,
      stock: 10,
    });
    assert.equal(product.variants.length, 1);
    assert.equal(product.variants[0].packs.length, 1);
    assert.equal(product.variants[0].packs[0].unitsPerPack, 1);
    assert.equal(product.variants[0].stock, 10);
    assert.equal(product.stock, 10);
  });

  it("deducts pack units from the matching variant only", async () => {
    const product = await Product.create({
      shopId: shop._id,
      name: "Coca-Cola",
      price: 1.2,
      stock: 0,
      variants: [
        buildDefaultVariant({
          label: "500ml",
          baseUnit: "bottle",
          price: 1.2,
          costPrice: 0.7,
          stock: 48,
          packs: [
            buildDefaultPack({ label: "Single", unitsPerPack: 1, price: 1.2 }),
            buildDefaultPack({ label: "Crate", unitsPerPack: 24, price: 25 }),
          ],
        }),
        buildDefaultVariant({
          label: "2L",
          baseUnit: "bottle",
          price: 2.5,
          stock: 12,
          packs: [
            buildDefaultPack({ label: "Single", unitsPerPack: 1, price: 2.5 }),
            buildDefaultPack({ label: "Case", unitsPerPack: 6, price: 14 }),
          ],
        }),
      ],
    });

    const v500 = product.variants.find((v) => v.label === "500ml");
    const crate = v500.packs.find((p) => p.label === "Crate");

    const parsed = await parseApiSaleItems(shop._id, [
      {
        productId: String(product._id),
        variantId: String(v500._id),
        packId: String(crate._id),
        quantity: 1,
      },
    ]);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.items[0].baseUnitsDeducted, 24);
    assert.equal(parsed.items[0].price, 25);
    assert.equal(parsed.items[0].total, 25);

    const result = await InventoryService.deductSaleItems(parsed.items);
    assert.equal(result.success, true);

    const fresh = await Product.findById(product._id);
    const fresh500 = fresh.variants.find((v) => v.label === "500ml");
    const fresh2L = fresh.variants.find((v) => v.label === "2L");
    assert.equal(fresh500.stock, 24);
    assert.equal(fresh2L.stock, 12);
    assert.equal(fresh.stock, 36);
  });

  it("keeps shoe size stocks independent", async () => {
    const product = await Product.create({
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

    const size2 = product.variants.find((v) => v.label === "Size 2");
    await InventoryService.deductStock(product._id, 2, null, {
      variantId: size2._id,
    });

    const fresh = await Product.findById(product._id);
    assert.equal(fresh.variants.find((v) => v.label === "Size 1").stock, 5);
    assert.equal(fresh.variants.find((v) => v.label === "Size 2").stock, 6);
    assert.equal(fresh.variants.find((v) => v.label === "Size 3").stock, 2);
    assert.equal(fresh.stock, 13);
  });
});
