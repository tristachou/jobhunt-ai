const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? res.statusText)
  return data as T
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Application {
  id: number
  created_at: string
  company: string
  job_title: string
  url: string
  source: string
  jd_text: string
  stack_used: string
  fit_score: number
  resume_md: string
  cover_md: string
  theme: string
  status: 'not_started' | 'applied' | 'followed_up' | 'interviewed' | 'rejected'
  status_log: string  // JSON: [{status, changed_at}]
  follow_up: number   // 0 | 1
}

export interface ResumeTemplate {
  id: number
  name: string
  is_default: number
  created_at: string
  updated_at: string
  markdown?: string  // only present in GET /:id
}

export interface AnalyzeResult {
  id: number
  fit_score: number
  stack: string
  detected_skills: string[]
  bolded_skills: string[]
  soft_skills_injected: boolean
  cover_letter_available: boolean
  theme: string
}

export const THEMES = ['classic', 'modern', 'minimal', 'compact', 'bold'] as const
export type ThemeName = typeof THEMES[number]

// ─── Applications ──────────────────────────────────────────────────────────────

export const api = {
  analyze(body: {
    job_title: string
    company: string
    jd: string
    url?: string
    source?: string
    theme?: string
    resume_template_id?: number
    generate_cover_letter?: boolean
  }, signal?: AbortSignal): Promise<AnalyzeResult> {
    return request('/analyze', { method: 'POST', body: JSON.stringify(body), signal })
  },

  createApplication(body: {
    job_title: string
    company: string
    resume_template_id?: number
    source?: string
    url?: string
    jd?: string
  }): Promise<{ id: number }> {
    return request('/applications', { method: 'POST', body: JSON.stringify(body) })
  },

  getApplications(): Promise<Application[]> {
    return request('/applications')
  },

  getApplication(id: number): Promise<Application> {
    return request(`/applications/${id}`)
  },

  patchApplication(id: number, data: Partial<Application>): Promise<{ ok: boolean }> {
    return request(`/applications/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  },

  deleteApplication(id: number): Promise<{ ok: boolean }> {
    return request(`/applications/${id}`, { method: 'DELETE' })
  },

  getPdfUrl(id: number, type: 'resume' | 'coverletter'): string {
    return `${BASE}/applications/${id}/pdf?type=${type}`
  },

  preview(markdown: string, type: 'resume' | 'coverletter', theme?: string): Promise<{ html: string }> {
    return request('/preview', { method: 'POST', body: JSON.stringify({ markdown, type, theme }) })
  },

  getPrompts(): Promise<{ tailor: string; coverletter: string }> {
    return request('/prompts')
  },

  savePrompts(body: { tailor: string; coverletter: string }): Promise<{ ok: boolean }> {
    return request('/prompts', { method: 'PUT', body: JSON.stringify(body) })
  },

  // ─── Style / Themes ─────────────────────────────────────────────────────────

  getStyle(): Promise<{ theme: string; css: string }> {
    return request('/style')
  },

  saveStyle(css: string, theme?: string): Promise<{ ok: boolean }> {
    return request('/style', { method: 'PUT', body: JSON.stringify({ css, theme }) })
  },

  getThemes(): Promise<{ name: string; label: string; css: string }[]> {
    return request('/style/themes')
  },

  previewStyle(css: string, theme?: string): Promise<{ html: string }> {
    return request('/style/preview', { method: 'POST', body: JSON.stringify({ css, theme }) })
  },

  getStacks(): Promise<{ stacks: string[] }> {
    return request('/stacks')
  },

  // ─── Resume Templates ────────────────────────────────────────────────────────

  getTemplates(): Promise<ResumeTemplate[]> {
    return request('/resume-templates')
  },

  createTemplate(body: { name: string; markdown: string }): Promise<{ id: number }> {
    return request('/resume-templates', { method: 'POST', body: JSON.stringify(body) })
  },

  getTemplate(id: number): Promise<ResumeTemplate & { markdown: string }> {
    return request(`/resume-templates/${id}`)
  },

  updateTemplate(id: number, body: { name?: string; markdown?: string }): Promise<{ ok: boolean }> {
    return request(`/resume-templates/${id}`, { method: 'PUT', body: JSON.stringify(body) })
  },

  deleteTemplate(id: number): Promise<{ ok: boolean }> {
    return request(`/resume-templates/${id}`, { method: 'DELETE' })
  },

  setDefaultTemplate(id: number): Promise<{ ok: boolean }> {
    return request(`/resume-templates/${id}/default`, { method: 'PATCH' })
  },
}
