import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Loader2, Check, RefreshCw, ArrowLeft } from 'lucide-react'

// ─── Scaled iframe preview ─────────────────────────────────────────────────────
// The resume HTML is rendered at A4 width (~816px). This component measures
// the container and applies a CSS transform to scale the iframe to fit,
// so the user never needs to scroll horizontally.

const A4_W = 816   // px — approximate A4 width at 96 dpi

function ScaledPreview({ html, loading }: { html: string; loading: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef    = useRef<HTMLIFrameElement>(null)
  const [scale, setScale]       = useState(1)
  const [iframeH, setIframeH]   = useState(1155)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth - 32 // subtract horizontal padding
      setScale(Math.min(1, w / A4_W))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  function handleIframeLoad() {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    // Measure the actual rendered content height so multi-page resumes scroll correctly
    const h = doc.documentElement.scrollHeight || doc.body.scrollHeight
    if (h > 0) setIframeH(h)
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden bg-neutral-100 p-4"
    >
      {loading && (
        <div className="flex justify-center py-6 text-neutral-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      {!loading && html && (
        // Outer div height = scaled iframe height so the scrollbar is sized correctly
        <div style={{ height: Math.ceil(iframeH * scale) }}>
          <iframe
            ref={iframeRef}
            srcDoc={html}
            title="Style Preview"
            onLoad={handleIframeLoad}
            className="bg-white shadow-sm rounded border border-neutral-200 origin-top-left"
            style={{
              width:            A4_W,
              height:           iframeH,
              transform:        `scale(${scale})`,
              transformOrigin:  'top left',
              pointerEvents:    'none',
            }}
          />
        </div>
      )}
      {!loading && !html && (
        <div className="flex h-full items-center justify-center text-neutral-400 text-sm">
          No preview yet
        </div>
      )}
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────

type PanelTab = 'editor' | 'preview'

export default function Style() {
  const navigate = useNavigate()

  const [templates, setTemplates]     = useState<{ name: string; label: string; css: string }[]>([])
  const [css, setCss]                 = useState('')
  const [activeName, setActiveName]   = useState<string | null>(null)
  const [preview, setPreview]         = useState('')
  const [loadingInit, setLoadingInit] = useState(true)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [panelTab, setPanelTab]       = useState<PanelTab>('editor')
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadPreview = useCallback(async (cssStr: string) => {
    setLoadingPreview(true)
    try {
      const { html } = await api.previewStyle(cssStr)
      setPreview(html)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview failed')
    } finally {
      setLoadingPreview(false)
    }
  }, [])

  useEffect(() => {
    Promise.all([api.getStyle(), api.getThemes()])
      .then(([styleData, templateList]) => {
        setCss(styleData.css)
        setTemplates(templateList)
        const match = templateList.find(t => t.css.trim() === styleData.css.trim())
        setActiveName(match?.name ?? null)
        loadPreview(styleData.css)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingInit(false))
  }, [])

  function handleCssChange(value: string) {
    setCss(value)
    setActiveName(null)
    if (previewTimer.current) clearTimeout(previewTimer.current)
    previewTimer.current = setTimeout(() => loadPreview(value), 1000)
  }

  function handleSelectTemplate(t: { name: string; css: string }) {
    setCss(t.css)
    setActiveName(t.name)
    loadPreview(t.css)
  }

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false)
    try {
      await api.saveStyle(css, activeName ?? undefined)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loadingInit) {
    return (
      <div className="flex h-dvh items-center justify-center text-neutral-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh bg-white">

      {/* ── Header ── */}
      <header className="bg-black text-white px-4 sm:px-6 h-14 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-neutral-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Template selector */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-neutral-500 mr-1 hidden sm:inline">Template</span>
            {templates.map(t => (
              <button
                key={t.name}
                onClick={() => handleSelectTemplate(t)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  activeName === t.name
                    ? 'bg-white text-black'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {t.label}
              </button>
            ))}
            {activeName === null && css && (
              <span className="text-xs text-neutral-500 italic ml-1">Custom</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-400 hidden sm:inline">{error}</span>}
          {saved && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={saving}
            className="h-8 text-xs bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save
          </Button>
        </div>
      </header>

      {/* ── Mobile panel toggle ── */}
      <div className="sm:hidden flex border-b border-neutral-200 bg-neutral-50 flex-shrink-0">
        {(['editor', 'preview'] as PanelTab[]).map(p => (
          <button
            key={p}
            onClick={() => { setPanelTab(p); if (p === 'preview') loadPreview(css) }}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
              panelTab === p
                ? 'bg-white text-black border-b-2 border-black -mb-px'
                : 'text-neutral-400'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* ── Split view ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* CSS editor */}
        <div className={`flex flex-col border-r border-neutral-200 ${
          panelTab === 'preview' ? 'hidden' : 'flex-1'
        } sm:flex sm:flex-1`}>
          <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-50 flex-shrink-0">
            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">CSS</span>
          </div>
          <textarea
            className="flex-1 resize-none px-4 py-3 text-xs font-mono leading-relaxed bg-white focus:outline-none"
            spellCheck={false}
            value={css}
            onChange={e => handleCssChange(e.target.value)}
          />
        </div>

        {/* Scaled preview */}
        <div className={`flex flex-col ${
          panelTab === 'editor' ? 'hidden' : 'flex-1'
        } sm:flex sm:flex-1`}>
          <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Preview</span>
            <button
              onClick={() => loadPreview(css)}
              className="text-neutral-400 hover:text-black transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingPreview ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <ScaledPreview html={preview} loading={loadingPreview} />
        </div>
      </div>
    </div>
  )
}
