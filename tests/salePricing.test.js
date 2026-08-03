import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSaleLineItems } from "../services/commands/salePricing.js";

describe("buildSaleLineItems", () => {
  it("computes profit when cost is present", () => {
    const items = [
      {
        product: { _id: "a", name: "bread", costPrice: 1 },
        quantity: 2,
        price: 2.5,
        total: 5,
        standardPrice: 2.5,
        isCustomPrice: false,
        costPrice: 1,
      },
    ];

    const result = buildSaleLineItems(items);
    assert.equal(result.total, 5);
    assert.equal(result.costTotal, 2);
    assert.equal(result.profit, 3);
    assert.equal(result.hasCost, true);
    assert.equal(result.lineItems[0].costTotal, 2);
  });

  it("leaves profit 0 when no costs are set", () => {
    const items = [
      {
        product: { _id: "a", name: "bread" },
        quantity: 1,
        price: 2.5,
        total: 2.5,
      },
    ];

    const result = buildSaleLineItems(items);
    assert.equal(result.hasCost, false);
    assert.equal(result.costTotal, 0);
    assert.equal(result.profit, 0);
  });
});
