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
 * Inject soft-skill bullets before the Phygitalker experience block
 * (i.e., at the end of the Orefox block).
 */
function injectSoftSkillBullets(markdown, bullets, jobTitle) {
  if (!bullets.length) return markdown;

  // The Phygitalker block starts with  "\n\n**{jobTitle}**\n  ~ Taiwan"
  const secondHeader = `\n\n**${jobTitle}**\n  ~ Taiwan`;
  const idx = markdown.indexOf(secondHeader);
  if (idx === -1) return markdown; // fallback: no injection

  const before = markdown.slice(0, idx).trimEnd();
  const after = markdown.slice(idx);
  const bulletsStr = bullets.map(b => `- ${b}`).join('\n');
  return `${before}\n\n${bulletsStr}\n${after}`;
}

/**
 * Resolve a bullet key, preferring the Django variant when applicable.
 */
function resolveBulletKey(key, bullets, stack, python_framework) {
  if (stack === 'python' && python_framework === 'django') {
    const djangoKey = `${key}_django`;
    if (bullets[djangoKey]) return bullets[djangoKey];
  }
  return bullets[key];
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
  const prompt  = prompts.tailor
    .replace('{{STACKS}}', JSON.stringify(allSkills))
    .replace('{{JD}}', jd);
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

  // Step 2: Format skill lines
  const skillLines = {
    lang_skills:     formatSkillList(stackConfig.lang_skills,     detectedLower),
    frontend_skills: formatSkillList(stackConfig.frontend_skills, detectedLower),
    backend_skills:  formatSkillList(stackConfig.backend_skills,  detectedLower),
    database_skills: formatSkillList(stackConfig.database_skills, detectedLower),
    cloud_skills:    formatSkillList(stackConfig.cloud_skills,    detectedLower),
  };

  // Step 3: Resolve summary (Django variant uses "Python (Django)" as primary_stack label)
  const primaryStackLabel = (stack === 'python' && python_framework === 'django')
    ? 'Python (Django)'
    : stackConfig.primary_stack;
  const summary = roleConfig.summary.replace('{{primary_stack}}', primaryStackLabel);

  // Step 4: Resolve positional bullets from role bullet sets (with Django variant support)
  const orefoxBullets = roleConfig.orefox_bullet_set.map(
    key => resolveBulletKey(key, stackConfig.bullets, stack, python_framework)
  );
  const phygitalkerBullets = roleConfig.phygitalker_bullet_set.map(
    key => resolveBulletKey(key, stackConfig.bullets, stack, python_framework)
  );

  // Step 5: AI skills section (only for ai_engineer role)
  const aiSkillsSection = roleConfig.include_ai_skills
    ? `AI & LLM\n  ~ ${stackConfig.ai_skills.join(', ')}`
    : '';

  // Step 6: Soft skill matching (≤2 bullets, keyword in JD)
  const jdLower = jd.toLowerCase();
  const softBullets = config.soft_skills.pool
    .filter(s => jdLower.includes(s.keyword.toLowerCase()))
    .slice(0, 2)
    .map(s => s.bullet);
  const soft_skills_injected = softBullets.length > 0;

  // Step 7: Fill all placeholders
  const replacements = {
    '{{name}}':                stackConfig.name,
    '{{summary}}':             summary,
    '{{job_title_display}}':   stackConfig.job_title_display,
    '{{lang_skills}}':         skillLines.lang_skills,
    '{{frontend_skills}}':     skillLines.frontend_skills,
    '{{backend_skills}}':      skillLines.backend_skills,
    '{{database_skills}}':     skillLines.database_skills,
    '{{cloud_skills}}':        skillLines.cloud_skills,
    '{{ai_skills_section}}':   aiSkillsSection,
    '{{orefox_technologies}}': resolveBulletKey('orefox_technologies', stackConfig.bullets, stack, python_framework),
    '{{orefox_bullet_1}}':     orefoxBullets[0],
    '{{orefox_bullet_2}}':     orefoxBullets[1],
    '{{orefox_bullet_3}}':     orefoxBullets[2],
    '{{orefox_bullet_4}}':     orefoxBullets[3],
    '{{orefox_bullet_5}}':     orefoxBullets[4],
    '{{phygitalker_technologies}}': resolveBulletKey('phygitalker_technologies', stackConfig.bullets, stack, python_framework),
    '{{phygitalker_bullet_1}}': phygitalkerBullets[0],
    '{{phygitalker_bullet_2}}': phygitalkerBullets[1],
    '{{phygitalker_bullet_3}}': phygitalkerBullets[2],
  };

  let filled = baseMd;
  for (const [key, value] of Object.entries(replacements)) {
    filled = filled.replaceAll(key, value);
  }

  // Step 8: Inject soft skill bullets before Phygitalker section
  filled = injectSoftSkillBullets(filled, softBullets, stackConfig.job_title_display);

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
  const prompt = prompts.tailor
    .replace('{{STACKS}}', JSON.stringify(allSkills))
    .replace('{{JD}}', jd);
  const result = await geminiJSON(prompt);
  if (typeof result.fit_score !== 'number') throw new Error('Gemini returned invalid response: expected number for `fit_score`');
  return Math.max(0, Math.min(100, result.fit_score));
}

module.exports = { tailorResume, rescoreResume, formatSkillList, injectSoftSkillBullets };
