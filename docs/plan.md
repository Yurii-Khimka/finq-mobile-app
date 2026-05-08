# plan.md — Active Task

> Always contains ONE task only.
> Rewritten by the planner before every new implementation session.
> Optimised for AI clarity, not human documentation.

---

## Active Task

**TASK-016 — Offline writes + sync queue**
Goal: Add a pending writes queue so expenses, income, and deletes work offline. Queue replays automatically when the app regains connectivity. Add a network status indicator so the user knows they're offline.

---

## Context

TASK-015 added SQLite with offline reads — screens show cached data when the server is unreachable. But all writes (expense, income, delete) still fail without internet. This task closes that gap.

Current write flow:
1. User submits expense/income → API call → success → sync SQLite
2. If offline → API call fails → error alert → nothing saved

Target write flow:
1. User submits expense/income → save to pending queue + apply locally → show success
2. Background: when online, replay queue → on success, mark synced → full sync
3. If replay fails → retry later, show pending indicator

Architecture decision from `session.md`: **last write wins, device authoritative, single user**.

---

## What Must NOT Be Changed

- Do not modify anything in `backend/`
- Do not change screen layouts or UI (except adding pending/offline indicators)
- Do not modify the existing SQLite tables (envelopes, transactions, categories, config, cache_meta)
- Do not change auth flow

---

## Read First

- `mobile/src/db/index.ts` — current DB init, table schemas
- `mobile/src/db/queries.ts` — all query functions
- `mobile/src/db/sync.ts` — server→SQLite sync functions
- `mobile/src/api/client.ts` — `finance.addExpense()`, `finance.addIncome()`, `finance.removeTransaction()`
- `mobile/src/types/finance.ts` — `ExpenseRequest`, `IncomeRequest`, `ExpenseResponse`
- `mobile/app/(tabs)/expense.tsx` — current expense submission (lines 125-161)
- `mobile/app/(tabs)/income.tsx` — current income submission (lines 45-68)
- `mobile/app/(tabs)/history.tsx` — current delete flow (lines 123-137)
- `mobile/app/_layout.tsx` — app start sync

---

## Step-by-step

### 1. Add `pending_writes` table (`mobile/src/db/index.ts`)

Add to `initDB()`:

```sql
CREATE TABLE IF NOT EXISTS pending_writes (
  id TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);
```

- `id` — UUID generated client-side (use `crypto.randomUUID()` or simple random string)
- `operation` — one of: `'addExpense'`, `'addIncome'`, `'removeTransaction'`
- `payload` — JSON string of the request body (e.g. `{ category, amount, currency }` for expense)
- `status` — `'pending'` | `'syncing'` | `'failed'`
- Max 5 retry attempts before marking `'failed'`

### 2. Pending writes query functions (`mobile/src/db/queries.ts`)

Add these functions:

- `insertPendingWrite(op: string, payload: object): string` — insert and return the generated id
- `getPendingWrites(): PendingWrite[]` — SELECT WHERE status = 'pending' ORDER BY created_at ASC
- `updatePendingStatus(id: string, status: string, error?: string): void` — update status + increment attempts + set last_error
- `deletePendingWrite(id: string): void` — remove after successful sync
- `getPendingCount(): number` — SELECT COUNT for badge/indicator
- `clearFailedWrites(): void` — DELETE WHERE status = 'failed' (manual retry reset)

Add type to `mobile/src/types/finance.ts`:
```typescript
export interface PendingWrite {
  id: string;
  operation: 'addExpense' | 'addIncome' | 'removeTransaction';
  payload: string; // JSON
  created_at: string;
  attempts: number;
  last_error: string | null;
  status: 'pending' | 'syncing' | 'failed';
}
```

### 3. Local optimistic write functions (`mobile/src/db/queries.ts`)

When a write is queued offline, the local SQLite should reflect it immediately:

**For expense:**
- `applyLocalExpense(category: string, amountUah: number, envelope: string): void`
  - Deduct `amountUah` from the envelope balance in `envelopes` table
  - Insert a temporary transaction into `transactions` with a local id prefix (e.g. `"local_"` + random) so it shows in history
  - The temporary transaction gets replaced on full sync after the queue replays

**For income:**
- `applyLocalIncome(amountUah: number): void`
  - Distribute across envelopes by percentage (50/30/10/10)
  - Insert a temporary income transaction

**For delete:**
- Already handled — `deleteTransaction(id)` removes from SQLite, pending write queues the server call

### 4. Queue replay engine (`mobile/src/db/sync.ts`)

Add a `replayPendingWrites()` function:

```typescript
export async function replayPendingWrites(): Promise<void> {
  const pending = getPendingWrites();
  
  for (const write of pending) {
    if (write.attempts >= 5) {
      updatePendingStatus(write.id, 'failed', 'Max retries exceeded');
      continue;
    }
    
    updatePendingStatus(write.id, 'syncing');
    
    try {
      const payload = JSON.parse(write.payload);
      
      switch (write.operation) {
        case 'addExpense':
          await finance.addExpense(payload);
          break;
        case 'addIncome':
          await finance.addIncome(payload);
          break;
        case 'removeTransaction':
          await finance.removeTransaction(payload.id);
          break;
      }
      
      deletePendingWrite(write.id);
    } catch (error) {
      updatePendingStatus(write.id, 'pending', error.message);
      break; // Stop on first failure — preserve order
    }
  }
  
  // After replaying, do a full sync to reconcile
  if (pending.length > 0) {
    await syncAll();
  }
}
```

Key rules:
- Process in FIFO order (oldest first)
- Stop on first failure — don't skip ahead (order matters for balance calculations)
- After all pending writes succeed, run `syncAll()` to get server-authoritative state
- The full sync replaces any local/temporary transactions with real server data

### 5. Network status hook (`mobile/src/hooks/useNetworkStatus.ts`)

NEW file. Simple hook using React Native's `NetInfo` or a lightweight polling approach:

```typescript
// Option A: Use fetch-based ping (no extra dependency)
export function useNetworkStatus(): { isOnline: boolean } {
  // Poll the API base URL every 30 seconds with a lightweight HEAD request
  // Also check on app focus (AppState change)
  // Return { isOnline }
}
```

Since we want to avoid extra dependencies, use a simple approach:
- On app start: try a HEAD request to the API base URL
- On `AppState` change to `'active'`: re-check
- Periodically (every 30s) when the app is in foreground
- Expose `isOnline` boolean

When transitioning from offline → online:
- Call `replayPendingWrites()` automatically

### 6. Rewire Expense screen (`mobile/app/(tabs)/expense.tsx`)

Change `handleSubmit()`:

```
Try server call (finance.addExpense)
  ↓ SUCCESS → sync SQLite, navigate home (same as now)
  ↓ NETWORK ERROR →
    - Queue: insertPendingWrite('addExpense', payload)
    - Optimistic: applyLocalExpense(category, amountUah, envelope)
    - Navigate home with brief "Saved offline" toast/message
  ↓ OTHER ERROR (400, 404) → show error (don't queue — it will fail again)
```

Only queue on network errors (fetch fails, timeout, no internet). Don't queue validation errors (400), auth errors (401), or server errors (500) — those need different handling.

### 7. Rewire Income screen (`mobile/app/(tabs)/income.tsx`)

Same pattern as expense:

```
Try server call (finance.addIncome)
  ↓ SUCCESS → sync SQLite, navigate home
  ↓ NETWORK ERROR →
    - Queue: insertPendingWrite('addIncome', payload)
    - Optimistic: applyLocalIncome(amountUah)
    - Navigate home with "Saved offline"
  ↓ OTHER ERROR → show error
```

### 8. Rewire History delete (`mobile/app/(tabs)/history.tsx`)

```
Try server call (finance.removeTransaction)
  ↓ SUCCESS → delete from SQLite, update UI (same as now)
  ↓ NETWORK ERROR →
    - Queue: insertPendingWrite('removeTransaction', { id })
    - Delete from local SQLite
    - Update UI (transaction disappears)
    - Will sync to server when back online
  ↓ OTHER ERROR → show error, don't delete locally
```

### 9. Offline indicator in root layout (`mobile/app/_layout.tsx`)

Add a small bar at the top of the screen when offline:
- Yellow background (`colors.warning`), white text
- Text: "You're offline — changes will sync when connected"
- Shows when `isOnline === false`
- Disappears when back online (after successful replay)

Also show pending count if > 0:
- Text: "X changes pending sync"
- This appears even when online, if queue hasn't replayed yet

### 10. Pending indicator on Home screen (`mobile/app/(tabs)/index.tsx`)

If `getPendingCount() > 0`, show a small badge or note:
- Below the balance card: "X pending changes" in `colors.warning`
- This reassures the user that their offline writes exist and will sync

### 11. Trigger replay on app start and reconnect

In `_layout.tsx`, after `syncAll()`:
```typescript
// After syncAll succeeds (we're online):
await replayPendingWrites();
```

In the network status hook, when transitioning offline → online:
```typescript
replayPendingWrites().then(() => syncAll());
```

### 12. Clear pending writes on logout

In `clearAllData()` (`queries.ts`), add:
```sql
DELETE FROM pending_writes;
```

---

## File plan

| File | Action |
|---|---|
| `mobile/src/db/index.ts` | EDIT — add `pending_writes` table to initDB |
| `mobile/src/db/queries.ts` | EDIT — add pending write functions + optimistic local writes |
| `mobile/src/db/sync.ts` | EDIT — add `replayPendingWrites()` |
| `mobile/src/types/finance.ts` | EDIT — add `PendingWrite` type |
| `mobile/src/hooks/useNetworkStatus.ts` | NEW — network status hook with auto-replay |
| `mobile/app/(tabs)/expense.tsx` | EDIT — queue on network error, optimistic local write |
| `mobile/app/(tabs)/income.tsx` | EDIT — queue on network error, optimistic local write |
| `mobile/app/(tabs)/history.tsx` | EDIT — queue delete on network error |
| `mobile/app/(tabs)/index.tsx` | EDIT — show pending count indicator |
| `mobile/app/_layout.tsx` | EDIT — offline bar, replay on start/reconnect |

---

## Edge cases

- Queue has writes + user goes online → replay in order, stop on first failure
- Expense queued offline, then deleted offline → both in queue, order preserved, server handles correctly
- 5 failed attempts → mark as `'failed'`, don't retry. User can clear via settings (future)
- Queue replay during another replay → guard with a `isReplaying` flag to prevent concurrent execution
- App killed while replaying → pending writes persist in SQLite, resume on next launch
- Auth expired while offline → replay will get 401 → redirect to login, queue preserved for after re-login
- Currency conversion offline → for expenses in USD/EUR, we can't get live rate. Two options:
  - Option A: block non-UAH expenses offline (simplest, safest)
  - Option B: use last cached rate from `cache_meta`
  - **Go with Option A** — show "Currency conversion requires internet. Use UAH or connect to submit." This avoids stale rate issues.

---

## What this does NOT include (post-MVP)

- Retry UI for failed writes (manual retry button in settings)
- Conflict resolution beyond last-write-wins
- Multi-device sync
- Background fetch (iOS background app refresh)

---

## Verification

```bash
cd mobile && npx tsc --noEmit   # 0 errors
```

Manual test:
1. Turn off server → add expense in UAH → "Saved offline" message, navigates home
2. Check history → offline expense appears with local data
3. Turn on server → app reconnects → pending writes replay → full sync
4. Check history → transaction now has real server id
5. Turn off server → add income → "Saved offline"
6. Turn on server → income syncs, balances update
7. Turn off server → delete a transaction → disappears locally
8. Turn on server → delete syncs to server
9. Try non-UAH expense offline → blocked with "requires internet" message
10. Check offline bar appears when server unreachable

---

## Git

Branch: `feat/task-016-offline-writes`
Commit message: `feat(mobile): offline write queue with auto-replay and network status (#016)`

---

## Result

After completing this task, write the result to `docs/result.md` (overwrite completely).
