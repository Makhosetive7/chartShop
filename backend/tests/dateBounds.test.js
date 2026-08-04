import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getDayBounds,
  zonedLocalToUtc,
  DEFAULT_TIMEZONE,
} from "../utils/dateBounds.js";

describe("daily range Harare vs UTC", () => {
  it("defaults timezone to Africa/Harare", () => {
    assert.equal(DEFAULT_TIMEZONE, "Africa/Harare");
  });

  it("Harare day start is 22:00 UTC previous calendar day (standard time, UTC+2)", () => {
    // Pick a fixed instant: 2026-03-15 12:00 UTC → still 14:00 Harare on Mar 15
    const midHarareAfternoon = new Date("2026-03-15T12:00:00.000Z");
    const { startDate, endDate } = getDayBounds(
      "Africa/Harare",
      midHarareAfternoon
    );

    // Local midnight Harare 15 Mar = 2026-03-14T22:00:00.000Z
    assert.equal(startDate.toISOString(), "2026-03-14T22:00:00.000Z");
    // End is last ms before next Harare midnight (16 Mar 00:00 = 15 Mar 22:00 UTC)
    assert.equal(endDate.toISOString(), "2026-03-15T21:59:59.999Z");
  });

  it("UTC day bounds differ from Harare for the same instant near midnight UTC", () => {
    // 2026-03-15 01:00 UTC = 03:00 Harare on Mar 15 — both "Mar 15" locally
    // Use 2026-03-14 23:30 UTC = 01:30 Harare on Mar 15
    const nearUtcMidnight = new Date("2026-03-14T23:30:00.000Z");

    const utcBounds = getDayBounds("UTC", nearUtcMidnight);
    const harareBounds = getDayBounds("Africa/Harare", nearUtcMidnight);

    // UTC calendar day is still Mar 14
    assert.equal(utcBounds.startDate.toISOString(), "2026-03-14T00:00:00.000Z");
    assert.equal(utcBounds.endDate.toISOString(), "2026-03-14T23:59:59.999Z");

    // Harare calendar day has already rolled to Mar 15
    assert.equal(
      harareBounds.startDate.toISOString(),
      "2026-03-14T22:00:00.000Z"
    );
    assert.equal(
      harareBounds.endDate.toISOString(),
      "2026-03-15T21:59:59.999Z"
    );

    assert.notEqual(
      utcBounds.startDate.getTime(),
      harareBounds.startDate.getTime()
    );
  });

  it("zonedLocalToUtc maps Harare midnight correctly", () => {
    const midnight = zonedLocalToUtc(2026, 3, 15, 0, 0, 0, 0, "Africa/Harare");
    assert.equal(midnight.toISOString(), "2026-03-14T22:00:00.000Z");
  });

  it("a sale just after Harare midnight is inside Harare day but outside prior UTC day", () => {
    const saleAt = new Date("2026-03-14T22:30:00.000Z"); // 00:30 Harare Mar 15

    const harare = getDayBounds("Africa/Harare", saleAt);
    const utc = getDayBounds("UTC", saleAt);

    assert.ok(saleAt >= harare.startDate && saleAt <= harare.endDate);
    // Same instant is still on UTC Mar 14
    assert.ok(saleAt >= utc.startDate && saleAt <= utc.endDate);

    // But Harare's Mar 15 window start is after UTC Mar 14 start, and
    // UTC Mar 15 day would exclude this sale:
    const utcNextDay = getDayBounds("UTC", new Date("2026-03-15T12:00:00.000Z"));
    assert.ok(saleAt < utcNextDay.startDate);
    assert.ok(saleAt >= harare.startDate);
  });
});
