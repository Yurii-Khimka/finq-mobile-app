# finQ — Session & Project Roadmap

> Central strategic document. Updated by the planner after each major milestone.
> Last updated: 2026-05-08

---

## Project Overview

**finQ** is a terminal-first personal finance OS built in Python.
The goal is to migrate it into a production-ready native iOS application
while keeping the terminal app as a stable, independent tool.

The terminal app is the **source of truth for all business logic.**
The mobile app is a new interface layer on top of that logic.

---

## Repository Structure

```
finq-terminal/          ← original repo, untouched, stable reference
finq-app/               ← new repo, mobile migration workspace
  ├── backend/          ← FastAPI server (wraps terminal logic)
  ├── mobile/           ← Expo / React Native app
  ├── shared/           ← types, constants, category definitions
  └── docs/             ← session.md, chat.md, plan.md, result.md
```

**Rule:** `finq-terminal` is read-only during mobile development.
Copy logic, never modify the original.

---

## Architecture

```
iOS App (Expo + React Native)
  └── SQLite  ← local database, always available (offline-first)
       ↕ background sync when online
FastAPI Backend
  └── PostgreSQL  ← server database, source of truth
       ← migrated from balances.json + history.csv + categories.json
```

### Key Decisions (Locked)

| Decision | Choice | Reason |
|---|---|---|
| Backend language | Python (FastAPI) | Runs existing core.py directly |
| Mobile framework | React Native + Expo | Prototype already in React |
| Primary currency | USD (display) | UAH stored internally |
| Offline strategy | Offline-first, SQLite local | Finance app must work without internet |
| Auth (MVP) | Single user, JWT | No multi-user until post-MVP |
| iOS/Android | iOS first | Target audience, simpler start |
| Backend keys | Match terminal exactly | `non_mandatory` not `optional` |
| Conflict resolution | Last write wins (device authoritative) | Simple, sufficient for single user |

### Envelope Keys (Never Change)

```
mandatory       50%
non_mandatory   30%
investments     10%
dreams          10%
```

---

## MVP Scope

### Backend
- [ ] FastAPI project setup
- [ ] PostgreSQL schema (replaces JSON + CSV)
- [ ] Migrate all FinanceManager methods to API endpoints
- [ ] JWT authentication (single user)
- [ ] NBU rate fetching endpoint
- [ ] Data migration script (CSV + JSON → Postgres)

### Mobile App
- [ ] Expo project setup
- [ ] Design token system (from prototype tokens.css)
- [ ] Home screen (balance, envelopes, recent transactions)
- [ ] Add Expense flow (NumPad + category picker)
- [ ] Add Income flow
- [ ] History screen (grouped by day, filter by envelope/month)
- [ ] Audit screen (burn rate, breach list)
- [ ] Settings screen (display currency, sync, reset)
- [ ] Offline-first SQLite integration
- [ ] Background sync with backend
- [ ] Dark / Light / Monochrome theme switcher

### Infrastructure
- [ ] VPS setup (Hetzner CX11, ~€4/month)
- [ ] PostgreSQL on server
- [ ] SSL via Caddy + Let's Encrypt
- [ ] Sentry (free tier, crash reporting)

### App Store
- [ ] Apple Developer account ($99/year)
- [ ] App icons + screenshots
- [ ] Privacy policy page
- [ ] Landing page (Vercel/Netlify, free)
- [ ] TestFlight beta
- [ ] App Store submission

### Themes
- [ ] Light mode
- [ ] Dark mode
- [ ] Monochrome mode (optional, user setting)

---

## What Was Removed from Prototype (Cleanup)

These elements existed in the Lovable/v0 prototype and are **excluded from MVP:**

- `1208 XP` badge — gamification noise
- `FX Source` setting — not user-relevant
- `Discipline Block` — unclear concept
- `Show Terminal Echo` — developer debug tool
- Date-related debug elements
- Activity HeatMap widget — hardcoded fake data, not real yet

---

## Launch Roadmap

### Phase A — Backend Foundation (Weeks 1–3)
Set up FastAPI. Wrap all FinanceManager methods as HTTP endpoints.
Migrate data to PostgreSQL. Test all waterfall logic over HTTP.

### Phase B — Mobile Core (Weeks 4–9)
Expo project. Port design system. Build all core screens.
Home → Expense → Income → History → Audit → Settings.
Wire up real API data. Implement offline SQLite layer.

### Phase C — Polish + Store Prep (Weeks 10–13)
Category icons. Pastel colour pass. Theme switcher (light/dark/mono).
App Store metadata. Privacy policy. TestFlight → review → release.

**Total estimate: 9–13 weeks to App Store release.**

---

## Budget (MVP, First Year)

| Item | Cost |
|---|---|
| VPS (Hetzner CX11) | ~€48/year |
| Domain | ~$15/year |
| Apple Developer | $99/year |
| Google Play (future) | $25 one-time |
| SSL | Free |
| Sentry | Free tier |
| Hosting (website) | Free (Vercel) |
| **Total** | **~$170–180/year** |

---

## Post-MVP Plans

> These are confirmed ideas for after the MVP is released.
> They do not affect current priorities.

- **Multi-user support** — accounts, separate datasets per user
- **Android app** — Google Play release after iOS is stable
- **Conflict resolution upgrade** — proper sync with CRDTs or timestamp strategy
- **Multi-device sync** — same account across iPhone + iPad

---

## Future Plans

> Ideas discussed and noted. Not scheduled. Not blocking MVP.

- **Terminal ↔ Mobile UI switcher** — power users can toggle between dense terminal-style view and standard card UI. Same data, two rendering modes. API must stay UI-agnostic.
- **Widgets / Live Activities** — envelope balances on home screen, Dynamic Island burn rate
- **Advanced analytics** — spending trends, month-over-month comparison, category forecasts
- **Smart budgeting suggestions** — AI-based recommendations based on history
- **AI assistance** — natural language expense entry ("spent 50 on coffee") via voice or text
- **Anomaly detection** — alerts for unusual spending in a category
- **Days to Zero forecast** — predictive model based on burn rate (Phase 4 in terminal roadmap)
- **Automation** — recurring transactions, scheduled income entries
- **Export** — PDF/CSV report generation

---

## Repository Strategy

Two separate repositories. No forks.

```
finq-terminal/    ← original repo, read-only, stable logic reference
finq-app/         ← new repo, mobile migration workspace
  backend/
  mobile/
  shared/
  docs/           ← session.md, chat.md, plan.md, result.md
```

`finq-terminal` is never modified during mobile development.
It exists as the source of truth for business logic.

---

## Git Workflow Rules

### Before Starting a New Task
1. Confirm previous branch is merged
2. Delete old feature branch (local + remote)
3. Push updated `result.md` to GitHub
4. Only then create a new branch

### During a Task
1. Create branch from `main`: `type/task-NNN-short-description`
2. Implement changes
3. Commit with format: `type(scope): description (#NNN)`
4. Write result to `result.md`

### Branch Naming
Matches task type in `plan.md`:
- `feat/` — new feature or logic
- `fix/` — bug fix
- `chore/` — setup, config, tooling
- `docs/` — documentation only

### Principle
Every task must be isolated, reversible, and easy to roll back.
This is especially important while architecture is still stabilising.

---

## Current Status

> Updated by planner at the end of each session.

**Stage:** Pre-development. Planning complete.
**Next step:** Repository setup + FastAPI project scaffold.
**Blockers:** None.
