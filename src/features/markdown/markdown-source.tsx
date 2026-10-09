import { useLayoutEffect, useRef, useState } from 'react'
import { Check, Copy, Download, FileCode2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { NotePage, SketchBlock } from '@/lib/types'
import { useWorkspace } from '@/store/workspace'
import { copyMarkdown, downloadMarkdown } from './files'
import { blocksToMarkdown, markdownToBlocks, reuseIds } from './markdown'

/**
 * Raw Markdown view of a note. Edits are parsed back into blocks as you type,
 * so switching back to the block editor shows the result.
 */
export function MarkdownSource({ page }: { page: NotePage }) {
  const setBlocks = useWorkspace((s) => s.setBlocks)
  const updatePage = useWorkspace((s) => s.updatePage)
  // Sketches are shown as short placeholders; remember every sketch seen so a
  // placeholder deleted and then restored (e.g. with undo) still resolves.
  const sketches = useRef(new Map<string, SketchBlock>())
  for (const b of page.blocks) if (b.type === 'sketch') sketches.current.set(b.id, b)

  const [value, setValue] = useState(() =>
    blocksToMarkdown(page.blocks, { title: page.title, sketches: 'reference' }),
  )
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  const onChange = (next: string) => {
    setValue(next)
    const parsed = markdownToBlocks(next, { extractTitle: true, sketches: sketches.current })
    const current = useWorkspace.getState().pages[page.id]
    const previous = current?.kind === 'note' ? current.blocks : []
    if ((parsed.title ?? '') !== page.title) updatePage(page.id, { title: parsed.title ?? '' })
    setBlocks(page.id, reuseIds(previous, parsed.blocks))
  }

  return (
    <div className={page.fullWidth ? 'mx-auto w-full max-w-none px-6 lg:px-24' : 'mx-auto w-full max-w-[760px] px-6 sm:px-16'}>
      <div className="sticky top-0 z-10 -mx-2 flex items-center gap-2 bg-background/90 px-2 py-3 backdrop-blur">
        <FileCode2 className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Markdown</span>
        <span className="hidden text-xs text-muted-foreground sm:inline">Edits sync to the block editor</span>
        <div className="ml-auto flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await copyMarkdown(page)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
          >
            {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => downloadMarkdown(page)}>
            <Download /> .md
          </Button>
        </div>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        aria-label="Markdown source"
        className="mb-[40vh] min-h-[50vh] w-full resize-none overflow-hidden rounded-lg border bg-muted/30 p-5 font-mono text-[13.5px] leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      />
    </div>
  )
}
