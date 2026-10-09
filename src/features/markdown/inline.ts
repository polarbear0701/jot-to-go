/**
 * Inline Markdown tokenizer for a single block's text.
 *
 * Block text is stored as Markdown source (e.g. `see **this**`). The tokens keep
 * the raw offsets so the rendered preview can map a click back to a caret
 * position in the source.
 */

export type InlineKind = 'text' | 'bold' | 'italic' | 'strike' | 'code' | 'link'

export interface InlineToken {
  kind: InlineKind
  /** Visible text. */
  text: string
  /** Offset in the raw source where `text` starts. */
  contentStart: number
  href?: string
}

// Order matters: code first (no formatting inside), then bold before italic.
const PATTERNS: { kind: InlineKind; re: RegExp; content: number; href?: number }[] = [
  { kind: 'code', re: /(`+)([^`]+?)\1/y, content: 2 },
  { kind: 'bold', re: /\*\*(?=\S)([^]+?)(?<=\S)\*\*/y, content: 1 },
  { kind: 'bold', re: /__(?=\S)([^]+?)(?<=\S)__(?!\w)/y, content: 1 },
  { kind: 'strike', re: /~~(?=\S)([^]+?)(?<=\S)~~/y, content: 1 },
  { kind: 'italic', re: /\*(?=[^\s*])([^*]+?)(?<=\S)\*/y, content: 1 },
  { kind: 'italic', re: /_(?=[^\s_])([^_]+?)(?<=\S)_(?!\w)/y, content: 1 },
  { kind: 'link', re: /\[([^\]\n]+)\]\(([^)\s]+)\)/y, content: 1, href: 2 },
  { kind: 'link', re: /https?:\/\/[^\s<]*[^\s<.,;:!?)\]'"]/y, content: 0, href: 0 },
]

/** Characters that can start an inline construct. */
const TRIGGER = /[`*_~[h\\]/

export function tokenizeInline(src: string): InlineToken[] {
  const tokens: InlineToken[] = []
  let text = ''
  let textStart = 0
  const flush = () => {
    if (text) tokens.push({ kind: 'text', text, contentStart: textStart })
    text = ''
  }

  let i = 0
  outer: while (i < src.length) {
    const ch = src[i]
    if (ch === '\\' && i + 1 < src.length && /[\\`*_~[\]()#>-]/.test(src[i + 1])) {
      // Escaped character: keep it literal. Offsets stay approximate inside escapes.
      if (!text) textStart = i + 1
      text += src[i + 1]
      i += 2
      continue
    }
    if (TRIGGER.test(ch)) {
      // `_` and `h` (for URLs) only start a construct at a word boundary.
      const atBoundary = i === 0 || !/\w/.test(src[i - 1])
      for (const p of PATTERNS) {
        if ((ch === '_' || ch === 'h') && !atBoundary) break
        p.re.lastIndex = i
        const m = p.re.exec(src)
        if (!m) continue
        flush()
        const content = m[p.content]
        const offsetInMatch = p.content === 0 ? 0 : m[0].indexOf(content, p.kind === 'code' ? m[1].length : 0)
        tokens.push({
          kind: p.kind,
          text: content,
          contentStart: i + offsetInMatch,
          ...(p.href !== undefined ? { href: m[p.href] } : {}),
        })
        i += m[0].length
        textStart = i
        continue outer
      }
    }
    if (!text) textStart = i
    text += ch
    i++
  }
  flush()
  return tokens
}

/** True if the text contains any inline formatting worth rendering. */
export const hasInlineMarkdown = (src: string) => tokenizeInline(src).some((t) => t.kind !== 'text')

/** Plain text with inline markers removed (for search, previews, titles). */
export const stripInline = (src: string) =>
  tokenizeInline(src)
    .map((t) => t.text)
    .join('')
