# Web API v1

JSON REST API mirroring Telegram/WhatsApp chat commands. Same Mongo models and domain services. Consumed by the web dashboard (`frontend/src/api/*.ts`) and the Android app (`android/`).

Base URL: `/api/v1` (production: `https://chartshop.onrender.com/api/v1`)  
Auth: `Authorization: Bearer <token>` from login, register, or demo.

**Identity:** a shop has one or more users (`admin` or `member`), each with a `username` + 4-digit PIN. Telegram chat ids and WhatsApp phones are linked channel metadata, not login ids.

```bash
TOKEN=$(curl -s http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"tinasales","pin":"4829"}' | jq -r .token)
```

## Conventions

### Sessions

- Tokens are opaque. Every web/app login creates its own session, so several devices can be signed in at once.
- Sessions expire after **24 hours without an authenticated request**; each authenticated request renews the window.
- `POST /auth/logout` ends only the calling session.
- Recovering a PIN with a recovery code ends every session for that user.

### Response shapes

Success responses include `"success": true`. Errors look like:

```json
{ "success": false, "error": "Human-readable message", "code": "OPTIONAL_CODE" }
```

Rate-limited responses use a different shape:

```json
{ "error": "rate_limit_exceeded", "message": "Too many login attempts… (12 minutes remaining)", "retryAfter": 720 }
```

### Status codes and error codes

| Status | `code` | Meaning |
|--------|--------|---------|
| 400 | — | Validation failed (`error` explains) |
| 401 | — | Missing, invalid, or expired session; wrong PIN on login |
| 403 | `MUST_SET_PIN` | Login refused: invited user must set a PIN first (`POST /auth/setup-pin`) |
| 403 | `DEMO_READ_ONLY` | Write attempted in a demo shop |
| 403 | — | Admin-only route called by a member, or shop disabled |
| 409 | — | Conflict: username taken, oversell, etc. |
| 409 | `INSUFFICIENT_CASH` | Expense larger than recorded till cash; body adds `cashAvailable`, `amount`, `shortfall` |
| 429 | — | Rate limited (see shape above), or recovery/setup code locked |

### Rate limits (per IP)

| Group | Routes | Limit | Block |
|-------|--------|-------|-------|
| Auth | register, login, demo | 50 / 15 min | 30 min |
| Critical auth | recovery redeem, setup PIN | 10 / 5 min | 1 hour |

### Shared objects

`Shop`:

```json
{
  "id": "…", "username": "tinashop", "businessName": "Tina's Shop",
  "businessDescription": "General merchandise", "isActive": true,
  "isDemo": false, "demoSector": null,
  "settings": { "timezone": "Africa/Harare", "lowStockAlert": 5 },
  "lastLogin": "…", "createdAt": "…",
  "channels": { "telegramLinked": true, "whatsappLinked": false }
}
```

`User`:

```json
{
  "id": "…", "shopId": "…", "username": "tinashop", "displayName": "Tina",
  "role": "admin", "isActive": true, "mustSetPin": false,
  "lastLogin": "…", "createdAt": "…",
  "channels": { "telegramLinked": true, "whatsappLinked": false }
}
```

Sale item input (sales, laybye, orders, customer credit):

```json
{ "items": [
  { "name": "bread", "quantity": 2 },
  { "productId": "…", "variantId": "…", "packId": "…", "quantity": 1, "price": 3.0 }
] }
```

`customer` fields accept a name, phone, or id.

## Auth (public)

| Method | Path | Chat equivalent | Body / query |
|--------|------|-----------------|--------------|
| POST | `/auth/register` | `register tinasales "Name" 1234` | `{ username, businessName, pin, businessDescription? }` |
| POST | `/auth/login` | `login tinasales 1234` | `{ username, pin }` |
| GET | `/auth/username` | — | `?username=` live availability check |
| GET | `/auth/status` | `status` | `?username=` |
| POST | `/auth/recovery/redeem` | — | `{ username, code, newPin }` |
| POST | `/auth/setup-pin` | — | `{ username, setupCode, newPin }` |
| GET | `/auth/demos` | — | List demo sectors |
| POST | `/auth/demo` | — | `{ sector? }` opens a read-only demo session |

- **Register** returns `201 { token, shop, user, recoveryCodes: string[] }`. Recovery codes are shown once. A taken username returns `409` with optional `suggestions: string[]`.
- **Login** returns `{ token, shop, user }`. Wrong credentials return `401`. An invited user without a PIN gets `403 MUST_SET_PIN`.
- **Username check** returns `{ available, valid, username, message?, suggestions? }`. When a Bearer token is sent, the caller's own username counts as available.
- **Recovery redeem** returns `{ message, remaining, mustRegenerate }` and ends that user's sessions. Sign in again with the new PIN.
- **Setup PIN** returns `{ message }`. The user then logs in normally.

Username rules for new accounts: 3–15 lowercase letters, optional trailing digits, no reserved names. PIN: exactly 4 digits.

## Auth (session)

| Method | Path | Chat equivalent | Body | Role |
|--------|------|-----------------|------|------|
| POST | `/auth/logout` | `logout` (this session only) | — | any |
| GET | `/auth/me` | session check | — | any |
| GET | `/auth/profile` | `profile` / `account` | — | any |
| PATCH | `/auth/profile/username` | — | `{ username }` | any (own) |
| PATCH | `/auth/profile/display-name` | — | `{ displayName }` | any (own) |
| PATCH | `/auth/profile/pin` | `profile edit pin` | `{ oldPin, newPin }` | any (own) |
| PATCH | `/auth/profile/name` | `profile edit name` | `{ businessName }` | admin |
| PATCH | `/auth/profile/description` | `profile edit description` | `{ businessDescription }` | admin |
| PATCH | `/auth/profile/settings` | — | `{ timezone?, lowStockAlert? }` | admin |
| GET | `/auth/recovery` | — | → `{ hasCodes, remaining, lastIssuedAt }` | admin |
| POST | `/auth/recovery/regenerate` | — | → `{ recoveryCodes, remaining }` | admin |
| GET | `/auth/sessions` | — | → `{ sessions, total }` | any |
| POST | `/auth/sessions/revoke` | — | `{ sessionIds: [] }` or `{ revokeAll: true }` (never the current one) | any |
| GET | `/auth/security` | — | → `{ security: { summary, anomalies, riskLevel } }` | any |

`/auth/me` and the profile `PATCH` routes return the refreshed `{ shop, user }`. `timezone` must be an IANA name such as `Africa/Harare`.

## Team

| Method | Path | Body | Role |
|--------|------|------|------|
| GET | `/team` | → `{ members: User[] }` | any |
| POST | `/team` | `{ username, displayName, role?, pin? }` | admin |
| PATCH | `/team/:userId/role` | `{ role: "admin" \| "member" }` | admin |
| POST | `/team/:userId/setup-code` | — | admin |
| DELETE | `/team/:userId` | — | admin |

Adding a member without a `pin` returns a one-time `setupCode`. The member uses it with `POST /auth/setup-pin`. Until then, their login returns `403 MUST_SET_PIN`.

## Products

| Method | Path | Chat equivalent | Body |
|--------|------|-----------------|------|
| GET | `/products` | `list` | — |
| POST | `/products` | `add` | `{ name, price?, costPrice?, stock?, lowStockThreshold?, variants?: [...] }` |
| GET | `/products/low-stock` | `low stock` | → `{ products, items }` (`items`: per-variant alerts with `status: "low" \| "out"`) |
| GET | `/products/:id` | lookup by id or name | — |
| PATCH | `/products/:id` | `edit` / `price` / `threshold` / cost | `{ name?, price?, costPrice?, stock?, lowStockThreshold?, trackStock? }` |
| POST | `/products/:id/stock` | `stock` | `{ op: "+" \| "-" \| "=", quantity, variantId? }` |
| DELETE | `/products/:id` | `delete` | `{ confirm: true }` if the product has sales |
| POST | `/products/:id/variants` | — | `{ label?, baseUnit?, price, costPrice?, stock?, lowStockThreshold?, trackStock? }` |
| PATCH | `/products/:id/variants/:variantId` | — | same fields, all optional |
| DELETE | `/products/:id/variants/:variantId` | — | — |
| POST | `/products/:id/variants/:variantId/packs` | — | `{ label, unitsPerPack, price, costPrice? }` |
| PATCH | `/products/:id/variants/:variantId/packs/:packId` | — | same fields, all optional |
| DELETE | `/products/:id/variants/:variantId/packs/:packId` | — | — |

Variant and pack routes return the full updated `product`. See [docs/design-product-variants-packs.md](../../docs/design-product-variants-packs.md).

## Sales

| Method | Path | Chat equivalent | Body / query |
|--------|------|-----------------|--------------|
| POST | `/sales/cash` | `sell` | `{ items }` |
| POST | `/sales/credit` | `credit sale` | `{ customer, items, dueDate }` → adds `customerBalance` |
| POST | `/sales/to-customer` | `sell to` | `{ customer, items }` |
| GET | `/sales/recent` | `cancel` (list) | `?limit=` |
| POST | `/sales/cancel/last` | `cancel last` | `{ reason? }` |
| POST | `/sales/:id/cancel` | `cancel sale N` | `{ reason? }` |
| GET | `/sales/refunds` | `cancel refunds` | `?days=` |
| GET | `/sales/credit-due` | — | → `{ date, summary: { overdue, due, tomorrow, upcoming }, items }` |

## Laybye

| Method | Path | Chat equivalent | Body / query |
|--------|------|-----------------|--------------|
| GET | `/laybye` | — | `?status=active\|completed\|cancelled\|all` |
| GET | `/laybye/alerts` | — | → `{ items }` with `status: overdue\|due\|tomorrow\|quiet` |
| POST | `/laybye` | `laybye` | `{ customer, items, deposit? }` |
| POST | `/laybye/pay` | `laybye pay` | `{ customer, amount }` |
| POST | `/laybye/complete` | `laybye complete` | `{ customer }` |

## Customers

| Method | Path | Chat equivalent | Body / query |
|--------|------|-----------------|--------------|
| GET | `/customers` | `customers` | `?filter=all\|active` |
| POST | `/customers` | `customer add` | `{ name, phone, email? }` |
| GET | `/customers/:id` | `customer John` | — |
| GET | `/customers/:id/history` | purchase history | `?limit=` |
| GET | `/customers/:id/credit-history` | `credit history` | — |
| POST | `/customers/:id/credit` | `credit` (ledger, no stock) | `{ items }` |
| POST | `/customers/:id/payment` | `payment` | `{ amount }` |

## Orders

| Method | Path | Chat equivalent | Body / query |
|--------|------|-----------------|--------------|
| GET | `/orders` | `orders` | `?status=all\|pending\|confirmed\|ready\|completed\|cancelled&limit=` |
| GET | `/orders/alerts` | — | → `{ items }` with `status: overdue\|due\|tomorrow\|stale` |
| POST | `/orders` | `order` | `{ customer, items, orderType?: "pickup"\|"delivery"\|"reservation", notes? }` |
| GET | `/orders/:id` | order details | id or last-4 |
| PATCH | `/orders/:id/status` | confirm / ready / complete / cancel | `{ status, notes? }` |

Completing an order records the matching sale.

## Expenses

| Method | Path | Chat equivalent | Body / query |
|--------|------|-----------------|--------------|
| POST | `/expenses` | `expense` | `{ amount, description, category?, kind?, paymentMethod?, receiptNumber?, allowOverspend? }` |
| GET | `/expenses` | `expenses` | `?period=daily\|weekly\|monthly` or `?days=` |
| GET | `/expenses/breakdown` | `expense breakdown` | `?period=` |
| GET | `/expenses/cash-available` | — | → `{ cashAvailable, breakdown }` |

`kind` is `operating_expense` (default) or `inventory_fund_transfer`. If an expense exceeds `cashAvailable`, the API returns `409 INSUFFICIENT_CASH`. Retry with `allowOverspend: true` to record the difference as an owner cash-in.

## Reports

| Method | Path | Chat equivalent | Query |
|--------|------|-----------------|-------|
| GET | `/reports/daily` | `daily` | — |
| GET | `/reports/weekly` | `weekly` | — |
| GET | `/reports/monthly` | `monthly` | `?month=YYYY-MM` |
| GET | `/reports/best-sellers` | `best` | `?days=7` |
| GET | `/reports/profit` | `profit` | `?period=daily\|weekly\|monthly` |
| GET | `/reports/export` | `export` / `pdf` | `?type=daily\|weekly\|monthly&month=&download=1` |

`/reports/export` streams `application/pdf` with a `Content-Disposition` filename. On failure, it returns JSON.

## Stats / analytics

Dashboard-oriented aggregates (not chat commands). Query: `?days=30&limit=10`.

| Method | Path | What you get |
|--------|------|--------------|
| GET | `/stats` | Overview: today/week/month snapshots, most purchased, slowest, best client, debtors, peaks |
| GET | `/stats/products` | Most purchased, top revenue, slowest, never sold, best/worst margin |
| GET | `/stats/customers` | Best clients (spend), most frequent, period leaders, debtors, inactive |
| GET | `/stats/sales` | Avg ticket, mix by type, by hour/weekday, peak hour/day, cancellations |
| GET | `/stats/inventory` | Stock value, low/out of stock, overstocked |

## Chat & activity

| Method | Path | Notes |
|--------|------|-------|
| POST | `/chat` | `{ "message": "daily" }` → `{ message, reply }` bubbles; same command engine as Telegram/WhatsApp |
| GET | `/chat/history` | `?limit=120` → `{ messages, demoFeed }` |
| GET | `/activity` | `?limit=&channel=web\|telegram\|whatsapp&action=&mine=1&actorId=&before=` → `{ items }` |

In demo shops, `/chat` runs only read-only commands.

## Notifications read state

Per-user list of notification keys already seen, synced across devices.

| Method | Path | Body | Role |
|--------|------|------|------|
| GET | `/notifications/read-state` | → `{ seenKeys, lastUpdated, count }` | any |
| POST | `/notifications/read-state` | `{ seenKeys, merge?, source?: "web"\|"mobile"\|"migration" }` | any |
| POST | `/notifications/read-state/add` | `{ keys }` (always merges) | any |
| POST | `/notifications/read-state/migrate` | `{ localStorageKeys }` | any |
| DELETE | `/notifications/read-state` | — | any |
| GET | `/notifications/stats` | → `{ stats }` | admin |

The notification items themselves come from `/products/low-stock`, `/orders/alerts`, `/laybye/alerts`, and `/sales/credit-due`.

## Help

`GET /help` — endpoint catalog + stripped chat help text.

```bash
curl -s "http://localhost:3000/api/v1/stats?days=30&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

## Notes

- CORS defaults to `Access-Control-Allow-Origin: *` (override with `CORS_ORIGIN`). Native clients are not subject to CORS.
- Progressive multi-step chat registration is not exposed; use one-shot `POST /auth/register`.
- On Render's free tier the first request after ~15 idle minutes can take 10–30 s while the service wakes; clients should use generous timeouts.
