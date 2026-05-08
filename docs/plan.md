# plan.md — Active Task

> Always contains ONE task only.
> Rewritten by the planner before every new implementation session.
> Optimised for AI clarity, not human documentation.

---

## Active Task

**TASK-018 — Category icons in expense flow and history**
Goal: Map each spending category to an icon (Ionicons) and display it in the expense category picker, history transaction rows, and home screen recent transactions. Entering Phase C (Polish).

**Pre-step:** Commit + PR all TASK-017 changes first (see below).

---

## Pre-step: Commit + PR for TASK-017

Before starting TASK-018, finalise the previous task:

1. Commit all current changes on branch `feat/task-017-theme-switcher`:
   ```
   feat(mobile): dark/light/monochrome theme switcher with persistence (#017)
   ```
2. Push and create PR to `main`:
   - Title: `feat(mobile): dark/light/monochrome theme switcher with persistence (#017)`
   - Body: summary of what changed (ThemeContext, three palettes, settings selector, all screens rewired, SQLite persistence)
3. **Do not merge** — just create the PR, then continue to TASK-018.
4. Create new branch from current: `feat/task-018-category-icons`

---

## Context

Categories are fetched from the backend as `{ name, envelope_name }`. They appear as plain text chips in the expense screen and plain text rows in history/home. There are no icons anywhere.

Phase C starts with category icons — a visual polish pass. The icon mapping lives entirely on the client. No backend changes needed.

The app already uses `@expo/vector-icons` (Ionicons) for the tab bar, so no new dependency.

---

## What Must NOT Be Changed

- Do not modify anything in `backend/`
- Do not change the `CategoryResponse` type or API contract
- Do not change category selection logic or expense/income flow behaviour
- Do not change theme system — just consume `useTheme()` as all screens already do

---

## Read First

- `mobile/app/(tabs)/expense.tsx` — category picker (chips with dot + text)
- `mobile/app/(tabs)/history.tsx` — transaction rows
- `mobile/app/(tabs)/index.tsx` — recent transaction rows
- `mobile/src/types/finance.ts` — `CategoryResponse` shape

---

## Step-by-step

### 1. Create icon map (`mobile/src/utils/categoryIcons.ts`)

NEW file. Maps category names (lowercase) to Ionicons icon names:

```typescript
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

const CATEGORY_ICONS: Record<string, IconName> = {
  // Mandatory
  rent: 'home-outline',
  utilities: 'flash-outline',
  groceries: 'cart-outline',
  transport: 'bus-outline',
  health: 'medkit-outline',
  insurance: 'shield-outline',
  phone: 'call-outline',
  internet: 'wifi-outline',
  
  // Non-mandatory
  dining: 'restaurant-outline',
  entertainment: 'game-controller-outline',
  clothing: 'shirt-outline',
  subscriptions: 'card-outline',
  gifts: 'gift-outline',
  coffee: 'cafe-outline',
  personal: 'person-outline',
  beauty: 'sparkles-outline',
  
  // Investments
  stocks: 'trending-up-outline',
  crypto: 'logo-bitcoin',
  savings: 'wallet-outline',
  
  // Dreams
  travel: 'airplane-outline',
  gadgets: 'laptop-outline',
  education: 'school-outline',
};

const DEFAULT_ICON: IconName = 'pricetag-outline';

export function getCategoryIcon(categoryName: string): IconName {
  return CATEGORY_ICONS[categoryName.toLowerCase()] ?? DEFAULT_ICON;
}
```

This is a best-effort map. Unknown categories get a generic tag icon. The map can be extended later without changing any component code.

### 2. Add icon to expense category chips (`mobile/app/(tabs)/expense.tsx`)

Currently each chip shows: `[dot] Category Name`

Change to: `[icon] Category Name`

Replace the coloured dot (`chipDot` view) with an `<Ionicons>` using `getCategoryIcon(cat.name)`. Keep the envelope colour as the icon colour.

```tsx
import { Ionicons } from '@expo/vector-icons';
import { getCategoryIcon } from '../../src/utils/categoryIcons';

// In the chip:
<Ionicons
  name={getCategoryIcon(cat.name)}
  size={16}
  color={envelopeColors[cat.envelope_name] ?? colors.textSecondary}
  style={{ marginRight: 6 }}
/>
```

Remove the `chipDot` View and its style.

### 3. Add icon to history transaction rows (`mobile/app/(tabs)/history.tsx`)

Each transaction row currently shows category name as text. Add a small icon before the category text.

Read the file first to understand the row structure. Add the icon inline before the category text, using `getCategoryIcon(tx.category)`.

Icon size: 16. Colour: `colors.textSecondary`. Small gap (4–6px) before the text.

### 4. Add icon to home screen recent transactions (`mobile/app/(tabs)/index.tsx`)

Same pattern as history. Each `txRow` shows `tx.category` — add icon before it.

Icon size: 16. Colour: `colors.textSecondary`. Same spacing.

### 5. Income screen — no change needed

Income doesn't use category chips the same way (it's just an amount + distribution preview). Skip it.

---

## UI spec

**Expense chips (after):**
```
[ 🏠 Rent ]  [ ⚡ Utilities ]  [ 🛒 Groceries ]
```
(Icons replace the coloured dots. Envelope colour applied to icon instead of dot.)

**History/Home rows (after):**
```
🛒 Groceries          -₴1,200.00
   May 7, 2026           mandatory
```
(Small icon before category name. Subtle, not dominant.)

---

## Edge cases

- Unknown category name → falls back to `pricetag-outline`
- Category names are case-insensitive in the map (`.toLowerCase()`)
- Icon map is static — no async loading, no performance concern

---

## Verification

```bash
cd mobile && npx tsc --noEmit   # 0 errors
```

Manual test:
1. Expense screen → category chips show icons instead of dots
2. Home screen → recent transactions have icons before category names
3. History screen → transaction rows have icons before category names
4. Icons have correct envelope colours in expense chips
5. Unknown category shows generic tag icon

---

## Git

Branch: `feat/task-018-category-icons`
Commit message: `feat(mobile): category icons in expense picker and transaction rows (#018)`

---

## Result

After completing this task, write the result to `docs/result.md` (overwrite completely).
