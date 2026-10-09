import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'

import { tokenizeInline } from '@/features/markdown/inline'
import { InlinePreview, rawOffsetFromPoint } from '@/features/markdown/inline-preview'
import { cn } from '@/lib/utils'
import { setCaretOffset } from './caret'

interface EditableTextProps {
  value: string
  onChange: (value: string, el: HTMLElement) => void
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>, el: HTMLElement) => void
  /** Return true to take over a paste (e.g. multi-line Markdown → blocks). */
  onPasteText?: (text: string, el: HTMLElement) => boolean
  onFocus?: () => void
  elRef?: (el: HTMLElement | null) => void
  /** Always visible when empty. */
  placeholder?: string
  /** Only visible when empty and focused. */
  focusPlaceholder?: string
  /** Render inline Markdown (bold, links, …) while the text isn't being edited. */
  inlineMarkdown?: boolean
  className?: string
  spellCheck?: boolean
}

const BASE = 'min-w-0 flex-1 cursor-text break-words whitespace-pre-wrap outline-none'

/**
 * Uncontrolled plain-text contentEditable. The DOM is only rewritten when the
 * value changes from the outside, so the caret and native undo are preserved
 * while typing.
 *
 * With `inlineMarkdown`, an unfocused block shows its formatted rendering on
 * top; the source appears again as soon as it is focused (like Obsidian's live
 * preview, per block).
 */
export function EditableText({
  value,
  onChange,
  onKeyDown,
  onPasteText,
  onFocus,
  elRef,
  placeholder,
  focusPlaceholder,
  inlineMarkdown,
  className,
  spellCheck = true,
}: EditableTextProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (el && el.textContent !== value) el.textContent = value
  }, [value])

  const tokens = useMemo(() => (inlineMarkdown && !focused ? tokenizeInline(value) : null), [inlineMarkdown, focused, value])
  const preview = !!tokens?.some((t) => t.kind !== 'text')

  return (
    <div className="relative flex min-w-0 flex-1">
      <div
        ref={(el) => {
          ref.current = el
          elRef?.(el)
        }}
        contentEditable="plaintext-only"
        suppressContentEditableWarning
        spellCheck={spellCheck}
        role="textbox"
        aria-multiline
        data-placeholder={placeholder}
        data-focus-placeholder={focusPlaceholder}
        className={cn(BASE, className, preview && 'pointer-events-none absolute inset-0 overflow-hidden opacity-0')}
        onInput={(e) => onChange(e.currentTarget.textContent ?? '', e.currentTarget)}
        onKeyDown={(e) => onKeyDown?.(e, e.currentTarget)}
        onFocus={() => {
          setFocused(true)
          onFocus?.()
        }}
        onBlur={() => setFocused(false)}
        onPaste={(e) => {
          e.preventDefault()
          const text = e.clipboardData.getData('text/plain')
          if (onPasteText?.(text, e.currentTarget)) return
          // Keep content plain text even in browsers without plaintext-only support.
          document.execCommand('insertText', false, text)
        }}
      />
      {preview && tokens && (
        <div
          aria-hidden
          className={cn(BASE, className)}
          onMouseDown={(e) => {
            // Let links open; anything else puts the caret where you clicked in the source.
            if ((e.target as HTMLElement).closest('a')) return
            e.preventDefault()
            const offset = rawOffsetFromPoint(e.clientX, e.clientY)
            if (ref.current) setCaretOffset(ref.current, offset ?? 'end')
          }}
        >
          <InlinePreview tokens={tokens} />
        </div>
      )}
    </div>
  )
}
