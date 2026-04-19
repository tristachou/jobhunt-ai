# Mode: auto-pipeline — Full Automatic Pipeline

When the user pastes a JD (text or URL) without an explicit sub-command, run the full pipeline in sequence:

## Step 0 — Extract JD

If the input is a **URL** (not pasted JD text), extract the content using this priority order:

1. **WebFetch (preferred for static pages)**: company career pages, ZipRecruiter, etc.
2. **WebSearch (fallback)**: search for the role title + company to find the JD indexed elsewhere.

**If the input is JD text** (not a URL): use it directly, no fetch needed.

## Step 1 — Evaluation A–F
Run exactly as defined in `oferta.md`.

## Step 2 — Tailored Resume
Run the tailoring pipeline from `pdf.md`:
- Rewrite summary for this JD
- Reorder/bold skills
- Surface most relevant experience bullets first
- Return tailored markdown

## Step 3 — Draft Application Answers (only if fit_score >= 75)

If the fit score is >= 75, generate draft answers for the application form:

### Generic questions (use if form questions can't be extracted)

- Why are you interested in this role?
- Why do you want to work at [Company]?
- Tell us about a relevant project or achievement
- What makes you a good fit for this position?
- How did you hear about this role?

### Tone for form answers

**Position: "I'm choosing you."** — the candidate has options and is choosing this company for concrete reasons.

**Tone rules:**
- **Confident without arrogance**: "I've spent the past year building production AI systems — your role is where I want to apply that next."
- **Selective without condescension**: "I've been intentional about finding a team where I can contribute meaningfully from day one."
- **Specific and concrete**: Always reference something REAL from the JD or company, and something REAL from the candidate's experience.
- **Direct, no fluff**: 2–4 sentences per answer. No "I'm passionate about..." or "I would love the opportunity to..."
- **The hook is the proof, not the claim**: Instead of "I'm great at X", say "I built X that does Y."

**Framework per question:**
- **Why this role?** → "Your [specific thing] maps directly to [specific thing I built]."
- **Why this company?** → Mention something concrete about the company. "I've been following [product/company] because [reason]."
- **Relevant experience?** → One quantified proof point. "Built [X] that [metric]."
- **Good fit?** → "I sit at the intersection of [A] and [B], which is exactly where this role lives."
- **How did you hear?** → Honest: "Found it through [portal], evaluated against my criteria, and it was a strong match."

**Language**: Always match the language of the JD (English default).

## Step 4 — Summary

Return a final summary table:

| Item | Result |
|------|--------|
| Archetype | ... |
| Fit Score | .../100 |
| Recommendation | Apply / Apply with caveats / Skip |
| Top action | ... |
| Tailored resume | Ready / Not generated |
| Draft answers | Ready (score >= 75) / Skipped |

**If any step fails**, continue with remaining steps and flag the failed step in the summary.
