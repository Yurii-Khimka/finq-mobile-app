# result.md — Task Result

> Written by Claude Code (developer) after every completed task.
> ALWAYS overwritten — never appended.
> One result per session. Previous results are replaced.

---

## TASK-020 — Biometric authentication (Face ID / Touch ID)

### Status: DONE

### Changes

1. **`expo-local-authentication`** — Installed as dependency. Added to `app.json` plugins.

2. **`mobile/app.json`** — Added `NSFaceIDUsageDescription` in `ios.infoPlist` for Face ID permission. Added `expo-local-authentication` to plugins array.

3. **`mobile/app/_layout.tsx`** — Added biometric lock gate. On launch, if user is logged in and `biometric_lock` config is `'true'`, prompts biometric auth before showing tabs. Lock screen shows "finQ" title, lock icon, and unlock button. Failed auth shows error with "Try Again". Auth routing paused while locked.

4. **`mobile/app/(tabs)/settings.tsx`** — Added SECURITY section between THEME and DISPLAY CURRENCY. Shows "Biometric Lock" row with Switch toggle. Only visible if device has biometric hardware and enrollment. Toggling ON prompts biometric verification first. Persists to SQLite via `setConfigValue('biometric_lock', ...)`.

### Verification

```
cd mobile && npx tsc --noEmit   # 0 errors
```

### Not changed

- Backend — untouched
- JWT auth flow, login/register screens — untouched
- Offline behaviour, sync logic — untouched
- Biometric is a local gate only — does not replace server auth
