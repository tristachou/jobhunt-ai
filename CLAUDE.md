# Job Apply Bot — Claude Code Instructions

> These rules apply to every conversation. Follow them automatically without being asked.

## Project Summary

Semi-automatic job application pipeline. User pastes JD → AI tailors resume + cover letter (markdown) → user reviews/edits → exports PDF on demand.

Key docs:
- `SPEC.md` — source of truth for architecture and component behaviour
- `PLAN.md` — implementation progress tracker
- `REFACTOR_PLAN.md` — v2 refactoring roadmap (active)

---

## Rule 1 — Update SPEC.md automatically

Update `SPEC.md` whenever any of the following change:
- API endpoints (added / removed / request or response shape changed)
- File structure (new files added, files removed or renamed)
- Component behaviour (tailor.js, coverletter.js, exporter.js, renderer.js logic)
- Tech stack decisions (new dependency added or removed)
- Environment variables (new keys in .env)
- DB schema (new columns, new tables)

How: read the current SPEC.md first, then make targeted edits to the affected sections only. Do not rewrite unrelated sections.

---

## Rule 2 — Update PLAN.md automatically

Update `PLAN.md` whenever:
- A task or phase is completed → mark `[x]`, add brief notes column
- A new task is identified → add a row to the appropriate phase
- Architecture decisions are made → update the Component Reference section
- A phase is started → mark tasks `[~]` as they begin

---

## Rule 3 — Run tests after code changes

After any change to: `tailor.js`, `coverletter.js`, `db.js`, `renderer.js` (when created), run:
```
cd backend && npm test
```
Report pass/fail. If tests fail, diagnose and fix before finishing.

---

## Rule 4 — REFACTOR_PLAN.md

During the v2 refactor, update `REFACTOR_PLAN.md` to:
- Mark phases as complete
- Record decisions made (especially Open Questions that get answered)
- Add new open questions that arise

---

## Rule 5 — Update CHANGELOG.md on every code change

After any code change in a conversation, update `CHANGELOG.md` with a summary suitable for use as a git commit message.

Format each entry as:

```
## YYYY-MM-DD — <short title>

<what changed and why, 2–5 bullet points>
```

Rules:
- **Same conversation** → keep editing the same entry (do not create a new one)
- **New conversation** → prepend a new entry at the top of the file
- If `CHANGELOG.md` does not exist yet, create it
- Write in English, imperative mood (e.g. "Add", "Fix", "Refactor")
- Focus on *what* changed and *why*, not implementation detail — the goal is a copy-pasteable commit message

---

## Key Conventions

### node:sqlite
- Built-in Node v22+, no npm install needed
- Named params use `:name` syntax (not `@name`)
- `run(data)` takes plain object keys (no `:` prefix)

### Gemini API
- Model set via `GEMINI_MODEL` env var — never hardcode model name
- JSON mode: `generationConfig: { response_mime_type: 'application/json' }`

### resume markdown format (base.md)
- Uses Oh My CV syntax: `  ~ text` for right-side annotations
- 16 `{{placeholders}}` — do NOT add or remove any
- `soft_skills.pool` entries must be `{ keyword, bullet }` objects

### DB
- Test DB uses env var: `TEST_DB_PATH` — set this in tests to avoid touching production DB
- All CRUD in `db.js`, imported by `server.js`

### Frontend
- Vanilla JS, no framework
- `esc()` for all user-generated content rendered as HTML
- Status values: `generated` | `analyzed` | `exported` | `applied` | `interview` | `rejected`

---

## Known Gotchas

1. Oh My CV pnpm symlinks break when project folder is moved — run `pnpm install` from `oh-my-cv-main/` to fix (will be removed in v2 refactor)
2. Oh My CV must start with `PORT=5173` — defaults to 3000, conflicts with backend
3. `node:sqlite` does NOT support WAL mode toggle via pragma in all versions — keep default journal mode
4. Puppeteer `page.pdf()` requires `printBackground: true` to render coloured elements
5. `formatSkillList` in tailor.js: first skill is ALWAYS bold, regardless of whether it's in detected_skills
