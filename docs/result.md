# result.md — Task Result

> Written by Claude Code (developer) after every completed task.
> ALWAYS overwritten — never appended.
> One result per session. Previous results are replaced.
> Read by the planner to validate progress and decide the next step.

---

## Task
TASK-012 — History screen with day groups, filters, and swipe-to-delete

## Status
COMPLETED

## What was done

### 1. SwipeableRow component (`mobile/src/components/SwipeableRow.tsx`)
- Animated + PanResponder horizontal swipe, left-to-reveal red Delete button
- Swipe threshold at -40px, clamped to -80px (DELETE_WIDTH)
- Tap Delete → confirmation Alert, then calls onDelete callback
- Cancel snaps row back with spring animation

### 2. History screen (`mobile/app/(tabs)/history.tsx`)

**Filter bar (two rows):**
- Date pills: "All", "This Month", plus month names derived from data (e.g. "May", "Apr")
- Envelope pills: "All Envelopes", "Mandatory", "Non-Mandatory", "Investments", "Dreams"
- Active pill: `colors.primary` bg, white text; inactive: `colors.surface` bg with border
- Date filter triggers API re-fetch; envelope filter is client-side

**Transaction list (SectionList, grouped by day):**
- Sections grouped by YYYY-MM-DD, sorted descending
- Section headers: "Today", "Yesterday", "May 7", etc. (sticky)
- Each row: category (bold) + envelope (grey) on left; amount (red/green) + FX original + time on right
- Swipe-to-delete on every row via SwipeableRow

**Summary bar:**
- Shows transaction count and total spent (expenses only)
- Updates when filters change

**Empty state:**
- 📋 icon + "No transactions" or "No transactions match filters"

**Pull-to-refresh:**
- RefreshControl re-fetches with current date filter

**Error handling:**
- 401 → login redirect
- Generic errors shown inline

## Files changed
- `mobile/src/components/SwipeableRow.tsx` — NEW: swipeable row with delete action
- `mobile/app/(tabs)/history.tsx` — replaced placeholder with full history screen

## Verification
```
cd mobile && npx tsc --noEmit  → 0 errors
```

## Changelog entry
- **TASK-012:** History screen with day-grouped SectionList, date/envelope filters, swipe-to-delete, pull-to-refresh, and summary bar
