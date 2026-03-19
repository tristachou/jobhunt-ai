## 2026-03-19 — Separate user data from tool logic (open source prep)

- Create `user/` (base.md, config.json, cover-letter/template.md) as the single folder new users edit; add to .gitignore so personal data is never committed
- Create `themes/` with five CSS themes (classic/modern/minimal/compact/bold); classic is the existing resume.css, others are placeholders
- Add root `user.config.js` (theme + geminiModel)
- Update backend path references: tailor.js → user/, coverletter.js → user/, renderer.js → themes/${theme}.css, server.js → themes/ for style routes
- Add `theme` column to SQLite applications table (migrated automatically)
- Frontend: theme dropdown on Generate form + theme switcher in Editor header; theme stored per-application and used for PDF export and preview
- Update README with Getting Started for New Users section

---

## 2026-03-19 — Fix Style preview scroll and two-column layout gap

- Fix ScaledPreview: measure iframe content height after load (`scrollHeight`) instead of using fixed A4_H — multi-page resumes now scroll to the bottom correctly
- Fix two-column template: replace CSS Grid (shared row heights caused a gap below Certification before Education) with CSS `column-count: 2` + `break-before: column` on `.section-skills` — each column now fills independently

---

## 2026-03-19 — Redesign Style page layout

- Replace big template cards with a compact top toolbar button group
- Style page is now full-height split view (CSS editor left, preview right), same pattern as Editor page
- Template selector shows as small pill buttons; "Custom" label appears when CSS is manually edited
- Mobile: editor/preview toggle tabs below toolbar

---

## 2026-03-19 — Style page: template switcher + live CSS editor

- Add `renderer.js` export `renderResumeWithCss(markdown, css)` for style preview without touching active CSS file
- Add backend routes: `GET/PUT /api/style`, `GET /api/style/templates`, `POST /api/style/preview`
- Preview uses most recent application's resume_md; falls back to base.md if no applications exist
- Add `Style` nav item and page with: template card picker (wireframe thumbnails), CSS editor, live preview iframe
- Template active state detected by CSS content comparison
- Mobile: editor/preview toggle tabs; desktop: side-by-side

---

## 2026-03-19 — Add two-column CSS template, section wrappers in renderer

- Refactor `renderer.js` `renderBody`: group blocks by `## heading` and wrap each section in `<section class="resume-section section-[slug]">` — enables CSS to target individual sections by name
- Add `resumes/templates/classic.css` — copy of current single-column layout
- Add `resumes/templates/two-column.css` — new layout: left col (Summary/Certification/Education), right col (Skills/Experience); header switches to name-left + contact-right
- Update `resumes/resume.css` with `.resume-section` rule for compatibility
- All 39 tests pass after renderer change

---

## 2026-03-19 — Fix Editor preview stale state bug

- Fix: switching tabs (resume ↔ cover letter) showed wrong preview due to React stale closure
- Root cause: `setMarkdown` and `refreshPreview` were in separate useEffects; preview fired before state updated
- Fix: merge into one useEffect, pass `newMd` and `tab` directly to `refreshPreview` instead of reading from state
- Fix: manual refresh button and mobile panel toggle also updated to pass explicit values

---

## 2026-03-19 — UI redesign: Figma-style black/white, fully responsive

- Switch to Inter font for clean, professional typography
- Redesign color system: pure black header, white background, neutral-200 borders (no heavy shadows)
- NewApplication: score displayed as large number with color + label, skills section cleaner
- History: desktop table with hover-reveal action buttons; mobile shows card layout instead of table
- Settings: cleaner single-column layout with descriptive helper text
- Editor: mobile adds editor/preview panel toggle tabs; download buttons adapt to mobile; use `h-dvh` for correct mobile viewport height
- Header: hamburger menu on mobile with slide-down nav drawer

---

## 2026-03-19 — Complete React frontend migration (Phase 5)

- Add shadcn/ui component set: Button, Card, Badge, Input, Textarea, Label, Select (manual setup)
- Implement NewApplication page: form with validation, score display, skill badges, navigate to editor on success
- Implement History page: sortable/filterable table, expandable detail rows, inline-editable cells, status dropdown, download/edit/delete actions
- Implement Settings page: prompt editor for tailor + cover letter prompts, save feedback
- Implement Editor page: full-screen split view with markdown editor (left) + iframe preview (right), tab switching between resume and cover letter, auto-save with debounce, PDF download buttons
- All pages use typed `lib/api.ts` — no raw fetch calls in components

---

## 2026-03-19 — Frontend modernization scaffold (Phase 5)

- Add root `package.json` with `concurrently` — `npm run dev` starts backend + frontend together
- Rewrite `backend/server.js`: mount all routes under `/api` prefix via Express Router; serve `backend/public/` as production frontend (only if directory exists)
- Scaffold `frontend/` as Vite + React + TypeScript + Tailwind CSS project
- Add `vite.config.ts`: proxy `/api/*` → `localhost:3000` in dev; build output → `backend/public/`
- Add `src/lib/api.ts`: typed API client for all backend endpoints
- Add page stubs: `NewApplication`, `History`, `Settings`, `Editor`
- Add `App.tsx` with React Router layout and nav

---

## 2026-03-19 — Add .gitignore, untrack sensitive files

- Add `.gitignore`: exclude `backend/.env`, `backend/applications.db`, `output/*/`, `node_modules/`, OS/editor junk
- Untrack `backend/.env` and `backend/applications.db` via `git rm --cached` (files kept locally)

---

## 2026-03-19 — Name per stack, settings error fix, remove Oh My CV

- Add `{{name}}` placeholder to `base.md` so the resume name is driven by config instead of hardcoded
- Add `name` field to each stack in `config.json`: `python` → "Trista", `csharp`/`java` → "Hsin-Yu Chou"
- Wire `{{name}}` replacement into `tailor.js` replacements map
- Update CLAUDE.md placeholder count from 15 → 16
- Improve `loadPrompts()` error message: detect non-JSON response and tell user to check backend port instead of showing cryptic JSON parse error
- Delete `oh-my-cv-main/` directory (v2 refactor complete — no longer needed)
- Remove `OHMYCV_PATH` and `OHMYCV_PORT` from `.env`
- Update `PLAN.md`: clean up stale Oh My CV references in Component Reference, add scoring system as future plan
- Move Phase 3 scoring system from `REFACTOR_PLAN.md` to `PLAN.md` Future Plans section
