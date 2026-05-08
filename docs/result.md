# result.md — Task Result

> Written by Claude Code (developer) after every completed task.
> ALWAYS overwritten — never appended.
> One result per session. Previous results are replaced.

---

## TASK-017 + TASK-017-fix — Theme switcher (dark / light / monochrome)

### Status: DONE

### Changes

1. **`mobile/src/tokens/index.ts`** — Added `themes` object with three palettes (dark, light, monochrome), including envelope colours per theme. Exported `ThemeName`, `ThemeColors` types. Kept `colors = themes.dark` as fallback.

2. **`mobile/src/db/queries.ts`** — Added generic `getConfigValue(key)` and `setConfigValue(key, value)` helpers for the config table.

3. **`mobile/src/context/ThemeContext.tsx`** — New file. `ThemeProvider` wraps app, loads saved theme from SQLite on mount, exposes `useTheme()` hook returning `{ theme, colors, setTheme }`.

4. **`mobile/app/_layout.tsx`** — Wrapped in `<ThemeProvider>`. Extracted `RootContent` inner component to use `useTheme()`. StatusBar dynamically switches between `dark`/`light` style. Offline/pending bars use dynamic colours.

5. **`mobile/app/(tabs)/_layout.tsx`** — Tab bar colours now come from `useTheme()`.

6. **`mobile/app/(auth)/_layout.tsx`** — Replaced static `colors` import with `useTheme()` so auth screens respect the active theme.

7. **`mobile/app/(tabs)/settings.tsx`** — Added THEME section with segmented control (Dark / Light / Mono) above currency selector. All styles dynamic via `useMemo`.

8. **All screens rewired** — `index.tsx`, `expense.tsx`, `income.tsx`, `history.tsx`, `audit.tsx`, `login.tsx`, `register.tsx` — replaced static `colors` import with `useTheme()` hook, styles wrapped in `useMemo(() => StyleSheet.create(...), [colors])`.

9. **Components rewired** — `SwipeableRow.tsx`, `NumPad.tsx` — same pattern.

10. **Envelope colours** — Hardcoded envelope colours (`#EC4899`, etc.) replaced with theme-aware `colors.envelopeMandatory`, `colors.envelopeNonMandatory`, `colors.envelopeInvestments`, `colors.envelopeDreams`. Monochrome uses grey variants.

### Verification

```
cd mobile && npx tsc --noEmit   # 0 errors
```

### Not changed

- Backend — untouched
- Screen logic, data fetching, offline behaviour — untouched
- `fontSize` and `spacing` tokens — remain static
- Layout structure — unchanged (only wrapped root in ThemeProvider)
