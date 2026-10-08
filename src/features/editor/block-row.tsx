import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, Copy, GripVertical, Plus, Repeat2, Trash2 } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Block, BlockType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { BLOCK_TYPES } from './block-types'

export interface RowActions {
  insertBelow: (id: string) => void
  turnInto: (id: string, type: BlockType) => void
  duplicate: (id: string) => void
  move: (id: string, dir: -1 | 1) => void
  remove: (id: string) => void
}

/** Vertical offset / height of the first line, so the handle lines up with it. */
const HANDLE_BOX: Partial<Record<BlockType, string>> = {
  heading1: 'h-[42px]',
  heading2: 'h-[34px]',
  heading3: 'h-[30px]',
  callout: 'top-3 h-7',
  code: 'top-3.5 h-7',
  sketch: 'top-0 h-7',
  divider: 'top-1 h-7',
}

const SPACING: Partial<Record<BlockType, string>> = {
  heading1: 'mt-8 mb-1',
  heading2: 'mt-6 mb-px',
  heading3: 'mt-4 mb-px',
  callout: 'my-1',
  code: 'my-1',
  quote: 'my-1',
  sketch: 'mt-14 mb-3',
}

interface BlockRowProps {
  block: Block
  index: number
  count: number
  actions: RowActions
  children: ReactNode
}

export function BlockRow({ block, index, count, actions, children }: BlockRowProps) {
  return (
    <div className={cn('group/row relative flex', SPACING[block.type] ?? 'my-px')} data-block-id={block.id}>
      <div
        className={cn(
          'absolute top-0 -left-14 flex h-[34px] w-14 items-center justify-end gap-0.5 pr-1.5 opacity-0 transition-opacity group-hover/row:opacity-100 has-[[data-state=open]]:opacity-100 max-sm:-left-6 max-sm:w-6 max-sm:pr-0',
          HANDLE_BOX[block.type],
        )}
        contentEditable={false}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="flex size-6 items-center justify-center rounded text-muted-foreground/70 hover:bg-accent hover:text-foreground max-sm:hidden"
              onClick={() => actions.insertBelow(block.id)}
              aria-label="Add block below"
            >
              <Plus className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <b>Click</b> to add below
          </TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-6 w-5 items-center justify-center rounded text-muted-foreground/70 hover:bg-accent hover:text-foreground data-[state=open]:bg-accent"
              aria-label="Block options"
            >
              <GripVertical className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="left" className="w-52">
            {block.type !== 'divider' && block.type !== 'sketch' && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Repeat2 /> Turn into
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48">
                  {BLOCK_TYPES.filter((t) => t.type !== 'divider' && t.type !== 'sketch').map((t) => (
                    <DropdownMenuItem key={t.type} onSelect={() => actions.turnInto(block.id, t.type)}>
                      <t.icon /> {t.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            <DropdownMenuItem onSelect={() => actions.duplicate(block.id)}>
              <Copy /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === 0} onSelect={() => actions.move(block.id, -1)}>
              <ArrowUp /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === count - 1} onSelect={() => actions.move(block.id, 1)}>
              <ArrowDown /> Move down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => actions.remove(block.id)}>
              <Trash2 /> Delete
              <DropdownMenuShortcut>Del</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="min-w-0 flex-1">
        {block.type === 'divider' ? (
          <div className="flex h-9 items-center">
            <hr className="w-full border-border" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
