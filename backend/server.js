'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const { insertApplication, getAllApplications, updateApplicationStatus } = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/output', express.static(path.join(__dirname, '../output')));

// ─── Health ──────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Process ─────────────────────────────────────────────────────────────────

app.post('/process', async (req, res) => {
  const { job_title, company, jd, url, source } = req.body;

  if (!job_title || !company || !jd) {
    return res.status(400).json({ error: 'job_title, company, and jd are required' });
  }

  try {
    const { tailorResume } = require('./tailor');
    const { generateCoverLetter } = require('./coverletter');
    const { exportResumePDF, exportCoverLetterPDF } = require('./exporter');

    const outputBase = path.resolve(__dirname, process.env.OUTPUT_DIR || '../output');
    const date = new Date().toISOString().slice(0, 10);
    const folderName = `${date}_${company.replace(/[^a-zA-Z0-9]/g, '-')}_${job_title.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const folder = path.join(outputBase, folderName);

    // 1. Tailor resume
    const { markdown: resumeMd, stack, detected_skills, bolded_skills, fit_score } = await tailorResume({ jd });

    // 2. Export resume PDF
    const resumePdfAbs = path.join(folder, 'resume.pdf');
    await exportResumePDF({ markdown: resumeMd, name: `${company} Resume`, outputPath: resumePdfAbs });

    // 3. Generate cover letter
    const coverMd = await generateCoverLetter({ company, job_title, jd });
    let coverletter_pdf = null;

    if (coverMd) {
      const coverPdfAbs = path.join(folder, 'cover-letter.pdf');
      await exportCoverLetterPDF({ markdown: coverMd, outputPath: coverPdfAbs });
      coverletter_pdf = `/output/${folderName}/cover-letter.pdf`;
    }

    // 4. Save to DB
    const record_id = insertApplication({
      created_at: new Date().toISOString(),
      company,
      job_title,
      url: url || '',
      source: source || 'other',
      jd_text: jd,
      stack_used: stack,
      fit_score,
      resume_pdf_path: `/output/${folderName}/resume.pdf`,
      coverletter_pdf_path: coverletter_pdf || '',
      status: 'generated',
    });

    res.json({
      fit_score,
      stack,
      detected_skills,
      bolded_skills,
      resume_pdf: `/output/${folderName}/resume.pdf`,
      coverletter_pdf,
      record_id,
    });
  } catch (err) {
    console.error('[/process error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Applications ─────────────────────────────────────────────────────────────

app.get('/applications', (_req, res) => {
  try {
    res.json(getAllApplications());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/applications/:id', (req, res) => {
  const { status } = req.body;
  const ok = updateApplicationStatus(Number(req.params.id), status);
  ok ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
