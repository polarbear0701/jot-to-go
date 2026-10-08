import type { PaperStyle } from '@/lib/types'

export const LINE_SPACING = 32
export const GRID_SPACING = 24

export const paperFill = (uid: string, paper: Exclude<PaperStyle, 'blank'>) => `url(#${uid}-${paper})`

/** SVG <pattern> definitions in world units, so they pan & zoom with the ink. */
export function PaperPatterns({ uid }: { uid: string }) {
  return (
    <>
      <pattern id={`${uid}-lined`} width={8} height={LINE_SPACING} patternUnits="userSpaceOnUse">
        <line x1={0} x2={8} y1={LINE_SPACING - 0.5} y2={LINE_SPACING - 0.5} className="stroke-paper-line" strokeWidth={1} />
      </pattern>
      <pattern id={`${uid}-grid`} width={GRID_SPACING} height={GRID_SPACING} patternUnits="userSpaceOnUse">
        <path
          d={`M ${GRID_SPACING} 0 L 0 0 0 ${GRID_SPACING}`}
          fill="none"
          className="stroke-paper-line"
          strokeOpacity={0.7}
          strokeWidth={1}
        />
      </pattern>
      <pattern id={`${uid}-dotted`} width={GRID_SPACING} height={GRID_SPACING} patternUnits="userSpaceOnUse">
        <circle cx={GRID_SPACING / 2} cy={GRID_SPACING / 2} r={1.3} className="fill-muted-foreground/40" />
      </pattern>
    </>
  )
}

export const PAPER_OPTIONS: { value: PaperStyle; label: string }[] = [
  { value: 'blank', label: 'Blank' },
  { value: 'lined', label: 'Lined' },
  { value: 'grid', label: 'Grid' },
  { value: 'dotted', label: 'Dotted' },
]

/** Small swatch previewing a paper style, used in menus. */
export function PaperSwatch({ paper }: { paper: PaperStyle }) {
  return (
    <svg viewBox="0 0 16 20" className="h-5 w-4 shrink-0 rounded-[3px] border bg-paper">
      {paper === 'lined' && [6, 10, 14, 18].map((y) => <line key={y} x1={0} x2={16} y1={y} y2={y} className="stroke-paper-line" strokeWidth={0.8} />)}
      {paper === 'grid' &&
        [4, 8, 12].map((v) => (
          <g key={v}>
            <line x1={v} x2={v} y1={0} y2={20} className="stroke-paper-line" strokeWidth={0.6} />
            <line x1={0} x2={16} y1={v + 4} y2={v + 4} className="stroke-paper-line" strokeWidth={0.6} />
          </g>
        ))}
      {paper === 'dotted' &&
        [4, 8, 12].flatMap((x) => [5, 10, 15].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={0.8} className="fill-muted-foreground/60" />))}
    </svg>
  )
}
