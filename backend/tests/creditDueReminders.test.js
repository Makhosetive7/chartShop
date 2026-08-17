import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { reminderSlotForToday } from "../utils/creditDueReminders.js";
import { addYmdDays, zonedLocalToUtc } from "../utils/dateBounds.js";
import { buildReminderMessage } from "../services/CreditDueReminderService.js";

const due = zonedLocalToUtc(2026, 8, 20, 0, 0, 0, 0, "Africa/Harare");

function harareNoon(year, month, day) {
  return zonedLocalToUtc(year, month, day, 12, 0, 0, 0, "Africa/Harare");
}

describe("reminderSlotForToday", () => {
  it("alerts the day before", () => {
    const slot = reminderSlotForToday(due, harareNoon(2026, 8, 19));
    assert.deepEqual(slot, { key: "before", kind: "before", daysOverdue: 0 });
  });

  it("alerts on the due day", () => {
    const slot = reminderSlotForToday(due, harareNoon(2026, 8, 20));
    assert.deepEqual(slot, { key: "due", kind: "due", daysOverdue: 0 });
  });

  it("does not alert the day after", () => {
    assert.equal(reminderSlotForToday(due, harareNoon(2026, 8, 21)), null);
  });

  it("alerts every 3 days after, through day 30", () => {
    const slot3 = reminderSlotForToday(due, harareNoon(2026, 8, 23));
    assert.deepEqual(slot3, {
      key: "overdue:3",
      kind: "overdue",
      daysOverdue: 3,
    });

    const slot30 = reminderSlotForToday(due, harareNoon(2026, 9, 19));
    assert.deepEqual(slot30, {
      key: "overdue:30",
      kind: "overdue",
      daysOverdue: 30,
    });
  });

  it("stops after 30 days", () => {
    assert.equal(reminderSlotForToday(due, harareNoon(2026, 9, 20)), null);
  });

  it("skips days that are not on the 3-day cadence", () => {
    assert.equal(reminderSlotForToday(due, harareNoon(2026, 8, 24)), null);
  });
});

describe("creditChaseStatus", () => {
  it("labels overdue, due, tomorrow, and upcoming", async () => {
    const { creditChaseStatus } = await import("../utils/creditDueReminders.js");
    assert.equal(
      creditChaseStatus(due, harareNoon(2026, 8, 22)).status,
      "overdue"
    );
    assert.equal(creditChaseStatus(due, harareNoon(2026, 8, 20)).status, "due");
    assert.equal(
      creditChaseStatus(due, harareNoon(2026, 8, 19)).status,
      "tomorrow"
    );
    assert.equal(
      creditChaseStatus(due, harareNoon(2026, 8, 17)).status,
      "upcoming"
    );
  });
});

describe("addYmdDays", () => {
  it("crosses month boundaries", () => {
    assert.deepEqual(addYmdDays({ year: 2026, month: 8, day: 31 }, 1), {
      year: 2026,
      month: 9,
      day: 1,
    });
  });
});

describe("buildReminderMessage", () => {
  it("groups before / due / overdue lines", () => {
    const text = buildReminderMessage(
      { year: 2026, month: 8, day: 20 },
      [
        {
          slot: { key: "before", kind: "before", daysOverdue: 0 },
          customerName: "Thabo",
          sale: {
            total: 12.5,
            items: [{ quantity: 1, productName: "airtime" }],
          },
        },
        {
          slot: { key: "overdue:3", kind: "overdue", daysOverdue: 3 },
          customerName: "Jane",
          sale: {
            total: 8,
            items: [{ quantity: 2, productName: "bread" }],
          },
        },
      ]
    );
    assert.match(text, /Credit chase/);
    assert.match(text, /Due tomorrow/);
    assert.match(text, /Thabo/);
    assert.match(text, /Overdue/);
    assert.match(text, /3 days late/);
    assert.match(text, /payment \[name\] \[amount\]/);
  });
});
