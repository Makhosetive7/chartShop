/**
 * Unit tests for FinancialService core logic (no database required)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { default: FinancialService } = await import("../../services/FinancialService.js");

describe("FinancialService Unit Tests (No DB)", () => {
  it("roundMoney should properly round monetary values", () => {
    assert.equal(FinancialService.roundMoney(10.999), 11.00);
    assert.equal(FinancialService.roundMoney(10.001), 10.00);
    assert.equal(FinancialService.roundMoney(10.50), 10.50);
    assert.equal(FinancialService.roundMoney(0), 0);
    assert.equal(FinancialService.roundMoney(null), 0);
    assert.equal(FinancialService.roundMoney(undefined), 0);
    assert.equal(FinancialService.roundMoney("invalid"), 0);
  });

  it("parseMonthParameter should handle various month inputs", () => {
    const timeZone = "UTC";
    
    // Test numeric months
    const jan = FinancialService.parseMonthParameter("1", timeZone);
    assert.equal(jan.month, 0); // 0-indexed
    assert.equal(jan.label, "January");
    
    const dec = FinancialService.parseMonthParameter("12", timeZone);
    assert.equal(dec.month, 11);
    assert.equal(dec.label, "December");
    
    // Test month names
    const feb = FinancialService.parseMonthParameter("february", timeZone);
    assert.equal(feb.month, 1);
    assert.equal(feb.label, "February");
    
    const febShort = FinancialService.parseMonthParameter("feb", timeZone);
    assert.equal(febShort.month, 1);
    assert.equal(febShort.label, "February");
    
    // Test invalid inputs
    try {
      FinancialService.parseMonthParameter("13", timeZone);
      assert.fail("Should throw error for month 13");
    } catch (error) {
      assert.match(error.message, /Month number must be between 1 and 12/);
    }
    
    try {
      FinancialService.parseMonthParameter("invalid", timeZone);
      assert.fail("Should throw error for invalid month name");
    } catch (error) {
      assert.match(error.message, /Invalid month: invalid/);
    }
  });

  it("toObjectId should handle various ID formats", () => {
    const validId = "507f1f77bcf86cd799439011";
    
    // Should return ObjectId for valid string
    const result1 = FinancialService.toObjectId(validId);
    assert.equal(result1.toString(), validId);
    
    // Should pass through existing ObjectId
    const result2 = FinancialService.toObjectId(result1);
    assert.equal(result2.toString(), validId);
  });
});