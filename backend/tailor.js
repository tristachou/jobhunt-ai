'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BASE_MD      = path.join(__dirname, '../user/base.md');
const CONFIG_JSON  = path.join(__dirname, '../user/config.json');
const PROMPTS_JSON = path.join(__dirname, '../resumes/prompts.json');

async function geminiJSON(prompt) {
  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: 'application/json' },
    }
  );
  return JSON.parse(res.data.candidates[0].content.parts[0].text);
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

async function tailorResume({ jd }) {
  const baseMd = fs.readFileSync(BASE_MD, 'utf8');
  const config = JSON.parse(fs.readFileSync(CONFIG_JSON, 'utf8'));

  // Collect all unique skills across all stacks for detection
  const allSkills = [...new Set(
    Object.values(config.stacks).flatMap(s => [
      ...s.lang_skills, ...s.frontend_skills, ...s.backend_skills,
      ...s.database_skills, ...s.cloud_skills,
    ])
  )];

  // Step 1: Gemini picks stack + detected skills + fit score
  const prompts = JSON.parse(fs.readFileSync(PROMPTS_JSON, 'utf8'));
  const prompt  = prompts.tailor
    .replace('{{STACKS}}', JSON.stringify(allSkills))
    .replace('{{JD}}', jd);
  const step1 = await geminiJSON(prompt);

  const { stack, detected_skills, fit_score } = step1;
  const stackConfig = config.stacks[stack];
  if (!stackConfig) throw new Error(`Unknown stack returned by Gemini: ${stack}`);

  const detectedLower = new Set(detected_skills.map(s => s.toLowerCase()));

  // Step 2: Format skill lines
  const skillLines = {
    lang_skills:     formatSkillList(stackConfig.lang_skills,     detectedLower),
    frontend_skills: formatSkillList(stackConfig.frontend_skills, detectedLower),
    backend_skills:  formatSkillList(stackConfig.backend_skills,  detectedLower),
    database_skills: formatSkillList(stackConfig.database_skills, detectedLower),
    cloud_skills:    formatSkillList(stackConfig.cloud_skills,    detectedLower),
  };

  // Step 3: Soft skill matching (≤2 bullets, keyword in JD)
  const jdLower = jd.toLowerCase();
  const softBullets = config.soft_skills.pool
    .filter(s => jdLower.includes(s.keyword.toLowerCase()))
    .slice(0, 2)
    .map(s => s.bullet);

  // Step 4: Fill all placeholders
  const replacements = {
    '{{name}}':                       stackConfig.name,
    '{{primary_stack}}':              stackConfig.primary_stack,
    '{{job_title_display}}':          stackConfig.job_title_display,
    '{{lang_skills}}':                skillLines.lang_skills,
    '{{frontend_skills}}':            skillLines.frontend_skills,
    '{{backend_skills}}':             skillLines.backend_skills,
    '{{database_skills}}':            skillLines.database_skills,
    '{{cloud_skills}}':               skillLines.cloud_skills,
    '{{orefox_technologies}}':        stackConfig.bullets.orefox_technologies,
    '{{orefox_backend_bullet}}':      stackConfig.bullets.orefox_backend_bullet,
    '{{orefox_realtime_bullet}}':     stackConfig.bullets.orefox_realtime_bullet,
    '{{orefox_test_bullet}}':         stackConfig.bullets.orefox_test_bullet,
    '{{phygitalker_technologies}}':   stackConfig.bullets.phygitalker_technologies,
    '{{phygitalker_backend_bullet}}': stackConfig.bullets.phygitalker_backend_bullet,
    '{{phygitalker_auth_bullet}}':    stackConfig.bullets.phygitalker_auth_bullet,
    '{{phygitalker_test_bullet}}':    stackConfig.bullets.phygitalker_test_bullet,
  };

  let filled = baseMd;
  for (const [key, value] of Object.entries(replacements)) {
    filled = filled.replaceAll(key, value);
  }

  // Step 5: Inject soft skill bullets before Phygitalker section
  filled = injectSoftSkillBullets(filled, softBullets, stackConfig.job_title_display);

  // Collect skills that ended up bolded (detected skills that are in the stack)
  const allStackSkills = new Set([
    ...stackConfig.lang_skills, ...stackConfig.frontend_skills,
    ...stackConfig.backend_skills, ...stackConfig.database_skills,
    ...stackConfig.cloud_skills,
  ]);
  const bolded_skills = detected_skills.filter(s => allStackSkills.has(s));

  return { markdown: filled, stack, detected_skills, bolded_skills, fit_score };
}

module.exports = { tailorResume, formatSkillList, injectSoftSkillBullets };
