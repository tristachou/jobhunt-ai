# Job Application Automation — SPEC

## Overview
A semi-automatic job application pipeline.
The user manually pastes job details into a local web UI, and the system automatically tailors a resume, generates a cover letter, exports PDFs, and logs the application to a local database.

No browser extension required. No scraping. No permission issues.

---

## Project Structure

```
job-apply-bot/
├── frontend/
│   ├── index.html            # Main input page + applications history (single-page)
│   └── app.js                # UI logic (vanilla JS)
├── backend/
│   ├── server.js             # Express server (port 3000), serves frontend + API
│   ├── tailor.js             # Resume tailoring logic (Gemini + programmatic)
│   ├── coverletter.js        # Cover letter placeholder fill (Gemini)
│   ├── exporter.js           # PDF export: Oh My CV (resume) + HTML (cover letter)
│   ├── db.js                 # SQLite operations via node:sqlite (built-in)
│   ├── package.json          # Dependencies: express, axios, dotenv, puppeteer
│   └── .env                  # GEMINI_API_KEY, GEMINI_MODEL, OHMYCV_PATH, etc.
├── resumes/
│   ├── base.md               # Universal resume template with {{placeholders}}
│   └── config.json           # Per-stack skill lists, bullet variants, soft skill pool
├── cover-letter/
│   └── template.md           # Cover letter template with 6 {{placeholders}}
├── output/
│   └── YYYY-MM-DD_Company_Title/
│       ├── resume.pdf
│       └── cover-letter.pdf
├── oh-my-cv-main/            # Oh My CV local project (pnpm workspace)
│   └── site/                 # Nuxt app — run with: PORT=5173 pnpm dev
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

`GET /health` — returns `{ status: "ok" }`

---

### 3. Resume Tailor (tailor.js)

**Inputs:** `resumes/base.md` + `resumes/config.json` + JD text

**Implementation:** One Gemini call for stack selection + fit score + detected skills. All skill formatting and placeholder substitution done programmatically (no second Gemini call).

#### config.json structure (use exactly this shape)
```json
{
  "stacks": {
    "csharp": {
      "primary_stack": "C# (ASP.NET Core)",
      "job_title_display": "Full-Stack Developer",
      "lang_skills":     ["C#", "Python", "JavaScript", "TypeScript", "PHP"],
      "frontend_skills": ["React", "Next.js", "Tailwind CSS", "Redux", "HTML5", "CSS3"],
      "backend_skills":  ["ASP.NET Core", "RESTful API", "Entity Framework Core", "Node.js", "OpenAPI", "Middleware"],
      "database_skills": ["SQL Server", "MySQL", "MongoDB", "PostgreSQL", "DynamoDB", "Redis", "Dapper"],
      "cloud_skills":    ["AWS", "Docker", "Git & GitHub Actions", "xUnit"],
      "bullets": {
        "orefox_technologies":       "C#, ASP.NET Core, React, TypeScript, SQL Server, RESTful API, Entity Framework Core, AWS, Docker",
        "orefox_backend_bullet":     "Implemented and maintained backend **RESTful APIs** using **C#** and **ASP.NET Core**, integrated with AI models for data analytics",
        "orefox_realtime_bullet":    "Built real-time monitoring dashboard using **SignalR** and Redis with sub-second synchronization",
        "orefox_test_bullet":        "Created unit tests for frontend and backend using **Jest** and **xUnit**",
        "phygitalker_technologies":  "C#, ASP.NET Core, React, SQL Server, Redis, GitHub Actions, Agile",
        "phygitalker_backend_bullet":"Engineered **RESTful APIs** using **C#** and **ASP.NET Core** with **Entity Framework Core**, database indexing and Redis caching for high-traffic stability",
        "phygitalker_auth_bullet":   "Implemented token-based authentication using **ASP.NET Core Identity** and JWT session management",
        "phygitalker_test_bullet":   "Established testing suites using **xUnit** and Jest, achieving high code coverage"
      }
    },
    "python": { "...": "same shape" },
    "java":   { "...": "same shape" }
  },

  "soft_skills": {
    "pool": [
      { "keyword": "communication",  "bullet": "Communicated technical concepts clearly to non-technical stakeholders across disciplines" },
      { "keyword": "autonomous",     "bullet": "Took ownership of tasks end-to-end, delivering independently in fast-paced environments" },
      { "keyword": "independent",    "bullet": "Took ownership of tasks end-to-end, delivering independently in fast-paced environments" },
      { "keyword": "leadership",     "bullet": "Mentored junior team members and contributed to code review culture" },
      { "keyword": "adaptable",      "bullet": "Adapted quickly to new technologies and delivered solutions with minimal onboarding time" },
      { "keyword": "proactive",      "bullet": "Proactively identified and resolved performance bottlenecks, improving system responsiveness" },
      { "keyword": "agile",          "bullet": "Drove sprint planning and backlog grooming in collaboration with product and design teams" }
    ]
  }
}
```

#### base.md placeholders (use exactly these names)
```
{{primary_stack}}             → summary sentence
{{job_title_display}}         → job title in experience headers
{{lang_skills}}               → skills line, formatted with ** bold **
{{frontend_skills}}           → skills line
{{backend_skills}}            → skills line
{{database_skills}}           → skills line
{{cloud_skills}}              → skills line
{{orefox_technologies}}       → technologies line under Orefox
{{orefox_backend_bullet}}     → first bullet under Orefox
{{orefox_realtime_bullet}}    → third bullet under Orefox
{{orefox_test_bullet}}        → fourth bullet under Orefox
{{phygitalker_technologies}}  → technologies line under Phygitalker
{{phygitalker_backend_bullet}}→ first bullet under Phygitalker
{{phygitalker_auth_bullet}}   → fourth bullet under Phygitalker
{{phygitalker_test_bullet}}   → eighth bullet under Phygitalker
```

#### tailor.js logic (step by step)

**Step 1 — Gemini call (JSON mode)**
Send JD to Gemini. Response:
```json
{ "stack": "csharp", "detected_skills": ["C#", "ASP.NET Core"], "fit_score": 87 }
```

**Step 2 — Skill formatting (programmatic)**
For each skill list in the chosen stack:
- The first item is always bolded: `**skill**`
- Any other skill that appears in `detected_skills`: bold it + move it to the front (after the first item)
- All other skills: leave as plain text at the end
- DO NOT add skills not in the list; DO NOT remove any skill

**Step 3 — Soft skill injection (programmatic)**
- Scan JD text for `keyword` values in `soft_skills.pool` (case-insensitive)
- Pick at most 2 matching `bullet` strings
- Append each as a new `- bullet` line before the Phygitalker experience block (end of Orefox block)
- If no keywords match, add nothing

**Step 4 — Fill placeholders (programmatic)**
Replace every `{{placeholder}}` in `base.md` with the corresponding value.

#### Absolute rules
- Summary: DO NOT touch
- All existing bullet text: DO NOT rewrite
- Education, Certification, header, dates: DO NOT touch
- DO NOT add or remove bullet points (except optional soft skill bullets in Step 3)

---

### 4. Cover Letter Generator (coverletter.js)

**Approach:** Fill-in-the-blank only. Gemini fills placeholders via JSON mode, does not rewrite the template.

**Placeholders in cover-letter/template.md:**
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

> If `cover-letter/template.md` is missing, skip cover letter generation and log a clear TODO. Do not block the rest of the pipeline.

---

### 5. PDF Exporter (exporter.js)

**Resume PDF — via Oh My CV + Puppeteer:**
1. Auto-start Oh My CV dev server if not already running (`PORT=5173 pnpm dev` in `oh-my-cv-main/`)
2. Launch Puppeteer (headless), navigate to `localhost:5173`
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
