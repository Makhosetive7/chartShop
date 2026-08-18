import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  collectLaybyeAlerts,
  lastLaybyeActivityAt,
  laybyeAlertStatus,
  LAYBYE_QUIET_DAYS,
} from "../utils/laybyeAlerts.js";

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

describe("laybyeAlerts helpers (no db)", () => {
  it("ignores completed laybyes and zero balances", () => {
    assert.equal(
      laybyeAlertStatus({
        status: "completed",
        balanceDue: 40,
        dueDate: daysAgo(2),
      }),
      null
    );
    assert.equal(
      laybyeAlertStatus({
        status: "active",
        balanceDue: 0,
        dueDate: daysAgo(2),
        startDate: daysAgo(20),
      }),
      null
    );
  });

  it("uses the latest installment as last activity", () => {
    const last = lastLaybyeActivityAt({
      startDate: daysAgo(20),
      installments: [{ amount: 10, date: daysAgo(12) }, { amount: 5, date: daysAgo(3) }],
    });
    assert.ok(last);
    assert.ok(Math.abs(Date.now() - last.getTime() - 3 * 86400000) < 60 * 60 * 1000);
  });

  it("flags overdue due dates ahead of quiet", () => {
    const chase = laybyeAlertStatus({
      status: "active",
      balanceDue: 40,
      dueDate: daysAgo(2),
      startDate: daysAgo(4),
      installments: [{ amount: 10, date: daysAgo(1) }],
    });
    assert.equal(chase.status, "overdue");
    assert.ok(chase.daysOverdue >= 1);
  });

  it("flags quiet when there is no payment for 14 days and due date is still upcoming", () => {
    const chase = laybyeAlertStatus({
      status: "active",
      balanceDue: 25,
      dueDate: new Date(Date.now() + 20 * 86400000),
      startDate: daysAgo(LAYBYE_QUIET_DAYS + 1),
      installments: [],
    });
    assert.equal(chase.status, "quiet");
    assert.ok(chase.daysQuiet >= LAYBYE_QUIET_DAYS);
  });

  it("does not notify a healthy upcoming laybye with a recent payment", () => {
    assert.equal(
      laybyeAlertStatus({
        status: "active",
        balanceDue: 25,
        dueDate: new Date(Date.now() + 20 * 86400000),
        startDate: daysAgo(20),
        installments: [{ amount: 10, date: daysAgo(2) }],
      }),
      null
    );
  });

  it("collects and sorts overdue before quiet", () => {
    const items = collectLaybyeAlerts([
      {
        _id: "quiet",
        customerName: "Nomsa",
        status: "active",
        balanceDue: 40,
        dueDate: new Date(Date.now() + 20 * 86400000),
        startDate: daysAgo(20),
        items: [{ productName: "Shoes", quantity: 1 }],
      },
      {
        _id: "late",
        customerName: "Thabo",
        status: "active",
        balanceDue: 12,
        dueDate: daysAgo(5),
        startDate: daysAgo(10),
        items: [],
      },
    ]);
    assert.equal(items.length, 2);
    assert.equal(items[0].customerName, "Thabo");
    assert.equal(items[0].status, "overdue");
    assert.equal(items[1].status, "quiet");
  });
});
