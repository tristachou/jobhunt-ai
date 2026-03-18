'use strict';

// ─── Nav ──────────────────────────────────────────────────────────────────────

const formSection = document.getElementById('form-section');
const appsSection = document.getElementById('apps-section');
const navForm = document.getElementById('nav-form');
const navApps = document.getElementById('nav-apps');

navForm.addEventListener('click', e => {
  e.preventDefault();
  formSection.style.display = 'block';
  appsSection.style.display = 'none';
  navForm.classList.add('active');
  navApps.classList.remove('active');
});

navApps.addEventListener('click', e => {
  e.preventDefault();
  formSection.style.display = 'none';
  appsSection.style.display = 'block';
  navApps.classList.add('active');
  navForm.classList.remove('active');
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
    if (!res.ok) { showStatus('error', `Error: ${data.error || res.statusText}`); return; }
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
function hideStatus() { statusBar.style.display = 'none'; }

function renderResult(data) {
  const score = data.fit_score ?? 0;
  const scoreBadge = document.getElementById('r-score');
  scoreBadge.textContent = `${score} / 100`;
  scoreBadge.className = 'score-badge' + (score < 50 ? ' low' : score < 70 ? ' mid' : '');
  document.getElementById('r-stack').textContent = data.stack || '—';

  const boldedSet = new Set(data.bolded_skills || []);
  document.getElementById('r-detected').innerHTML =
    (data.detected_skills || []).map(s => `<span class="tag${boldedSet.has(s) ? ' bold' : ''}">${esc(s)}</span>`).join('') || '—';
  document.getElementById('r-bolded').innerHTML =
    (data.bolded_skills || []).map(s => `<span class="tag bold">${esc(s)}</span>`).join('') || '—';

  const downloads = document.getElementById('r-downloads');
  downloads.innerHTML = '';
  if (data.resume_pdf) {
    const a = document.createElement('a');
    a.href = data.resume_pdf; a.target = '_blank'; a.download = '';
    a.textContent = '⬇ Resume PDF';
    downloads.appendChild(a);
  }
  if (data.coverletter_pdf) {
    const a = document.createElement('a');
    a.href = data.coverletter_pdf; a.target = '_blank'; a.download = '';
    a.textContent = '⬇ Cover Letter PDF';
    downloads.appendChild(a);
  }
  resultBox.style.display = 'block';
}

// ─── History ──────────────────────────────────────────────────────────────────

const STATUSES = ['generated', 'applied', 'interview', 'rejected'];
const STATUS_DOTS = { generated: 'dot-generated', applied: 'dot-applied', interview: 'dot-interview', rejected: 'dot-rejected' };

let allApps      = [];
let activeFilter = 'all';
let sortAsc      = false;

document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeFilter = tab.dataset.filter;
    renderTable();
  });
});

const sortBtn = document.getElementById('sort-btn');
sortBtn.addEventListener('click', () => {
  sortAsc = !sortAsc;
  sortBtn.textContent = sortAsc ? 'Date ↑' : 'Date ↓';
  renderTable();
});

async function loadApplications() {
  const tbody = document.getElementById('apps-body');
  tbody.innerHTML = `<tr><td colspan="11" class="empty-state">Loading…</td></tr>`;
  try {
    const res = await fetch('/applications');
    allApps = await res.json();
    renderTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="11" style="color:#900;padding:16px">${esc(err.message)}</td></tr>`;
  }
}

function renderTable() {
  const tbody = document.getElementById('apps-body');
  let apps = activeFilter === 'all' ? [...allApps] : allApps.filter(a => a.status === activeFilter);
  apps.sort((a, b) => {
    const d = a.created_at.localeCompare(b.created_at);
    return sortAsc ? d : -d;
  });

  tbody.innerHTML = '';
  if (!apps.length) {
    tbody.innerHTML = `<tr><td colspan="11" class="empty-state">No applications found.</td></tr>`;
    return;
  }
  apps.forEach(app => {
    const [mainTr, detailTr] = buildRow(app);
    tbody.appendChild(mainTr);
    tbody.appendChild(detailTr);
  });
}

// ─── Row builder ──────────────────────────────────────────────────────────────

function buildRow(app) {
  const mainTr   = document.createElement('tr');
  mainTr.className = 'main-row';
  const detailTr = document.createElement('tr');
  detailTr.className = 'detail-row';

  // ▶ expand toggle
  const expandTd = document.createElement('td');
  expandTd.className = 'expand-cell';
  expandTd.textContent = '▶';
  const detailPanel = buildDetailPanel(app);
  detailTr.appendChild(Object.assign(document.createElement('td'), { colSpan: 11 }));
  detailTr.firstChild.appendChild(detailPanel);
  expandTd.addEventListener('click', () => {
    const open = detailPanel.style.display === 'block';
    detailPanel.style.display = open ? 'none' : 'block';
    expandTd.textContent = open ? '▶' : '▼';
    expandTd.style.color  = open ? '' : '#555';
  });
  mainTr.appendChild(expandTd);

  // created_at
  mainTr.appendChild(editableCell(app, 'created_at', {
    display: v => `<span style="white-space:nowrap;font-size:0.83rem">${esc((v || '').slice(0, 10))}</span>`,
  }));

  // company
  mainTr.appendChild(editableCell(app, 'company', {
    display: v => `<strong>${esc(v || '—')}</strong>`,
  }));

  // job_title
  mainTr.appendChild(editableCell(app, 'job_title', {
    display: v => esc(v || '—'),
  }));

  // source
  mainTr.appendChild(editableCell(app, 'source', {
    display: v => `<span style="text-transform:capitalize">${esc(v || '—')}</span>`,
    inputType: 'select',
    options: ['linkedin', 'seek', 'other'],
  }));

  // fit_score
  mainTr.appendChild(editableCell(app, 'fit_score', {
    display: v => {
      const s = v ?? 0;
      const color = s >= 70 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';
      return `<div class="score-cell">
        <span>${s}</span>
        <div class="score-bar-wrap"><div class="score-bar" style="width:${s}%;background:${color}"></div></div>
      </div>`;
    },
    inputType: 'number',
    min: 0,
    max: 100,
  }));

  // stack_used
  mainTr.appendChild(editableCell(app, 'stack_used', {
    display: v => esc(v || '—'),
  }));

  // status (custom badge + dropdown)
  mainTr.appendChild(buildStatusCell(app));

  // url
  mainTr.appendChild(editableCell(app, 'url', {
    display: v => v
      ? `<a class="url-link" href="${esc(v)}" target="_blank">↗ Link</a>`
      : `<span style="color:#ccc">—</span>`,
  }));

  // files (read-only)
  const filesTd = document.createElement('td');
  const parts = [
    app.resume_pdf_path      ? `<a class="file-link" href="${esc(app.resume_pdf_path)}" target="_blank">Resume</a>` : '',
    app.coverletter_pdf_path ? `<a class="file-link" href="${esc(app.coverletter_pdf_path)}" target="_blank">CL</a>` : '',
  ].filter(Boolean);
  filesTd.innerHTML = parts.join('<span class="file-sep">·</span>') || '<span style="color:#ccc">—</span>';
  mainTr.appendChild(filesTd);

  // delete
  const delTd  = document.createElement('td');
  const delBtn = document.createElement('button');
  delBtn.className = 'btn-danger';
  delBtn.textContent = 'Delete';
  delBtn.addEventListener('click', async () => {
    if (!confirm(`Delete "${app.job_title}" at ${app.company}?`)) return;
    if (await deleteApp(app.id)) {
      allApps = allApps.filter(a => a.id !== app.id);
      renderTable();
    }
  });
  delTd.appendChild(delBtn);
  mainTr.appendChild(delTd);

  return [mainTr, detailTr];
}

// ─── Editable cell ────────────────────────────────────────────────────────────

function editableCell(app, field, { display, inputType = 'text', options = null, min, max }) {
  const td = document.createElement('td');
  td.className = 'editable-cell';

  function showDisplay() {
    td.innerHTML = display(app[field]);
  }

  function showInput() {
    if (td.querySelector('input,select')) return; // already editing
    let input;

    if (options) {
      input = document.createElement('select');
      input.className = 'cell-input';
      options.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val; opt.textContent = val; opt.selected = val === String(app[field] ?? '');
        input.appendChild(opt);
      });
    } else {
      input = document.createElement('input');
      input.className = 'cell-input';
      input.type = inputType;
      input.value = app[field] ?? '';
      if (min !== undefined) input.min = min;
      if (max !== undefined) input.max = max;
    }

    td.innerHTML = '';
    td.appendChild(input);
    input.focus();
    if (input.tagName === 'INPUT') input.select();

    let committed = false;

    async function commit() {
      if (committed) return;
      committed = true;
      const raw = input.value;
      const newVal = inputType === 'number' ? Number(raw) : raw.trim();
      app[field] = newVal;
      showDisplay();
      await patchApp(app.id, { [field]: newVal });
      // If filter relies on status and it changed, refresh
      if (field === 'status' && activeFilter !== 'all' && activeFilter !== newVal) renderTable();
    }

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { committed = true; showDisplay(); }
    });
    if (options) input.addEventListener('change', () => input.blur());
  }

  showDisplay();
  td.addEventListener('click', e => {
    if (e.target.tagName === 'A') return; // don't hijack link clicks
    showInput();
  });
  return td;
}

// ─── Status cell ──────────────────────────────────────────────────────────────

function buildStatusCell(app) {
  const td = document.createElement('td');

  function render() {
    td.innerHTML = `
      <div class="status-wrap">
        <span class="status-badge ${esc(app.status)}">${esc(app.status)}</span>
        <div class="status-dropdown">
          ${STATUSES.map(s => `
            <div class="status-option" data-status="${s}">
              <span class="status-dot ${STATUS_DOTS[s]}"></span>${s}
            </div>`).join('')}
        </div>
      </div>`;

    const badge    = td.querySelector('.status-badge');
    const dropdown = td.querySelector('.status-dropdown');

    badge.addEventListener('click', e => {
      e.stopPropagation();
      closeAllDropdowns();
      dropdown.classList.add('open');
    });

    td.querySelectorAll('.status-option').forEach(opt => {
      opt.addEventListener('click', async e => {
        e.stopPropagation();
        const newStatus = opt.dataset.status;
        dropdown.classList.remove('open');
        app.status = newStatus;
        render();
        await patchApp(app.id, { status: newStatus });
        if (activeFilter !== 'all' && activeFilter !== newStatus) renderTable();
      });
    });
  }

  render();
  return td;
}

// ─── Detail panel (JD editable) ───────────────────────────────────────────────

function buildDetailPanel(app) {
  const panel = document.createElement('div');
  panel.className = 'detail-panel';

  const grid = document.createElement('div');
  grid.className = 'detail-grid';

  // Left: JD textarea
  const jdSection = document.createElement('div');
  jdSection.className = 'detail-section';
  jdSection.innerHTML = '<h4>Job Description</h4>';

  const jdArea = document.createElement('textarea');
  jdArea.className = 'detail-jd-edit';
  jdArea.value = app.jd_text || '';
  jdArea.placeholder = 'No job description saved.';

  const hint = document.createElement('div');
  hint.className = 'autosave-hint';
  hint.textContent = 'Auto-saves as you type';

  let saveTimer = null;
  jdArea.addEventListener('input', () => {
    hint.textContent = 'Saving…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      app.jd_text = jdArea.value;
      await patchApp(app.id, { jd_text: jdArea.value });
      hint.textContent = 'Saved';
      setTimeout(() => { hint.textContent = 'Auto-saves as you type'; }, 1500);
    }, 800);
  });

  jdSection.appendChild(jdArea);
  jdSection.appendChild(hint);

  // Right: record info (read-only summary)
  const infoSection = document.createElement('div');
  infoSection.className = 'detail-section';
  infoSection.innerHTML = `
    <h4>Record Info</h4>
    <div style="font-size:0.85rem;line-height:2.2">
      <div><strong>ID:</strong> ${app.id}</div>
      <div><strong>Created:</strong> ${esc((app.created_at || '').slice(0, 10))}</div>
      <div><strong>Fit Score:</strong> ${app.fit_score ?? '—'} / 100</div>
      <div><strong>Stack:</strong> ${esc(app.stack_used || '—')}</div>
      <div><strong>Source:</strong> ${esc(app.source || '—')}</div>
      ${app.url ? `<div><strong>URL:</strong> <a class="url-link" href="${esc(app.url)}" target="_blank">${esc(app.url)}</a></div>` : ''}
      <div style="margin-top:8px;color:#aaa;font-size:0.78rem">Click any cell in the row above to edit it.</div>
    </div>`;

  grid.appendChild(jdSection);
  grid.appendChild(infoSection);
  panel.appendChild(grid);
  return panel;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function patchApp(id, data) {
  try {
    await fetch(`/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error('Save failed:', err);
  }
}

async function deleteApp(id) {
  try {
    const res = await fetch(`/applications/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch { return false; }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function closeAllDropdowns() {
  document.querySelectorAll('.status-dropdown.open').forEach(d => d.classList.remove('open'));
}
document.addEventListener('click', closeAllDropdowns);

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
