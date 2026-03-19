# Job Apply Bot — Implementation Plan

> Extension removed from scope — LinkedIn blocks content scripts.
> Input: manual paste via local web UI at localhost:3000.

---

## Status Legend
- `[ ]` not started
- `[~]` in progress
- `[x]` done

---

## Phase 1 — Inputs & Config

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | `resumes/base.md` — universal resume template | `[x]` | Done |
| 2 | `resumes/config.json` — per-stack skill lists + soft skill pool | `[x]` | soft_skills.pool uses `{ keyword, bullet }` objects |
| 3 | `cover-letter/template.md` | `[x]` | Done — has all 6 placeholders |
| 4 | `backend/.env` — Gemini API key + paths | `[x]` | Includes `GEMINI_MODEL=gemini-2.5-flash` |

---

## Phase 2 — Backend

| # | Task | Status | Notes |
|---|------|--------|-------|
| 5 | `backend/db.js` — SQLite setup | `[x]` | uses `node:sqlite` (built-in Node v22+, no native deps) |
| 6 | `backend/server.js` — skeleton (`/health` + `/process` stub) | `[x]` | tested — curl /health → {"status":"ok"} |
| 7 | `backend/tailor.js` — stack detection + resume fill | `[x]` | Gemini JSON mode for stack/skills/score; programmatic for formatting |
| 8 | `backend/coverletter.js` — cover letter placeholder fill | `[x]` | Gemini JSON mode |
| 9 | `backend/exporter.js` — Oh My CV + Puppeteer → PDF | `[x]` | Oh My CV+IndexedDB for resume; plain HTML for cover letter |
| 10 | `backend/server.js` — full `/process` wiring all modules | `[x]` | all modules wired |
| 10a | `backend/server.js` — auto-start Oh My CV + `/cv` reverse proxy | `[x]` | spawns `pnpm dev` on startup, polls 40s, proxies `/cv` → `localhost:5173` via `http-proxy-middleware` |
| 10b | `backend/exporter.js` — remove dev server management | `[x]` | Oh My CV lifecycle moved to server.js; exporter assumes it's already running |
| 10c | `resumes/resume.css` — externalized CSS for PDF export | `[x]` | exporter reads from `resumes/resume.css` at startup; `themeColor` defaults to `#000000` |

---

## Phase 3 — Frontend

| # | Task | Status | Notes |
|---|------|--------|-------|
| 11 | `frontend/index.html` + `app.js` — input form + results UI | `[x]` | single-page with nav |
| 12 | `/applications` history page — table + status update | `[x]` | inline in index.html, inline status PATCH |

---

## Phase 4 — End-to-End Test ✅

| # | Task | Status | Notes |
|---|------|--------|-------|
| 13 | Smoke test: paste JD → POST /process → PDFs generated | `[x]` | Atlassian/Full-Stack-Developer — fit_score: 92, stack: csharp |
| 14 | Verify: SQLite record created, status updatable | `[x]` | DB insert + PATCH /applications/:id confirmed |
| 15 | Verify: PDFs saved to `output/YYYY-MM-DD_Company_Title/` | `[x]` | resume.pdf (72 KB) + cover-letter.pdf (48 KB) |

---

## Phase 5 — Frontend Modernization (Open Source Prep)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 16 | Root `package.json` with `concurrently` dev script | `[x]` | `npm run dev` starts both servers |
| 17 | Init Vite + React + TypeScript project in `frontend/` | `[x]` | Manual scaffold, build outputs to `backend/public/` |
| 18 | Install & configure Tailwind CSS | `[x]` | With CSS variables for shadcn/ui compatibility |
| 19 | Install shadcn/ui, add base components (Button, Badge, Card, Input, Textarea, Label, Select) | `[x]` | Manual setup (non-interactive env); all components in `src/components/ui/` |
| 20 | `vite.config.ts`: proxy `/api/*` → `localhost:3000`, build outDir → `../backend/public` | `[x]` | |
| 21 | Backend: add `/api` prefix to all routes | `[x]` | Using express.Router mounted at `/api` |
| 22 | Backend: serve `public/` in production, keep CORS for dev | `[x]` | Serves `public/` only if directory exists |
| 23 | Migrate NewApplication page → React | `[x]` | Form + result card with skill badges and score |
| 24 | Migrate History page → React (table, filters, inline edit, status badge) | `[x]` | Expandable rows, inline edit, status dropdown |
| 25 | Migrate Settings page → React | `[x]` | Prompt editor with auto-save feedback |
| 26 | Migrate Editor page → React | `[x]` | Split view: markdown editor + iframe preview, tab for resume/CL |
| 27 | `lib/api.ts` — typed API client wrapping all fetch calls | `[x]` | Full TypeScript types for all endpoints |
| 28 | Integration test: dev mode (proxy) + prod build (express.static) | `[ ]` | |

---

## Phase 6 — Open Source User-Data Separation

| # | Task | Status | Notes |
|---|------|--------|-------|
| 29 | Create `user/` folder: base.md, config.json, cover-letter/template.md | `[x]` | Copied from resumes/ and cover-letter/ |
| 30 | Create `themes/` folder with 5 CSS themes (classic/modern/minimal/compact/bold) | `[x]` | modern/minimal/compact/bold are copies of classic for now |
| 31 | Create root `user.config.js` (theme + geminiModel) | `[x]` | |
| 32 | Update backend path references to user/ and themes/ | `[x]` | tailor.js, coverletter.js, renderer.js, exporter.js, server.js |
| 33 | Add `theme` column to SQLite applications table | `[x]` | Migration in db.js |
| 34 | Frontend theme dropdown on Generate form | `[x]` | 4-column row: Job Title / Company / Source / Theme |
| 35 | Frontend theme switcher in Editor header | `[x]` | PATCH application.theme on change, re-renders preview |
| 36 | PDF export uses stored per-application theme | `[x]` | Passed from DB record to exportResumePDF(markdown, theme) |
| 37 | Update .gitignore to exclude user/ | `[x]` | |
| 38 | Update README with Getting Started for New Users | `[x]` | |

---

## Component Reference

### tailor.js logic
1. Gemini reads JD → returns `{ stack, detected_skills, fit_score }` (JSON mode)
2. Programmatic: format each skill list (primary always bold; detected others bold+front; rest plain)
3. Programmatic: scan JD for `soft_skills.pool[].keyword` → pick ≤2 bullets → inject before Phygitalker block
4. Programmatic: `replaceAll` all 16 `{{placeholders}}` in `base.md` (includes `{{name}}` driven by stack)
5. Summary / bullets / education / certs / dates: **DO NOT touch**

### coverletter.js placeholders
`{{company}}` `{{job_title}}` `{{why_company}}` `{{matching_skills}}` `{{specific_project}}` `{{why_company_culture}}`

### API endpoints
```
POST /analyze        { job_title, company, jd, url, source, theme? } → { id, fit_score, stack, detected_skills, bolded_skills, theme }
GET  /applications/:id/pdf?type=resume|coverletter → PDF using stored theme
POST /preview        { markdown, type, theme? } → { html }
GET  /prompts        → { tailor, coverletter }
PUT  /prompts        { tailor, coverletter } → { ok }
GET  /applications   → all records
GET  /applications/:id → single record
PATCH /applications/:id → partial update (includes theme)
DELETE /applications/:id → delete
GET  /style          → { theme, css }
PUT  /style          { css, theme? } → { ok }
GET  /style/themes   → [{ name, label, css }]
POST /style/preview  { css } → { html }
GET  /health         → { status: "ok" }
```

### SQLite table: `applications`
`id, created_at, company, job_title, url, source, jd_text, stack_used, fit_score, resume_md, cover_md, status, theme`

### renderer.js
- `renderResume(markdown, theme?)` — parses `~` syntax + YAML front matter → full HTML string (CSS from `themes/${theme || userConfig.theme}.css`)
- `renderResumeWithCss(markdown, css)` — same but with explicit CSS (used by Style page preview)
- `renderCoverLetter(markdown)` — simple markdown → HTML
- `loadThemeCss(theme?)` — reads CSS from `themes/` for the given theme

### exporter.js
- `exportResumePDF(markdown, theme?)` — loads theme CSS, calls `renderResume(markdown, theme)` → Puppeteer PDF
- `exportCoverLetterPDF(markdown)` — calls `renderCoverLetter` → Puppeteer PDF
- No external dev server dependency

### package.json dependencies
`express`, `axios`, `dotenv`, `puppeteer`

### .env keys
```
GEMINI_API_KEY   — Gemini API key
GEMINI_MODEL     — model name (overrides user.config.js geminiModel if set)
OUTPUT_DIR       — output folder relative to backend/ (default: ../output)
```

### user.config.js keys
```
theme       — active theme name (must match a file in themes/)
geminiModel — Gemini model (used if GEMINI_MODEL not set in .env)
```

---

## Future Plans

### Scoring System (Phase 5 — to be designed)

Current state: single `fit_score: 0–100` returned by Gemini, displayed as one number.

Planned direction:
- Multi-dimension breakdown: technical match, seniority match, keyword coverage rate
- Rule-based scoring layer on top of Gemini analysis
- UI shows score breakdown (not just one number)

> Design deferred — research other resume scoring systems before implementing.
