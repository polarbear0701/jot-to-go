import { useState } from 'react'
import { FileText, PenLine } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Page } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/workspace'

export const EMOJIS = [
  '📝', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '🗒️', '🗓️', '📌',
  '✏️', '🖊️', '🖍️', '🎨', '🧠', '💡', '🚀', '⭐', '🔥', '✨', '🌱', '🌿',
  '🍀', '🌸', '🌊', '☀️', '🌙', '⚡', '🎯', '🏁', '📈', '🧪', '🔬', '🧩',
  '🎵', '🎬', '📷', '✈️', '🏠', '🍳', '☕', '🍎', '💼', '🗂️', '🔖', '👋',
]

/** Emoji icon, falling back to a kind-specific glyph. */
export function PageGlyph({ page, className }: { page: Pick<Page, 'icon' | 'kind'>; className?: string }) {
  if (page.icon) return <span className={cn('leading-none', className)}>{page.icon}</span>
  const Icon = page.kind === 'canvas' ? PenLine : FileText
  return <Icon className={cn('size-4 text-muted-foreground', className)} strokeWidth={1.75} />
}

export function EmojiPicker({ onPick, onRemove }: { onPick: (emoji: string) => void; onRemove?: () => void }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Icon</span>
        {onRemove && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>
      <div className="grid grid-cols-8 gap-0.5">
        {EMOJIS.map((e) => (
          <button
            key={e}
            className="flex size-8 items-center justify-center rounded-md text-lg hover:bg-accent"
            onClick={() => onPick(e)}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}

export function PageIconButton({ page, size = 'lg' }: { page: Page; size?: 'sm' | 'lg' }) {
  const [open, setOpen] = useState(false)
  const updatePage = useWorkspace((s) => s.updatePage)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center justify-center rounded-md transition-colors hover:bg-accent',
            size === 'lg' ? 'size-20 text-[64px]' : 'size-7 text-base',
          )}
          aria-label="Change icon"
        >
          <PageGlyph page={page} className={size === 'lg' ? 'size-12' : undefined} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <EmojiPicker
          onPick={(icon) => {
            updatePage(page.id, { icon })
            setOpen(false)
          }}
          onRemove={
            page.icon
              ? () => {
                  updatePage(page.id, { icon: null })
                  setOpen(false)
                }
              : undefined
          }
        />
      </PopoverContent>
    </Popover>
  )
}
