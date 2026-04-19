---
name: {{name}}
header:
  - text: "mobile: 0401321635"
  - text: "portfolio: tristachou.vercel.app/"
    link: https://tristachou.vercel.app/
  - text: "email: tristachou.dev@gmail.com"
    link: mailto:tristachou.dev@gmail.com
  - text: "linkedin: linkedin.com/in/trista-chou-89b475205"
    link: https://www.linkedin.com/in/trista-chou-89b475205/
---

## Summary

{{summary}}

## Skills

Programming Languages
  ~ {{lang_skills}}

Front-end
  ~ {{frontend_skills}}

Back-end
  ~ {{backend_skills}}

Database
  ~ {{database_skills}}

Cloud & Tools
  ~ {{cloud_skills}}

{{ai_skills_section}}

## Experience

**{{job_title_display}}**
  ~ Brisbane, Australia

Orefox Ai Limited
  ~ Feb 2025 - July 2025

Technologies: {{exp1_technologies}}

- {{exp1_bullet_1}}

- {{exp1_bullet_2}}

- Built interactive data visualization interfaces using **TypeScript** and **React**, consuming real-time AI analytics APIs

- {{exp1_bullet_3}}

- {{exp1_bullet_4}}

- {{exp1_bullet_5}}

<!-- SOFT_SKILLS_INJECT -->

**{{job_title_display}}**
  ~ Taiwan

Phygitalker Co., Ltd.
  ~ Aug 2022 - July 2023

Technologies: {{exp2_technologies}}

- {{exp2_bullet_1}}

- Built responsive front-end interfaces using **React** and **Redux** for a production e-commerce platform with high transaction volume

- Integrated third-party payment gateways with end-to-end transaction validation and error handling, ensuring reliable checkout flows under concurrent load

- {{exp2_bullet_2}}

- Diagnosed and resolved production incidents under time pressure, deploying hotfixes via **GitHub Actions** to restore service availability

- Deployed and managed containerized services using **Docker** and **Kubernetes** across production environments

- {{exp2_bullet_3}}

## Projects

**AI-Powered Job Application Automation Tool**
[github.com/tristachou/jobhunt-ai](https://github.com/tristachou/jobhunt-ai)·  [Live Demo](https://tristachou.github.io/jobhunt-ai)

Technologies: React, TypeScript, Tailwind CSS, Node.js, Express, SQLite, Gemini API, Puppeteer

- Built a full-stack job search pipeline: paste a JD, receive a tailored resume PDF + cover letter in ~30 seconds via Gemini API, with fit score (0–100) and skill gap breakdown
- Engineered ATS optimisation logic that rewrites resume placeholders per JD — skill reordering, keyword injection — without touching source content
- Shipped a React dashboard with application history, 52-week activity heatmap, pipeline status charts, and a live CSS theme editor; deployed to GitHub Pages with CI via GitHub Actions

**LUT Preview Tool**
[https://github.com/tristachou/filter_app](https://github.com/tristachou)· [Demo (YouTube)](https://www.youtube.com/watch?v=NTQvsEpdMys)

Technologies: React, FastAPI, Python, AWS (ECS Fargate, SQS, Lambda, DynamoDB, ElastiCache, Cognito, CloudWatch), Docker, FFmpeg, Nginx

- Designed a microservices architecture on AWS: React/FastAPI web service on EC2, containerised Python workers on ECS Fargate processing LUT colour-grading jobs via SQS long-polling
- Implemented auto-scaling using Lambda and custom CloudWatch metrics — ECS scales workers when queue depth >= 10, maintaining ~60% CPU utilisation at steady state
- Secured end-to-end: AWS Cognito (MFA + Google OAuth), JWT-based API access control, pre-signed S3 URLs for direct media upload/download, ACM-managed HTTPS with ALB and Route 53

## Certification

**AWS Certified Solutions Architect Associate**
  ~ Jan 2025

## Education

**Queensland University of Technology**
  ~ Feb 2024 – Dec 2025

M.Sc. in Information Technology, Computer Science

**National University of Kaohsiung**
  ~ Sep 2019 – Jun 2023

B.Sc. in Computer Science and Information Engineering