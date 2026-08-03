# Phase 5 Adapters + Cost Price Checklist

## A — Channel adapters

| # | Check | Expected |
|---|--------|----------|
| 1 | `GET /health` | `whatsapp: disabled` unless enabled |
| 2 | Telegram polling / webhook | Same commands as before via `adapters/telegram` |
| 3 | `GET /webhook/whatsapp?hub.mode=subscribe&hub.verify_token=…&hub.challenge=123` | Returns `123` when token matches |
| 4 | Enable WhatsApp env, send a text to the business number | Reply from bot; shop id is `wa:<phone>` |
| 5 | Register on WhatsApp with `register "WA Shop" 1234` | Separate shop from Telegram (different user id) |

## C — Cost price / margin

| # | Command | Expected |
|---|---------|----------|
| 6 | `add p5bread 2.50 cost 1.00 stock 10` | Product shows cost + unit margin |
| 7 | `sell 2 p5bread` | Receipt includes COGS + gross profit |
| 8 | `daily` | PRODUCT MARGIN section with COGS / gross profit |
| 9 | `edit p5bread cost 1.25` | Cost updated |
| 10 | Product without cost + `sell` / `daily` | Operating result only; hint to set cost |

## Parser follow-on

| # | Command | Expected |
|---|---------|----------|
| 11 | `sell 2 milk 1 bread` (both products exist) | Two-line sale, not custom price on milk |
| 12 | `sell 1 bread 2.25` | Custom price still works |

## Pass criteria

- Telegram path unchanged for existing shops
- WhatsApp is opt-in via env and shares `processCommand`
- Cost is optional; gross margin only appears when costs exist
- `2 milk 1 bread` parses as two items
