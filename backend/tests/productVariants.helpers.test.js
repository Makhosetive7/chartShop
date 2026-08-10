import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ensureVariants,
  resolvePack,
  resolveSellUnit,
  resolveVariant,
} from "../utils/productVariants.js";

describe("productVariants helpers (no db)", () => {
  it("materializes a default variant for legacy products", () => {
    const product = {
      name: "soap",
      price: 5,
      costPrice: 2,
      stock: 12,
      variants: [],
    };
    ensureVariants(product);
    assert.equal(product.variants.length, 1);
    assert.equal(product.variants[0].price, 5);
    assert.equal(product.variants[0].stock, 12);
    assert.equal(product.variants[0].packs[0].unitsPerPack, 1);
  });

  it("resolveVariant falls back when stale id hits a single-variant product", () => {
    const product = {
      name: "flour",
      price: 10,
      stock: 4,
      variants: [
        {
          _id: { toString: () => "aaaaaaaaaaaaaaaaaaaaaaaa" },
          label: "",
          isActive: true,
          sortOrder: 0,
          price: 10,
          stock: 4,
          packs: [
            {
              _id: { toString: () => "bbbbbbbbbbbbbbbbbbbbbbbb" },
              label: "Single",
              unitsPerPack: 1,
              price: 10,
              isActive: true,
              sortOrder: 0,
            },
          ],
        },
      ],
    };

    const variant = resolveVariant(product, "000000000000000000000000");
    assert.equal(String(variant._id), "aaaaaaaaaaaaaaaaaaaaaaaa");

    const pack = resolvePack(variant, "111111111111111111111111");
    assert.equal(String(pack._id), "bbbbbbbbbbbbbbbbbbbbbbbb");

    const sell = resolveSellUnit(product, {
      variantId: "000000000000000000000000",
      packId: "111111111111111111111111",
      quantity: 3,
    });
    assert.equal(sell.error, undefined);
    assert.equal(sell.baseUnits, 3);
  });

  it("resolveVariant does not fall back when multiple variants exist", () => {
    const product = {
      name: "shoes",
      price: 100,
      variants: [
        {
          _id: { toString: () => "aaaaaaaaaaaaaaaaaaaaaaaa" },
          label: "Size 1",
          isActive: true,
          sortOrder: 0,
          price: 100,
          packs: [],
        },
        {
          _id: { toString: () => "bbbbbbbbbbbbbbbbbbbbbbbb" },
          label: "Size 2",
          isActive: true,
          sortOrder: 1,
          price: 100,
          packs: [],
        },
      ],
    };

    assert.equal(resolveVariant(product, "000000000000000000000000"), null);
    const sell = resolveSellUnit(product, {
      variantId: "000000000000000000000000",
      quantity: 1,
    });
    assert.match(sell.error, /No variant found/);
  });
});
