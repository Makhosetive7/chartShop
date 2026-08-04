# Web API v1

JSON REST API mirroring Telegram/WhatsApp chat commands. Same Mongo models and domain services.

Base URL: `/api/v1`  
Auth: `Authorization: Bearer <token>` from login or register.

Channel `userId` is the shop’s `telegramId` (numeric chat id) or `wa:<phone>`.

```bash
TOKEN=$(curl -s http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"userId":"YOUR_TELEGRAM_ID","pin":"4829"}' | jq -r .token)
```

## Auth

| Method | Path | Chat equivalent |
|--------|------|-----------------|
| POST | `/auth/register` | `register "Name" 1234` |
| POST | `/auth/login` | `login 1234` |
| POST | `/auth/logout` | `logout` |
| GET | `/auth/me` | session check |
| GET | `/auth/status?userId=` | `status` |
| GET | `/auth/profile` | `profile` / `account` |
| PATCH | `/auth/profile/name` | `profile edit name` |
| PATCH | `/auth/profile/description` | `profile edit description` |
| PATCH | `/auth/profile/pin` | `profile edit pin` (`oldPin`, `newPin`) |

Register body: `{ "userId", "businessName", "pin", "businessDescription?" }` — returns token + shop.

## Products

| Method | Path | Chat equivalent |
|--------|------|-----------------|
| GET | `/products` | `list` |
| POST | `/products` | `add` |
| GET | `/products/low-stock` | `low stock` |
| GET | `/products/:id` | lookup by id or name |
| PATCH | `/products/:id` | `edit` / `price` / `threshold` / cost |
| POST | `/products/:id/stock` | `stock` (`op`: `+`/`-`/`=`, `quantity`) |
| DELETE | `/products/:id` | `delete` (pass `confirm: true` if has sales) |

## Sales & laybye

| Method | Path | Chat equivalent |
|--------|------|-----------------|
| POST | `/sales/cash` | `sell` |
| POST | `/sales/credit` | `credit sale` |
| POST | `/sales/to-customer` | `sell to` |
| GET | `/sales/recent` | `cancel` (list) |
| POST | `/sales/cancel/last` | `cancel last` |
| POST | `/sales/:id/cancel` | `cancel sale N` |
| GET | `/sales/refunds` | `cancel refunds` |
| POST | `/laybye` | `laybye` |
| POST | `/laybye/pay` | `laybye pay` |
| POST | `/laybye/complete` | `laybye complete` |

Sale items body:

```json
{ "items": [{ "name": "bread", "quantity": 2 }, { "productId": "...", "quantity": 1, "price": 3.0 }] }
```

Credit / to-customer also need `"customer": "John"` (name, phone, or id).

## Customers

| Method | Path | Chat equivalent |
|--------|------|-----------------|
| GET | `/customers?filter=all\|active` | `customers` |
| POST | `/customers` | `customer add` |
| GET | `/customers/:id` | `customer John` |
| GET | `/customers/:id/history` | purchase history |
| GET | `/customers/:id/credit-history` | `credit history` |
| POST | `/customers/:id/credit` | `credit` (ledger, no stock) |
| POST | `/customers/:id/payment` | `payment` |

## Orders

| Method | Path | Chat equivalent |
|--------|------|-----------------|
| GET | `/orders?status=` | `orders` |
| POST | `/orders` | `order` |
| GET | `/orders/:id` | order details (id or last-4) |
| PATCH | `/orders/:id/status` | confirm / ready / complete / cancel |

Create: `{ "customer", "items": [...], "orderType": "pickup", "notes": "" }`

Status body: `{ "status": "confirmed"|"ready"|"completed"|"cancelled" }`

## Expenses

| Method | Path | Chat equivalent |
|--------|------|-----------------|
| POST | `/expenses` | `expense` |
| GET | `/expenses?period=daily` | `expenses` |
| GET | `/expenses/breakdown?period=monthly` | `expense breakdown` |

## Reports

| Method | Path | Chat equivalent |
|--------|------|-----------------|
| GET | `/reports/daily` | `daily` |
| GET | `/reports/weekly` | `weekly` |
| GET | `/reports/monthly?month=` | `monthly` |
| GET | `/reports/best-sellers?days=7` | `best` |
| GET | `/reports/profit?period=daily` | `profit` |
| GET | `/reports/export?type=daily` | `export` / `pdf` (streams PDF; `download=0` for JSON paths) |

## Help

`GET /help` — endpoint catalog + stripped chat help text.

## Stats / analytics

Dashboard-oriented aggregates (not chat commands). Query: `?days=30&limit=10`.

| Method | Path | What you get |
|--------|------|----------------|
| GET | `/stats` | Overview: today/week/month snapshots, most purchased, slowest, best client, debtors, peaks |
| GET | `/stats/products` | Most purchased, top revenue, slowest, never sold, best/worst margin |
| GET | `/stats/customers` | Best clients (spend), most frequent, period leaders, debtors, inactive |
| GET | `/stats/sales` | Avg ticket, mix by type, by hour/weekday, peak hour/day, cancellations |
| GET | `/stats/inventory` | Stock value, low/out of stock, overstocked |

## Chat & activity

| Method | Path | Notes |
|--------|------|-------|
| POST | `/chat` | `{ "message": "daily" }` — same command engine as Telegram/WhatsApp; logs `chat.turn` |
| GET | `/chat/history` | Message bubbles reconstructed from activity |
| GET | `/activity` | Audit feed (`?channel=web\|telegram\|whatsapp`) |

```bash
curl -s "http://localhost:3000/api/v1/stats?days=30&limit=5" \
  -H "Authorization: Bearer $TOKEN"

curl -s "http://localhost:3000/api/v1/stats/products?days=7" \
  -H "Authorization: Bearer $TOKEN"
```

## Notes

- Oversell / conflicts return **409**.
- Auth failures return **401**.
- CORS defaults to `Access-Control-Allow-Origin: *` (override with `CORS_ORIGIN`).
- Progressive multi-step chat registration is not exposed; use one-shot `POST /auth/register`.
