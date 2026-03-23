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

export interface AnalyzeResult {
  id: number
  fit_score: number
  stack: string
  detected_skills: string[]
  bolded_skills: string[]
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
  }): Promise<AnalyzeResult> {
    return request('/analyze', { method: 'POST', body: JSON.stringify(body) })
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
}
