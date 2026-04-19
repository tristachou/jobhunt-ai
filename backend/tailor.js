'use strict';

const fs   = require('fs');
const path = require('path');
const axios = require('axios');

const CV_MD        = path.join(__dirname, '../user/cv.md');
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

async function tailorResume({ jd, baseMd: externalBaseMd }) {
  const cvMd = externalBaseMd ?? (() => {
    if (!fs.existsSync(CV_MD)) throw new Error('Missing user CV: `user/cv.md` not found.');
    return fs.readFileSync(CV_MD, 'utf8');
  })();

  const prompts = JSON.parse(fs.readFileSync(PROMPTS_JSON, 'utf8'));
  const prompt  = prompts.tailor
    .replace('{{CV}}', cvMd)
    .replace('{{JD}}', jd);

  const result = await geminiJSON(prompt);

  if (typeof result.tailored_resume_md !== 'string') throw new Error('Gemini returned invalid response: expected string for `tailored_resume_md`');
  if (typeof result.fit_score !== 'number')           throw new Error('Gemini returned invalid response: expected number for `fit_score`');
  if (!Array.isArray(result.detected_skills))         throw new Error('Gemini returned invalid response: expected array for `detected_skills`');

  return {
    markdown:        result.tailored_resume_md,
    fit_score:       Math.max(0, Math.min(100, result.fit_score)),
    detected_skills: result.detected_skills,
    job_title:       typeof result.job_title === 'string' ? result.job_title : '',
  };
}

async function rescoreResume(jd) {
  const cvMd = fs.existsSync(CV_MD) ? fs.readFileSync(CV_MD, 'utf8') : '';
  const prompts = JSON.parse(fs.readFileSync(PROMPTS_JSON, 'utf8'));
  const prompt  = prompts.rescore
    .replace('{{CV}}', cvMd)
    .replace('{{JD}}', jd);

  const result = await geminiJSON(prompt);
  if (typeof result.fit_score !== 'number') throw new Error('Gemini returned invalid response: expected number for `fit_score`');
  return Math.max(0, Math.min(100, result.fit_score));
}

module.exports = { tailorResume, rescoreResume };
