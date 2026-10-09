import { newId } from '@/lib/id'
import type { Block, CanvasPage, NotePage, Page, Stroke, StrokePoint } from '@/lib/types'

/** Generates a stroke from a parametric curve so the demo canvases aren't empty. */
function curve(
  fn: (t: number) => [number, number],
  opts: { color?: string; size?: number; tool?: Stroke['tool']; steps?: number } = {},
): Stroke {
  const steps = opts.steps ?? 60
  const points: StrokePoint[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const [x, y] = fn(t)
    points.push([x, y, 0.35 + 0.3 * Math.sin(Math.PI * t)])
  }
  return {
    id: newId(),
    tool: opts.tool ?? 'pen',
    color: opts.color ?? 'ink',
    size: opts.size ?? 4,
    points,
    pressure: true,
  }
}

const line = (x1: number, y1: number, x2: number, y2: number, o?: Parameters<typeof curve>[1]) =>
  curve((t) => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * 2], { steps: 12, ...o })

const ellipse = (cx: number, cy: number, rx: number, ry: number, o?: Parameters<typeof curve>[1]) =>
  curve((t) => {
    const a = -Math.PI / 2 + t * Math.PI * 2.08
    const wobble = 1 + 0.03 * Math.sin(t * 9)
    return [cx + Math.cos(a) * rx * wobble, cy + Math.sin(a) * ry * wobble]
  }, o)

const arrow = (x1: number, y1: number, x2: number, y2: number, o?: Parameters<typeof curve>[1]) => {
  // Tangent of the arced shaft at its end point.
  const angle = Math.atan2(y2 - y1 + 24 * Math.PI, x2 - x1)
  const head = 18
  return [
    curve(
      (t) => [
        x1 + (x2 - x1) * t,
        y1 + (y2 - y1) * t - Math.sin(t * Math.PI) * 24,
      ],
      { steps: 30, ...o },
    ),
    line(x2, y2, x2 - head * Math.cos(angle - 0.5), y2 - head * Math.sin(angle - 0.5), o),
    line(x2, y2, x2 - head * Math.cos(angle + 0.5), y2 - head * Math.sin(angle + 0.5), o),
  ]
}

const squiggle = (x: number, y: number, width: number, o?: Parameters<typeof curve>[1]) =>
  curve((t) => [x + t * width, y + Math.sin(t * Math.PI * 6) * 6], { steps: 80, ...o })

const star = (cx: number, cy: number, r: number, o?: Parameters<typeof curve>[1]) =>
  curve((t) => {
    const i = Math.floor(t * 10) % 10
    const f = t * 10 - Math.floor(t * 10)
    const p = (k: number) => {
      const a = -Math.PI / 2 + (k * Math.PI) / 5
      const rr = k % 2 === 0 ? r : r * 0.45
      return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]
    }
    const a = p(i)
    const b = p(i + 1)
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
  }, { steps: 100, ...o })

const text = (type: Exclude<Block['type'], 'divider' | 'sketch'>, value: string, checked?: boolean): Block => ({
  id: newId(),
  type,
  text: value,
  ...(type === 'todo' ? { checked: !!checked } : {}),
})

export function createSeedPages(): Record<string, Page> {
  const now = Date.now()
  const welcomeId = newId()
  const meetingId = newId()
  const sketchbookId = newId()
  const boardId = newId()

  const welcome: NotePage = {
    id: welcomeId,
    kind: 'note',
    parentId: null,
    title: 'Welcome to Jot to Go',
    icon: '👋',
    cover: 'linear-gradient(120deg, #fde68a 0%, #fca5a5 50%, #c4b5fd 100%)',
    favorite: true,
    trashedAt: null,
    fullWidth: false,
    createdAt: now - 1000 * 60 * 60 * 26,
    updatedAt: now - 1000 * 60 * 4,
    blocks: [
      text('paragraph', 'Jot to Go mixes typed notes with handwriting. Type, sketch, or do both on the same page.'),
      text('heading2', 'Typing'),
      text('bulleted', 'Press “/” on an empty line to insert headings, lists, to-dos, quotes, code or a sketch.'),
      text('bulleted', 'Markdown shortcuts work too: “# ”, “- ”, “1. ”, “[] ”, “> ”, “```” and “---”.'),
      text(
        'bulleted',
        'Inline Markdown renders as you go: **bold**, *italic*, `code`, ~~strike~~ and [links](https://bun.sh). ⌘B, ⌘I, ⌘E and ⌘K format a selection.',
      ),
      text('bulleted', 'Every note is Markdown underneath: use the **Markdown** button at the top, or export it as a .md file from the ••• menu.'),
      text('todo', 'Try checking this box', true),
      text('todo', 'Create your first page from the sidebar'),
      text('heading2', 'Drawing'),
      text(
        'paragraph',
        'Sketch blocks live inside notes. Use a stylus, your finger or the mouse. Turn on “Stylus only” to scroll with your finger and draw with the pen.',
      ),
      {
        id: newId(),
        type: 'sketch',
        height: 260,
        paper: 'dotted',
        strokes: [
          ellipse(140, 120, 90, 60),
          ...arrow(250, 120, 420, 120, { color: '#2563eb' }),
          star(520, 120, 60, { color: '#f59e0b', size: 5 }),
          squiggle(60, 215, 520, { tool: 'highlighter', color: '#a3e635', size: 18 }),
        ],
      },
      text(
        'callout',
        'Canvas pages give you a full drawing surface. Switch between Page mode (paper sheets) and Infinite mode (a boundless board) any time.',
      ),
      { id: newId(), type: 'divider' },
      text('quote', 'The faintest ink is more powerful than the strongest memory.'),
    ],
  }

  const meeting: NotePage = {
    id: meetingId,
    kind: 'note',
    parentId: welcomeId,
    title: 'Weekly sync',
    icon: '🗓️',
    cover: null,
    favorite: false,
    trashedAt: null,
    fullWidth: false,
    createdAt: now - 1000 * 60 * 60 * 5,
    updatedAt: now - 1000 * 60 * 60 * 2,
    blocks: [
      text('heading3', 'Agenda'),
      text('numbered', 'Review last week'),
      text('numbered', 'Roadmap for the drawing engine'),
      text('numbered', 'Backend API shape'),
      text('heading3', 'Action items'),
      text('todo', 'Pick a sync strategy (CRDT vs. last-write-wins)'),
      text('todo', 'Sketch onboarding flow', true),
      text('code', 'GET  /api/pages\nPOST /api/pages/:id/strokes'),
    ],
  }

  const sketchbook: CanvasPage = {
    id: sketchbookId,
    kind: 'canvas',
    parentId: null,
    title: 'Lecture notes',
    icon: '📓',
    cover: null,
    favorite: false,
    trashedAt: null,
    createdAt: now - 1000 * 60 * 60 * 50,
    updatedAt: now - 1000 * 60 * 60 * 20,
    canvas: {
      mode: 'page',
      paper: 'lined',
      pageCount: 2,
      strokes: [
        squiggle(90, 120, 260, { size: 3 }),
        line(90, 160, 600, 160, { color: '#dc2626', size: 3 }),
        ellipse(220, 360, 120, 80, { color: '#2563eb' }),
        ...arrow(360, 360, 560, 300),
        line(120, 520, 680, 520, { tool: 'highlighter', color: '#fde047', size: 22 }),
      ],
    },
  }

  const board: CanvasPage = {
    id: boardId,
    kind: 'canvas',
    parentId: null,
    title: 'Brainstorm board',
    icon: '🧠',
    cover: null,
    favorite: true,
    trashedAt: null,
    createdAt: now - 1000 * 60 * 60 * 3,
    updatedAt: now - 1000 * 60 * 30,
    canvas: {
      mode: 'infinite',
      paper: 'dotted',
      pageCount: 1,
      strokes: [
        ellipse(400, 300, 140, 90, { size: 5 }),
        ellipse(80, 80, 70, 50, { color: '#16a34a' }),
        ellipse(760, 120, 80, 55, { color: '#9333ea' }),
        ellipse(720, 520, 90, 60, { color: '#ea580c' }),
        ellipse(90, 520, 75, 55, { color: '#2563eb' }),
        line(290, 240, 140, 120),
        line(520, 240, 690, 160),
        line(510, 360, 640, 480),
        line(290, 360, 160, 480),
        star(400, 300, 40, { color: '#f59e0b' }),
      ],
    },
  }

  return { [welcomeId]: welcome, [meetingId]: meeting, [sketchbookId]: sketchbook, [boardId]: board }
}
