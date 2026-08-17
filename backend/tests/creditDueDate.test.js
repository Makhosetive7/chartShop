import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractCreditDueFromText,
  parseCreditDueDate,
} from "../utils/creditDueDate.js";

describe("parseCreditDueDate", () => {
  const saleDate = new Date("2026-08-17T10:00:00.000Z");

  it("requires a value", () => {
    const result = parseCreditDueDate("", saleDate);
    assert.equal(result.ok, false);
  });

  it("accepts YYYY-MM-DD on or after the sale day", () => {
    const result = parseCreditDueDate("2026-08-20", saleDate);
    assert.equal(result.ok, true);
    assert.equal(result.dueDate.toISOString(), "2026-08-19T22:00:00.000Z");
  });

  it("rejects dates before the sale day", () => {
    const result = parseCreditDueDate("2026-08-16", saleDate);
    assert.equal(result.ok, false);
  });

  it("rejects invalid calendar dates", () => {
    const result = parseCreditDueDate("2026-02-31", saleDate);
    assert.equal(result.ok, false);
  });
});

describe("extractCreditDueFromText", () => {
  it("pulls due from the end of the items text", () => {
    const result = extractCreditDueFromText("2 bread 1 milk due 2026-08-20");
    assert.equal(result.found, true);
    assert.equal(result.dueRaw, "2026-08-20");
    assert.equal(result.itemsText, "2 bread 1 milk");
  });

  it("pulls due from after the customer remainder start", () => {
    const result = extractCreditDueFromText("due 2026-08-20 2 bread");
    assert.equal(result.found, true);
    assert.equal(result.dueRaw, "2026-08-20");
    assert.equal(result.itemsText, "2 bread");
  });

  it("reports missing due", () => {
    const result = extractCreditDueFromText("2 bread 1 milk");
    assert.equal(result.found, false);
    assert.equal(result.itemsText, "2 bread 1 milk");
  });
});
