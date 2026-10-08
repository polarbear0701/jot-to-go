import { useCallback } from 'react'
import { BookOpen, Check, ChevronDown, Infinity as InfinityIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { DrawingSurface } from '@/features/drawing/drawing-surface'
import { FloatingPalette } from '@/features/drawing/floating-palette'
import { PAPER_OPTIONS, PaperSwatch } from '@/features/drawing/paper'
import { useDrawingShortcuts } from '@/features/drawing/use-drawing-shortcuts'
import { useHistory } from '@/hooks/use-history'
import type { CanvasMode, CanvasPage, Stroke } from '@/lib/types'
import { useWorkspace } from '@/store/workspace'
import { PageIconButton } from '@/features/page/page-icon'

export function CanvasEditor({ page }: { page: CanvasPage }) {
  const updateCanvas = useWorkspace((s) => s.updateCanvas)
  const updatePage = useWorkspace((s) => s.updatePage)
  const { canvas } = page

  const write = useCallback((strokes: Stroke[]) => updateCanvas(page.id, { strokes }), [page.id, updateCanvas])
  const history = useHistory(canvas.strokes, write)
  useDrawingShortcuts(history.undo, history.redo)

  const layout =
    canvas.mode === 'page'
      ? ({ kind: 'pages', pageCount: canvas.pageCount, paper: canvas.paper } as const)
      : ({ kind: 'infinite', paper: canvas.paper } as const)

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <DrawingSurface
        className="min-h-0 flex-1"
        strokes={canvas.strokes}
        onCommit={history.commit}
        layout={layout}
        onAddPage={() => updateCanvas(page.id, { pageCount: canvas.pageCount + 1 })}
      />

      {/* Title chip */}
      <div className="pointer-events-none absolute top-3 left-3 hidden max-w-[40%] items-center gap-1 lg:flex">
        <div className="pointer-events-auto flex min-w-0 items-center gap-1 rounded-xl border bg-background/95 py-1 pr-3 pl-1 shadow-sm backdrop-blur">
          <PageIconButton page={page} size="sm" />
          <input
            value={page.title}
            placeholder="Untitled canvas"
            onChange={(e) => updatePage(page.id, { title: e.target.value })}
            className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* Tools: draggable, collapsible palette */}
      <FloatingPalette
        onUndo={history.undo}
        onRedo={history.redo}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onClear={canvas.strokes.length ? () => history.commit([]) : undefined}
      />

      {/* Mode & paper */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 md:top-3 md:right-3 md:bottom-auto md:left-auto">
        <ToggleGroup
          type="single"
          value={canvas.mode}
          onValueChange={(mode) => mode && updateCanvas(page.id, { mode: mode as CanvasMode })}
          className="border shadow-sm"
          aria-label="Canvas mode"
        >
          <ToggleGroupItem value="page" aria-label="Page mode">
            <BookOpen /> Page
          </ToggleGroupItem>
          <ToggleGroupItem value="infinite" aria-label="Infinite mode">
            <InfinityIcon /> Infinite
          </ToggleGroupItem>
        </ToggleGroup>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-background/95 px-2 shadow-sm">
              <PaperSwatch paper={canvas.paper} />
              <span className="hidden sm:inline">{PAPER_OPTIONS.find((p) => p.value === canvas.paper)?.label}</span>
              <ChevronDown className="opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Paper</DropdownMenuLabel>
            {PAPER_OPTIONS.map((p) => (
              <DropdownMenuItem key={p.value} onSelect={() => updateCanvas(page.id, { paper: p.value })}>
                <PaperSwatch paper={p.value} />
                {p.label}
                {canvas.paper === p.value && <Check className="ml-auto" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
