# Phase 1 Money-Path Checklist

Run after Phase 1 changes. Goal: concurrent sells can’t oversell; cancel fixes books; daily matches shop timezone; reports don’t invent profit.

## Prerequisites

- [ ] Server running (`npm run start:dev`)
- [ ] MongoDB reachable
- [ ] Shop timezone is `Africa/Harare` (default) unless intentionally changed

## Flow

| # | Command / action | Expected |
|---|------------------|----------|
| 1 | `add phase1bread 2.50 stock 5` | Product created with stock 5 |
| 2 | `sell 3 phase1bread` | Sale OK; stock 2 |
| 3 | `sell 4 phase1bread` | **Rejected** — insufficient stock (atomic) |
| 4 | `list` | phase1bread stock still 2 |
| 5 | `cancel last "phase1 test"` | Stock restored to 5 |
| 6 | `customer add "Phase1 Cust" 5550002222` | Customer created |
| 7 | `credit sale to Phase1 Cust 2 phase1bread` | Credit sale; stock 3; customer owes $5.00 |
| 8 | `cancel last "phase1 credit reverse"` | Stock back to 5; customer balance **0** |
| 9 | `daily` | Shows **Operating Result** (not fake Gross Profit $0); period aligns with local midnight |
| 10 | `laybye Phase1 Cust 1 phase1bread deposit 1` | Agreement says stock **not reserved** |
| 11 | `sell 5 phase1bread` | Allowed (laybye didn’t hold stock) — stock 0 |
| 12 | Pay off laybye then `laybye complete Phase1 Cust` | Fails or warns if stock insufficient at completion |

## Pass criteria

- Oversell attempt fails without going negative
- Credit cancel restores both stock and `currentBalance`
- Daily/weekly/monthly use shop timezone day boundaries
- Financial report uses operating result = revenue − expenses (no `$0.00` gross profit from empty `sale.profit`)
- Laybye messaging matches model B (no reservation)

## Notes

- If auto-complete on final laybye payment runs with empty stock, expect a clear error; restock then complete.
