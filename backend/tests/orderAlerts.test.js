import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  collectOrderAlerts,
  orderAlertStatus,
  ORDER_STALE_DAYS,
} from "../utils/orderAlerts.js";
import { DEFAULT_TIMEZONE, zonedLocalToUtc } from "../utils/dateBounds.js";

function utcDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function localDay(daysFromToday) {
  const now = new Date();
  const shifted = new Date(now.getTime() + daysFromToday * 24 * 60 * 60 * 1000);
  return zonedLocalToUtc(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
    12,
    0,
    0,
    0,
    DEFAULT_TIMEZONE
  );
}

describe("orderAlerts helpers (no db)", () => {
  it("ignores completed orders and fresh pending orders", () => {
    assert.equal(
      orderAlertStatus({
        status: "completed",
        orderDate: utcDaysAgo(10),
      }),
      null
    );
    assert.equal(
      orderAlertStatus({
        status: "pending",
        orderDate: new Date(),
        orderType: "pickup",
      }),
      null
    );
  });

  it("marks open orders stale after two days without a pickup date", () => {
    const chase = orderAlertStatus({
      status: "pending",
      orderDate: utcDaysAgo(ORDER_STALE_DAYS + 0.2),
    });
    assert.equal(chase.status, "stale");
    assert.ok(chase.daysOpen >= ORDER_STALE_DAYS);
  });

  it("uses pickup date for due / overdue and skips far-future pickups", () => {
    const overdue = orderAlertStatus({
      status: "pending",
      orderDate: new Date(),
      pickupDate: utcDaysAgo(2),
    });
    assert.equal(overdue.status, "overdue");
    assert.ok(overdue.daysOverdue >= 1);

    const future = orderAlertStatus({
      status: "pending",
      orderDate: utcDaysAgo(5),
      pickupDate: localDay(8),
    });
    assert.equal(future, null);
  });

  it("collects only alerting orders and sorts overdue first", () => {
    const items = collectOrderAlerts([
      {
        _id: "fresh",
        customerName: "A",
        status: "pending",
        orderDate: new Date(),
        items: [],
      },
      {
        _id: "old",
        customerName: "B",
        status: "pending",
        orderType: "pickup",
        orderDate: utcDaysAgo(4),
        items: [{ productName: "Bread", quantity: 1 }],
      },
      {
        _id: "late",
        customerName: "C",
        status: "pending",
        orderType: "delivery",
        orderDate: new Date(),
        pickupDate: utcDaysAgo(3),
        items: [],
      },
    ]);
    assert.equal(items.length, 2);
    assert.equal(items[0].status, "overdue");
    assert.equal(items[0].customerName, "C");
    assert.equal(items[1].status, "stale");
  });
});
