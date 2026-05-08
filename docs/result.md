# result.md — Task Result

> Written by Claude Code (developer) after every completed task.
> ALWAYS overwritten — never appended.
> One result per session. Previous results are replaced.
> Read by the planner to validate progress and decide the next step.

---

## Task
TASK-009 — Home screen (balances + envelopes + recent transactions)

## Status
COMPLETED

## What was done

### 1. Created format helpers (`mobile/src/utils/format.ts`)
- `formatCurrency(amount, 'USD' | 'UAH')` → `$1,234.56` or `₴1,234.56`
- `formatDate(dateString)` → "Today", "Yesterday", or "May 8"
- `envelopeLabel(key)` → human-readable name ("non_mandatory" → "Non-Mandatory")

### 2. Replaced Home screen (`mobile/app/(tabs)/index.tsx`)

**Section A — Total Balance header**
- Sums all 4 envelopes, converts to USD using rate from `GET /finance/rate?currency=USD`
- Large centered `$12,345.67` with UAH equivalent below
- Falls back to UAH-only if rate fetch fails

**Section B — Envelope cards (2×2 grid)**
- 4 cards with color-coded left border (indigo, green, amber, pink)
- Shows envelope name, USD balance, percentage label
- Responsive 47% width cards with 12px gap

**Section C — Recent transactions (last 10)**
- Fetches via `finance.getHistory('all', 10)`
- Each row: category, date, amount (red for expense, green for income), envelope
- Empty state: "No transactions yet"

### 3. Data fetching
- Fetches on mount and on screen focus (`useFocusEffect`)
- Parallel fetch: `Promise.all([getBalances(), getHistory(), getRate()])`
- Loading spinner while fetching
- 401 → clears token and redirects to login
- Other errors → inline error with retry button

### 4. Pull-to-refresh
- `RefreshControl` on `ScrollView`

## Files changed
- `mobile/src/utils/format.ts` — NEW: currency/date/envelope formatting helpers
- `mobile/app/(tabs)/index.tsx` — replaced placeholder with full home screen

## Verification
```
cd mobile && npx tsc --noEmit  → 0 errors
```

## Changelog entry
- **TASK-009:** Home screen with live balances, envelope cards, recent transactions, pull-to-refresh
