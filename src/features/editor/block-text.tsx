import type { KeyboardEvent } from 'react'
import { Check } from 'lucide-react'

import type { TextBlock, TextBlockType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { EditableText } from './editable-text'

const TEXT_STYLE: Record<TextBlockType, string> = {
  paragraph: 'py-[3px] leading-7',
  heading1: 'pt-[3px] text-[30px] leading-[1.3] font-bold tracking-tight',
  heading2: 'pt-[3px] text-[24px] leading-[1.3] font-semibold tracking-tight',
  heading3: 'pt-[3px] text-[20px] leading-[1.3] font-semibold',
  bulleted: 'py-[3px] leading-7',
  numbered: 'py-[3px] leading-7',
  todo: 'py-[3px] leading-7',
  quote: 'py-[3px] text-[17px] leading-7',
  callout: 'leading-7',
  code: 'font-mono text-[13.5px] leading-6',
}

const PLACEHOLDER: Partial<Record<TextBlockType, { always?: string; focus?: string }>> = {
  paragraph: { focus: "Write, or press '/' for commands…" },
  heading1: { always: 'Heading 1' },
  heading2: { always: 'Heading 2' },
  heading3: { always: 'Heading 3' },
  bulleted: { focus: 'List' },
  numbered: { focus: 'List' },
  todo: { focus: 'To-do' },
  quote: { focus: 'Empty quote' },
  callout: { focus: 'Type something…' },
  code: { focus: 'Code · ⇧Enter to exit' },
}

interface BlockTextProps {
  block: TextBlock
  elRef: (el: HTMLElement | null) => void
  onChange: (text: string, el: HTMLElement) => void
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>, el: HTMLElement) => void
  onToggle: () => void
  onPasteText: (text: string, el: HTMLElement) => boolean
  /** Position within a run of numbered items. */
  number: number
}

/**
 * Renders a text block. The marker slot and the EditableText keep a stable
 * position in the tree so changing the block type never remounts the editor
 * (and therefore never loses focus).
 */
export function BlockText({ block, elRef, onChange, onKeyDown, onToggle, onPasteText, number }: BlockTextProps) {
  const t = block.type
  const ph = PLACEHOLDER[t]
  return (
    <div
      className={cn(
        'flex w-full items-start',
        t === 'quote' && 'border-l-[3px] border-foreground pl-4',
        t === 'callout' && 'gap-3 rounded-lg bg-muted/70 px-4 py-3',
        t === 'code' && 'rounded-lg bg-muted px-5 py-4',
      )}
    >
      {(t === 'bulleted' || t === 'numbered' || t === 'todo' || t === 'callout') && (
        <span className={cn('flex shrink-0 select-none items-center justify-center', t !== 'callout' && 'h-[34px] w-6 mr-1')}>
          {t === 'bulleted' && <span className="size-1.5 rounded-full bg-foreground" />}
          {t === 'numbered' && <span className="tabular-nums">{number}.</span>}
          {t === 'todo' && (
            <button
              role="checkbox"
              aria-checked={!!block.checked}
              onClick={onToggle}
              className={cn(
                'flex size-4 items-center justify-center rounded-[4px] border-[1.5px] border-foreground/70 transition-colors',
                block.checked && 'border-blue-500 bg-blue-500 text-white',
              )}
            >
              {block.checked && <Check className="size-3" strokeWidth={3} />}
            </button>
          )}
          {t === 'callout' && <span className="text-xl leading-7">💡</span>}
        </span>
      )}
      <EditableText
        elRef={elRef}
        value={block.text}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onPasteText={onPasteText}
        inlineMarkdown={t !== 'code'}
        placeholder={ph?.always}
        focusPlaceholder={ph?.focus}
        spellCheck={t !== 'code'}
        className={cn(
          TEXT_STYLE[t],
          t === 'todo' && block.checked && 'text-muted-foreground line-through decoration-muted-foreground/60',
        )}
      />
    </div>
  )
}
