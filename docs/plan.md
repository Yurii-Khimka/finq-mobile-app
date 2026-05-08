# plan.md — Active Task

> Always contains ONE task only.
> Rewritten by the planner before every new implementation session.
> Optimised for AI clarity, not human documentation.

---

## Active Task

**TASK-011 — Add Income flow**
Goal: Build the income entry screen. Reuses the NumPad from TASK-010. Simpler than expense — no categories, no impact preview. Income is distributed across envelopes by the backend waterfall.

---

## Context

The backend endpoint `POST /finance/income` accepts `{ amount, currency }` and distributes the amount across all 4 envelopes by their percentages (50/30/10/10). Returns updated `BalancesResponse`. Optional FX conversion if currency ≠ UAH.

The NumPad component (`src/components/NumPad.tsx`) is already built and reusable.

---

## What Must NOT Be Changed

- Do not modify anything in `backend/`
- Do not modify NumPad component, Home screen, Expense screen, or auth
- Do not add SQLite or offline logic

---

## Read First

- `mobile/src/components/NumPad.tsx` — reusable NumPad (reuse as-is)
- `mobile/src/api/client.ts` — `finance.addIncome()`
- `mobile/src/types/finance.ts` — `IncomeRequest`, `BalancesResponse`
- `mobile/src/tokens/index.ts` — design tokens
- `mobile/src/utils/format.ts` — formatting helpers
- `mobile/app/(tabs)/income.tsx` — current placeholder (replace entirely)

---

## Step-by-step

### 1. Replace Income screen (`app/(tabs)/income.tsx`)

Single-state screen (no confirmation step — income doesn't need impact preview).

```
[SafeAreaView]
  [Amount display - top area]
    "₴0" → updates via NumPad
    [Currency toggle: UAH | USD | EUR - pills below amount]

  [Distribution preview - middle area]
    Shows how income will be split:
    "Mandatory   50%  →  ₴5,000.00"
    "Non-Mandatory 30%  →  ₴3,000.00"
    "Investments  10%  →  ₴1,000.00"
    "Dreams      10%  →  ₴1,000.00"
    Updates live as amount changes

  [NumPad - bottom area]
    (reuse NumPad component)
    [Add Income button - full width, green (colors.success), disabled until amount > 0]
```

### 2. Distribution preview

- Calculate split on every amount change: `amount * percentage / 100` for each envelope
- Display with envelope colors (same as Home screen cards)
- Format amounts with currency symbol matching the selected currency
- When amount is 0 → show dashes or "₴0.00" for each

### 3. Submit flow

- On "Add Income" tap → call `finance.addIncome({ amount, currency })`
- Loading state on button while submitting
- Double-tap protection
- On success: show brief success indicator, navigate to Home tab
- On 502 (FX rate fail): show "Exchange rate unavailable"
- On 401: redirect to login

---

## UI spec

Amount display:
- `fontSize.xxl` + 8 (make it even larger, ~44pt), `colors.success`, bold, centered
- Currency symbol prefix (₴, $, €)

Distribution preview cards:
- 4 rows, full width, `colors.surface` background, rounded 8, padding 12
- Left: envelope name + percentage in `colors.textSecondary`
- Right: calculated amount in `colors.text`
- Colored left border (same colors as Home envelope cards)
- Gap: 8px between rows

Currency toggle:
- Same style as expense screen pills
- Default: UAH

Add Income button:
- Full width, height 52, rounded 12
- `colors.success` background (green — distinguishes from expense's indigo)
- Disabled: `colors.surfaceAlt`, `colors.textSecondary`

---

## Edge cases

- Amount "0" → button disabled, distribution shows ₴0.00
- FX currency + rate failure → error message, don't submit
- Very large income → numbers format correctly with commas
- Quick double-tap → prevented

---

## Verification

```bash
cd mobile && npx tsc --noEmit   # 0 errors
```

Manual test:
1. Navigate to Income tab → see NumPad + distribution preview
2. Type "10000" → distribution shows 5000/3000/1000/1000
3. Toggle to USD → distribution recalculates display
4. Tap "Add Income" → submits, navigates to Home, balances updated
5. Check envelope cards on Home → amounts increased correctly

---

## Git

Branch: `feat/task-011-income-screen`
Commit message: `feat(mobile): income flow with numpad and distribution preview (#011)`

---

## Result

After completing this task, write the result to `docs/result.md` (overwrite completely).
