import type { ReactNode } from 'react'
import { Eraser, Hand, Highlighter, PenLine, PenTool, Redo2, Trash2, Undo2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { DrawTool } from '@/lib/types'
import { cn } from '@/lib/utils'
import { HIGHLIGHTER_COLORS, INK_COLORS, useUI } from '@/store/ui'
import { resolveColor } from './geometry'

interface DrawingToolbarProps {
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onClear?: () => void
  /** Hand tool only makes sense on pannable surfaces. */
  showHand?: boolean
  compact?: boolean
  className?: string
  children?: ReactNode
}

const TOOLS: { tool: DrawTool; label: string; icon: typeof PenLine; shortcut: string }[] = [
  { tool: 'pen', label: 'Pen', icon: PenLine, shortcut: 'P' },
  { tool: 'highlighter', label: 'Highlighter', icon: Highlighter, shortcut: 'H' },
  { tool: 'eraser', label: 'Eraser', icon: Eraser, shortcut: 'E' },
  { tool: 'hand', label: 'Hand', icon: Hand, shortcut: 'Space' },
]

export function DrawingToolbar({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClear,
  showHand = true,
  compact,
  className,
  children,
}: DrawingToolbarProps) {
  const prefs = useUI((s) => s.drawing)
  const setDrawing = useUI((s) => s.setDrawing)

  const colors: readonly string[] = prefs.tool === 'highlighter' ? HIGHLIGHTER_COLORS : INK_COLORS
  const activeColor = prefs.tool === 'highlighter' ? prefs.highlighterColor : prefs.penColor
  const showColors = prefs.tool === 'pen' || prefs.tool === 'highlighter'

  const sizeKey =
    prefs.tool === 'highlighter' ? 'highlighterSize' : prefs.tool === 'eraser' ? 'eraserSize' : 'penSize'
  const sizeRange = prefs.tool === 'highlighter' ? [8, 48] : prefs.tool === 'eraser' ? [6, 80] : [1, 24]
  const size = prefs[sizeKey]

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-xl border bg-background/95 p-1 shadow-lg backdrop-blur',
        compact && 'rounded-lg shadow-sm',
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {TOOLS.filter((t) => showHand || t.tool !== 'hand').map(({ tool, label, icon: Icon, shortcut }) => (
        <Tooltip key={tool}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={compact ? 'icon-sm' : 'icon'}
              aria-label={label}
              aria-pressed={prefs.tool === tool}
              className={cn(prefs.tool === tool && 'bg-accent text-foreground')}
              onClick={() => setDrawing({ tool })}
            >
              <Icon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {label} <span className="opacity-60">· {shortcut}</span>
          </TooltipContent>
        </Tooltip>
      ))}

      {showColors && (
        <>
          <Separator orientation="vertical" className="mx-1 h-5!" />
          <div className="flex items-center gap-1 px-1">
            {colors.map((c) => (
              <button
                key={c}
                aria-label={`Color ${c}`}
                onClick={() =>
                  setDrawing(prefs.tool === 'highlighter' ? { highlighterColor: c } : { penColor: c })
                }
                className={cn(
                  'size-5 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110',
                  activeColor === c && 'ring-2 ring-ring',
                )}
                style={{ background: resolveColor(c), opacity: prefs.tool === 'highlighter' ? 0.75 : 1 }}
              />
            ))}
          </div>
        </>
      )}

      {prefs.tool !== 'hand' && (
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size={compact ? 'icon-sm' : 'icon'} aria-label="Stroke size">
                  <span
                    className="rounded-full bg-foreground"
                    style={{ width: Math.max(3, Math.min(16, size / 2)), height: Math.max(3, Math.min(16, size / 2)) }}
                  />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Size</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-60" side="bottom">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium capitalize">{prefs.tool} size</span>
              <span className="text-muted-foreground tabular-nums">{size}px</span>
            </div>
            <Slider
              min={sizeRange[0]}
              max={sizeRange[1]}
              step={1}
              value={[size]}
              onValueChange={([v]) => setDrawing({ [sizeKey]: v })}
            />
            <div className="mt-4 flex h-12 items-center justify-center rounded-md bg-muted/60">
              <span
                className="rounded-full"
                style={{
                  width: prefs.tool === 'eraser' ? size : 120,
                  height: size,
                  background: prefs.tool === 'eraser' ? 'transparent' : resolveColor(activeColor),
                  border: prefs.tool === 'eraser' ? '1.5px dashed var(--muted-foreground)' : undefined,
                  opacity: prefs.tool === 'highlighter' ? 0.4 : 1,
                }}
              />
            </div>
          </PopoverContent>
        </Popover>
      )}

      <Separator orientation="vertical" className="mx-1 h-5!" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size={compact ? 'icon-sm' : 'icon'} onClick={onUndo} disabled={!canUndo} aria-label="Undo">
            <Undo2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Undo <span className="opacity-60">· ⌘Z</span>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size={compact ? 'icon-sm' : 'icon'} onClick={onRedo} disabled={!canRedo} aria-label="Redo">
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
                size={compact ? 'icon-sm' : 'icon'}
                aria-label="Input settings"
                className={cn(prefs.stylusOnly && 'text-blue-600 dark:text-blue-400')}
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
            <Switch checked={prefs.stylusOnly} onCheckedChange={(stylusOnly) => setDrawing({ stylusOnly })} />
          </label>
          {onClear && (
            <>
              <Separator className="my-3" />
              <Button variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive" onClick={onClear}>
                <Trash2 /> Clear drawing
              </Button>
            </>
          )}
        </PopoverContent>
      </Popover>

      {children}
    </div>
  )
}
