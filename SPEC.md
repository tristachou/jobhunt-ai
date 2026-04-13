# Job Application Automation — SPEC

## Overview
A semi-automatic job application pipeline.
The user manually pastes job details into a local web UI, and the system automatically tailors a resume, generates a cover letter, exports PDFs, and logs the application to a local database.

No browser extension required. No scraping. No permission issues.

---

## Project Structure

```
jobhunt-ai/
├── user/                          # ← EDIT THIS to personalise your instance
│   ├── base.md                    # Your resume template with {{placeholders}}
│   ├── config.json                # Your per-stack skill lists, bullet variants, soft skill pool
│   └── cover-letter/
│       └── template.md            # Your cover letter template with {{placeholders}}
├── themes/                        # Resume CSS themes (classic / modern / minimal / compact / bold)
│   ├── classic.css
│   ├── modern.css
│   ├── minimal.css
│   ├── compact.css
│   └── bold.css
├── user.config.js                 # Top-level user config (active theme, Gemini model)
├── frontend/
│   └── src/
│       ├── pages/                 # React pages (NewApplication, History, Editor, Style, Settings, Resumes, ResumeEditorPage, ResumeBuilderPage)
│       └── lib/api.ts             # Typed API client
├── backend/
│   ├── server.js                  # Express server (port 3000) — all routes under /api
│   ├── tailor.js                  # Resume tailoring (Gemini + programmatic)
│   ├── coverletter.js             # Cover letter generation (Gemini)
│   ├── renderer.js                # Markdown → HTML (reads CSS from themes/); supports two-column layout for modern theme
│   ├── exporter.js                # HTML → PDF via Puppeteer
│   ├── db.js                      # SQLite CRUD via node:sqlite
│   ├── package.json
│   └── .env                       # GEMINI_API_KEY, GEMINI_MODEL (overrides user.config.js)
├── resumes/
│   └── prompts.json               # Gemini prompt templates (editable in Settings UI)
├── output/
│   └── YYYY-MM-DD_Company_Title/
├── SPEC.md
├── PLAN.md
└── README.md
```

---

## Full Flow

```
User opens localhost:3000
        ↓
Manually pastes: job_title, company, url, source, jd
        ↓
Clicks "Generate" → POST /process
        ↓
tailor.js: Gemini picks stack → formats skills → fills base.md placeholders
        ↓
coverletter.js: Gemini fills 6 template.md placeholders
        ↓
exporter.js: Oh My CV (Puppeteer + IndexedDB) → resume.pdf
             plain HTML (Puppeteer) → cover-letter.pdf
        ↓
db.js: saves application record to SQLite
        ↓
UI shows: fit score, stack selected, detected skills, bolded skills, download links
```

---

## Component Details

### 1. Local Web UI (frontend/)

Served by Express at `localhost:3000`. Single HTML page, vanilla JS, no framework.

**Input fields:**
- Job Title (text input)
- Company (text input)
- Source (dropdown: LinkedIn / Seek / Other)
- Job URL (text input)
- Job Description (large textarea)

**After clicking "Generate":**
- Loading state while processing
- Displays: fit score (0–100), stack selected, detected skills, bolded skills
- Download buttons for resume PDF and cover letter PDF

**Applications history (same page, nav toggle):**
- Table of all past records from SQLite
- Columns: date, company, title, source, fit score, stack, status, PDF links
- Status can be updated inline (generated → applied → interview → rejected)

---

### 2. Local Backend (Node.js + Express)

**Port:** 3000

**Startup sequence:**
1. `server.js` spawns Oh My CV (`pnpm dev`) in `oh-my-cv-main/site/` with `PORT=5173`
2. Polls `localhost:5173` until ready (up to 40s)
3. Starts Express on port 3000
4. On process exit (SIGINT/SIGTERM), kills the Oh My CV child process

**Reverse proxy:** `/cv/*` → `localhost:5173` via `http-proxy-middleware`
- `localhost:3000/cv` = Oh My CV editor (no need to open port 5173 directly)

**Endpoints:**

`POST /process`
```json
// Request
{ "job_title": "...", "company": "...", "jd": "...", "url": "...", "source": "linkedin" }

// Response
{
  "fit_score": 87,
  "stack": "csharp",
  "detected_skills": ["C#", "ASP.NET Core", "React"],
  "bolded_skills": ["C#", "ASP.NET Core", "React"],
  "resume_pdf": "/output/2025-01-15_Atlassian_Full-Stack-Developer/resume.pdf",
  "coverletter_pdf": "/output/2025-01-15_Atlassian_Full-Stack-Developer/cover-letter.pdf",
  "record_id": 42
}
```

`GET /applications` — all records from SQLite as JSON

`PATCH /applications/:id` — update `status` field only

`POST /applications/:id/rescore` — re-score resume against JD via Gemini; body `{ jd?: string }` (uses stored `jd_text` if omitted, saves JD to DB if not previously stored); returns `{ fit_score: number }`

`GET /health` — returns `{ status: "ok" }`

---

### 3. Resume Tailor (tailor.js)

**Inputs:** `user/base.md` + `user/config.json` + JD text

**Implementation:** One Gemini call for stack selection + fit score + detected skills. All skill formatting and placeholder substitution done programmatically (no second Gemini call).

#### config.json structure (use exactly this shape)
```json
{
  "stacks": {
    "csharp": {
      "name": "Your Name",
      "primary_stack": "C# (ASP.NET Core)",
      "job_title_display": "Software Engineer",
      "lang_skills":     ["C#", "Python", "JavaScript", "TypeScript"],
      "frontend_skills": ["React", "Next.js", "Tailwind CSS"],
      "backend_skills":  ["ASP.NET Core", "RESTful API", "Entity Framework Core"],
      "database_skills": ["SQL Server", "PostgreSQL", "Redis"],
      "cloud_skills":    ["AWS", "Docker", "Git & GitHub Actions"],
      "ai_skills":       ["LLM Integration", "Prompt Engineering"],
      "experiences": [
        {
          "id": "exp1",
          "technologies": "C#, ASP.NET Core, React, TypeScript, SQL Server, AWS, Docker",
          "bullet_pool": [
            { "id": "backend",  "text": "Built **RESTful APIs** using **C#** and **ASP.NET Core**", "must_have": false, "tags": ["backend", "api"] },
            { "id": "devops",   "text": "Deployed to **AWS ECS** with **Docker** and **GitHub Actions** CI/CD", "must_have": false, "tags": ["devops", "aws", "docker"] },
            { "id": "test",     "text": "Created unit tests using **xUnit** and **Jest**", "must_have": false, "tags": ["testing"] }
          ]
        },
        {
          "id": "exp2",
          "technologies": "C#, ASP.NET Core, React, SQL Server, Redis, Docker",
          "bullet_pool": [
            { "id": "backend", "text": "Engineered high-traffic APIs with **Redis** caching", "must_have": false, "tags": ["backend", "performance"] },
            { "id": "auth",    "text": "Implemented JWT authentication", "must_have": false, "tags": ["auth", "security"] }
          ]
        }
      ]
    }
  },
  "job_roles": {
    "swe": {
      "summary": "Software Engineer with N years experience... {{primary_stack}}...",
      "experience_slots": { "exp1": 5, "exp2": 3 },
      "include_ai_skills": false
    }
  },
  "soft_skills": {
    "pool": [
      { "keyword": "communication", "bullet": "Communicated technical concepts clearly to stakeholders" },
      { "keyword": "leadership",    "bullet": "Mentored junior team members and contributed to code review culture" }
    ]
  }
}
```

**Key schema rules:**
- `experiences[].id` must match a key in `job_roles[].experience_slots` (e.g. `exp1`, `exp2`)
- `experience_slots` values = number of bullet slots in `base.md` for that experience block
- `bullet_pool[].must_have: true` → always selected; `false` → scored by JD keyword/tag match
- `bullet_pool[].stack_variant` (optional) → only include bullet when stack variant matches (e.g. `"python_django"`)
- `technologies_variants` (optional object on experience) → override `technologies` for specific stack variants

#### base.md placeholders (use exactly these names)
```
{{name}}                  → full name (from stack config)
{{summary}}               → role summary sentence
{{job_title_display}}     → job title in experience headers
{{lang_skills}}           → skills line, formatted with **bold**
{{frontend_skills}}       → skills line
{{backend_skills}}        → skills line
{{database_skills}}       → skills line
{{cloud_skills}}          → skills line
{{ai_skills_section}}     → full AI skills section (empty string if not ai_engineer role)
{{exp1_technologies}}     → technologies line for first experience block
{{exp1_bullet_1}} … {{exp1_bullet_N}}  → N bullet slots for exp1
{{exp2_technologies}}     → technologies line for second experience block
{{exp2_bullet_1}} … {{exp2_bullet_M}}  → M bullet slots for exp2
<!-- SOFT_SKILLS_INJECT -->  → placement marker for soft-skill bullet injection (removed from output)
```

#### tailor.js logic (step by step)

**Step 1 — Gemini call (JSON mode)**
Send JD to Gemini. Response:
```json
{ "job_role": "swe", "stack": "csharp", "python_framework": null, "detected_skills": ["C#", "ASP.NET Core"], "fit_score": 87 }
```

**Step 2 — Skill formatting (programmatic)**
For each skill list in the chosen stack:
- The first item is always bolded: `**skill**`
- Any other skill that appears in `detected_skills`: bold it + move it to the front (after the first item)
- All other skills: leave as plain text at the end

**Step 3 — Bullet pool selection (programmatic)**
For each experience block listed in `job_roles[role].experience_slots`:
1. Filter `bullet_pool` by `stack_variant` (exclude entries whose variant doesn't match)
2. Always include `must_have: true` bullets
3. Score remaining optional bullets: +2 per tag that overlaps with detected skills, +1 per detected skill found in bullet text
4. Fill slots with: must-have bullets first, then top-scored optional bullets
5. Empty slots replaced with empty string; empty `- ` lines removed from output

**Step 4 — Soft skill injection (programmatic)**
- Scan JD text for `keyword` values in `soft_skills.pool` (case-insensitive)
- Pick at most 2 matching `bullet` strings
- Inject as `- bullet` lines at the `<!-- SOFT_SKILLS_INJECT -->` marker in `base.md`
- Marker is removed from output whether or not bullets are injected

**Step 5 — Fill placeholders (programmatic)**
Replace every `{{placeholder}}` in `base.md` with the corresponding value.

#### Absolute rules
- Summary: DO NOT touch
- All existing bullet text: DO NOT rewrite
- Education, Certification, header, dates: DO NOT touch
- DO NOT add or remove bullet points (except optional soft skill bullets at the inject marker)

---

### 4. Cover Letter Generator (coverletter.js)

**Approach:** Fill-in-the-blank only. Gemini fills placeholders via JSON mode, does not rewrite the template.

**Placeholders in user/cover-letter/template.md:**
```
{{company}}              ← company name
{{job_title}}            ← job title
{{why_company}}          ← 1-2 sentences from JD about why this company
{{matching_skills}}      ← top 3 skills from JD that match the resume
{{specific_project}}     ← most relevant bullet point from experience
{{why_company_culture}}  ← 1-2 sentences about culture/mission fit from JD
```

**Rules:**
- Keep all other sentences in the template exactly as written
- Only replace the `{{placeholder}}` tokens
- Output length must match the template (no extra paragraphs)

> If `user/cover-letter/template.md` is missing, skip cover letter generation and log a clear TODO. Do not block the rest of the pipeline.

---

### 5. PDF Exporter (exporter.js)

**Assumes Oh My CV is already running** — lifecycle managed entirely by `server.js`.

**Resume PDF — via Oh My CV + Puppeteer:**
1. Launch Puppeteer (headless), navigate to `localhost:5173`
3. Inject resume data into the app's IndexedDB (localForage key: `ohmycv_data`, version key: `ohmycv_version`)
4. Navigate to `/editor/{resumeId}`, wait for `#resume-preview` to render
5. Call `page.pdf()` → save to `output/YYYY-MM-DD_Company_Title/resume.pdf`

**Cover letter PDF — via plain HTML + Puppeteer:**
1. Convert cover letter markdown to simple HTML
2. Call `page.setContent()` + `page.pdf()` → save to `output/.../cover-letter.pdf`

> Oh My CV must be started with `PORT=5173` to avoid conflicting with the backend on port 3000.

---

### 6. Database (db.js)

**Engine:** `node:sqlite` — built into Node.js v22+, no native compilation required.

**Table: `applications`**

| Column                | Type        | Notes |
|-----------------------|-------------|-------|
| id                    | INTEGER PK  | autoincrement |
| created_at            | TEXT        | ISO 8601 |
| company               | TEXT        | |
| job_title             | TEXT        | |
| url                   | TEXT        | |
| source                | TEXT        | "linkedin" / "seek" / "other" |
| jd_text               | TEXT        | full JD |
| stack_used            | TEXT        | "csharp" / "python" / "java" |
| fit_score             | INTEGER     | 0–100 |
| resume_pdf_path       | TEXT        | relative URL path |
| coverletter_pdf_path  | TEXT        | relative URL path |
| status                | TEXT        | "generated" / "applied" / "interview" / "rejected" |

---

## Tech Stack

| Layer      | Tech                                                        |
|------------|-------------------------------------------------------------|
| Frontend   | Vanilla HTML/CSS/JS                                         |
| Backend    | Node.js v22+, Express (port 3000)                           |
| AI         | Gemini API — model set via `GEMINI_MODEL` in `.env`         |
| Database   | SQLite via `node:sqlite` (built-in, no npm install needed)  |
| PDF export | Puppeteer + Oh My CV (resume) / plain HTML (cover letter)   |
| Templates  | `base.md` + `config.json` (Oh My CV markdown format)        |

---

## Environment Setup

```bash
# 1. Install Oh My CV dependencies (only needed once, or after moving the project folder)
cd oh-my-cv-main
pnpm install

# 2. Install backend dependencies
cd backend
npm install
```

`backend/.env`:
```
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash
OHMYCV_PATH=../oh-my-cv-main
OHMYCV_PORT=5173
OUTPUT_DIR=../output
```

**Running:**
```bash
# Terminal 1 — Oh My CV (must be on port 5173, not 3000)
cd oh-my-cv-main && PORT=5173 pnpm dev

# Terminal 2 — Backend + Frontend
cd backend && node server.js

# Open http://localhost:3000
```

---

## Demo Mode

A static demo build that requires no backend, no API key, and can be hosted on GitHub Pages.

### How it works

`VITE_DEMO_MODE=true` activates a mock layer in `frontend/src/lib/api.ts`. Every API call is intercepted before any `fetch` is made:

| Operation | Demo behaviour |
|---|---|
| All GET / list / read calls | Return hardcoded data from `demo-data.ts` |
| `preview()` | Returns pre-rendered HTML from `/demo/preview.html` (static file) |
| `getPdfUrl()` | Returns `/demo/resume.pdf` or `/demo/coverletter.pdf` (static files) |
| `patchApplication()` | Silent fake success (allows browsing without interruption) |
| All write operations (analyze, delete, rescore, save…) | Trigger `DemoCloneModal` + return fake success |

### Demo assets

Pre-generated files committed to the repo under `frontend/public/demo/`:

| File | What it is |
|---|---|
| `resume.md` | Source markdown for the fictional candidate (Jordan Avery) |
| `coverletter.md` | Source markdown for the cover letter |
| `resume.pdf` | Generated by `npm run gen:demo` — served as static download |
| `coverletter.pdf` | Same |
| `preview.html` | Pre-rendered resume HTML — served as inline preview |

Regenerate after editing the `.md` files:
```bash
npm run gen:demo
```

### Build & deploy

```bash
npm run build:demo        # outputs to demo-dist/
```

GitHub Actions workflow (`.github/workflows/deploy-demo.yml`) automatically deploys `demo-dist/` to GitHub Pages on every push to `main`.

**One-time repo setup:** Settings → Pages → Source → **GitHub Actions**

### Files involved

| File | Purpose |
|---|---|
| `frontend/src/lib/api.ts` | Mock layer — `DEMO_MODE` flag + `triggerDemo()` |
| `frontend/src/lib/demo-data.ts` | Hardcoded fake applications, analyze result, templates |
| `frontend/src/components/DemoCloneModal.tsx` | Modal shown when visitor attempts a write action |
| `frontend/public/demo/` | Pre-generated static assets (PDFs + preview HTML) |
| `frontend/.env.demo` | `VITE_DEMO_MODE=true` |
| `scripts/generate-demo-assets.js` | Regenerates PDFs + preview HTML from source `.md` files |
| `.github/workflows/deploy-demo.yml` | CI/CD — auto-deploys demo to GitHub Pages |

---

## Out of Scope (for now)
- Browser extension / auto-scraping
- Auto-submitting applications
- Email tracking

---

## Notes for AI Agents
1. `resumes/config.json` soft_skills.pool uses `{ keyword, bullet }` objects — not plain strings.
2. Oh My CV pnpm symlinks break if the project folder is moved — run `pnpm install` from `oh-my-cv-main/` to fix.
3. Oh My CV defaults to port 3000; always start with `PORT=5173` to avoid conflict with the backend.
4. SQLite uses named parameters with `:name` syntax (not `@name`) for `node:sqlite`.
5. The exporter spawns Oh My CV with `PORT` and `NUXT_PORT` env vars set to `OHMYCV_PORT`.
6. To change the Gemini model, edit `GEMINI_MODEL` in `.env` — no code changes needed.
7. Do NOT create separate markdown files per stack — one `base.md` with placeholders only.
