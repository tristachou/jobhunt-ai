# Job Application Tracking System — Implementation Plan

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

---

## Phase 7 — Bug Fixes & Robustness

> Full design in `UX_FIX_PLAN.md` Phase A + B + D

| # | Task | Status | Notes |
|---|------|--------|-------|
| 39 | A1: Editor autosave failure — add error banner + manual save (Ctrl+S / Save button) | `[x]` | Red banner on save failure; Ctrl+S + Save button trigger immediate save |
| 40 | A2: Cover letter silently skipped when template missing — show warning banner | `[x]` | `cover_letter_available` in `/analyze` response; yellow banners in result card + Editor |
| 41 | A3: Validate Gemini response shape before using it | `[x]` | `tailor.js` — throws on invalid `stack`, `detected_skills`, `fit_score` |
| 42 | A4: PDF download button has no loading state — disable + show "Generating PDF…" | `[x]` | Fetch-based download with loading state; both buttons disabled during generation |
| 43 | A5: Soft skill injection no-op is silent — return `soft_skills_injected: boolean` | `[x]` | Yellow hint in result card if false |
| 44 | B1: Missing `GEMINI_API_KEY` shows "Unknown error" — check on startup, return clear message | `[x]` | Early return 500 with descriptive message in `/api/analyze` |
| 45 | B2: Gemini 429 quota error shows "Unknown error" — detect HTTP 429 in axios catch | `[x]` | `geminiJSON` catches 429 in both `tailor.js` and `coverletter.js` |
| 46 | B3: Missing `user/base.md` or `config.json` shows path crash — throw descriptive error | `[x]` | `tailorResume` checks file existence before reading |
| 47 | B4: PDF 404 message is misleading — replace with "Resume markdown not saved — try re-generating" | `[x]` | Separate messages for resume vs cover letter |
| 48 | B5: Settings shows "Saved" even on failure — move badge to `then()`, show red "Save failed" in `catch()` | `[x]` | Already correct in React version |
| 49 | D1: Puppeteer has no timeout — add 60s timeout to `page.setContent` / `page.pdf` | `[x]` | `timeout: 60000` on both calls in `exporter.js` |
| 50 | D2: `fit_score` has no bounds check — clamp to 0–100 | `[x]` | `Math.max(0, Math.min(100, fit_score))` in `tailor.js` |
| 51 | D3: `PUT /prompts` does not validate required tokens — check `{{JD}}` and `{{TEMPLATE}}` present | `[x]` | Returns 400 if missing |
| 52 | D4: `theme` parameter has no validation — whitelist `/^[a-z0-9-]+$/` | `[x]` | `isValidTheme()` applied in analyze, preview, style PUT, style/preview |
| 53 | D5: `status_log` JSON.parse has no error handling — wrap in try/catch, default to `[]` | `[x]` | try/catch in `updateApplication` in `db.js` |
| 54 | D6: Gemini has no timeout — backend `Promise.race` 60s, frontend `AbortController` 65s | `[x]` | `Promise.race` in both `geminiJSON`; `AbortController` in NewApplication submit |

---

## Phase 8 — Onboarding & Open Source Prep

> Full design in `UX_FIX_PLAN.md` Phase C

| # | Task | Status | Notes |
|---|------|--------|-------|
| 55 | Add `user/base.example.md` — format demo with no personal data | `[x]` | Generic structure with all 16 placeholders and fictional data |
| 56 | Add `user/config.example.json` — stack structure demo | `[x]` | One "typescript" stack + one job role + soft_skills pool |
| 57 | Add `user/cover-letter/template.example.md` | `[x]` | Generic template with all 6 placeholders |
| 58 | Add `user/base.md`, `user/config.json`, `user/cover-letter/template.md` to `.gitignore` | `[x]` | Changed from `user/` whole-dir to specific personal files only |
| 59 | C2: Rename "Stack" label to "Resume variant" | `[x]` | Updated in result card in NewApplication.tsx |
| 60 | C3: Show available AI variants near the AI toggle on New Application form | `[x]` | `GET /api/stacks` endpoint; shown inline above JD textarea |
| 61 | C4: Add placeholder hint text to JD textarea | `[x]` | "Paste the full job description. Leave blank to skip AI analysis." |
| 62 | C5: Add "Available tokens" docs to Settings prompt textareas | `[x]` | Collapsible `<details>` under each textarea with token descriptions |

---

## Phase 9 — Multi-Resume Templates

> Full design in `UX_FIX_PLAN.md` Phase E

| # | Task | Status | Notes |
|---|------|--------|-------|
| 63 | DB: add `resume_templates` table + migration | `[x]` | Seeds `user/base.md` as default on first run |
| 64 | DB: add `resume_template_id` column to `applications` | `[x]` | Nullable; old records unaffected |
| 65 | API: `GET/POST/PUT/DELETE /api/resume-templates` | `[x]` | List excludes markdown; GET single includes it; DELETE blocks last template |
| 66 | API: `PATCH /api/resume-templates/:id/default` | `[x]` | Clears all others, sets one default |
| 67 | API: `/api/analyze` — add optional `resume_template_id` + `generate_cover_letter` params | `[x]` | Also passes baseMd to tailor.js; skips AI if template has no `{{placeholders}}` |
| 68 | API: `POST /api/applications` — Persona A direct save (no AI); takes `resume_template_id`, copies template markdown to `resume_md`, status = `not_started` | `[x]` | Separate from `/api/analyze`; frontend redirects to Editor |
| 69 | Backend: detect `{{placeholder}}` presence in template → auto-disable AI if none found | `[x]` | Returns 400 in /api/analyze if no placeholders found |
| 70 | New Application form redesign — template selector + optional JD + AI checkboxes | `[x]` | JD optional; AI checkboxes appear when JD has content; single smart button |
| 71 | Resumes management page — list, create, set default | `[x]` | `/resumes` page + sidebar nav; "···" dropdown with Set default / Duplicate / Delete |
| 72 | Resume template edit page — split view, reuse Editor layout | `[x]` | `/resumes/:id` — full-screen split view, name input, Set as default button, autosave |
| 73 | Editor: add "Save as template" button | `[x]` | Modal with name input (pre-filled with company+title) → `POST /api/resume-templates` |
| 74 | New Application form: add "Preview template" panel | `[x]` | "Preview →" link → modal overlay with rendered iframe |

---

## Phase 10 — Resume Builder (Form → Markdown)

> Full design in `UX_FIX_PLAN.md` Phase G

| # | Task | Status | Notes |
|---|------|--------|-------|
| 75 | API: `POST /api/resume-templates/build` — accept structured data, return generated markdown | `[ ]` | |
| 76 | New Resume entry point: two options — "Build with form" / "Edit as markdown" | `[ ]` | |
| 77 | Resume Builder form — Personal info, Summary, Skills, Experience, Education sections | `[ ]` | |
| 78 | Experience + Education: support multiple entries | `[ ]` | |
| 79 | Builder: live preview panel (right side) | `[ ]` | Calls `POST /api/preview` on change |

---

## Phase 11 — UX Polish

> Full design in `UX_FIX_PLAN.md` Phase F

| # | Task | Status | Notes |
|---|------|--------|-------|
| 80 | F1: Show warning when JD is under 100 characters (non-blocking) | `[x]` | Yellow banner below JD textarea showing char count |
| 81 | F2: Delete confirmation — describe consequences clearly | `[x]` | Added "permanently remove all saved data including markdown and status history" |
| 82 | F3: Status badge — add icon per status (not colour-only) | `[x]` | Hourglass/Send/Bell/Users/XCircle icons in badge + dropdown |
| 83 | F4: Dashboard — show error message on data load failure | `[x]` | Already implemented in previous phase |
| 84 | F5: Theme selector — add "Preview →" link next to dropdown | `[x]` | Preview link in New Application form opens template preview modal with selected theme |

---

## Future Plans

### Scoring System (to be designed)

Current state: single `fit_score: 0–100` returned by Gemini, displayed as one number.

Planned direction:
- Multi-dimension breakdown: technical match, seniority match, keyword coverage rate
- Rule-based scoring layer on top of Gemini analysis
- UI shows score breakdown (not just one number)

> Design deferred — research other resume scoring systems before implementing.
