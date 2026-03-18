'use strict';

// node:sqlite is built into Node.js v22+
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'applications.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at           TEXT NOT NULL,
    company              TEXT NOT NULL,
    job_title            TEXT NOT NULL,
    url                  TEXT,
    source               TEXT,
    jd_text              TEXT,
    stack_used           TEXT,
    fit_score            INTEGER,
    resume_pdf_path      TEXT,
    coverletter_pdf_path TEXT,
    status               TEXT DEFAULT 'generated'
  )
`);

function insertApplication(data) {
  const stmt = db.prepare(`
    INSERT INTO applications
      (created_at, company, job_title, url, source, jd_text, stack_used, fit_score, resume_pdf_path, coverletter_pdf_path, status)
    VALUES
      (:created_at, :company, :job_title, :url, :source, :jd_text, :stack_used, :fit_score, :resume_pdf_path, :coverletter_pdf_path, :status)
  `);
  return stmt.run(data).lastInsertRowid;
}

function getAllApplications() {
  return db.prepare('SELECT * FROM applications ORDER BY created_at DESC').all();
}

function updateApplicationStatus(id, status) {
  return db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, id).changes > 0;
}

function updateApplication(id, fields) {
  const ALLOWED = ['created_at', 'company', 'job_title', 'url', 'source',
                   'jd_text', 'stack_used', 'fit_score', 'status'];
  const pairs = Object.entries(fields).filter(([k]) => ALLOWED.includes(k));
  if (!pairs.length) return false;
  const setClause = pairs.map(([k]) => `${k} = :${k}`).join(', ');
  const params = { ...Object.fromEntries(pairs), id };
  return db.prepare(`UPDATE applications SET ${setClause} WHERE id = :id`).run(params).changes > 0;
}

function deleteApplication(id) {
  return db.prepare('DELETE FROM applications WHERE id = ?').run(id).changes > 0;
}

module.exports = { insertApplication, getAllApplications, updateApplicationStatus, updateApplication, deleteApplication };
