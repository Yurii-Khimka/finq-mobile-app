# plan.md — Active Task

> Always contains ONE task only.
> Rewritten by the planner before every new implementation session.
> Optimised for AI clarity, not human documentation.

---

## Active Task

**TASK-005 — Read-only endpoints + remove transaction + categories + config**
Goal: port all remaining FinanceManager methods to API endpoints. This completes the backend API surface.

---

## Context

TASK-004 built the write operations (income, expense, flush, sync). This task adds everything else: history queries, analytics (stats, audit, sustainability, anomalies, advisor), impact simulation, transaction removal, category management, and user config.

After this task, the backend API is feature-complete for MVP. All terminal logic will be available over HTTP.

---

## What Must NOT Be Changed

- Do not modify `backend/core/core.py` — read-only reference
- Do not modify SQLAlchemy models from TASK-002
- Do not modify auth from TASK-003
- Do not modify existing endpoints in `backend/routers/finance.py` from TASK-004

---

## Read First

- `docs/session.md` — architecture decisions
- `docs/result.md` — TASK-004 result
- `backend/core/core.py` — **read the entire file**, especially:
  - `get_last_transactions()` (line 673)
  - `get_filtered_history()` (line 682)
  - `get_monthly_stats()` (line 144)
  - `get_audit_data()` (line 217)
  - `get_sustainability_forecast()` (line 326)
  - `get_anomaly_data()` (line 425)
  - `get_advisor_text()` (line 496)
  - `calculate_impact()` (line 547)
  - `remove_transaction()` (line 698)
  - `get_sorted_categories()` (line 756)
  - `load_config()` / `set_base_currency()` (line 772+)
- `backend/routers/finance.py` — existing endpoints (don't duplicate)
- `backend/models/` — all models

---

## Endpoints

All endpoints require `get_current_user` unless noted. Add to `backend/routers/finance.py` (same router, same prefix `/finance`).

### History

**1. `GET /finance/history?filter=all&limit=50`**
- `filter`: `"all"` (default), `"current"`, or month number like `"4"` or `"04"`
- `limit`: optional, limits number of returned rows (default: all)
- Matches `get_filtered_history()` + `get_last_transactions()` logic
- Query transactions table: filter by user_id, apply date filter, order by date DESC
- Return list of transaction objects

### Analytics

**2. `GET /finance/stats?filter=current`**
- Matches `get_monthly_stats()` exactly
- `filter`: `"current"` (default), `"all"`, or month number
- Returns per-envelope breakdown: `{envelope: {total, categories: {name: amount}}}`
- Must handle breach logic: home envelope gets `amount - breach_total`, breached envelopes get "Budget Breach" virtual entries
- Uses `amount_uah` from transactions (no string parsing needed — terminal parsed strings, we store decimals)

**3. `GET /finance/audit`**
- Matches `get_audit_data()` exactly
- Current month only
- Returns: `breach_count`, `breach_total_uah`, `breach_by_envelope`, `top_breaches` (top 5), `total_spent_uah`, `burn_rate_daily`, `days_remaining`, `days_to_zero`, `safe_daily_limit`, `spendable_balance`, `health_signal`
- `health_signal`: `"healthy"` / `"warning"` / `"critical"` (same logic as core.py lines 302–307)
- `days_to_zero`: use `null` instead of `Infinity` in JSON (JSON has no infinity)

**4. `GET /finance/sustainability`**
- Matches `get_sustainability_forecast()` exactly
- Per-pool (mandatory, non_mandatory) burn rates, days-to-zero, safe daily limits
- Returns all 12 fields from the terminal method
- `days_to_zero_*`: use `null` instead of `Infinity`

**5. `GET /finance/anomalies`**
- Matches `get_anomaly_data()` exactly
- Last 7 days vs 90-day average, per category
- Noise filter: skip categories with < 50 UAH in last 7 days
- Threshold: ratio > 1.5
- Return top 5 sorted by ratio DESC

**6. `GET /finance/advisor`**
- Matches `get_advisor_text()` exactly
- Calls audit + anomalies internally, generates advisory text
- Returns `{"text": "Your finances are on track..."}`

**7. `POST /finance/impact`**
- Matches `calculate_impact()` exactly
- Request body: `{"amount": 5000.00, "category": "Rent"}`
- Read-only simulation — does NOT write anything
- Returns: `amount`, `category`, `spendable_before`, `spendable_after`, `daily_limit_before`, `daily_limit_after`, `days_remaining`, `waterfall_triggered`, `risk_score`, `category_valid`
- `days_remaining` logic: only count if income arrived this month (check last INCOME transaction)

### Transaction Management

**8. `DELETE /finance/transactions/{transaction_id}`**
- Matches `remove_transaction()` exactly
- Reverses the balance effect:
  - EXPENSE with "OK" details: add amount back to home envelope
  - EXPENSE with breach: add breach amounts back to breached envelopes, remainder to home
  - INCOME: subtract `amount * percentage` from each envelope
- Delete the transaction row
- Return updated balances
- Return 404 if not found

### Categories

**9. `GET /finance/categories`**
- Matches `get_sorted_categories()`
- Returns categories sorted by envelope priority: mandatory(1) → non_mandatory(2) → investments(3) → dreams(4), then alphabetically within each group
- Returns list of `{name, envelope_name}`

**10. `POST /finance/categories`**
- Create a new category
- Request body: `{"name": "Groceries", "envelope_name": "mandatory"}`
- Validate envelope_name is one of the 4 valid names
- Return 409 if category name already exists for this user

**11. `DELETE /finance/categories/{category_name}`**
- Delete a category
- Return 404 if not found

### Config

**12. `GET /finance/config`**
- Returns user config: `{"base_currency": "UAH"}`

**13. `PUT /finance/config`**
- Matches `set_base_currency()` logic
- Request body: `{"base_currency": "USD"}`
- Validate: only `"UAH"`, `"USD"`, `"EUR"` allowed
- Return 400 if invalid

---

## Schemas

Add to `backend/schemas/finance.py`:

- `TransactionResponse` — `id, date, type, category, amount_uah, original_amount, original_currency, envelope, details`
- `StatsEnvelope` — `total: float`, `categories: dict[str, float]`
- `StatsResponse` — `mandatory, non_mandatory, investments, dreams` (each `StatsEnvelope`)
- `AuditResponse` — all fields from `get_audit_data()`, with `days_to_zero: float | None`
- `SustainabilityResponse` — all 12 fields, with nullable days_to_zero fields
- `AnomalyItem` — `category, last_7d, avg_7d, ratio`
- `AdvisorResponse` — `text: str`
- `ImpactRequest` — `amount: float`, `category: str | None`
- `ImpactResponse` — all fields from `calculate_impact()`
- `CategoryRequest` — `name: str`, `envelope_name: str`
- `CategoryResponse` — `name: str`, `envelope_name: str`
- `ConfigRequest` — `base_currency: str`
- `ConfigResponse` — `base_currency: str`

---

## Verify

All imports must work without a database.
With a database, all 13 endpoints must return correct responses.

---

## Git

Branch: `feat/task-005-read-endpoints`
Commit message: `feat(backend): history, analytics, categories, and config endpoints (#005)`

---

## Result

After completing this task, write the result to `docs/result.md` (overwrite completely).
