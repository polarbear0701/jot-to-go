import {
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Lightbulb,
  List,
  ListOrdered,
  Minus,
  PenLine,
  Quote,
  Type,
  type LucideIcon,
} from 'lucide-react'

import { newId } from '@/lib/id'
import type { Block, BlockType, TextBlockType } from '@/lib/types'

export interface BlockTypeInfo {
  type: BlockType
  label: string
  description: string
  icon: LucideIcon
  keywords: string[]
  /** Markdown shortcut shown in the menu. */
  hint?: string
}

export const BLOCK_TYPES: BlockTypeInfo[] = [
  { type: 'paragraph', label: 'Text', description: 'Plain text', icon: Type, keywords: ['text', 'paragraph', 'p'] },
  { type: 'heading1', label: 'Heading 1', description: 'Big section heading', icon: Heading1, keywords: ['h1', 'title', 'heading'], hint: '#' },
  { type: 'heading2', label: 'Heading 2', description: 'Medium section heading', icon: Heading2, keywords: ['h2', 'subtitle', 'heading'], hint: '##' },
  { type: 'heading3', label: 'Heading 3', description: 'Small section heading', icon: Heading3, keywords: ['h3', 'heading'], hint: '###' },
  { type: 'bulleted', label: 'Bulleted list', description: 'A simple bulleted list', icon: List, keywords: ['ul', 'bullet', 'list'], hint: '-' },
  { type: 'numbered', label: 'Numbered list', description: 'A list with numbering', icon: ListOrdered, keywords: ['ol', 'number', 'list'], hint: '1.' },
  { type: 'todo', label: 'To-do list', description: 'Track tasks with a checklist', icon: CheckSquare, keywords: ['todo', 'task', 'check', 'checkbox'], hint: '[]' },
  { type: 'sketch', label: 'Sketch', description: 'Draw or handwrite with pen or finger', icon: PenLine, keywords: ['draw', 'sketch', 'ink', 'handwriting', 'pen', 'canvas'] },
  { type: 'quote', label: 'Quote', description: 'Capture a quote', icon: Quote, keywords: ['quote', 'blockquote'], hint: '>' },
  { type: 'callout', label: 'Callout', description: 'Make writing stand out', icon: Lightbulb, keywords: ['callout', 'note', 'info', 'tip'] },
  { type: 'code', label: 'Code', description: 'Capture a code snippet', icon: Code2, keywords: ['code', 'snippet', 'pre'], hint: '```' },
  { type: 'divider', label: 'Divider', description: 'Visually divide blocks', icon: Minus, keywords: ['divider', 'hr', 'line', 'separator'], hint: '---' },
]

export const blockInfo = (type: BlockType) => BLOCK_TYPES.find((b) => b.type === type)!

export function filterBlockTypes(query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return BLOCK_TYPES
  return BLOCK_TYPES.filter(
    (b) => b.label.toLowerCase().includes(q) || b.keywords.some((k) => k.startsWith(q)),
  )
}

export function createBlock(type: BlockType, text = ''): Block {
  if (type === 'divider') return { id: newId(), type }
  if (type === 'sketch') return { id: newId(), type, height: 280, paper: 'blank', strokes: [] }
  return { id: newId(), type, text, ...(type === 'todo' ? { checked: false } : {}) }
}

/** Markdown-style prefixes that convert a paragraph as you type. */
export const MARKDOWN_SHORTCUTS: [string, BlockType, { checked?: boolean }?][] = [
  ['### ', 'heading3'],
  ['## ', 'heading2'],
  ['# ', 'heading1'],
  ['- ', 'bulleted'],
  ['* ', 'bulleted'],
  ['1. ', 'numbered'],
  ['[] ', 'todo'],
  ['[ ] ', 'todo'],
  ['[x] ', 'todo', { checked: true }],
  ['> ', 'quote'],
  ['```', 'code'],
  ['---', 'divider'],
]

/** Types whose "Enter" creates another block of the same type. */
export const CONTINUING_TYPES: TextBlockType[] = ['bulleted', 'numbered', 'todo']
