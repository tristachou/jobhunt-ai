import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type AnalyzeResult, type ResumeTemplate, THEMES } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ArrowRight, Save } from 'lucide-react'

const scoreColor = (s: number) =>
  s >= 70 ? 'text-green-700' : s >= 50 ? 'text-orange-500' : 'text-red-600'

const scoreLabel = (s: number) =>
  s >= 70 ? 'STRONG MATCH' : s >= 50 ? 'MODERATE MATCH' : 'WEAK MATCH'

export default function NewApplication() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    job_title: '',
    company: '',
    source: 'linkedin',
    url: '',
    jd: '',
    theme: 'classic',
    resume_template_id: 0,   // 0 = use default
    ai_customize: true,
    ai_cover_letter: true,
  })
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [result, setResult]         = useState<AnalyzeResult | null>(null)
  const [stacks, setStacks]         = useState<string[]>([])
  const [templates, setTemplates]   = useState<ResumeTemplate[]>([])
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    api.getStacks().then(d => setStacks(d.stacks)).catch(() => {})
    api.getTemplates().then(list => {
      setTemplates(list)
      const def = list.find(t => t.is_default)
      if (def) setForm(f => ({ ...f, resume_template_id: def.id }))
    }).catch(() => {})
  }, [])

  const set = (k: keyof typeof form) => (v: string | number | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  const hasJd = form.jd.trim().length > 0
  const useAI = hasJd && form.ai_customize

  async function handleSubmit() {
    if (!form.job_title || !form.company) {
      setError('Job title and company are required.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)

    if (useAI) {
      // Persona B: AI analyze flow
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 65000)
      try {
        const data = await api.analyze({
          job_title:           form.job_title,
          company:             form.company,
          jd:                  form.jd,
          url:                 form.url,
          source:              form.source,
          theme:               form.theme,
          resume_template_id:  form.resume_template_id || undefined,
          generate_cover_letter: form.ai_cover_letter,
        }, controller.signal)
        setResult(data)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Request timed out after 65 seconds. Please try again.')
        } else {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      } finally {
        clearTimeout(timeout)
        setLoading(false)
      }
    } else {
      // Persona A: direct save, no AI
      try {
        const { id } = await api.createApplication({
          job_title:          form.job_title,
          company:            form.company,
          resume_template_id: form.resume_template_id || undefined,
          source:             form.source,
          url:                form.url,
          jd:                 form.jd,
        })
        navigate(`/editor/${id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }
  }

  async function handlePreview() {
    const tplId = form.resume_template_id
    if (!tplId) return
    setPreviewLoading(true)
    setPreviewOpen(true)
    try {
      const tpl = await api.getTemplate(tplId)
      const { html } = await api.preview(tpl.markdown || '', 'resume', form.theme)
      setPreviewHtml(html)
    } catch {
      setPreviewHtml(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <div className="space-y-8">

      {/* Page header */}
      <div className="border-b-2 border-black pb-4">
        <h1 className="font-serif text-3xl font-bold">New Application</h1>
        <p className="font-sans text-sm text-[#4B5563] mt-1">
          Track a new job application. Paste a job description to let AI tailor your resume.
        </p>
      </div>

      {/* Form */}
      <div className="space-y-5">

        {/* Row 1 — Job title + Company */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="job_title">Job Title</Label>
            <Input
              id="job_title"
              placeholder="Software Engineer"
              value={form.job_title}
              onChange={e => set('job_title')(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              placeholder="Atlassian"
              value={form.company}
              onChange={e => set('company')(e.target.value)}
            />
          </div>
        </div>

        {/* Resume Template */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Resume Template</Label>
            {form.resume_template_id > 0 && (
              <button
                onClick={handlePreview}
                className="font-mono text-xs text-blue-700 hover:underline uppercase tracking-wider"
              >
                Preview →
              </button>
            )}
          </div>
          <Select
            value={String(form.resume_template_id)}
            onValueChange={v => set('resume_template_id')(Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map(t => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}{t.is_default ? ' (default)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 2 — Source + Theme + URL */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Select value={form.source} onValueChange={set('source')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="seek">Seek</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Theme</Label>
              {form.resume_template_id > 0 && (
                <button
                  onClick={handlePreview}
                  className="font-mono text-[10px] text-blue-700 hover:underline uppercase tracking-wider"
                >
                  Preview →
                </button>
              )}
            </div>
            <Select value={form.theme} onValueChange={set('theme')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {THEMES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="url">
              Job URL <span className="text-[#4B5563] normal-case font-sans text-xs">(optional)</span>
            </Label>
            <Input
              id="url"
              placeholder="https://..."
              value={form.url}
              onChange={e => set('url')(e.target.value)}
            />
          </div>
        </div>

        {/* JD */}
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="jd">
              Job Description <span className="text-[#4B5563] normal-case font-sans text-xs">(optional)</span>
            </Label>
            {stacks.length > 0 && (
              <span className="font-mono text-[10px] text-[#4B5563] uppercase tracking-wider">
                AI variants: {stacks.join(', ')}
              </span>
            )}
          </div>
          <Textarea
            id="jd"
            placeholder="Paste the full job description here. Leave blank to skip AI analysis."
            className="min-h-44 resize-y"
            value={form.jd}
            onChange={e => set('jd')(e.target.value)}
          />
        </div>

        {/* F1 — short JD warning */}
        {form.jd.trim().length > 0 && form.jd.trim().length < 100 && (
          <div className="border-2 border-yellow-500 bg-yellow-50 px-3 py-2 flex items-start gap-2">
            <div className="w-3 h-3 bg-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="font-mono text-xs text-yellow-700 uppercase tracking-wider">
              Job description is very short ({form.jd.trim().length} chars) — AI analysis may be inaccurate
            </p>
          </div>
        )}

        {/* AI checkboxes — only when JD has content */}
        {hasJd && (
          <div className="border-2 border-black bg-white px-4 py-3 space-y-2">
            <p className="font-mono text-xs uppercase tracking-wider text-[#4B5563]">AI Options</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.ai_customize}
                onChange={e => set('ai_customize')(e.target.checked)}
                className="w-3.5 h-3.5"
              />
              <span className="font-sans text-sm">AI customize resume</span>
            </label>
            {form.ai_customize && (
              <label className="flex items-center gap-2 cursor-pointer ml-5">
                <input
                  type="checkbox"
                  checked={form.ai_cover_letter}
                  onChange={e => set('ai_cover_letter')(e.target.checked)}
                  className="w-3.5 h-3.5"
                />
                <span className="font-sans text-sm">AI generate cover letter</span>
              </label>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="border-2 border-red-600 bg-red-100 px-3 py-2 flex items-start gap-2">
            <div className="w-3 h-3 bg-red-600 flex-shrink-0 mt-0.5" />
            <p className="font-mono text-xs text-red-600 uppercase tracking-wider">{error}</p>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {useAI ? 'Analysing…' : 'Saving…'}</>
            ) : useAI ? (
              <>Analyze <ArrowRight className="h-4 w-4" /></>
            ) : (
              <><Save className="h-4 w-4" /> Save &amp; Track</>
            )}
          </Button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <>
          <div className="border-t-2 border-black" />

          <div className="space-y-5">
            <div className="border-b-2 border-black pb-4">
              <h2 className="font-serif text-2xl font-bold">Analysis Result</h2>
            </div>

            {/* Score card */}
            <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-4">
              <div className="flex items-baseline gap-4">
                <span className={`font-serif text-5xl font-bold tabular-nums ${scoreColor(result.fit_score)}`}>
                  {result.fit_score}
                </span>
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-[#4B5563]">Fit Score</p>
                  <p className={`font-mono text-xs font-bold ${scoreColor(result.fit_score)}`}>
                    {scoreLabel(result.fit_score)}
                  </p>
                </div>
                <span className="ml-auto font-mono text-xs text-[#4B5563] uppercase tracking-wider">
                  Resume variant: <span className="text-black font-bold">{result.stack}</span>
                </span>
              </div>
            </div>

            {/* Detected skills */}
            <div className="space-y-2">
              <p className="font-mono text-xs uppercase tracking-wider text-[#4B5563]">Detected Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {result.detected_skills.map(s => (
                  <Badge
                    key={s}
                    variant={result.bolded_skills.includes(s) ? 'applied' : 'secondary'}
                  >
                    {s}
                  </Badge>
                ))}
              </div>
              <p className="font-mono text-xs text-[#4B5563]">[ Blue badges are bolded in your resume ]</p>
            </div>

            {result.soft_skills_injected === false && (
              <div className="border-2 border-yellow-500 bg-yellow-50 px-3 py-2 flex items-start gap-2">
                <div className="w-3 h-3 bg-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="font-mono text-xs text-yellow-700 uppercase tracking-wider">
                  No soft skills matched — check keywords in <code className="normal-case">user/config.json</code> soft_skills pool
                </p>
              </div>
            )}

            {result.cover_letter_available === false && (
              <div className="border-2 border-yellow-500 bg-yellow-50 px-3 py-2 flex items-start gap-2">
                <div className="w-3 h-3 bg-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="font-mono text-xs text-yellow-700 uppercase tracking-wider">
                  Cover letter skipped — add <code className="normal-case">user/cover-letter/template.md</code> to enable
                </p>
              </div>
            )}

            <Button onClick={() => navigate(`/editor/${result.id}`)} className="gap-2 w-full sm:w-auto">
              Open Editor &amp; Export PDFs
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Template preview overlay */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_#000] w-full max-w-3xl h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b-2 border-black flex-shrink-0">
              <span className="font-mono text-xs uppercase tracking-wider">Template Preview</span>
              <button
                onClick={() => setPreviewOpen(false)}
                className="font-mono text-xs text-[#4B5563] hover:text-black uppercase tracking-wider"
              >
                [ Close ]
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              {previewLoading ? (
                <div className="flex h-full items-center justify-center gap-2 text-[#4B5563]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-mono text-xs uppercase tracking-wider">[ Rendering… ]</span>
                </div>
              ) : previewHtml ? (
                <iframe srcDoc={previewHtml} className="w-full h-full border border-black" title="Template Preview" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="font-mono text-xs uppercase tracking-wider text-[#4B5563]">[ Preview unavailable ]</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
