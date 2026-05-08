# plan.md — Active Task

> Always contains ONE task only.
> Rewritten by the planner before every new implementation session.
> Optimised for AI clarity, not human documentation.

---

## Active Task

**TASK-019 — App icon and splash screen**
Goal: Replace Expo default assets with a branded finQ icon and splash screen. Configure splash to match active theme background. Phase C — Store Prep.

**Pre-step:** Commit + PR all TASK-018 changes first (see below).

---

## Pre-step: Commit + PR for TASK-018

1. Commit all current changes on branch `feat/task-018-category-icons`:
   ```
   feat(mobile): category icons in expense picker and transaction rows (#018)
   ```
2. Push and create PR to `main`:
   - Title: `feat(mobile): category icons in expense picker and transaction rows (#018)`
   - Body: summary (icon map utility, expense chips now show icons, history + home rows show icons, fallback for unknown categories)
3. **Do not merge** — just create the PR, then continue to TASK-019.
4. Create new branch from current: `feat/task-019-app-icon-splash`

---

## Context

The app currently uses Expo default placeholder assets (icon, splash-icon, adaptive-icon, favicon). These need replacing before TestFlight/App Store submission.

The app identity is **finQ** — a personal finance OS. The icon should be minimal and modern: the letter **Q** or a stylised wallet/coin mark on a dark background (`#0A0A0A`). The splash screen shows the same mark centred on the background colour.

Since we can't generate image files in code, this task focuses on:
- Generating the icon programmatically using `expo-image` or a simple React Native view rendered to an asset
- OR creating SVG-based icons and converting them

**Practical approach:** Use `@expo/vector-icons` to create a simple text-based icon — the word "finQ" or letter "Q" — export as PNG assets using a one-time script, or create them using a canvas library.

**Simplest approach:** Create the icon assets using a Node.js script with the `canvas` package (or `sharp`), generating PNGs at the correct sizes.

---

## What Must NOT Be Changed

- Do not modify anything in `backend/`
- Do not change screen logic or app behaviour
- Do not change theme system — but the splash background should use the dark theme background (`#0A0A0A`) since it shows before the theme loads

---

## Read First

- `mobile/app.json` — current Expo config with asset references and splash config
- `mobile/assets/` — current placeholder files to replace

---

## Step-by-step

### 1. Create icon generation script (`mobile/scripts/generate-icons.js`)

Node.js script using the `canvas` package to generate:

- `icon.png` — 1024×1024, dark background (`#0A0A0A`), white or indigo "Q" lettermark centred
- `splash-icon.png` — 200×200, transparent background, white "Q" lettermark
- `adaptive-icon.png` — 1024×1024, same as icon (Android)
- `favicon.png` — 48×48, same design scaled down

Design spec for the "Q" mark:
- Font: bold, sans-serif system font
- Colour: `#6366F1` (primary indigo) on `#0A0A0A` background
- The "Q" should be large and centred, filling ~60% of the canvas
- Optionally add "finQ" as small text below the Q on the splash icon

Install `canvas` as a dev dependency:
```bash
cd mobile && npm install --save-dev canvas
```

Run the script:
```bash
node scripts/generate-icons.js
```

Output files go directly to `mobile/assets/`, overwriting the Expo defaults.

### 2. Update `app.json` if needed

Current config already points to the correct files. Verify no changes needed. If splash `backgroundColor` is already `#0A0A0A`, leave it.

One change: `userInterfaceStyle` is currently `"dark"`. Leave it — the splash always shows on dark background regardless of saved theme (theme loads after splash dismisses).

### 3. Verify assets

```bash
ls -la mobile/assets/
```

Confirm all four files exist and have reasonable sizes (icon ~50-200KB, favicon small).

---

## Verification

```bash
cd mobile && npx tsc --noEmit   # 0 errors (script is JS, won't affect TS check)
npx expo start                   # visually confirm splash + icon in simulator
```

Manual test:
1. Launch app → splash screen shows finQ mark on dark background
2. Check app icon on home screen — finQ "Q" mark visible
3. Confirm splash dismisses and app loads normally

---

## Git

Branch: `feat/task-019-app-icon-splash`
Commit message: `feat(mobile): branded app icon and splash screen (#019)`

After completing the task:
1. Commit all changes
2. Push and create PR to `main`
3. Write result to `docs/result.md`

---

## Result

After completing this task, write the result to `docs/result.md` (overwrite completely).
