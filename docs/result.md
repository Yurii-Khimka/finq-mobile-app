# result.md — Task Result

> Written by Claude Code (developer) after every completed task.
> ALWAYS overwritten — never appended.
> One result per session. Previous results are replaced.
> Read by the planner to validate progress and decide the next step.

---

## Task
TASK-014 — Settings screen with display currency selector, logout, and app info

## Status
COMPLETED

## What was done

### Settings screen (`mobile/app/(tabs)/settings.tsx`)

Replaced placeholder with full settings screen with grouped sections.

**Display Currency section:**
- Segmented control with UAH (₴), USD ($), EUR (€)
- Fetches current config from `finance.getConfig()` on mount
- On change: optimistically updates UI, calls `finance.updateConfig()`
- On error: reverts selection, shows Alert
- Loading indicator while saving

**Account section:**
- "Log Out" button with `colors.danger` background
- Confirmation Alert: "Log out of finQ?" with Cancel / Log Out
- On confirm: `clearToken()` → redirect to login

**About section:**
- Version: 1.0.0 (static)
- Build: MVP (static)
- Row style with border separator

**Danger Zone section:**
- "Reset All Data" row — greyed out (opacity 0.5)
- On press: "Coming soon" Alert
- Section header in `colors.danger`

**General:**
- Pull-to-refresh re-fetches config
- 401 → login redirect
- Proper section grouping with uppercase headers, letterSpacing 1

## Files changed
- `mobile/app/(tabs)/settings.tsx` — replaced placeholder with full settings screen

## Verification
```
cd mobile && npx tsc --noEmit  → 0 errors
```

## Changelog entry
- **TASK-014:** Settings screen with currency selector, logout confirmation, app info, and danger zone placeholder
