import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, Check } from 'lucide-react'
import ProfileTab from './ProfileTab'

type SettingsTab = 'cover-letter' | 'profile'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('cover-letter')

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="border-b-2 border-black pb-4">
        <h1 className="font-serif text-3xl font-bold">Settings</h1>
        <p className="font-sans text-sm text-[#4B5563] mt-1">
          Edit your cover letter template and personal profile.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b-2 border-black -mt-2">
        {(['cover-letter', 'profile'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 font-mono text-xs uppercase tracking-wider border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-black text-black'
                : 'border-transparent text-[#4B5563] hover:text-black'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'cover-letter' ? <CoverLetterPanel /> : <ProfileTab />}
    </div>
  )
}

// ─── Cover letter template panel ───────────────────────────────────────────────

function CoverLetterPanel() {
  const [template, setTemplate] = useState('')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    api.getCoverLetterTemplate()
      .then(d => setTemplate(d.template))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false)
    try {
      await api.saveCoverLetterTemplate({ template })
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
        <span className="font-mono text-xs uppercase tracking-wider">[ Loading… ]</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Cover Letter Template</Label>
        <p className="font-mono text-xs text-[#4B5563]">
          This template is used every time you create an application — with or without AI.
          Use <code className="text-blue-700">{'{{company}}'}</code> and <code className="text-blue-700">{'{{job_title}}'}</code> as placeholders; they are filled in automatically.
        </p>
        <textarea
          className="w-full min-h-[32rem] rounded-none border border-black bg-white px-3 py-2.5 font-mono text-xs leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-blue-700"
          spellCheck={false}
          value={template}
          onChange={e => setTemplate(e.target.value)}
          placeholder={'Dear Hiring Manager,\n\nI am excited to apply for the {{job_title}} role at {{company}}.\n\n...'}
        />
      </div>

      {error && (
        <div className="border-2 border-red-600 bg-red-100 px-3 py-2 flex items-start gap-2">
          <div className="w-3 h-3 bg-red-600 flex-shrink-0 mt-0.5" />
          <p className="font-mono text-xs text-red-600 uppercase tracking-wider">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          Save Template
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
