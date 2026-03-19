'use strict';

/**
 * renderer.js — Converts base.md format → full HTML for PDF export / live preview.
 *
 * Supported syntax:
 *   YAML front matter: name + header items (text / optional link)
 *   ## H2           → section heading
 *   **text**        → <strong>
 *   text\n  ~ note  → flex row (left: text, right: note)
 *   - bullet        → <li> in <ul>
 *   paragraph       → <p>
 */

const fs   = require('fs');
const path = require('path');

const CSS_PATH = path.resolve(__dirname, '../resumes/resume.css');

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Render filled resume markdown to a complete HTML document string.
 * @param {string} markdown
 * @returns {string}
 */
function renderResume(markdown) {
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  const { name, headerItems, body } = parseFrontMatter(markdown);
  const bodyHtml = renderBody(body);
  return buildHTML(name, headerItems, bodyHtml, css);
}

/**
 * Render plain cover letter markdown to a complete HTML document string.
 * @param {string} markdown
 * @returns {string}
 */
function renderCoverLetter(markdown) {
  const noComments = markdown.split('\n').filter(l => !l.trimStart().startsWith('#')).join('\n');
  const withBold   = noComments.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const bodyHtml   = withBold
    .split(/\n{2,}/)
    .map(b => b.trim())
    .filter(Boolean)
    .map(b => `<p>${b.replace(/\n/g, '<br>')}</p>`)
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: "Times New Roman", serif; font-size: 11pt; line-height: 1.5; margin: 50px 60px; color: #000; }
  p { margin: 0 0 0.8em 0; }
  strong { font-weight: bold; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

// ─── Front matter parser ───────────────────────────────────────────────────────

function parseFrontMatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]+?)\n---\n?([\s\S]*)$/);
  if (!match) return { name: '', headerItems: [], body: markdown };

  const fm   = match[1];
  const body = match[2].trim();

  const nameMatch = fm.match(/^name:\s*(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim().replace(/^["']|["']$/g, '') : '';

  const headerItems = [];
  const itemRe = /- text:\s*"([^"]+)"[ \t]*(?:\n[ \t]+link:\s*(\S+))?/g;
  let m;
  while ((m = itemRe.exec(fm)) !== null) {
    headerItems.push({ text: m[1].trim(), link: m[2] ? m[2].trim() : null });
  }

  return { name, headerItems, body };
}

// ─── Body renderer ─────────────────────────────────────────────────────────────

function renderBody(body) {
  return body
    .split(/\n{2,}/)
    .map(b => b.trim())
    .filter(Boolean)
    .map(renderBlock)
    .join('\n');
}

function renderBlock(block) {
  const lines = block.split('\n');

  // ## Section heading
  if (lines[0].startsWith('## ')) {
    return `<h2>${inlineMd(lines[0].slice(3))}</h2>`;
  }

  // Paired row: any text + "  ~ annotation" on next line
  if (lines.length === 2 && lines[1].trimStart().startsWith('~ ')) {
    const left  = inlineMd(lines[0].trim());
    const right = inlineMd(lines[1].trimStart().slice(2).trim());
    return `<div class="row"><span class="row-main">${left}</span><span class="row-meta">${right}</span></div>`;
  }

  // Bullet list (all lines start with "- ")
  if (lines.every(l => l.startsWith('- '))) {
    const items = lines.map(l => `<li>${inlineMd(l.slice(2))}</li>`).join('');
    return `<ul>${items}</ul>`;
  }

  // Paragraph
  return `<p>${lines.map(inlineMd).join('<br>')}</p>`;
}

function inlineMd(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// ─── HTML builder ──────────────────────────────────────────────────────────────

function buildHTML(name, headerItems, bodyHtml, css) {
  const contactHtml = headerItems
    .map(item => item.link
      ? `<a href="${esc(item.link)}">${esc(item.text)}</a>`
      : `<span>${esc(item.text)}</span>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${css}
</style>
</head>
<body>
<div id="resume">
  <header class="resume-header">
    <h1 class="resume-name">${esc(name)}</h1>
    <div class="resume-contact">${contactHtml}</div>
  </header>
  <main class="resume-body">
${bodyHtml}
  </main>
</div>
</body>
</html>`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { renderResume, renderCoverLetter, renderBlock, inlineMd, parseFrontMatter };
