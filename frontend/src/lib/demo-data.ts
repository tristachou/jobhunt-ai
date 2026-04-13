import type { Application, AnalyzeResult, ResumeTemplate, AppConfig, ExperienceBlock } from './api'

// ─── Fake resume markdown ───────────────────────────────────────────────────────

export const DEMO_RESUME_MD = `---
name: Jordan Avery
header:
  - text: "mobile: +61 412 000 000"
  - text: "portfolio: jordanavery.dev"
    link: https://jordanavery.dev
  - text: "email: jordan@example.com"
    link: mailto:jordan@example.com
  - text: "linkedin: linkedin.com/in/jordanavery"
    link: https://www.linkedin.com/in/jordanavery/
---

## Summary

Full-stack engineer with 5 years of experience building scalable web applications. Passionate about developer tooling, clean architecture, and shipping products users love.

## Skills

Programming Languages
  ~ **TypeScript**, **JavaScript**, Python, Go

Front-end
  ~ **React**, **Next.js**, Tailwind CSS, Zustand

Back-end
  ~ **Node.js**, **Express**, PostgreSQL, Redis

Cloud & Tools
  ~ AWS, Docker, GitHub Actions, Terraform

## Experience

**Senior Frontend Engineer**
  ~ Sydney, Australia

NovaPay
  ~ Mar 2023 – Present

Fintech platform processing 2M+ daily transactions across 40 countries.

Technologies: TypeScript, React, Node.js, PostgreSQL, AWS

- Led migration of legacy dashboard to React 18 + Vite, cutting bundle size by 42% and load time by 1.8 s

- Built a real-time transaction monitoring UI adopted by 2,000+ merchants

- Reduced CI pipeline duration from 18 min to 6 min via parallelised test execution

- Mentored 3 junior engineers; authored code-review guide adopted across the frontend org

**Full Stack Developer**
  ~ Melbourne, Australia

DesignFlow
  ~ Jan 2021 – Feb 2023

Collaborative design platform used by 150M+ users worldwide.

Technologies: TypeScript, React, Node.js, GraphQL, Redis

- Built a template recommendation engine that improved click-through rate by 31%

- Developed internal tooling saving the content team 10+ hours per week

- Migrated 40+ components to Storybook; set up visual regression testing with Chromatic

## Projects

**OpenTrack**
  ~ [github.com/jordanavery/opentrack](https://github.com/jordanavery/opentrack)

Technologies: React, Node.js, SQLite, Tailwind CSS

- Open-source job application tracker with AI-powered resume tailoring; 300+ GitHub stars

- Featured on Hacker News front page (May 2025)

## Certification

**AWS Certified Solutions Architect — Associate**
  ~ Jun 2023

## Education

**University of Sydney**
  ~ Feb 2017 – Nov 2020

B.Sc. in Computer Science
`

export const DEMO_COVER_MD = `Dear Hiring Manager,

I am writing to express my interest in the Senior Frontend Engineer position at NovaPay. With five years of experience building high-performance web applications in TypeScript and React, I am excited by the opportunity to work on infrastructure that millions of people rely on every day.

In my current role at DesignFlow, I led a full migration of our legacy dashboard to React 18, reducing bundle size by 42% and cutting page load time by nearly two seconds. I also built a real-time transaction monitoring UI that is now used by over 2,000 merchants — a project that required close collaboration between frontend, backend, and product teams.

What draws me to NovaPay specifically is your commitment to developer experience and the scale of problems you are solving. I believe my background in both product-facing features and internal tooling would let me contribute meaningfully from day one.

I would love to discuss how my experience aligns with what the team is building. Thank you for your time and consideration.

Warm regards,
Jordan Avery
`

// ─── Fake applications ──────────────────────────────────────────────────────────

export const DEMO_APPLICATIONS: Application[] = [
  {
    id: 1,
    created_at: '2026-03-28T09:12:00.000Z',
    company: 'NovaPay',
    job_title: 'Senior Frontend Engineer',
    url: '',
    source: 'linkedin',
    jd_text: 'We are looking for a Senior Frontend Engineer to join our payments team...',
    stack_used: 'typescript',
    fit_score: 91,
    resume_md: DEMO_RESUME_MD,
    cover_md: DEMO_COVER_MD,
    theme: 'modern',
    status: 'interviewed',
    status_log: '[]',
    follow_up: 0,
  },
  {
    id: 2,
    created_at: '2026-03-20T14:30:00.000Z',
    company: 'DesignFlow',
    job_title: 'Full Stack Developer',
    url: '',
    source: 'seek',
    jd_text: 'Join our engineering team to build the next generation of design tools...',
    stack_used: 'typescript',
    fit_score: 78,
    resume_md: DEMO_RESUME_MD,
    cover_md: DEMO_COVER_MD,
    theme: 'classic',
    status: 'applied',
    status_log: '[]',
    follow_up: 1,
  },
  {
    id: 3,
    created_at: '2026-04-01T11:00:00.000Z',
    company: 'CloudNine Systems',
    job_title: 'Backend Engineer',
    url: '',
    source: 'linkedin',
    jd_text: '',
    stack_used: 'typescript',
    fit_score: 85,
    resume_md: DEMO_RESUME_MD,
    cover_md: '',
    theme: 'minimal',
    status: 'not_started',
    status_log: '[]',
    follow_up: 0,
  },
]

// ─── Fake analyze result ────────────────────────────────────────────────────────

export const DEMO_ANALYZE_RESULT: AnalyzeResult = {
  id: 1,
  fit_score: 91,
  stack: 'typescript',
  detected_skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker', 'Redis'],
  bolded_skills: ['TypeScript', 'React', 'Node.js'],
  soft_skills_injected: true,
  cover_letter_available: true,
  theme: 'modern',
}

// ─── Fake config ────────────────────────────────────────────────────────────────

const DEMO_EXPERIENCES: ExperienceBlock[] = [
  {
    id: 'exp1',
    technologies: 'TypeScript, Node.js, React, PostgreSQL, RESTful API, AWS, Docker',
    bullet_pool: [
      { id: 'backend',  text: 'Implemented and maintained backend **RESTful APIs** using **TypeScript** and **Node.js**', must_have: false, tags: ['backend', 'api'] },
      { id: 'database', text: 'Designed and optimised database schemas in **PostgreSQL** to support high-throughput queries', must_have: false, tags: ['database', 'performance'] },
      { id: 'frontend', text: 'Built responsive front-end interfaces using **React** and **TypeScript** for real-time data display', must_have: false, tags: ['frontend', 'react'] },
      { id: 'devops',   text: 'Containerised services with **Docker** and deployed to **AWS EC2** with automated **GitHub Actions** pipelines', must_have: false, tags: ['devops', 'docker', 'aws'] },
      { id: 'test',     text: 'Wrote unit and integration tests achieving high code coverage', must_have: false, tags: ['testing', 'quality'] },
    ],
  },
  {
    id: 'exp2',
    technologies: 'TypeScript, Node.js, React, MySQL, Redis, GitHub Actions, Docker',
    bullet_pool: [
      { id: 'backend', text: 'Engineered high-traffic **RESTful APIs** with **Node.js** and **Redis** caching for improved response times', must_have: false, tags: ['backend', 'api', 'performance'] },
      { id: 'auth',    text: 'Implemented token-based authentication using JWT for secure session management', must_have: false, tags: ['auth', 'security', 'jwt'] },
      { id: 'devops',  text: 'Maintained containerised deployments via **Docker** and automated releases with **GitHub Actions**', must_have: false, tags: ['devops', 'docker', 'cicd'] },
    ],
  },
]

export const DEMO_CONFIG: AppConfig = {
  stacks: {
    typescript: {
      name: 'Jordan Avery',
      primary_stack: 'TypeScript (Node.js)',
      job_title_display: 'Software Engineer',
      lang_skills: ['TypeScript', 'JavaScript', 'Python', 'Go'],
      frontend_skills: ['React', 'Next.js', 'Tailwind CSS', 'HTML5', 'CSS3'],
      backend_skills: ['Node.js', 'Express', 'RESTful API', 'GraphQL', 'OpenAPI'],
      database_skills: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis'],
      cloud_skills: ['AWS (EC2, S3, Lambda, RDS)', 'Docker', 'Git & GitHub Actions'],
      ai_skills: ['LLM Integration (OpenAI / Anthropic APIs)', 'Prompt Engineering', 'Agentic Workflows'],
      experiences: DEMO_EXPERIENCES,
    },
  },
  job_roles: {
    software_engineer: {
      summary: 'Software Engineer with X years of experience in full-stack development. Proficient in building robust back-ends with {{primary_stack}} and dynamic front-ends using TypeScript and React.',
      experience_slots: { exp1: 5, exp2: 3 },
      include_ai_skills: false,
    },
  },
  soft_skills: {
    pool: [
      { keyword: 'collaboration', bullet: 'Collaborated effectively across cross-functional Agile teams, communicating technical concepts clearly to stakeholders' },
      { keyword: 'communication', bullet: 'Communicated technical decisions and trade-offs clearly in written documentation and team discussions' },
      { keyword: 'mentoring',     bullet: 'Mentored junior developers through code reviews, pair programming, and structured onboarding sessions' },
      { keyword: 'leadership',    bullet: 'Led sprint planning and technical discussions, helping the team prioritise work and unblock delivery' },
    ],
  },
}

// ─── Fake templates ─────────────────────────────────────────────────────────────

export const DEMO_TEMPLATES: ResumeTemplate[] = [
  {
    id: 1,
    name: 'TypeScript / React (default)',
    is_default: 1,
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z',
  },
]
