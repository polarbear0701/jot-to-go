import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { newId } from '@/lib/id'
import type { DrawTool, ID } from '@/lib/types'

export type Theme = 'light' | 'dark' | 'system'

/** Brush settings for a drawing tool. Saved on each stroke so it renders the same later. */
export interface PenConfig {
  color: string
  size: number
  /** 0..1 */
  opacity: number
  /** How much pressure / speed changes the width, 0..1. */
  thinning: number
  /** How much the line is smoothed while drawing, 0..1. */
  streamline: number
}

export type InkTool = 'pen' | 'highlighter'

export interface PencilcasePen extends PenConfig {
  id: string
  tool: InkTool
}

export const PENCILCASE_MAX_PENS = 3
export const PENCILCASE_MAX_COLORS = 5

export const DEFAULT_PEN: PenConfig = { color: 'ink', size: 4, opacity: 1, thinning: 0.6, streamline: 0.45 }
export const DEFAULT_HIGHLIGHTER: PenConfig = { color: '#fde047', size: 20, opacity: 0.4, thinning: 0, streamline: 0.5 }

interface DrawingPrefs {
  tool: DrawTool
  pen: PenConfig
  highlighter: PenConfig
  eraserSize: number
  /** Palm rejection: only a stylus draws, fingers pan & zoom. */
  stylusOnly: boolean
  /** Saved favourites: up to 3 pens and 5 colors. */
  pencilcase: { pens: PencilcasePen[]; colors: string[] }
  /** Floating tool palette on canvas pages. `pos` is null until the user drags it. */
  palette: { collapsed: boolean; pos: { x: number; y: number } | null }
}

const DEFAULT_DRAWING: DrawingPrefs = {
  tool: 'pen',
  pen: DEFAULT_PEN,
  highlighter: DEFAULT_HIGHLIGHTER,
  eraserSize: 16,
  stylusOnly: false,
  pencilcase: {
    pens: [
      { id: 'default-fine', tool: 'pen', color: 'ink', size: 3, opacity: 1, thinning: 0.6, streamline: 0.45 },
      { id: 'default-marker', tool: 'pen', color: '#dc2626', size: 8, opacity: 1, thinning: 0.2, streamline: 0.5 },
    ],
    colors: ['ink', '#dc2626', '#2563eb', '#16a34a', '#ca8a04'],
  },
  palette: { collapsed: false, pos: null },
}

const samePen = (a: PencilcasePen, tool: InkTool, c: PenConfig) =>
  a.tool === tool &&
  a.color === c.color &&
  a.size === c.size &&
  a.opacity === c.opacity &&
  a.thinning === c.thinning &&
  a.streamline === c.streamline

/** The Pencilcase entry matching the current tool settings, if any. */
export function activePencilcasePen(d: DrawingPrefs) {
  if (d.tool !== 'pen' && d.tool !== 'highlighter') return undefined
  const cfg = d[d.tool]
  return d.pencilcase.pens.find((p) => samePen(p, d.tool as InkTool, cfg))
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
  setPenConfig: (tool: InkTool, patch: Partial<PenConfig>) => void
  /** Sets the color of the active ink tool, switching to the pen if needed. */
  setInkColor: (color: string) => void
  /** Saves the active pen into the Pencilcase. With `replaceId`, overwrites that slot. */
  savePen: (replaceId?: string) => void
  removePen: (id: string) => void
  applyPen: (id: string) => void
  toggleFavoriteColor: (color: string) => void
  setPalette: (patch: Partial<DrawingPrefs['palette']>) => void
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      sidebarOpen: typeof window === 'undefined' ? true : window.innerWidth >= 768,
      expanded: {},
      searchOpen: false,
      drawing: DEFAULT_DRAWING,
      setTheme: (theme) => set({ theme }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleExpanded: (id, value) =>
        set((s) => ({ expanded: { ...s.expanded, [id]: value ?? !s.expanded[id] } })),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setDrawing: (patch) => set((s) => ({ drawing: { ...s.drawing, ...patch } })),
      setPenConfig: (tool, patch) =>
        set((s) => ({ drawing: { ...s.drawing, [tool]: { ...s.drawing[tool], ...patch } } })),
      setInkColor: (color) =>
        set((s) => {
          const tool: InkTool = s.drawing.tool === 'highlighter' ? 'highlighter' : 'pen'
          return { drawing: { ...s.drawing, tool, [tool]: { ...s.drawing[tool], color } } }
        }),
      savePen: (replaceId) =>
        set((s) => {
          const d = s.drawing
          if (d.tool !== 'pen' && d.tool !== 'highlighter') return s
          const pen: PencilcasePen = { ...d[d.tool], tool: d.tool, id: newId() }
          let pens = d.pencilcase.pens
          if (replaceId) pens = pens.map((p) => (p.id === replaceId ? pen : p))
          else if (pens.length < PENCILCASE_MAX_PENS) pens = [...pens, pen]
          else return s
          return { drawing: { ...d, pencilcase: { ...d.pencilcase, pens } } }
        }),
      removePen: (id) =>
        set((s) => ({
          drawing: {
            ...s.drawing,
            pencilcase: { ...s.drawing.pencilcase, pens: s.drawing.pencilcase.pens.filter((p) => p.id !== id) },
          },
        })),
      applyPen: (id) =>
        set((s) => {
          const pen = s.drawing.pencilcase.pens.find((p) => p.id === id)
          if (!pen) return s
          const { id: _id, tool, ...config } = pen
          return { drawing: { ...s.drawing, tool, [tool]: config } }
        }),
      toggleFavoriteColor: (color) =>
        set((s) => {
          const colors = s.drawing.pencilcase.colors
          const next = colors.includes(color)
            ? colors.filter((c) => c !== color)
            : colors.length < PENCILCASE_MAX_COLORS
              ? [...colors, color]
              : colors
          return { drawing: { ...s.drawing, pencilcase: { ...s.drawing.pencilcase, colors: next } } }
        }),
      setPalette: (patch) =>
        set((s) => ({ drawing: { ...s.drawing, palette: { ...s.drawing.palette, ...patch } } })),
    }),
    {
      name: 'jot-to-go:ui',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // v1 stored flat pen settings; keep the user's palm-rejection choice and reset the rest.
      migrate: (persisted, version) => {
        const state = persisted as Partial<UIState> & { drawing?: { stylusOnly?: boolean } }
        if (version < 2) {
          state.drawing = { ...DEFAULT_DRAWING, stylusOnly: !!state.drawing?.stylusOnly }
        }
        return state as UIState
      },
      partialize: ({ theme, sidebarOpen, expanded, drawing }) => ({ theme, sidebarOpen, expanded, drawing }),
    },
  ),
)
