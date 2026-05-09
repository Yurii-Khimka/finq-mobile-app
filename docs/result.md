# result.md — Task Result

> Written by Claude Code (developer) after every completed task.
> ALWAYS overwritten — never appended.
> One result per session. Previous results are replaced.
> Read by the planner to validate progress and decide the next step.

---

## Task
TASK-022 — Privacy policy page + GitHub Pages setup

## Status
COMPLETED

## What was done

### 1. Website directory (`website/`)
- `index.html` — placeholder landing page with "Coming soon" message and privacy link
- `privacy.html` — full privacy policy covering all required sections
- `css/style.css` — shared dark-themed styles (bg #0A0A0A, accent #6366F1, system font stack, 720px max-width, responsive)
- `.nojekyll` — disables Jekyll processing on GitHub Pages

### 2. Privacy policy content
Covers: app purpose, data collected (email, financial data), storage (PostgreSQL server, SQLite device, Keychain credentials), no data sharing/analytics/ads, JWT + biometric auth, data retention, user rights (delete from Settings, request account deletion), children's privacy (13+), policy changes, contact (privacy@finq.app placeholder).

### 3. GitHub Actions workflow (`.github/workflows/deploy-website.yml`)
- Triggers on push to `main` when `website/**` files change, or manual dispatch
- Uses `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`
- Deploys only the `website/` directory to GitHub Pages

## Files created
- `website/index.html` — NEW
- `website/privacy.html` — NEW
- `website/css/style.css` — NEW
- `website/.nojekyll` — NEW
- `.github/workflows/deploy-website.yml` — NEW

## Files changed
- `docs/plan.md` — updated for TASK-022
- `docs/result.md` — this file

## Verification
```
ls -la website/          # index.html, privacy.html, css/, .nojekyll
ls -la .github/workflows/ # deploy-website.yml
# Open website/privacy.html in browser — dark theme, all sections present
# Open website/index.html — placeholder with privacy link
```

## Changelog entry
- **TASK-022:** Static privacy policy page, placeholder landing, shared CSS, and GitHub Pages deployment workflow
