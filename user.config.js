/**
 * user.config.js — User-facing configuration
 *
 * Edit this file to customise your Job Application Tracking System instance.
 * All personal data (resume, config, cover letter) lives in user/.
 */
module.exports = {
  /** Resume theme. Must match a filename in themes/ (without .css) */
  theme: 'classic',

  /**
   * Gemini model to use for tailoring and cover letter generation.
   * Overridden by GEMINI_MODEL in backend/.env if that key is set.
   */
  geminiModel: 'gemini-2.5-flash',
};
