# CLAUDE.md

Jot to Go is a Notion-style note-taking web app that mixes typed notes (a block editor) with
handwriting and drawing (stylus, finger or mouse). **It is frontend only**: all data lives in the
browser (`localStorage`), and a backend will be added later.

## Commands

Bun is the package manager and runtime. Don't use npm/npx, and don't commit a `package-lock.json`.

```bash
bun install
bun run dev       # Vite dev server on http://localhost:5173 (listens on 0.0.0.0 for phone testing)
bun run build     # tsc -b type-check + production build — run this before every commit
bun run lint      # oxlint; existing warnings are known, don't add errors
bun run preview   # serve the production build
```

There is no test suite yet. Verify UI changes by running the app (Playwright + Chromium works in
cloud sessions) and checking both light and dark mode, plus a phone-sized viewport.

## Stack

- React 19 + TypeScript, Vite, Tailwind CSS v4 (CSS-first config in `src/index.css`, no `tailwind.config`)
- shadcn/ui ("new-york" style) on the unified `radix-ui` package, `lucide-react` icons
- zustand (with `persist`) for state
- `perfect-freehand` for pressure-sensitive stroke outlines, rendered as SVG paths
- `nanoid` for ids (`newId()` in `src/lib/id.ts`)

## Layout

```
src/
  App.tsx                 app shell: sidebar + topbar + routed content, global shortcuts
  components/ui/          shadcn/ui components (owned source, edit freely)
  features/
    canvas/               full-page canvas editor (Page / Infinite mode, paper picker)
    drawing/              drawing engine + pen tooling
      drawing-surface.tsx   pointer input, pan/zoom, pinch, eraser, SVG rendering
      geometry.ts           page sizes, viewport math, stroke outline, hit-testing
      drawing-toolbar.tsx   tools, inline colors, Pencilcase slots, undo/redo
      floating-palette.tsx  draggable / collapsible toolbar wrapper (canvas pages)
      pen-settings.tsx      per-tool settings popover (tap the active tool again)
      color-picker.tsx, colors.ts, pencilcase.tsx, pen-preview.tsx, paper.tsx
    editor/               block editor (notes): blocks, slash menu, caret utils, sketch block
    home/ search/ shell/ sidebar/ page/   app chrome and page helpers
  hooks/                  use-route (hash router), use-theme, use-history (undo/redo)
  lib/types.ts            domain model — the shape of all persisted data
  store/
    workspace.ts          pages: CRUD, trash, favorites (persist key `jot-to-go:workspace`)
    ui.ts                 theme, sidebar, drawing prefs, Pencilcase (persist key `jot-to-go:ui`)
    seed.ts               demo pages for first run
```

## Conventions

- **Imports:** use the `@/` alias for `src/`. Feature code lives under `src/features/<feature>/`.
- **shadcn/ui:** `components.json` is configured. Prefer `bunx --bun shadcn@latest add <name>`. If the
  registry isn't reachable (the cloud sandbox blocks ui.shadcn.com), hand-write the component in the
  standard shadcn style. Import Radix primitives from `radix-ui`, e.g.
  `import { Popover as PopoverPrimitive } from 'radix-ui'`, and merge classes with `cn()` from `@/lib/utils`.
- **Styling:** use theme tokens (`bg-background`, `text-muted-foreground`, `bg-paper`, `bg-canvas`,
  `stroke-paper-line`, …) defined in `src/index.css` for both `:root` and `.dark`. Avoid hard-coded
  greys so dark mode keeps working.
- **State:** components change data only through store actions. Read with selectors
  (`useWorkspace((s) => s.pages)`); in event handlers outside React use `useStore.getState()`.
- **Persisted shapes:** changing a persisted shape in `lib/types.ts` or `store/ui.ts` means bumping
  the store's `version` and adding a `migrate` step (see `store/ui.ts` v1 → v2). Never break
  existing users' saved data silently.
- **Data must stay plain JSON** (no class instances, Dates, Maps) so it can go to a backend later.

## Domain notes

- **Pages** are a discriminated union on `kind`: `'note'` (has `blocks`) or `'canvas'` (has `canvas`).
  Pages nest via `parentId`. Deleting moves a page and its children to trash (`trashedAt`).
- **Strokes** store points as `[x, y, pressure]` in world coordinates, plus the pen settings they
  were drawn with (`color`, `size`, `opacity`, `thinning`, `streamline`), so they always render the
  same way. Older strokes may lack the optional fields; `geometry.ts` supplies the defaults.
- **Color `'ink'`** is a special token: black in light mode, white in dark mode (`resolveColor`).
- **Canvas modes:** `page` = A4 sheets (`PAGE_WIDTH` × `PAGE_HEIGHT`, stacked with `PAGE_GAP`) with
  strokes clipped to the sheets; `infinite` = boundless board. Both share the same strokes.
- **Input:** pointer events with `getCoalescedEvents`. With `stylusOnly`, only `pointerType === 'pen'`
  draws and touch pans/zooms. Sketch blocks in notes are fixed-size surfaces with no pan/zoom.
- **Note editor:** each text block is an uncontrolled `contentEditable="plaintext-only"` element
  (`EditableText`); the DOM is only rewritten when the value changes from outside, which keeps
  the caret and native undo intact. Keep a block's `EditableText` at a stable position in the tree
  so changing the block type doesn't remount it.
- **Routing:** hash based — `#/` is home, `#/p/<pageId>` opens a page.

## Backend later

Components only talk to store actions, so a backend can come in by swapping the `persist` storage
for an API adapter, or by turning actions into API calls with optimistic updates. Large binary
data (e.g. imported PDFs) should go in IndexedDB rather than `localStorage`, which has a limit of
about 5 MB.
