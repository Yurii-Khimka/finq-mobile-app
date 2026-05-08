# plan.md — Active Task

> Always contains ONE task only.
> Rewritten by the planner before every new implementation session.
> Optimised for AI clarity, not human documentation.

---

## Active Task

**TASK-015 — SQLite local cache (read path)**
Goal: Install `expo-sqlite`, create local tables, populate them from the server on login/refresh, and rewire all screens to read from SQLite first. Server remains the write target — offline writes come in TASK-016.

---

## Context

The app is currently fully online-dependent. Every screen fetches data from the FastAPI backend on mount. If the server is unreachable, all screens show errors.

This task adds a local SQLite cache so screens can display data instantly from the local DB, then refresh from the server in the background. Writes (expense, income, delete) still go directly to the server for now.

Architecture from `session.md`:
```
SQLite (local) ← always available, offline-first reads
  ↕ background refresh when online
FastAPI Backend ← source of truth for writes
```

Conflict resolution: last write wins (device authoritative). Single user, no multi-device sync needed for MVP.

---

## What Must NOT Be Changed

- Do not modify anything in `backend/`
- Do not modify screen layouts or UI components
- Do not change the auth flow (token storage stays in SecureStore)
- Do not add offline write queuing (that's TASK-016)
- Screens must look and behave exactly the same — only the data source changes

---

## Read First

- `mobile/package.json` — current dependencies
- `mobile/src/api/client.ts` — all API methods (these stay unchanged)
- `mobile/src/types/finance.ts` — all type definitions
- `mobile/src/store/auth.ts` — token storage pattern
- `mobile/app/(tabs)/index.tsx` — Home screen data fetching (reference pattern)
- `mobile/app/(tabs)/history.tsx` — History screen data fetching
- `mobile/app/(tabs)/audit.tsx` — Audit screen data fetching
- `mobile/app/(tabs)/settings.tsx` — Config fetching
- `mobile/app/(tabs)/expense.tsx` — Categories fetching
- Expo SQLite docs: https://docs.expo.dev/versions/latest/sdk/sqlite/

---

## Step-by-step

### 1. Install `expo-sqlite`

```bash
cd mobile && npx expo install expo-sqlite
```

No other dependencies needed. `expo-sqlite` (v15+) uses the modern synchronous API and works with Expo 54.

### 2. Create database module (`mobile/src/db/index.ts`)

Single file that exports the database instance and initialisation function.

```typescript
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('finq.db');

export function initDB(): void {
  // Create all tables if they don't exist
  // Use db.execSync() for DDL
}

export default db;
```

### 3. Define SQLite tables

Tables mirror the backend schema but simplified for caching:

```sql
CREATE TABLE IF NOT EXISTS envelopes (
  name TEXT PRIMARY KEY,          -- "mandatory", "non_mandatory", "investments", "dreams"
  percentage REAL NOT NULL,
  balance REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,            -- 8-char UUID from server
  date TEXT NOT NULL,             -- ISO datetime string
  type TEXT NOT NULL,             -- "income", "expense", "sync"
  category TEXT NOT NULL,
  amount_uah REAL NOT NULL,
  original_amount REAL,
  original_currency TEXT,
  envelope TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT 'OK'
);

CREATE TABLE IF NOT EXISTS categories (
  name TEXT PRIMARY KEY,
  envelope_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cache_meta (
  key TEXT PRIMARY KEY,           -- e.g. "balances_updated", "history_updated"
  value TEXT NOT NULL             -- ISO timestamp of last server sync
);
```

Notes:
- No `user_id` column — single user, single local DB
- `cache_meta` tracks when each data type was last refreshed from server
- `config` is key-value for `base_currency` and future settings

### 4. Create data access layer (`mobile/src/db/queries.ts`)

Export functions for each data operation. All synchronous (expo-sqlite v15 sync API):

**Envelopes / Balances:**
- `getBalances(): BalancesResponse` — SELECT all envelopes, return as object
- `upsertBalances(balances: BalancesResponse): void` — INSERT OR REPLACE each envelope

**Transactions:**
- `getTransactions(filter?: string): TransactionResponse[]` — SELECT with optional month filter, ORDER BY date DESC
- `upsertTransactions(transactions: TransactionResponse[]): void` — INSERT OR REPLACE batch
- `deleteTransaction(id: string): void` — DELETE by id
- `getTransactionMonths(): string[]` — SELECT DISTINCT months for filter pills

**Categories:**
- `getCategories(): CategoryResponse[]` — SELECT all
- `upsertCategories(categories: CategoryResponse[]): void` — DELETE all + INSERT batch (full replace)

**Config:**
- `getConfig(): ConfigResponse` — SELECT base_currency, default "UAH"
- `upsertConfig(config: ConfigResponse): void` — INSERT OR REPLACE

**Cache meta:**
- `getCacheTimestamp(key: string): string | null` — when was this data last synced
- `setCacheTimestamp(key: string): void` — set to current ISO time

### 5. Create sync-from-server module (`mobile/src/db/sync.ts`)

Functions that fetch from server and populate SQLite. Called on app start and pull-to-refresh.

```typescript
export async function syncBalances(): Promise<BalancesResponse> {
  const balances = await finance.getBalances();
  upsertBalances(balances);
  setCacheTimestamp('balances');
  return balances;
}

export async function syncHistory(filter?: string): Promise<TransactionResponse[]> {
  const transactions = await finance.getHistory(filter);
  upsertTransactions(transactions);
  setCacheTimestamp('history');
  return transactions;
}

export async function syncCategories(): Promise<CategoryResponse[]> {
  const categories = await finance.getCategories();
  upsertCategories(categories);
  setCacheTimestamp('categories');
  return categories;
}

export async function syncConfig(): Promise<ConfigResponse> {
  const config = await finance.getConfig();
  upsertConfig(config);
  setCacheTimestamp('config');
  return config;
}

// Full sync — called on app launch after auth check
export async function syncAll(): Promise<void> {
  await Promise.all([
    syncBalances(),
    syncHistory('all'),
    syncCategories(),
    syncConfig(),
  ]);
}
```

### 6. Initialise DB on app start (`mobile/app/_layout.tsx`)

After auth check passes:
1. Call `initDB()` to create tables
2. Try `syncAll()` in the background (non-blocking)
3. If sync fails (offline), screens will use whatever is in SQLite from last session

```typescript
// In root layout, after confirming auth:
initDB();
syncAll().catch(() => { /* offline, use cached data */ });
```

### 7. Rewire screens to read from SQLite first

Each screen changes from "fetch server → show data" to "read SQLite → show data → fetch server → update SQLite → update UI".

#### Home screen (`app/(tabs)/index.tsx`)
- On mount: read `getBalances()` and `getTransactions()` from SQLite → show immediately
- Then: `syncBalances()` and `syncHistory('all', 10)` in background → update state on success
- Pull-to-refresh: trigger sync functions
- If SQLite is empty (first launch) and server fails → show empty state

#### History screen (`app/(tabs)/history.tsx`)
- On mount: read `getTransactions(filter)` from SQLite → show immediately
- Then: `syncHistory(filter)` in background → update state
- On filter change: read SQLite first, then sync
- Delete still calls server directly (`finance.removeTransaction(id)`), then also `deleteTransaction(id)` from SQLite

#### Expense screen (`app/(tabs)/expense.tsx`)
- On mount: read `getCategories()` from SQLite → show immediately
- Then: `syncCategories()` in background → update if changed
- Expense submission still goes to server directly (offline writes = TASK-016)
- After successful expense: `syncBalances()` + `syncHistory()` to update cache

#### Income screen (`app/(tabs)/income.tsx`)
- No local reads needed (income screen just has a numpad)
- After successful income: `syncBalances()` to update cache

#### Audit screen (`app/(tabs)/audit.tsx`)
- Audit/sustainability/anomalies/advisor are computed server-side → **do not cache in SQLite**
- Keep fetching from server directly
- If server fails: show "Audit data requires internet connection" message instead of error
- Rationale: audit data is derived from transactions + time calculations. Caching stale audit data is misleading.

#### Settings screen (`app/(tabs)/settings.tsx`)
- On mount: read `getConfig()` from SQLite → show immediately
- Then: `syncConfig()` in background
- On currency change: still calls server, then updates SQLite

### 8. Clear DB on logout

In `settings.tsx` logout handler, after `clearToken()`:
- Call a `clearAllData()` function that drops all table contents
- This ensures the next user gets a clean slate

Add to `mobile/src/db/queries.ts`:
```typescript
export function clearAllData(): void {
  db.execSync('DELETE FROM envelopes');
  db.execSync('DELETE FROM transactions');
  db.execSync('DELETE FROM categories');
  db.execSync('DELETE FROM config');
  db.execSync('DELETE FROM cache_meta');
}
```

---

## File plan

| File | Action |
|---|---|
| `mobile/src/db/index.ts` | NEW — DB instance + initDB() |
| `mobile/src/db/queries.ts` | NEW — all local read/write functions |
| `mobile/src/db/sync.ts` | NEW — server→SQLite sync functions |
| `mobile/app/_layout.tsx` | EDIT — add initDB() + syncAll() after auth |
| `mobile/app/(tabs)/index.tsx` | EDIT — read SQLite first, then sync |
| `mobile/app/(tabs)/history.tsx` | EDIT — read SQLite first, then sync; update SQLite on delete |
| `mobile/app/(tabs)/expense.tsx` | EDIT — read categories from SQLite; sync after submission |
| `mobile/app/(tabs)/income.tsx` | EDIT — sync balances after submission |
| `mobile/app/(tabs)/audit.tsx` | EDIT — graceful offline message instead of error |
| `mobile/app/(tabs)/settings.tsx` | EDIT — read config from SQLite; clear DB on logout |

---

## Edge cases

- First launch, no cache, no internet → all screens show empty state with "Connect to internet to get started" message
- SQLite empty but server reachable → sync populates everything, screens update
- Server unreachable after first sync → screens show cached data, no errors
- Logout → clears all SQLite data
- Delete transaction offline → server call fails → show error, don't delete from SQLite (offline delete = TASK-016)
- Stale cache → no TTL enforcement for MVP. Pull-to-refresh always syncs. Cache is good enough.
- DB migration in future → use `cache_meta` with a `db_version` key, or expo-sqlite's `userVersion` pragma

---

## What this does NOT include (deferred to TASK-016)

- Offline expense/income submission (queued writes)
- Sync queue with retry logic
- Conflict resolution
- Network status detection (online/offline indicator)
- Background sync on reconnect

---

## Verification

```bash
cd mobile && npx expo install expo-sqlite   # installs without errors
cd mobile && npx tsc --noEmit               # 0 errors
```

Manual test:
1. Launch app → data loads from server, cached in SQLite
2. Kill server → relaunch app → data still shows from cache
3. Pull to refresh while offline → shows error briefly, cached data remains
4. Go to History, change filter → local data shown instantly
5. Delete a transaction (while online) → removed from server and local DB
6. Logout → log back in → data re-syncs fresh

---

## Git

Branch: `feat/task-015-sqlite-cache`
Commit message: `feat(mobile): SQLite local cache with offline-first reads (#015)`

---

## Result

After completing this task, write the result to `docs/result.md` (overwrite completely).
