'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { insertApplication, getAllApplications, updateApplicationStatus } = require('./db');

// ─── Oh My CV process management ─────────────────────────────────────────────

const OHMYCV_SITE_PATH = path.resolve(
  __dirname,
  process.env.OHMYCV_PATH || '../oh-my-cv-main',
  'site'
);
const OHMYCV_PORT = process.env.OHMYCV_PORT || 5173;
const OHMYCV_URL = `http://localhost:${OHMYCV_PORT}`;

let ohmycvProcess = null;

async function startOhMyCV() {
  console.log('[ohmycv] Starting Oh My CV dev server...');

  ohmycvProcess = spawn('pnpm', ['dev'], {
    cwd: OHMYCV_SITE_PATH,
    shell: true,
    stdio: 'pipe',
    env: {
      ...process.env,
      PORT: String(OHMYCV_PORT),
      NUXT_PORT: String(OHMYCV_PORT),
    },
  });

  ohmycvProcess.stdout.on('data', d => process.stdout.write(`[ohmycv] ${d}`));
  ohmycvProcess.stderr.on('data', d => process.stderr.write(`[ohmycv] ${d}`));
  ohmycvProcess.on('exit', code => {
    if (code !== null) console.log(`[ohmycv] process exited with code ${code}`);
  });

  // Poll until Oh My CV is ready (up to 40s)
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      await axios.get(OHMYCV_URL, { timeout: 1000 });
      console.log(`[ohmycv] Ready at ${OHMYCV_URL}`);
      return;
    } catch { /* not ready yet */ }
  }
  throw new Error('Oh My CV failed to start within 40s');
}

function killOhMyCV() {
  if (ohmycvProcess) {
    ohmycvProcess.kill();
    ohmycvProcess = null;
  }
}

// Kill Oh My CV when the main process exits
process.on('SIGINT',  () => { killOhMyCV(); process.exit(0); });
process.on('SIGTERM', () => { killOhMyCV(); process.exit(0); });

// ─── Express app ──────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/output', express.static(path.join(__dirname, '../output')));

// Reverse proxy: /cv/* → Oh My CV dev server (localhost:5173)
app.use('/cv', createProxyMiddleware({
  target: OHMYCV_URL,
  changeOrigin: true,
  pathRewrite: { '^/cv': '' },
  ws: true, // proxy WebSocket for Nuxt HMR
  on: {
    error: (err, req, res) => {
      console.error('[proxy error]', err.message);
      res.status(502).send('Oh My CV proxy error');
    },
  },
}));

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Process ──────────────────────────────────────────────────────────────────

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

startOhMyCV()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\nServer running at http://localhost:${PORT}`);
      console.log(`Oh My CV editor: http://localhost:${PORT}/cv\n`);
    });
  })
  .catch(err => {
    console.error('Failed to start Oh My CV:', err.message);
    process.exit(1);
  });
