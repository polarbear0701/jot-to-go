import { useRef, useState, type ReactNode } from 'react'
import { ChevronsDownUp, Eraser, Hand, Highlighter, PenLine, PenTool, Redo2, Trash2, Undo2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { DrawTool } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useUI } from '@/store/ui'
import { ColorPicker, Swatch } from './color-picker'
import { resolveColor } from './geometry'
import { PencilcaseSlots } from './pencilcase'
import { EraserSettings, InkSettings } from './pen-settings'

interface DrawingToolbarProps {
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onClear?: () => void
  /** Hand tool only makes sense on pannable surfaces. */
  showHand?: boolean
  compact?: boolean
  /** Rendered first, e.g. a drag grip for the floating palette. */
  leading?: ReactNode
  /** Shows a collapse button at the end. */
  onCollapse?: () => void
  className?: string
  children?: ReactNode
}

export const TOOLS: { tool: DrawTool; label: string; icon: typeof PenLine; shortcut: string }[] = [
  { tool: 'pen', label: 'Pen', icon: PenLine, shortcut: 'P' },
  { tool: 'highlighter', label: 'Highlighter', icon: Highlighter, shortcut: 'H' },
  { tool: 'eraser', label: 'Eraser', icon: Eraser, shortcut: 'E' },
  { tool: 'hand', label: 'Hand', icon: Hand, shortcut: 'Space' },
]

const Divider = () => <Separator orientation="vertical" className="mx-1 h-5!" />

export function DrawingToolbar({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClear,
  showHand = true,
  compact,
  leading,
  onCollapse,
  className,
  children,
}: DrawingToolbarProps) {
  const drawing = useUI((s) => s.drawing)
  const setDrawing = useUI((s) => s.setDrawing)
  const iconSize = compact ? 'icon-sm' : 'icon'

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-xl border bg-background/95 p-1 shadow-lg backdrop-blur',
        compact && 'rounded-lg shadow-sm',
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {leading}

      {TOOLS.filter((t) => showHand || t.tool !== 'hand').map((t) => (
        <ToolButton key={t.tool} {...t} compact={compact} />
      ))}

      <Divider />
      <InlineColors />

      <Divider />
      <PencilcaseSlots compact={compact} />

      <Divider />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size={iconSize} onClick={onUndo} disabled={!canUndo} aria-label="Undo">
            <Undo2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Undo <span className="opacity-60">· ⌘Z</span>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size={iconSize} onClick={onRedo} disabled={!canRedo} aria-label="Redo">
            <Redo2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Redo <span className="opacity-60">· ⇧⌘Z</span>
        </TooltipContent>
      </Tooltip>

      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size={iconSize}
                aria-label="Input settings"
                className={cn(drawing.stylusOnly && 'text-blue-600 dark:text-blue-400')}
              >
                <PenTool />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Stylus & touch</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-72" side="bottom" align="end">
          <label className="flex items-start justify-between gap-4">
            <span>
              <span className="block text-sm font-medium">Stylus only</span>
              <span className="block text-xs text-muted-foreground">
                Draw with Apple Pencil or a stylus. Fingers scroll, pan and pinch-zoom instead of drawing.
              </span>
            </span>
            <Switch checked={drawing.stylusOnly} onCheckedChange={(stylusOnly) => setDrawing({ stylusOnly })} />
          </label>
          {onClear && (
            <>
              <Separator className="my-3" />
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={onClear}
              >
                <Trash2 /> Clear drawing
              </Button>
            </>
          )}
        </PopoverContent>
      </Popover>

      {children}

      {onCollapse && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size={iconSize} onClick={onCollapse} aria-label="Collapse toolbar">
              <ChevronsDownUp />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Collapse toolbar</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

/**
 * Selects a tool; tapping the already-selected pen, highlighter or eraser opens its settings.
 */
function ToolButton({
  tool,
  label,
  icon: Icon,
  shortcut,
  compact,
}: (typeof TOOLS)[number] & { compact?: boolean }) {
  const current = useUI((s) => s.drawing.tool)
  const color = useUI((s) => (tool === 'pen' || tool === 'highlighter' ? s.drawing[tool].color : null))
  const setDrawing = useUI((s) => s.setDrawing)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const active = current === tool
  const configurable = tool !== 'hand'

  const button = (
    <Button
      ref={ref}
      variant="ghost"
      size={compact ? 'icon-sm' : 'icon'}
      aria-label={label}
      aria-pressed={active}
      aria-haspopup={configurable ? 'dialog' : undefined}
      className={cn('relative', active && 'bg-accent text-foreground')}
      onClick={() => {
        if (active && configurable) setOpen((o) => !o)
        else {
          setDrawing({ tool })
          setOpen(false)
        }
      }}
    >
      <Icon />
      {color && (
        <span
          className="absolute right-1.5 bottom-1 left-1.5 h-[3px] rounded-full"
          style={{ background: resolveColor(color), opacity: active ? 1 : 0.5 }}
        />
      )}
    </Button>
  )

  const tooltip = (
    <TooltipContent>
      {label} <span className="opacity-60">· {shortcut}</span>
      {active && configurable && <div className="opacity-60">Tap again for settings</div>}
    </TooltipContent>
  )

  if (!configurable) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        {tooltip}
      </Tooltip>
    )
  }

  return (
    <Popover open={open && active} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverAnchor asChild>{button}</PopoverAnchor>
        </TooltipTrigger>
        {!open && tooltip}
      </Tooltip>
      <PopoverContent
        className="w-72"
        side="bottom"
        onInteractOutside={(e) => {
          // Let the button's own click toggle the popover closed.
          if (ref.current?.contains(e.target as Node)) e.preventDefault()
        }}
      >
        {tool === 'eraser' ? <EraserSettings /> : <InkSettings tool={tool as 'pen' | 'highlighter'} />}
      </PopoverContent>
    </Popover>
  )
}

/** Pencilcase colors, the current color if it isn't one of them, and the full palette. */
function InlineColors() {
  const drawing = useUI((s) => s.drawing)
  const setInkColor = useUI((s) => s.setInkColor)
  const inkTool = drawing.tool === 'pen' || drawing.tool === 'highlighter' ? drawing.tool : null
  const current = drawing[inkTool ?? 'pen'].color
  const favorites = drawing.pencilcase.colors

  return (
    <div className="flex items-center gap-1.5 px-1">
      {favorites.map((c) => (
        <Swatch key={c} color={c} active={!!inkTool && c === current} onClick={() => setInkColor(c)} />
      ))}
      {!favorites.includes(current) && (
        <Swatch color={current} active={!!inkTool} onClick={() => setInkColor(current)} />
      )}
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                className="size-5 shrink-0 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  background:
                    'conic-gradient(#ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ec4899, #ef4444)',
                }}
                aria-label="More colors"
              />
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>More colors</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-auto min-w-80" side="bottom">
          <ColorPicker />
        </PopoverContent>
      </Popover>
    </div>
  )
}
