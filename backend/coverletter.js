'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const TEMPLATE_PATH = path.join(__dirname, '../cover-letter/template.md');

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

  const result = await geminiJSON(`You are a cover letter writing assistant.
Fill in the placeholder tokens in the cover letter template below. Do NOT rewrite or change any other text.

Placeholder rules:
- {{company}}: the company name
- {{job_title}}: the job title
- {{why_company}}: 1-2 sentences from the JD about why this company is exciting (unique product, mission, or impact)
- {{matching_skills}}: top 3 skills from the JD that match a full-stack developer's background (comma-separated)
- {{specific_project}}: pick the single most relevant bullet point from a software engineer's experience that matches the JD
- {{why_company_culture}}: 1-2 sentences about company culture, values, or mission from the JD that resonate

Context:
- Company: ${company}
- Job Title: ${job_title}

Return ONLY valid JSON with these exact keys:
{
  "company": "${company}",
  "job_title": "${job_title}",
  "why_company": "...",
  "matching_skills": "...",
  "specific_project": "...",
  "why_company_culture": "..."
}

Job Description:
${jd}

Cover Letter Template:
${template}`);

  let filled = template;
  for (const [key, value] of Object.entries(result)) {
    filled = filled.replaceAll(`{{${key}}}`, value);
  }

  return filled;
}

module.exports = { generateCoverLetter };
