import { useCallback, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ImageIcon, SmilePlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { markdownToBlocks } from '@/features/markdown/markdown'
import { COVERS, randomCover } from '@/features/page/covers'
import { EmojiPicker, PageIconButton } from '@/features/page/page-icon'
import type { Block, NotePage, SketchBlock, TextBlock } from '@/lib/types'
import { isTextBlock } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/workspace'
import { BlockRow } from './block-row'
import { BlockText } from './block-text'
import { CONTINUING_TYPES, MARKDOWN_SHORTCUTS, createBlock, filterBlockTypes, type BlockTypeInfo } from './block-types'
import {
  getCaretOffset,
  getCaretRect,
  getSelectionOffsets,
  hasSelection,
  isCaretOnFirstLine,
  isCaretOnLastLine,
  setCaretOffset,
  setSelectionOffsets,
} from './caret'
import { EditableText } from './editable-text'
import { SketchBlockView } from './sketch-block'
import { SlashMenu } from './slash-menu'

type CaretTarget = number | 'start' | 'end'

interface SlashState {
  blockId: string
  /** Offset of the "/" character. */
  start: number
  query: string
  index: number
  anchor: DOMRect
}

const insertText = (text: string) => document.execCommand('insertText', false, text)

/** Inline Markdown markers toggled by ⌘B / ⌘I / ⌘E / ⌘⇧S. */
function formatMarker(e: KeyboardEvent): string | null {
  if (!(e.metaKey || e.ctrlKey) || e.altKey) return null
  const k = e.key.toLowerCase()
  if (!e.shiftKey && k === 'b') return '**'
  if (!e.shiftKey && k === 'i') return '*'
  if (!e.shiftKey && k === 'e') return '`'
  if (e.shiftKey && k === 's') return '~~'
  return null
}

/** Wraps the selection in `marker` (or unwraps it if it is already wrapped). */
function toggleWrap(el: HTMLElement, marker: string) {
  const text = el.textContent ?? ''
  const [start, end] = getSelectionOffsets(el)
  const selected = text.slice(start, end)
  const m = marker.length
  if (text.slice(start - m, start) === marker && text.slice(end, end + m) === marker) {
    setSelectionOffsets(el, start - m, end + m)
    insertText(selected)
    setSelectionOffsets(el, start - m, end - m)
  } else {
    insertText(marker + selected + marker)
    setSelectionOffsets(el, start + m, end + m)
  }
}

/** ⌘K: turn the selection into a Markdown link and select the URL placeholder. */
function insertLink(el: HTMLElement) {
  const text = el.textContent ?? ''
  const [start, end] = getSelectionOffsets(el)
  const label = text.slice(start, end) || 'link'
  const url = 'https://'
  insertText(`[${label}](${url})`)
  const urlStart = start + label.length + 3
  setSelectionOffsets(el, urlStart, urlStart + url.length)
}

export function NoteEditor({ page }: { page: NotePage }) {
  const setBlocks = useWorkspace((s) => s.setBlocks)
  const updatePage = useWorkspace((s) => s.updatePage)

  const blocksRef = useRef(page.blocks)
  blocksRef.current = page.blocks
  const commit = useCallback((next: Block[]) => setBlocks(page.id, next), [page.id, setBlocks])

  // ---- Focus management ---------------------------------------------------------
  const els = useRef(new Map<string, HTMLElement>())
  const titleEl = useRef<HTMLElement | null>(null)
  const pendingFocus = useRef<{ id: string; offset: CaretTarget; openSlash?: boolean } | null>(null)
  const [slash, setSlash] = useState<SlashState | null>(null)

  useLayoutEffect(() => {
    const p = pendingFocus.current
    if (!p) return
    const el = els.current.get(p.id)
    if (!el) return
    pendingFocus.current = null
    setCaretOffset(el, p.offset)
    if (p.openSlash) {
      const offset = getCaretOffset(el) - 1
      setSlash({ blockId: p.id, start: offset, query: '', index: 0, anchor: getCaretRect() ?? el.getBoundingClientRect() })
    }
  })

  const focusBlock = (id: string, offset: CaretTarget) => {
    const el = els.current.get(id)
    if (el) setCaretOffset(el, offset)
    else pendingFocus.current = { id, offset }
  }

  const registerEl = useCallback((id: string) => (el: HTMLElement | null) => {
    if (el) els.current.set(id, el)
    else els.current.delete(id)
  }, [])

  // ---- Block operations ---------------------------------------------------------
  const replaceBlock = (id: string, ...replacement: Block[]) => {
    const blocks = blocksRef.current
    const i = blocks.findIndex((b) => b.id === id)
    if (i < 0) return
    commit([...blocks.slice(0, i), ...replacement, ...blocks.slice(i + 1)])
  }

  const updateBlock = (id: string, patch: Partial<TextBlock> | Partial<SketchBlock>) => {
    commit(blocksRef.current.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)))
  }

  const removeBlock = (id: string) => {
    const next = blocksRef.current.filter((b) => b.id !== id)
    commit(next.length ? next : [createBlock('paragraph')])
  }

  const textNeighbour = (index: number, dir: -1 | 1) => {
    const blocks = blocksRef.current
    for (let i = index + dir; i >= 0 && i < blocks.length; i += dir) {
      if (isTextBlock(blocks[i])) return blocks[i] as TextBlock
    }
    return null
  }

  // ---- Slash menu -------------------------------------------------------------------
  const slashItems = useMemo(() => (slash ? filterBlockTypes(slash.query) : []), [slash])

  const applySlash = (item: BlockTypeInfo) => {
    if (!slash) return
    const block = blocksRef.current.find((b) => b.id === slash.blockId)
    setSlash(null)
    if (!block || !isTextBlock(block)) return
    const text = block.text.slice(0, slash.start) + block.text.slice(slash.start + 1 + slash.query.length)
    const empty = text.trim() === ''

    if (item.type === 'divider' || item.type === 'sketch') {
      const inserted = createBlock(item.type)
      const after = createBlock('paragraph')
      if (empty) replaceBlock(block.id, inserted, after)
      else replaceBlock(block.id, { ...block, text }, inserted, after)
      pendingFocus.current = { id: after.id, offset: 'start' }
      return
    }
    if (empty) {
      replaceBlock(block.id, {
        id: block.id,
        type: item.type,
        text: '',
        ...(item.type === 'todo' ? { checked: false } : {}),
      } as TextBlock)
      pendingFocus.current = { id: block.id, offset: 'start' }
    } else {
      const next = createBlock(item.type)
      replaceBlock(block.id, { ...block, text }, next)
      pendingFocus.current = { id: next.id, offset: 'start' }
    }
  }

  // ---- Text input -------------------------------------------------------------------
  const onTextChange = (block: TextBlock, text: string, el: HTMLElement) => {
    if (block.type === 'paragraph') {
      const caret = getCaretOffset(el)
      for (const [prefix, type, extra] of MARKDOWN_SHORTCUTS) {
        if (!text.startsWith(prefix) || caret !== prefix.length) continue
        const rest = text.slice(prefix.length)
        setSlash(null)
        if (type === 'divider' || type === 'sketch') {
          const next = createBlock('paragraph', rest)
          replaceBlock(block.id, createBlock(type), next)
          pendingFocus.current = { id: next.id, offset: 'start' }
        } else {
          replaceBlock(block.id, { id: block.id, type, text: rest, ...(type === 'todo' ? { checked: !!extra?.checked } : {}) })
          pendingFocus.current = { id: block.id, offset: 'start' }
        }
        return
      }
    }

    if (slash && slash.blockId === block.id) {
      const caret = getCaretOffset(el)
      const query = text.slice(slash.start + 1, caret)
      if (caret <= slash.start || text[slash.start] !== '/' || query.length > 24 || /\s{2}/.test(query)) {
        setSlash(null)
      } else if (query !== slash.query) {
        setSlash({ ...slash, query, index: 0 })
      }
    }
    updateBlock(block.id, { text })
  }

  const onTextKeyDown = (e: KeyboardEvent<HTMLDivElement>, block: TextBlock, index: number, el: HTMLElement) => {
    if (e.nativeEvent.isComposing) return

    // Slash menu navigation
    if (slash && slash.blockId === block.id) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const n = slashItems.length || 1
        setSlash({ ...slash, index: (slash.index + (e.key === 'ArrowDown' ? 1 : -1) + n) % n })
        return
      }
      if ((e.key === 'Enter' || e.key === 'Tab') && slashItems.length) {
        e.preventDefault()
        applySlash(slashItems[slash.index])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setSlash(null)
        return
      }
      if (e.key === 'Enter') setSlash(null)
    }

    if (e.key === '/' && block.type !== 'code') {
      const caret = getCaretOffset(el)
      const prev = block.text[caret - 1]
      if (caret === 0 || /\s/.test(prev)) {
        // Open after the "/" has been inserted so the caret rect is correct.
        requestAnimationFrame(() =>
          setSlash({ blockId: block.id, start: caret, query: '', index: 0, anchor: getCaretRect() ?? el.getBoundingClientRect() }),
        )
      }
      return
    }

    const mod = e.metaKey || e.ctrlKey
    const caret = () => getCaretOffset(el)

    if (block.type !== 'code') {
      const marker = formatMarker(e)
      if (marker) {
        e.preventDefault()
        toggleWrap(el, marker)
        return
      }
      if (mod && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        e.stopPropagation() // ⌘K would otherwise open search
        insertLink(el)
        return
      }
    }

    switch (e.key) {
      case 'Enter': {
        if (block.type === 'code' && !e.shiftKey && !mod) {
          e.preventDefault()
          insertText('\n')
          return
        }
        if (e.shiftKey && block.type !== 'code') {
          e.preventDefault()
          insertText('\n')
          return
        }
        e.preventDefault()
        if (CONTINUING_TYPES.includes(block.type) && block.text === '') {
          updateBlock(block.id, { type: 'paragraph' })
          return
        }
        const offset = block.type === 'code' ? block.text.length : caret()
        const before = block.text.slice(0, offset)
        const after = block.text.slice(offset)
        const nextType = CONTINUING_TYPES.includes(block.type) ? block.type : 'paragraph'
        if (offset === 0 && block.text.length > 0) {
          // Caret at the very start: push the block down instead of splitting.
          const above = createBlock(nextType)
          const blocks = blocksRef.current
          commit([...blocks.slice(0, index), above, ...blocks.slice(index)])
          pendingFocus.current = { id: block.id, offset: 'start' }
          return
        }
        const next = createBlock(nextType, after)
        replaceBlock(block.id, { ...block, text: before }, next)
        pendingFocus.current = { id: next.id, offset: 'start' }
        return
      }

      case 'Backspace': {
        if (hasSelection() || caret() !== 0) return
        e.preventDefault()
        if (block.type !== 'paragraph') {
          updateBlock(block.id, { type: 'paragraph' })
          return
        }
        if (index === 0) {
          if (block.text === '' && blocksRef.current.length > 1) removeBlock(block.id)
          if (titleEl.current) setCaretOffset(titleEl.current, 'end')
          return
        }
        const prev = blocksRef.current[index - 1]
        if (prev.type === 'divider') {
          removeBlock(prev.id)
          return
        }
        if (prev.type === 'sketch') {
          if (block.text === '') {
            removeBlock(block.id)
            const before = textNeighbour(index - 1, -1)
            if (before) focusBlock(before.id, 'end')
          }
          return
        }
        if (isTextBlock(prev)) {
          const blocks = blocksRef.current.filter((b) => b.id !== block.id)
          commit(blocks.map((b) => (b.id === prev.id ? { ...prev, text: prev.text + block.text } : b)))
          pendingFocus.current = { id: prev.id, offset: prev.text.length }
        }
        return
      }

      case 'Delete': {
        if (hasSelection() || caret() !== block.text.length) return
        const next = blocksRef.current[index + 1]
        if (!next || !isTextBlock(next)) return
        e.preventDefault()
        const blocks = blocksRef.current.filter((b) => b.id !== next.id)
        commit(blocks.map((b) => (b.id === block.id ? { ...block, text: block.text + next.text } : b)))
        pendingFocus.current = { id: block.id, offset: block.text.length }
        return
      }

      case 'ArrowUp': {
        if (e.shiftKey || !isCaretOnFirstLine(el)) return
        const prev = textNeighbour(index, -1)
        e.preventDefault()
        if (prev) focusBlock(prev.id, 'end')
        else if (titleEl.current) setCaretOffset(titleEl.current, 'end')
        return
      }

      case 'ArrowDown': {
        if (e.shiftKey || !isCaretOnLastLine(el)) return
        const next = textNeighbour(index, 1)
        if (next) {
          e.preventDefault()
          focusBlock(next.id, 'start')
        }
        return
      }

      case 'Tab': {
        e.preventDefault()
        if (block.type === 'code') insertText('  ')
        return
      }
    }
  }

  // ---- Paste ------------------------------------------------------------------------
  /** Multi-line Markdown pasted into a block becomes real blocks. */
  const onPasteText = (block: TextBlock, text: string, el: HTMLElement) => {
    if (block.type === 'code' || !text.includes('\n')) return false
    const parsed = markdownToBlocks(text).blocks
    if (parsed.length === 0) return false
    if (parsed.length === 1 && parsed[0].type === 'paragraph') return false
    setSlash(null)
    const [start, end] = getSelectionOffsets(el)
    const before = block.text.slice(0, start)
    const after = block.text.slice(end)
    const head = before.trim() ? [{ ...block, text: before }] : []
    const tail = after.trim() ? [createBlock('paragraph', after)] : []
    replaceBlock(block.id, ...head, ...parsed, ...tail)
    const last = [...parsed].reverse().find(isTextBlock)
    if (last) pendingFocus.current = { id: last.id, offset: 'end' }
    return true
  }

  // ---- Title ------------------------------------------------------------------------
  const focusFirstBlock = () => {
    const first = blocksRef.current[0]
    if (first && isTextBlock(first)) {
      focusBlock(first.id, 'start')
    } else {
      const p = createBlock('paragraph')
      commit([p, ...blocksRef.current])
      pendingFocus.current = { id: p.id, offset: 'start' }
    }
  }

  const onClickBelow = () => {
    const blocks = blocksRef.current
    const last = blocks[blocks.length - 1]
    if (last && isTextBlock(last) && last.text === '') {
      focusBlock(last.id, 'start')
      return
    }
    const p = createBlock('paragraph')
    commit([...blocks, p])
    pendingFocus.current = { id: p.id, offset: 'start' }
  }

  // ---- Row actions (handle menu) -------------------------------------------------------
  const rowActions = {
    insertBelow: (id: string) => {
      const p = createBlock('paragraph', '/')
      const blocks = blocksRef.current
      const i = blocks.findIndex((b) => b.id === id)
      commit([...blocks.slice(0, i + 1), p, ...blocks.slice(i + 1)])
      pendingFocus.current = { id: p.id, offset: 'end', openSlash: true }
    },
    turnInto: (id: string, type: BlockTypeInfo['type']) => {
      const block = blocksRef.current.find((b) => b.id === id)
      if (!block) return
      const text = isTextBlock(block) ? block.text : ''
      if (type === 'divider' || type === 'sketch') replaceBlock(id, createBlock(type))
      else replaceBlock(id, { id, type, text, ...(type === 'todo' ? { checked: false } : {}) })
    },
    duplicate: (id: string) => {
      const block = blocksRef.current.find((b) => b.id === id)
      if (block) replaceBlock(id, block, { ...structuredClone(block), id: createBlock('paragraph').id })
    },
    move: (id: string, dir: -1 | 1) => {
      const blocks = [...blocksRef.current]
      const i = blocks.findIndex((b) => b.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= blocks.length) return
      ;[blocks[i], blocks[j]] = [blocks[j], blocks[i]]
      commit(blocks)
    },
    remove: removeBlock,
  }

  // ---- Render -----------------------------------------------------------------------
  const numbers = useMemo(() => {
    let n = 0
    return page.blocks.map((b) => (n = b.type === 'numbered' ? n + 1 : 0))
  }, [page.blocks])

  return (
    <div className="relative min-h-full pb-[40vh]">
      <NoteCover page={page} />
      <div className={cn('mx-auto w-full px-6 sm:px-16', page.fullWidth ? 'max-w-none lg:px-24' : 'max-w-[760px]')}>
        <NoteHeader page={page}>
          <EditableText
            elRef={(el) => (titleEl.current = el)}
            value={page.title}
            placeholder="Untitled"
            className="text-[40px] leading-[1.2] font-bold tracking-tight"
            onChange={(title) => updatePage(page.id, { title: title.replace(/\n/g, ' ') })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || (e.key === 'ArrowDown' && isCaretOnLastLine(e.currentTarget))) {
                e.preventDefault()
                focusFirstBlock()
              }
            }}
          />
        </NoteHeader>

        <div className="mt-1">
          {page.blocks.map((block, index) => {
            return (
              <BlockRow
                key={block.id}
                block={block}
                index={index}
                count={page.blocks.length}
                actions={rowActions}
              >
                {isTextBlock(block) ? (
                  <BlockText
                    block={block}
                    number={numbers[index]}
                    elRef={registerEl(block.id)}
                    onChange={(text, el) => onTextChange(block, text, el)}
                    onKeyDown={(e, el) => onTextKeyDown(e, block, index, el)}
                    onToggle={() => updateBlock(block.id, { checked: !block.checked })}
                    onPasteText={(text, el) => onPasteText(block, text, el)}
                  />
                ) : null}
                {block.type === 'sketch' && (
                  <SketchBlockView block={block} onChange={(b) => replaceBlock(b.id, b)} />
                )}
              </BlockRow>
            )
          })}
        </div>

        <div className="h-24 cursor-text" onClick={onClickBelow} />
      </div>

      {slash && (
        <SlashMenu
          items={slashItems}
          index={slash.index}
          anchor={slash.anchor}
          onHover={(index) => setSlash({ ...slash, index })}
          onSelect={applySlash}
          onClose={() => setSlash(null)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function NoteCover({ page }: { page: NotePage }) {
  const updatePage = useWorkspace((s) => s.updatePage)
  if (!page.cover) return null
  return (
    <div className="group/cover relative h-[30vh] max-h-72 min-h-36 w-full" style={{ background: page.cover }}>
      <div className="absolute right-4 bottom-3 flex gap-1 opacity-0 transition-opacity group-hover/cover:opacity-100 max-md:opacity-100">
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="secondary" className="h-7 bg-background/80 text-xs backdrop-blur">
              Change cover
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Gradients</div>
            <div className="grid grid-cols-4 gap-2">
              {COVERS.map((c) => (
                <button
                  key={c}
                  className={cn('h-12 rounded-md ring-offset-2 ring-offset-popover', page.cover === c && 'ring-2 ring-ring')}
                  style={{ background: c }}
                  onClick={() => updatePage(page.id, { cover: c })}
                  aria-label="Use cover"
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 bg-background/80 text-xs backdrop-blur"
          onClick={() => updatePage(page.id, { cover: null })}
        >
          Remove
        </Button>
      </div>
    </div>
  )
}

function NoteHeader({ page, children }: { page: NotePage; children: ReactNode }) {
  const updatePage = useWorkspace((s) => s.updatePage)
  const [iconOpen, setIconOpen] = useState(false)
  return (
    <div className={cn('group/header', page.cover ? (page.icon ? '-mt-10' : 'pt-8') : 'pt-16 sm:pt-24')}>
      {page.icon && (
        <div className="relative mb-2">
          <PageIconButton page={page} />
        </div>
      )}
      <div className="flex h-8 items-center gap-1 opacity-0 transition-opacity group-hover/header:opacity-100 max-md:opacity-100">
        {!page.icon && (
          <Popover open={iconOpen} onOpenChange={setIconOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
                <SmilePlus /> Add icon
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-3">
              <EmojiPicker
                onPick={(icon) => {
                  updatePage(page.id, { icon })
                  setIconOpen(false)
                }}
              />
            </PopoverContent>
          </Popover>
        )}
        {!page.cover && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground"
            onClick={() => updatePage(page.id, { cover: randomCover() })}
          >
            <ImageIcon /> Add cover
          </Button>
        )}
      </div>
      {children}
    </div>
  )
}
