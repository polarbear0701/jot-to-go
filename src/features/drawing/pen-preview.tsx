import { useMemo } from 'react'

import type { StrokePoint } from '@/lib/types'
import type { InkTool, PenConfig } from '@/store/ui'
import { resolveColor, strokeToPath } from './geometry'

/** Sample squiggle with a pressure curve, so thinning & smoothing are visible. */
function samplePoints(width: number, height: number): StrokePoint[] {
  const pts: StrokePoint[] = []
  const steps = 48
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push([
      12 + t * (width - 24),
      height / 2 + Math.sin(t * Math.PI * 2.2) * (height / 4),
      0.2 + 0.8 * Math.sin(Math.PI * t),
    ])
  }
  return pts
}

export function PenPreview({
  tool,
  config,
  width = 220,
  height = 56,
  className,
}: {
  tool: InkTool
  config: PenConfig
  width?: number
  height?: number
  className?: string
}) {
  const d = useMemo(
    () => strokeToPath({ ...config, tool, points: samplePoints(width, height), pressure: true }),
    [config, tool, width, height],
  )
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className} aria-hidden>
      {tool === 'highlighter' && (
        <text x={width / 2} y={height / 2 + 6} textAnchor="middle" className="fill-muted-foreground text-[15px] font-medium">
          Highlight me
        </text>
      )}
      <path d={d} fill={resolveColor(config.color)} fillOpacity={config.opacity} />
    </svg>
  )
}
