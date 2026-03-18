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

## Phase 4 — End-to-End Test

| # | Task | Status | Notes |
|---|------|--------|-------|
| 13 | Smoke test: paste JD → POST /process → PDFs generated | `[x]` | Atlassian/Full-Stack-Developer — fit_score: 92, stack: csharp |
| 14 | Verify: SQLite record created, status updatable | `[x]` | DB insert + PATCH /applications/:id confirmed |
| 15 | Verify: PDFs saved to `output/YYYY-MM-DD_Company_Title/` | `[x]` | resume.pdf (72 KB) + cover-letter.pdf (48 KB) |

---

## Component Reference

### tailor.js logic
1. Gemini reads JD → returns `{ stack, detected_skills, fit_score }` (JSON mode)
2. Programmatic: format each skill list (primary always bold; detected others bold+front; rest plain)
3. Programmatic: scan JD for `soft_skills.pool[].keyword` → pick ≤2 bullets → inject before Phygitalker block
4. Programmatic: `replaceAll` all 15 `{{placeholders}}` in `base.md`
5. Summary / bullets / education / certs / dates: **DO NOT touch**

### coverletter.js placeholders
`{{company}}` `{{job_title}}` `{{why_company}}` `{{matching_skills}}` `{{specific_project}}` `{{why_company_culture}}`

### POST /process
```
Request:  { job_title, company, jd, url, source }
Response: { fit_score, stack, detected_skills, bolded_skills, resume_pdf, coverletter_pdf, record_id }
```

### GET /applications — all SQLite records
### PATCH /applications/:id — update `status` field
### GET /health — `{ status: "ok" }`

### SQLite table: `applications`
`id, created_at, company, job_title, url, source, jd_text, stack_used, fit_score, resume_pdf_path, coverletter_pdf_path, status`

### Oh My CV
- Root: `oh-my-cv-main/` — pnpm workspace, run `pnpm install` from root after moving project
- Dev server: auto-started by `server.js` on port 5173 (`PORT` + `NUXT_PORT` env vars)
- Access: `localhost:3000/cv` (reverse proxied; no need to open port 5173 directly)
- Data store: IndexedDB via localForage — key `ohmycv_data`, version key `ohmycv_version`
- CSS: read from `resumes/resume.css` at exporter startup (edit there; no code changes needed)

### package.json dependencies
`express`, `axios`, `dotenv`, `puppeteer`, `http-proxy-middleware`

### .env keys
```
GEMINI_API_KEY   — Gemini API key
GEMINI_MODEL     — model name (e.g. gemini-2.5-flash) — change here to switch models
OHMYCV_PATH      — path to oh-my-cv-main/ relative to backend/ (default: ../oh-my-cv-main)
OHMYCV_PORT      — port for Oh My CV dev server (default: 5173)
OUTPUT_DIR       — output folder relative to backend/ (default: ../output)
```
