import { useState } from 'react'
import {
  BookOpen,
  ChevronRight,
  ChevronsLeft,
  ChevronsUpDown,
  FileDown,
  FilePlus2,
  Home,
  Infinity as InfinityIcon,
  Monitor,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Sun,
  Trash2,
  Undo2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { pickMarkdownFiles } from '@/features/markdown/files'
import { closeSidebarOnMobile, newCanvas, newNote } from '@/features/page/actions'
import { PageGlyph } from '@/features/page/page-icon'
import { PageMenuItems } from '@/features/page/page-menu'
import { navigate, openPage, useRoute } from '@/hooks/use-route'
import type { ID, Page } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useUI, type Theme } from '@/store/ui'
import { byCreated, childrenOf, pageTitle, useWorkspace } from '@/store/workspace'

export function Sidebar() {
  const open = useUI((s) => s.sidebarOpen)
  const setOpen = useUI((s) => s.setSidebarOpen)
  const setSearchOpen = useUI((s) => s.setSearchOpen)
  const pages = useWorkspace((s) => s.pages)
  const route = useRoute()

  const roots = childrenOf(pages, null)
  const favorites = Object.values(pages)
    .filter((p) => p.favorite && !p.trashedAt)
    .sort(byCreated)

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/30 transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setOpen(false)}
      />
      <aside
        className={cn(
          'group/sidebar z-40 flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[margin,transform] duration-200 ease-out',
          'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:shadow-xl',
          open ? 'translate-x-0' : 'max-md:-translate-x-full md:-ml-64',
        )}
        aria-label="Sidebar"
      >
        {/* Workspace */}
        <div className="flex items-center gap-1 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-sidebar-accent">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-xs font-semibold text-background">
                  J
                </span>
                <span className="truncate text-sm font-semibold text-sidebar-accent-foreground">Jot to Go</span>
                <ChevronsUpDown className="ml-auto size-3.5 shrink-0 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              <DropdownMenuLabel>Workspace</DropdownMenuLabel>
              <DropdownMenuItem>
                <span className="flex size-5 items-center justify-center rounded bg-foreground text-[10px] font-semibold text-background">
                  J
                </span>
                Jot to Go
                <span className="ml-auto text-xs text-muted-foreground">Local</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>Sign in to sync (coming soon)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground opacity-0 transition-opacity group-hover/sidebar:opacity-100 max-md:opacity-100"
                onClick={() => setOpen(false)}
                aria-label="Close sidebar"
              >
                <ChevronsLeft />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Close sidebar <span className="opacity-60">· ⌘\</span>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Primary nav */}
        <nav className="flex flex-col gap-px px-2">
          <NavItem icon={Search} label="Search" shortcut="⌘K" onClick={() => setSearchOpen(true)} />
          <NavItem
            icon={Home}
            label="Home"
            active={route.name === 'home'}
            onClick={() => {
              navigate({ name: 'home' })
              closeSidebarOnMobile()
            }}
          />
          <NewMenu>
            <NavItem icon={Plus} label="New page" />
          </NewMenu>
        </nav>

        <ScrollArea className="mt-3 min-h-0 flex-1">
          <div className="flex flex-col gap-4 px-2 pb-4">
            {favorites.length > 0 && (
              <Section title="Favorites">
                {favorites.map((p) => (
                  <PageTreeItem key={p.id} page={p} depth={0} activeId={route.name === 'page' ? route.id : null} flat />
                ))}
              </Section>
            )}
            <Section
              title="Pages"
              action={
                <NewMenu>
                  <button
                    className="flex size-5 items-center justify-center rounded opacity-0 group-hover/section:opacity-100 hover:bg-sidebar-accent max-md:opacity-100"
                    aria-label="New page"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </NewMenu>
              }
            >
              {roots.map((p) => (
                <PageTreeItem key={p.id} page={p} depth={0} activeId={route.name === 'page' ? route.id : null} />
              ))}
              {roots.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground">No pages yet.</p>
              )}
            </Section>
          </div>
        </ScrollArea>

        <div className="flex flex-col gap-px border-t border-sidebar-border p-2">
          <TrashPopover />
          <ThemeMenu />
        </div>
      </aside>
    </>
  )
}

// ---------------------------------------------------------------------------

function NavItem({
  icon: Icon,
  label,
  shortcut,
  active,
  onClick,
  ...props
}: {
  icon: typeof Home
  label: string
  shortcut?: string
  active?: boolean
  onClick?: () => void
} & React.ComponentProps<'button'>) {
  return (
    <button
      {...props}
      onClick={onClick}
      className={cn(
        'flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-sm font-medium hover:bg-sidebar-accent',
        active && 'bg-sidebar-accent text-sidebar-accent-foreground',
      )}
    >
      <Icon className="size-4 shrink-0 opacity-70" strokeWidth={1.75} />
      <span className="truncate">{label}</span>
      {shortcut && <kbd className="ml-auto text-xs font-normal text-muted-foreground">{shortcut}</kbd>}
    </button>
  )
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="group/section">
      <div className="flex h-7 items-center justify-between px-2 text-xs font-medium text-muted-foreground">
        {title}
        {action}
      </div>
      <div className="flex flex-col gap-px">{children}</div>
    </div>
  )
}

function NewMenu({ children, parentId = null }: { children: React.ReactNode; parentId?: ID | null }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuItem
          onSelect={() => {
            newNote(parentId)
            closeSidebarOnMobile()
          }}
          className="items-start"
        >
          <FilePlus2 className="mt-0.5" />
          <div>
            <div className="font-medium">Note</div>
            <div className="text-xs text-muted-foreground">Type with blocks, add sketches inline</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            newCanvas('page', parentId)
            closeSidebarOnMobile()
          }}
          className="items-start"
        >
          <BookOpen className="mt-0.5" />
          <div>
            <div className="font-medium">Canvas · Pages</div>
            <div className="text-xs text-muted-foreground">Handwrite on paper sheets like a notebook</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            newCanvas('infinite', parentId)
            closeSidebarOnMobile()
          }}
          className="items-start"
        >
          <InfinityIcon className="mt-0.5" />
          <div>
            <div className="font-medium">Canvas · Infinite</div>
            <div className="text-xs text-muted-foreground">A boundless board for ideas and diagrams</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            pickMarkdownFiles(parentId)
            closeSidebarOnMobile()
          }}
          className="items-start"
        >
          <FileDown className="mt-0.5" />
          <div>
            <div className="font-medium">Import Markdown…</div>
            <div className="text-xs text-muted-foreground">Turn .md files into notes (or drop them anywhere)</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PageTreeItem({
  page,
  depth,
  activeId,
  flat,
}: {
  page: Page
  depth: number
  activeId: ID | null
  flat?: boolean
}) {
  const pages = useWorkspace((s) => s.pages)
  const expanded = useUI((s) => !!s.expanded[page.id])
  const toggleExpanded = useUI((s) => s.toggleExpanded)
  const children = flat ? [] : childrenOf(pages, page.id)
  const active = activeId === page.id

  return (
    <div>
      <div
        className={cn(
          'group/item flex h-8 cursor-pointer items-center gap-1 rounded-md pr-1 text-sm hover:bg-sidebar-accent',
          active && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
        )}
        style={{ paddingLeft: 4 + depth * 14 }}
        onClick={() => {
          openPage(page.id)
          closeSidebarOnMobile()
        }}
      >
        <span className="relative flex size-6 shrink-0 items-center justify-center">
          <span className={cn('flex items-center justify-center', !flat && 'group-hover/item:opacity-0')}>
            <PageGlyph page={page} className="text-[15px]" />
          </span>
          {!flat && (
            <button
              className="absolute inset-0 flex items-center justify-center rounded opacity-0 group-hover/item:opacity-100 hover:bg-foreground/10"
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded(page.id)
              }}
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              <ChevronRight className={cn('size-3.5 transition-transform', expanded && 'rotate-90')} />
            </button>
          )}
        </span>
        <span className="min-w-0 flex-1 truncate">{pageTitle(page)}</span>
        <span
          className="flex items-center opacity-0 group-hover/item:opacity-100 has-[[data-state=open]]:opacity-100 max-md:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex size-6 items-center justify-center rounded hover:bg-foreground/10" aria-label="Page options">
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <PageMenuItems page={page} />
            </DropdownMenuContent>
          </DropdownMenu>
          {!flat && (
            <NewMenu parentId={page.id}>
              <button className="flex size-6 items-center justify-center rounded hover:bg-foreground/10" aria-label="Add a page inside">
                <Plus className="size-4" />
              </button>
            </NewMenu>
          )}
        </span>
      </div>
      {!flat && expanded && (
        <div className="flex flex-col gap-px">
          {children.length ? (
            children.map((c) => <PageTreeItem key={c.id} page={c} depth={depth + 1} activeId={activeId} />)
          ) : (
            <div className="h-7 text-xs leading-7 text-muted-foreground/70" style={{ paddingLeft: 32 + depth * 14 }}>
              No pages inside
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TrashPopover() {
  const pages = useWorkspace((s) => s.pages)
  const restorePage = useWorkspace((s) => s.restorePage)
  const deletePage = useWorkspace((s) => s.deletePage)
  const [query, setQuery] = useState('')
  // Only list top-most trashed pages; their children come along on restore.
  const trashed = Object.values(pages)
    .filter((p) => p.trashedAt && !(p.parentId && pages[p.parentId]?.trashedAt))
    .filter((p) => pageTitle(p).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (b.trashedAt ?? 0) - (a.trashedAt ?? 0))

  return (
    <Popover>
      <PopoverTrigger asChild>
        <NavItem icon={Trash2} label="Trash" />
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-80 p-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter trashed pages…"
          className="mb-2 h-8 w-full rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <div className="max-h-72 overflow-y-auto">
          {trashed.length === 0 && (
            <div className="flex flex-col items-center gap-1 py-6 text-center text-sm text-muted-foreground">
              <Trash2 className="size-5 opacity-60" />
              Trash is empty
            </div>
          )}
          {trashed.map((p) => (
            <div key={p.id} className="group/t flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent">
              <PageGlyph page={p} />
              <span className="min-w-0 flex-1 truncate">{pageTitle(p)}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="size-6" onClick={() => restorePage(p.id)} aria-label="Restore">
                    <Undo2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Restore</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-6 hover:text-destructive"
                    onClick={() => deletePage(p.id)}
                    aria-label="Delete forever"
                  >
                    <Trash2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete forever</TooltipContent>
              </Tooltip>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

function ThemeMenu() {
  const theme = useUI((s) => s.theme)
  const setTheme = useUI((s) => s.setTheme)
  const current = THEMES.find((t) => t.value === theme) ?? THEMES[2]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NavItem icon={current.icon} label={`Theme · ${current.label}`} />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="w-40">
        {THEMES.map((t) => (
          <DropdownMenuItem key={t.value} onSelect={() => setTheme(t.value)}>
            <t.icon /> {t.label}
            {theme === t.value && <span className="ml-auto size-1.5 rounded-full bg-foreground" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
