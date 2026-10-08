import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, GripHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DrawingSurface } from '@/features/drawing/drawing-surface'
import { DrawingToolbar } from '@/features/drawing/drawing-toolbar'
import { PAPER_OPTIONS, PaperSwatch } from '@/features/drawing/paper'
import { useHistory } from '@/hooks/use-history'
import type { SketchBlock, Stroke } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SketchBlockViewProps {
  block: SketchBlock
  onChange: (block: SketchBlock) => void
}

const MIN_HEIGHT = 120
const MAX_HEIGHT = 1600

export function SketchBlockView({ block, onChange }: SketchBlockViewProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const blockRef = useRef(block)
  blockRef.current = block

  const write = useCallback((strokes: Stroke[]) => onChange({ ...blockRef.current, strokes }), [onChange])
  const history = useHistory(block.strokes, write)

  // Show the toolbar while the sketch is "selected"; deselect on outside press.
  useEffect(() => {
    if (!active) return
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      if (ref.current?.contains(target) || target.closest('[data-radix-popper-content-wrapper]')) return
      setActive(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [active])

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startY = e.clientY
    const startH = block.height
    const move = (ev: PointerEvent) => {
      const height = Math.round(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startH + ev.clientY - startY)))
      onChange({ ...blockRef.current, height })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div ref={ref} className="group/sketch relative my-2 w-full" onPointerDownCapture={() => setActive(true)}>
      <div
        className={cn(
          'absolute -top-12 left-0 z-10 flex items-center gap-2 transition-opacity',
          active ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <DrawingToolbar
          compact
          showHand={false}
          onUndo={history.undo}
          onRedo={history.redo}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onClear={block.strokes.length ? () => history.commit([]) : undefined}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Paper style">
                <PaperSwatch paper={block.paper} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {PAPER_OPTIONS.map((p) => (
                <DropdownMenuItem key={p.value} onSelect={() => onChange({ ...block, paper: p.value })}>
                  <PaperSwatch paper={p.value} />
                  {p.label}
                  {block.paper === p.value && <Check className="ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </DrawingToolbar>
      </div>

      <DrawingSurface
        className={cn(
          'rounded-lg border transition-shadow',
          active ? 'ring-2 ring-ring/40' : 'group-hover/sketch:border-foreground/20',
        )}
        strokes={block.strokes}
        onCommit={history.commit}
        layout={{ kind: 'embed', height: block.height, paper: block.paper }}
      />

      {!active && block.strokes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground/70">
          Draw here with a pen, finger or mouse
        </div>
      )}

      <div
        className="absolute inset-x-0 -bottom-2 flex h-4 cursor-ns-resize items-center justify-center opacity-0 transition-opacity group-hover/sketch:opacity-100"
        onPointerDown={startResize}
        style={{ touchAction: 'none' }}
        aria-label="Resize sketch"
      >
        <span className="flex h-3 items-center rounded-full border bg-background px-2 shadow-sm">
          <GripHorizontal className="size-3 text-muted-foreground" />
        </span>
      </div>
    </div>
  )
}
