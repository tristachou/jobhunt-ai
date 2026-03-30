import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, Check } from 'lucide-react'

export default function Settings() {
  const [tailor, setTailor]           = useState('')
  const [coverletter, setCoverletter] = useState('')
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    api.getPrompts()
      .then(d => { setTailor(d.tailor); setCoverletter(d.coverletter) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false)
    try {
      await api.savePrompts({ tailor, coverletter })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#4B5563] text-sm py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="font-mono text-xs uppercase tracking-wider">[ Loading prompts… ]</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* Page header */}
      <div className="border-b-2 border-black pb-4">
        <h1 className="font-serif text-3xl font-bold">Settings</h1>
        <p className="font-sans text-sm text-[#4B5563] mt-1">
          Customise the AI prompts used to tailor your resume and generate cover letters.
        </p>
      </div>

      <div className="space-y-6">
        {/* Tailor prompt */}
        <div className="space-y-2">
          <Label>Tailor Prompt</Label>
          <p className="font-mono text-xs text-[#4B5563]">
            Used to analyse the job description and fill in resume placeholders.
          </p>
          <textarea
            className="w-full min-h-52 rounded-none border border-black bg-white px-3 py-2.5 font-mono text-xs leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-blue-700"
            spellCheck={false}
            value={tailor}
            onChange={e => setTailor(e.target.value)}
          />
          <details className="group">
            <summary className="cursor-pointer font-mono text-xs text-[#4B5563] uppercase tracking-wider hover:text-black select-none">
              Available tokens ▸
            </summary>
            <div className="mt-2 border border-black bg-white px-3 py-2 space-y-1 font-mono text-xs">
              <p><code className="text-blue-700">{'{{JD}}'}</code> — the full job description text <span className="text-red-600">(required)</span></p>
              <p><code className="text-blue-700">{'{{STACKS}}'}</code> — JSON array of all skill keywords from <code>user/config.json</code></p>
            </div>
          </details>
        </div>

        {/* Cover letter prompt */}
        <div className="space-y-2">
          <Label>Cover Letter Prompt</Label>
          <p className="font-mono text-xs text-[#4B5563]">
            Used to generate a personalised cover letter.
          </p>
          <textarea
            className="w-full min-h-52 rounded-none border border-black bg-white px-3 py-2.5 font-mono text-xs leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-blue-700"
            spellCheck={false}
            value={coverletter}
            onChange={e => setCoverletter(e.target.value)}
          />
          <details className="group">
            <summary className="cursor-pointer font-mono text-xs text-[#4B5563] uppercase tracking-wider hover:text-black select-none">
              Available tokens ▸
            </summary>
            <div className="mt-2 border border-black bg-white px-3 py-2 space-y-1 font-mono text-xs">
              <p><code className="text-blue-700">{'{{TEMPLATE}}'}</code> — the full cover letter template from <code>user/cover-letter/template.md</code> <span className="text-red-600">(required)</span></p>
              <p><code className="text-blue-700">{'{{COMPANY}}'}</code> — the company name entered in the form</p>
              <p><code className="text-blue-700">{'{{JOB_TITLE}}'}</code> — the job title entered in the form</p>
              <p><code className="text-blue-700">{'{{JD}}'}</code> — the full job description text</p>
            </div>
          </details>
        </div>
      </div>

      {error && (
        <div className="border-2 border-red-600 bg-red-100 px-3 py-2 flex items-start gap-2">
          <div className="w-3 h-3 bg-red-600 flex-shrink-0 mt-0.5" />
          <p className="font-mono text-xs text-red-600 uppercase tracking-wider">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Prompts
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 font-mono text-xs text-green-700 uppercase tracking-wider">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </div>
  )
}
