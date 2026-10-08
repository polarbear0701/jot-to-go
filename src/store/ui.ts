import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { DrawTool, ID } from '@/lib/types'

export type Theme = 'light' | 'dark' | 'system'

export const INK_COLORS = ['ink', '#dc2626', '#ea580c', '#16a34a', '#2563eb', '#9333ea'] as const
export const HIGHLIGHTER_COLORS = ['#fde047', '#a3e635', '#67e8f9', '#f9a8d4', '#fdba74'] as const

interface DrawingPrefs {
  tool: DrawTool
  penColor: string
  penSize: number
  highlighterColor: string
  highlighterSize: number
  eraserSize: number
  /** Palm rejection: only a stylus draws, fingers pan & zoom. */
  stylusOnly: boolean
}

interface UIState {
  theme: Theme
  sidebarOpen: boolean
  expanded: Record<ID, boolean>
  searchOpen: boolean
  drawing: DrawingPrefs
  setTheme: (theme: Theme) => void
  setSidebarOpen: (open: boolean) => void
  toggleExpanded: (id: ID, value?: boolean) => void
  setSearchOpen: (open: boolean) => void
  setDrawing: (patch: Partial<DrawingPrefs>) => void
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      sidebarOpen: typeof window === 'undefined' ? true : window.innerWidth >= 768,
      expanded: {},
      searchOpen: false,
      drawing: {
        tool: 'pen',
        penColor: 'ink',
        penSize: 4,
        highlighterColor: '#fde047',
        highlighterSize: 20,
        eraserSize: 16,
        stylusOnly: false,
      },
      setTheme: (theme) => set({ theme }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleExpanded: (id, value) =>
        set((s) => ({ expanded: { ...s.expanded, [id]: value ?? !s.expanded[id] } })),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setDrawing: (patch) => set((s) => ({ drawing: { ...s.drawing, ...patch } })),
    }),
    {
      name: 'jot-to-go:ui',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ theme, sidebarOpen, expanded, drawing }) => ({ theme, sidebarOpen, expanded, drawing }),
    },
  ),
)
