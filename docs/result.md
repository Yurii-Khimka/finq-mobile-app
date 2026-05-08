# result.md — Task Result

> Written by Claude Code (developer) after every completed task.
> ALWAYS overwritten — never appended.
> One result per session. Previous results are replaced.
> Read by the planner to validate progress and decide the next step.

---

## Task
TASK-008 — Auth screens (Login + Register) with real API

## Status
COMPLETED

## What was done

### 1. API client — auth endpoints made functional
- Fixed `login()` in `mobile/src/api/client.ts`: backend uses JSON body with `email`/`password` (not OAuth2 form-encoded). Changed from `POST /auth/token` with form data to `POST /auth/login` with JSON body.
- `register()` was already correct (JSON POST to `/auth/register`).

### 2. Login screen (`mobile/app/(auth)/login.tsx`)
- Email + password inputs with dark theme styling
- "Log in" button with loading spinner, disabled when fields empty
- Error handling: 401 → "Invalid email or password", else → "Cannot connect to server"
- On success: saves JWT via `saveToken()`, replaces to `/(tabs)`
- Link to register screen
- Wrapped in `KeyboardAvoidingView` + `SafeAreaView`

### 3. Register screen (`mobile/app/(auth)/register.tsx`)
- Email + password + confirm password inputs
- Client-side validation: passwords must match
- On success: registers, then auto-login, saves token, redirects to `/(tabs)`
- Error handling: 409 → "Email already registered", else → "Cannot connect to server"
- Link back to login screen

### 4. Auth gate (root layout)
- Already functional from TASK-007 — no changes needed
- Checks `isAuthenticated()` on mount, redirects accordingly

### 5. Logout in Settings (`mobile/app/(tabs)/settings.tsx`)
- Added red "Log out" button
- Calls `clearToken()` then `router.replace('/(auth)/login')`

### 6. Auth layout update
- Hid Stack header in `(auth)/_layout.tsx` since screens render their own title

## Files changed
- `mobile/src/api/client.ts` — fixed login endpoint (JSON body, correct path)
- `mobile/app/(auth)/_layout.tsx` — hide header
- `mobile/app/(auth)/login.tsx` — full login screen
- `mobile/app/(auth)/register.tsx` — full register screen
- `mobile/app/(tabs)/settings.tsx` — added logout button

## Verification
```
cd mobile && npx tsc --noEmit  → 0 errors
```

## Notes
- Backend login uses `LoginRequest` (JSON with `email`/`password`), not `OAuth2PasswordRequestForm`. The plan's note about form-encoding was incorrect — fixed based on actual `backend/routers/auth.py`.
- Register endpoint returns a token directly, but auto-login is done separately for consistency with the plan.

## Changelog entry
- **TASK-008:** Login and register screens with JWT auth, logout button, API client fix
