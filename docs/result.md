# result.md — Task Result

> Written by Claude Code (developer) after every completed task.
> ALWAYS overwritten — never appended.
> One result per session. Previous results are replaced.
> Read by the planner to validate progress and decide the next step.

---

## Task
TASK-004 — Income + expense endpoints (waterfall logic)

## Status
COMPLETED

## What was done
Ported all write operations from terminal's `core.py` to FastAPI endpoints: income distribution (percentage-based split from DB), expense processing (waterfall logic with breach tracking), flush leftovers, balance sync, and NBU rate fetching. All 6 endpoints registered under `/finance` prefix.

## Files created / modified
- `backend/schemas/finance.py` — created: IncomeRequest, ExpenseRequest, SyncRequest, BalancesResponse, ExpenseResponse, FlushResponse, RateResponse
- `backend/routers/finance.py` — created: 6 endpoints (rate, balances, income, expense, flush, sync) with full waterfall logic
- `backend/main.py` — modified: imports and mounts finance router with prefix /finance

## Endpoints implemented
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /finance/rate?currency=USD | No | Live NBU exchange rate |
| GET | /finance/balances | Yes | All 4 envelope balances |
| POST | /finance/income | Yes | Distribute income across envelopes by percentage |
| POST | /finance/expense | Yes | Waterfall deduction with breach tracking |
| POST | /finance/flush | Yes | Move mandatory + non_mandatory → dreams |
| POST | /finance/sync | Yes | Proportional balance adjustment to target total |

## Verification
```bash
.venv/bin/python -c "from backend.routers.finance import router; print('finance router OK')"
# → finance router OK

.venv/bin/python -c "from backend.schemas.finance import IncomeRequest, ExpenseRequest, SyncRequest, BalancesResponse, ExpenseResponse, FlushResponse, RateResponse; print('finance schemas OK')"
# → finance schemas OK

.venv/bin/python -c "from backend.main import app; print([r.path for r in app.routes])"
# → ['/openapi.json', '/docs', '/docs/oauth2-redirect', '/redoc', '/auth/register', '/auth/login', '/auth/me', '/finance/rate', '/finance/balances', '/finance/income', '/finance/expense', '/finance/flush', '/finance/sync', '/health']
```

All imports work without a running database. All 6 finance routes registered correctly.

## Issues / Notes
- NBU rate fetching uses `urllib.request` (stdlib) — matches core.py exactly, no extra dependency needed.
- Waterfall logic faithfully ports core.py lines 67–133: home envelope first, then mandatory → non_mandatory → investments → dreams. Dreams is the final buffer (can go negative).
- Income distribution uses envelope percentages from the database (not hardcoded), so percentage changes in DB are reflected automatically.
- FX conversion on income/expense uses live NBU rates, returns 502 if API fails.
- Live endpoint testing requires a running PostgreSQL — not tested locally.

## Changelog entry
- **TASK-004:** Income and expense endpoints with waterfall logic — 6 endpoints (rate, balances, income, expense, flush, sync), breach tracking, FX conversion via NBU API
