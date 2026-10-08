/**
 * Core domain model. Everything here is plain JSON so it can be persisted to
 * localStorage today and sent to / received from a backend API later.
 */

export type ID = string

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

/** [x, y, pressure] in world coordinates. Pressure is 0..1. */
export type StrokePoint = [number, number, number]

export type DrawTool = 'pen' | 'highlighter' | 'eraser' | 'hand'

export interface Stroke {
  id: ID
  tool: 'pen' | 'highlighter'
  /** CSS color, or the special token `ink` which follows the theme (black / white). */
  color: string
  size: number
  points: StrokePoint[]
  /** True when the points carry real pressure data (stylus). */
  pressure: boolean
}

export type PaperStyle = 'blank' | 'lined' | 'grid' | 'dotted'

/** `page` = fixed-size paper sheets stacked vertically, `infinite` = boundless board. */
export type CanvasMode = 'page' | 'infinite'

export interface CanvasContent {
  mode: CanvasMode
  paper: PaperStyle
  /** Number of sheets when in page mode. */
  pageCount: number
  strokes: Stroke[]
}

// ---------------------------------------------------------------------------
// Note blocks
// ---------------------------------------------------------------------------

export type TextBlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulleted'
  | 'numbered'
  | 'todo'
  | 'quote'
  | 'callout'
  | 'code'

export type BlockType = TextBlockType | 'divider' | 'sketch'

export interface TextBlock {
  id: ID
  type: TextBlockType
  text: string
  checked?: boolean
}

export interface DividerBlock {
  id: ID
  type: 'divider'
}

/** A handwritten / drawn area embedded inside a note. */
export interface SketchBlock {
  id: ID
  type: 'sketch'
  height: number
  paper: PaperStyle
  strokes: Stroke[]
}

export type Block = TextBlock | DividerBlock | SketchBlock

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export type PageKind = 'note' | 'canvas'

interface PageBase {
  id: ID
  parentId: ID | null
  title: string
  icon: string | null
  /** CSS background value (gradient) or null for no cover. */
  cover: string | null
  favorite: boolean
  trashedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface NotePage extends PageBase {
  kind: 'note'
  blocks: Block[]
  fullWidth: boolean
}

export interface CanvasPage extends PageBase {
  kind: 'canvas'
  canvas: CanvasContent
}

export type Page = NotePage | CanvasPage

export function isTextBlock(block: Block): block is TextBlock {
  return block.type !== 'divider' && block.type !== 'sketch'
}
