# Phase 0 Smoke Checklist

Run against a throwaway Telegram account (or a dedicated test shop).  
Goal: confirm the happy path still works after stabilize fixes. No semantic changes expected.

## Prerequisites

- [ ] Server running (`npm run start:dev` or equivalent)
- [ ] MongoDB reachable
- [ ] `TELEGRAM_BOT_TOKEN` set; bot responds to `/start` or any message

## Flow

Use a fresh Telegram ID if possible, or `logout` first.

| # | Command | Expected |
|---|---------|----------|
| 1 | `register "Smoke Test Shop" 4829` | Registration complete; auto-login; business name shown (not blank/`undefined`) |
| 2 | `add bread 2.50 stock 100` | Product created |
| 3 | `add milk 3.20 stock 50` | Product created |
| 4 | `list` | Both products listed with stock |
| 5 | `sell 2 bread 1 milk` | Sale recorded; totals look right |
| 6 | `daily` | Today’s report includes the sale |
| 7 | `cancel` | Recent sales listed |
| 8 | `cancel last "smoke test"` | Sale cancelled; stock restored |
| 9 | `customer add "Smoke Customer" 5550001111` | Customer created |
| 10 | `credit sale to Smoke Customer 1 bread` | Credit sale recorded |
| 11 | `payment Smoke Customer 2.50` | Payment applied; balance reduced |
| 12 | `status` / `account` | Shows **business name**, not blank |
| 13 | `logout` then `login 4829` | Login works |

## Pass criteria

- No `undefined` / blank business name in login/status messages
- Stock after cancel matches pre-sale levels for cancelled items
- Credit balance moves in the expected direction on sale and payment
- Server logs do **not** print the bot token (full or partial)

## Notes

- If credit-sale syntax differs, use whatever `help` documents; record the exact command used.
- Keep this shop for Phase 1 money-path checks, or delete products and start clean.
