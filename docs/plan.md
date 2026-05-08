# plan.md — Active Task

> Always contains ONE task only.
> Rewritten by the planner before every new implementation session.
> Optimised for AI clarity, not human documentation.

---

## Active Task

**TASK-002 — PostgreSQL schema + SQLAlchemy models**
Goal: define the database schema that replaces `balances.json`, `categories.json`, `history.csv`, and `config.json`. Create SQLAlchemy models. No endpoints yet.

---

## Context

The terminal app stores all data in flat files (JSON + CSV). The mobile backend needs PostgreSQL instead. This task creates the SQLAlchemy models and an Alembic migration setup so that all future tasks can import models and query the database.

The schema must map 1:1 to the terminal data structures. No new fields, no new concepts. Just a relational version of what already exists.

---

## What Must NOT Be Changed

- Do not modify `backend/main.py` beyond importing/initialising the database
- Do not modify `backend/core/core.py` — it stays as a read-only reference
- Do not create any API endpoints yet
- Do not add authentication yet
- Do not add seed data or migration scripts for existing CSV/JSON — that comes in a later task

---

## Read First

- `docs/session.md` — architecture decisions
- `docs/result.md` — previous task result
- `backend/core/core.py` — the source of truth for all data structures (read carefully)

---

## Data Mapping (terminal → PostgreSQL)

### 1. users

Single user for MVP. Schema must support multi-user later (post-MVP).

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, default generated |
| email | VARCHAR(255) | unique, not null |
| password_hash | VARCHAR(255) | not null |
| created_at | TIMESTAMP | default now |

### 2. envelopes (replaces balances.json)

One row per envelope per user. Exactly 4 rows per user.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id |
| name | VARCHAR(50) | `mandatory`, `non_mandatory`, `investments`, `dreams` |
| percentage | DECIMAL(5,2) | 50, 30, 10, 10 — the split rule |
| balance | DECIMAL(12,2) | current balance in UAH |

Unique constraint: `(user_id, name)`

### 3. categories (replaces categories.json)

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id |
| name | VARCHAR(100) | e.g. "Rent", "Coffee" |
| envelope_name | VARCHAR(50) | FK-like reference to envelope name |

Unique constraint: `(user_id, name)`

### 4. transactions (replaces history.csv)

Maps the 7-column CSV: `t_id, date, t_type, category, amount, envelope, details`

| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(8) | PK — matches terminal's uuid[:8] format |
| user_id | UUID | FK → users.id |
| date | TIMESTAMP | transaction timestamp |
| type | VARCHAR(10) | `INCOME`, `EXPENSE`, `SYNC` |
| category | VARCHAR(100) | category name |
| amount_uah | DECIMAL(12,2) | amount in UAH |
| original_amount | DECIMAL(12,2) | nullable — FX original amount |
| original_currency | VARCHAR(3) | nullable — e.g. "USD" |
| envelope | VARCHAR(50) | home envelope |
| details | TEXT | `"OK"` or JSON breach data |

### 5. user_config (replaces config.json)

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, unique |
| base_currency | VARCHAR(3) | default `"UAH"` |

---

## Task Breakdown

**Part 1 — Install dependencies**
Add to `requirements.txt`:
```
sqlalchemy
alembic
```

**Part 2 — Database connection**
Create `backend/database.py`:
- SQLAlchemy engine from `DATABASE_URL` (already in `config.py`)
- SessionLocal factory
- Base declarative class

**Part 3 — SQLAlchemy models**
Create `backend/models/user.py`, `backend/models/envelope.py`, `backend/models/category.py`, `backend/models/transaction.py`, `backend/models/config.py`.
Each file defines one model matching the tables above.
Update `backend/models/__init__.py` to import all models.

**Part 4 — Alembic setup**
```bash
cd backend && alembic init alembic
```
Configure `alembic/env.py` to use the SQLAlchemy Base metadata and `DATABASE_URL` from config.
Generate initial migration: `alembic revision --autogenerate -m "initial schema"`

**Part 5 — Verify**
- `alembic upgrade head` must run without errors (requires a running PostgreSQL)
- All 5 tables must be created
- Models must be importable: `from backend.models import User, Envelope, Category, Transaction, UserConfig`

---

## Git

Branch: `feat/task-002-database-schema`
Commit message: `feat(backend): PostgreSQL schema and SQLAlchemy models (#002)`

---

## Result

After completing this task, write the result to `docs/result.md` (overwrite completely).
