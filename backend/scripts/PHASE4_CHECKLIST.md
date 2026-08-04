# Phase 4 Money-Core Tests Checklist

Golden-path tests only — enough to refactor without fear.

## Prerequisites

- [ ] MongoDB available (local Docker is fine)
- [ ] From repo root: `npm test`

```bash
docker run -d --rm --name chartshop-mongo-test -p 27017:27017 mongo:7
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/chartshop_phase4 npm test
docker stop chartshop-mongo-test
```

## Suite map

| File | Covers |
|------|--------|
| `tests/parseSaleItems.test.js` | Quoted names, custom price, multi-item |
| `tests/inventory.test.js` | Atomic deduct, oversell reject, compensate, restore |
| `tests/creditCancel.test.js` | Credit sale cancel restores stock + balance |
| `tests/dateBounds.test.js` | Harare vs UTC day windows (no DB) |
| `tests/authSession.test.js` | Login survives disconnect/reconnect |

## Pass criteria

- `npm test` exits 0
- Oversell cannot drive stock negative
- Credit cancel returns balance to pre-sale
- Harare midnight ≠ UTC midnight in assertions
- Auth still true after simulated restart

## Notes

- Date-bound tests need no Mongo; others need a reachable `TEST_MONGODB_URI` / `MONGODB_URI`.
- Standalone Mongo falls back when transactions are unsupported (same as production path).
