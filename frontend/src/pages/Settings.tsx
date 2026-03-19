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
      <div className="flex items-center gap-2 text-neutral-400 text-sm py-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading prompts…
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-1">Prompt Settings</h2>
        <p className="text-sm text-neutral-500">
          Customise the AI prompts used for tailoring your resume and generating cover letters.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Tailor Prompt</Label>
          <p className="text-xs text-neutral-400">Used to analyse the job description and fill in resume placeholders.</p>
          <textarea
            className="w-full min-h-52 rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-black transition-shadow"
            spellCheck={false}
            value={tailor}
            onChange={e => setTailor(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Cover Letter Prompt</Label>
          <p className="text-xs text-neutral-400">Used to generate a personalised cover letter.</p>
          <textarea
            className="w-full min-h-52 rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-black transition-shadow"
            spellCheck={false}
            value={coverletter}
            onChange={e => setCoverletter(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Prompts
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </div>
  )
}
