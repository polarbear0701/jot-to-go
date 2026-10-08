import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { GripVertical } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useUI } from '@/store/ui'
import { DrawingToolbar, TOOLS } from './drawing-toolbar'
import { resolveColor } from './geometry'

type ToolbarProps = Omit<React.ComponentProps<typeof DrawingToolbar>, 'leading' | 'onCollapse' | 'compact'>

const MARGIN = 8
/** Below the title chip / mode switch on wide screens; those move elsewhere on phones. */
const defaultTop = (width: number) => (width >= 768 ? 64 : 12)
/** Movement (px) before a press counts as a drag instead of a tap. */
const DRAG_THRESHOLD = 4

/**
 * The canvas tool palette. It can be dragged anywhere inside its container and
 * collapsed into a small round button (like the Apple Notes tool picker).
 * Position and collapsed state are remembered.
 */
export function FloatingPalette(props: ToolbarProps) {
  const palette = useUI((s) => s.drawing.palette)
  const setPalette = useUI((s) => s.setPalette)
  const ref = useRef<HTMLDivElement>(null)
  const [bounds, setBounds] = useState({ w: 0, h: 0 })
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent) return
    const ro = new ResizeObserver(() => {
      setBounds({ w: parent.clientWidth, h: parent.clientHeight })
      setSize({ w: el.offsetWidth, h: el.offsetHeight })
    })
    ro.observe(parent)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const clamp = (p: { x: number; y: number }) => ({
    x: Math.max(MARGIN, Math.min(p.x, bounds.w - size.w - MARGIN)),
    y: Math.max(MARGIN, Math.min(p.y, bounds.h - size.h - MARGIN)),
  })
  const pos = clamp(drag ?? palette.pos ?? { x: (bounds.w - size.w) / 2, y: defaultTop(bounds.w) })

  /** Pointer handlers for anything that should move the palette. A tap calls `onTap`. */
  const dragHandlers = (onTap?: () => void) => ({
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)
      const start = { x: e.clientX, y: e.clientY }
      const origin = pos
      let moved = false
      let last = origin
      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - start.x
        const dy = ev.clientY - start.y
        if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
        moved = true
        last = { x: origin.x + dx, y: origin.y + dy }
        setDrag(last)
      }
      const up = () => {
        target.removeEventListener('pointermove', move)
        target.removeEventListener('pointerup', up)
        target.removeEventListener('pointercancel', up)
        setDrag(null)
        if (moved) setPalette({ pos: clamp(last) })
        else onTap?.()
      }
      target.addEventListener('pointermove', move)
      target.addEventListener('pointerup', up)
      target.addEventListener('pointercancel', up)
    },
    style: { touchAction: 'none' } as const,
  })

  return (
    <div
      ref={ref}
      className={cn('absolute z-20 max-w-[calc(100%-16px)]', !size.w && 'invisible')}
      style={{ left: pos.x, top: pos.y }}
    >
      {palette.collapsed ? (
        <CollapsedPalette {...dragHandlers(() => setPalette({ collapsed: false }))} />
      ) : (
        <DrawingToolbar
          {...props}
          className={cn('max-w-full max-sm:flex-wrap max-sm:justify-center', drag && 'shadow-2xl', props.className)}
          onCollapse={() => setPalette({ collapsed: true })}
          leading={
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  {...dragHandlers()}
                  className={cn(
                    'flex h-8 w-4 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/60 hover:bg-accent hover:text-foreground',
                    drag && 'cursor-grabbing',
                  )}
                  aria-label="Move toolbar"
                >
                  <GripVertical className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Drag to move</TooltipContent>
            </Tooltip>
          }
        />
      )}
    </div>
  )
}

function CollapsedPalette(handlers: React.ComponentProps<'button'>) {
  const drawing = useUI((s) => s.drawing)
  const tool = TOOLS.find((t) => t.tool === drawing.tool) ?? TOOLS[0]
  const color =
    drawing.tool === 'pen' || drawing.tool === 'highlighter' ? resolveColor(drawing[drawing.tool].color) : undefined
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          {...handlers}
          className="relative flex size-12 cursor-grab items-center justify-center rounded-full border bg-background/95 shadow-lg backdrop-blur transition-transform hover:scale-105 active:cursor-grabbing"
          aria-label="Show drawing tools"
        >
          <span
            className="absolute inset-1 rounded-full border-[3px]"
            style={{ borderColor: color ?? 'var(--border)' }}
          />
          <tool.icon className="size-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>Tap to show tools · drag to move</TooltipContent>
    </Tooltip>
  )
}
