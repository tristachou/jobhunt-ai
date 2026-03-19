import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type AnalyzeResult } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ArrowRight } from 'lucide-react'

const scoreColor = (s: number) =>
  s >= 70 ? 'text-emerald-600' : s >= 50 ? 'text-amber-500' : 'text-red-500'

const scoreLabel = (s: number) =>
  s >= 70 ? 'Strong match' : s >= 50 ? 'Moderate match' : 'Weak match'

export default function NewApplication() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    job_title: '',
    company: '',
    source: 'linkedin',
    url: '',
    jd: '',
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
    try {
      const data = await api.analyze(form)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* Form */}
      <div>
        <h2 className="text-lg font-semibold mb-1">New Application</h2>
        <p className="text-sm text-neutral-500 mb-6">
          Paste a job description and we'll tailor your resume and cover letter automatically.
        </p>

        <div className="space-y-4">
          {/* Row 1 — 3 cols on md+, stacked on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                placeholder="Full-Stack Developer"
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="seek">Seek</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <Label htmlFor="url">
              Job URL <span className="text-neutral-400 font-normal normal-case">(optional)</span>
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

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </p>
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
      </div>

      {/* Divider */}
      {result && <div className="border-t" />}

      {/* Result */}
      {result && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold mb-1">Result</h2>
            <p className="text-sm text-neutral-500">Review your tailored resume and cover letter in the editor.</p>
          </div>

          {/* Score */}
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-bold tabular-nums ${scoreColor(result.fit_score)}`}>
              {result.fit_score}
            </span>
            <div>
              <p className="text-sm font-medium text-neutral-700">Fit Score</p>
              <p className={`text-xs ${scoreColor(result.fit_score)}`}>{scoreLabel(result.fit_score)}</p>
            </div>
            <span className="ml-auto text-sm text-neutral-400">Stack: <span className="text-neutral-700 font-medium">{result.stack}</span></span>
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Detected Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {result.detected_skills.map(s => (
                <Badge
                  key={s}
                  variant={result.bolded_skills.includes(s) ? 'applied' : 'secondary'}
                  className={result.bolded_skills.includes(s) ? 'font-semibold' : ''}
                >
                  {s}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-neutral-400">
              Highlighted skills are bolded in your resume
            </p>
          </div>

          <Button onClick={() => navigate(`/editor/${result.id}`)} className="w-full sm:w-auto">
            Open Editor & Export PDFs
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
