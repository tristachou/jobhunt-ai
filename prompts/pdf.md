# Mode: pdf — ATS-Optimized Resume Tailoring

## Full pipeline

1. Read `user/cv.md` as the source of truth
2. Extract 15–20 keywords from the JD
3. Detect language of JD → language of output (English default)
4. Detect role archetype → adapt framing (see `_shared.md`)
5. Rewrite Professional Summary: inject top JD keywords + frame candidate's background to match
6. Reorder experience bullets by relevance to JD (most relevant first within each role)
7. Select top 3–4 most relevant projects for the offer
8. Build competency grid from JD requirements (6–8 keyword phrases)
9. Inject keywords naturally into existing achievements — NEVER invent new content
10. Return tailored resume as markdown

## ATS Rules (clean parsing)

- Single-column layout (no sidebars, no parallel columns)
- Standard headers: "Summary", "Skills", "Experience", "Projects", "Education", "Certifications"
- No text in images/SVGs
- No critical information in headers/footers (ATS ignores them)
- UTF-8, selectable text (not rasterized)
- Keywords from JD distributed: Summary (top 5), first bullet of each role, Skills section

## Tailoring Strategy

### What to change
- **Summary paragraph**: Rewrite to match JD archetype, inject top 3–5 JD keywords naturally
- **Skills table**: Bold skills that appear in the JD; reorder rows to surface most relevant first
- **Experience bullets**: Reorder bullets within each role so the most JD-relevant appears first
- **Projects section**: Reorder projects so most relevant to JD appears first

### What NOT to change
- Bullet text content (do not rewrite bullets — only reorder)
- Company names, dates, locations
- Education, certifications
- Any metrics (never modify numbers)

## Keyword Injection Strategy (ethical, truth-based)

Legitimate reformulation examples:
- JD says "RESTful API design" and CV says "built APIs" → change to "RESTful API design and implementation"
- JD says "CI/CD pipelines" and CV says "GitHub Actions" → change to "CI/CD pipelines via GitHub Actions"
- JD says "containerized microservices" and CV says "Docker + ECS" → change to "containerized microservices using Docker and AWS ECS"

**NEVER add skills the candidate does not have. Only reformulate real experience using the exact vocabulary of the JD.**

## Output Format

Return JSON:

```json
{
  "tailored_resume_md": "...",
  "detected_skills": ["React", "Python", "AWS", "Docker"],
  "fit_score": 82,
  "job_title": "Senior Backend Engineer",
  "keywords_injected": ["RESTful API", "containerized microservices", "CI/CD pipelines"]
}
```

- `tailored_resume_md`: Complete tailored CV in Oh My CV markdown format
- `detected_skills`: Skills from the JD that match the candidate's CV
- `fit_score`: 0–100 fit score based on JD-to-CV match
- `job_title`: Detected job title from the JD
- `keywords_injected`: Keywords that were injected or surfaced in the output
