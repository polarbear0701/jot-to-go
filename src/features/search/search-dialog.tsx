import { useMemo, useState } from 'react'
import { BookOpen, CornerDownLeft, FilePlus2, Infinity as InfinityIcon, Search } from 'lucide-react'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { newCanvas, newNote } from '@/features/page/actions'
import { PageGlyph } from '@/features/page/page-icon'
import { openPage } from '@/hooks/use-route'
import { timeAgo } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useUI } from '@/store/ui'
import { pagePlainText, pageTitle, useWorkspace } from '@/store/workspace'

interface Item {
  key: string
  label: string
  hint?: string
  icon: React.ReactNode
  run: () => void
}

export function SearchDialog() {
  const open = useUI((s) => s.searchOpen)
  const setOpen = useUI((s) => s.setSearchOpen)
  const pages = useWorkspace((s) => s.pages)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase()
    const found = Object.values(pages)
      .filter((p) => !p.trashedAt)
      .filter((p) => !q || pageTitle(p).toLowerCase().includes(q) || pagePlainText(p).toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 12)
      .map<Item>((p) => ({
        key: p.id,
        label: pageTitle(p),
        hint: timeAgo(p.updatedAt),
        icon: <PageGlyph page={p} />,
        run: () => openPage(p.id),
      }))
    const actions: Item[] = [
      { key: 'new-note', label: 'New note', icon: <FilePlus2 className="size-4" />, run: () => newNote() },
      { key: 'new-pages', label: 'New canvas · Pages', icon: <BookOpen className="size-4" />, run: () => newCanvas('page') },
      { key: 'new-infinite', label: 'New canvas · Infinite', icon: <InfinityIcon className="size-4" />, run: () => newCanvas('infinite') },
    ].filter((a) => !q || a.label.toLowerCase().includes(q))
    return [...found, ...actions]
  }, [pages, query])

  const close = () => {
    setOpen(false)
    setQuery('')
    setIndex(0)
  }
  const run = (item?: Item) => {
    if (!item) return
    item.run()
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">Search pages or run a command</DialogDescription>
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIndex(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setIndex((i) => Math.min(items.length - 1, i + 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setIndex((i) => Math.max(0, i - 1))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                run(items[index])
              }
            }}
            placeholder="Search pages or type a command…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border px-1.5 text-[10px] text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {items.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No results</p>}
          {items.map((item, i) => (
            <button
              key={item.key}
              onMouseMove={() => setIndex(i)}
              onClick={() => run(item)}
              className={cn('flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-left text-sm', i === index && 'bg-accent')}
            >
              <span className="flex size-5 items-center justify-center text-base">{item.icon}</span>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.hint && <span className="text-xs text-muted-foreground">{item.hint}</span>}
              {i === index && <CornerDownLeft className="size-3.5 text-muted-foreground" />}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
