import { useEffect } from 'react'

import { useUI } from '@/store/ui'

function isEditable(el: EventTarget | null) {
  return el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
}

/** Global shortcuts for a full-screen drawing surface. */
export function useDrawingShortcuts(undo: () => void, redo: () => void) {
  const setDrawing = useUI((s) => s.setDrawing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
        return
      }
      if (mod || e.altKey) return
      const tool = { p: 'pen', h: 'highlighter', e: 'eraser' }[e.key.toLowerCase()] as
        | 'pen'
        | 'highlighter'
        | 'eraser'
        | undefined
      if (tool) setDrawing({ tool })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, setDrawing])
}
