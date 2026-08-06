# ChartShop Backend

Express API, Telegram bot, and WhatsApp webhook handlers for ChartShop. One Node process serves HTTP REST (`/api/v1`), Telegram (`/webhook/telegram`), and WhatsApp (`/webhook/whatsapp`), all against the same MongoDB shop data.

> Product overview, chat commands, and monorepo quick start: see the [root README](../README.md).  
> Full REST route catalog: [scripts/WEB_API_V1.md](./scripts/WEB_API_V1.md).

---

## Production

| | |
|---|---|
| **Host** | [Render](https://render.com) (Node web service) |
| **Public URL** | https://chartshop.onrender.com |
| **Health** | https://chartshop.onrender.com/health |
| **API base** | https://chartshop.onrender.com/api/v1 |
| **Telegram webhook** | `POST https://chartshop.onrender.com/webhook/telegram` |
| **WhatsApp webhook** | `GET/POST https://chartshop.onrender.com/webhook/whatsapp` |
| **Database** | MongoDB Atlas (`MONGODB_URI`) |
| **Mode** | Webhook (`USE_POLLING` unset / `false`) |

Quick check:

```bash
curl -s https://chartshop.onrender.com/health
# {"status":"ok","service":"ChatShop","environment":"production","mode":"webhook",...}
```

The repo also includes `railway.json` and `nixpacks.toml` for an optional Railway deploy. Current live production is **Render**, not Railway.

---

## What this service does

| Surface | Path / transport | Role |
|---------|------------------|------|
| **Web API** | `/api/v1/*` | JSON REST for the Vite dashboard (Bearer token) |
| **Telegram** | Bot API → webhook or local polling | Chat POS commands |
| **WhatsApp** | Meta Cloud API webhooks | Same command engine (optional) |
| **Shared domain** | `services/*` + Mongo models | Products, sales, customers, orders, expenses, reports, auth |

Identity is always **username + 4-digit PIN** on a single `Shop` document. Telegram chat IDs and WhatsApp phone numbers are linked channel metadata, not separate accounts.

---

## Stack

- **Runtime:** Node.js 18+ (ES modules, `"type": "module"`)
- **HTTP:** Express 4
- **DB:** MongoDB via Mongoose 7
- **Auth:** bcryptjs PIN hashes + `AuthSession` Bearer tokens
- **Telegram:** axios / Telegraf helpers + webhook or long-polling
- **WhatsApp:** Meta Cloud API (optional; `WHATSAPP_ENABLED=true`)
- **PDFs:** PDFKit
- **Config:** dotenv (`.env` / platform env vars)
- **Tests:** Node built-in test runner (`node --test`)

---

## Architecture

```
backend/
  server.js              # listen, DB connect, polling vs webhook
  app.js                 # Express app factory (routes, CORS, health)
  adapters/              # Telegram / WhatsApp → inbound message shape
  config/                # database.js
  constants/
  controllers/           # telegram, whatsapp, api/*
  middleware/            # requireApiAuth
  models/                # Shop, Product, Sale, Customer, Order, …
  routes/
    telegram.js
    whatsapp.js
    api/v1.js            # REST mount
  services/              # domain logic + commandService + telegramService
  scripts/               # migrations, seeds, webhooks, API docs
  tests/
  utils/                 # username policy, helpers
  reports/               # generated PDF output (runtime)
  logs/                  # runtime logs dir
```

### Request flow (simplified)

```
Web (Vercel) ──Bearer──► /api/v1/* ──► controllers/api ──► services ──► MongoDB
Telegram ────webhook──► /webhook/telegram ──► adapters ──► commandService ──► same services
WhatsApp ────webhook──► /webhook/whatsapp ──► adapters ──► commandService ──► same services
```

### Key models

| Model | Purpose |
|-------|---------|
| `Shop` | Account: username, PIN hash, business profile, linked channels |
| `AuthSession` | Web/API Bearer sessions |
| `Product`, `Sale`, `Customer`, `Order`, `Expense`, `LayBye` | Shop operations |
| `ActivityLog` | Audit / chat history |
| `RecoveryCode` | Account recovery codes |

---

## Prerequisites

- Node.js **18+**
- npm
- A MongoDB database (local or [Atlas](https://www.mongodb.com/atlas) free tier)
- For Telegram locally: a bot token from [@BotFather](https://t.me/BotFather)
- For WhatsApp: Meta Cloud API credentials (optional)

---

## Local setup

### 1. Install

```bash
cd backend
cp .env.example .env
npm install
```

### 2. Configure `.env`

Minimum for local API + Telegram polling:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_SECRET=long_random_hex
MONGODB_URI=mongodb+srv://USER:PASS@CLUSTER/chartshop
PORT=3006
NODE_ENV=development
USE_POLLING=true
CORS_ORIGIN=http://localhost:5173
```

Notes:

- **`USE_POLLING=true`** — local Telegram without a public URL (no webhook). Production uses webhooks (`USE_POLLING` false/unset).
- **`PORT`** — this repo’s local frontend proxy expects **`3006`** (see `frontend/.env` → `VITE_API_PROXY_TARGET`). Keep them matched.
- **`CORS_ORIGIN`** — Vite origin in dev (`http://localhost:5173`). In production set to the Vercel origin, e.g. `https://chart-shop.vercel.app`, or `*` if you accept open CORS.
- Optional WhatsApp: set `WHATSAPP_ENABLED=true` plus Meta token / phone number id / verify token (see `.env.example`).

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | Mongo connection string |
| `PORT` | No | Default `3000` in code; local demo uses `3006` |
| `NODE_ENV` | No | `development` / `production` |
| `USE_POLLING` | Dev | `true` for local Telegram polling |
| `TELEGRAM_BOT_TOKEN` | For bots | BotFather token |
| `TELEGRAM_WEBHOOK_SECRET` | Prod webhook | Secret Telegram sends; verify on webhook |
| `WEBHOOK_URL` | Prod | Full Telegram webhook URL |
| `RAILWAY_STATIC_URL` | Alt | Host only; used to build webhook URL if `WEBHOOK_URL` unset |
| `CORS_ORIGIN` | Recommended | Allowed browser origin |
| `WHATSAPP_*` | Optional | Meta Cloud API |

### 3. Run

```bash
npm run dev          # nodemon, NODE_ENV=development
# or
npm start            # node server.js (uses .env as-is)
```

You should see:

- `MongoDB Connected: …`
- `Server running on port 3006` (or your `PORT`)
- `Health check: http://localhost:3006/health`
- `API: http://localhost:3006/api/v1`
- `Mode: POLLING (Development)` when `USE_POLLING=true`

### 4. Smoke-test

```bash
curl -s http://localhost:3006/health
curl -s http://localhost:3006/

# Register + login
curl -s http://localhost:3006/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"tinashop","businessName":"Tina Shop","pin":"4829"}'

curl -s http://localhost:3006/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"tinashop","pin":"4829"}'
```

Point the frontend at the same port (already wired via Vite proxy when `VITE_API_PROXY_TARGET` matches).

---

## npm scripts

| Script | Command purpose |
|--------|-----------------|
| `npm run dev` | Development with nodemon + `NODE_ENV=development` |
| `npm start` | Production-style start (`node server.js`) |
| `npm run start:dev` / `start:prod` | Explicit `NODE_ENV` |
| `npm run prod` | Nodemon under `NODE_ENV=production` |
| `npm test` | Run `tests/**/*.test.js` |
| `npm run deploy` | `node scripts/setWebhook.js` — register Telegram webhook |
| `npm run seed:boutique` | Seed boutique demo shop |
| `npm run seed:demos` | Seed sector demo shops |

---

## HTTP surface

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/` | Service info + endpoint map |
| `GET` | `/health` | Liveness (used by Render health checks) |
| `*` | `/api/v1/*` | REST API — see [WEB_API_V1.md](./scripts/WEB_API_V1.md) |
| `POST` | `/webhook/telegram` | Telegram updates |
| `GET`/`POST` | `/webhook/whatsapp` | Meta verify + inbound messages |

Auth for protected API routes:

```http
Authorization: Bearer <token>
```

Token comes from `POST /api/v1/auth/login` or `POST /api/v1/auth/register`.

---

## Telegram

### Local (polling)

1. Set `USE_POLLING=true` and a valid `TELEGRAM_BOT_TOKEN`.
2. Start the server — it deletes any existing webhook and long-polls `getUpdates`.
3. Message [@CHART_SHOP_Bot](https://t.me/CHART_SHOP_Bot) (or your own test bot).

```
register tinashop "My Shop" 4829
login tinashop 4829
add bread 2.50 stock 100
sell 2 bread
```

### Production (webhook)

1. Deploy so the service has a public HTTPS URL.
2. Set env:

```bash
NODE_ENV=production
USE_POLLING=false
WEBHOOK_URL=https://chartshop.onrender.com/webhook/telegram
TELEGRAM_BOT_TOKEN=…
TELEGRAM_WEBHOOK_SECRET=…
MONGODB_URI=…
CORS_ORIGIN=https://chart-shop.vercel.app
```

3. On boot, `server.js` calls `setWebhook`. You can also run:

```bash
npm run deploy   # scripts/setWebhook.js
```

Local tunnel alternative (ngrok, etc.):

```bash
ngrok http 3006
# set WEBHOOK_URL=https://xxxx.ngrok.io/webhook/telegram
# USE_POLLING=false
```

---

## WhatsApp (optional)

Disabled by default (`WHATSAPP_ENABLED=false`). When enabled:

1. Configure Meta Cloud API app + phone number.
2. Set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`.
3. Point Meta’s webhook callback to `https://<host>/webhook/whatsapp`.
4. Verify token must match `WHATSAPP_VERIFY_TOKEN`.

Same chat commands as Telegram after `login` / `register`.

---

## Production deploy (Render)

Current production host for this API is **Render**.

### Recommended service settings

| Setting | Value |
|---------|-------|
| **Root directory** | `backend` |
| **Runtime** | Node |
| **Build command** | `npm install` |
| **Start command** | `npm start` |
| **Health check path** | `/health` |

### Environment variables (Render dashboard)

Set at least:

- `NODE_ENV=production`
- `MONGODB_URI`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `WEBHOOK_URL=https://chartshop.onrender.com/webhook/telegram`
- `CORS_ORIGIN=https://chart-shop.vercel.app`
- Do **not** set `USE_POLLING=true` in production

Optional: WhatsApp vars, custom `PORT` (Render usually injects `PORT`).

### After deploy

1. `curl https://chartshop.onrender.com/health`
2. Confirm Telegram webhook (BotFather `/setwebhook` or `npm run deploy` with prod env)
3. Confirm the Vercel frontend’s `VITE_API_BASE_URL` points at `https://chartshop.onrender.com/api/v1`

### Alternate: Railway

`railway.json` uses Nixpacks, start `npm start`, healthcheck `/health`. If you move hosting back to Railway, set `WEBHOOK_URL` or `RAILWAY_STATIC_URL` accordingly and update the frontend `VITE_API_BASE_URL`.

---

## Database & migrations

- Connection: `config/database.js` (retries on failure).
- Legacy auth indexes are cleaned on connect via `utils/dropLegacyIndexes.js`.
- Username auth migration (older DBs keyed by Telegram id):

```bash
node scripts/migrateUsernameAuth.js
```

### Demo seeds

```bash
npm run seed:boutique   # needs .env with MONGODB_URI
npm run seed:demos
```

---

## Username & PIN policy (API)

New registrations (see `utils/usernamePolicy.js`):

- Lowercase letters; optional trailing digits only
- Length 3–15
- No underscores / dots / spaces
- Reserved: `admin`, `support`, `system`, `chartshop`
- PIN: 4 digits

Legacy usernames (underscores, up to 32 chars) can still log in.

---

## Testing

```bash
cd backend
npm test
```

Tests cover API auth, inventory, sales pricing, recovery codes, username policy, WhatsApp adapter, and more under `tests/`.

API contract reference and curl examples: [scripts/WEB_API_V1.md](./scripts/WEB_API_V1.md).

Phase / smoke checklists (ops): `scripts/PHASE*_CHECKLIST.md`, `scripts/SMOKE_CHECKLIST.md`.

---

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| `MONGODB_URI is not defined` | `.env` present; var name exact |
| Frontend CORS errors | `CORS_ORIGIN` matches `http://localhost:5173` (dev) or Vercel URL (prod) |
| Frontend 502 / proxy fail | Backend `PORT` ≠ `VITE_API_PROXY_TARGET` |
| Telegram silent locally | `USE_POLLING=true`, valid bot token, no competing webhook elsewhere |
| Telegram silent in prod | `WEBHOOK_URL` HTTPS reachable; secret matches; `USE_POLLING` not true |
| Health 404 on old Railway URL | Live API is Render — use `chartshop.onrender.com` |

---

## Related docs

- [Root project README](../README.md) — architecture, local monorepo, chat commands
- [Frontend README](../frontend/README.md) — Vite app + Vercel
- [WEB_API_V1.md](./scripts/WEB_API_V1.md) — REST endpoints
