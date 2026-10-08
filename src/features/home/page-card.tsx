import { BookOpen, Infinity as InfinityIcon } from 'lucide-react'

import { PageGlyph } from '@/features/page/page-icon'
import { StrokeThumbnail } from '@/features/page/stroke-thumbnail'
import { openPage } from '@/hooks/use-route'
import type { Page } from '@/lib/types'
import { timeAgo } from '@/lib/time'
import { pagePlainText, pageTitle } from '@/store/workspace'

export function PageCard({ page }: { page: Page }) {
  const preview = pagePlainText(page)
  return (
    <button
      onClick={() => openPage(page.id)}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card text-left shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative h-28 overflow-hidden border-b bg-muted/40" style={page.kind === 'note' && page.cover ? { background: page.cover } : undefined}>
        {page.kind === 'canvas' ? (
          <div className="absolute inset-0 bg-paper p-2">
            <StrokeThumbnail canvas={page.canvas} />
          </div>
        ) : (
          !page.cover && (
            <p className="line-clamp-4 p-3 text-[11px] leading-relaxed text-muted-foreground">{preview || 'Empty page'}</p>
          )
        )}
        {page.kind === 'canvas' && (
          <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full border bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur">
            {page.canvas.mode === 'page' ? <BookOpen className="size-3" /> : <InfinityIcon className="size-3" />}
            {page.canvas.mode === 'page' ? 'Pages' : 'Infinite'}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 p-3">
        <div className="relative -mt-7 mb-1 flex size-8 items-center justify-center rounded-md bg-card text-xl">
          <PageGlyph page={page} />
        </div>
        <span className="truncate text-sm font-medium">{pageTitle(page)}</span>
        <span className="text-xs text-muted-foreground">{timeAgo(page.updatedAt)}</span>
      </div>
    </button>
  )
}
