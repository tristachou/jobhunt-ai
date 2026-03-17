'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');
const axios = require('axios');

// Oh My CV dev server settings
const OHMYCV_SITE_PATH = path.resolve(
  __dirname,
  process.env.OHMYCV_PATH || '../oh-my-cv-main',
  'site'
);
const OHMYCV_PORT = process.env.OHMYCV_PORT || 5173;
const OHMYCV_URL = `http://localhost:${OHMYCV_PORT}`;

let _devServerProcess = null;

// Resume CSS — loaded from resumes/resume.css at startup.
// Edit that file to change the PDF appearance; no code changes needed.
const CSS_PATH = path.resolve(__dirname, '../resumes/resume.css');
const DEFAULT_CSS = fs.readFileSync(CSS_PATH, 'utf8');

const DEFAULT_STYLES = {
  marginV: 50,
  marginH: 45,
  lineHeight: 1.3,
  paragraphSpace: 5,
  themeColor: '#377bb5',
  fontCJK: { name: '华康宋体', fontFamily: 'HKST' },
  fontEN: { name: 'Minion Pro' },
  fontSize: 15,
  paper: 'A4',
};

// ─── Dev Server ───────────────────────────────────────────────────────────────

async function _isServerRunning() {
  try {
    await axios.get(OHMYCV_URL, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

async function _ensureDevServer() {
  if (await _isServerRunning()) return;

  console.log('Starting Oh My CV dev server at', OHMYCV_SITE_PATH);
  _devServerProcess = spawn('pnpm', ['dev'], {
    cwd: OHMYCV_SITE_PATH,
    shell: true,
    stdio: 'pipe',
    env: {
      ...process.env,
      PORT: String(OHMYCV_PORT),
      NUXT_PORT: String(OHMYCV_PORT),
    },
  });

  _devServerProcess.stderr.on('data', d => process.stderr.write(d));

  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 1000));
    if (await _isServerRunning()) {
      console.log('Oh My CV dev server ready');
      return;
    }
  }
  throw new Error('Oh My CV dev server failed to start within 40s');
}

// ─── Resume PDF via Oh My CV ──────────────────────────────────────────────────

async function exportResumePDF({ markdown, name = 'resume', outputPath }) {
  await _ensureDevServer();

  const resumeId = Date.now();
  const now = new Date().toISOString();
  const storageData = {
    [resumeId]: {
      name,
      markdown,
      css: DEFAULT_CSS,
      styles: DEFAULT_STYLES,
      updated_at: now,
      created_at: now,
    },
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Load app to let localForage initialise its IndexedDB schema
    await page.goto(OHMYCV_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Inject resume data directly into localForage's IndexedDB store
    await page.evaluate(async (data, versionKey) => {
      const DB_NAME = 'localforage';
      const STORE_NAME = 'keyvaluepairs';

      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 2);
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
        req.onupgradeneeded = e => {
          const d = e.target.result;
          if (!d.objectStoreNames.contains(STORE_NAME)) {
            d.createObjectStore(STORE_NAME);
          }
        };
      });

      const put = (key, value) => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(value, key);
        tx.oncomplete = resolve;
        tx.onerror = e => reject(e.target.error);
      });

      await put('ohmycv_data', data);
      await put(versionKey, 'v1');
      db.close();
    }, storageData, 'ohmycv_version');

    // Navigate to the editor for this resume ID
    await page.goto(`${OHMYCV_URL}/editor/${resumeId}`, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for the resume preview element and an extra moment for fonts/layout
    await page.waitForSelector('#resume-preview', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 2500));

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    console.log('Resume PDF saved:', outputPath);
  } finally {
    await browser.close();
  }

  return outputPath;
}

// ─── Cover Letter PDF via plain HTML ─────────────────────────────────────────

function _mdToHtml(text) {
  // Strip comment lines (lines starting with #)
  const noComments = text
    .split('\n')
    .filter(l => !l.trimStart().startsWith('#'))
    .join('\n');

  // Convert markdown bold to <strong>
  const withBold = noComments.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Convert paragraphs (blank-line separated blocks) to <p> tags
  return withBold
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

async function exportCoverLetterPDF({ markdown, outputPath }) {
  const bodyHtml = _mdToHtml(markdown);
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {
    font-family: "Times New Roman", serif;
    font-size: 11pt;
    line-height: 1.5;
    margin: 50px 60px;
    color: #000;
  }
  p { margin: 0 0 0.8em 0; }
  strong { font-weight: bold; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: false,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    });
    console.log('Cover letter PDF saved:', outputPath);
  } finally {
    await browser.close();
  }

  return outputPath;
}

module.exports = { exportResumePDF, exportCoverLetterPDF };
