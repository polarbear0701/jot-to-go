# Jot to Go

A Notion-style note-taking web app that mixes **typed notes** with **handwriting & drawing**
(stylus, finger or mouse). Frontend only for now — data is stored in `localStorage` until a backend exists.

Built with React 19, TypeScript, Vite, Tailwind CSS v4 and shadcn/ui (Radix primitives).
Uses [Bun](https://bun.sh) (1.4+) as the package manager and runtime.

```bash
bun install
bun run dev      # http://localhost:5173
bun run build    # type-check + production build
bun run preview  # serve the production build
bun run lint     # oxlint
```

## Features

**Notes (block editor)**
- Blocks: text, headings 1–3, bulleted / numbered / to-do lists, quote, callout, code, divider and **sketch**.
- `/` slash menu, Markdown shortcuts (`# `, `## `, `- `, `1. `, `[] `, `> `, ```` ``` ````, `---`).
- Enter / Backspace / Delete / arrow keys behave like Notion (split, merge, move between blocks).
- Block handle (⋮⋮): turn into, duplicate, move, delete. Page icon (emoji), gradient cover, full-width mode.

**Markdown**
- Notes are Markdown underneath. Inline `**bold**`, `*italic*`, `` `code` ``, `~~strike~~` and links render
  in place and show their source while you edit that block. ⌘B / ⌘I / ⌘E / ⌘⇧S / ⌘K format a selection.
- **Markdown view** (top bar): see and edit the whole note as Markdown; changes sync back to the blocks.
- **Export** a note as a `.md` file or copy it as Markdown (••• menu). Sketches are kept: an HTML comment
  carries the strokes for re-import and an embedded SVG image shows the drawing in other apps.
- **Import** `.md` files from *New page → Import Markdown…* or by dropping them anywhere on the app.
  Pasting multi-line Markdown into a note turns it into blocks.

**Drawing**
- Pressure-sensitive ink via [`perfect-freehand`](https://github.com/steveruizok/perfect-freehand), with coalesced pointer events for smooth strokes.
- Tools: pen, highlighter (sits under the ink), stroke eraser (also the stylus eraser button), hand, undo/redo.
- **Tap the selected tool again** for its settings: thickness, opacity, pressure sensitivity and smoothing (with a live preview).
- 50-color palette plus a custom color picker / hex input.
- **Pencilcase**: save up to 3 pen setups and 5 favourite colors; they sit right in the toolbar.
- On canvas pages the tool palette can be **dragged anywhere** and **collapsed** into a small round button.
- **Page mode** – A4 sheets stacked vertically with blank / lined / grid / dotted paper, "Add page".
- **Infinite mode** – boundless board (like Freeform) with pan & zoom. Switch modes at any time; strokes are kept.
- **Stylus only** (palm rejection): the pen draws, fingers pan / pinch-zoom (or scroll the note for inline sketches).
- Inline **sketch blocks** inside notes, resizable by dragging their bottom edge.

**Workspace**
- Sidebar with nested pages, favorites, trash (restore / delete forever), light / dark / system theme.
- Home with quick-create cards and live thumbnails, ⌘K search & command palette, ⌘\ toggles the sidebar.

### Shortcuts

| Where | Keys |
| --- | --- |
| Anywhere | `⌘K` search · `⌘\` sidebar |
| Canvas | `P` pen · `H` highlighter · `E` eraser · hold `Space` to pan · `⌘Z` / `⇧⌘Z` undo / redo · `⌘`/`Ctrl` + scroll or pinch to zoom |
| Notes | `/` commands · `⇧Enter` soft line break (exits code blocks) · `⌘B` `⌘I` `⌘E` `⌘⇧S` `⌘K` inline formatting |

## Project layout

```
src/
  components/ui/       shadcn/ui components (button, dropdown-menu, popover, dialog, …)
  features/
    canvas/            full-page canvas editor (page / infinite mode, paper picker)
    drawing/           drawing engine: surface, toolbar, geometry & hit-testing, paper patterns
    editor/            block editor: blocks, slash menu, caret utils, sketch block
    home/ search/ shell/ sidebar/ page/   app chrome
  hooks/               router (hash based), theme, undo/redo history
  lib/types.ts         domain model (pages, blocks, strokes) – plain JSON
  store/               zustand stores: workspace (pages) + ui preferences, seed data
```

## Plugging in a backend later

- All data shapes live in `src/lib/types.ts` and are plain JSON, ready to be sent over an API.
- Components only talk to the actions in `src/store/workspace.ts`. Swap the `persist` storage for an
  API-backed adapter, or turn the actions into API calls with optimistic updates.
- Strokes are stored as `[x, y, pressure]` points in world coordinates, so they're resolution independent
  and render the same on any device.
- `components.json` is configured, so `bunx --bun shadcn@latest add <component>` works for adding more UI.
