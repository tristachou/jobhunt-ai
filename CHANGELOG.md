## 2026-03-23 — Fix heatmap to fill container width

- Rewrite HeatmapChart to use CSS grid (`gridTemplateColumns: auto repeat(N, minmax(8px, 1fr))`) so week columns expand to fill available width
- Replace fixed `w-3 h-3` cells with `aspect-square` so cell height auto-matches dynamic width
- Restructure DOM from column-major flex to row-major flat grid items (corner + month labels in row 0, day label + cells per row 1–7)
- Update title to "Last 52 Weeks" to match actual 52-week range in `buildHeatmapGrid`
- Add React import (needed for `React.Fragment` with key)

## 2026-03-22 — Add two-column layout support to renderer + modern theme

- Add `LEFT_SECTION_SLUGS` (Set) and `TWO_COLUMN_THEMES` (Set) constants to `renderer.js`
- Update `renderBody(body, theme)` to emit `<div class="resume-left">` / `<div class="resume-right">` when theme is in `TWO_COLUMN_THEMES`; single-column output unchanged for all other themes
- Update `renderResume` and `renderResumeWithCss` to thread `theme` through to `renderBody`; all existing call signatures remain backward-compatible
- Replace `themes/modern.css` with flexbox-based white two-column layout targeting `.resume-left` / `.resume-right`; left column 62mm with `border-right: 1px solid #ddd`, right column `flex: 1`
- All 39 existing tests pass

## 2026-03-22 — Apply Swiss International Style (Brutalist) design system

- Rewrite `index.css`: canvas background `#F0F0E8`, black borders, blue-700 primary, zero border-radius, serif headings via CSS
- Rewrite all shadcn primitives (button, badge, card, input, label, textarea, select) with hard shadows, `rounded-none`, mono uppercase, brutalist variants
- Rewrite `AppSidebar`: serif logo, mono nav labels, black active state inversion, `border-r-2 border-black`
- Rewrite all pages (NewApplication, History, Settings, Editor, Style): serif page titles, mono metadata/labels, colored-dot panel headers, retro bracket syntax for empty states
- Status badges redesigned: filled color backgrounds (blue=applied, green=interview, red=rejected)
- Score bar: square `rounded-none` progress bar with black border

## 2026-03-21 — Unify sidebar across all pages

- Extract sidebar into shared `AppSidebar.tsx` with a reusable `SidebarLayout` wrapper
- Style page now uses `SidebarLayout` instead of its own full-screen layout — sidebar is consistent across all pages
- Remove `ArrowLeft` back button and custom black header from Style page; replace toolbar with standard white bar using primary-colored active state
- Style page template selector buttons now use `bg-primary` for active state to match app color theme

## 2026-03-21 — Redesign layout: top nav → sidebar, add blue primary color

- Replace top navigation bar with a left sidebar layout (standard SaaS pattern)
- Add icon + label nav items grouped into main (New Application, History) and bottom (Style, Settings)
- Switch primary color from black to blue (`221 83% 53%`) with matching ring, border, and muted token updates
- Mobile: sidebar becomes a slide-in overlay triggered by hamburger button
- Editor and Style pages remain full-screen (no sidebar)

## 2026-03-20 — Add job_role + stack dual-dimension resume tailoring

- Update `tailor.js` to read `job_role` and `python_framework` from Gemini response alongside `stack`
- Resolve summary, orefox bullets (×5), and phygitalker bullets (×3) from `config.job_roles[job_role]` bullet sets
- Add `resolveBulletKey` helper for Django variant support (`_django` suffix on bullet keys when `stack=python` and `python_framework=django`)
- Fill `{{ai_skills_section}}` from `stackConfig.ai_skills` when `roleConfig.include_ai_skills` is true, empty string otherwise
- Return `job_role` and `python_framework` alongside existing `stack`, `detected_skills`, `bolded_skills`, `fit_score`
- Move `prompts.json` from `resumes/` to `user/`; update path references in `tailor.js`, `coverletter.js`, `server.js`

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
- Add `name` field to each stack in `config.json`: `python` → "Trista Chou", `csharp`/`java` → "Hsin-Yu Chou"
- Wire `{{name}}` replacement into `tailor.js` replacements map
- Update CLAUDE.md placeholder count from 15 → 16
- Improve `loadPrompts()` error message: detect non-JSON response and tell user to check backend port instead of showing cryptic JSON parse error
- Delete `oh-my-cv-main/` directory (v2 refactor complete — no longer needed)
- Remove `OHMYCV_PATH` and `OHMYCV_PORT` from `.env`
- Update `PLAN.md`: clean up stale Oh My CV references in Component Reference, add scoring system as future plan
- Move Phase 3 scoring system from `REFACTOR_PLAN.md` to `PLAN.md` Future Plans section
