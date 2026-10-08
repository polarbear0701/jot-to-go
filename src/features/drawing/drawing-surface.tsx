import { memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Maximize, Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { newId } from '@/lib/id'
import type { PaperStyle, Stroke, StrokePoint } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useUI } from '@/store/ui'
import {
  PAGE_GAP,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  type Viewport,
  hitStroke,
  pageRect,
  resolveColor,
  screenToWorld,
  strokeOpacity,
  strokeToPath,
  strokesBounds,
  zoomAt,
} from './geometry'
import { PaperPatterns, paperFill } from './paper'

export type SurfaceLayout =
  | { kind: 'pages'; pageCount: number; paper: PaperStyle }
  | { kind: 'infinite'; paper: PaperStyle }
  | { kind: 'embed'; height: number; paper: PaperStyle }

interface DrawingSurfaceProps {
  strokes: Stroke[]
  onCommit: (strokes: Stroke[]) => void
  layout: SurfaceLayout
  onAddPage?: () => void
  className?: string
}

type Gesture =
  | { type: 'draw'; pointerId: number; points: StrokePoint[]; pressure: boolean; tool: 'pen' | 'highlighter' }
  | { type: 'erase'; pointerId: number }
  | { type: 'pan'; pointerId: number; lastX: number; lastY: number }
  | {
      type: 'pinch'
      ids: [number, number]
      startDist: number
      startMid: [number, number]
      startVp: Viewport
    }

const contentHeight = (pageCount: number) => pageCount * (PAGE_HEIGHT + PAGE_GAP) - PAGE_GAP
const PAGE_MARGIN = 24
/** Leaves room above the first sheet for the floating toolbars. */
const TOP_INSET = 72

function clampPages(vp: Viewport, w: number, h: number, pageCount: number): Viewport {
  const cw = PAGE_WIDTH * vp.zoom
  const ch = contentHeight(pageCount) * vp.zoom
  const x = cw + PAGE_MARGIN * 2 <= w ? (w - cw) / 2 : Math.min(PAGE_MARGIN, Math.max(w - cw - PAGE_MARGIN, vp.x))
  const bottomRoom = 96 // leaves space for the "Add page" button
  const minY = Math.min(TOP_INSET, h - ch - bottomRoom)
  const y = Math.min(TOP_INSET, Math.max(minY, vp.y))
  return { zoom: vp.zoom, x, y }
}

function isEditableTarget(el: EventTarget | null) {
  return el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
}

export function DrawingSurface({ strokes, onCommit, layout, onAddPage, className }: DrawingSurfaceProps) {
  const uid = useId().replace(/:/g, '')
  const containerRef = useRef<HTMLDivElement>(null)
  const prefs = useUI((s) => s.drawing)
  const embed = layout.kind === 'embed'

  const [size, setSize] = useState({ width: 0, height: 0 })
  const [vp, setVpState] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })
  const vpRef = useRef(vp)
  const sizeRef = useRef(size)
  sizeRef.current = size

  const setVp = useCallback(
    (next: Viewport | ((prev: Viewport) => Viewport)) => {
      const resolved = typeof next === 'function' ? next(vpRef.current) : next
      const { width, height } = sizeRef.current
      const clamped =
        layout.kind === 'pages' ? clampPages(resolved, width, height, layout.pageCount) : resolved
      vpRef.current = clamped
      setVpState(clamped)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout.kind, layout.kind === 'pages' ? layout.pageCount : 0],
  )

  // ---- Size tracking ------------------------------------------------------
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ---- Fit to content -------------------------------------------------------
  const fit = useCallback(() => {
    const { width, height } = sizeRef.current
    if (!width || !height) return
    if (layout.kind === 'embed') {
      setVp({ x: 0, y: 0, zoom: 1 })
    } else if (layout.kind === 'pages') {
      const zoom = Math.min(1, (width - PAGE_MARGIN * 2) / PAGE_WIDTH)
      setVp({ zoom, x: (width - PAGE_WIDTH * zoom) / 2, y: TOP_INSET })
    } else {
      const b = strokesBounds(strokes)
      if (!b) {
        setVp({ zoom: 1, x: width / 2, y: height / 2 })
        return
      }
      const zoom = Math.min(1, (width - 120) / b.width, (height - 160) / b.height)
      setVp({
        zoom,
        x: width / 2 - (b.x + b.width / 2) * zoom,
        y: height / 2 - (b.y + b.height / 2) * zoom,
      })
    }
    // Only refit when the layout kind changes, not on every stroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.kind, setVp])

  const fitted = useRef<string | null>(null)
  useLayoutEffect(() => {
    if (!size.width || fitted.current === layout.kind) return
    fitted.current = layout.kind
    fit()
  }, [size.width, layout.kind, fit])

  // Re-clamp when the container resizes or pages are added/removed.
  useEffect(() => {
    if (layout.kind === 'pages') setVp((v) => v)
  }, [size.width, size.height, layout.kind, setVp])

  // ---- Gesture state ----------------------------------------------------------
  const pointers = useRef(new Map<number, { x: number; y: number; type: string }>())
  const gesture = useRef<Gesture | null>(null)
  const rectRef = useRef<DOMRect | null>(null)
  const spaceHeld = useRef(false)
  const [, setTick] = useState(0)
  const frame = useRef(0)
  const rerender = useCallback(() => {
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      setTick((t) => t + 1)
    })
  }, [])
  const [erased, setErasedState] = useState<Set<string>>(() => new Set())
  const erasedRef = useRef(erased)
  const setErased = (next: Set<string>) => {
    erasedRef.current = next
    setErasedState(next)
  }
  const [hover, setHover] = useState<[number, number] | null>(null)

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  useEffect(() => {
    if (embed) return
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isEditableTarget(e.target)) {
        spaceHeld.current = true
        e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceHeld.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [embed])

  const local = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = rectRef.current ?? containerRef.current!.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }

  const eraseAt = (sx: number, sy: number) => {
    const [wx, wy] = screenToWorld(vpRef.current, sx, sy)
    const radius = prefs.eraserSize / 2 / vpRef.current.zoom
    let changed = false
    const next = new Set(erasedRef.current)
    for (const s of strokes) {
      if (!next.has(s.id) && hitStroke(s, wx, wy, radius)) {
        next.add(s.id)
        changed = true
      }
    }
    if (changed) setErased(next)
  }

  const startToolGesture = (e: React.PointerEvent, sx: number, sy: number) => {
    const eraserButton = (e.buttons & 32) !== 0
    const tool = eraserButton ? 'eraser' : prefs.tool
    if (tool === 'hand') {
      if (!embed) gesture.current = { type: 'pan', pointerId: e.pointerId, lastX: sx, lastY: sy }
      return
    }
    if (tool === 'eraser') {
      gesture.current = { type: 'erase', pointerId: e.pointerId }
      eraseAt(sx, sy)
      return
    }
    const [wx, wy] = screenToWorld(vpRef.current, sx, sy)
    const pressure = e.pointerType === 'pen'
    gesture.current = {
      type: 'draw',
      pointerId: e.pointerId,
      tool,
      pressure,
      points: [[wx, wy, pressure ? e.pressure : 0.5]],
    }
    rerender()
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return
    rectRef.current = containerRef.current!.getBoundingClientRect()
    const [sx, sy] = local(e)
    pointers.current.set(e.pointerId, { x: sx, y: sy, type: e.pointerType })

    if (e.pointerType === 'touch') {
      if (embed && prefs.stylusOnly) return // let the browser scroll the note
      const touches = [...pointers.current.entries()].filter(([, p]) => p.type === 'touch')
      if (touches.length >= 2) {
        if (embed) return
        // Second finger: abandon any stroke in progress and start pinch-zoom.
        const [[ida, a], [idb, b]] = touches.slice(-2)
        gesture.current = {
          type: 'pinch',
          ids: [ida, idb],
          startDist: Math.hypot(a.x - b.x, a.y - b.y),
          startMid: [(a.x + b.x) / 2, (a.y + b.y) / 2],
          startVp: vpRef.current,
        }
        setErased(new Set())
        rerender()
        return
      }
      if (prefs.stylusOnly) {
        if (!embed) gesture.current = { type: 'pan', pointerId: e.pointerId, lastX: sx, lastY: sy }
        return
      }
    }

    if (gesture.current) return
    ;(e.target as Element).setPointerCapture?.(e.pointerId)

    if (e.pointerType === 'mouse' && (e.button === 1 || spaceHeld.current)) {
      if (!embed) gesture.current = { type: 'pan', pointerId: e.pointerId, lastX: sx, lastY: sy }
      return
    }
    startToolGesture(e, sx, sy)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const [sx, sy] = local(e)
    if (e.pointerType !== 'touch') setHover(screenToWorld(vpRef.current, sx, sy))
    const p = pointers.current.get(e.pointerId)
    if (p) {
      p.x = sx
      p.y = sy
    }
    const g = gesture.current
    if (!g) return

    if (g.type === 'pinch') {
      const a = pointers.current.get(g.ids[0])
      const b = pointers.current.get(g.ids[1])
      if (!a || !b) return
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const mid: [number, number] = [(a.x + b.x) / 2, (a.y + b.y) / 2]
      const scaled = zoomAt(g.startVp, (g.startVp.zoom * dist) / Math.max(1, g.startDist), g.startMid[0], g.startMid[1])
      setVp({ ...scaled, x: scaled.x + mid[0] - g.startMid[0], y: scaled.y + mid[1] - g.startMid[1] })
      return
    }
    if (g.pointerId !== e.pointerId) return

    if (g.type === 'pan') {
      const dx = sx - g.lastX
      const dy = sy - g.lastY
      g.lastX = sx
      g.lastY = sy
      setVp((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
    } else if (g.type === 'erase') {
      eraseAt(sx, sy)
    } else if (g.type === 'draw') {
      const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]
      const minDist = 0.5 / vpRef.current.zoom
      for (const ce of events.length ? events : [e.nativeEvent]) {
        const [cx, cy] = local(ce)
        const [wx, wy] = screenToWorld(vpRef.current, cx, cy)
        const last = g.points[g.points.length - 1]
        if (Math.hypot(wx - last[0], wy - last[1]) < minDist) continue
        g.points.push([wx, wy, g.pressure ? ce.pressure : 0.5])
      }
      rerender()
    }
  }

  const finish = (e: React.PointerEvent, cancelled: boolean) => {
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    if (!g) return
    if (g.type === 'pinch') {
      if (g.ids.includes(e.pointerId)) gesture.current = null
      return
    }
    if (g.pointerId !== e.pointerId) return
    gesture.current = null

    if (g.type === 'draw' && !cancelled) {
      const cfg = prefs[g.tool]
      const stroke: Stroke = {
        id: newId(),
        tool: g.tool,
        color: cfg.color,
        size: cfg.size,
        opacity: cfg.opacity,
        thinning: cfg.thinning,
        streamline: cfg.streamline,
        points: g.points,
        pressure: g.pressure,
      }
      onCommit([...strokes, stroke])
    } else if (g.type === 'erase' && erasedRef.current.size > 0) {
      const gone = erasedRef.current
      onCommit(strokes.filter((s) => !gone.has(s.id)))
      setErased(new Set())
    }
    rerender()
  }

  // ---- Wheel: pan, and pinch / ctrl+wheel to zoom ----------------------------
  useEffect(() => {
    const el = containerRef.current
    if (!el || embed) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.01)
        setVp((v) => zoomAt(v, v.zoom * factor, e.clientX - r.left, e.clientY - r.top))
      } else {
        const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX
        const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY
        setVp((v) => ({ ...v, x: v.x - dx, y: v.y - dy }))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [embed, setVp])

  const zoomBy = (factor: number) =>
    setVp((v) => zoomAt(v, v.zoom * factor, sizeRef.current.width / 2, sizeRef.current.height / 2))

  // ---- Rendering --------------------------------------------------------------
  const g = gesture.current
  const live = g?.type === 'draw' ? g : null
  const livePath = useMemo(
    () =>
      live
        ? strokeToPath(
            { ...prefs[live.tool], tool: live.tool, points: live.points, pressure: live.pressure },
            false,
          )
        : '',
    // live.points is mutated in place; the tick forces recomputation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live, live?.points.length, prefs.pen, prefs.highlighter],
  )

  const pageCount = layout.kind === 'pages' ? layout.pageCount : 0
  const pages = Array.from({ length: pageCount }, (_, i) => pageRect(i))
  const [vx0, vy0] = screenToWorld(vp, 0, 0)
  const visible = { x: vx0, y: vy0, width: size.width / vp.zoom, height: size.height / vp.zoom }

  const currentPage =
    layout.kind === 'pages'
      ? Math.min(
          pageCount,
          Math.max(1, Math.floor((visible.y + visible.height / 2) / (PAGE_HEIGHT + PAGE_GAP)) + 1),
        )
      : 0

  const panning = g?.type === 'pan' || g?.type === 'pinch'
  const cursor =
    prefs.tool === 'hand' || spaceHeld.current
      ? panning
        ? 'grabbing'
        : 'grab'
      : prefs.tool === 'eraser'
        ? 'none'
        : 'crosshair'

  const touchAction = embed && prefs.stylusOnly ? 'pan-y' : 'none'

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden select-none',
        layout.kind === 'pages' && 'bg-canvas',
        layout.kind === 'infinite' && 'bg-background',
        embed && 'bg-paper',
        className,
      )}
      style={{ touchAction, cursor, height: embed ? layout.height : undefined }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => finish(e, false)}
      onPointerCancel={(e) => finish(e, true)}
      onPointerLeave={() => setHover(null)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <PaperPatterns uid={uid} />
          {layout.kind === 'pages' && (
            <clipPath id={`${uid}-pages`}>
              {pages.map((r, i) => (
                <rect key={i} x={r.x} y={r.y} width={r.width} height={r.height} />
              ))}
            </clipPath>
          )}
        </defs>
        <g transform={`translate(${vp.x} ${vp.y}) scale(${vp.zoom})`}>
          {layout.kind === 'pages' ? (
            pages.map((r, i) => (
              <g key={i}>
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.width}
                  height={r.height}
                  rx={2}
                  className="fill-paper"
                  style={{ filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.08)) drop-shadow(0 4px 12px rgb(0 0 0 / 0.06))' }}
                />
                {layout.paper !== 'blank' && (
                  <rect
                    x={r.x}
                    y={r.y + (layout.paper === 'lined' ? 96 : 0)}
                    width={r.width}
                    height={r.height - (layout.paper === 'lined' ? 128 : 0)}
                    fill={paperFill(uid, layout.paper)}
                  />
                )}
                {layout.paper === 'lined' && (
                  <line x1={72} x2={72} y1={r.y} y2={r.y + r.height} stroke="#f87171" strokeOpacity={0.5} />
                )}
              </g>
            ))
          ) : layout.paper !== 'blank' ? (
            <rect {...visible} fill={paperFill(uid, layout.paper)} />
          ) : null}

          <g clipPath={layout.kind === 'pages' ? `url(#${uid}-pages)` : undefined}>
            <StrokeLayer strokes={strokes} erased={erased} />
            {live && livePath && (
              <path
                d={livePath}
                fill={resolveColor(prefs[live.tool].color)}
                fillOpacity={prefs[live.tool].opacity}
              />
            )}
          </g>

          {prefs.tool === 'eraser' && hover && (
            <circle
              cx={hover[0]}
              cy={hover[1]}
              r={prefs.eraserSize / 2 / vp.zoom}
              className="fill-foreground/5 stroke-foreground/40"
              strokeWidth={1 / vp.zoom}
            />
          )}
        </g>
      </svg>

      {layout.kind === 'pages' && onAddPage && (
        <div
          className="absolute flex justify-center"
          style={{
            left: vp.x,
            width: PAGE_WIDTH * vp.zoom,
            top: vp.y + contentHeight(pageCount) * vp.zoom + 20,
          }}
        >
          <Button
            variant="outline"
            size="sm"
            className="rounded-full bg-background/80 backdrop-blur"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onAddPage}
          >
            <Plus /> Add page
          </Button>
        </div>
      )}

      {!embed && (
        <div
          className="absolute right-3 bottom-3 flex items-center gap-2"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {layout.kind === 'pages' && (
            <div className="rounded-full border bg-background/90 px-3 py-1 text-xs text-muted-foreground tabular-nums shadow-sm backdrop-blur max-sm:hidden">
              Page {currentPage} of {pageCount}
            </div>
          )}
          <div className="flex items-center rounded-full border bg-background/90 p-0.5 shadow-sm backdrop-blur">
            <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out">
              <Minus />
            </Button>
            <button
              className="w-12 text-center text-xs font-medium tabular-nums hover:text-foreground text-muted-foreground"
              onClick={() => setVp((v) => zoomAt(v, 1, sizeRef.current.width / 2, sizeRef.current.height / 2))}
              title="Reset to 100%"
            >
              {Math.round(vp.zoom * 100)}%
            </button>
            <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => zoomBy(1.2)} aria-label="Zoom in">
              <Plus />
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={fit} aria-label="Fit to screen">
                  <Maximize />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fit to screen</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  )
}

const StrokeLayer = memo(function StrokeLayer({ strokes, erased }: { strokes: Stroke[]; erased: Set<string> }) {
  // Highlighter ink sits underneath pen ink, like on real paper.
  const highlights = strokes.filter((s) => s.tool === 'highlighter')
  const ink = strokes.filter((s) => s.tool !== 'highlighter')
  return (
    <>
      {highlights.map((s) => (
        <StrokePath key={s.id} stroke={s} faded={erased.has(s.id)} />
      ))}
      {ink.map((s) => (
        <StrokePath key={s.id} stroke={s} faded={erased.has(s.id)} />
      ))}
    </>
  )
})

export const StrokePath = memo(function StrokePath({ stroke, faded }: { stroke: Stroke; faded?: boolean }) {
  const d = useMemo(() => strokeToPath(stroke), [stroke])
  const base = strokeOpacity(stroke)
  return <path d={d} fill={resolveColor(stroke.color)} fillOpacity={faded ? base * 0.15 : base} />
})
