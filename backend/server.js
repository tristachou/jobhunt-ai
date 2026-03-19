'use strict';

require('dotenv').config();

const express = require('express');
const path    = require('path');
const fs      = require('fs');

const PROMPTS_PATH = path.resolve(__dirname, '../resumes/prompts.json');

const {
  insertApplication,
  getAllApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
} = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Analyze — Stage 1 ────────────────────────────────────────────────────────
// Runs AI tailoring + cover letter, saves markdown to DB, returns metadata.
// No PDF is generated here.

app.post('/analyze', async (req, res) => {
  const { job_title, company, jd, url, source } = req.body;

  if (!job_title || !company || !jd) {
    return res.status(400).json({ error: 'job_title, company, and jd are required' });
  }

  try {
    const { tailorResume }      = require('./tailor');
    const { generateCoverLetter } = require('./coverletter');

    const tailor  = await tailorResume({ jd });
    const coverMd = await generateCoverLetter({ company, job_title, jd });

    const id = insertApplication({
      created_at: new Date().toISOString(),
      company,
      job_title,
      url:       url    || '',
      source:    source || 'other',
      jd_text:   jd,
      stack_used: tailor.stack,
      fit_score:  tailor.fit_score,
      resume_md:  tailor.markdown,
      cover_md:   coverMd || '',
      status:    'analyzed',
    });

    res.json({
      id,
      fit_score:       tailor.fit_score,
      stack:           tailor.stack,
      detected_skills: tailor.detected_skills,
      bolded_skills:   tailor.bolded_skills,
    });
  } catch (err) {
    console.error('[/analyze error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── PDF Export — Stage 2 (on-demand) ─────────────────────────────────────────
// GET /applications/:id/pdf?type=resume|coverletter
// Generates PDF from stored markdown and streams it as a download.

app.get('/applications/:id/pdf', async (req, res) => {
  const type = req.query.type === 'coverletter' ? 'coverletter' : 'resume';
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
      : await exportResumePDF(markdown);

    const slug     = `${record.company}_${record.job_title}`.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `${slug}_${type}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('[/pdf error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Preview — for editor live preview ────────────────────────────────────────
// POST /preview  { markdown, type: "resume"|"coverletter" }
// Returns rendered HTML string (not a PDF).

app.post('/preview', (req, res) => {
  const { markdown, type } = req.body;
  if (!markdown) return res.status(400).json({ error: 'markdown is required' });

  try {
    const { renderResume, renderCoverLetter } = require('./renderer');
    const html = type === 'coverletter'
      ? renderCoverLetter(markdown)
      : renderResume(markdown);
    res.json({ html });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Prompts ───────────────────────────────────────────────────────────────────

app.get('/prompts', (_req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(PROMPTS_PATH, 'utf8')));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/prompts', (req, res) => {
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

// ─── Applications CRUD ─────────────────────────────────────────────────────────

app.get('/applications', (_req, res) => {
  try {
    res.json(getAllApplications());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/applications/:id', (req, res) => {
  const record = getApplicationById(Number(req.params.id));
  record ? res.json(record) : res.status(404).json({ error: 'Not found' });
});

app.patch('/applications/:id', (req, res) => {
  const ok = updateApplication(Number(req.params.id), req.body);
  ok ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
});

app.delete('/applications/:id', (req, res) => {
  const ok = deleteApplication(Number(req.params.id));
  ok ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
});

// ─── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nServer running at http://localhost:${PORT}\n`);
});
