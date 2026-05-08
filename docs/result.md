# result.md — Task Result

> Written by Claude Code (developer) after every completed task.
> ALWAYS overwritten — never appended.
> One result per session. Previous results are replaced.

---

## TASK-018 — Category icons in expense flow and history

### Status: DONE

### Pre-step

- Committed TASK-017 on `feat/task-017-theme-switcher`
- Pushed and created PR: Yurii-Khimka/finq-mobile-app#13
- Created new branch `feat/task-018-category-icons`

### Changes

1. **`mobile/src/utils/categoryIcons.ts`** — New file. Maps category names (lowercase) to Ionicons icon names. 22 categories mapped across all four envelopes. Unknown categories fall back to `pricetag-outline`.

2. **`mobile/app/(tabs)/expense.tsx`** — Replaced coloured dot in category chips with `<Ionicons>` using `getCategoryIcon()`. Icon colour matches envelope colour. Removed `chipDot` style.

3. **`mobile/app/(tabs)/history.tsx`** — Added category icon (16px, `textSecondary` colour) before category name in transaction rows.

4. **`mobile/app/(tabs)/index.tsx`** — Same icon treatment for recent transaction rows on the home screen.

### Verification

```
cd mobile && npx tsc --noEmit   # 0 errors
```

### Not changed

- Backend — untouched
- Income screen — no categories to icon
- Category selection logic, expense/income flow — untouched
- Theme system — only consumed via `useTheme()`
