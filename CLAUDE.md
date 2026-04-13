# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> These rules apply to every conversation. Follow them automatically without being asked.

## Project Summary

Semi-automatic job application pipeline. User pastes JD → AI tailors resume + cover letter (markdown) → user reviews/edits in browser → exports PDF on demand.

Key docs:
- `SPEC.md` — source of truth for architecture and component behaviour
- `PLAN.md` — implementation progress tracker
- `REFACTOR_PLAN.md` — v2 refactoring roadmap (Phases 1–4 complete)

---

## Commands

```bash
# Install all dependencies (root + backend + frontend)
npm run install:all

# Development (runs both servers concurrently)
npm run dev
# → backend: http://localhost:3000   (Express + API)
# → frontend: http://localhost:5173  (Vite dev server, proxies /api → :3000)

# Production build (Vite → backend/public/)
npm run build

# Start backend only (serves production build from backend/public/)
npm run start

# Tests (backend only)
cd backend && npm test

# Run a single test file
cd backend && node --test tests/tailor.test.js
```

---

## Architecture

### Two-stage pipeline

```
POST /api/analyze
  JD → Gemini → resume_md + cover_md → saved to DB → returns metadata (no PDF)

User edits markdown in browser editor

GET /api/applications/:id/pdf?type=resume|coverletter
  DB markdown → renderer.js → Puppeteer → PDF stream (on-demand)
```

### Frontend / Backend split

| Mode | Frontend | Backend | Notes |
|------|----------|---------|-------|
| Dev  | Vite on :5173 | Express on :3000 | Vite proxies `/api/*` → :3000 |
| Prod | — | Express on :3000 | Serves `backend/public/` (built by `npm run build`) |

### Key directories

```
backend/
  server.js         — Express; all routes under /api
  tailor.js         — Gemini call (stack + fit_score + detected_skills) + programmatic skill formatting
  coverletter.js    — Gemini fill-in-the-blank for cover letter placeholders
  renderer.js       — Oh-My-CV markdown → HTML; parses YAML front matter + `~ text` right-annotations
  exporter.js       — HTML → PDF via Puppeteer (page.setContent + page.pdf)
  db.js             — All SQLite CRUD via node:sqlite

frontend/src/
  pages/            — NewApplication, History, Editor, Settings, Style, Dashboard
  components/       — AppSidebar + shadcn/ui components in ui/
  lib/api.ts        — Typed fetch wrapper for all /api calls

user/               — EDIT THIS to personalise your instance
  base.md           — Resume template (Oh My CV markdown, 16 {{placeholders}})
  config.json       — Per-stack skill lists + soft_skills.pool
  cover-letter/template.md
  prompts.json      — Gemini prompt strings (editable in Settings UI)

themes/             — CSS files (classic / modern / minimal / compact / bold)
user.config.js      — Active theme name (overridden by GEMINI_MODEL in .env)
```

---

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/analyze` | Stage 1: AI → save markdown to DB |
| GET | `/api/applications` | All records |
| GET | `/api/applications/:id` | Single record |
| PATCH | `/api/applications/:id` | Update any allowed field |
| DELETE | `/api/applications/:id` | Delete record |
| GET | `/api/applications/:id/pdf?type=resume\|coverletter` | On-demand PDF |
| POST | `/api/preview` | Render markdown → HTML (live preview) |
| GET | `/api/prompts` | Get current Gemini prompts |
| PUT | `/api/prompts` | Save prompts to user/prompts.json |
| GET | `/api/style` | Active theme name + CSS |
| PUT | `/api/style` | Save CSS to theme file |
| GET | `/api/style/themes` | All available themes |
| POST | `/api/style/preview` | Render resume with arbitrary CSS |
| GET | `/api/health` | `{ status: "ok" }` |

---

## Automatic Rules

### Rule 1 — Update SPEC.md automatically

Update `SPEC.md` whenever any of the following change:
- API endpoints (added / removed / request or response shape changed)
- File structure (new files added, files removed or renamed)
- Component behaviour (tailor.js, coverletter.js, exporter.js, renderer.js logic)
- Tech stack decisions (new dependency added or removed)
- Environment variables (new keys in .env)
- DB schema (new columns, new tables)

How: read the current SPEC.md first, then make targeted edits to the affected sections only. Do not rewrite unrelated sections.

### Rule 2 — Update PLAN.md automatically

Update `PLAN.md` whenever:
- A task or phase is completed → mark `[x]`, add brief notes column
- A new task is identified → add a row to the appropriate phase
- Architecture decisions are made → update the Component Reference section
- A phase is started → mark tasks `[~]` as they begin

### Rule 3 — Run tests after code changes

After any change to `tailor.js`, `coverletter.js`, `db.js`, or `renderer.js`, run:
```
cd backend && npm test
```
Report pass/fail. If tests fail, diagnose and fix before finishing.

### Rule 4 — REFACTOR_PLAN.md

During active refactor phases, update `REFACTOR_PLAN.md` to:
- Mark phases as complete
- Record decisions made (especially Open Questions that get answered)
- Add new open questions that arise

### Rule 5 — Update CHANGELOG.md on every code change

After any code change in a conversation, update `CHANGELOG.md` with:

```
## YYYY-MM-DD — <short title>

<what changed and why, 2–5 bullet points>
```

- **Same conversation** → keep editing the same entry
- **New conversation** → prepend a new entry at the top
- Imperative mood ("Add", "Fix", "Refactor"); focus on *what* and *why*

---

## Key Conventions

### node:sqlite
- Built-in Node v22+, no npm install needed
- Named params: `:name` syntax (not `@name`)
- `run(data)` takes plain object keys (no `:` prefix)

### Gemini API
- Model set via `GEMINI_MODEL` env var — never hardcode model name
- JSON mode: `generationConfig: { response_mime_type: 'application/json' }`
- Prompts loaded from `user/prompts.json` at runtime (not hardcoded in tailor.js/coverletter.js)

### resume markdown format (user/base.md)
- Uses Oh My CV syntax: `  ~ text` for right-side annotations; YAML front matter for header
- Placeholders: `{{name}}`, `{{summary}}`, `{{job_title_display}}`, skill lines, `{{expN_technologies}}`, `{{expN_bullet_X}}`
- Add `<!-- SOFT_SKILLS_INJECT -->` between experience blocks to mark soft-skill injection point
- `soft_skills.pool` entries must be `{ keyword, bullet }` objects
- Do NOT create separate markdown files per stack — one `base.md` with placeholders only

### config.json schema
- `stacks[key].experiences[]` — array of `{ id, technologies, technologies_variants?, bullet_pool[] }`
- `bullet_pool[]` entries: `{ id, text, must_have, tags, stack_variant? }`
- `job_roles[key].experience_slots` — `{ exp1: N, exp2: M }` maps experience IDs to slot counts
- `stack_variant` on a bullet: `"python_django"` or `"python_fastapi"` — entry only selected when variant matches

### DB
- Test DB: set `TEST_DB_PATH` env var in tests to avoid touching production DB
- All CRUD in `db.js`, imported by `server.js`
- Status values: `not_started` | `analyzed` | `exported` | `applied` | `interview` | `rejected`
- `updateApplication` accepts any column in `applications` table — caller controls what to update

### Frontend
- React + TypeScript + Vite + Tailwind + shadcn/ui
- All API calls go through `frontend/src/lib/api.ts`
- Path alias `@/` resolves to `frontend/src/`
- Production build output: `backend/public/` (served by Express as SPA fallback)

### renderer.js
- `renderResume(markdown, theme)` — reads CSS from `themes/<theme>.css`
- `renderResumeWithCss(markdown, css, theme)` — uses provided CSS string (for live style preview)
- `renderCoverLetter(markdown)` — simple HTML for cover letter PDF
- Two-column layout triggered by theme's CSS (modern theme uses `.two-col`)

### exporter.js
- `exportResumePDF(markdown, theme)` → Buffer
- `exportCoverLetterPDF(markdown)` → Buffer
- Both use `page.setContent()` + `page.pdf({ printBackground: true })`
- No Oh My CV dependency — renders directly from `renderer.js` HTML

---

## Environment Variables (`backend/.env`)

```
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash
OUTPUT_DIR=../output          # optional, PDFs streamed directly (not saved to disk in v2)
```

Oh My CV (`OHMYCV_PATH`, `OHMYCV_PORT`) has been removed — no longer needed.

---

## Known Gotchas

1. `formatSkillList` in tailor.js: first skill is ALWAYS bold, regardless of `detected_skills`
2. Puppeteer `page.pdf()` requires `printBackground: true` to render coloured elements
3. `node:sqlite` does NOT support WAL mode toggle via pragma in all versions — keep default journal mode
4. `user.config.js` is not cached (`delete require.cache[...]`) so live theme changes take effect without restart
5. Soft skill bullets are injected at the `<!-- SOFT_SKILLS_INJECT -->` marker in `base.md` (placed between experience blocks); marker is always removed from output
