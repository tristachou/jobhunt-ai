# Mode: evaluate — Full Job Offer Evaluation (A–F)

When the user pastes a job offer (text or URL), always deliver all 6 blocks:

## Step 0 — Archetype Detection

Classify the offer into one of the archetypes defined in `_shared.md`. If hybrid, indicate the 2 closest. This determines:
- Which proof points to prioritize in Block B
- How to rewrite the summary in Block E
- Which STAR stories to prepare in Block F

## Block A — Role Summary

Table with:
- Detected archetype
- Domain (platform / agentic / LLMOps / ML / enterprise / full-stack / backend / devops)
- Function (build / consult / manage / deploy)
- Seniority
- Remote policy (full / hybrid / onsite)
- Team size (if mentioned)
- TL;DR in 1 sentence

## Block B — CV Match

Read `user/cv.md`. Create a table mapping each JD requirement to exact lines from the CV.

**Adapt to the archetype:**
- Full-stack → prioritize React, TypeScript, REST APIs, frontend + backend ownership
- Backend / Platform → prioritize Django/FastAPI, PostgreSQL, AWS, Docker
- AI Engineer → prioritize LLM integration, Gemini API, agent pipelines, fit scoring
- DevOps / Cloud → prioritize AWS (ECS, Lambda, SQS), Docker, GitHub Actions, CI/CD

**Gaps section**: for each gap:
1. Is it a hard blocker or a nice-to-have?
2. Can the candidate demonstrate adjacent experience?
3. Is there a portfolio project that covers this gap?
4. Concrete mitigation plan (cover letter phrase, quick project, etc.)

## Block C — Level & Strategy

1. **Detected level** in JD vs **candidate's natural level** for that archetype
2. **"Sell senior without lying" plan**: specific phrases adapted to the archetype, achievements to highlight, how to position independent project experience as an advantage
3. **"If they downlevel me" plan**: accept if comp is fair, negotiate 6-month review, clear promotion criteria

## Block D — Comp & Market

Use web search for:
- Current salaries for this role (Glassdoor, Levels.fyi, LinkedIn Salary, SEEK for AU)
- Company's compensation reputation
- Demand trend for the role

Table with data and cited sources. If no data, say so rather than inventing.

## Block E — Personalization Plan

| # | Section | Current state | Proposed change | Why |
|---|---------|---------------|-----------------|-----|
| 1 | Summary | ... | ... | ... |
| ... | ... | ... | ... | ... |

Top 5 CV changes to maximize match with this specific JD.

## Block F — Interview Prep

6–10 STAR+R stories mapped to JD requirements:

| # | JD Requirement | STAR+R Story | S | T | A | R | Reflection |
|---|----------------|--------------|---|---|---|---|------------|

The **Reflection** column captures what was learned or what would be done differently — this signals seniority.

Include also:
- 1 recommended case study (which project to present and how to frame it)
- Red-flag questions and how to handle them

---

## Post-evaluation

After generating blocks A–F, always:

1. Report the overall fit score (0–100)
2. Give a clear recommendation: **Apply** / **Apply with caveats** / **Skip**
3. List the top 3 actions to take before applying
