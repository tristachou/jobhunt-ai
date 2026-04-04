import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, ArrowLeft, Plus, Trash2, RefreshCw } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SkillGroup  { id: number; label: string; items: string }
interface ExpEntry    { id: number; title: string; company: string; location: string; start: string; end: string; current: boolean; bullets: string[] }
interface EduEntry    { id: number; degree: string; institution: string; location: string; year: string }
interface CertEntry   { id: number; name: string; date: string }

let nextId = 1
const uid = () => nextId++

// ─── Small field component ──────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder = '', optional = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; optional?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-mono text-xs uppercase tracking-wider text-[#4B5563]">
        {label}{optional && <span className="ml-1 normal-case">(optional)</span>}
      </label>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
    </div>
  )
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHeader({ title, onAdd, addLabel }: { title: string; onAdd?: () => void; addLabel?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-black pb-1 mb-3">
      <span className="font-mono text-xs uppercase tracking-widest font-bold">{title}</span>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="font-mono text-xs uppercase tracking-wider text-[#4B5563] hover:text-black flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> {addLabel || 'Add'}
        </button>
      )}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ResumeBuilderPage() {
  const navigate  = useNavigate()

  // form state
  const [templateName, setTemplateName] = useState('My Resume')
  const [name, setName]               = useState('')
  const [email, setEmail]             = useState('')
  const [phone, setPhone]             = useState('')
  const [location, setLocation]       = useState('')
  const [linkedin, setLinkedin]       = useState('')
  const [portfolio, setPortfolio]     = useState('')
  const [summary, setSummary]         = useState('')
  const [skills, setSkills]           = useState<SkillGroup[]>([{ id: uid(), label: '', items: '' }])
  const [experience, setExperience]   = useState<ExpEntry[]>([{
    id: uid(), title: '', company: '', location: '', start: '', end: '', current: false, bullets: ['']
  }])
  const [education, setEducation]     = useState<EduEntry[]>([{ id: uid(), degree: '', institution: '', location: '', year: '' }])
  const [certifications, setCerts]    = useState<CertEntry[]>([])

  // UI state
  const [preview, setPreview]       = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Build payload from form state ─────────────────────────────────────────

  const buildPayload = useCallback(() => ({
    name: templateName,
    personal: { name, email, phone, location, linkedin, portfolio },
    summary,
    skills: skills.filter(s => s.label || s.items),
    experience: experience.map(e => ({
      title: e.title, company: e.company, location: e.location,
      start: e.start, end: e.end, current: e.current,
      bullets: e.bullets.filter(Boolean),
    })),
    education: education.map(e => ({ degree: e.degree, institution: e.institution, location: e.location, year: e.year })),
    certifications: certifications.filter(c => c.name),
  }), [templateName, name, email, phone, location, linkedin, portfolio, summary, skills, experience, education, certifications])

  // ── Debounced live preview ────────────────────────────────────────────────

  useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current)
    previewTimer.current = setTimeout(async () => {
      try {
        setPreviewLoading(true)
        const res = await fetch('/api/resume-templates/build-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload()),
        })
        if (res.ok) {
          const { markdown } = await res.json()
          const { html } = await api.preview(markdown, 'resume')
          setPreview(html)
        }
      } catch { /* ignore preview errors */ }
      finally { setPreviewLoading(false) }
    }, 800)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildPayload])

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    try {
      const { id } = await api.buildTemplate(buildPayload())
      navigate(`/resumes/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
      setSaving(false)
    }
  }

  // ── Skills helpers ────────────────────────────────────────────────────────

  function addSkill()  { setSkills(p => [...p, { id: uid(), label: '', items: '' }]) }
  function removeSkill(id: number) { setSkills(p => p.filter(s => s.id !== id)) }
  function updateSkill(id: number, field: 'label' | 'items', val: string) {
    setSkills(p => p.map(s => s.id === id ? { ...s, [field]: val } : s))
  }

  // ── Experience helpers ────────────────────────────────────────────────────

  function addExp() {
    setExperience(p => [...p, { id: uid(), title: '', company: '', location: '', start: '', end: '', current: false, bullets: [''] }])
  }
  function removeExp(id: number) { setExperience(p => p.filter(e => e.id !== id)) }
  function updateExp(id: number, field: keyof Omit<ExpEntry, 'id' | 'bullets'>, val: string | boolean) {
    setExperience(p => p.map(e => e.id === id ? { ...e, [field]: val } : e))
  }
  function addBullet(id: number) {
    setExperience(p => p.map(e => e.id === id ? { ...e, bullets: [...e.bullets, ''] } : e))
  }
  function updateBullet(id: number, idx: number, val: string) {
    setExperience(p => p.map(e => e.id === id ? { ...e, bullets: e.bullets.map((b, i) => i === idx ? val : b) } : e))
  }
  function removeBullet(id: number, idx: number) {
    setExperience(p => p.map(e => e.id === id ? { ...e, bullets: e.bullets.filter((_, i) => i !== idx) } : e))
  }

  // ── Education helpers ─────────────────────────────────────────────────────

  function addEdu() { setEducation(p => [...p, { id: uid(), degree: '', institution: '', location: '', year: '' }]) }
  function removeEdu(id: number) { setEducation(p => p.filter(e => e.id !== id)) }
  function updateEdu(id: number, field: keyof Omit<EduEntry, 'id'>, val: string) {
    setEducation(p => p.map(e => e.id === id ? { ...e, [field]: val } : e))
  }

  // ── Cert helpers ──────────────────────────────────────────────────────────

  function addCert() { setCerts(p => [...p, { id: uid(), name: '', date: '' }]) }
  function removeCert(id: number) { setCerts(p => p.filter(c => c.id !== id)) }
  function updateCert(id: number, field: 'name' | 'date', val: string) {
    setCerts(p => p.map(c => c.id === id ? { ...c, [field]: val } : c))
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-white">

      {/* ── Left: form ── */}
      <div className="w-1/2 flex flex-col border-r-2 border-black overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b-2 border-black flex-shrink-0">
          <button
            onClick={() => navigate('/resumes')}
            className="text-[#4B5563] hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="font-mono text-xs uppercase tracking-widest font-bold">Build Resume</span>
          <div className="flex-1" />
          <Button size="sm" onClick={handleSubmit} disabled={saving} className="h-7 text-xs">
            {saving ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Saving…</> : 'Save & Edit →'}
          </Button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {error && (
            <div className="border-2 border-red-600 bg-red-100 px-3 py-2">
              <p className="font-mono text-xs text-red-600 uppercase tracking-wider">{error}</p>
            </div>
          )}

          {/* Template name */}
          <Field label="Template name" value={templateName} onChange={setTemplateName} placeholder="My Resume" />

          {/* Personal info */}
          <div>
            <SectionHeader title="Personal Info" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full name" value={name} onChange={setName} placeholder="Jane Smith" />
              <Field label="Email" value={email} onChange={setEmail} placeholder="jane@example.com" />
              <Field label="Phone" value={phone} onChange={setPhone} placeholder="+1 555 000 0000" />
              <Field label="Location" value={location} onChange={setLocation} placeholder="Sydney, NSW" />
              <Field label="LinkedIn" value={linkedin} onChange={setLinkedin} placeholder="linkedin.com/in/jane" optional />
              <Field label="Portfolio" value={portfolio} onChange={setPortfolio} placeholder="https://jane.dev" optional />
            </div>
          </div>

          {/* Summary */}
          <div>
            <SectionHeader title="Summary" />
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Experienced engineer with a passion for..."
              rows={3}
              className="w-full border-2 border-black px-3 py-2 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-black resize-y"
            />
          </div>

          {/* Skills */}
          <div>
            <SectionHeader title="Skills" onAdd={addSkill} addLabel="Add skill group" />
            <div className="space-y-3">
              {skills.map(s => (
                <div key={s.id} className="border-2 border-black p-3 space-y-2">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Field label="Group name" value={s.label} onChange={v => updateSkill(s.id, 'label', v)} placeholder="Programming Languages" />
                    </div>
                    {skills.length > 1 && (
                      <button type="button" onClick={() => removeSkill(s.id)} className="mb-0.5 text-[#9CA3AF] hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Field label="Skills (comma-separated)" value={s.items} onChange={v => updateSkill(s.id, 'items', v)} placeholder="JavaScript, TypeScript, Python" />
                </div>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div>
            <SectionHeader title="Experience" onAdd={addExp} addLabel="Add position" />
            <div className="space-y-4">
              {experience.map((job, ji) => (
                <div key={job.id} className="border-2 border-black p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#4B5563]">Position {ji + 1}</span>
                    {experience.length > 1 && (
                      <button type="button" onClick={() => removeExp(job.id)} className="text-[#9CA3AF] hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Job title" value={job.title} onChange={v => updateExp(job.id, 'title', v)} placeholder="Senior Engineer" />
                    <Field label="Company" value={job.company} onChange={v => updateExp(job.id, 'company', v)} placeholder="Acme Corp" />
                    <Field label="Location" value={job.location} onChange={v => updateExp(job.id, 'location', v)} placeholder="Sydney, NSW" />
                    <div />
                    <Field label="Start date" value={job.start} onChange={v => updateExp(job.id, 'start', v)} placeholder="Jan 2022" />
                    <div className="flex flex-col gap-1">
                      <label className="font-mono text-xs uppercase tracking-wider text-[#4B5563]">End date</label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={job.end}
                          onChange={e => updateExp(job.id, 'end', e.target.value)}
                          placeholder="Dec 2023"
                          disabled={job.current}
                          className="h-8 text-sm flex-1"
                        />
                        <label className="flex items-center gap-1 font-mono text-xs whitespace-nowrap cursor-pointer">
                          <input
                            type="checkbox"
                            checked={job.current}
                            onChange={e => updateExp(job.id, 'current', e.target.checked)}
                            className="h-3 w-3"
                          />
                          Current
                        </label>
                      </div>
                    </div>
                  </div>
                  {/* Bullets */}
                  <div>
                    <span className="font-mono text-xs uppercase tracking-wider text-[#4B5563]">Bullets</span>
                    <div className="mt-1 space-y-1.5">
                      {job.bullets.map((b, bi) => (
                        <div key={bi} className="flex gap-2 items-center">
                          <span className="font-mono text-xs text-[#9CA3AF] w-3">•</span>
                          <Input
                            value={b}
                            onChange={e => updateBullet(job.id, bi, e.target.value)}
                            placeholder="Describe an achievement or responsibility..."
                            className="h-8 text-sm flex-1"
                          />
                          {job.bullets.length > 1 && (
                            <button type="button" onClick={() => removeBullet(job.id, bi)} className="text-[#9CA3AF] hover:text-red-600 flex-shrink-0">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addBullet(job.id)}
                        className="font-mono text-xs uppercase tracking-wider text-[#4B5563] hover:text-black flex items-center gap-1 mt-1"
                      >
                        <Plus className="h-3 w-3" /> Add bullet
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          <div>
            <SectionHeader title="Education" onAdd={addEdu} addLabel="Add education" />
            <div className="space-y-3">
              {education.map((edu, ei) => (
                <div key={edu.id} className="border-2 border-black p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#4B5563]">Entry {ei + 1}</span>
                    {education.length > 1 && (
                      <button type="button" onClick={() => removeEdu(edu.id)} className="text-[#9CA3AF] hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Degree" value={edu.degree} onChange={v => updateEdu(edu.id, 'degree', v)} placeholder="B.Sc. Computer Science" />
                    <Field label="Institution" value={edu.institution} onChange={v => updateEdu(edu.id, 'institution', v)} placeholder="UNSW" />
                    <Field label="Location" value={edu.location} onChange={v => updateEdu(edu.id, 'location', v)} placeholder="Sydney, NSW" optional />
                    <Field label="Year / date range" value={edu.year} onChange={v => updateEdu(edu.id, 'year', v)} placeholder="2019 – 2023" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div>
            <SectionHeader title="Certifications" onAdd={addCert} addLabel="Add cert" />
            <div className="space-y-2">
              {certifications.length === 0 && (
                <p className="font-mono text-xs text-[#9CA3AF]">No certifications added.</p>
              )}
              {certifications.map(cert => (
                <div key={cert.id} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Field label="Certification name" value={cert.name} onChange={v => updateCert(cert.id, 'name', v)} placeholder="AWS Certified Solutions Architect" />
                  </div>
                  <div className="w-28">
                    <Field label="Date" value={cert.date} onChange={v => updateCert(cert.id, 'date', v)} placeholder="Jan 2025" optional />
                  </div>
                  <button type="button" onClick={() => removeCert(cert.id)} className="mb-0.5 text-[#9CA3AF] hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pb-8" />
        </div>
      </div>

      {/* ── Right: live preview ── */}
      <div className="w-1/2 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b-2 border-black flex-shrink-0">
          <span className="font-mono text-xs uppercase tracking-widest font-bold">Preview</span>
          {previewLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#4B5563]" />}
        </div>
        <div className="flex-1 overflow-hidden">
          {preview ? (
            <iframe
              srcDoc={preview}
              className="w-full h-full border-0"
              title="Resume preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="font-mono text-xs uppercase tracking-wider text-[#9CA3AF]">
                {previewLoading ? 'Loading preview…' : 'Fill in the form to see a preview'}
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
