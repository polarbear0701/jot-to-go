import { Highlighter, PenLine, PencilRuler, Plus, RefreshCw, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  PENCILCASE_MAX_COLORS,
  PENCILCASE_MAX_PENS,
  activePencilcasePen,
  useUI,
  type PencilcasePen,
} from '@/store/ui'
import { Swatch } from './color-picker'
import { colorName } from './colors'
import { resolveColor } from './geometry'
import { PenPreview } from './pen-preview'

const describe = (p: PencilcasePen) =>
  `${p.tool === 'pen' ? 'Pen' : 'Highlighter'} · ${colorName(p.color)} · ${p.size}px`

/** A saved pen drawn as a tinted nib with a thickness bar. */
function PenGlyph({ pen }: { pen: PencilcasePen }) {
  const Icon = pen.tool === 'pen' ? PenLine : Highlighter
  return (
    <span className="relative flex size-full flex-col items-center justify-center gap-0.5">
      <Icon className="size-4" style={{ color: resolveColor(pen.color) }} strokeWidth={2.25} />
      <span
        className="w-4 rounded-full"
        style={{
          height: Math.max(1.5, Math.min(5, pen.size / 4)),
          background: resolveColor(pen.color),
          opacity: pen.opacity,
        }}
      />
    </span>
  )
}

/** Up to three saved pens, one tap away in the toolbar. */
export function PencilcaseSlots({ compact }: { compact?: boolean }) {
  const drawing = useUI((s) => s.drawing)
  const applyPen = useUI((s) => s.applyPen)
  const savePen = useUI((s) => s.savePen)
  const active = activePencilcasePen(drawing)
  const pens = drawing.pencilcase.pens
  const canSave = drawing.tool === 'pen' || drawing.tool === 'highlighter'
  const box = compact ? 'size-7' : 'size-8'

  return (
    <div className="flex items-center gap-0.5">
      <PencilcaseManager />
      {pens.map((p) => (
        <Tooltip key={p.id}>
          <TooltipTrigger asChild>
            <button
              className={cn(
                'flex items-center justify-center rounded-md transition-colors hover:bg-accent',
                box,
                active?.id === p.id && 'bg-accent ring-1 ring-border',
              )}
              onClick={() => applyPen(p.id)}
              aria-label={describe(p)}
            >
              <PenGlyph pen={p} />
            </button>
          </TooltipTrigger>
          <TooltipContent>{describe(p)}</TooltipContent>
        </Tooltip>
      ))}
      {pens.length < PENCILCASE_MAX_PENS && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                'flex items-center justify-center rounded-md border border-dashed border-muted-foreground/40 text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-40',
                compact ? 'size-6' : 'size-7',
                'mx-0.5',
              )}
              disabled={!canSave || !!active}
              onClick={() => savePen()}
              aria-label="Save current pen to Pencilcase"
            >
              <Plus className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{active ? 'Already in Pencilcase' : 'Save current pen to Pencilcase'}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function PencilcaseManager() {
  const drawing = useUI((s) => s.drawing)
  const { applyPen, savePen, removePen, toggleFavoriteColor, setInkColor } = useUI.getState()
  const { pens, colors } = drawing.pencilcase
  const active = activePencilcasePen(drawing)
  const inkTool = drawing.tool === 'pen' || drawing.tool === 'highlighter' ? drawing.tool : null
  const currentColor = drawing[inkTool ?? 'pen'].color

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Pencilcase">
              <PencilRuler />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Pencilcase</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80 space-y-4" side="bottom">
        <div>
          <div className="text-sm font-semibold">Pencilcase</div>
          <p className="text-xs text-muted-foreground">Your favourite pens and colors, kept on this device.</p>
        </div>

        <section className="space-y-1.5">
          <div className="text-xs font-medium">
            Pens{' '}
            <span className="text-muted-foreground tabular-nums">
              {pens.length}/{PENCILCASE_MAX_PENS}
            </span>
          </div>
          {pens.map((p) => (
            <div
              key={p.id}
              className={cn(
                'group flex items-center gap-2 rounded-lg border p-1.5 pr-1',
                active?.id === p.id && 'border-ring bg-accent/50',
              )}
            >
              <button
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={() => applyPen(p.id)}
                title="Use this pen"
              >
                <span className="shrink-0 rounded-md border bg-paper">
                  <PenPreview tool={p.tool} config={p} width={84} height={30} />
                </span>
                <span className="min-w-0 truncate text-xs">{describe(p)}</span>
              </button>
              {inkTool && active?.id !== p.id && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-6"
                  title="Replace with current pen"
                  onClick={() => savePen(p.id)}
                  aria-label="Replace with current pen"
                >
                  <RefreshCw className="size-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-6 hover:text-destructive"
                onClick={() => removePen(p.id)}
                aria-label="Remove pen"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
          {pens.length < PENCILCASE_MAX_PENS && (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed"
              disabled={!inkTool || !!active}
              onClick={() => savePen()}
            >
              <Plus /> Save current {inkTool === 'highlighter' ? 'highlighter' : 'pen'}
            </Button>
          )}
        </section>

        <section className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium">
            <span>
              Colors{' '}
              <span className="text-muted-foreground tabular-nums">
                {colors.length}/{PENCILCASE_MAX_COLORS}
              </span>
            </span>
            {!colors.includes(currentColor) && colors.length < PENCILCASE_MAX_COLORS && (
              <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => toggleFavoriteColor(currentColor)}>
                <Swatch color={currentColor} size="sm" tabIndex={-1} className="hover:scale-100" /> Add current
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {colors.map((c) => (
              <span key={c} className="group/c relative">
                <Swatch color={c} active={c === currentColor} onClick={() => setInkColor(c)} className="size-7" />
                <button
                  className="absolute -top-1 -right-1 hidden size-4 items-center justify-center rounded-full border bg-background shadow-sm group-hover/c:flex max-md:flex"
                  onClick={() => toggleFavoriteColor(c)}
                  aria-label={`Remove ${colorName(c)} from Pencilcase`}
                >
                  <X className="size-2.5" />
                </button>
              </span>
            ))}
            {Array.from({ length: PENCILCASE_MAX_COLORS - colors.length }, (_, i) => (
              <span key={i} className="size-7 rounded-full border border-dashed border-muted-foreground/40" />
            ))}
          </div>
        </section>
      </PopoverContent>
    </Popover>
  )
}
