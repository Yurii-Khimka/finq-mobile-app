# plan.md — Active Task

> Always contains ONE task only.
> Rewritten by the planner before every new implementation session.
> Optimised for AI clarity, not human documentation.

---

## Active Task

**TASK-009 — Home screen (balances + envelopes + recent transactions)**
Goal: Build the first real data screen. Shows total balance, 4 envelope cards, and the 10 most recent transactions. Fetches live data from the backend API.

---

## Context

Auth works (TASK-008). The API client is fully wired with typed methods for all 19 endpoints. The Home tab (`app/(tabs)/index.tsx`) is a placeholder. This task replaces it with a real screen that the user sees after login.

The backend stores amounts in UAH internally. Display currency is USD (session.md decision). Use `GET /finance/rate?currency=USD` to convert. Show UAH as fallback if rate fetch fails.

---

## What Must NOT Be Changed

- Do not modify anything in `backend/`
- Do not modify auth screens or auth logic
- Do not add SQLite or offline caching yet
- Do not modify the tab navigator layout

---

## Read First

- `mobile/src/api/client.ts` — API methods: `finance.getBalances()`, `finance.getHistory()`, `finance.getRate()`
- `mobile/src/types/finance.ts` — `BalancesResponse`, `TransactionResponse`, `RateResponse`
- `mobile/src/tokens/index.ts` — design tokens
- `mobile/app/(tabs)/index.tsx` — current placeholder (replace entirely)

---

## Step-by-step

### 1. Replace Home screen (`app/(tabs)/index.tsx`)

Build a `ScrollView`-based screen with three sections:

#### Section A — Total Balance header

- Sum of all 4 envelopes (from `BalancesResponse`)
- Display in USD: `total_uah / usd_rate`
- Format: `$12,345.67` large centered text
- Below it: small grey text showing UAH equivalent `₴456,789.00`
- If rate fetch fails, show UAH only

#### Section B — Envelope cards (horizontal row or 2×2 grid)

4 cards, one per envelope:
- Envelope name (human-readable: "Mandatory", "Non-Mandatory", "Investments", "Dreams")
- Balance in USD (converted)
- Percentage label (50%, 30%, 10%, 10%)
- Color-coded left border or accent:
  - mandatory → `colors.primary` (indigo)
  - non_mandatory → `colors.success` (green)
  - investments → `colors.warning` (amber)
  - dreams → pink/purple (`#EC4899`)

Use a 2×2 grid layout (2 cards per row, equal width).

#### Section C — Recent transactions (last 10)

- Call `finance.getHistory('all', 10)`
- Each row: date, category, amount, envelope badge
- EXPENSE amounts in red with minus sign, INCOME in green with plus sign
- Amount in UAH (don't convert transactions — too many, keep it simple)
- Format date as "May 8" or "Today" / "Yesterday" where applicable
- If no transactions, show empty state: "No transactions yet"

### 2. Data fetching

- Fetch on screen mount (useEffect) and on screen focus (useCallback with useFocusEffect from expo-router)
- Parallel fetch: `Promise.all([getBalances(), getHistory('all', 10), getRate('USD')])`
- Show loading spinner while fetching
- On 401 error → clear token and redirect to login (token expired)
- On other errors → show inline error with retry button

### 3. Pull-to-refresh

- Add `RefreshControl` to the `ScrollView`
- On pull, re-fetch all three endpoints

### 4. Helpers

Create `mobile/src/utils/format.ts`:

- `formatCurrency(amount: number, currency: 'USD' | 'UAH')` → `$1,234.56` or `₴1,234.56`
- `formatDate(dateString: string)` → "Today", "Yesterday", or "May 8"
- `envelopeLabel(key: string)` → human-readable name ("non_mandatory" → "Non-Mandatory")

---

## UI spec

```
[ScrollView - background: colors.background, RefreshControl]

  [Total Balance Section - centered, paddingVertical: 24]
    "$12,345.67"  — fontSize.xxl, colors.text, bold
    "₴456,789.00" — fontSize.sm, colors.textSecondary

  [Envelope Grid - 2×2, padding: 16, gap: 12]
    [Card - surface bg, rounded 12, padding 16, colored left border 3px]
      "Mandatory"     — fontSize.sm, colors.textSecondary
      "$6,172.83"     — fontSize.lg, colors.text, bold
      "50%"           — fontSize.xs, colors.textSecondary

  [Recent Transactions - padding: 16]
    "Recent"          — fontSize.lg, colors.text, bold, marginBottom 12
    [Transaction Row - surface bg, rounded 8, padding 12, marginBottom 8]
      [Left]
        "Groceries"   — fontSize.md, colors.text
        "Today"       — fontSize.xs, colors.textSecondary
      [Right]
        "-₴250.00"    — fontSize.md, colors.danger (or colors.success for income)
        "mandatory"   — fontSize.xs, colors.textSecondary
```

No external UI library — plain RN components.

---

## Edge cases

- New user with zero balances → show $0.00, empty transaction list
- Rate fetch fails → show UAH amounts, hide USD
- Token expired (401) → redirect to login
- Slow network → loading spinner, then content

---

## Verification

```bash
cd mobile && npx tsc --noEmit   # 0 errors
```

Manual test (backend running):
1. Login → Home screen loads with real balances
2. Envelope cards show correct amounts
3. Recent transactions list shows last 10
4. Pull down → data refreshes
5. Navigate away and back → data re-fetches

---

## Git

Branch: `feat/task-009-home-screen`
Commit message: `feat(mobile): home screen with balances, envelopes, and transactions (#009)`

---

## Result

After completing this task, write the result to `docs/result.md` (overwrite completely).
