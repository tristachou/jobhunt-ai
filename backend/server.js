'use strict';

require('dotenv').config();

const express = require('express');
const path    = require('path');
const fs      = require('fs');

// ─── Paths ─────────────────────────────────────────────────────────────────────

const USER_CONFIG_PATH = path.resolve(__dirname, '../user.config.js');
const PROMPTS_PATH     = path.resolve(__dirname, '../user/prompts.json');
const THEMES_DIR       = path.resolve(__dirname, '../themes');
const BASE_MD_PATH     = path.resolve(__dirname, '../user/base.md');

/** Load user config (not cached — allows live changes without restart issues) */
function getUserConfig() {
  delete require.cache[require.resolve(USER_CONFIG_PATH)];
  return require(USER_CONFIG_PATH);
}

/** Get CSS path for a theme name. */
function themeCssPath(theme) {
  return path.join(THEMES_DIR, `${theme}.css`);
}

const {
  insertApplication,
  getAllApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
} = require('./db');

const app = express();
app.use(express.json());

// ─── API Router ────────────────────────────────────────────────────────────────

const api = express.Router();

// Health
api.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Analyze — Stage 1 ────────────────────────────────────────────────────────

api.post('/analyze', async (req, res) => {
  const { job_title, company, jd, url, source, theme } = req.body;

  if (!job_title || !company || !jd) {
    return res.status(400).json({ error: 'job_title, company, and jd are required' });
  }

  // Theme: explicit in request → user.config.js default → 'classic'
  const resolvedTheme = theme || getUserConfig().theme || 'classic';

  try {
    const { tailorResume }        = require('./tailor');
    const { generateCoverLetter } = require('./coverletter');

    const tailor  = await tailorResume({ jd });
    const coverMd = await generateCoverLetter({ company, job_title, jd });

    const id = insertApplication({
      created_at: new Date().toISOString(),
      company,
      job_title,
      url:        url    || '',
      source:     source || 'other',
      jd_text:    jd,
      stack_used: tailor.stack,
      fit_score:  tailor.fit_score,
      resume_md:  tailor.markdown,
      cover_md:   coverMd || '',
      status:     'not_started',
      theme:      resolvedTheme,
    });

    res.json({
      id,
      fit_score:       tailor.fit_score,
      stack:           tailor.stack,
      detected_skills: tailor.detected_skills,
      bolded_skills:   tailor.bolded_skills,
      theme:           resolvedTheme,
    });
  } catch (err) {
    console.error('[/api/analyze error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── PDF Export — Stage 2 (on-demand) ─────────────────────────────────────────

api.get('/applications/:id/pdf', async (req, res) => {
  const type   = req.query.type === 'coverletter' ? 'coverletter' : 'resume';
  const record = getApplicationById(Number(req.params.id));

  if (!record) return res.status(404).json({ error: 'Not found' });

  const markdown = type === 'coverletter' ? record.cover_md : record.resume_md;
  if (!markdown) {
    return res.status(404).json({ error: `No ${type} markdown saved for this application` });
  }

  try {
    const { exportResumePDF, exportCoverLetterPDF } = require('./exporter');
    const buffer = type === 'coverletter'
      ? await exportCoverLetterPDF(markdown)
      : await exportResumePDF(markdown, record.theme || 'classic');

    const slug     = `${record.company}_${record.job_title}`.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `${slug}_${type}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('[/api/pdf error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Preview ───────────────────────────────────────────────────────────────────

api.post('/preview', (req, res) => {
  const { markdown, type, theme } = req.body;
  if (!markdown) return res.status(400).json({ error: 'markdown is required' });

  try {
    const { renderResume, renderCoverLetter } = require('./renderer');
    const html = type === 'coverletter'
      ? renderCoverLetter(markdown)
      : renderResume(markdown, theme || null);
    res.json({ html });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Prompts ───────────────────────────────────────────────────────────────────

api.get('/prompts', (_req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(PROMPTS_PATH, 'utf8')));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.put('/prompts', (req, res) => {
  const { tailor, coverletter } = req.body;
  if (typeof tailor !== 'string' || typeof coverletter !== 'string') {
    return res.status(400).json({ error: 'tailor and coverletter must be strings' });
  }
  try {
    fs.writeFileSync(PROMPTS_PATH, JSON.stringify({ tailor, coverletter }, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Style / Themes ────────────────────────────────────────────────────────────

// GET /api/style — return the active theme name + its CSS
api.get('/style', (_req, res) => {
  try {
    const config = getUserConfig();
    const theme  = config.theme || 'classic';
    res.json({ theme, css: fs.readFileSync(themeCssPath(theme), 'utf8') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/style — save CSS to a theme file (defaults to active theme)
api.put('/style', (req, res) => {
  const { css, theme } = req.body;
  if (typeof css !== 'string') return res.status(400).json({ error: 'css must be a string' });
  try {
    const resolvedTheme = theme || getUserConfig().theme || 'classic';
    fs.writeFileSync(themeCssPath(resolvedTheme), css, 'utf8');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/style/themes — list all available themes
api.get('/style/themes', (_req, res) => {
  try {
    const themes = fs.readdirSync(THEMES_DIR)
      .filter(f => f.endsWith('.css'))
      .map(file => ({
        name:  file.replace('.css', ''),
        label: formatThemeLabel(file.replace('.css', '')),
        css:   fs.readFileSync(path.join(THEMES_DIR, file), 'utf8'),
      }));
    res.json(themes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/style/preview — render resume HTML with a given CSS string
api.post('/style/preview', (req, res) => {
  const { css, theme } = req.body;
  if (typeof css !== 'string') return res.status(400).json({ error: 'css must be a string' });
  try {
    const { renderResumeWithCss } = require('./renderer');
    const apps     = getAllApplications();
    const latest   = apps.find(a => a.resume_md);
    const markdown = latest
      ? latest.resume_md
      : fs.readFileSync(BASE_MD_PATH, 'utf8');
    res.json({ html: renderResumeWithCss(markdown, css, theme || undefined) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function formatThemeLabel(name) {
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Applications CRUD ─────────────────────────────────────────────────────────

api.get('/applications', (_req, res) => {
  try {
    res.json(getAllApplications());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/applications/:id', (req, res) => {
  const record = getApplicationById(Number(req.params.id));
  record ? res.json(record) : res.status(404).json({ error: 'Not found' });
});

api.patch('/applications/:id', (req, res) => {
  const ok = updateApplication(Number(req.params.id), req.body);
  ok ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
});

api.delete('/applications/:id', (req, res) => {
  const ok = deleteApplication(Number(req.params.id));
  ok ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
});

// Mount all API routes under /api
app.use('/api', api);

// ─── Frontend (production) ─────────────────────────────────────────────────────
// In dev, Vite serves the frontend on port 5173.
// In production, serve the built frontend from backend/public/.

const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

// ─── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nServer running at http://localhost:${PORT}\n`);
});
