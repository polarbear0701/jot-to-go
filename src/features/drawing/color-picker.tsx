import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PENCILCASE_MAX_COLORS, useUI } from '@/store/ui'
import { PALETTE_COLUMNS, colorName, isHexColor } from './colors'
import { resolveColor } from './geometry'

export function Swatch({
  color,
  active,
  size = 'md',
  className,
  ...props
}: { color: string; active?: boolean; size?: 'sm' | 'md' } & React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      aria-label={colorName(color)}
      title={colorName(color)}
      aria-pressed={active}
      {...props}
      className={cn(
        'shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] ring-offset-2 ring-offset-background transition-transform hover:scale-110 dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.15)]',
        size === 'md' ? 'size-5' : 'size-4',
        active && 'ring-2 ring-ring',
        className,
      )}
      style={{ background: resolveColor(color) }}
    />
  )
}

/** Full palette with custom colors and Pencilcase favourites. */
export function ColorPicker() {
  const drawing = useUI((s) => s.drawing)
  const setInkColor = useUI((s) => s.setInkColor)
  const toggleFavoriteColor = useUI((s) => s.toggleFavoriteColor)
  const tool = drawing.tool === 'highlighter' ? 'highlighter' : 'pen'
  const current = drawing[tool].color
  const favorites = drawing.pencilcase.colors
  const isFavorite = favorites.includes(current)
  const full = favorites.length >= PENCILCASE_MAX_COLORS

  const [hex, setHex] = useState(current === 'ink' ? '' : current)
  useEffect(() => setHex(current === 'ink' ? '' : current), [current])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Colors</span>
        <span className="text-xs text-muted-foreground">{colorName(current)}</span>
      </div>

      <div className="grid grid-flow-col grid-rows-5 gap-1.5" style={{ gridTemplateColumns: `repeat(${PALETTE_COLUMNS.length}, minmax(0, 1fr))` }}>
        {PALETTE_COLUMNS.flatMap((col) =>
          col.shades.map((c) => (
            <Swatch key={c} color={c} active={c === current} onClick={() => setInkColor(c)} className="size-6" />
          )),
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-full border" title="Pick any color">
          <span
            className="absolute inset-0"
            style={{ background: 'conic-gradient(#ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ec4899, #ef4444)' }}
          />
          <input
            type="color"
            value={isHexColor(current) ? current : '#000000'}
            onChange={(e) => setInkColor(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Custom color"
          />
        </label>
        <input
          value={hex}
          placeholder="#RRGGBB"
          onChange={(e) => {
            const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`
            setHex(v)
            if (isHexColor(v)) setInkColor(v.toLowerCase())
          }}
          className="h-8 min-w-0 flex-1 rounded-md border bg-transparent px-2 font-mono text-xs uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label="Hex color"
        />
      </div>

      <div className="rounded-lg border bg-muted/40 p-2.5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium">
            Pencilcase colors{' '}
            <span className="text-muted-foreground tabular-nums">
              {favorites.length}/{PENCILCASE_MAX_COLORS}
            </span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="-my-1 h-7 px-2 text-xs"
            disabled={!isFavorite && full}
            onClick={() => toggleFavoriteColor(current)}
          >
            <Star className={cn('size-3.5', isFavorite && 'fill-amber-400 text-amber-400')} />
            {isFavorite ? 'Remove current' : full ? 'Full' : 'Add current'}
          </Button>
        </div>
        <div className="flex gap-2">
          {favorites.map((c) => (
            <Swatch key={c} color={c} active={c === current} onClick={() => setInkColor(c)} />
          ))}
          {Array.from({ length: PENCILCASE_MAX_COLORS - favorites.length }, (_, i) => (
            <span key={i} className="size-5 rounded-full border border-dashed border-muted-foreground/40" />
          ))}
        </div>
      </div>
    </div>
  )
}
