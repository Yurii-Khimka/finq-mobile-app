# plan.md — Active Task

> Always contains ONE task only.
> Rewritten by the planner before every new implementation session.
> Optimised for AI clarity, not human documentation.

---

## Active Task

**TASK-020 — Biometric authentication (Face ID / Touch ID)**
Goal: Add optional biometric unlock so the app requests Face ID / Touch ID on launch if the user is already logged in. Toggle in Settings. Finance app users expect this.

**Pre-step:** Commit + PR all TASK-019 changes first (see below).

---

## Pre-step: Commit + PR for TASK-019

TASK-019 is already committed but needs a PR.

1. Push branch `feat/task-019-app-icon-splash` if not pushed
2. Create PR to `main`:
   - Title: `feat(mobile): branded app icon and splash screen (#019)`
   - Body: summary (icon generation script, four assets replaced, indigo Q lettermark on dark bg)
3. **Do not merge** — just create the PR, then continue to TASK-020.
4. Create new branch from current: `feat/task-020-biometric-auth`

---

## Context

The app uses JWT auth stored in `expo-secure-store`. Once logged in, the token persists and the user is auto-routed to tabs. There is no lock screen — anyone who opens the app sees the finance data immediately.

This task adds an optional biometric gate:
- If biometrics are enabled in Settings AND the user is logged in, the app shows a lock screen on launch requiring Face ID / Touch ID
- If biometrics are not available on the device, the toggle is hidden
- If the user hasn't enabled it, the app works exactly as before

Uses `expo-local-authentication` — standard Expo package, no native module config needed.

---

## What Must NOT Be Changed

- Do not modify anything in `backend/`
- Do not change the JWT auth flow or login/register screens
- Do not change offline behaviour or sync logic
- The biometric gate is purely a local unlock — it does NOT replace server auth

---

## Read First

- `mobile/app/_layout.tsx` — root layout, auth routing logic, where the gate goes
- `mobile/src/store/auth.ts` — token management (SecureStore)
- `mobile/src/db/queries.ts` — `getConfigValue()` / `setConfigValue()` for persistence
- `mobile/app/(tabs)/settings.tsx` — where the toggle goes

---

## Step-by-step

### 1. Install `expo-local-authentication`

```bash
cd mobile && npx expo install expo-local-authentication
```

Add to `app.json` plugins if needed (check expo docs — may not be required).

### 2. Add biometric lock screen to root layout (`mobile/app/_layout.tsx`)

Current flow:
```
ready=false → null (splash visible)
ready=true, !loggedIn → redirect to login
ready=true, loggedIn → show tabs
```

New flow:
```
ready=false → null (splash visible)
ready=true, !loggedIn → redirect to login
ready=true, loggedIn, biometricRequired → show lock screen
ready=true, loggedIn, !biometricRequired → show tabs
```

Add state:
```typescript
const [biometricLocked, setBiometricLocked] = useState(false);
```

On mount (after `isAuthenticated()` returns true):
1. Check if biometrics are enabled: `getConfigValue('biometric_lock') === 'true'`
2. If yes, set `biometricLocked = true` and prompt immediately
3. Call `LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock finQ' })`
4. On success: `setBiometricLocked(false)`
5. On failure: stay locked, show "Try Again" button

The lock screen UI:
- Full screen, `colors.background`
- finQ logo/text centred
- "Unlock with Face ID" / "Unlock with Touch ID" button (detect type with `LocalAuthentication.supportedAuthenticationTypesAsync()`)
- "Try Again" if first attempt fails

**Important:** Only show lock screen if `biometricLocked === true`. The auth routing logic stays unchanged — biometric lock is an additional gate after JWT check.

### 3. Add toggle to Settings (`mobile/app/(tabs)/settings.tsx`)

New section between THEME and DISPLAY CURRENCY:

**SECURITY section:**
- Row: "Biometric Lock" with a Switch (toggle)
- Only visible if `LocalAuthentication.hasHardwareAsync()` returns true
- On toggle ON: call `LocalAuthentication.authenticateAsync()` first to verify — if success, `setConfigValue('biometric_lock', 'true')`
- On toggle OFF: `setConfigValue('biometric_lock', 'false')`
- Read initial state from `getConfigValue('biometric_lock')`

Use React Native `Switch` component, tinted with `colors.primary`.

### 4. Add `NSFaceIDUsageDescription` to `app.json`

Required for iOS Face ID permission:

```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.finq.app",
  "infoPlist": {
    "NSFaceIDUsageDescription": "finQ uses Face ID to protect your financial data"
  }
}
```

### 5. Add plugin to `app.json`

```json
"plugins": [
  "expo-router",
  "expo-secure-store",
  "expo-local-authentication"
]
```

---

## UI spec

**Lock screen:**
- Background: `colors.background`
- Centre: "finQ" in `colors.primary`, same as login screen title
- Below: lock icon (Ionicons `lock-closed-outline`), 48px, `colors.textSecondary`
- Below: "Unlock with Face ID" button — `colors.primary` background, white text, rounded
- If auth fails: show error text in `colors.danger`, button changes to "Try Again"

**Settings toggle:**
```
SECURITY
┌──────────────────────────────────┐
│ Biometric Lock            [OFF]  │
└──────────────────────────────────┘
```
Standard iOS Switch, `trackColor` when on = `colors.primary`.

---

## Edge cases

- Device has no biometric hardware → hide toggle in Settings, skip lock entirely
- Biometric enrolled but no faces/prints → `authenticateAsync` returns `{ success: false }` → show "Try Again"
- User kills app during lock → next launch, lock appears again (correct)
- User logs out → biometric setting stays in SQLite but doesn't matter (no JWT = login screen)
- App backgrounds and returns → no re-lock (only on fresh launch). Re-lock on background is a future enhancement.

---

## Verification

```bash
cd mobile && npx tsc --noEmit   # 0 errors
```

Manual test:
1. Settings → SECURITY section visible (on device with biometrics)
2. Toggle ON → Face ID prompt → on success, toggle stays on
3. Kill app → relaunch → lock screen appears → Face ID → unlocks to tabs
4. Settings → toggle OFF → kill app → relaunch → no lock screen
5. Simulator without biometrics → SECURITY section hidden

---

## Git

Branch: `feat/task-020-biometric-auth`
Commit message: `feat(mobile): biometric authentication with Face ID / Touch ID (#020)`

After completing the task:
1. Commit all changes
2. Push and create PR to `main`
3. Write result to `docs/result.md`

---

## Result

After completing this task, write the result to `docs/result.md` (overwrite completely).
