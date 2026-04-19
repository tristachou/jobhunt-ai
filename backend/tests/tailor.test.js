'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const path     = require('path');
const fs       = require('fs');

// ─── Module exports ───────────────────────────────────────────────────────────

test('tailor.js exports tailorResume and rescoreResume', () => {
  const mod = require('../tailor');
  assert.equal(typeof mod.tailorResume,  'function', 'tailorResume should be a function');
  assert.equal(typeof mod.rescoreResume, 'function', 'rescoreResume should be a function');
});

// ─── tailorResume — missing cv.md ─────────────────────────────────────────────

test('tailorResume throws when cv.md is missing and no baseMd provided', async () => {
  // Temporarily rename cv.md so it appears missing
  const cvPath = path.resolve(__dirname, '../../user/cv.md');
  const tmpPath = cvPath + '.bak';
  const existed = fs.existsSync(cvPath);
  if (existed) fs.renameSync(cvPath, tmpPath);

  try {
    // Clear require cache so tailor.js re-reads paths fresh
    delete require.cache[require.resolve('../tailor')];
    const { tailorResume } = require('../tailor');
    await assert.rejects(
      () => tailorResume({ jd: 'some jd text' }),
      /cv\.md/i
    );
  } finally {
    if (existed) fs.renameSync(tmpPath, cvPath);
    delete require.cache[require.resolve('../tailor')];
  }
});

// ─── tailorResume — uses provided baseMd over cv.md ──────────────────────────

test('tailorResume uses baseMd when provided (no Gemini call made for validation)', async () => {
  // We just verify that passing baseMd does not throw a "cv.md not found" error.
  // The actual Gemini call will fail (no API key in test env) but that's expected.
  delete require.cache[require.resolve('../tailor')];
  const { tailorResume } = require('../tailor');
  try {
    await tailorResume({ jd: 'test jd', baseMd: '# My CV\n\nSome content' });
  } catch (err) {
    // Should fail due to missing API key or network, NOT due to missing cv.md
    assert.ok(
      !err.message.includes('cv.md not found'),
      `Unexpected cv.md error when baseMd provided: ${err.message}`
    );
  }
});

// ─── prompts.json — required keys present ────────────────────────────────────

test('prompts.json contains tailor, rescore, and coverletter keys', () => {
  const promptsPath = path.resolve(__dirname, '../../user/prompts.json');
  assert.ok(fs.existsSync(promptsPath), 'user/prompts.json must exist');
  const prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));
  assert.equal(typeof prompts.tailor,      'string', 'tailor key must be a string');
  assert.equal(typeof prompts.rescore,     'string', 'rescore key must be a string');
  assert.equal(typeof prompts.coverletter, 'string', 'coverletter key must be a string');
});

test('tailor prompt contains required placeholders', () => {
  const promptsPath = path.resolve(__dirname, '../../user/prompts.json');
  const { tailor } = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));
  assert.ok(tailor.includes('{{CV}}'), 'tailor prompt must contain {{CV}} placeholder');
  assert.ok(tailor.includes('{{JD}}'), 'tailor prompt must contain {{JD}} placeholder');
});

test('rescore prompt contains required placeholders', () => {
  const promptsPath = path.resolve(__dirname, '../../user/prompts.json');
  const { rescore } = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));
  assert.ok(rescore.includes('{{CV}}'), 'rescore prompt must contain {{CV}} placeholder');
  assert.ok(rescore.includes('{{JD}}'), 'rescore prompt must contain {{JD}} placeholder');
});

// ─── cv.md — exists and has content ──────────────────────────────────────────

test('user/cv.md exists and is non-empty', () => {
  const cvPath = path.resolve(__dirname, '../../user/cv.md');
  assert.ok(fs.existsSync(cvPath), 'user/cv.md must exist');
  const content = fs.readFileSync(cvPath, 'utf8');
  assert.ok(content.length > 100, 'user/cv.md must have substantial content');
});

test('user/cv.md has no unfilled {{placeholders}}', () => {
  const cvPath = path.resolve(__dirname, '../../user/cv.md');
  const content = fs.readFileSync(cvPath, 'utf8');
  const placeholders = content.match(/\{\{[^}]+\}\}/g) || [];
  assert.equal(
    placeholders.length, 0,
    `user/cv.md should have no placeholders, found: ${placeholders.join(', ')}`
  );
});
