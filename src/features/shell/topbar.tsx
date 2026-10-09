import { ChevronsRight, Copy, Download, FileCode2, Menu, MoreHorizontal, Share2, Star } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { copyMarkdown, downloadMarkdown } from '@/features/markdown/files'
import { PageGlyph } from '@/features/page/page-icon'
import { PageMenuItems } from '@/features/page/page-menu'
import { openPage } from '@/hooks/use-route'
import type { Page } from '@/lib/types'
import { timeAgo } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useUI } from '@/store/ui'
import { breadcrumbsOf, pageTitle, useWorkspace } from '@/store/workspace'

export function Topbar({ page, title }: { page?: Page; title?: string }) {
  const sidebarOpen = useUI((s) => s.sidebarOpen)
  const setSidebarOpen = useUI((s) => s.setSidebarOpen)
  const pages = useWorkspace((s) => s.pages)
  const toggleFavorite = useWorkspace((s) => s.toggleFavorite)
  const updatePage = useWorkspace((s) => s.updatePage)
  const noteView = useUI((s) => s.noteView)
  const setNoteView = useUI((s) => s.setNoteView)
  const trail = page ? breadcrumbsOf(pages, page.id) : []

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-transparent bg-background px-2 sm:px-3">
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn('text-muted-foreground', sidebarOpen && 'md:hidden')}
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <Menu className="md:hidden" />
        <ChevronsRight className="max-md:hidden" />
      </Button>

      <nav className="flex min-w-0 flex-1 items-center gap-0.5 text-sm" aria-label="Breadcrumb">
        {title && <span className="px-1.5 font-medium">{title}</span>}
        {trail.map((p, i) => (
          <div key={p.id} className={cn('flex min-w-0 items-center gap-0.5', i < trail.length - 2 && 'max-sm:hidden')}>
            {i > 0 && <span className="text-muted-foreground/50">/</span>}
            <button
              onClick={() => openPage(p.id)}
              className={cn(
                'flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-accent',
                i === trail.length - 1 ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <PageGlyph page={p} className="text-sm" />
              <span className="max-w-[16ch] truncate sm:max-w-[24ch]">{pageTitle(p)}</span>
            </button>
          </div>
        ))}
      </nav>

      {page && (
        <div className="flex shrink-0 items-center gap-0.5">
          <span className="mr-2 hidden text-xs text-muted-foreground lg:inline">Edited {timeAgo(page.updatedAt)}</span>
          {page.kind === 'note' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn('h-7 px-2', noteView === 'markdown' && 'bg-accent text-foreground')}
                  aria-pressed={noteView === 'markdown'}
                  onClick={() => setNoteView(noteView === 'markdown' ? 'blocks' : 'markdown')}
                >
                  <FileCode2 /> <span className="max-sm:hidden">Markdown</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{noteView === 'markdown' ? 'Back to the block editor' : 'View and edit as Markdown'}</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 max-sm:hidden" disabled>
                <Share2 /> Share
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sharing arrives with the backend</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => toggleFavorite(page.id)}
                aria-label={page.favorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star className={cn(page.favorite && 'fill-amber-400 text-amber-400')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{page.favorite ? 'Remove from favorites' : 'Add to favorites'}</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>{page.kind === 'note' ? 'Note' : 'Canvas'}</DropdownMenuLabel>
              {page.kind === 'note' && (
                <>
                  <DropdownMenuCheckboxItem
                    checked={page.fullWidth}
                    onCheckedChange={(fullWidth) => updatePage(page.id, { fullWidth })}
                  >
                    Full width
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void copyMarkdown(page)}>
                    <Copy /> Copy as Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => downloadMarkdown(page)}>
                    <Download /> Export as Markdown (.md)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <PageMenuItems page={page} />
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                Created {new Date(page.createdAt).toLocaleDateString()}
                <br />
                Edited {timeAgo(page.updatedAt)}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </header>
  )
}
