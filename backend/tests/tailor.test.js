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
  const cvPath = path.resolve(__dirname, '../../user/cv.md');
  const tmpPath = cvPath + '.bak';
  const existed = fs.existsSync(cvPath);
  if (existed) fs.renameSync(cvPath, tmpPath);

  try {
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
  delete require.cache[require.resolve('../tailor')];
  const { tailorResume } = require('../tailor');
  try {
    await tailorResume({ jd: 'test jd', baseMd: '# My CV\n\nSome content' });
  } catch (err) {
    assert.ok(
      !err.message.includes('cv.md not found'),
      `Unexpected cv.md error when baseMd provided: ${err.message}`
    );
  }
});

// ─── prompts/tailor.md — exists and has placeholders ─────────────────────────

test('prompts/tailor.md exists and contains required placeholders', () => {
  const tailorMdPath = path.resolve(__dirname, '../../prompts/tailor.md');
  assert.ok(fs.existsSync(tailorMdPath), 'prompts/tailor.md must exist');
  const content = fs.readFileSync(tailorMdPath, 'utf8');
  assert.ok(content.includes('{{PROFILE}}'), 'prompts/tailor.md must contain {{PROFILE}} placeholder');
  assert.ok(content.includes('{{CV}}'),      'prompts/tailor.md must contain {{CV}} placeholder');
  assert.ok(content.includes('{{JD}}'),      'prompts/tailor.md must contain {{JD}} placeholder');
});

// ─── user/prompts.json — rescore and coverletter keys ────────────────────────

test('prompts.json contains rescore and coverletter keys with required placeholders', () => {
  // Fall back to example file in CI where user/ is gitignored
  const promptsPath = path.resolve(__dirname, '../../user/prompts.json');
  const examplePath = path.resolve(__dirname, '../../user/prompts.example.json');
  const filePath = fs.existsSync(promptsPath) ? promptsPath : examplePath;
  assert.ok(fs.existsSync(filePath), 'user/prompts.json or prompts.example.json must exist');

  const prompts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  assert.equal(typeof prompts.rescore,     'string', 'rescore key must be a string');
  assert.equal(typeof prompts.coverletter, 'string', 'coverletter key must be a string');
  assert.ok(prompts.rescore.includes('{{CV}}'),      'rescore prompt must contain {{CV}}');
  assert.ok(prompts.rescore.includes('{{JD}}'),      'rescore prompt must contain {{JD}}');
  assert.ok(prompts.coverletter.includes('{{JD}}'),  'coverletter prompt must contain {{JD}}');
});

// ─── user/cv.md — exists and has content ─────────────────────────────────────

test('user/cv.md (or example) exists and is non-empty', () => {
  // Fall back to example file in CI where user/ is gitignored
  const cvPath      = path.resolve(__dirname, '../../user/cv.md');
  const examplePath = path.resolve(__dirname, '../../user/cv.example.md');
  const filePath = fs.existsSync(cvPath) ? cvPath : examplePath;
  assert.ok(fs.existsSync(filePath), 'user/cv.md or cv.example.md must exist');
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.length > 100, 'CV file must have substantial content');
});

test('user/cv.md (or example) has no unfilled {{placeholders}}', () => {
  const cvPath      = path.resolve(__dirname, '../../user/cv.md');
  const examplePath = path.resolve(__dirname, '../../user/cv.example.md');
  const filePath = fs.existsSync(cvPath) ? cvPath : examplePath;
  const content = fs.readFileSync(filePath, 'utf8');
  const placeholders = content.match(/\{\{[^}]+\}\}/g) || [];
  assert.equal(
    placeholders.length, 0,
    `CV file should have no placeholders, found: ${placeholders.join(', ')}`
  );
});
