# plan.md — Active Task

> Always contains ONE task only.
> Rewritten by the planner before every new implementation session.
> Optimised for AI clarity, not human documentation.

---

## Active Task

**TASK-014 — Settings screen (display currency, logout, app info)**
Goal: Build the Settings screen with display currency selector, logout with confirmation, and basic app info section.

---

## Context

The placeholder at `mobile/app/(tabs)/settings.tsx` already has a working logout button that calls `clearToken()` and redirects to login. This task replaces the placeholder with a full settings screen.

Backend has `GET /finance/config` and `PUT /finance/config` for the `base_currency` field. Valid values: `"UAH"`, `"USD"`, `"EUR"`. The API client already has `finance.getConfig()` and `finance.updateConfig()`.

Logout is client-side only — delete token from SecureStore, redirect to login. No backend endpoint needed.

---

## What Must NOT Be Changed

- Do not modify anything in `backend/`
- Do not modify Home, Expense, Income, History, or Audit screens
- Do not add SQLite or offline logic
- Do not change tab layout or navigation structure

---

## Read First

- `mobile/app/(tabs)/settings.tsx` — current placeholder (replace entirely)
- `mobile/src/store/auth.ts` — `clearToken()`, `isAuthenticated()`
- `mobile/src/api/client.ts` — `finance.getConfig()`, `finance.updateConfig()`
- `mobile/src/types/finance.ts` — `ConfigRequest`, `ConfigResponse`
- `mobile/src/tokens/index.ts` — design tokens
- `mobile/src/utils/format.ts` — `formatCurrency()` uses currency param
- `mobile/app/_layout.tsx` — root auth gate (redirect after logout)

---

## Step-by-step

### 1. Replace Settings screen (`app/(tabs)/settings.tsx`)

Scrollable screen with grouped sections. Fetch config on mount. Pull-to-refresh.

### 2. Display Currency section

- Header: "Display Currency"
- Three selectable options as a segmented control or radio-style list:
  - UAH (₴) — default
  - USD ($)
  - EUR (€)
- Current selection fetched from `finance.getConfig()`
- On change: call `finance.updateConfig({ base_currency: selected })`
- Show brief loading indicator during save
- On error: revert selection, show error toast/alert
- Note: this only changes the config on the server. The app currently formats all values in UAH. A future task will wire display currency into `formatCurrency()` calls app-wide. For now, just save the preference.

### 3. Account section

- Header: "Account"
- Row: "Email" — show current user's email (read-only, informational)
  - The email is not currently available from any endpoint. Skip this row for now — just show the section header with the logout button.
- **Logout button:**
  - Full-width button, `colors.danger` background, white text
  - Text: "Log Out"
  - On press: show confirmation Alert ("Log out of finQ?", "You'll need to sign in again.", [Cancel, Log Out])
  - On confirm: `await clearToken()` then `router.replace('/(auth)/login')`
  - Important: the confirmation step is required — no accidental logouts

### 4. About section

- Header: "About"
- Row: "Version" — hardcoded "1.0.0" (right-aligned, grey)
- Row: "Build" — hardcoded "MVP" (right-aligned, grey)
- These are static for now. Will be dynamic post-MVP.

### 5. Danger Zone section (bottom, separated)

- Header: "Danger Zone" (in `colors.danger`)
- Row: "Reset All Data" — disabled for MVP, greyed out
  - On press: show Alert "Coming soon — this feature is not yet available"
  - This is a placeholder for a future data reset feature

---

## UI spec

Section grouping:
- Each section has a header label: `fontSize.xs`, `colors.textSecondary`, uppercase, letterSpacing 1, marginBottom 8, marginTop 24
- Section content in `colors.surface` card, rounded 12, overflow hidden

Setting rows:
- Height 48, padding horizontal 16, vertical centre
- Border bottom: 1px `colors.border` (except last row in section)
- Label: `fontSize.md`, `colors.text`, left
- Value: `fontSize.md`, `colors.textSecondary`, right

Currency selector:
- Three options in a row (segmented control style)
- Each option: flex 1, height 40, centred text
- Selected: `colors.primary` background, white text, rounded 8
- Unselected: transparent background, `colors.textSecondary` text

Logout button:
- Full-width, height 48, `colors.danger` background, rounded 12
- Text: white, `fontSize.md`, fontWeight 600, centred
- Margin top 8 inside the Account section card

About rows:
- Same style as setting rows, but no interaction (no onPress)

Danger Zone:
- Same card style but with `colors.danger` tinted border or header
- Reset row: `colors.textSecondary` text (greyed out), opacity 0.5

---

## Edge cases

- Config fetch fails → show current selection as UAH (default), allow retry via pull-to-refresh
- Config update fails → revert selection, show Alert with error message
- Logout during config save → clearToken still works, pending request will 401 harmlessly
- Double-tap logout → confirmation alert prevents double execution

---

## Verification

```bash
cd mobile && npx tsc --noEmit   # 0 errors
```

Manual test:
1. Navigate to Settings tab → see currency selector, logout, about info
2. Change currency to USD → saves to backend, selection updates
3. Change back to UAH → saves correctly
4. Tap "Log Out" → confirmation alert appears
5. Confirm logout → redirected to login screen
6. Cancel logout → stays on settings
7. Pull to refresh → config re-fetches
8. Tap "Reset All Data" → "Coming soon" alert

---

## Git

Branch: `feat/task-014-settings-screen`
Commit message: `feat(mobile): settings screen with currency selector, logout, and app info (#014)`

---

## Result

After completing this task, write the result to `docs/result.md` (overwrite completely).
