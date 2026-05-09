# result.md — Task Result

> Written by Claude Code (developer) after every completed task.
> ALWAYS overwritten — never appended.
> One result per session. Previous results are replaced.
> Read by the planner to validate progress and decide the next step.

---

## Task
TASK-025 — Rate limiting, CORS lockdown, SSL fix, logging, and security headers

## Status
COMPLETED

## What was done

### 1. Rate limiting with slowapi
- Created `backend/limiter.py` — shared Limiter instance (avoids circular imports)
- Auth endpoints: `/login` 5/min, `/register` 3/min, `/refresh` 10/min
- All finance endpoints: 60/min
- Added `request: Request` param to all rate-limited endpoints
- Registered `RateLimitExceeded` handler in `main.py`

### 2. CORS lockdown
- Replaced `allow_origins=["*"]` with configurable `ALLOWED_ORIGINS` from env
- Defaults to `http://localhost:8081,http://localhost:19006` (Expo dev)
- Restricted `allow_methods` and `allow_headers` to only what's needed

### 3. Security headers middleware
- Added `SecurityHeadersMiddleware` in `main.py`
- Headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, HSTS

### 4. SSL fix in NBU rate fetching
- Replaced `ssl._create_unverified_context()` with `ssl.create_default_context(cafile=certifi.where())`
- Added `timeout=10` to `urllib.request.urlopen()`
- Added `certifi` to requirements.txt

### 5. Structured logging
- Created `backend/logging_config.py` with formatted stdout handler
- Added audit logging to auth endpoints (login attempts, success/failure, register, logout)
- Suppressed noisy `uvicorn.access` logs

### 6. Mobile: HTTPS enforcement + request timeouts
- Production HTTPS check: throws if `BASE_URL` is not HTTPS in non-dev builds
- Added `fetchWithTimeout()` wrapper with 15s default timeout
- Applied to all `fetch()` calls in `request()` and `tryRefreshToken()`

### 7. Config updates
- `ALLOWED_ORIGINS` env var in `backend/config.py`

## Verification
```
python3.11 -c "from backend.main import app; print('OK')"  # OK
cd mobile && npx tsc --noEmit  # 0 errors
```

## Files created
- `backend/limiter.py`
- `backend/logging_config.py`

## Files modified
- `backend/main.py`
- `backend/config.py`
- `backend/requirements.txt`
- `backend/routers/auth.py`
- `backend/routers/finance.py`
- `mobile/src/api/client.ts`

## Changelog entry
- **TASK-025:** Rate limiting (slowapi), CORS lockdown, security headers, SSL-verified NBU calls with timeout, structured auth logging, mobile HTTPS enforcement and 15s request timeouts
