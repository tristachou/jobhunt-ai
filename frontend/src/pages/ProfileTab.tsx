import { useEffect, useState, useRef } from 'react'
import { api, type AppConfig, type StackConfig, type ExperienceBlock, type BulletPoolEntry, type SoftSkillEntry } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Check, X, Plus, ChevronDown, ChevronRight } from 'lucide-react'

// ─── Skill list editor ─────────────────────────────────────────────────────────

function SkillListEditor({ label, skills, onChange }: {
  label: string
  skills: string[]
  onChange: (next: string[]) => void
}) {
  const [draft, setDraft] = useState('')

  function addSkill() {
    const trimmed = draft.trim()
    if (!trimmed || skills.includes(trimmed)) { setDraft(''); return }
    onChange([...skills, trimmed])
    setDraft('')
  }

  return (
    <div className="space-y-1.5">
      <p className="font-mono text-xs uppercase tracking-wider text-[#4B5563]">{label}</p>
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {skills.map(s => (
          <span
            key={s}
            className="inline-flex items-center gap-1 border border-black bg-white px-2 py-0.5 font-mono text-xs"
          >
            {s}
            <button
              onClick={() => onChange(skills.filter(x => x !== s))}
              className="text-[#4B5563] hover:text-red-600 transition-colors"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
          placeholder="Add skill, press Enter"
          className="h-7 text-xs font-mono"
        />
        <Button size="sm" variant="outline" className="h-7 px-2" onClick={addSkill}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ─── Soft skills editor ────────────────────────────────────────────────────────

function SoftSkillsEditor({ pool, onChange }: {
  pool: SoftSkillEntry[]
  onChange: (next: SoftSkillEntry[]) => void
}) {
  function update(idx: number, field: keyof SoftSkillEntry, value: string) {
    const next = pool.map((e, i) => i === idx ? { ...e, [field]: value } : e)
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <p className="font-mono text-xs uppercase tracking-wider text-[#4B5563]">Soft Skills Pool</p>
      <p className="font-mono text-xs text-[#4B5563]">
        Keywords are matched against the JD. Matching bullets are injected into your resume (max 2).
      </p>
      <div className="space-y-2">
        {pool.map((entry, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <Input
              value={entry.keyword}
              onChange={e => update(idx, 'keyword', e.target.value)}
              placeholder="keyword"
              className="h-7 text-xs font-mono w-32 flex-shrink-0"
            />
            <Input
              value={entry.bullet}
              onChange={e => update(idx, 'bullet', e.target.value)}
              placeholder="bullet text for resume"
              className="h-7 text-xs font-mono flex-1"
            />
            <button
              onClick={() => onChange(pool.filter((_, i) => i !== idx))}
              className="text-[#4B5563] hover:text-red-600 transition-colors mt-1.5 flex-shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <Button
        size="sm" variant="outline" className="h-7 text-xs gap-1"
        onClick={() => onChange([...pool, { keyword: '', bullet: '' }])}
      >
        <Plus className="h-3 w-3" /> Add soft skill
      </Button>
    </div>
  )
}

// ─── Bullet pool entry editor ──────────────────────────────────────────────────

function BulletPoolEditor({ pool, onChange }: {
  pool: BulletPoolEntry[]
  onChange: (next: BulletPoolEntry[]) => void
}) {
  function updateEntry(idx: number, patch: Partial<BulletPoolEntry>) {
    onChange(pool.map((e, i) => i === idx ? { ...e, ...patch } : e))
  }

  function addBullet() {
    const id = `bullet_${Date.now()}`
    onChange([...pool, { id, text: '', must_have: false, tags: [] }])
  }

  return (
    <div className="space-y-2">
      <p className="font-mono text-xs text-[#4B5563]">
        Bullets are selected per-application based on JD keyword matching. Mark as <strong>Must-have</strong> to always include.
      </p>
      <div className="space-y-2">
        {pool.map((entry, idx) => (
          <div key={entry.id} className="flex gap-2 items-start">
            {/* Must-have toggle */}
            <button
              title={entry.must_have ? 'Must-have (always included)' : 'Optional (AI-selected)'}
              onClick={() => updateEntry(idx, { must_have: !entry.must_have })}
              className={`mt-1.5 flex-shrink-0 w-4 h-4 border-2 flex items-center justify-center transition-colors ${
                entry.must_have ? 'border-black bg-black' : 'border-[#9CA3AF] bg-white hover:border-black'
              }`}
            >
              {entry.must_have && <Check className="h-2.5 w-2.5 text-white" />}
            </button>
            {/* Bullet text */}
            <Input
              value={entry.text}
              onChange={e => updateEntry(idx, { text: e.target.value })}
              placeholder="Bullet text (use **bold** for emphasis)"
              className="h-7 text-xs font-mono flex-1"
            />
            {/* Tags */}
            <Input
              value={(entry.tags || []).join(', ')}
              onChange={e => updateEntry(idx, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
              placeholder="tags (e.g. backend, aws)"
              className="h-7 text-xs font-mono w-40 flex-shrink-0"
            />
            {/* Delete */}
            <button
              onClick={() => onChange(pool.filter((_, i) => i !== idx))}
              className="text-[#4B5563] hover:text-red-600 transition-colors mt-1.5 flex-shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addBullet}>
          <Plus className="h-3 w-3" /> Add bullet
        </Button>
        <span className="font-mono text-[10px] text-[#9CA3AF] uppercase">
          ☐ = optional (AI picks best match) &nbsp;|&nbsp; ☑ = must-have (always shown)
        </span>
      </div>
    </div>
  )
}

// ─── Experience block editor ───────────────────────────────────────────────────

function ExperienceBlocksEditor({ experiences, onChange }: {
  experiences: ExperienceBlock[]
  onChange: (next: ExperienceBlock[]) => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(experiences.map(e => [e.id, true]))
  )

  function updateExp(idx: number, patch: Partial<ExperienceBlock>) {
    onChange(experiences.map((e, i) => i === idx ? { ...e, ...patch } : e))
  }

  function toggle(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-3">
      <p className="font-mono text-xs text-[#4B5563]">
        Each block maps to a section of your <code className="text-blue-700">base.md</code>. Slots filled per application via bullet pool selection.
      </p>
      {experiences.map((exp, idx) => (
        <div key={exp.id} className="border border-black">
          {/* Block header */}
          <button
            className="w-full flex items-center gap-2 px-3 py-2 bg-[#F0F0E8] hover:bg-[#E8E8E0] transition-colors text-left"
            onClick={() => toggle(exp.id)}
          >
            {expanded[exp.id] ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />}
            <span className="font-mono text-xs font-bold uppercase tracking-wider">{exp.id}</span>
            <span className="font-mono text-xs text-[#4B5563] truncate ml-1">{exp.technologies}</span>
            <span className="font-mono text-[10px] text-[#9CA3AF] ml-auto flex-shrink-0">{exp.bullet_pool.length} bullets</span>
          </button>
          {/* Block content */}
          {expanded[exp.id] && (
            <div className="p-3 space-y-3">
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-wider text-[#4B5563]">Technologies line (fills <code className="text-blue-700">{`{{${exp.id}_technologies}}`}</code>)</label>
                <Input
                  value={exp.technologies}
                  onChange={e => updateExp(idx, { technologies: e.target.value })}
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-wider text-[#4B5563]">Bullet Pool</label>
                <BulletPoolEditor
                  pool={exp.bullet_pool}
                  onChange={pool => updateExp(idx, { bullet_pool: pool })}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ProfileTab() {
  const [config, setConfig]         = useState<AppConfig | null>(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [activeStack, setActiveStack] = useState('')
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.getConfig()
      .then(c => {
        setConfig(c)
        setActiveStack(Object.keys(c.stacks)[0] ?? '')
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function updateStack(key: string, patch: Partial<StackConfig>) {
    setConfig(prev => prev ? {
      ...prev,
      stacks: { ...prev.stacks, [key]: { ...prev.stacks[key], ...patch } },
    } : prev)
  }

  async function handleSave() {
    if (!config) return
    setSaving(true); setError(null); setSaved(false)
    try {
      await api.saveConfig(config)
      setSaved(true)
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#4B5563] py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="font-mono text-xs uppercase tracking-wider">[ Loading profile… ]</span>
      </div>
    )
  }

  if (error && !config) {
    return (
      <div className="border-2 border-red-600 bg-red-100 px-3 py-2 flex items-start gap-2">
        <div className="w-3 h-3 bg-red-600 flex-shrink-0 mt-0.5" />
        <p className="font-mono text-xs text-red-600 uppercase tracking-wider">{error}</p>
      </div>
    )
  }

  if (!config) return null

  const stackKeys = Object.keys(config.stacks)
  const stack     = config.stacks[activeStack]

  const SKILL_CATEGORIES: { key: keyof StackConfig; label: string }[] = [
    { key: 'lang_skills',     label: 'Programming Languages' },
    { key: 'frontend_skills', label: 'Front-end' },
    { key: 'backend_skills',  label: 'Back-end' },
    { key: 'database_skills', label: 'Database' },
    { key: 'cloud_skills',    label: 'Cloud & Tools' },
    { key: 'ai_skills',       label: 'AI & LLM' },
  ]

  return (
    <div className="space-y-8">

      {/* Stack selector */}
      {stackKeys.length > 1 && (
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-[#4B5563]">Stack</p>
          <div className="flex gap-2 flex-wrap">
            {stackKeys.map(key => (
              <button
                key={key}
                onClick={() => setActiveStack(key)}
                className={`px-3 py-1 font-mono text-xs uppercase border border-black transition-colors ${
                  activeStack === key ? 'bg-black text-white' : 'bg-white text-black hover:bg-black/5'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      )}

      {stack && (
        <>
          {/* Basic info */}
          <div className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-wider text-[#4B5563] border-b border-black pb-1">
              Basic Info — {activeStack}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-mono text-xs uppercase tracking-wider text-[#4B5563]">Your Name</label>
                <Input
                  value={stack.name}
                  onChange={e => updateStack(activeStack, { name: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-xs uppercase tracking-wider text-[#4B5563]">Job Title Display</label>
                <Input
                  value={stack.job_title_display}
                  onChange={e => updateStack(activeStack, { job_title_display: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-xs uppercase tracking-wider text-[#4B5563]">Primary Stack Label</label>
                <Input
                  value={stack.primary_stack}
                  onChange={e => updateStack(activeStack, { primary_stack: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Skill lists */}
          <div className="space-y-4">
            <p className="font-mono text-xs uppercase tracking-wider text-[#4B5563] border-b border-black pb-1">
              Skills — {activeStack}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SKILL_CATEGORIES.map(({ key, label }) => (
                <SkillListEditor
                  key={key}
                  label={label}
                  skills={stack[key] as string[]}
                  onChange={next => updateStack(activeStack, { [key]: next })}
                />
              ))}
            </div>
          </div>

          {/* Experience blocks */}
          <div className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-wider text-[#4B5563] border-b border-black pb-1">
              Experience Blocks — {activeStack}
            </p>
            <ExperienceBlocksEditor
              experiences={stack.experiences || []}
              onChange={experiences => updateStack(activeStack, { experiences })}
            />
          </div>
        </>
      )}

      {/* Soft skills (global) */}
      <div className="space-y-3">
        <SoftSkillsEditor
          pool={config.soft_skills.pool}
          onChange={next => setConfig(prev => prev ? { ...prev, soft_skills: { pool: next } } : prev)}
        />
      </div>

      {/* Save */}
      {error && (
        <div className="border-2 border-red-600 bg-red-100 px-3 py-2 flex items-start gap-2">
          <div className="w-3 h-3 bg-red-600 flex-shrink-0 mt-0.5" />
          <p className="font-mono text-xs text-red-600 uppercase tracking-wider">{error}</p>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Profile
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
