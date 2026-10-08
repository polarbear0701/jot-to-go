import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { newId } from '@/lib/id'
import type { Block, CanvasContent, CanvasMode, CanvasPage, ID, NotePage, Page } from '@/lib/types'
import { createSeedPages } from './seed'

/**
 * Workspace store – the single source of truth for pages.
 *
 * It persists to localStorage for now. When the backend exists, swap the
 * `storage` option below for an API-backed adapter (or replace the actions
 * with API calls + optimistic updates); components only talk to these actions.
 */
type PagePatch = Partial<Omit<NotePage, 'id' | 'kind' | 'blocks'>>

interface WorkspaceState {
  pages: Record<ID, Page>
  createNote: (opts?: { parentId?: ID | null }) => ID
  createCanvas: (opts?: { parentId?: ID | null; mode?: CanvasMode }) => ID
  updatePage: (id: ID, patch: PagePatch) => void
  setBlocks: (id: ID, blocks: Block[]) => void
  updateCanvas: (id: ID, patch: Partial<CanvasContent>) => void
  duplicatePage: (id: ID) => ID | null
  trashPage: (id: ID) => void
  restorePage: (id: ID) => void
  deletePage: (id: ID) => void
  toggleFavorite: (id: ID) => void
}

const descendants = (pages: Record<ID, Page>, id: ID): ID[] => {
  const out: ID[] = []
  const walk = (pid: ID) => {
    for (const p of Object.values(pages)) {
      if (p.parentId === pid) {
        out.push(p.id)
        walk(p.id)
      }
    }
  }
  walk(id)
  return out
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      pages: createSeedPages(),

      createNote: (opts = {}) => {
        const id = newId()
        const now = Date.now()
        const page: NotePage = {
          id,
          kind: 'note',
          parentId: opts.parentId ?? null,
          title: '',
          icon: null,
          cover: null,
          favorite: false,
          trashedAt: null,
          fullWidth: false,
          createdAt: now,
          updatedAt: now,
          blocks: [{ id: newId(), type: 'paragraph', text: '' }],
        }
        set((s) => ({ pages: { ...s.pages, [id]: page } }))
        return id
      },

      createCanvas: (opts = {}) => {
        const id = newId()
        const now = Date.now()
        const page: CanvasPage = {
          id,
          kind: 'canvas',
          parentId: opts.parentId ?? null,
          title: '',
          icon: null,
          cover: null,
          favorite: false,
          trashedAt: null,
          createdAt: now,
          updatedAt: now,
          canvas: {
            mode: opts.mode ?? 'page',
            paper: opts.mode === 'infinite' ? 'dotted' : 'blank',
            pageCount: 1,
            strokes: [],
          },
        }
        set((s) => ({ pages: { ...s.pages, [id]: page } }))
        return id
      },

      updatePage: (id, patch) =>
        set((s) => {
          const page = s.pages[id]
          if (!page) return s
          return { pages: { ...s.pages, [id]: { ...page, ...patch, updatedAt: Date.now() } as Page } }
        }),

      setBlocks: (id, blocks) =>
        set((s) => {
          const page = s.pages[id]
          if (!page || page.kind !== 'note') return s
          return { pages: { ...s.pages, [id]: { ...page, blocks, updatedAt: Date.now() } } }
        }),

      updateCanvas: (id, patch) =>
        set((s) => {
          const page = s.pages[id]
          if (!page || page.kind !== 'canvas') return s
          return {
            pages: {
              ...s.pages,
              [id]: { ...page, canvas: { ...page.canvas, ...patch }, updatedAt: Date.now() },
            },
          }
        }),

      duplicatePage: (id) => {
        const page = get().pages[id]
        if (!page) return null
        const copyId = newId()
        const now = Date.now()
        const copy = structuredClone(page)
        copy.id = copyId
        copy.title = `${page.title || 'Untitled'} (copy)`
        copy.favorite = false
        copy.createdAt = now
        copy.updatedAt = now
        set((s) => ({ pages: { ...s.pages, [copyId]: copy } }))
        return copyId
      },

      trashPage: (id) =>
        set((s) => {
          const now = Date.now()
          const pages = { ...s.pages }
          for (const pid of [id, ...descendants(pages, id)]) {
            pages[pid] = { ...pages[pid], trashedAt: now }
          }
          return { pages }
        }),

      restorePage: (id) =>
        set((s) => {
          const pages = { ...s.pages }
          const page = pages[id]
          if (!page) return s
          // If the parent is still trashed, restore to the top level.
          const parent = page.parentId ? pages[page.parentId] : null
          const parentId = parent && !parent.trashedAt ? page.parentId : null
          pages[id] = { ...page, parentId, trashedAt: null }
          for (const pid of descendants(pages, id)) pages[pid] = { ...pages[pid], trashedAt: null }
          return { pages }
        }),

      deletePage: (id) =>
        set((s) => {
          const pages = { ...s.pages }
          for (const pid of [id, ...descendants(pages, id)]) delete pages[pid]
          return { pages }
        }),

      toggleFavorite: (id) =>
        set((s) => {
          const page = s.pages[id]
          if (!page) return s
          return { pages: { ...s.pages, [id]: { ...page, favorite: !page.favorite } } }
        }),
    }),
    {
      name: 'jot-to-go:workspace',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

// ---------------------------------------------------------------------------
// Selectors / helpers
// ---------------------------------------------------------------------------

export const byCreated = (a: Page, b: Page) => a.createdAt - b.createdAt

export function childrenOf(pages: Record<ID, Page>, parentId: ID | null) {
  return Object.values(pages)
    .filter((p) => p.parentId === parentId && !p.trashedAt)
    .sort(byCreated)
}

export function breadcrumbsOf(pages: Record<ID, Page>, id: ID) {
  const trail: Page[] = []
  let cur: Page | undefined = pages[id]
  while (cur) {
    trail.unshift(cur)
    cur = cur.parentId ? pages[cur.parentId] : undefined
  }
  return trail
}

export const pageTitle = (page: Pick<Page, 'title'>) => page.title.trim() || 'Untitled'

export function pagePlainText(page: Page) {
  if (page.kind !== 'note') return ''
  return page.blocks
    .map((b) => ('text' in b ? b.text : ''))
    .filter(Boolean)
    .join(' ')
}
