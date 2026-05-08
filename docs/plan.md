# plan.md — Active Task

> Always contains ONE task only.
> Rewritten by the planner before every new implementation session.
> Optimised for AI clarity, not human documentation.

---

## Active Task

**TASK-013 — Audit screen (health signal, burn rate, breaches, sustainability, anomalies)**
Goal: Build the Audit tab screen showing financial health overview, burn rate projection, breach details, per-envelope sustainability, spending anomalies, and AI advisor insight.

---

## Context

Four backend endpoints are ready and the mobile API client already has methods for all of them:

| Endpoint | Client method | Returns |
|---|---|---|
| `GET /finance/audit` | `finance.getAudit()` | `AuditResponse` — health signal, burn rate, breaches, days to zero, safe daily limit |
| `GET /finance/sustainability` | `finance.getSustainability()` | `SustainabilityResponse` — per-envelope burn rates and days to zero |
| `GET /finance/anomalies` | `finance.getAnomalies()` | `AnomalyItem[]` — categories with unusual spending spikes |
| `GET /finance/advisor` | `finance.getAdvisor()` | `AdvisorResponse` — prose summary combining all insights |

The audit tab already exists as a placeholder at `mobile/app/(tabs)/audit.tsx` with icon `shield-checkmark-outline` in the tab layout.

---

## What Must NOT Be Changed

- Do not modify anything in `backend/`
- Do not modify Home, Expense, Income, or History screens
- Do not add SQLite or offline logic
- Do not change tab layout or navigation

---

## Read First

- `mobile/src/api/client.ts` — `finance.getAudit()`, `finance.getSustainability()`, `finance.getAnomalies()`, `finance.getAdvisor()`
- `mobile/src/types/finance.ts` — `AuditResponse`, `SustainabilityResponse`, `AnomalyItem`, `AdvisorResponse`
- `mobile/src/tokens/index.ts` — design tokens, colours
- `mobile/src/utils/format.ts` — `formatCurrency()`, `formatDate()`
- `mobile/app/(tabs)/audit.tsx` — current placeholder (replace entirely)
- `mobile/app/(tabs)/index.tsx` — reference for data fetching pattern, envelope colours, error/loading states

---

## Step-by-step

### 1. Replace Audit screen (`app/(tabs)/audit.tsx`)

Single scrollable screen. Fetch all four endpoints on mount (parallel). Show loading spinner while fetching. Pull-to-refresh to re-fetch all.

### 2. Health Signal card (top, prominent)

- Large badge showing `health_signal`: green "Healthy", yellow "Warning", red "Critical"
- Use `colors.success` / `colors.warning` / `colors.danger` for badge background
- Below badge: spendable balance (large text), "Safe to spend ₴X/day" (subtitle)
- Show days remaining in month

### 3. Burn Rate section

- Daily burn rate: "₴X/day"
- Projection line: "At this rate, balance lasts X more days" (from `days_to_zero`)
  - If `days_to_zero` is null (no spending): "No spending yet this month"
  - If `days_to_zero >= days_remaining`: green text, "You're on track"
  - If `days_to_zero < days_remaining`: red text, "Overspending — will run out before month ends"
- Total spent this month: "₴X spent so far"

### 4. Breach Summary section

- If `breach_count === 0`: show a green "No breaches this month" message, skip the rest
- If breaches exist:
  - Header: "X breaches totalling ₴Y"
  - Breakdown by envelope (only show envelopes with non-zero borrowed amounts):
    - Coloured dot + envelope label + amount
    - Use envelope colours from Home screen: mandatory=`colors.primary`, non_mandatory=`colors.success`, investments=`colors.warning`, dreams=`#EC4899`
  - Top breaches list (up to 5):
    - Each row: date, category name, total amount, breach amount
    - Show "from" sources (e.g. "₴50 from Mandatory, ₴30 from Dreams")

### 5. Sustainability section (per-envelope cards)

- Four cards, one per envelope (mandatory, non_mandatory, investments, dreams)
- Each card shows:
  - Envelope name + coloured left border
  - Daily burn rate for that envelope
  - Days to zero (or "Safe" if null/infinite)
  - Safe daily limit for rest of month
- Only show mandatory and non_mandatory with full detail; investments and dreams can be simpler (they rarely have direct expenses)

### 6. Anomalies section

- If empty array: hide section entirely (no "No anomalies" message needed)
- If anomalies exist:
  - Header: "Spending Spikes"
  - Each row: category name, "X.Xx normal" (ratio), last 7 days amount vs average
  - Sort by ratio descending (highest spike first)
  - Use `colors.warning` for the ratio badge

### 7. Advisor section (bottom)

- Card with `colors.surface` background
- Header: "Insight" (or similar)
- Body: `advisor.text` as plain text, `fontSize.sm`
- If advisor fetch fails, hide section silently

### 8. Error and loading states

- Loading: centred spinner (same pattern as Home screen)
- Error: inline error message with retry button
- 401: redirect to login (same pattern as other screens)
- Individual section failures: hide that section, don't break the whole screen

---

## UI spec

Health signal badge:
- Height 40, rounded 20 (pill), padding horizontal 20
- Text: white, `fontSize.lg`, bold
- Background: `colors.success` / `colors.warning` / `colors.danger`

Section cards:
- `colors.surface` background, rounded 12, padding 16, marginBottom 12
- Section title: `fontSize.md`, `colors.text`, fontWeight 600, marginBottom 8

Envelope cards (sustainability):
- Row layout, coloured left border (4px wide, envelope colour)
- `colors.surface` background, rounded 8, padding 12
- Envelope name: `fontSize.sm`, bold
- Burn rate / days to zero: `fontSize.xs`, `colors.textSecondary`

Anomaly rows:
- Category: `fontSize.sm`, `colors.text`
- Ratio badge: `colors.warning` background, white text, rounded pill, `fontSize.xs`
- Amounts: `fontSize.xs`, `colors.textSecondary`

Advisor card:
- Subtle background, `colors.surface`
- Text: `fontSize.sm`, `colors.textSecondary`, lineHeight 20

---

## Edge cases

- No spending this month → burn rate 0, days to zero null → "No spending yet"
- No breaches → green confirmation, skip breach list
- No anomalies → hide section
- Advisor returns error → hide advisor section
- All endpoints fail → show error state with retry
- Very large breach amounts → format with `formatCurrency()`

---

## Verification

```bash
cd mobile && npx tsc --noEmit   # 0 errors
```

Manual test:
1. Navigate to Audit tab → see health signal, burn rate, breaches
2. Pull to refresh → data re-fetches
3. If breaches exist → see breach list with envelope breakdown
4. If anomalies exist → see spending spikes section
5. Advisor text appears at bottom

---

## Git

Branch: `feat/task-013-audit-screen`
Commit message: `feat(mobile): audit screen with health signal, burn rate, breaches, and sustainability (#013)`

---

## Result

After completing this task, write the result to `docs/result.md` (overwrite completely).
