'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BASE_MD      = path.join(__dirname, '../user/base.md');
const CONFIG_JSON  = path.join(__dirname, '../user/config.json');
const PROMPTS_JSON = path.join(__dirname, '../user/prompts.json');

async function geminiJSON(prompt) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Gemini request timed out after 60s')), 60000)
  );
  try {
    const res = await Promise.race([
      axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: 'application/json' },
        }
      ),
      timeoutPromise,
    ]);
    return JSON.parse(res.data.candidates[0].content.parts[0].text);
  } catch (err) {
    if (err.response?.status === 429) {
      throw new Error('API quota exceeded. Try again later or check your Gemini billing.');
    }
    throw err;
  }
}

/**
 * Format a skill list:
 * - First item always bolded
 * - Other detected skills: bolded + moved to front (after first)
 * - Remaining: plain text at end
 */
function formatSkillList(skills, detectedLower) {
  const [primary, ...rest] = skills;
  const matched = rest.filter(s => detectedLower.has(s.toLowerCase()));
  const plain = rest.filter(s => !detectedLower.has(s.toLowerCase()));
  return [`**${primary}**`, ...matched.map(s => `**${s}**`), ...plain].join(', ');
}

/**
 * Select bullets from a pool using must_have priority + JD keyword scoring.
 *
 * @param {Array}  pool          - Array of { id, text, must_have, tags, stack_variant? }
 * @param {number} count         - Total slots to fill
 * @param {Set}    detectedLower - Lowercased detected skills from Gemini
 * @param {string|null} variant  - e.g. 'python_django' or 'python_fastapi'; null for non-variant stacks
 * @returns {string[]} Selected bullet texts (length ≤ count)
 */
function selectBulletsFromPool(pool, count, detectedLower, variant = null) {
  if (!pool || !pool.length || count <= 0) return [];

  // Filter by stack variant: if an entry has stack_variant set, only include when it matches
  const eligible = pool.filter(entry =>
    !entry.stack_variant || entry.stack_variant === variant
  );

  const mustHave = eligible.filter(e => e.must_have);
  const optional = eligible.filter(e => !e.must_have);

  // Score optional bullets by tag overlap + direct text match with detected skills
  const scored = optional.map(entry => {
    let score = 0;
    const textLower = entry.text.toLowerCase();
    const tags = entry.tags || [];
    for (const skill of detectedLower) {
      if (tags.some(t => skill.includes(t.toLowerCase()) || t.toLowerCase().includes(skill))) score += 2;
      if (textLower.includes(skill)) score += 1;
    }
    return { entry, score };
  }).sort((a, b) => b.score - a.score);

  const slotsForOptional = Math.max(0, count - mustHave.length);
  return [
    ...mustHave.map(e => e.text),
    ...scored.slice(0, slotsForOptional).map(s => s.entry.text),
  ];
}

/**
 * Inject soft-skill bullets at the <!-- SOFT_SKILLS_INJECT --> marker.
 * If no bullets, removes the marker cleanly.
 */
function injectSoftSkillBullets(markdown, bullets) {
  const MARKER = '<!-- SOFT_SKILLS_INJECT -->';
  if (!bullets.length) {
    return markdown.replace(/\n<!-- SOFT_SKILLS_INJECT -->\n?/, '\n');
  }
  const idx = markdown.indexOf(MARKER);
  if (idx === -1) return markdown;
  const before = markdown.slice(0, idx).trimEnd();
  const after = markdown.slice(idx + MARKER.length).trimStart();
  const bulletsStr = bullets.map(b => `- ${b}`).join('\n');
  return `${before}\n\n${bulletsStr}\n\n${after}`;
}

/**
 * Build the tailor prompt, injecting all dynamic variables.
 */
function buildTailorPrompt(promptTemplate, config, allSkills, jd) {
  const stackKeys   = Object.keys(config.stacks);
  const jobRoleKeys = Object.keys(config.job_roles);
  return promptTemplate
    .replace('{{STACKS}}',        JSON.stringify(allSkills))
    .replace('{{STACK_KEYS}}',    JSON.stringify(stackKeys))
    .replace('{{JOB_ROLE_KEYS}}', JSON.stringify(jobRoleKeys))
    .replace('{{JD}}',            jd);
}

async function tailorResume({ jd, baseMd: externalBaseMd }) {
  if (!fs.existsSync(CONFIG_JSON)) throw new Error('Missing user config: `user/config.json` not found. Copy `user/config.example.json` to get started.');

  let baseMd;
  if (externalBaseMd) {
    baseMd = externalBaseMd;
  } else {
    if (!fs.existsSync(BASE_MD)) throw new Error('Missing user config: `user/base.md` not found. Copy `user/base.example.md` to get started.');
    baseMd = fs.readFileSync(BASE_MD, 'utf8');
  }
  const config = JSON.parse(fs.readFileSync(CONFIG_JSON, 'utf8'));

  // Collect all unique skills across all stacks for detection
  const allSkills = [...new Set(
    Object.values(config.stacks).flatMap(s => [
      ...s.lang_skills, ...s.frontend_skills, ...s.backend_skills,
      ...s.database_skills, ...s.cloud_skills,
    ])
  )];

  // Step 1: Gemini picks job_role + stack + detected skills + fit score
  const prompts = JSON.parse(fs.readFileSync(PROMPTS_JSON, 'utf8'));
  const prompt  = buildTailorPrompt(prompts.tailor, config, allSkills, jd);
  const step1 = await geminiJSON(prompt);

  // Validate Gemini response shape
  if (typeof step1.stack !== 'string') throw new Error('Gemini returned invalid response: expected string for `stack`');
  if (!Array.isArray(step1.detected_skills)) throw new Error('Gemini returned invalid response: expected array for `detected_skills`');
  if (typeof step1.fit_score !== 'number') throw new Error('Gemini returned invalid response: expected number for `fit_score`');

  const { job_role, stack, python_framework, detected_skills } = step1;
  const fit_score = Math.max(0, Math.min(100, step1.fit_score));
  const stackConfig = config.stacks[stack];
  if (!stackConfig) throw new Error(`Unknown stack returned by Gemini: ${stack}`);
  const roleConfig = config.job_roles[job_role];
  if (!roleConfig) throw new Error(`Unknown job_role returned by Gemini: ${job_role}`);

  const detectedLower = new Set(detected_skills.map(s => s.toLowerCase()));

  // Resolve stack variant (used for Django-vs-FastAPI bullet selection)
  const variant = (stack === 'python' && python_framework === 'django') ? 'python_django'
                : (stack === 'python') ? 'python_fastapi'
                : null;

  // Step 2: Format skill lines
  const skillLines = {
    lang_skills:     formatSkillList(stackConfig.lang_skills,     detectedLower),
    frontend_skills: formatSkillList(stackConfig.frontend_skills, detectedLower),
    backend_skills:  formatSkillList(stackConfig.backend_skills,  detectedLower),
    database_skills: formatSkillList(stackConfig.database_skills, detectedLower),
    cloud_skills:    formatSkillList(stackConfig.cloud_skills,    detectedLower),
  };

  // Step 3: Resolve summary
  const primaryStackLabel = (stack === 'python' && python_framework === 'django')
    ? 'Python (Django)'
    : stackConfig.primary_stack;
  const summary = roleConfig.summary.replace('{{primary_stack}}', primaryStackLabel);

  // Step 4: AI skills section (only for ai_engineer role)
  const aiSkillsSection = roleConfig.include_ai_skills
    ? `AI & LLM\n  ~ ${stackConfig.ai_skills.join(', ')}`
    : '';

  // Step 5: Fill experience block placeholders from bullet pool
  const experienceSlots = roleConfig.experience_slots || {};
  const replacements = {
    '{{name}}':              stackConfig.name,
    '{{summary}}':           summary,
    '{{job_title_display}}': stackConfig.job_title_display,
    '{{lang_skills}}':       skillLines.lang_skills,
    '{{frontend_skills}}':   skillLines.frontend_skills,
    '{{backend_skills}}':    skillLines.backend_skills,
    '{{database_skills}}':   skillLines.database_skills,
    '{{cloud_skills}}':      skillLines.cloud_skills,
    '{{ai_skills_section}}': aiSkillsSection,
  };

  for (const exp of (stackConfig.experiences || [])) {
    const count = experienceSlots[exp.id] || 0;
    const technologies = (variant && exp.technologies_variants?.[variant]) || exp.technologies || '';
    replacements[`{{${exp.id}_technologies}}`] = technologies;
    const bullets = selectBulletsFromPool(exp.bullet_pool, count, detectedLower, variant);
    for (let i = 0; i < count; i++) {
      replacements[`{{${exp.id}_bullet_${i + 1}}}`] = bullets[i] || '';
    }
  }

  let filled = baseMd;
  for (const [key, value] of Object.entries(replacements)) {
    filled = filled.replaceAll(key, value ?? '');
  }

  // Remove empty bullet lines (unfilled pool slots) and normalize blank lines
  filled = filled.replace(/^- $/gm, '').replace(/\n{3,}/g, '\n\n');

  // Step 6: Soft skill matching (≤2 bullets, keyword in JD)
  const jdLower = jd.toLowerCase();
  const softBullets = config.soft_skills.pool
    .filter(s => jdLower.includes(s.keyword.toLowerCase()))
    .slice(0, 2)
    .map(s => s.bullet);
  const soft_skills_injected = softBullets.length > 0;

  // Step 7: Inject soft skill bullets at the marker
  filled = injectSoftSkillBullets(filled, softBullets);

  // Collect skills that ended up bolded (detected skills present in this stack)
  const allStackSkills = new Set([
    ...stackConfig.lang_skills, ...stackConfig.frontend_skills,
    ...stackConfig.backend_skills, ...stackConfig.database_skills,
    ...stackConfig.cloud_skills,
  ]);
  const bolded_skills = detected_skills.filter(s => allStackSkills.has(s));

  return { markdown: filled, job_role, stack, python_framework, detected_skills, bolded_skills, fit_score, soft_skills_injected };
}

async function rescoreResume(jd) {
  const config = JSON.parse(fs.readFileSync(CONFIG_JSON, 'utf8'));
  const allSkills = [...new Set(
    Object.values(config.stacks).flatMap(s => [
      ...s.lang_skills, ...s.frontend_skills, ...s.backend_skills,
      ...s.database_skills, ...s.cloud_skills,
    ])
  )];
  const prompts = JSON.parse(fs.readFileSync(PROMPTS_JSON, 'utf8'));
  const prompt  = buildTailorPrompt(prompts.tailor, config, allSkills, jd);
  const result  = await geminiJSON(prompt);
  if (typeof result.fit_score !== 'number') throw new Error('Gemini returned invalid response: expected number for `fit_score`');
  return Math.max(0, Math.min(100, result.fit_score));
}

module.exports = { tailorResume, rescoreResume, formatSkillList, injectSoftSkillBullets, selectBulletsFromPool };
