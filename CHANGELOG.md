## 2026-04-15 — Fix markdown link rendering in resume body

- Add `[text](url)` → `<a href>` conversion to `inlineMd()` in `renderer.js`; previously only `**bold**` was parsed, causing raw link syntax to appear as literal text in PDFs
- Fixes GitHub URLs in Projects section (`~ [github.com/...](https://...)`) not rendering as clickable links

## 2026-04-14 — Generalize experience blocks with content pool

- Replace company-specific `orefox_*`/`phygitalker_*` keys throughout `config.json`, `base.md`, and `tailor.js` with generic `exp1`/`exp2` identifiers — tool is no longer coupled to any individual's work history
- Restructure `config.json` schema: `stacks[x].bullets` flat dict → `stacks[x].experiences[]` array; each experience has `id`, `technologies`, `bullet_pool[]` (with `must_have`, `tags`, optional `stack_variant`)
- Replace `job_roles[x].orefox_bullet_set`/`phygitalker_bullet_set` with `experience_slots: { exp1: N, exp2: M }` — declarative slot counts instead of hardcoded key lists
- Add `selectBulletsFromPool()` in `tailor.js`: selects bullets from pool using must_have priority + JD keyword/tag scoring; handles `stack_variant` filtering for Python Django/FastAPI variants
- Replace hardcoded `~ Taiwan` string detection in `injectSoftSkillBullets` with a `<!-- SOFT_SKILLS_INJECT -->` marker in `base.md`; marker is removed cleanly when no soft skills match
- Update `base.md`, `base.example.md`, `config.example.json`, TypeScript types (`BulletPoolEntry`, `ExperienceBlock`), `demo-data.ts`, and `ProfileTab.tsx` to reflect new schema
- ProfileTab now renders collapsible experience blocks with inline bullet pool editor (must-have checkbox, text, tags) instead of a flat key→value bullet list

## 2026-04-12 — Universal prompt + Profile UI

- Add `{{STACK_KEYS}}` and `{{JOB_ROLE_KEYS}}` injection to `tailor.js` (both `tailorResume` and `rescoreResume`); extract shared `buildTailorPrompt()` helper to avoid drift
- Add `user/prompts.example.json` — ready-to-use universal prompt that works with any config without hardcoded stack names or personal details; existing `prompts.json` is unaffected
- Add `GET /api/config` and `PUT /api/config` endpoints to read/write `user/config.json` with basic shape validation
- Add `AppConfig`, `StackConfig`, `JobRoleConfig`, `SoftSkillEntry` TypeScript interfaces to `api.ts`
- Add `getConfig()` and `saveConfig()` to the `api` object with demo mode support
- Add `DEMO_CONFIG` to `demo-data.ts`
- Add Profile tab to Settings page: skill list editor (tag pills), experience bullet editor, soft skills pool editor; all persisted via PUT /api/config

## 2026-04-12 — Fix double-click required on Download and Analyze buttons

- Fix PDF download in `Editor.tsx`: append anchor to DOM before `.click()` and delay `URL.revokeObjectURL` by 100ms so browser can process the download asynchronously before the blob URL is revoked
- Fix all Button variants in `button.tsx`: add `active:` state (extra 1px translate + brightness dim) distinct from hover state, so users get clear visual feedback that a click was registered

## 2026-04-05 — Static demo mode

- Add `VITE_DEMO_MODE=true` build flag; `npm run build:demo` outputs to `demo-dist/` (separate from production build)
- Add mock layer in `api.ts` — all API calls intercepted in demo mode; writes trigger a "clone repo" modal, reads return hardcoded fake data
- Add `DemoCloneModal` component shown globally via `App.tsx` when any write action is attempted
- Add `frontend/src/lib/demo-data.ts` with fictional candidate (Jordan Avery) + 3 fake applications
- Add `frontend/public/demo/` with pre-generated `resume.pdf`, `coverletter.pdf`, and `preview.html`
- Add `scripts/generate-demo-assets.js` to regenerate static assets from `demo/*.md` files
- Fix pre-existing TS errors: remove unused `Clock` import in `History.tsx`, replace invalid `title` prop with `aria-label` in `Resumes.tsx`

## 2026-04-04 — N/A score display + AI Re-score feature

- Show `N/A` instead of `0` for unscored applications in History (ScoreBar) and Editor header; fix detail panel showing `0 / 100`
- Add `rescoreResume(jd)` to `tailor.js` — lightweight Gemini call returning only `fit_score`, reusing tailor prompt
- Add `POST /api/applications/:id/rescore` — uses stored JD or accepts JD in body (also saves JD to DB if missing); returns `{ fit_score }`
- Add Re-score button to Editor header (resume tab only): if JD exists scores immediately, otherwise opens dialog to paste JD
- Score display added to Editor header left (beside status badge)

## 2026-04-04 — Fix Dashboard Pipeline count double-counting

- Fix `countByStatus` in `Dashboard.tsx` to only count an application's current status, not all historical statuses from `status_log`
- Previously, an application that moved from `not_started` → `applied` would be counted in both buckets

## 2026-04-03 — Phase 10: Resume Builder (Form → Markdown)

- Add `POST /api/resume-templates/build` — accepts structured personal/summary/skills/experience/education/certifications data, generates Oh My CV markdown, saves to `resume_templates` table
- Add `POST /api/resume-templates/build-preview` — same markdown generation but no DB save, for live preview use
- Add `ResumeBuilderPage.tsx` at `/resumes/build` — full-screen split form + live preview; supports multiple skill groups, experience entries with bullets (add/remove), multiple education and certification entries
- Replace "New Resume" direct-create flow with a modal on the Resumes page offering "Build with form" (→ builder) or "Edit as markdown" (→ blank editor)
- Add `api.buildTemplate()` to typed API client

## 2026-03-31 — Fix Skills section layout in all themes

- Fix Skills section layout in all single-column themes (classic, minimal, compact, bold): replace `justify-content: space-between` row with a CSS grid (`grid-template-columns: max-content 1fr`) on the section; `.row` becomes `display: contents` so label and value are grid children — label stays on one line, long values wrap within their own column

## 2026-03-31 — Phase 11: UX polish

- Add yellow warning banner when JD is under 100 characters (non-blocking, shows char count)
- Improve delete confirmation message to describe consequences: "permanently remove all saved data including markdown and status history"
- Add status icons to all status badges and dropdown options (Hourglass/Send/Bell/Users/XCircle) — accessibility fix, no longer colour-only
- Add "Preview →" link next to Theme selector in New Application form — opens template preview modal with selected theme applied

## 2026-03-30 — Phase 9: Multi-resume templates

- Add `resume_templates` DB table with seed migration (imports `user/base.md` as default on first run); add `resume_template_id` to `applications` table
- Add full CRUD API for `/api/resume-templates` (list/create/get/update/delete/set-default); `DELETE` blocks removal of the last template
- Add `POST /api/applications` for Persona A direct save (no AI); copies template markdown to `resume_md`, redirects to Editor
- Extend `/api/analyze` to accept `resume_template_id` and `generate_cover_letter`; rejects AI if template has no `{{placeholders}}`; `tailor.js` accepts optional `baseMd` param
- New Application form redesigned: template selector with Preview modal, optional JD, AI checkboxes (shown only when JD has content), single smart button ("Save & Track" vs "Analyze →")
- New `/resumes` management page in sidebar: list templates with default star, Edit/Duplicate/Delete/Set-as-default actions
- New `/resumes/:id` full-screen template editor: split view (markdown + preview), name input, autosave, Set as default button
- Editor: "Save as template" button opens modal with pre-filled name → creates new template from current resume_md

## 2026-03-30 — Phase 8: Onboarding and open source prep

- Add `user/base.example.md`, `user/config.example.json`, `user/cover-letter/template.example.md` with generic fictional data so new users have a starting point
- Update `.gitignore` from blanket `user/` exclusion to specific personal files (`base.md`, `config.json`, `prompts.json`, `template.md`), allowing example files to be committed
- Add `GET /api/stacks` endpoint that reads stack names from `user/config.json`; show available AI variants above JD textarea in New Application form
- Rename "Stack" label to "Resume variant" in result card; update JD textarea placeholder to clarify AI is optional
- Add collapsible "Available tokens" reference under each Settings prompt textarea, showing token names and descriptions

## 2026-03-30 — Phase 7: Bug fixes, silent failure detection, and robustness

- Add save error banner + Ctrl+S + Save button in Editor; autosave failures now surface visibly instead of silently dropping changes
- Add cover letter unavailable warning in result card and Editor; `cover_letter_available` flag returned from `/api/analyze`; `generateCoverLetter` returns `{ markdown, available }` object
- Validate Gemini response shape in `tailor.js` (stack/detected_skills/fit_score); clamp fit_score to 0–100; return `soft_skills_injected` flag with yellow hint in result card
- Replace anchor-tag PDF download with fetch-based download with loading/disabled state to prevent double-clicks spawning multiple Puppeteer instances
- Add descriptive errors: GEMINI_API_KEY missing (B1), 429 quota exceeded (B2), missing user/base.md or config.json (B3), misleading PDF 404 messages (B4)
- Add 60s Puppeteer timeout (D1); 60s `Promise.race` in both `geminiJSON` functions (D6); 65s `AbortController` in frontend analyze call (D6)
- Add `PUT /prompts` token validation (`{{JD}}` + `{{TEMPLATE}}`); theme name whitelist (`/^[a-z0-9-]+$/`) on all endpoints that accept theme; `status_log` JSON.parse guard in db.js

## 2026-03-24 — Improve frontend spacing, padding, and text legibility

- Replace hardcoded `padding: '1.5rem 10rem'` in App layout with responsive Tailwind (`px-6 py-6 md:px-10 lg:px-14`) and add `max-w-6xl mx-auto` content wrapper to prevent over-stretching on wide screens
- Unify page heading size: Dashboard `h1` changed from `text-2xl` to `text-3xl` to match History, NewApplication, and Settings
- Increase KPI card padding from `px-4 py-3` to `px-5 py-4` and bump label font from `text-[10px]` to `text-xs` for legibility
- Raise all `text-[9px]` instances in Dashboard (bar chart, heatmap, tooltip) to `text-[10px]` to meet minimum readable size
- Increase History filter tab height from `py-1` to `py-1.5` for better touch targets
- Increase Sidebar nav link row height from `py-2` to `py-2.5` for improved breathing room
- Fix Dashboard mobile layout: change `items-start` to `sm:items-start` so columns stretch to full width on mobile instead of shrinking to content width
- Widen Job Description in History detail panel: change layout from `grid-cols-2 max-w-3xl` to `grid-cols-[3fr_1fr]` (no width cap), giving JD 75% and metadata 25%; increase textarea min-height from `min-h-36` to `min-h-48`
- Add quick-unflag to Dashboard Follow-up panel: hover a row to reveal × button that immediately removes the follow-up flag via API patch and updates local state; status label hides on hover to make room

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
