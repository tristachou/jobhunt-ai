import { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import NewApplication from './pages/NewApplication'
import History from './pages/History'
import Settings from './pages/Settings'
import Editor from './pages/Editor'
import Style from './pages/Style'
import { Menu, X } from 'lucide-react'

// ─── Nav links config ──────────────────────────────────────────────────────────

const NAV = [
  { to: '/',         label: 'New Application', end: true },
  { to: '/history',  label: 'History' },
  { to: '/style',    label: 'Style' },
  { to: '/settings', label: 'Settings' },
]

// ─── Header ────────────────────────────────────────────────────────────────────

function Header() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors ${isActive ? 'text-white' : 'text-neutral-400 hover:text-white'}`

  function handleNavClick(to: string) {
    setOpen(false)
    navigate(to)
  }

  return (
    <header className="bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <span className="font-semibold text-sm tracking-tight">Job Apply Bot</span>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-7">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden text-neutral-400 hover:text-white transition-colors p-1"
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="sm:hidden border-t border-neutral-800 px-4 py-3 flex flex-col gap-1">
          {NAV.map(n => (
            <button
              key={n.to}
              onClick={() => handleNavClick(n.to)}
              className="text-left text-sm text-neutral-300 hover:text-white py-2 transition-colors"
            >
              {n.label}
            </button>
          ))}
        </div>
      )}
    </header>
  )
}

// ─── Layout ────────────────────────────────────────────────────────────────────

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}

// ─── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Full-screen pages — no layout wrapper */}
        <Route path="/editor/:id" element={<Editor />} />
        <Route path="/style" element={<Style />} />
        <Route path="*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<NewApplication />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  )
}
