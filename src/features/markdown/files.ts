import { openPage } from '@/hooks/use-route'
import type { ID, NotePage } from '@/lib/types'
import { useUI } from '@/store/ui'
import { pageTitle, useWorkspace } from '@/store/workspace'
import { blocksToMarkdown, markdownToBlocks } from './markdown'

export const MARKDOWN_ACCEPT = '.md,.markdown,.mdown,.mkd,text/markdown'

export const isMarkdownFile = (file: File) =>
  /\.(md|markdown|mdown|mkd)$/i.test(file.name) || file.type === 'text/markdown'

/** Full Markdown for a note, with sketches embedded so the file is self-contained. */
export const noteToMarkdown = (page: NotePage) =>
  blocksToMarkdown(page.blocks, { title: pageTitle(page), sketches: 'inline' })

const fileName = (title: string) =>
  `${title.replace(/[\\/:*?"<>|\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Untitled'}.md`

export function downloadMarkdown(page: NotePage) {
  const blob = new Blob([noteToMarkdown(page)], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName(pageTitle(page))
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const copyMarkdown = (page: NotePage) => navigator.clipboard.writeText(noteToMarkdown(page))

/** Creates one note per Markdown file and opens the last one. */
export async function importMarkdownFiles(files: Iterable<File>, parentId: ID | null = null) {
  const { createNote } = useWorkspace.getState()
  let last: ID | null = null
  for (const file of files) {
    if (!isMarkdownFile(file)) continue
    const { title, blocks } = markdownToBlocks(await file.text(), { extractTitle: true })
    last = createNote({ parentId, title: title ?? file.name.replace(/\.[^.]+$/, ''), blocks })
  }
  if (last) {
    if (parentId) useUI.getState().toggleExpanded(parentId, true)
    openPage(last)
  }
  return last
}

/** Opens the system file picker for Markdown files. */
export function pickMarkdownFiles(parentId: ID | null = null) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = MARKDOWN_ACCEPT
  input.multiple = true
  input.onchange = () => {
    if (input.files?.length) void importMarkdownFiles(input.files, parentId)
  }
  input.click()
}
