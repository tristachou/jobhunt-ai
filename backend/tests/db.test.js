'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Use a temp DB so tests never touch applications.db
const TEST_DB = path.join(os.tmpdir(), `jab_test_${Date.now()}.db`);
process.env.TEST_DB_PATH = TEST_DB;

// Import db AFTER setting env var
const { insertApplication, getAllApplications, updateApplication, deleteApplication } = require('../db');

const SAMPLE = {
  created_at: '2026-03-18T10:00:00.000Z',
  company:    'Atlassian',
  job_title:  'Full-Stack Developer',
  url:        'https://atlassian.com/jobs/123',
  source:     'linkedin',
  jd_text:    'We are looking for a full-stack developer...',
  stack_used: 'csharp',
  fit_score:  87,
  resume_md:  '## Summary\n\nSample resume.',
  cover_md:   'Dear Hiring Manager,\n\nSample cover letter.',
  status:     'analyzed',
};

before(() => {
  // db module initialises itself on require — nothing extra needed
});

after(() => {
  // Clean up temp DB file
  try { fs.unlinkSync(TEST_DB); } catch { /* ignore */ }
});

test('insertApplication: returns a positive integer id', () => {
  const id = insertApplication(SAMPLE);
  assert.ok(typeof id === 'number' || typeof id === 'bigint', 'id should be numeric');
  assert.ok(Number(id) > 0, 'id should be positive');
});

test('getAllApplications: returns inserted record', () => {
  const id   = insertApplication({ ...SAMPLE, company: 'Google' });
  const all  = getAllApplications();
  const found = all.find(r => Number(r.id) === Number(id));
  assert.ok(found, 'Inserted record should appear in getAllApplications');
  assert.equal(found.company, 'Google');
});

test('getAllApplications: returns records newest first', () => {
  insertApplication({ ...SAMPLE, created_at: '2026-01-01T00:00:00Z', company: 'OldCo' });
  insertApplication({ ...SAMPLE, created_at: '2026-06-01T00:00:00Z', company: 'NewCo' });
  const all = getAllApplications();
  const idx_new = all.findIndex(r => r.company === 'NewCo');
  const idx_old = all.findIndex(r => r.company === 'OldCo');
  assert.ok(idx_new < idx_old, 'Newer record should appear first');
});

test('updateApplication: updates a single field', () => {
  const id  = insertApplication({ ...SAMPLE, company: 'BeforeUpdate' });
  const ok  = updateApplication(Number(id), { company: 'AfterUpdate' });
  assert.ok(ok, 'updateApplication should return true');
  const all = getAllApplications();
  const rec = all.find(r => Number(r.id) === Number(id));
  assert.equal(rec.company, 'AfterUpdate');
});

test('updateApplication: updates multiple fields at once', () => {
  const id = insertApplication({ ...SAMPLE, status: 'generated', fit_score: 50 });
  updateApplication(Number(id), { status: 'applied', fit_score: 90 });
  const rec = getAllApplications().find(r => Number(r.id) === Number(id));
  assert.equal(rec.status, 'applied');
  assert.equal(rec.fit_score, 90);
});

test('updateApplication: returns false for non-existent id', () => {
  const ok = updateApplication(999999, { status: 'applied' });
  assert.equal(ok, false);
});

test('updateApplication: ignores disallowed fields', () => {
  const id = insertApplication({ ...SAMPLE, company: 'SafeCo' });
  // 'id' is not in ALLOWED list — should not crash, but also not change anything meaningful
  const ok = updateApplication(Number(id), { evil_field: 'DROP TABLE applications' });
  assert.equal(ok, false, 'Should return false when no allowed fields are present');
});

test('deleteApplication: removes the record', () => {
  const id     = insertApplication({ ...SAMPLE, company: 'ToDelete' });
  const ok     = deleteApplication(Number(id));
  assert.ok(ok, 'deleteApplication should return true');
  const all    = getAllApplications();
  const found  = all.find(r => Number(r.id) === Number(id));
  assert.equal(found, undefined, 'Deleted record should not appear in getAllApplications');
});

test('deleteApplication: returns false for non-existent id', () => {
  const ok = deleteApplication(999999);
  assert.equal(ok, false);
});
