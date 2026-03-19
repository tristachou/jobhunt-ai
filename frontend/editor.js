'use strict';

// ─── State ────────────────────────────────────────────────────────────────────

const params   = new URLSearchParams(location.search);
const recordId = Number(params.get('id'));
let activeTab  = 'resume';   // 'resume' | 'coverletter'
let record     = null;

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const titleEl    = document.getElementById('topbar-title');
const scoreBadge = document.getElementById('score-badge');
const textarea   = document.getElementById('editor-textarea');
const iframe     = document.getElementById('preview-frame');
const saveInd    = document.getElementById('save-indicator');
const btnResume  = document.getElementById('btn-resume');
const btnCover   = document.getElementById('btn-cover');

// ─── Init ─────────────────────────────────────────────────────────────────────

if (!recordId) {
  titleEl.textContent = 'No application ID in URL — go back and select one.';
} else {
  loadRecord();
}

async function loadRecord() {
  try {
    const res = await fetch(`/applications/${recordId}`);
    if (!res.ok) throw new Error('Not found');
    record = await res.json();
    renderHeader();
    switchTab(activeTab);
    enableDownloads();
  } catch (err) {
    titleEl.textContent = `Error loading record: ${err.message}`;
  }
}

function renderHeader() {
  titleEl.innerHTML = `<strong>${esc(record.company)}</strong><span>—</span>${esc(record.job_title)}`;

  const score = record.fit_score ?? 0;
  scoreBadge.textContent = `Fit ${score}/100`;
  scoreBadge.className   = 'score-badge' + (score < 50 ? ' low' : score < 70 ? ' mid' : '');
  scoreBadge.style.display = '';
}

function enableDownloads() {
  btnResume.disabled = !record.resume_md;
  btnCover.disabled  = !record.cover_md;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  if (!record) return;
  textarea.value = tab === 'coverletter' ? (record.cover_md || '') : (record.resume_md || '');
  refreshPreview();
}

// ─── Editor ───────────────────────────────────────────────────────────────────

let previewTimer = null;
let saveTimer    = null;

textarea.addEventListener('input', () => {
  // Live preview (300ms debounce)
  clearTimeout(previewTimer);
  previewTimer = setTimeout(refreshPreview, 300);

  // Auto-save (1000ms debounce)
  clearTimeout(saveTimer);
  setIndicator('saving', 'Saving…');
  saveTimer = setTimeout(saveCurrentTab, 1000);
});

async function refreshPreview() {
  const markdown = textarea.value;
  if (!markdown.trim()) { iframe.srcdoc = ''; return; }

  try {
    const res  = await fetch('/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown, type: activeTab }),
    });
    const { html } = await res.json();
    // Use srcdoc for sandboxed preview
    iframe.srcdoc = html;
  } catch { /* preview failure is non-critical */ }
}

async function saveCurrentTab() {
  if (!record) return;
  const field = activeTab === 'coverletter' ? 'cover_md' : 'resume_md';
  record[field] = textarea.value;

  try {
    await fetch(`/applications/${recordId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: textarea.value }),
    });
    setIndicator('saved', 'Saved');
    setTimeout(() => setIndicator('', '—'), 2000);
  } catch {
    setIndicator('', 'Save failed');
  }
}

function setIndicator(cls, text) {
  saveInd.className = 'save-indicator' + (cls ? ` ${cls}` : '');
  saveInd.textContent = text;
}

// ─── Downloads ────────────────────────────────────────────────────────────────

btnResume.addEventListener('click', () => downloadPDF('resume'));
btnCover.addEventListener('click',  () => downloadPDF('coverletter'));

function downloadPDF(type) {
  // Trigger browser download via anchor
  const a = document.createElement('a');
  a.href = `/applications/${recordId}/pdf?type=${type}`;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─── Util ─────────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
