# Phase 2 Auth & Security Checklist

## Prerequisites

- [ ] `TELEGRAM_WEBHOOK_SECRET` set in production (and in `.env` if testing webhook mode)
- [ ] MongoDB reachable (sessions use `authsessions` collection + TTL)
- [ ] Public `POST /webhook/telegram/set-webhook` is gone

## Persist sessions

| # | Action | Expected |
|---|--------|----------|
| 1 | `login <pin>` then restart the Node process | Still authenticated — `status` / `list` work without re-login |
| 2 | `logout` then restart | Still logged out |
| 3 | Start `register`, kill process mid-flow, restart, send next answer | Registration session still present **or** timed out cleanly after 15m |

## Lockouts (DB)

| # | Action | Expected |
|---|--------|----------|
| 4 | Fail login 5 times with wrong PIN | Locked; Shop.loginAttempts / lockedUntil set in Mongo |
| 5 | Wait out lockout (or clear fields) then login correctly | Success; attempts reset to 0 |

## Webhook secret

| # | Action | Expected |
|---|--------|----------|
| 6 | `npm run deploy` (or `node scripts/setWebhook.js`) with secret set | Webhook registers with secret_token |
| 7 | POST `/webhook/telegram` **without** `X-Telegram-Bot-Api-Secret-Token` | **401** in production |
| 8 | POST with correct header | 200 / bot processes update |
| 9 | POST `/webhook/telegram/set-webhook` | **404** (route removed) |

## Pass criteria

- Restart does not wipe active logins
- Random POSTs without secret cannot drive the bot (production)
- Nobody can steal/repoint the webhook via a public HTTP route
- Lockouts survive process restart
