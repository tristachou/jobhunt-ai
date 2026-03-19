import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type Application, THEMES } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Download, ArrowLeft, RefreshCw } from 'lucide-react'

type Tab = 'resume' | 'coverletter'
type PanelTab = 'editor' | 'preview'

const STATUS_VARIANT: Record<string, any> = {
  analyzed: 'analyzed', exported: 'exported', applied: 'applied',
  interview: 'interview', rejected: 'rejected',
}

export default function Editor() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const appId     = Number(id)

  const [app, setApp]                   = useState<Application | null>(null)
  const [tab, setTab]                   = useState<Tab>('resume')
  const [panelTab, setPanelTab]         = useState<PanelTab>('editor')
  const [markdown, setMarkdown]         = useState('')
  const [preview, setPreview]           = useState('')
  const [loadingApp, setLoadingApp]     = useState(true)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.getApplication(appId)
      .then(data => { setApp(data); setMarkdown(data.resume_md || '') })
      .catch(e => setError(e.message))
      .finally(() => setLoadingApp(false))
  }, [appId])

  async function refreshPreview(md: string, currentTab: Tab, currentTheme?: string) {
    if (!md) return
    setLoadingPreview(true)
    try {
      const theme = currentTheme ?? app?.theme
      const { html } = await api.preview(md, currentTab, currentTab === 'resume' ? theme : undefined)
      setPreview(html)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview failed')
    } finally {
      setLoadingPreview(false)
    }
  }

  async function handleThemeChange(newTheme: string) {
    if (!app) return
    setApp({ ...app, theme: newTheme })
    await api.patchApplication(appId, { theme: newTheme })
    refreshPreview(markdown, tab, newTheme)
  }

  // When tab changes, update markdown AND preview together using the new values directly
  useEffect(() => {
    if (!app) return
    const newMd = tab === 'resume' ? app.resume_md || '' : app.cover_md || ''
    setMarkdown(newMd)
    refreshPreview(newMd, tab)
  }, [tab, app])

  function handleMarkdownChange(value: string) {
    setMarkdown(value)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      const field = tab === 'resume' ? 'resume_md' : 'cover_md'
      await api.patchApplication(appId, { [field]: value })
      if (app) setApp({ ...app, [field]: value })
      setSaving(false)
    }, 800)
  }

  if (loadingApp) {
    return (
      <div className="flex h-dvh items-center justify-center text-neutral-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    )
  }

  if (error && !app) {
    return (
      <div className="flex h-dvh items-center justify-center text-red-500 text-sm">
        {error || 'Application not found.'}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh bg-white">

      {/* ── Header ── */}
      <header className="bg-black text-white px-4 sm:px-6 h-14 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/')}
            className="text-neutral-500 hover:text-white transition-colors flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          {app && (
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">
                {app.company} — {app.job_title}
              </p>
              <p className="text-xs text-neutral-500 hidden sm:block">{app.created_at.slice(0, 10)}</p>
            </div>
          )}
          {app && (
            <Badge variant={STATUS_VARIANT[app.status]} className="capitalize hidden sm:inline-flex flex-shrink-0">
              {app.status}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {saving && (
            <span className="text-xs text-neutral-500 hidden sm:flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving
            </span>
          )}
          {/* Theme selector — only shown while viewing resume tab */}
          {tab === 'resume' && app && (
            <Select value={app.theme || 'classic'} onValueChange={handleThemeChange}>
              <SelectTrigger className="h-8 text-xs w-28 bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEMES.map(t => (
                  <SelectItem key={t} value={t} className="capitalize text-xs">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <a href={api.getPdfUrl(appId, 'resume')} download>
            <Button size="sm" variant="outline" className="h-8 text-xs bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white hidden sm:flex">
              <Download className="h-3.5 w-3.5" /> Resume
            </Button>
          </a>
          <a href={api.getPdfUrl(appId, 'coverletter')} download>
            <Button size="sm" variant="outline" className="h-8 text-xs bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white hidden sm:flex">
              <Download className="h-3.5 w-3.5" /> Cover Letter
            </Button>
          </a>
          {/* Mobile download */}
          <a href={api.getPdfUrl(appId, tab === 'resume' ? 'resume' : 'coverletter')} download className="sm:hidden">
            <Button size="sm" variant="outline" className="h-8 text-xs bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white">
              <Download className="h-3.5 w-3.5" /> PDF
            </Button>
          </a>
        </div>
      </header>

      {/* ── Document tabs ── */}
      <div className="flex border-b border-neutral-200 bg-white flex-shrink-0">
        {(['resume', 'coverletter'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-black text-black'
                : 'border-transparent text-neutral-400 hover:text-neutral-700'
            }`}
          >
            {t === 'coverletter' ? 'Cover Letter' : 'Resume'}
          </button>
        ))}
      </div>

      {/* ── Mobile panel toggle ── */}
      <div className="sm:hidden flex border-b border-neutral-200 bg-neutral-50 flex-shrink-0">
        {(['editor', 'preview'] as PanelTab[]).map(p => (
          <button
            key={p}
            onClick={() => { setPanelTab(p); if (p === 'preview') refreshPreview(markdown, tab) }}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
              panelTab === p ? 'text-black bg-white border-b-2 border-black -mb-px' : 'text-neutral-400'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* ── Split view ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Editor panel */}
        <div className={`flex flex-col border-r border-neutral-200 ${
          panelTab === 'editor' ? 'flex-1' : 'hidden'
        } sm:flex sm:flex-1`}>
          <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Markdown</span>
            {saving && <span className="text-xs text-neutral-400 sm:hidden">Saving…</span>}
          </div>
          <textarea
            className="flex-1 resize-none px-4 py-3 text-sm font-mono leading-relaxed bg-white focus:outline-none"
            value={markdown}
            onChange={e => handleMarkdownChange(e.target.value)}
            spellCheck={false}
            placeholder="No content yet."
          />
        </div>

        {/* Preview panel */}
        <div className={`flex flex-col bg-neutral-50 ${
          panelTab === 'preview' ? 'flex-1' : 'hidden'
        } sm:flex sm:flex-1`}>
          <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Preview</span>
            <button
              onClick={() => refreshPreview(markdown, tab)}
              className="text-neutral-400 hover:text-black transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingPreview ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {preview
              ? <iframe srcDoc={preview} className="w-full h-full rounded border border-neutral-200 bg-white" title="Preview" />
              : <div className="flex h-full items-center justify-center text-neutral-400 text-sm">No preview yet</div>
            }
          </div>
        </div>
      </div>
    </div>
  )
}
