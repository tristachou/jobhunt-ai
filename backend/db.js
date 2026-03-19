'use strict';

// node:sqlite is built into Node.js v22+
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(process.env.TEST_DB_PATH || path.join(__dirname, 'applications.db'));

// ─── Schema ────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    company    TEXT NOT NULL,
    job_title  TEXT NOT NULL,
    url        TEXT,
    source     TEXT,
    jd_text    TEXT,
    stack_used TEXT,
    fit_score  INTEGER,
    resume_md  TEXT,
    cover_md   TEXT,
    status     TEXT DEFAULT 'analyzed'
  )
`);

// Migration: add new columns to existing DBs (safe to run every time)
for (const col of ['resume_md TEXT', 'cover_md TEXT']) {
  try { db.exec(`ALTER TABLE applications ADD COLUMN ${col}`); } catch { /* already exists */ }
}

// ─── CRUD ──────────────────────────────────────────────────────────────────────

function insertApplication(data) {
  return db.prepare(`
    INSERT INTO applications
      (created_at, company, job_title, url, source, jd_text, stack_used, fit_score, resume_md, cover_md, status)
    VALUES
      (:created_at, :company, :job_title, :url, :source, :jd_text, :stack_used, :fit_score, :resume_md, :cover_md, :status)
  `).run(data).lastInsertRowid;
}

function getAllApplications() {
  return db.prepare('SELECT * FROM applications ORDER BY created_at DESC').all();
}

function getApplicationById(id) {
  return db.prepare('SELECT * FROM applications WHERE id = ?').get(id) ?? null;
}

function updateApplication(id, fields) {
  const ALLOWED = ['created_at', 'company', 'job_title', 'url', 'source',
                   'jd_text', 'stack_used', 'fit_score', 'status', 'resume_md', 'cover_md'];
  const pairs = Object.entries(fields).filter(([k]) => ALLOWED.includes(k));
  if (!pairs.length) return false;
  const setClause = pairs.map(([k]) => `${k} = :${k}`).join(', ');
  const params = { ...Object.fromEntries(pairs), id };
  return db.prepare(`UPDATE applications SET ${setClause} WHERE id = :id`).run(params).changes > 0;
}

// Kept for backward compatibility (used by tests)
function updateApplicationStatus(id, status) {
  return db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, id).changes > 0;
}

function deleteApplication(id) {
  return db.prepare('DELETE FROM applications WHERE id = ?').run(id).changes > 0;
}

module.exports = {
  insertApplication,
  getAllApplications,
  getApplicationById,
  updateApplication,
  updateApplicationStatus,
  deleteApplication,
};
