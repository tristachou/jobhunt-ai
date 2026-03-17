'use strict';

// ─── Nav ──────────────────────────────────────────────────────────────────────

const formSection = document.getElementById('form-section');
const appsSection = document.getElementById('apps-section');

document.getElementById('nav-form').addEventListener('click', e => {
  e.preventDefault();
  formSection.style.display = '';
  appsSection.style.display = 'none';
});

document.getElementById('nav-apps').addEventListener('click', e => {
  e.preventDefault();
  formSection.style.display = 'none';
  appsSection.style.display = '';
  loadApplications();
});

// ─── Generate ─────────────────────────────────────────────────────────────────

const btnGenerate = document.getElementById('btn-generate');
const statusBar   = document.getElementById('status-bar');
const resultBox   = document.getElementById('result');

btnGenerate.addEventListener('click', async () => {
  const job_title = document.getElementById('job_title').value.trim();
  const company   = document.getElementById('company').value.trim();
  const source    = document.getElementById('source').value;
  const url       = document.getElementById('url').value.trim();
  const jd        = document.getElementById('jd').value.trim();

  if (!job_title || !company || !jd) {
    showStatus('error', 'Job Title, Company, and Job Description are required.');
    return;
  }

  showStatus('loading', 'Generating tailored resume and cover letter… this may take a minute.');
  btnGenerate.disabled = true;
  resultBox.style.display = 'none';

  try {
    const res = await fetch('/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_title, company, source, url, jd }),
    });

    const data = await res.json();

    if (!res.ok) {
      showStatus('error', `Error: ${data.error || res.statusText}`);
      return;
    }

    hideStatus();
    renderResult(data);
  } catch (err) {
    showStatus('error', `Network error: ${err.message}`);
  } finally {
    btnGenerate.disabled = false;
  }
});

function showStatus(type, msg) {
  statusBar.className = type;
  statusBar.textContent = msg;
  statusBar.style.display = 'block';
}

function hideStatus() {
  statusBar.style.display = 'none';
}

function renderResult(data) {
  const score = data.fit_score ?? 0;

  const scoreBadge = document.getElementById('r-score');
  scoreBadge.textContent = `${score} / 100`;
  scoreBadge.className = 'score-badge' + (score < 50 ? ' low' : score < 70 ? ' mid' : '');

  document.getElementById('r-stack').textContent = data.stack || '—';

  const boldedSet = new Set(data.bolded_skills || []);

  const detectedEl = document.getElementById('r-detected');
  detectedEl.innerHTML = (data.detected_skills || [])
    .map(s => `<span class="tag${boldedSet.has(s) ? ' bold' : ''}">${s}</span>`)
    .join('') || '—';

  const boldedEl = document.getElementById('r-bolded');
  boldedEl.innerHTML = (data.bolded_skills || [])
    .map(s => `<span class="tag bold">${s}</span>`)
    .join('') || '—';

  const downloads = document.getElementById('r-downloads');
  downloads.innerHTML = '';

  if (data.resume_pdf) {
    const a = document.createElement('a');
    a.href = data.resume_pdf;
    a.target = '_blank';
    a.download = '';
    a.textContent = '⬇ Resume PDF';
    downloads.appendChild(a);
  }

  if (data.coverletter_pdf) {
    const a = document.createElement('a');
    a.href = data.coverletter_pdf;
    a.target = '_blank';
    a.download = '';
    a.textContent = '⬇ Cover Letter PDF';
    downloads.appendChild(a);
  }

  resultBox.style.display = 'block';
}

// ─── Applications History ─────────────────────────────────────────────────────

const STATUSES = ['generated', 'applied', 'interview', 'rejected'];

async function loadApplications() {
  const tbody = document.getElementById('apps-body');
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#888">Loading…</td></tr>';

  try {
    const res = await fetch('/applications');
    const apps = await res.json();

    if (!apps.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#888">No applications yet.</td></tr>';
      return;
    }

    tbody.innerHTML = apps.map(app => `
      <tr>
        <td>${app.id}</td>
        <td style="white-space:nowrap">${app.created_at.slice(0, 10)}</td>
        <td>${esc(app.company)}</td>
        <td>${esc(app.job_title)}</td>
        <td>${esc(app.source || '—')}</td>
        <td>${app.fit_score ?? '—'}</td>
        <td>${esc(app.stack_used || '—')}</td>
        <td>
          <select class="status-select" data-id="${app.id}">
            ${STATUSES.map(s => `<option value="${s}"${app.status === s ? ' selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td style="white-space:nowrap">
          ${app.resume_pdf_path ? `<a href="${app.resume_pdf_path}" target="_blank">Resume</a>` : ''}
          ${app.coverletter_pdf_path ? ` · <a href="${app.coverletter_pdf_path}" target="_blank">CL</a>` : ''}
        </td>
      </tr>
    `).join('');

    // Status inline update
    tbody.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const id = sel.dataset.id;
        await fetch(`/applications/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: sel.value }),
        });
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="color:#900">${err.message}</td></tr>`;
  }
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
