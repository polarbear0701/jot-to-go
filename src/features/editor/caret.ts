/** Caret helpers for plain-text contentEditable elements. */

export function getCaretOffset(el: HTMLElement): number {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return 0
  const range = sel.getRangeAt(0)
  if (!el.contains(range.startContainer)) return 0
  const pre = range.cloneRange()
  pre.selectNodeContents(el)
  pre.setEnd(range.startContainer, range.startOffset)
  return pre.toString().length
}

export function hasSelection() {
  const sel = window.getSelection()
  return !!sel && !sel.isCollapsed
}

export function setCaretOffset(el: HTMLElement, offset: number | 'start' | 'end') {
  el.focus({ preventScroll: true })
  const sel = window.getSelection()
  if (!sel) return
  const total = el.textContent?.length ?? 0
  let remaining = offset === 'start' ? 0 : offset === 'end' ? total : Math.min(offset, total)
  const range = document.createRange()
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  if (!node) {
    range.setStart(el, 0)
  } else {
    while (node) {
      const len = node.textContent?.length ?? 0
      if (remaining <= len) {
        range.setStart(node, remaining)
        break
      }
      remaining -= len
      const next = walker.nextNode()
      if (!next) range.setStart(node, len)
      node = next
    }
  }
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
  el.scrollIntoView?.({ block: 'nearest' })
}

export function getCaretRect(): DOMRect | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0).cloneRange()
  range.collapse(true)
  const rect = range.getClientRects()[0] ?? range.getBoundingClientRect()
  if (!rect || (rect.top === 0 && rect.left === 0 && rect.height === 0)) {
    const node = range.startContainer
    const el = node instanceof HTMLElement ? node : node.parentElement
    return el?.getBoundingClientRect() ?? null
  }
  return rect
}

function lineHeight(el: HTMLElement) {
  const lh = parseFloat(getComputedStyle(el).lineHeight)
  return Number.isFinite(lh) ? lh : 24
}

export function isCaretOnFirstLine(el: HTMLElement) {
  const rect = getCaretRect()
  if (!rect || !el.textContent) return true
  const box = el.getBoundingClientRect()
  const pad = parseFloat(getComputedStyle(el).paddingTop) || 0
  return rect.top < box.top + pad + lineHeight(el) * 0.75
}

export function isCaretOnLastLine(el: HTMLElement) {
  const rect = getCaretRect()
  if (!rect || !el.textContent) return true
  const box = el.getBoundingClientRect()
  const pad = parseFloat(getComputedStyle(el).paddingBottom) || 0
  return rect.bottom > box.bottom - pad - lineHeight(el) * 0.75
}

/** Selects the text between two offsets (or places the caret when they are equal). */
export function setSelectionOffsets(el: HTMLElement, start: number, end: number) {
  el.focus({ preventScroll: true })
  const sel = window.getSelection()
  if (!sel) return
  const point = (offset: number): [Node, number] => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let remaining = offset
    let node = walker.nextNode()
    if (!node) return [el, 0]
    while (node) {
      const len = node.textContent?.length ?? 0
      if (remaining <= len) return [node, remaining]
      remaining -= len
      const next = walker.nextNode()
      if (!next) return [node, len]
      node = next
    }
    return [el, 0]
  }
  const range = document.createRange()
  range.setStart(...point(start))
  range.setEnd(...point(end))
  sel.removeAllRanges()
  sel.addRange(range)
}

/** Raw offsets of the current selection inside `el`. */
export function getSelectionOffsets(el: HTMLElement): [number, number] {
  const start = getCaretOffset(el)
  const sel = window.getSelection()
  const length = sel && !sel.isCollapsed && el.contains(sel.anchorNode) ? sel.toString().length : 0
  return [start, start + length]
}
