/**
 * Converts between note blocks and Markdown.
 *
 * Text inside blocks is already Markdown (inline formatting is stored as-is),
 * so this only deals with block structure. Sketch blocks are written as an
 * HTML comment carrying their strokes (invisible in other viewers, lets Jot to Go
 * re-import them) followed by an SVG image so other apps still show the drawing.
 */
import { strokeOpacity, strokeToPath, strokesBounds } from '@/features/drawing/geometry'
import { newId } from '@/lib/id'
import type { Block, PaperStyle, SketchBlock, Stroke, TextBlock, TextBlockType } from '@/lib/types'
import { isTextBlock } from '@/lib/types'

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

export interface SerializeOptions {
  title?: string
  /**
   * `inline` embeds the strokes (for files), `reference` writes a short
   * `<!-- jot:sketch ref=… -->` placeholder (for the in-app source view).
   */
  sketches?: 'inline' | 'reference'
}

const LIST_TYPES: TextBlockType[] = ['bulleted', 'numbered', 'todo']
const HEADING: Partial<Record<TextBlockType, string>> = { heading1: '#', heading2: '##', heading3: '###' }

/** Escape text that would otherwise be read as block syntax at the start of a line. */
function escapeLineStart(line: string) {
  return /^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|```|~~~|(-\s*){3,}$|(\*\s*){3,}$|<!--)/.test(line) ? `\\${line}` : line
}

const fenceFor = (code: string) => {
  let fence = '```'
  while (code.includes(fence)) fence += '`'
  return fence
}

function toBase64(text: string) {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

export function sketchToSvg(block: Pick<SketchBlock, 'strokes' | 'height'>, inkColor = '#18181b') {
  const b = strokesBounds(block.strokes) ?? { x: 0, y: 0, width: 400, height: block.height }
  const pad = 8
  const vb = [b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2].map((n) => Math.round(n))
  const paths = block.strokes
    .map((s) => {
      const fill = s.color === 'ink' ? inkColor : s.color
      return `<path d="${strokeToPath(s)}" fill="${fill}" fill-opacity="${strokeOpacity(s)}"/>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${vb[2]}" height="${vb[3]}">${paths}</svg>`
}

function serializeBlock(block: Block, number: number, opts: SerializeOptions): string {
  if (block.type === 'divider') return '---'
  if (block.type === 'sketch') {
    if (opts.sketches === 'reference') return `<!-- jot:sketch ref=${block.id} -->`
    const data = JSON.stringify({ height: block.height, paper: block.paper, strokes: block.strokes })
    return `<!-- jot:sketch ${data} -->\n![Sketch](data:image/svg+xml;base64,${toBase64(sketchToSvg(block))})`
  }
  const lines = block.text.split('\n')
  switch (block.type) {
    case 'heading1':
    case 'heading2':
    case 'heading3':
      return `${HEADING[block.type]} ${block.text.replace(/\n/g, ' ')}`
    case 'bulleted':
    case 'numbered':
    case 'todo': {
      const marker =
        block.type === 'bulleted' ? '- ' : block.type === 'numbered' ? `${number}. ` : `- [${block.checked ? 'x' : ' '}] `
      const indent = ' '.repeat(block.type === 'numbered' ? marker.length : 2)
      return lines.map((l, i) => (i === 0 ? marker + l : indent + l)).join('\n')
    }
    case 'quote':
      return lines.map((l) => (l ? `> ${l}` : '>')).join('\n')
    case 'callout':
      return ['> [!NOTE]', ...lines.map((l) => (l ? `> ${l}` : '>'))].join('\n')
    case 'code': {
      const fence = fenceFor(block.text)
      return `${fence}\n${block.text}\n${fence}`
    }
    default:
      // Paragraph: hard line breaks are two trailing spaces.
      return lines.map((l, i) => escapeLineStart(l) + (i < lines.length - 1 ? '  ' : '')).join('\n')
  }
}

export function blocksToMarkdown(blocks: Block[], opts: SerializeOptions = {}): string {
  const out: string[] = []
  if (opts.title?.trim()) out.push(`# ${opts.title.trim()}`)
  let number = 0
  blocks.forEach((block, i) => {
    number = block.type === 'numbered' ? number + 1 : 0
    // Skip trailing empty paragraphs.
    if (block.type === 'paragraph' && !block.text && blocks.slice(i).every((b) => b.type === 'paragraph' && !b.text)) return
    const prev = blocks[i - 1]
    const sameList =
      prev && isTextBlock(prev) && isTextBlock(block) && LIST_TYPES.includes(block.type) && prev.type === block.type
    if (out.length && !sameList) out.push('')
    out.push(block.type === 'paragraph' && !block.text ? '&nbsp;' : serializeBlock(block, number, opts))
  })
  return out.join('\n').trimEnd() + '\n'
}

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

export interface ParseOptions {
  /** Use a leading `# Heading` (or front-matter `title:`) as the page title. */
  extractTitle?: boolean
  /** Existing sketch blocks, for `<!-- jot:sketch ref=… -->` placeholders. */
  sketches?: Map<string, SketchBlock>
}

export interface ParsedMarkdown {
  title: string | null
  blocks: Block[]
}

const text = (type: TextBlockType, value: string, extra: Partial<TextBlock> = {}): TextBlock => ({
  id: newId(),
  type,
  text: value,
  ...(type === 'todo' ? { checked: false } : {}),
  ...extra,
})

const RE = {
  fence: /^\s{0,3}(`{3,}|~{3,})\s*(\S*)\s*$/,
  heading: /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/,
  hr: /^\s{0,3}((-\s*){3,}|(\*\s*){3,}|(_\s*){3,})$/,
  todo: /^\s{0,3}[-*+]\s+\[( |x|X)\]\s?(.*)$/,
  bullet: /^\s{0,3}[-*+]\s+(.*)$/,
  numbered: /^\s{0,3}\d{1,9}[.)]\s+(.*)$/,
  quote: /^\s{0,3}>\s?(.*)$/,
  callout: /^\[!(\w+)\]\s*(.*)$/,
  sketch: /^<!--\s*jot:sketch\s+([\s\S]*?)\s*-->$/,
  image: /^!\[[^\]]*\]\(data:image\/svg\+xml[^)]*\)\s*$/,
  nbsp: /^(&nbsp;| )$/,
}

const unescapeLineStart = (line: string) => (/^\\[#>*+\-`~<\d]/.test(line) ? line.slice(1) : line)
const stripHardBreak = (line: string) => line.replace(/( {2,}|\\)$/, '')

function parseSketch(payload: string, opts: ParseOptions): SketchBlock | null {
  const ref = payload.match(/^ref=([\w-]+)$/)
  if (ref) return opts.sketches?.get(ref[1]) ?? null
  try {
    const data = JSON.parse(payload) as { height?: number; paper?: PaperStyle; strokes?: Stroke[] }
    if (!Array.isArray(data.strokes)) return null
    return {
      id: newId(),
      type: 'sketch',
      height: typeof data.height === 'number' ? data.height : 280,
      paper: data.paper ?? 'blank',
      strokes: data.strokes,
    }
  } catch {
    return null
  }
}

export function markdownToBlocks(source: string, opts: ParseOptions = {}): ParsedMarkdown {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let title: string | null = null
  let i = 0

  // YAML front matter: only `title:` is used.
  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((l, j) => j > 0 && l.trim() === '---')
    if (end > 0 && end < 40 && lines.slice(1, end).every((l) => !l.trim() || /^[\w-]+\s*:/.test(l))) {
      const t = lines.slice(1, end).find((l) => /^title\s*:/.test(l))
      if (t && opts.extractTitle) title = t.replace(/^title\s*:\s*/, '').replace(/^["']|["']$/g, '')
      i = end + 1
    }
  }

  let paragraph: string[] = []
  const flush = () => {
    if (paragraph.length) blocks.push(text('paragraph', paragraph.join('\n')))
    paragraph = []
  }

  for (; i < lines.length; i++) {
    const line = lines[i]

    if (!line.trim()) {
      flush()
      continue
    }

    const fence = line.match(RE.fence)
    if (fence) {
      flush()
      const close = fence[1]
      const body: string[] = []
      for (i++; i < lines.length && !lines[i].trim().startsWith(close); i++) body.push(lines[i])
      blocks.push(text('code', body.join('\n')))
      continue
    }

    const sketch = line.trim().match(RE.sketch)
    if (sketch) {
      flush()
      const block = parseSketch(sketch[1], opts)
      if (block) blocks.push(block)
      // Skip the preview image that follows a sketch comment.
      if (lines[i + 1] && RE.image.test(lines[i + 1].trim())) i++
      continue
    }

    const heading = line.match(RE.heading)
    if (heading) {
      flush()
      const level = heading[1].length
      if (level === 1 && opts.extractTitle && title === null && blocks.length === 0) {
        title = heading[2]
        continue
      }
      blocks.push(text(level === 1 ? 'heading1' : level === 2 ? 'heading2' : 'heading3', heading[2]))
      continue
    }

    if (RE.hr.test(line)) {
      flush()
      blocks.push({ id: newId(), type: 'divider' })
      continue
    }

    const todo = line.match(RE.todo)
    const bullet = !todo && line.match(RE.bullet)
    const numbered = !todo && !bullet && line.match(RE.numbered)
    if (todo || bullet || numbered) {
      flush()
      const block = todo
        ? text('todo', todo[2], { checked: todo[1].toLowerCase() === 'x' })
        : text(bullet ? 'bulleted' : 'numbered', ((bullet || numbered) as RegExpMatchArray)[1])
      // Indented continuation lines belong to the item (nested items are flattened).
      while (
        i + 1 < lines.length &&
        /^\s{2,}\S/.test(lines[i + 1]) &&
        !RE.todo.test(lines[i + 1]) &&
        !RE.bullet.test(lines[i + 1]) &&
        !RE.numbered.test(lines[i + 1])
      ) {
        block.text = `${stripHardBreak(block.text)}\n${lines[++i].trim()}`
      }
      block.text = stripHardBreak(block.text)
      blocks.push(block)
      continue
    }

    const quote = line.match(RE.quote)
    if (quote) {
      flush()
      const body = [quote[1]]
      while (i + 1 < lines.length && RE.quote.test(lines[i + 1])) body.push(lines[++i].match(RE.quote)![1])
      const callout = body[0].match(RE.callout)
      if (callout) {
        const rest = [callout[2], ...body.slice(1)].filter((l, j) => j > 0 || l)
        blocks.push(text('callout', rest.map(stripHardBreak).join('\n')))
      } else {
        blocks.push(text('quote', body.map(stripHardBreak).join('\n')))
      }
      continue
    }

    if (RE.nbsp.test(line.trim()) && paragraph.length === 0) {
      blocks.push(text('paragraph', ''))
      continue
    }

    paragraph.push(unescapeLineStart(stripHardBreak(line)))
  }
  flush()
  return { title, blocks }
}

/**
 * Keeps block ids stable when re-parsing edited Markdown, so React doesn't
 * remount every block on each keystroke in the source view.
 */
export function reuseIds(previous: Block[], next: Block[]): Block[] {
  return next.map((b, i) => {
    const old = previous[i]
    return old && old.type === b.type && b.type !== 'sketch' ? ({ ...b, id: old.id } as Block) : b
  })
}
