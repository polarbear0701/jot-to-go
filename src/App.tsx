import { useEffect } from 'react'
import { FileQuestion, Undo2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CanvasEditor } from '@/features/canvas/canvas-editor'
import { NoteEditor } from '@/features/editor/note-editor'
import { HomeView } from '@/features/home/home-view'
import { SearchDialog } from '@/features/search/search-dialog'
import { Topbar } from '@/features/shell/topbar'
import { Sidebar } from '@/features/sidebar/sidebar'
import { navigate, useRoute } from '@/hooks/use-route'
import { useApplyTheme } from '@/hooks/use-theme'
import { useUI } from '@/store/ui'
import { pageTitle, useWorkspace } from '@/store/workspace'

function useGlobalShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        useUI.getState().setSearchOpen(true)
      } else if (mod && e.key === '\\') {
        e.preventDefault()
        const ui = useUI.getState()
        ui.setSidebarOpen(!ui.sidebarOpen)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export default function App() {
  useApplyTheme()
  useGlobalShortcuts()
  const route = useRoute()
  const page = useWorkspace((s) => (route.name === 'page' ? s.pages[route.id] : undefined))
  const restorePage = useWorkspace((s) => s.restorePage)

  useEffect(() => {
    document.title = page ? `${page.icon ? `${page.icon} ` : ''}${pageTitle(page)} · Jot to Go` : 'Jot to Go'
  }, [page])

  let content: React.ReactNode
  if (route.name === 'home') {
    content = (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <HomeView />
      </div>
    )
  } else if (!page || page.trashedAt) {
    content = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <FileQuestion className="size-10 text-muted-foreground" strokeWidth={1.5} />
        <div>
          <p className="font-medium">{page ? 'This page is in the trash' : 'Page not found'}</p>
          <p className="text-sm text-muted-foreground">
            {page ? 'Restore it to keep working on it.' : 'It may have been deleted.'}
          </p>
        </div>
        <div className="flex gap-2">
          {page && (
            <Button size="sm" onClick={() => restorePage(page.id)}>
              <Undo2 /> Restore
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => navigate({ name: 'home' })}>
            Go home
          </Button>
        </div>
      </div>
    )
  } else if (page.kind === 'note') {
    content = (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <NoteEditor key={page.id} page={page} />
      </div>
    )
  } else {
    content = <CanvasEditor key={page.id} page={page} />
  }

  return (
    <TooltipProvider>
      <div className="flex h-full overflow-hidden">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <Topbar page={page && !page.trashedAt ? page : undefined} title={route.name === 'home' ? 'Home' : undefined} />
          {content}
        </main>
      </div>
      <SearchDialog />
    </TooltipProvider>
  )
}
