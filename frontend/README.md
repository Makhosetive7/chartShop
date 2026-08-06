# ChartShop Frontend

Vite + React + TypeScript web app for ChartShop: marketing site, auth, and shop dashboard. Uses the **same username + PIN** as Telegram and WhatsApp, talking to the backend REST API at `/api/v1`.

> Product overview and chat commands: [root README](../README.md)  
> API server setup: [backend README](../backend/README.md)  
> REST catalog: [backend/scripts/WEB_API_V1.md](../backend/scripts/WEB_API_V1.md)

---

## Production

| | |
|---|---|
| **Host** | [Vercel](https://vercel.com) |
| **Public URL** | https://chart-shop.vercel.app |
| **API it calls** | https://chartshop.onrender.com/api/v1 |
| **SPA rewrites** | `vercel.json` → all routes to `index.html` |

Open:

- Home: https://chart-shop.vercel.app/
- Login: https://chart-shop.vercel.app/login
- Register: https://chart-shop.vercel.app/register
- Recover: https://chart-shop.vercel.app/recover
- App (after login): https://chart-shop.vercel.app/app

The production build bakes in `VITE_API_BASE_URL=https://chartshop.onrender.com/api/v1` at build time. Changing the API host requires a rebuild/redeploy on Vercel.

---

## Stack

| Layer | Choice |
|-------|--------|
| Build | Vite 8 |
| UI | React 19 + TypeScript |
| Styling | styled-components + polished |
| Routing | React Router 7 |
| Data | TanStack Query + Axios |
| Motion / icons | Framer Motion, lucide-react |
| Primitives | Radix UI |
| Dates | date-fns |
| Quality | ESLint, oxlint, Prettier |
| Tests | Vitest + React Testing Library + jsdom |

---

## App structure

```
frontend/
  index.html
  vite.config.ts          # dev server :5173, /api → backend proxy
  vercel.json             # SPA fallback rewrites
  public/                 # favicon, static assets
  src/
    main.tsx
    App.tsx               # routes
    api/                  # Axios client + resource modules
    auth/                 # AuthContext, token in localStorage
    pages/                # route screens
    components/           # layout, marketing, UI, demo, charts
    routes/               # ProtectedRoute
    styles/               # theme + GlobalStyles
    hooks/, utils/, constants/, test/
```

### Routes

| Path | Access | Screen |
|------|--------|--------|
| `/` | Public | Marketing home |
| `/login` | Public | Username + PIN |
| `/register` | Public | Create shop |
| `/recover` | Public | Recovery codes |
| `/app` | Auth | In-app chat (default) |
| `/app/dashboard` | Auth | Stats overview |
| `/app/products` | Auth | Inventory |
| `/app/sales` | Auth | Sales |
| `/app/customers` | Auth | Customers |
| `/app/orders` | Auth | Orders |
| `/app/expenses` | Auth | Expenses |
| `/app/reports` | Auth | Reports / PDF |
| `/app/activity` | Auth | Activity feed |
| `/app/settings` | Auth | Profile / PIN / recovery |

Auth token is stored as `chartshop_token` (and shop snapshot as `chartshop_shop`) in `localStorage`. Axios attaches `Authorization: Bearer …`. A `401` clears storage and sends the user to `/login`.

---

## Prerequisites

- Node.js **18+**
- npm
- Backend running locally for full local demos (see [backend README](../backend/README.md)), **or** a reachable remote API URL

---

## Local setup

### 1. Install & env

```bash
cd frontend
cp .env.example .env
npm install
```

### 2. Environment variables

| Variable | Local default | Purpose |
|----------|---------------|---------|
| `VITE_API_BASE_URL` | `/api/v1` | Axios base URL (relative → same origin, proxied in dev) |
| `VITE_API_PROXY_TARGET` | `http://127.0.0.1:3006` | Vite proxy target for `/api/*` |

Example `.env` for local work (must match backend `PORT`):

```bash
VITE_API_BASE_URL=/api/v1
VITE_API_PROXY_TARGET=http://127.0.0.1:3006
```

**How local API calls work**

1. Browser calls `http://localhost:5173/api/v1/...`
2. Vite proxies `/api` → `VITE_API_PROXY_TARGET` (backend)
3. No CORS pain as long as the proxy target is correct

To hit **production API from a local UI** (rare; not for day-to-day demos):

```bash
VITE_API_BASE_URL=https://chartshop.onrender.com/api/v1
# Proxy unused when base URL is absolute
```

Only `VITE_*` vars are exposed to client code. Never put secrets here.

### 3. Run backend + frontend

From repo root (recommended):

```bash
npm run dev:backend    # API — ensure PORT matches proxy (3006)
npm run dev:frontend   # http://localhost:5173
```

Or from this folder alone (backend already running):

```bash
npm run dev
```

Open http://localhost:5173 — register at `/register`, then use `/app`.

---

## npm scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server (port **5173**) |
| `npm run build` | `tsc -b` + production bundle → `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm test` | Vitest once |
| `npm run test:watch` | Vitest watch |
| `npm run lint` | ESLint + oxlint |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check |

Path alias: `@/` → `src/` (configured in `vite.config.ts` / tsconfig).

---

## Talking to the API

Client: `src/api/client.ts`

```ts
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
```

Modules under `src/api/` wrap auth, products, sales, customers, orders, expenses, reports, stats, chat, and activity. Auth bodies use `{ username, pin }` — same as Telegram/WhatsApp.

Demo shops: `POST /api/v1/auth/demo` (read-only writes return `403` + `DEMO_READ_ONLY`; UI opens an upgrade prompt).

---

## Production deploy (Vercel)

### Project settings

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Framework** | Vite |
| **Build command** | `npm run build` |
| **Output directory** | `dist` |
| **Install command** | `npm install` |

### Environment variables (Vercel → Production)

```bash
VITE_API_BASE_URL=https://chartshop.onrender.com/api/v1
```

`VITE_API_PROXY_TARGET` is **not** needed on Vercel (no Vite proxy in production).

### SPA routing

`vercel.json` rewrites every path to `/index.html` so deep links (`/login`, `/app/dashboard`, refresh) work. Without this, Vercel returns platform `404: NOT_FOUND` on client routes.

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### CORS on the API

Backend production must allow the Vercel origin:

```bash
CORS_ORIGIN=https://chart-shop.vercel.app
```

(or `*` if you intentionally leave CORS open).

### Deploy checklist

1. Push to the branch Vercel watches (usually `main`)
2. Confirm build succeeds and `VITE_API_BASE_URL` is set for Production
3. Open https://chart-shop.vercel.app/login — ChartShop UI, not a Vercel 404
4. Log in against live API; Network tab should show calls to `chartshop.onrender.com`
5. Hard-refresh `/app/dashboard` — still loads

### Preview vs production

Vercel Preview deployments get their own URLs. Set `VITE_API_BASE_URL` for Preview as well if you want previews to hit Render (or a staging API).

---

## Building locally like production

```bash
cd frontend
VITE_API_BASE_URL=https://chartshop.onrender.com/api/v1 npm run build
npm run preview
```

---

## Testing & quality

```bash
npm test
npm run lint
npm run format:check
```

Vitest setup: `src/test/setup.ts`. Prefer component tests near features under `src/`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ECONNREFUSED` / proxy errors | Start backend; match `PORT` and `VITE_API_PROXY_TARGET` |
| Login works locally but not on Vercel | Production env missing `VITE_API_BASE_URL`, or stale deploy |
| `/login` is Vercel 404 | Ensure `vercel.json` is deployed; Root Directory = `frontend` |
| CORS errors in browser to Render | Set backend `CORS_ORIGIN` to `https://chart-shop.vercel.app` |
| Instant redirect to `/login` | Token expired/invalid; clear `localStorage` or log in again |
| Wrong API host after env change | Vite inlines env at **build** time — rebuild/redeploy |

---

## Related docs

- [Root README](../README.md) — full product + architecture
- [Backend README](../backend/README.md) — API, bots, Render
- [WEB_API_V1.md](../backend/scripts/WEB_API_V1.md) — endpoint reference
