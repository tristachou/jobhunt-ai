import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type ResumeTemplate } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Loader2, FilePlus, Edit, Star, Copy, Trash2 } from 'lucide-react'

export default function Resumes() {
  const navigate = useNavigate()

  const [templates, setTemplates] = useState<ResumeTemplate[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [menuOpen, setMenuOpen]   = useState<number | null>(null)
  const [creating, setCreating]   = useState(false)

  useEffect(() => {
    api.getTemplates()
      .then(setTemplates)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleNew() {
    setCreating(true)
    try {
      const { id } = await api.createTemplate({ name: 'New Template', markdown: '' })
      navigate(`/resumes/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create template')
      setCreating(false)
    }
  }

  async function handleSetDefault(id: number) {
    setMenuOpen(null)
    try {
      await api.setDefaultTemplate(id)
      setTemplates(prev => prev.map(t => ({ ...t, is_default: t.id === id ? 1 : 0 })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set default')
    }
  }

  async function handleDuplicate(tpl: ResumeTemplate) {
    setMenuOpen(null)
    try {
      const full = await api.getTemplate(tpl.id)
      const { id } = await api.createTemplate({ name: `${tpl.name} (copy)`, markdown: full.markdown })
      const updated = await api.getTemplates()
      setTemplates(updated)
      navigate(`/resumes/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to duplicate')
    }
  }

  async function handleDelete(id: number) {
    setMenuOpen(null)
    if (!window.confirm('Delete this template? This cannot be undone.')) return
    try {
      await api.deleteTemplate(id)
      setTemplates(prev => prev.filter(t => t.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#4B5563] py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="font-mono text-xs uppercase tracking-wider">[ Loading… ]</span>
      </div>
    )
  }

  return (
    <div className="space-y-8" onClick={() => setMenuOpen(null)}>

      {/* Header */}
      <div className="border-b-2 border-black pb-4 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">Resumes</h1>
          <p className="font-sans text-sm text-[#4B5563] mt-1">
            Manage your resume templates. The default template is used for new applications.
          </p>
        </div>
        <Button onClick={handleNew} disabled={creating} className="gap-2 flex-shrink-0">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus className="h-4 w-4" />}
          New Resume
        </Button>
      </div>

      {error && (
        <div className="border-2 border-red-600 bg-red-100 px-3 py-2 flex items-start gap-2">
          <div className="w-3 h-3 bg-red-600 flex-shrink-0 mt-0.5" />
          <p className="font-mono text-xs text-red-600 uppercase tracking-wider">{error}</p>
        </div>
      )}

      {/* Template list */}
      {templates.length === 0 ? (
        <div className="border-2 border-dashed border-black px-6 py-12 text-center">
          <p className="font-mono text-xs uppercase tracking-wider text-[#4B5563]">
            No templates yet. Click "New Resume" to create one.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(tpl => (
            <div
              key={tpl.id}
              className="bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center px-4 py-3 gap-4"
            >
              {/* Default indicator */}
              <div className="flex-shrink-0 w-5 flex justify-center">
                {tpl.is_default ? (
                  <Star className="h-4 w-4 fill-black text-black" title="Default template" />
                ) : (
                  <Star className="h-4 w-4 text-[#D1D5DB]" />
                )}
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <p className="font-sans font-semibold text-sm truncate">{tpl.name}</p>
                <p className="font-mono text-xs text-[#4B5563]">
                  edited {tpl.updated_at?.slice(0, 10) || '—'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm" variant="outline" className="h-7 text-xs gap-1.5"
                  onClick={() => navigate(`/resumes/${tpl.id}`)}
                >
                  <Edit className="h-3.5 w-3.5" /> Edit
                </Button>

                {/* Dropdown */}
                <div className="relative">
                  <Button
                    size="sm" variant="outline" className="h-7 text-xs px-2"
                    onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === tpl.id ? null : tpl.id) }}
                  >
                    ···
                  </Button>
                  {menuOpen === tpl.id && (
                    <div
                      className="absolute right-0 top-8 z-10 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] min-w-40"
                      onClick={e => e.stopPropagation()}
                    >
                      {!tpl.is_default && (
                        <button
                          className="w-full text-left px-3 py-2 font-mono text-xs uppercase tracking-wider hover:bg-black hover:text-white flex items-center gap-2"
                          onClick={() => handleSetDefault(tpl.id)}
                        >
                          <Star className="h-3.5 w-3.5" /> Set as default
                        </button>
                      )}
                      <button
                        className="w-full text-left px-3 py-2 font-mono text-xs uppercase tracking-wider hover:bg-black hover:text-white flex items-center gap-2"
                        onClick={() => handleDuplicate(tpl)}
                      >
                        <Copy className="h-3.5 w-3.5" /> Duplicate
                      </button>
                      {templates.length > 1 && (
                        <button
                          className="w-full text-left px-3 py-2 font-mono text-xs uppercase tracking-wider hover:bg-red-600 hover:text-white flex items-center gap-2 text-red-600"
                          onClick={() => handleDelete(tpl.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="font-mono text-xs text-[#4B5563]">
        [ ★ = default template used for new applications ]
      </p>
    </div>
  )
}
