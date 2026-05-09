# result.md — Task Result

> Written by Claude Code (developer) after every completed task.
> ALWAYS overwritten — never appended.
> One result per session. Previous results are replaced.
> Read by the planner to validate progress and decide the next step.

---

## Task
TASK-024 — Refresh tokens, token revocation, and auth hardening

## Status
COMPLETED

## What was done

### 1. Backend: RefreshToken model + migration
- Created `backend/models/refresh_token.py` — `refresh_tokens` table with id, user_id, token, expires_at, revoked, created_at
- Added manual Alembic migration `b5e8f1c2d3a4_add_refresh_tokens_table.py` (revises initial schema)
- Registered model in `backend/models/__init__.py`

### 2. Backend: auth.py — token lifecycle functions
- `create_access_token()` — now uses configurable 15-min expiry (was 60 min)
- `create_refresh_token(user_id, db)` — generates 64-char hex token, stores in DB, 30-day expiry
- `validate_refresh_token(token, db)` — checks not revoked, not expired, returns user
- `revoke_refresh_token(token, db)` — revokes single token
- `revoke_all_user_tokens(user_id, db)` — revokes all user's refresh tokens

### 3. Backend: schemas/auth.py — validation + response
- `RegisterRequest.password` — field_validator: min 8 chars, at least one digit, at least one letter
- `TokenResponse` — added `refresh_token` and `expires_in` (900s) fields
- Added `RefreshRequest` schema

### 4. Backend: routers/auth.py — new endpoints
- `/register` and `/login` — now return both access_token and refresh_token
- `POST /auth/refresh` — validates refresh token, rotates (revoke old + issue new pair)
- `POST /auth/logout` — revokes all refresh tokens for authenticated user

### 5. Backend: config.py — configurable expiry
- `ACCESS_TOKEN_EXPIRE_MINUTES` (default 15)
- `REFRESH_TOKEN_EXPIRE_DAYS` (default 30)

### 6. Mobile: AuthTokens type
- Added `refresh_token` and `expires_in` fields to `AuthTokens` interface

### 7. Mobile: store/auth.ts — dual token storage
- `saveTokens(access, refresh)` — stores both in SecureStore
- `getRefreshToken()` — retrieves refresh token
- `clearToken()` — deletes both tokens

### 8. Mobile: api/client.ts — automatic 401 retry
- `tryRefreshToken()` — calls `/auth/refresh`, saves new tokens on success
- `request()` — on 401, attempts token refresh then retries (skips for /auth/refresh and /auth/login)
- Added `auth.logout()` API method

### 9. Mobile: login.tsx + register.tsx
- Updated to use `saveTokens(access_token, refresh_token)` instead of `saveToken(access_token)`
- Register now uses single call (register returns tokens directly, no separate login call)
- Register shows password validation error on 422

### 10. Mobile: settings.tsx — server-side logout
- Logout calls `auth.logout()` before clearing local tokens (best-effort)

## Verification
```
cd mobile && npx tsc --noEmit  # 0 errors
```

## Files created
- `backend/models/refresh_token.py`
- `backend/alembic/versions/b5e8f1c2d3a4_add_refresh_tokens_table.py`

## Files modified
- `backend/auth.py`
- `backend/config.py`
- `backend/models/__init__.py`
- `backend/routers/auth.py`
- `backend/schemas/auth.py`
- `mobile/src/api/client.ts`
- `mobile/src/store/auth.ts`
- `mobile/src/types/finance.ts`
- `mobile/app/(auth)/login.tsx`
- `mobile/app/(auth)/register.tsx`
- `mobile/app/(tabs)/settings.tsx`

## Changelog entry
- **TASK-024:** Access + refresh token system with 15-min access / 30-day refresh, token rotation, server-side revocation, password strength validation, and automatic 401 retry in mobile client
