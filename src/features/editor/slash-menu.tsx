import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'
import type { BlockTypeInfo } from './block-types'

interface SlashMenuProps {
  items: BlockTypeInfo[]
  index: number
  anchor: DOMRect
  onHover: (index: number) => void
  onSelect: (item: BlockTypeInfo) => void
  onClose: () => void
}

const MENU_HEIGHT = 340

export function SlashMenu({ items, index, anchor, onHover, onSelect, onClose }: SlashMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const below = anchor.bottom + 6 + MENU_HEIGHT < window.innerHeight
  const pos = {
    top: below ? anchor.bottom + 6 : Math.max(8, anchor.top - MENU_HEIGHT - 6),
    left: Math.max(8, Math.min(anchor.left, window.innerWidth - 300)),
  }

  useEffect(() => {
    ref.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [index])

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [onClose])

  return createPortal(
    <div
      ref={ref}
      className="fixed z-50 w-72 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.preventDefault()} // keep focus in the block
    >
      <div className="max-h-[340px] overflow-y-auto p-1">
        <div className="px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">Basic blocks</div>
        {items.length === 0 && <div className="px-2 py-3 text-sm text-muted-foreground">No results</div>}
        {items.map((item, i) => (
          <button
            key={item.type}
            data-index={i}
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left',
              i === index && 'bg-accent',
            )}
            onMouseMove={() => i !== index && onHover(i)}
            onClick={() => onSelect(item)}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-background">
              <item.icon className="size-5 text-muted-foreground" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
            </span>
            {item.hint && <kbd className="font-mono text-xs text-muted-foreground">{item.hint}</kbd>}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  )
}
