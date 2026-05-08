# plan.md — Active Task

> Always contains ONE task only.
> Rewritten by the planner before every new implementation session.
> Optimised for AI clarity, not human documentation.

---

## Active Task

**TASK-012 — History screen (grouped by day, filters, swipe-to-delete)**
Goal: Build the transaction history screen with day-grouped list, envelope/month filters, and swipe-to-delete with balance reversal.

---

## Context

The backend has `GET /finance/history?filter=all|current|MM&limit=N` returning `TransactionResponse[]` sorted by date descending. Also `DELETE /finance/transactions/{id}` which reverses the balance effect and returns updated balances.

Home screen (TASK-009) shows last 10 transactions in a flat list. This screen shows the full history with grouping and filtering.

---

## What Must NOT Be Changed

- Do not modify anything in `backend/`
- Do not modify Home, Expense, Income, or auth screens
- Do not add SQLite or offline logic

---

## Read First

- `mobile/src/api/client.ts` — `finance.getHistory()`, `finance.removeTransaction()`
- `mobile/src/types/finance.ts` — `TransactionResponse`
- `mobile/src/tokens/index.ts` — design tokens
- `mobile/src/utils/format.ts` — `formatCurrency()`, `formatDate()`
- `mobile/app/(tabs)/history.tsx` — current placeholder (replace entirely)

---

## Step-by-step

### 1. Replace History screen (`app/(tabs)/history.tsx`)

#### Filter bar (top, horizontal scroll)

- Pill buttons: "All" | "This Month" | month names ("Jan", "Feb", ... for months that have data)
- Envelope filter: "All Envelopes" | "Mandatory" | "Non-Mandatory" | "Investments" | "Dreams"
- Two rows of pills, or a single row with a second dropdown for envelope
- Active pill: `colors.primary` background, white text
- Inactive pill: `colors.surface` background, `colors.textSecondary` text

#### Transaction list (SectionList, grouped by day)

- Section header: date string — "Today", "Yesterday", "May 7, 2026", etc.
- Each row shows:
  - Left: category name (bold), envelope name (small, grey)
  - Right: amount with sign and color (red expense, green income), time (small, grey)
  - If FX transaction: show original amount below UAH amount (e.g. "$50.00" in grey)
- Swipe left to reveal red "Delete" button

#### Empty state

- "No transactions" + icon when list is empty after filtering

### 2. Day grouping logic

- Group `TransactionResponse[]` by date (extract `YYYY-MM-DD` from the date string)
- Sort groups descending (newest day first)
- Within each group, transactions are already sorted by API

### 3. Filters

- "All" → `finance.getHistory('all')`
- "This Month" → `finance.getHistory('current')`
- Month pills → `finance.getHistory('MM')` where MM is month number
- Envelope filter: client-side filter after fetch (API doesn't support envelope filter)
- Re-fetch when date filter changes, re-filter when envelope filter changes

### 4. Swipe-to-delete

Use React Native's built-in gesture approach — no external swipe library needed:

Create a `SwipeableRow` wrapper component (`mobile/src/components/SwipeableRow.tsx`):
- Uses `Animated` + `PanResponder` for horizontal swipe
- Swipe left reveals a red "Delete" area
- Tap delete → confirmation Alert ("Delete this transaction? This will reverse the balance change.")
- On confirm → `finance.removeTransaction(id)`
- On success → remove from local state, no full re-fetch needed
- On error → show error, snap row back

### 5. Pull-to-refresh

- `RefreshControl` on the `SectionList`
- Re-fetches with current filter

### 6. Summary bar (optional, above list)

- Shows count: "42 transactions" and total: "₴12,345.00 spent"
- Only counts expenses in the total
- Updates when filters change

---

## UI spec

Filter pills:
- Height 32, rounded 16 (pill shape), padding horizontal 12
- Active: `colors.primary` bg, white text
- Inactive: `colors.surface` bg, `colors.textSecondary` text, `colors.border` border

Section header:
- `fontSize.sm`, `colors.textSecondary`, bold
- Padding: 16 horizontal, 8 vertical
- Sticky header (SectionList default)

Transaction row:
- `colors.surface` background, rounded 8, padding 12, marginBottom 4
- Category: `fontSize.md`, `colors.text`, fontWeight 600
- Envelope: `fontSize.xs`, `colors.textSecondary`
- Amount: `fontSize.md`, `colors.danger` (expense) or `colors.success` (income)
- Time: `fontSize.xs`, `colors.textSecondary`

Delete button (swipe reveal):
- Background: `colors.danger`
- Text: white, "Delete"
- Width: 80

---

## Edge cases

- No transactions at all → empty state
- Filter returns no results → "No transactions match filters"
- Delete last transaction in a day group → remove entire section
- Delete while offline (401) → redirect to login
- Very long history → SectionList virtualizes automatically, no pagination needed for MVP

---

## Verification

```bash
cd mobile && npx tsc --noEmit   # 0 errors
```

Manual test:
1. Navigate to History tab → see grouped transaction list
2. Filter by "This Month" → only current month shows
3. Filter by envelope → list filters client-side
4. Swipe left on a transaction → delete button appears
5. Confirm delete → transaction removed, balance updated
6. Pull to refresh → list re-fetches

---

## Git

Branch: `feat/task-012-history-screen`
Commit message: `feat(mobile): history screen with filters, day groups, and swipe-to-delete (#012)`

---

## Result

After completing this task, write the result to `docs/result.md` (overwrite completely).
