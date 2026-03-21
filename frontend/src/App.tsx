import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SidebarLayout } from './components/AppSidebar'
import NewApplication from './pages/NewApplication'
import History from './pages/History'
import Settings from './pages/Settings'
import Editor from './pages/Editor'
import Style from './pages/Style'

// ─── Layout — adds scroll + padding for regular pages ──────────────────────────

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarLayout>
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </SidebarLayout>
  )
}

// ─── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Full-screen editor — no sidebar */}
        <Route path="/editor/:id" element={<Editor />} />

        {/* Style — has its own SidebarLayout inside */}
        <Route path="/style" element={<Style />} />

        {/* Sidebar layout pages */}
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
