# plan.md — Active Task

> Always contains ONE task only.
> Rewritten by the planner before every new implementation session.
> Optimised for AI clarity, not human documentation.

---

## Active Task

**TASK-004 — Income + expense endpoints (waterfall logic)**
Goal: port `add_income`, `add_expense`, `get_rate`, `flush_leftovers`, and `sync_balance` from terminal's `core.py` to FastAPI endpoints. These are the write operations that mutate envelope balances.

---

## Context

The terminal app's `FinanceManager` handles income distribution (50/30/10/10 split), expense processing (waterfall logic with breach tracking), FX conversion via NBU API, balance sync, and leftover flushing. This task ports all of those to HTTP endpoints backed by PostgreSQL.

The waterfall logic is the most critical part of finQ. It must behave identically to the terminal version. Read `backend/core/core.py` lines 67–133 carefully before implementing.

---

## What Must NOT Be Changed

- Do not modify `backend/core/core.py` — read-only reference
- Do not modify SQLAlchemy models from TASK-002
- Do not modify auth from TASK-003
- Do not build read-only endpoints (history, stats, audit) — that's TASK-005
- Do not add `remove_transaction` — that's TASK-005

---

## Read First

- `docs/session.md` — architecture decisions, envelope keys
- `docs/result.md` — TASK-003 result
- `backend/core/core.py` — **the source of truth for all logic** (read the entire file)
- `backend/models/envelope.py` — Envelope model (balance, percentage, name)
- `backend/models/transaction.py` — Transaction model (amount_uah, original_amount, original_currency, details)
- `backend/models/category.py` — Category model (name, envelope_name)
- `backend/auth.py` — `get_current_user` dependency

---

## Existing Models (for reference)

**Envelope:** `id, user_id, name, percentage, balance` — unique on `(user_id, name)`
**Transaction:** `id(varchar8), user_id, date, type, category, amount_uah, original_amount, original_currency, envelope, details`
**Category:** `id, user_id, name, envelope_name` — unique on `(user_id, name)`

---

## Endpoints

All endpoints require `get_current_user`. Create `backend/routers/finance.py`.

### 1. `GET /finance/rate?currency=USD`
- Fetches live NBU exchange rate
- Matches `core.py` `get_rate()` logic
- Returns `{"currency": "USD", "rate": 41.5}`
- Returns 502 if NBU API fails
- No auth required for this one (public endpoint)

### 2. `GET /finance/balances`
- Returns all 4 envelope balances for current user
- Returns `{"mandatory": 5000.00, "non_mandatory": 3000.00, "investments": 1000.00, "dreams": 1000.00}`

### 3. `POST /finance/income`
Request body:
```json
{
  "amount": 10000.00,
  "currency": "UAH",
  "original_amount": null
}
```
- If `currency` != "UAH": fetch rate via `get_rate`, convert to UAH. `original_amount` = the amount in original currency.
- Distribute UAH amount across envelopes using each envelope's `percentage` from the database (not hardcoded)
- Log transaction: `type="INCOME"`, `category="Total"`, `envelope="Distributed"`, `details="OK"`
- Store `original_amount` and `original_currency` in transaction if FX
- Return updated balances

### 4. `POST /finance/expense`
Request body:
```json
{
  "category": "Rent",
  "amount": 5000.00,
  "currency": "UAH"
}
```
**Waterfall logic (must match `core.py` exactly):**
1. Look up category → get `envelope_name` (home envelope)
2. If `currency` != "UAH": fetch rate, convert to UAH. Return 502 if rate fails.
3. Build hierarchy: home envelope first, then `mandatory → non_mandatory → investments → dreams` (skip home since it's already first)
4. Walk the hierarchy:
   - For each envelope (except `dreams`): take `min(balance, remaining)`
   - For `dreams` (final buffer): take all remaining (can go negative)
   - Track breach data: any amount taken from non-home envelopes
5. Update all envelope balances in DB
6. Log transaction: `type="EXPENSE"`, `category=<name>`, `envelope=<home>`, `details="OK"` or JSON breach data
7. Return updated balances + breach note (if any)

Return 404 if category not found.

### 5. `POST /finance/flush`
- Matches `core.py` `flush_leftovers()`
- Move `mandatory` + `non_mandatory` balances → `dreams`
- Set mandatory and non_mandatory to 0
- Return flushed total + updated balances

### 6. `POST /finance/sync`
Request body:
```json
{
  "target_total": 15000.00
}
```
- Matches `core.py` `sync_balance()`
- Calculate ratio = target_total / current_total
- Multiply each envelope balance by ratio
- Log transaction: `type="SYNC"`, `category="Adjustment"`, `envelope="Balance Sync"`, `details="OK"`
- Return updated balances
- If current total <= 0, return balances unchanged

---

## Schemas

Create `backend/schemas/finance.py`:

- `IncomeRequest` — `amount: float`, `currency: str = "UAH"`, `original_amount: float | None = None`
- `ExpenseRequest` — `category: str`, `amount: float`, `currency: str = "UAH"`
- `SyncRequest` — `target_total: float`
- `BalancesResponse` — `mandatory: float`, `non_mandatory: float`, `investments: float`, `dreams: float`
- `ExpenseResponse` — `balances: BalancesResponse`, `breach_note: str | None`
- `FlushResponse` — `flushed_total: float`, `balances: BalancesResponse`
- `RateResponse` — `currency: str`, `rate: float`

---

## Mount

In `backend/main.py`, include finance router with prefix `/finance`.

---

## Verify

All imports must work without a database.
With a database:
1. Register a user (creates envelopes with 0 balance)
2. `POST /finance/income` with 10000 UAH → balances: 5000/3000/1000/1000
3. `POST /finance/expense` with category + amount → waterfall deduction + breach tracking
4. `GET /finance/balances` → reflects mutations
5. `POST /finance/flush` → mandatory + non_mandatory → 0, dreams increases
6. `GET /finance/rate?currency=USD` → returns live rate

---

## Git

Branch: `feat/task-004-income-expense`
Commit message: `feat(backend): income and expense endpoints with waterfall logic (#004)`

---

## Result

After completing this task, write the result to `docs/result.md` (overwrite completely).
