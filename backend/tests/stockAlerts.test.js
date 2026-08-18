import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  collectStockAlerts,
  stockAlertStatus,
  variantStockAlert,
} from "../utils/stockAlerts.js";

describe("stockAlerts helpers (no db)", () => {
  it("classifies out, low, and healthy stock", () => {
    assert.equal(stockAlertStatus(0, 10), "out");
    assert.equal(stockAlertStatus(3, 10), "low");
    assert.equal(stockAlertStatus(10, 10), "low");
    assert.equal(stockAlertStatus(11, 10), null);
  });

  it("skips untracked or inactive variants", () => {
    const product = { _id: "p1", name: "Milk", lowStockThreshold: 5 };
    assert.equal(
      variantStockAlert(product, {
        _id: "v1",
        stock: 0,
        trackStock: false,
        isActive: true,
      }),
      null
    );
    assert.equal(
      variantStockAlert(product, {
        _id: "v2",
        stock: 0,
        trackStock: true,
        isActive: false,
      }),
      null
    );
  });

  it("collects out-of-stock before low, and only alerting variants", () => {
    const items = collectStockAlerts([
      {
        _id: "bread",
        name: "Bread",
        lowStockThreshold: 8,
        variants: [
          {
            _id: "white",
            label: "White",
            stock: 2,
            lowStockThreshold: 8,
            trackStock: true,
            isActive: true,
          },
          {
            _id: "brown",
            label: "Brown",
            stock: 40,
            lowStockThreshold: 8,
            trackStock: true,
            isActive: true,
          },
        ],
      },
      {
        _id: "milk",
        name: "Milk",
        variants: [
          {
            _id: "2l",
            label: "2L",
            stock: 0,
            lowStockThreshold: 4,
            trackStock: true,
            isActive: true,
          },
        ],
      },
    ]);

    assert.equal(items.length, 2);
    assert.equal(items[0].status, "out");
    assert.equal(items[0].productName, "Milk");
    assert.equal(items[1].status, "low");
    assert.equal(items[1].variantLabel, "White");
    assert.equal(items[1].stock, 2);
  });
});
