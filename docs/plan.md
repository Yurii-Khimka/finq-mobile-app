# plan.md — Active Task

> Always contains ONE task only.
> Rewritten by the planner before every new implementation session.
> Optimised for AI clarity, not human documentation.

---

## Active Task

**TASK-022 — Privacy policy page + GitHub Pages setup**
Goal: Create a `website/` directory with a static privacy policy page. Configure GitHub Pages deployment. This unblocks the App Store submission (Apple requires a privacy policy URL).

The landing page and feedback form will come later once the design is ready from Claude Design.

---

## Context

Apple requires a public privacy policy URL before App Store submission. The project has no website yet. The plan is to host everything on GitHub Pages (free, no extra infra).

This task sets up the website skeleton and ships the privacy policy first. The landing page design will be created separately in Claude Design and implemented in a future task.

---

## What Must NOT Be Changed

- Do not modify anything in `backend/` or `mobile/`
- Do not create a landing page — that comes later with the Claude Design

---

## Read First

- Repo root structure (`backend/`, `mobile/`, `shared/`, `docs/`)
- `mobile/app.json` — app name, bundle ID for privacy policy reference

---

## Step-by-step

### 1. Create `website/` directory at repo root

```
website/
├── index.html          ← placeholder (will become landing page later)
├── privacy.html        ← privacy policy (this task)
├── css/
│   └── style.css       ← shared styles
└── .nojekyll           ← tells GitHub Pages to skip Jekyll processing
```

### 2. Write shared styles (`website/css/style.css`)

Minimal, clean styles matching the finQ dark brand:

- Background: `#0A0A0A`
- Text: `#F5F5F5`
- Accent: `#6366F1` (indigo)
- Font: system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', ...`)
- Max content width: 720px, centred
- Responsive (works on mobile browser too)
- Headings in white, body text in `#A3A3A3`
- Links in `#6366F1`

### 3. Write privacy policy (`website/privacy.html`)

Standard mobile app privacy policy for a personal finance app. Must cover:

**Required sections:**
- What the app does (personal finance tracking)
- Data collected (email, financial data: balances, transactions, categories)
- How data is stored (server: PostgreSQL, device: SQLite, credentials: iOS Keychain via SecureStore)
- Data sharing (none — no third-party analytics, no ads, no data sales)
- Authentication (JWT, biometric is local only)
- Data retention (kept until user deletes account)
- User rights (can delete all data from Settings, can request account deletion)
- Children's privacy (not designed for under 13)
- Contact information (email — use a placeholder like `privacy@finq.app`, the user can update later)
- Changes to policy (will update this page, effective date shown)

**Header:** "finQ — Privacy Policy"
**Footer:** "Last updated: May 2026" + link back to home

**Tone:** Simple, clear, not legal jargon. Short paragraphs.

### 4. Write placeholder index (`website/index.html`)

Simple page:
- "finQ" title
- "Coming soon" message
- Link to privacy policy
- Same dark styling

This will be replaced by the full landing page later.

### 5. Add `.nojekyll` file

Empty file at `website/.nojekyll` — prevents GitHub Pages from running Jekyll.

### 6. Configure GitHub Pages

Add GitHub Actions workflow at `.github/workflows/deploy-website.yml`:

```yaml
name: Deploy Website
on:
  push:
    branches: [main]
    paths: ['website/**']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: website
      - id: deployment
        uses: actions/deploy-pages@v4
```

This deploys only the `website/` directory to GitHub Pages when files in it change on `main`.

---

## UI spec

**Privacy policy page:**
- Dark background, light text
- finQ logo/title at top (text, not image)
- Clean typography, generous spacing
- Sections with clear headings
- Subtle border between sections
- Footer with last updated date
- Mobile-responsive (readable on iPhone Safari)

---

## Verification

Open `website/privacy.html` in browser — should render correctly with dark styling.
Open `website/index.html` — should show placeholder with link to privacy.

```bash
# Quick check files exist
ls -la website/
ls -la .github/workflows/
```

---

## Git

Branch: `feat/task-022-privacy-page`
Commit message: `feat(website): privacy policy page and GitHub Pages setup (#022)`

After completing the task:
1. Commit all changes
2. Push and create PR to `main`
3. Write result to `docs/result.md`

---

## Result

After completing this task, write the result to `docs/result.md` (overwrite completely).
