# AI Resume Tailor

Paste a job description → get a tailored resume PDF + cover letter PDF in ~30 seconds.

Powered by Gemini AI. Runs entirely on your local machine — your data never leaves your computer.

> **This tool is designed for local, single-user use only.**
> Do not deploy it to a public server — there is no authentication and all API endpoints are unauthenticated.
> Your resume data, job descriptions, and AI-generated content are stored in a local SQLite database.

**[→ Live Demo](https://tristachou.github.io/ai-resume-tailor)** — read-only showcase with fictional data, no setup required.

---

## Getting Started for New Users

**Requirements:** Node.js v22+, a Gemini API key (free tier works)

```bash
# 1. Clone the repo
git clone https://github.com/tristachou/ai-resume-tailor.git
cd job-apply-bot

# 2. Install dependencies
npm run install:all

# 3. Add your personal data
mkdir -p user/cover-letter

cp resumes/base.md user/base.md
cp resumes/config.json user/config.json
cp cover-letter/template.md user/cover-letter/template.md
```

**Edit these three files** with your own details:
- `user/base.md` — your resume in the `{{placeholder}}` format
- `user/config.json` — your per-stack skill lists and bullet variants
- `user/cover-letter/template.md` — your cover letter template

```bash
# 4. Set your Gemini API key
#    Create backend/.env with:  GEMINI_API_KEY=your_key_here

# 5. (Optional) Choose your default theme in user.config.js
#    Options: classic | modern | minimal | compact | bold

# 6. Start
npm run dev
```

Open **http://localhost:5173**, paste a job description, click Generate.

The `user/` folder is gitignored — your personal data stays local.

---

## Personalisation

| File | What to edit |
|------|-------------|
| `user/base.md` | Your resume — replace example text with your own experience |
| `user/config.json` | Your tech stacks and per-stack skill lists |
| `user/cover-letter/template.md` | Your cover letter — keep the `{{placeholder}}` tokens |
| `user.config.js` | Active theme and Gemini model |
| `themes/*.css` | CSS for each theme — edit freely, reload preview to see changes |

---

## How it works

```
Paste JD → Generate → Gemini tailors resume + cover letter
         → Editor (review & edit markdown)
         → Download PDF (uses your chosen theme CSS)
```

---

## Themes

Five built-in themes live in `themes/`. Switch per-application in the Generate form or Editor, or use the **Style** page to live-edit CSS.

| Theme | Description |
|-------|-------------|
| `classic` | Single column, Times New Roman, centered header |
| `modern` | (Placeholder — same as classic for now) |
| `minimal` | (Placeholder) |
| `compact` | (Placeholder) |
| `bold` | (Placeholder) |

---

## Dev commands

```bash
npm run dev          # start backend + frontend together
npm run build        # build frontend to backend/public/ (production)
npm start            # start backend only (serves built frontend)

cd backend && npm test  # run unit tests
```

### Demo build

```bash
npm run build:demo   # build static demo → demo-dist/
# preview locally:
cd frontend && npx vite preview --outDir ../demo-dist --port 4173
# then open http://localhost:4173

npm run gen:demo     # regenerate demo PDFs + preview HTML (run after editing demo/*.md)
```

The demo build uses `VITE_DEMO_MODE=true` — all API calls are intercepted and return fictional data. No backend needed. Deployed automatically to GitHub Pages on every push to `main`.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Node.js v22+, Express (port 3000) |
| AI | Google Gemini API |
| Database | SQLite via `node:sqlite` (built-in, no npm install needed) |
| PDF export | Puppeteer |
