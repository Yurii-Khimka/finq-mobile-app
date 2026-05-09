# plan.md — Active Task

> Always contains ONE task only.
> Rewritten by the planner before every new implementation session.
> Optimised for AI clarity, not human documentation.

---

## Active Task

**TASK-023 — Landing page, feedback form, and privacy page from Claude Design**
Goal: Replace the placeholder `website/` contents with the polished design from Claude Design. Three pages: landing (index.html), feedback form (feedback.html), and privacy policy (privacy.html). Shared CSS/JS with light/dark theme toggle.

---

## Context

The user created a design in Claude Design. The exported bundle is at `/tmp/finq-design/finq/project/site/`. It contains four files:
- `index.html` — landing page with hero, envelope cards, features, how-it-works, CTA
- `feedback.html` — feedback form with reason chips
- `privacy.html` — privacy policy with sticky TOC
- `site.css` — shared design tokens + base styles (light/dark themes)
- `site.js` — shared nav/footer injection + theme toggle

The current `website/` directory has a basic placeholder from TASK-022. Replace it entirely with the Claude Design files, with some adaptations.

---

## What Must NOT Be Changed

- Do not modify anything in `backend/` or `mobile/`
- Do not change the GitHub Actions workflow (`.github/workflows/deploy-website.yml`) — it already deploys `website/` to GitHub Pages
- Preserve the `.nojekyll` file

---

## Read First (source files from Claude Design)

All source files are at `/tmp/finq-design/finq/project/site/`:
- `index.html` — read in full
- `site.css` — read in full
- `site.js` — read in full
- `feedback.html` — read in full
- `privacy.html` — read in full

---

## Step-by-step

### 1. Replace `website/` contents

Delete the old files:
- `website/index.html` (placeholder)
- `website/privacy.html` (basic version)
- `website/css/style.css` (old styles)
- `website/css/` directory

Copy the Claude Design files into `website/`:
```
website/
├── index.html          ← from design bundle
├── feedback.html       ← from design bundle
├── privacy.html        ← from design bundle
├── site.css            ← from design bundle
├── site.js             ← from design bundle
├── .nojekyll           ← keep existing
```

### 2. Adapt links

The design references `../FinQ Prototype.html` in several places (hero CTA, nav "Open app" button, footer). These need to change since there's no prototype on the production site.

Replace ALL references to `../FinQ Prototype.html` with `#` and change button text:
- Nav: "Open app" → "Coming soon" (disabled style, or link to App Store placeholder `#coming-soon`)
- Hero CTA: "Open the prototype" → "Coming to iOS" with a note "App Store — coming soon"
- Footer: "Open prototype" → remove or change to "Coming soon"
- Bottom CTA: "Open prototype" → "Coming to iOS"

**Alternative (simpler):** Replace `../FinQ Prototype.html` with `#` everywhere. The buttons will be dead links for now. When the app is on the App Store, we'll update them with the real link.

**Go with the simpler approach** — just replace the href with `#` and keep the button text as-is. Less risk of breaking the design.

### 3. Copy files verbatim (with link fix)

Copy each file from `/tmp/finq-design/finq/project/site/` to `website/`, applying only the `../FinQ Prototype.html` → `#` replacement. Do NOT modify any other styling, layout, or content.

The CSS and JS files should be copied exactly as-is — they are production-ready.

### 4. Verify structure

```bash
ls -la website/
# Should show: index.html, feedback.html, privacy.html, site.css, site.js, .nojekyll
```

Open `website/index.html` in browser to verify it renders correctly with nav, hero, sections, and footer.

---

## Verification

```bash
ls -la website/
# All 6 files present
```

Open in browser:
1. `index.html` — hero with device illustration, envelope cards, features, how-it-works, CTA, footer
2. `feedback.html` — form with reason chips, info card, success state
3. `privacy.html` — sticky TOC, 9 sections
4. Toggle dark/light theme — works on all pages
5. Nav links between pages work
6. Mobile responsive — hamburger menu on narrow viewport

---

## Git

Branch: `feat/task-023-landing-page`
Commit message: `feat(website): landing page, feedback form, and privacy from Claude Design (#023)`

After completing the task:
1. Commit all changes
2. Push and create PR to `main`
3. Write result to `docs/result.md`

---

## Result

After completing this task, write the result to `docs/result.md` (overwrite completely).
