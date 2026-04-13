'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatSkillList, injectSoftSkillBullets, selectBulletsFromPool } = require('../tailor');

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

// ─── selectBulletsFromPool ────────────────────────────────────────────────────

const SAMPLE_POOL = [
  { id: 'backend',  text: 'Built RESTful APIs',              must_have: false, tags: ['backend', 'api'] },
  { id: 'devops',   text: 'Deployed to AWS ECS with Docker', must_have: false, tags: ['devops', 'aws', 'docker'] },
  { id: 'test',     text: 'Created unit tests with Jest',    must_have: false, tags: ['testing'] },
  { id: 'realtime', text: 'Built WebSocket dashboard',       must_have: false, tags: ['realtime', 'websocket'] },
  { id: 'cicd',     text: 'Set up GitHub Actions CI/CD',     must_have: false, tags: ['cicd', 'devops'] },
];

test('selectBulletsFromPool: returns up to count bullets', () => {
  const result = selectBulletsFromPool(SAMPLE_POOL, 3, new Set());
  assert.equal(result.length, 3);
});

test('selectBulletsFromPool: must_have bullets are always included', () => {
  const pool = [
    { id: 'a', text: 'Must include this', must_have: true,  tags: [] },
    { id: 'b', text: 'Optional bullet',   must_have: false, tags: [] },
  ];
  const result = selectBulletsFromPool(pool, 2, new Set());
  assert.ok(result.includes('Must include this'), 'must_have bullet missing');
});

test('selectBulletsFromPool: scores optional bullets by tag match', () => {
  const result = selectBulletsFromPool(SAMPLE_POOL, 2, new Set(['devops', 'docker']));
  // devops bullet has tags matching 'devops' and 'docker' → highest score
  assert.ok(result.includes('Deployed to AWS ECS with Docker'), 'devops bullet should be selected');
});

test('selectBulletsFromPool: returns empty array when count is 0', () => {
  const result = selectBulletsFromPool(SAMPLE_POOL, 0, new Set());
  assert.equal(result.length, 0);
});

test('selectBulletsFromPool: filters by stack_variant', () => {
  const pool = [
    { id: 'fastapi', text: 'FastAPI backend', must_have: false, tags: ['backend'], stack_variant: 'python_fastapi' },
    { id: 'django',  text: 'Django backend',  must_have: false, tags: ['backend'], stack_variant: 'python_django' },
    { id: 'generic', text: 'Generic bullet',  must_have: false, tags: ['testing'] },
  ];
  const result = selectBulletsFromPool(pool, 3, new Set(), 'python_django');
  assert.ok(!result.includes('FastAPI backend'), 'FastAPI bullet should be excluded for django variant');
  assert.ok(result.includes('Django backend'),   'Django bullet should be included');
  assert.ok(result.includes('Generic bullet'),   'Generic bullet should be included');
});

test('selectBulletsFromPool: handles empty pool gracefully', () => {
  const result = selectBulletsFromPool([], 5, new Set());
  assert.equal(result.length, 0);
});

// ─── injectSoftSkillBullets ───────────────────────────────────────────────────

const SAMPLE_MD = `## Experience

**Software Engineer**
  ~ Brisbane, Australia

Company One
  ~ Feb 2025 - July 2025

- Built something cool

<!-- SOFT_SKILLS_INJECT -->

**Software Engineer**
  ~ Taiwan

Company Two
  ~ Aug 2022 - July 2023

- Built something else`;

test('injectSoftSkillBullets: injects bullets at the marker', () => {
  const bullets = ['Communicated clearly with stakeholders', 'Worked autonomously'];
  const result  = injectSoftSkillBullets(SAMPLE_MD, bullets);
  assert.ok(result.includes('- Communicated clearly with stakeholders'), 'First bullet missing');
  assert.ok(result.includes('- Worked autonomously'), 'Second bullet missing');
});

test('injectSoftSkillBullets: bullets appear BEFORE the second experience block', () => {
  const bullets = ['Some soft skill'];
  const result  = injectSoftSkillBullets(SAMPLE_MD, bullets);
  const bulletIdx  = result.indexOf('- Some soft skill');
  const company2Idx = result.indexOf('Company Two');
  assert.ok(bulletIdx < company2Idx, 'Bullet must appear before second experience block');
});

test('injectSoftSkillBullets: no injection when bullets array is empty (removes marker)', () => {
  const result = injectSoftSkillBullets(SAMPLE_MD, []);
  assert.ok(!result.includes('<!-- SOFT_SKILLS_INJECT -->'), 'Marker should be removed');
  assert.ok(result.includes('Company Two'), 'Content after marker should be preserved');
});

test('injectSoftSkillBullets: no injection when marker not found', () => {
  const noMarker = SAMPLE_MD.replace('<!-- SOFT_SKILLS_INJECT -->', '');
  const result   = injectSoftSkillBullets(noMarker, ['Some bullet']);
  assert.equal(result, noMarker);
});

test('injectSoftSkillBullets: injects exactly the bullets passed', () => {
  const bullets = ['Bullet A', 'Bullet B'];
  const result  = injectSoftSkillBullets(SAMPLE_MD, bullets);
  const count   = (result.match(/- Bullet/g) || []).length;
  assert.equal(count, 2);
});
