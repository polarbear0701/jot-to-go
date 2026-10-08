import type { ReactNode } from 'react'
import { BookOpen, Copy, FilePlus2, Infinity as InfinityIcon, Star, StarOff, Trash2 } from 'lucide-react'

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { navigate, openPage, useRoute } from '@/hooks/use-route'
import type { Page } from '@/lib/types'
import { useWorkspace } from '@/store/workspace'
import { newCanvas, newNote } from './actions'

/** Common menu items for a page (used in sidebar "…" and the top bar). */
export function PageMenuItems({ page, extra }: { page: Page; extra?: ReactNode }) {
  const route = useRoute()
  const { toggleFavorite, duplicatePage, trashPage } = useWorkspace.getState()
  return (
    <>
      <DropdownMenuItem onSelect={() => toggleFavorite(page.id)}>
        {page.favorite ? <StarOff /> : <Star />}
        {page.favorite ? 'Remove from favorites' : 'Add to favorites'}
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => {
          const id = duplicatePage(page.id)
          if (id) openPage(id)
        }}
      >
        <Copy /> Duplicate
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <FilePlus2 /> Add inside
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-48">
          <DropdownMenuItem onSelect={() => newNote(page.id)}>
            <FilePlus2 /> Note
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => newCanvas('page', page.id)}>
            <BookOpen /> Canvas · Pages
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => newCanvas('infinite', page.id)}>
            <InfinityIcon /> Canvas · Infinite
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      {extra}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        onSelect={() => {
          trashPage(page.id)
          if (route.name === 'page' && route.id === page.id) navigate({ name: 'home' })
        }}
      >
        <Trash2 /> Move to trash
      </DropdownMenuItem>
    </>
  )
}
