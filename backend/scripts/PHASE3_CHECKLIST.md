# Phase 3 Command Split Checklist

Run after Phase 3 changes. Goal: same bot behavior with commands routed through `services/commands/` (no god-file edits to add features).

## Prerequisites

- [ ] Server running (`npm run start:dev`)
- [ ] MongoDB reachable
- [ ] Logged-in shop (Phase 2 sessions OK)

## Structure check

| # | Check | Expected |
|---|--------|----------|
| 1 | Open `services/commandService.js` | Thin re-export only |
| 2 | Open `services/commands/router.js` | `processCommand` match → handler |
| 3 | Handlers exist under `services/commands/handlers/` | auth, inventory, sales, customers, orders, expenses, reports, help |
| 4 | `parseSaleItems` lives in `services/commands/parseSaleItems.js` | Shared by cash / credit / laybye / sell-to / ledger credit |

## Smoke (behavior unchanged)

| # | Command / action | Expected |
|---|------------------|----------|
| 5 | `help` | Full help text |
| 6 | `list` | Products list |
| 7 | `sell 1 <product>` | Cash sale receipt |
| 8 | `credit sale to <customer> 1 <product>` | Credit sale + stock deduct |
| 9 | `credit <customer> 1 <product>` | Ledger credit via `parseSaleItems` (quoted names OK) |
| 10 | `cancel last "phase3"` | Cancel works |
| 11 | `daily` | Operating report |
| 12 | `customer add "Phase3 Cust" 5550003333` then `sell to Phase3 Cust 1 <product>` | Customer sale |
| 13 | `expenses daily` / `expense breakdown` | Expense handlers fire (breakdown reachable) |
| 14 | Product name with `_` or `*` in an error path | Markdown specials escaped in user-facing errors |

## Pass criteria

- No 3.6k-line `commandService` god file
- Adding a command = touch router + one handler domain
- Dead `handleSell` path gone (cash sales use `handleCashSale` + `parseSaleItems`)
- Credit item dialects share `parseSaleItems`
- Bot still responds for core flows above
