# ChartShop

Business management for SMEs — **Telegram & WhatsApp chat POS** plus a **web dashboard**. One shop account. Same login everywhere.

Register once with a **username** and **4-digit PIN**, then use those credentials on web, Telegram, and WhatsApp. All three surfaces share the same products, sales, customers, orders, expenses, and reports.

| Docs | Location |
|------|----------|
| **This file** | Product overview, architecture, local + production, chat commands |
| **Backend** | [backend/README.md](./backend/README.md) — API, bots, Render, env vars |
| **Frontend** | [frontend/README.md](./frontend/README.md) — Vite app, Vercel, routes |
| **REST API** | [backend/scripts/WEB_API_V1.md](./backend/scripts/WEB_API_V1.md) |

---

## Production URLs

| Surface | Host | URL |
|---------|------|-----|
| **Web app** | Vercel | https://chart-shop.vercel.app |
| **API / bots** | Render | https://chartshop.onrender.com |
| **API base** | Render | https://chartshop.onrender.com/api/v1 |
| **Health** | Render | https://chartshop.onrender.com/health |
| **Telegram bot** | Telegram | [@CHART_SHOP_Bot](https://t.me/CHART_SHOP_Bot) |
| **Database** | MongoDB Atlas | (private — `MONGODB_URI` on Render) |
| **Source** | GitHub | https://github.com/Makhosetive7/chartShop |

Quick checks:

```bash
curl -s https://chartshop.onrender.com/health
# open https://chart-shop.vercel.app/
```

---

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│  Web (Vercel)       │     │  Telegram / WhatsApp │
│  chart-shop.vercel  │     │  @CHART_SHOP_Bot     │
│  React + Vite SPA   │     │  chat commands       │
└──────────┬──────────┘     └──────────┬──────────┘
           │  HTTPS REST               │  webhooks
           │  Bearer token             │
           ▼                           ▼
┌──────────────────────────────────────────────────┐
│  Backend (Render)                                │
│  chartshop.onrender.com                          │
│  Express: /api/v1  /webhook/telegram  /whatsapp  │
│  Domain services + command engine                │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  MongoDB Atlas  │
              │  shops, sales…  │
              └─────────────────┘
```

**One process, three entry points**

| Entry | Path | Consumer |
|-------|------|----------|
| REST API | `/api/v1/*` | Web dashboard |
| Telegram webhook | `/webhook/telegram` | Telegram Bot API |
| WhatsApp webhook | `/webhook/whatsapp` | Meta Cloud API (optional) |

All three call the same domain services and MongoDB models. Web auth uses Bearer tokens; chat channels bind a Telegram chat id or WhatsApp phone to the shop after the first successful `login <username> <pin>`.

### Monorepo layout

```
chartShop/
  package.json          # convenience scripts for both apps
  README.md             # you are here
  backend/              # Express API + Telegram/WhatsApp  →  Render
  frontend/             # Vite + React + TypeScript        →  Vercel
```

| Package | Stack | Deploy |
|---------|-------|--------|
| `backend/` | Node 18+, Express, Mongoose, PDFKit | Render (`npm start`, health `/health`) |
| `frontend/` | React 19, Vite 8, TypeScript, TanStack Query | Vercel (Root Directory `frontend`, output `dist`) |

Repo also contains `backend/railway.json` / `nixpacks.toml` for an optional Railway deploy. **Live production API is Render**, not Railway.

---

## Prerequisites

- **Node.js 18+** and npm
- **MongoDB** (Atlas free tier is fine)
- For bots: Telegram bot token from [@BotFather](https://t.me/BotFather); WhatsApp optional via Meta Cloud API
- Accounts: [Render](https://render.com), [Vercel](https://vercel.com), [MongoDB Atlas](https://www.mongodb.com/atlas) for production

---

## Local development

### Option A — from repo root

```bash
git clone git@github.com:Makhosetive7/chartShop.git
cd chartShop

# Backend
cp backend/.env.example backend/.env
# edit backend/.env — MONGODB_URI, TELEGRAM_BOT_TOKEN, PORT=3006, USE_POLLING=true, CORS_ORIGIN=http://localhost:5173
npm install --prefix backend

# Frontend
cp frontend/.env.example frontend/.env
# ensure VITE_API_PROXY_TARGET matches backend PORT (default in this project: 3006)
npm install --prefix frontend

# Two terminals
npm run dev:backend     # http://localhost:3006
npm run dev:frontend    # http://localhost:5173  (proxies /api → backend)
```

### Option B — each package

```bash
cd backend && cp .env.example .env && npm install && npm run dev
cd frontend && cp .env.example .env && npm install && npm run dev
```

### Local ports (keep these matched)

| Service | Default in this repo | Notes |
|---------|----------------------|-------|
| Backend API | **3006** (`backend/.env` `PORT`) | Code default is 3000 if unset |
| Frontend Vite | **5173** | Proxies `/api` → `VITE_API_PROXY_TARGET` |
| Proxy target | `http://127.0.0.1:3006` | Must equal backend `PORT` |

### Local env cheat sheet

**Backend** (`backend/.env`) — see also [backend/README.md](./backend/README.md):

```bash
MONGODB_URI=mongodb+srv://…
PORT=3006
NODE_ENV=development
USE_POLLING=true
CORS_ORIGIN=http://localhost:5173
TELEGRAM_BOT_TOKEN=…
TELEGRAM_WEBHOOK_SECRET=…
```

**Frontend** (`frontend/.env`) — see also [frontend/README.md](./frontend/README.md):

```bash
VITE_API_BASE_URL=/api/v1
VITE_API_PROXY_TARGET=http://127.0.0.1:3006
```

### Verify locally

```bash
curl -s http://localhost:3006/health
curl -s http://localhost:3006/api/v1/help   # may require auth for some routes

# Browser
open http://localhost:5173/register
```

Register with a username + PIN, then open `/app`. Message your Telegram bot with the same credentials when polling is on.

### Root npm scripts

| Script | What it runs |
|--------|----------------|
| `npm run dev:backend` | Backend nodemon |
| `npm run dev:frontend` | Vite |
| `npm run start:backend` | Backend `npm start` |
| `npm run build:frontend` | Frontend production build |
| `npm test` | Backend + frontend tests |
| `npm run test:backend` / `test:frontend` | One side |
| `npm run lint:frontend` / `format:frontend` | Frontend quality |

---

## Production deployment

### Current live stack

| Piece | Platform | Notes |
|-------|----------|-------|
| Frontend | **Vercel** | Root Directory = `frontend`, build `npm run build`, output `dist` |
| Backend | **Render** | Root Directory = `backend`, start `npm start`, health `/health` |
| DB | **MongoDB Atlas** | Connection string only on the server |
| Telegram | Webhook → Render | `WEBHOOK_URL=https://chartshop.onrender.com/webhook/telegram` |

### Frontend (Vercel)

1. Import the GitHub repo; set **Root Directory** to `frontend`.
2. Environment variable (Production):

   ```bash
   VITE_API_BASE_URL=https://chartshop.onrender.com/api/v1
   ```

3. Ensure `frontend/vercel.json` SPA rewrites are present (deep links / refresh).
4. Deploy → https://chart-shop.vercel.app

Details: [frontend/README.md](./frontend/README.md#production-deploy-vercel).

### Backend (Render)

1. New Web Service from the same repo; **Root Directory** = `backend`.
2. Build: `npm install` · Start: `npm start` · Health: `/health`.
3. Set production env (never commit secrets):

   ```bash
   NODE_ENV=production
   MONGODB_URI=…
   TELEGRAM_BOT_TOKEN=…
   TELEGRAM_WEBHOOK_SECRET=…
   WEBHOOK_URL=https://chartshop.onrender.com/webhook/telegram
   CORS_ORIGIN=https://chart-shop.vercel.app
   # Do not set USE_POLLING=true
   ```

4. Confirm https://chartshop.onrender.com/health returns `"status":"ok"`.

Details: [backend/README.md](./backend/README.md#production-deploy-render).

### After every prod change

1. Backend health + Telegram webhook still set  
2. Frontend can log in against Render  
3. CORS allows `https://chart-shop.vercel.app`  
4. Hard-load `/login` and `/app` on Vercel (SPA rewrite)

---

## Authentication (web · Telegram · WhatsApp)

| | |
|---|---|
| **Identity** | `username` + **4-digit PIN** |
| **Account** | One `Shop` document in MongoDB |
| **Channels** | Telegram chat id / WhatsApp phone are *linked metadata*, not separate logins |

### Username rules (new registrations)

- Lowercase letters; optional digits **only at the end**
- Length **3–15**
- No spaces, underscores, dots, or special characters
- Reserved: `admin`, `support`, `system`, `chartshop`
- Legacy usernames (e.g. with `_`, up to 32 chars) can still log in

### How to sign in

| Platform | Register | Login |
|----------|----------|-------|
| **Web** | `/register` | `/login` |
| **Telegram / WhatsApp** | `register tinashop "My Shop" 4829` or guided `register` | `login tinashop 4829` |
| **Linked chat only** | — | `login 4829` |

First successful `login <username> <pin>` on Telegram or WhatsApp **binds that chat** to the shop. You can stay logged in on web + Telegram + WhatsApp at once; `logout` ends only that channel’s session.

API example:

```bash
curl -s https://chartshop.onrender.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"tinashop","pin":"4829"}'
```

Migrating an older DB that used `telegramId` as the account key:

```bash
cd backend && node scripts/migrateUsernameAuth.js
```

---

## Why ChartShop?

- **Zero learning curve** — natural chat commands  
- **Mobile-first** — Telegram / WhatsApp on any phone  
- **Same account everywhere** — web + chat share one shop  
- **Real-time** — instant stock and sales updates  
- **Professional** — PDF reports for owners and accountants  
- **Open** — run it yourself locally or on free-tier hosting  

---

## Key features

### Core operations

| Feature | Description |
|---------|-------------|
| **Sales** | Cash, credit, custom prices, multi-item tickets |
| **Inventory** | Stock levels, thresholds, low-stock alerts |
| **Customers** | Profiles, purchase history, credit ledger |
| **Orders** | Pickup, delivery, reservation workflows |
| **Expenses** | Categorized costs + breakdowns |
| **Profit** | Revenue − expenses by day / week / month |
| **Laybye** | Deposit / pay / complete flows |
| **Reports** | Daily–monthly + PDF export |
| **In-app chat** | Same command language as Telegram inside `/app` |
| **Demo shops** | Read-only sector demos on the web |

### Web dashboard pages

Chat, dashboard, products, sales, customers, orders, expenses, reports, activity, settings — under `/app/*` after login.

---

## Getting started (as a shop owner)

### Web

1. Open https://chart-shop.vercel.app/register (or local `:5173/register`)
2. Choose username, shop name, 4-digit PIN  
3. Sign in at `/login` and work in `/app`

### Telegram

1. Open [@CHART_SHOP_Bot](https://t.me/CHART_SHOP_Bot)  
2. `register tinashop "My Shop Name" 4829`  
3. Add stock and sell:

```
add bread 2.50 stock 100
add milk 3.20 stock 50 threshold 10
sell 2 bread 1 milk
```

Use the **same** username + PIN on WhatsApp or web for the same books.

---

## Complete command reference

### Product management

| Command | Description | Example |
|---------|-------------|---------|
| `add [product] [price] stock [qty]` | Add product | `add bread 2.50 stock 100` |
| `price [product] [new-price]` | Update price | `price bread 2.75` |
| `stock [product] [qty]` | Set stock | `stock bread 80` |
| `stock +[product] [qty]` | Add stock | `stock +milk 20` |
| `stock -[product] [qty]` | Remove stock | `stock -bread 5` |
| `edit [product] [field] [value]` | Edit field | `edit bread price 2.60` |
| `delete [product]` | Remove product | `delete bread` |
| `list` | List products | `list` |
| `low stock` | Below threshold | `low stock` |
| `threshold [product] [qty]` | Alert level | `threshold milk 10` |

### Sales & transactions

| Command | Description | Example |
|---------|-------------|---------|
| `sell [qty] [product]` | Sale | `sell 2 bread` |
| `sell [qty] [product] [price]` | Custom price | `sell 3 bread 2.25` |
| `sell 2 bread 1 milk` | Multi-item | `sell 2 bread 1 milk 3 eggs` |
| `cancel` | Recent sales | `cancel` |
| `cancel last [reason]` | Cancel last | `cancel last "wrong price"` |
| `cancel sale 2 [reason]` | Cancel by index | `cancel sale 2 "refund"` |
| `cancel refunds` | Refunds report | `cancel refunds` |

### Customer management

| Command | Description | Example |
|---------|-------------|---------|
| `customer add "Name" [phone]` | Add customer | `customer add "John Doe" 1234567890` |
| `customers` | List all | `customers` |
| `customers active` | Active (30 days) | `customers active` |
| `customer [name/phone]` | Profile | `customer John` |
| `sell to [customer] [items]` | Named sale | `sell to John 2 bread 1 milk` |
| `credit [customer] [amount]` | Add credit | `credit John 50.00` |
| `payment [customer] [amount]` | Record payment | `payment John 25.00` |
| `credit history [customer]` | Credit ledger | `credit history John` |

### Order management

| Command | Description | Example |
|---------|-------------|---------|
| `order [customer] [items]` | Pickup order | `order John 2 bread 1 milk` |
| `order … delivery` | Delivery | `order John 2 bread delivery` |
| `order … reservation` | Reservation | `order John cake reservation` |
| `orders` / `orders pending` / `orders ready` | Lists | `orders pending` |
| `order details [id]` | Details | `order details A1B2` |
| `confirm order [id]` | Confirm | `confirm order A1B2` |
| `ready order [id]` | Ready | `ready order A1B2` |
| `complete order [id]` | Complete | `complete order A1B2` |
| `cancel order [id] [reason]` | Cancel | `cancel order A1B2 "no stock"` |

### Expense tracking

| Command | Description | Example |
|---------|-------------|---------|
| `expense [amount] [description]` | Record | `expense 50.00 "supplier"` |
| `expense … [category] [payment] [receipt]` | Full | `expense 150.00 supplies cash INV123` |
| `expenses daily` / `weekly` / `monthly` | Period totals | `expenses daily` |
| `expenses breakdown` | By category | `expenses breakdown` |

### Reports & analytics

| Command | Description |
|---------|-------------|
| `daily` / `weekly` / `monthly` | Sales reports |
| `best` / `best month` | Top sellers |
| `profit daily` / `weekly` / `monthly` | Profit & loss |
| `export daily` / `weekly` / `monthly` / `best` | PDF exports (`pdf …` aliases) |

### Account

| Command | Description | Example |
|---------|-------------|---------|
| `register [username] "Shop" [pin]` | Create + link chat | `register tinashop "My Shop" 4829` |
| `register` | Guided setup | `register` |
| `login [username] [pin]` | Sign in + link | `login tinashop 4829` |
| `login [pin]` | PIN-only if linked | `login 4829` |
| `logout` | End this channel’s session | `logout` |
| `account` / `profile` | Account + linked channels | `account` |
| `status` | Registration / login status | `status` |
| `help` | Command guide | `help` |

---

## Real-world scenarios

### Daily shop ops

```
daily              # Yesterday / today pulse
low stock          # Restock list
orders pending     # Prep queue
sell 2 bread 1 milk
profit daily
export daily
```

### Customers & credit

```
customer add "Sarah Williams" 9876543210
sell to Sarah 2 bread 1 milk
credit Sarah 100.00
payment Sarah 50.00
credit history Sarah
```

### Inventory

```
list
low stock
stock bread 100
stock +milk 50
price milk 3.50
threshold bread 20
```

---

## Security

- Username + PIN across all channels  
- Channel linking on first chat login  
- Per-channel sessions (logout is local to that surface)  
- Session TTL and failed-PIN rate limiting  
- Recovery codes for account recovery (`/recover` on web)  
- PIN stored hashed (bcrypt); never returned by the API  

Do not commit `.env` files. Examples live in `backend/.env.example` and `frontend/.env.example`.

---

## Testing

```bash
npm test                 # both
npm run test:backend
npm run test:frontend
```

---

## Contributing

1. Fork / branch from `main`  
2. Use conventional, focused PRs (backend vs frontend when possible)  
3. Run relevant tests and lint before opening a PR  
4. Document env or deploy changes in the matching README  

```bash
git checkout -b feature/your-change
# …commit…
git push -u origin HEAD
# open PR on GitHub
```

---

## System requirements

| Audience | Need |
|----------|------|
| Shop owner | Browser and/or Telegram/WhatsApp + internet |
| Developer | Node 18+, MongoDB, npm |
| Production | Render + Vercel + Atlas (free tiers work for small shops) |

---

## Technologies

- [Node.js](https://nodejs.org/) / [Express](https://expressjs.com/) — API & bots  
- [MongoDB](https://www.mongodb.com/) / Mongoose — data  
- [Telegram Bot API](https://core.telegram.org/bots/api) — chat POS  
- [PDFKit](https://pdfkit.org/) — PDF reports  
- [Vite](https://vitejs.dev/) / [React](https://react.dev/) — web dashboard  
- [Render](https://render.com/) — API hosting  
- [Vercel](https://vercel.com/) — frontend hosting  

---

## Get started in three steps

1. **Register** on web or Telegram with username + PIN  
2. **Stock up** — `add bread 2.50 stock 100`  
3. **Sell anywhere** — same account on web, Telegram, or WhatsApp  

**Live:** [Web](https://chart-shop.vercel.app) · [API health](https://chartshop.onrender.com/health) · [Telegram](https://t.me/CHART_SHOP_Bot)
