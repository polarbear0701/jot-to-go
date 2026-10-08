import { getStroke } from 'perfect-freehand'

import type { Stroke, StrokePoint } from '@/lib/types'

/** A4 at 96 DPI. */
export const PAGE_WIDTH = 794
export const PAGE_HEIGHT = 1123
export const PAGE_GAP = 32

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 8

export interface Viewport {
  /** Screen-space translation. */
  x: number
  y: number
  zoom: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export const pageRect = (index: number): Rect => ({
  x: 0,
  y: index * (PAGE_HEIGHT + PAGE_GAP),
  width: PAGE_WIDTH,
  height: PAGE_HEIGHT,
})

export const screenToWorld = (vp: Viewport, sx: number, sy: number): [number, number] => [
  (sx - vp.x) / vp.zoom,
  (sy - vp.y) / vp.zoom,
]

export const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

/** Zoom around a fixed screen point. */
export function zoomAt(vp: Viewport, nextZoom: number, sx: number, sy: number): Viewport {
  const zoom = clampZoom(nextZoom)
  const [wx, wy] = screenToWorld(vp, sx, sy)
  return { zoom, x: sx - wx * zoom, y: sy - wy * zoom }
}

export function resolveColor(color: string) {
  return color === 'ink' ? 'var(--foreground)' : color
}

// ---------------------------------------------------------------------------
// Stroke outline
// ---------------------------------------------------------------------------

const average = (a: number, b: number) => (a + b) / 2

/** Converts a perfect-freehand outline polygon into a smooth SVG path. */
function outlineToPath(points: number[][], closed = true) {
  const len = points.length
  if (len < 4) return ''
  let a = points[0]
  let b = points[1]
  const c = points[2]
  let d = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(b[1], c[1]).toFixed(2)} T`
  for (let i = 2, max = len - 1; i < max; i++) {
    a = points[i]
    b = points[i + 1]
    d += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(2)} `
  }
  if (closed) d += 'Z'
  return d
}

export const strokeOpacity = (stroke: Pick<Stroke, 'tool' | 'opacity'>) =>
  stroke.opacity ?? (stroke.tool === 'highlighter' ? 0.4 : 1)

export function strokeToPath(
  stroke: Pick<Stroke, 'tool' | 'size' | 'points' | 'pressure' | 'thinning' | 'streamline'>,
  complete = true,
) {
  const highlighter = stroke.tool === 'highlighter'
  const thinning = stroke.thinning ?? (highlighter ? 0 : 0.6)
  const outline = getStroke(stroke.points, {
    size: stroke.size,
    thinning,
    smoothing: 0.5,
    streamline: stroke.streamline ?? 0.45,
    simulatePressure: !stroke.pressure && thinning > 0,
    last: complete,
    start: { cap: !highlighter },
    end: { cap: !highlighter },
  })
  return outlineToPath(outline)
}

// ---------------------------------------------------------------------------
// Hit testing
// ---------------------------------------------------------------------------

function distToSegmentSq(px: number, py: number, a: StrokePoint, b: StrokePoint) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lenSq = dx * dx + dy * dy
  let t = lenSq === 0 ? 0 : ((px - a[0]) * dx + (py - a[1]) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const x = a[0] + t * dx - px
  const y = a[1] + t * dy - py
  return x * x + y * y
}

export function strokeBounds(stroke: Stroke): Rect {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of stroke.points) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  const pad = stroke.size
  return { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 }
}

export function strokesBounds(strokes: Stroke[]): Rect | null {
  if (strokes.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const s of strokes) {
    const b = strokeBounds(s)
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + b.width)
    maxY = Math.max(maxY, b.y + b.height)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/** Does a circle of `radius` at (x, y) touch the stroke? */
export function hitStroke(stroke: Stroke, x: number, y: number, radius: number) {
  const r = radius + stroke.size / 2
  const b = strokeBounds(stroke)
  if (x < b.x - r || x > b.x + b.width + r || y < b.y - r || y > b.y + b.height + r) return false
  const rSq = r * r
  const pts = stroke.points
  if (pts.length === 1) {
    const dx = pts[0][0] - x
    const dy = pts[0][1] - y
    return dx * dx + dy * dy <= rSq
  }
  for (let i = 0; i < pts.length - 1; i++) {
    if (distToSegmentSq(x, y, pts[i], pts[i + 1]) <= rSq) return true
  }
  return false
}
