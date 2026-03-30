import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type AnalyzeResult, THEMES } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ArrowRight } from 'lucide-react'

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
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [result, setResult]   = useState<AnalyzeResult | null>(null)

  const set = (k: keyof typeof form) => (v: string) =>
    setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.job_title || !form.company || !form.jd) {
      setError('Job title, company, and job description are required.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 65000)
    try {
      const data = await api.analyze(form, controller.signal)
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
  }

  return (
    <div className="space-y-8">

      {/* Page header */}
      <div className="border-b-2 border-black pb-4">
        <h1 className="font-serif text-3xl font-bold">New Application</h1>
        <p className="font-sans text-sm text-[#4B5563] mt-1">
          Paste a job description — AI tailors your resume and cover letter automatically.
        </p>
      </div>

      {/* Form */}
      <div className="space-y-5">

        {/* Row 1 — 4 cols */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
            <Label>Theme</Label>
            <Select value={form.theme} onValueChange={set('theme')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {THEMES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* URL */}
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

        {/* JD */}
        <div className="space-y-1.5">
          <Label htmlFor="jd">Job Description</Label>
          <Textarea
            id="jd"
            placeholder="Paste the full job description here…"
            className="min-h-44 resize-y"
            value={form.jd}
            onChange={e => set('jd')(e.target.value)}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="border-2 border-red-600 bg-red-100 px-3 py-2 flex items-start gap-2">
            <div className="w-3 h-3 bg-red-600 flex-shrink-0 mt-0.5" />
            <p className="font-mono text-xs text-red-600 uppercase tracking-wider">{error}</p>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing…</>
              : <>Generate <ArrowRight className="h-4 w-4" /></>
            }
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
                  Stack: <span className="text-black font-bold">{result.stack}</span>
                </span>
              </div>
            </div>

            {/* Detected skills */}
            <div className="space-y-2">
              <p className="font-mono text-xs uppercase tracking-wider text-[#4B5563]">
                Detected Skills
              </p>
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
              <p className="font-mono text-xs text-[#4B5563]">
                [ Blue badges are bolded in your resume ]
              </p>
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
    </div>
  )
}
