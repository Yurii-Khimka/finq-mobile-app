# result.md — Task Result

> Written by Claude Code (developer) after every completed task.
> ALWAYS overwritten — never appended.
> One result per session. Previous results are replaced.
> Read by the planner to validate progress and decide the next step.

---

## Task
TASK-013 — Audit screen with health signal, burn rate, breaches, sustainability, anomalies, and advisor

## Status
COMPLETED

## What was done

### Audit screen (`mobile/app/(tabs)/audit.tsx`)

Replaced placeholder with full scrollable audit dashboard. Fetches all 4 endpoints in parallel on mount.

**Health Signal card (top):**
- Large pill badge: "Healthy" (green), "Warning" (yellow), "Critical" (red)
- Spendable balance (large), safe daily limit, days remaining

**Burn Rate section:**
- Daily burn rate in UAH
- Projection: "On track" (green) / "Overspending" (red) / "No spending yet" (grey)
- Total spent so far

**Breach Summary:**
- If 0 breaches: green "No breaches this month"
- If breaches: count + total, envelope breakdown with colored dots, top 5 breach details

**Sustainability (per-envelope):**
- Mandatory & Non-Mandatory: daily burn, days to zero, safe daily limit with colored left border
- Investments & Dreams: simplified "Reserve envelope" display

**Spending Spikes (anomalies):**
- Hidden if empty; sorted by ratio descending
- Category name, 7-day vs average amounts, ratio badge in warning color

**Advisor Insight:**
- Prose text card at bottom; hidden silently if fetch fails

**Loading/Error/Refresh:**
- Centered spinner while loading, error state with retry button
- 401 → login redirect, pull-to-refresh re-fetches all endpoints

## Files changed
- `mobile/app/(tabs)/audit.tsx` — replaced placeholder with full audit dashboard

## Verification
```
cd mobile && npx tsc --noEmit  → 0 errors
```

## Changelog entry
- **TASK-013:** Audit screen with health signal, burn rate, breach summary, sustainability cards, anomaly spikes, and AI advisor insight
