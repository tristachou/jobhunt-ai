import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Application } from '@/lib/api'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, Pencil, Trash2, Download, ChevronDown, ChevronRight } from 'lucide-react'

// ─── Constants ─────────────────────────────────────────────────────────────────

type Status = Application['status']
type Filter = 'all' | Status

const STATUSES: Status[] = ['analyzed', 'exported', 'applied', 'interview', 'rejected']

const STATUS_VARIANT: Record<Status, BadgeProps['variant']> = {
  generated: 'secondary',
  analyzed:  'analyzed',
  exported:  'exported',
  applied:   'applied',
  interview: 'interview',
  rejected:  'rejected',
}

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All',       value: 'all' },
  { label: 'Analyzed',  value: 'analyzed' },
  { label: 'Applied',   value: 'applied' },
  { label: 'Interview', value: 'interview' },
  { label: 'Rejected',  value: 'rejected' },
]

// ─── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm tabular-nums w-6 text-right">{score}</span>
      <div className="w-12 h-1 rounded-full bg-neutral-100">
        <div className={`h-1 rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

// ─── Inline editable cell ──────────────────────────────────────────────────────

function EditableCell({
  value, onSave, type = 'text', options,
}: {
  value: string; onSave: (v: string) => void; type?: string; options?: string[]
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value)

  function commit() {
    setEditing(false)
    if (draft !== value) onSave(draft)
  }

  if (!editing) {
    return (
      <span
        className="cursor-text hover:opacity-60 transition-opacity"
        onClick={() => { setDraft(value); setEditing(true) }}
      >
        {value || <span className="text-neutral-300">—</span>}
      </span>
    )
  }
  if (options) {
    return (
      <select
        autoFocus
        className="border border-neutral-300 rounded px-1.5 py-0.5 text-sm bg-white outline-none focus:ring-1 focus:ring-black"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  return (
    <input
      autoFocus type={type}
      className="border border-neutral-300 rounded px-1.5 py-0.5 text-sm bg-white w-full min-w-[80px] outline-none focus:ring-1 focus:ring-black"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') { setDraft(value); setEditing(false) }
      }}
    />
  )
}

// ─── Status dropdown ───────────────────────────────────────────────────────────

function StatusCell({ app, onUpdate }: { app: Application; onUpdate: (s: Status) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-block">
      <Badge
        variant={STATUS_VARIANT[app.status]}
        className="cursor-pointer capitalize select-none"
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
      >
        {app.status}
      </Badge>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 w-36 rounded-md border border-neutral-200 bg-white shadow-lg overflow-hidden">
            {STATUSES.map(s => (
              <button
                key={s}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-neutral-50 capitalize transition-colors"
                onClick={() => { onUpdate(s); setOpen(false) }}
              >
                <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                  s === 'interview' ? 'bg-emerald-500' :
                  s === 'applied'   ? 'bg-indigo-500' :
                  s === 'rejected'  ? 'bg-red-400' :
                  s === 'exported'  ? 'bg-blue-400' : 'bg-neutral-400'
                }`} />
                {s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Desktop row ───────────────────────────────────────────────────────────────

function DesktopRow({
  app, onUpdate, onDelete,
}: { app: Application; onUpdate: (id: number, d: Partial<Application>) => void; onDelete: (id: number) => void }) {
  const navigate   = useNavigate()
  const [open, setOpen] = useState(false)
  const patch = useCallback((d: Partial<Application>) => onUpdate(app.id, d), [app.id, onUpdate])

  return (
    <>
      <tr className="group hover:bg-neutral-50 transition-colors">
        <td className="pl-4 pr-2 py-3 w-7">
          <button
            className="text-neutral-300 hover:text-neutral-600 transition-colors"
            onClick={() => setOpen(o => !o)}
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </td>
        <td className="px-3 py-3 text-xs text-neutral-400 whitespace-nowrap">{app.created_at.slice(0, 10)}</td>
        <td className="px-3 py-3 font-medium text-sm"><EditableCell value={app.company} onSave={v => patch({ company: v })} /></td>
        <td className="px-3 py-3 text-sm text-neutral-600"><EditableCell value={app.job_title} onSave={v => patch({ job_title: v })} /></td>
        <td className="px-3 py-3 text-sm text-neutral-500 capitalize"><EditableCell value={app.source} onSave={v => patch({ source: v })} options={['linkedin','seek','other']} /></td>
        <td className="px-3 py-3"><ScoreBar score={app.fit_score ?? 0} /></td>
        <td className="px-3 py-3 text-xs text-neutral-400">{app.stack_used || '—'}</td>
        <td className="px-3 py-3">
          <StatusCell app={app} onUpdate={s => patch({ status: s })} />
        </td>
        <td className="px-3 py-3">
          {app.url
            ? <a href={app.url} target="_blank" rel="noreferrer" className="text-xs text-neutral-500 hover:text-black hover:underline transition-colors">↗ Link</a>
            : <span className="text-neutral-300 text-xs">—</span>}
        </td>
        <td className="px-3 py-3 pr-4">
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {app.resume_md && (
              <a href={api.getPdfUrl(app.id, 'resume')} download title="Download Resume PDF">
                <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
              </a>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Open Editor" onClick={() => navigate(`/editor/${app.id}`)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-7 w-7 hover:text-red-500 transition-colors" title="Delete"
              onClick={() => { if (confirm(`Delete "${app.job_title}" at ${app.company}?`)) onDelete(app.id) }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={10} className="bg-neutral-50 border-b px-6 py-4">
            <div className="grid grid-cols-2 gap-6 max-w-3xl">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Job Description</p>
                <textarea
                  className="w-full min-h-36 text-sm border border-neutral-200 rounded-md px-3 py-2 resize-y bg-white focus:outline-none focus:ring-1 focus:ring-black"
                  defaultValue={app.jd_text}
                  onBlur={e => { if (e.target.value !== app.jd_text) patch({ jd_text: e.target.value }) }}
                />
                <p className="text-xs text-neutral-400 mt-1">Saves on blur</p>
              </div>
              <div className="text-sm space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Details</p>
                {[
                  ['ID', app.id],
                  ['Created', app.created_at.slice(0, 10)],
                  ['Score', `${app.fit_score ?? '—'} / 100`],
                  ['Stack', app.stack_used || '—'],
                  ['Source', app.source || '—'],
                ].map(([k, v]) => (
                  <p key={String(k)}><span className="text-neutral-400">{k}: </span>{v}</p>
                ))}
                {app.url && <p><span className="text-neutral-400">URL: </span>
                  <a href={app.url} target="_blank" rel="noreferrer" className="text-black hover:underline break-all">{app.url}</a>
                </p>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Mobile card ───────────────────────────────────────────────────────────────

function MobileCard({
  app, onUpdate, onDelete,
}: { app: Application; onUpdate: (id: number, d: Partial<Application>) => void; onDelete: (id: number) => void }) {
  const navigate = useNavigate()
  const patch    = useCallback((d: Partial<Application>) => onUpdate(app.id, d), [app.id, onUpdate])

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{app.company}</p>
          <p className="text-xs text-neutral-500 truncate">{app.job_title}</p>
        </div>
        <StatusCell app={app} onUpdate={s => patch({ status: s })} />
      </div>

      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span>{app.created_at.slice(0, 10)}</span>
        <ScoreBar score={app.fit_score ?? 0} />
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-neutral-100">
        {app.resume_md && (
          <a href={api.getPdfUrl(app.id, 'resume')} download>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <Download className="h-3 w-3" /> PDF
            </Button>
          </a>
        )}
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate(`/editor/${app.id}`)}>
          <Pencil className="h-3 w-3" /> Edit
        </Button>
        <Button
          variant="ghost" size="sm" className="h-7 text-xs text-red-500 ml-auto"
          onClick={() => { if (confirm(`Delete "${app.job_title}" at ${app.company}?`)) onDelete(app.id) }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function History() {
  const [apps, setApps]       = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<Filter>('all')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    api.getApplications().then(setApps).finally(() => setLoading(false))
  }, [])

  const handleUpdate = useCallback(async (id: number, data: Partial<Application>) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, ...data } : a))
    await api.patchApplication(id, data)
  }, [])

  const handleDelete = useCallback(async (id: number) => {
    await api.deleteApplication(id)
    setApps(prev => prev.filter(a => a.id !== id))
  }, [])

  const visible = apps
    .filter(a => filter === 'all' || a.status === filter)
    .sort((a, b) => {
      const d = a.created_at.localeCompare(b.created_at)
      return sortAsc ? d : -d
    })

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Application History</h2>
        <button
          className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-black transition-colors"
          onClick={() => setSortAsc(a => !a)}
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          Date {sortAsc ? '↑' : '↓'}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              filter === f.value
                ? 'bg-black text-white border-black'
                : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400 hover:text-black'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="w-7" />
                {['Date','Company','Title','Source','Score','Stack','Status','URL',''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading && (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-neutral-400 text-sm">Loading…</td></tr>
              )}
              {!loading && visible.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-neutral-400 text-sm">No applications yet.</td></tr>
              )}
              {visible.map(app => (
                <DesktopRow key={app.id} app={app} onUpdate={handleUpdate} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {loading && <p className="text-sm text-neutral-400 text-center py-8">Loading…</p>}
        {!loading && visible.length === 0 && (
          <p className="text-sm text-neutral-400 text-center py-8">No applications yet.</p>
        )}
        {visible.map(app => (
          <MobileCard key={app.id} app={app} onUpdate={handleUpdate} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  )
}
