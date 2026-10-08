import { openPage } from '@/hooks/use-route'
import type { CanvasMode, ID } from '@/lib/types'
import { useUI } from '@/store/ui'
import { useWorkspace } from '@/store/workspace'

/** Create-and-open helpers shared by the sidebar, home screen and menus. */
export function newNote(parentId: ID | null = null) {
  const id = useWorkspace.getState().createNote({ parentId })
  if (parentId) useUI.getState().toggleExpanded(parentId, true)
  openPage(id)
  return id
}

export function newCanvas(mode: CanvasMode = 'page', parentId: ID | null = null) {
  const id = useWorkspace.getState().createCanvas({ mode, parentId })
  if (parentId) useUI.getState().toggleExpanded(parentId, true)
  openPage(id)
  return id
}

export function closeSidebarOnMobile() {
  if (window.innerWidth < 768) useUI.getState().setSidebarOpen(false)
}
