/**
 * Ink palette: one column per hue, rows from dark to pastel.
 * `ink` is a special token that renders black in light mode and white in dark mode.
 */
export const PALETTE_COLUMNS: { name: string; shades: string[] }[] = [
  { name: 'Neutral', shades: ['ink', '#52525b', '#a1a1aa', '#e4e4e7', '#ffffff'] },
  { name: 'Red', shades: ['#991b1b', '#dc2626', '#f87171', '#fecaca', '#fef2f2'] },
  { name: 'Orange', shades: ['#9a3412', '#ea580c', '#fb923c', '#fed7aa', '#fff7ed'] },
  { name: 'Yellow', shades: ['#854d0e', '#ca8a04', '#facc15', '#fde047', '#fef9c3'] },
  { name: 'Green', shades: ['#166534', '#16a34a', '#4ade80', '#a3e635', '#dcfce7'] },
  { name: 'Teal', shades: ['#115e59', '#0d9488', '#2dd4bf', '#67e8f9', '#ccfbf1'] },
  { name: 'Blue', shades: ['#1e3a8a', '#2563eb', '#60a5fa', '#93c5fd', '#dbeafe'] },
  { name: 'Purple', shades: ['#581c87', '#9333ea', '#c084fc', '#d8b4fe', '#f3e8ff'] },
  { name: 'Pink', shades: ['#9d174d', '#db2777', '#f472b6', '#f9a8d4', '#fce7f3'] },
  { name: 'Brown', shades: ['#451a03', '#78350f', '#b45309', '#d6a77a', '#f5e6d3'] },
]

const NAMES: Record<string, string> = Object.fromEntries(
  PALETTE_COLUMNS.flatMap((c) =>
    c.shades.map((s, i) => [s, s === 'ink' ? 'Ink' : `${c.name} ${['dark', '', 'light', 'soft', 'pale'][i]}`.trim()]),
  ),
)

export const colorName = (color: string) => NAMES[color] ?? color.toUpperCase()

export const isHexColor = (v: string) => /^#[0-9a-f]{6}$/i.test(v)
