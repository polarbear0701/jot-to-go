import { memo } from 'react'

import { StrokePath } from '@/features/drawing/drawing-surface'
import { PAGE_HEIGHT, PAGE_WIDTH, strokesBounds } from '@/features/drawing/geometry'
import type { CanvasContent } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Tiny static preview of a canvas, used in cards and search. */
export const StrokeThumbnail = memo(function StrokeThumbnail({
  canvas,
  className,
}: {
  canvas: CanvasContent
  className?: string
}) {
  const b =
    canvas.mode === 'page'
      ? { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT * 0.75 }
      : (strokesBounds(canvas.strokes) ?? { x: 0, y: 0, width: 400, height: 300 })
  const pad = canvas.mode === 'page' ? 0 : 24
  return (
    <svg
      viewBox={`${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`}
      preserveAspectRatio={canvas.mode === 'page' ? 'xMidYMin slice' : 'xMidYMid meet'}
      className={cn('size-full', className)}
      aria-hidden
    >
      {canvas.strokes.map((s) => (
        <StrokePath key={s.id} stroke={s} />
      ))}
    </svg>
  )
})
