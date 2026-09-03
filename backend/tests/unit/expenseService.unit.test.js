/**
 * Unit tests for ExpenseService message generation (no database required)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { default: ExpenseService } = await import("../../services/ExpenseService.js");

describe("ExpenseService Unit Tests (No DB)", () => {
  it("generateExpenseRecordedMessage should handle D2-A payment method messaging", () => {
    // Test cash expense (should show till impact)
    const cashExpense = {
      amount: 25.50,
      description: "Market fees",
      category: "market_fees",
      paymentMethod: "cash",
      kind: "operating_expense",
      date: new Date("2026-09-03T14:30:00Z"),
      receiptNumber: "R123"
    };

    const cashMessage = ExpenseService.generateExpenseRecordedMessage(cashExpense, {
      ownerCashIn: 0,
      cashAvailable: 74.50,
      paymentMethod: "cash"
    });

    assert.match(cashMessage, /EXPENSE RECORDED/);
    assert.match(cashMessage, /\$25\.50/);
    assert.match(cashMessage, /Market fees/);
    assert.match(cashMessage, /MARKET_FEES/);
    assert.match(cashMessage, /OPERATING EXPENSE/);
    assert.match(cashMessage, /CASH/);
    assert.match(cashMessage, /Cash in till now: \$74\.50/);
    assert.match(cashMessage, /R123/);

    // Test bank expense (should show no till impact)
    const bankExpense = {
      amount: 150.00,
      description: "Bank rent payment",
      category: "rent", 
      paymentMethod: "bank",
      kind: "operating_expense",
      date: new Date("2026-09-03T14:30:00Z"),
      receiptNumber: ""
    };

    const bankMessage = ExpenseService.generateExpenseRecordedMessage(bankExpense, {
      ownerCashIn: 0,
      cashAvailable: null, // No till update for non-cash
      paymentMethod: "bank"
    });

    assert.match(bankMessage, /EXPENSE RECORDED/);
    assert.match(bankMessage, /\$150\.00/);
    assert.match(bankMessage, /Bank rent payment/);
    assert.match(bankMessage, /BANK/);
    assert.match(bankMessage, /BANK expense did not drain your cash till/);
    assert.doesNotMatch(bankMessage, /Cash in till now/);

    // Test restock (D4-A messaging)
    const restockExpense = {
      amount: 80.00,
      description: "Stock restock", 
      category: "restocking",
      paymentMethod: "cash",
      kind: "inventory_fund_transfer",
      date: new Date("2026-09-03T14:30:00Z"),
      receiptNumber: ""
    };

    const restockMessage = ExpenseService.generateExpenseRecordedMessage(restockExpense, {
      ownerCashIn: 0,
      cashAvailable: 20.00,
      paymentMethod: "cash"
    });

    assert.match(restockMessage, /RESTOCK \(CASH OUT - STOCK MANAGED SEPARATELY\)/);
    assert.match(restockMessage, /\$80\.00/);
    assert.match(restockMessage, /Stock restock/);
    assert.match(restockMessage, /Cash in till now: \$20\.00/);

    // Test with owner cash-in
    const overspendMessage = ExpenseService.generateExpenseRecordedMessage(cashExpense, {
      ownerCashIn: 10.50,
      cashAvailable: 0,
      paymentMethod: "cash"
    });

    assert.match(overspendMessage, /Owner cash-in recorded: \$10\.50/);
    assert.match(overspendMessage, /paid from pocket \/ unrecorded cash/);
  });

  it("generateExpensesReportMessage should show D4-A restock terminology", () => {
    const expenses = [
      {
        amount: 25,
        description: "Transport",
        category: "transport",
        kind: "operating_expense",
        date: new Date("2026-09-03T10:00:00Z")
      },
      {
        amount: 80,
        description: "Inventory restock",
        category: "restocking", 
        kind: "inventory_fund_transfer",
        date: new Date("2026-09-03T11:00:00Z")
      }
    ];

    const startDate = new Date("2026-09-03T00:00:00Z");
    const endDate = new Date("2026-09-03T23:59:59Z");

    const message = ExpenseService.generateExpensesReportMessage(
      expenses, 
      105, // total
      "daily",
      startDate,
      endDate,
      {
        operatingTotal: 25,
        inventoryTransferTotal: 80,
        operatingCount: 1,
        inventoryTransferCount: 1
      }
    );

    assert.match(message, /EXPENSES REPORT - TODAY/);
    assert.match(message, /Operating Expenses: \$25\.00 \(1 items\)/);
    assert.match(message, /Restock \(cash out\): \$80\.00 \(1 transfer\)/); // D4-A
    assert.match(message, /Cash Out Total: \$105\.00/);
    assert.match(message, /Transport/);
    assert.match(message, /Restock \(cash out\)/); // D4-A in item list
  });

  it("generateExpenseBreakdownMessage should use D4-A restock terminology", () => {
    const breakdownResult = {
      breakdown: [
        ["transport", { total: 50, count: 2, expenses: [] }],
        ["restocking", { total: 80, count: 1, expenses: [] }]
      ],
      total: 130,
      operatingTotal: 50,
      inventoryTransferTotal: 80,
      operatingCount: 2,
      inventoryTransferCount: 1,
      period: "weekly",
      startDate: new Date("2026-08-28T00:00:00Z"),
      endDate: new Date("2026-09-03T23:59:59Z")
    };

    const message = ExpenseService.generateExpenseBreakdownMessage(breakdownResult);

    assert.match(message, /EXPENSE BREAKDOWN - THIS WEEK/);
    assert.match(message, /Operating Expenses: \$50\.00/);
    assert.match(message, /Restock \(cash out\): \$80\.00/); // D4-A
    assert.match(message, /Cash Out Total: \$130\.00/);
    assert.match(message, /\*Transport\*[\s\S]*Amount: \$50\.00 \(38\.5%\)/);
    assert.match(message, /\*Restocking\*[\s\S]*Amount: \$80\.00 \(61\.5%\)/);
  });
});