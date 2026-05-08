# plan.md — Active Task

> Always contains ONE task only.
> Rewritten by the planner before every new implementation session.
> Optimised for AI clarity, not human documentation.

---

## Active Task

**TASK-001a — Initial commit + push to GitHub**
Goal: commit the completed scaffold to `main` and push to the remote repository. This is a housekeeping step before TASK-002.

---

## Context

TASK-001 (FastAPI scaffold) was completed by Codex. The files exist locally but have never been committed. The repo has no remote set and no commits yet. This must be done before any further work.

---

## What Must NOT Be Changed

- Do not modify any existing files in `backend/` or `docs/`
- Do not stage `.DS_Store`, `.claude/`, `mobile/`, or `shared/` (empty placeholders — added later when they have content)

---

## Read First

- `docs/session.md` — project context

---

## Task Breakdown

**Part 1 — Create `.gitignore` in the repo root**
```
# Python
__pycache__/
*.py[cod]
*.egg-info/
venv/
.env

# macOS
.DS_Store

# IDE
.vscode/
.idea/

# Claude
.claude/
```

**Part 2 — Add remote**
```bash
git remote add origin https://github.com/Yurii-Khimka/finq-mobile-app.git
```

**Part 3 — Stage and commit**
Stage these paths only:
- `.gitignore`
- `backend/`
- `docs/`

Commit message: `feat(backend): initial FastAPI scaffold (#001)`

**Part 4 — Push**
```bash
git push -u origin main
```

**Part 5 — Verify**
`git log --oneline` shows the commit.
`git remote -v` shows the GitHub URL.

---

## Git

Branch: `main` (first commit, no feature branch needed)
Commit message: `feat(backend): initial FastAPI scaffold (#001)`
