'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const TEMPLATE_PATH = path.join(__dirname, '../user/cover-letter/template.md');
const PROMPTS_JSON  = path.join(__dirname, '../user/prompts.json');

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

async function generateCoverLetter({ company, job_title, jd }) {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.warn('TODO: cover-letter/template.md is missing — skipping cover letter generation');
    return null;
  }

  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const prompts  = JSON.parse(fs.readFileSync(PROMPTS_JSON, 'utf8'));
  const prompt   = prompts.coverletter
    .replace(/\{\{COMPANY\}\}/g,    company)
    .replace(/\{\{JOB_TITLE\}\}/g,  job_title)
    .replace('{{JD}}',              jd)
    .replace('{{TEMPLATE}}',        template);

  const result = await geminiJSON(prompt);

  return fillTemplate(template, result);
}

function fillTemplate(template, values) {
  let filled = template;
  for (const [key, value] of Object.entries(values)) {
    filled = filled.replaceAll(`{{${key}}}`, value);
  }
  return filled;
}

module.exports = { generateCoverLetter, fillTemplate };
