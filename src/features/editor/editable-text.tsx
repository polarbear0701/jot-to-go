import { useLayoutEffect, useRef, type KeyboardEvent } from 'react'

import { cn } from '@/lib/utils'

interface EditableTextProps {
  value: string
  onChange: (value: string, el: HTMLElement) => void
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>, el: HTMLElement) => void
  onFocus?: () => void
  elRef?: (el: HTMLElement | null) => void
  /** Always visible when empty. */
  placeholder?: string
  /** Only visible when empty and focused. */
  focusPlaceholder?: string
  className?: string
  spellCheck?: boolean
}

/**
 * Uncontrolled plain-text contentEditable. The DOM is only rewritten when the
 * value changes from the outside, so the caret and native undo are preserved
 * while typing.
 */
export function EditableText({
  value,
  onChange,
  onKeyDown,
  onFocus,
  elRef,
  placeholder,
  focusPlaceholder,
  className,
  spellCheck = true,
}: EditableTextProps) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (el && el.textContent !== value) el.textContent = value
  }, [value])

  return (
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
      className={cn('min-w-0 flex-1 cursor-text break-words whitespace-pre-wrap outline-none', className)}
      onInput={(e) => onChange(e.currentTarget.textContent ?? '', e.currentTarget)}
      onKeyDown={(e) => onKeyDown?.(e, e.currentTarget)}
      onFocus={onFocus}
      onPaste={(e) => {
        // Keep content plain text even in browsers without plaintext-only support.
        e.preventDefault()
        const text = e.clipboardData.getData('text/plain')
        document.execCommand('insertText', false, text)
      }}
    />
  )
}
