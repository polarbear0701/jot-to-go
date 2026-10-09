import type { InlineToken } from './inline'

/** Renders inline tokens. Each piece carries `data-raw` = its offset in the source. */
export function InlinePreview({ tokens }: { tokens: InlineToken[] }) {
  return tokens.map((t, i) => {
    const raw = { 'data-raw': t.contentStart }
    switch (t.kind) {
      case 'bold':
        return <strong key={i} {...raw} className="font-semibold">{t.text}</strong>
      case 'italic':
        return <em key={i} {...raw}>{t.text}</em>
      case 'strike':
        return <s key={i} {...raw} className="text-muted-foreground">{t.text}</s>
      case 'code':
        return (
          <code
            key={i}
            {...raw}
            className="rounded-[4px] bg-muted px-[0.3em] py-[0.1em] font-mono text-[0.85em] text-rose-600 dark:text-rose-400"
          >
            {t.text}
          </code>
        )
      case 'link':
        return (
          <a
            key={i}
            {...raw}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer text-foreground underline decoration-muted-foreground/50 underline-offset-[3px] hover:decoration-foreground"
          >
            {t.text}
          </a>
        )
      default:
        return <span key={i} {...raw}>{t.text}</span>
    }
  })
}

/** Maps a screen point inside a rendered preview back to an offset in the raw source. */
export function rawOffsetFromPoint(x: number, y: number): number | null {
  let node: Node | null = null
  let offset = 0
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
  }
  if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(x, y)
    if (pos) ({ offsetNode: node, offset } = pos)
  } else if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y)
    if (range) {
      node = range.startContainer
      offset = range.startOffset
    }
  }
  const el = node && (node instanceof HTMLElement ? node : node.parentElement)?.closest<HTMLElement>('[data-raw]')
  if (!el) return null
  return Number(el.dataset.raw) + (node?.nodeType === Node.TEXT_NODE ? offset : 0)
}
