# ChartShop Frontend

Vite + React + TypeScript web dashboard for ChartShop.

Uses the same **username + PIN** as Telegram and WhatsApp. Sign up at `/register`, sign in at `/login`. The API expects `{ username, pin }` on `/api/v1/auth/*` (see root README and `backend/scripts/WEB_API_V1.md`).

## Stack

- Vite, React 19, TypeScript
- styled-components + polished
- React Router, TanStack Query, Axios
- lucide-react, Framer Motion, Radix UI
- date-fns
- ESLint + Prettier (+ oxlint)
- Vitest + React Testing Library

## Develop

From repo root:

```bash
npm run dev:backend   # API on :3000
npm run dev:frontend  # UI on :5173 (proxies /api → :3000)
```

Or inside this folder:

```bash
cp .env.example .env
npm install
npm run dev
```

## Scripts

| Script           | Purpose          |
| ---------------- | ---------------- |
| `npm run dev`    | Vite dev server  |
| `npm run build`  | Production build |
| `npm run test`   | Vitest           |
| `npm run lint`   | ESLint + oxlint  |
| `npm run format` | Prettier         |
