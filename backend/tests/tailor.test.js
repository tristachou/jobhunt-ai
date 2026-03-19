'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatSkillList, injectSoftSkillBullets } = require('../tailor');

// ─── formatSkillList ──────────────────────────────────────────────────────────

test('formatSkillList: first item is always bold', () => {
  const skills    = ['C#', 'Python', 'JavaScript'];
  const detected  = new Set(); // nothing detected
  const result    = formatSkillList(skills, detected);
  assert.ok(result.startsWith('**C#**'), `Expected result to start with **C#**, got: ${result}`);
});

test('formatSkillList: detected skills are bolded and moved to front (after first)', () => {
  const skills   = ['C#', 'Python', 'JavaScript', 'TypeScript'];
  const detected = new Set(['javascript', 'typescript']);
  const result   = formatSkillList(skills, detected);
  // Expected order: **C#**, **JavaScript**, **TypeScript**, Python
  assert.equal(result, '**C#**, **JavaScript**, **TypeScript**, Python');
});

test('formatSkillList: non-detected skills stay plain at end', () => {
  const skills   = ['C#', 'Python', 'JavaScript'];
  const detected = new Set(['c#']); // only the primary
  const result   = formatSkillList(skills, detected);
  // Primary always bold; Python and JavaScript not detected → plain at end
  assert.equal(result, '**C#**, Python, JavaScript');
});

test('formatSkillList: preserves all skills — count never changes', () => {
  const skills   = ['C#', 'Python', 'JavaScript', 'TypeScript', 'PHP'];
  const detected = new Set(['python', 'typescript']);
  const result   = formatSkillList(skills, detected);
  const parts    = result.split(', ');
  assert.equal(parts.length, skills.length, 'Skill count must not change');
});

test('formatSkillList: single skill list', () => {
  const result = formatSkillList(['C#'], new Set());
  assert.equal(result, '**C#**');
});

// ─── injectSoftSkillBullets ───────────────────────────────────────────────────

const SAMPLE_MD = `## Experience

**Full-Stack Developer**
  ~ Brisbane, Australia

Orefox Ai Limited
  ~ Feb 2025 - July 2025

- Built something cool

**Full-Stack Developer**
  ~ Taiwan

Phygitalker Co., Ltd.
  ~ Aug 2022 - July 2023

- Built something else`;

test('injectSoftSkillBullets: injects bullets before Phygitalker block', () => {
  const bullets = ['Communicated clearly with stakeholders', 'Worked autonomously'];
  const result  = injectSoftSkillBullets(SAMPLE_MD, bullets, 'Full-Stack Developer');
  assert.ok(result.includes('- Communicated clearly with stakeholders'), 'First bullet missing');
  assert.ok(result.includes('- Worked autonomously'), 'Second bullet missing');
});

test('injectSoftSkillBullets: bullets appear BEFORE Phygitalker header', () => {
  const bullets = ['Some soft skill'];
  const result  = injectSoftSkillBullets(SAMPLE_MD, bullets, 'Full-Stack Developer');
  const bulletIdx = result.indexOf('- Some soft skill');
  const phygIdx   = result.indexOf('Phygitalker Co., Ltd.');
  assert.ok(bulletIdx < phygIdx, 'Bullet must appear before Phygitalker block');
});

test('injectSoftSkillBullets: no injection when bullets array is empty', () => {
  const result = injectSoftSkillBullets(SAMPLE_MD, [], 'Full-Stack Developer');
  assert.equal(result, SAMPLE_MD);
});

test('injectSoftSkillBullets: no injection when marker not found', () => {
  const result = injectSoftSkillBullets(SAMPLE_MD, ['Some bullet'], 'WrongTitle');
  assert.equal(result, SAMPLE_MD);
});

test('injectSoftSkillBullets: injects at most what is passed (caller limits to 2)', () => {
  const bullets = ['Bullet A', 'Bullet B'];
  const result  = injectSoftSkillBullets(SAMPLE_MD, bullets, 'Full-Stack Developer');
  const count   = (result.match(/- Bullet/g) || []).length;
  assert.equal(count, 2);
});
