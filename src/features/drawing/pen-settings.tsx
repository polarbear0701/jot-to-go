import { PencilRuler } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  PENCILCASE_MAX_PENS,
  activePencilcasePen,
  useUI,
  type InkTool,
  type PenConfig,
} from '@/store/ui'
import { colorName } from './colors'
import { PenPreview } from './pen-preview'

function Setting({
  label,
  value,
  display,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  display: string
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">{display}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  )
}

const pct = (v: number) => `${Math.round(v * 100)}%`

/** Settings popover for the pen / highlighter: opened by tapping the active tool again. */
export function InkSettings({ tool }: { tool: InkTool }) {
  const drawing = useUI((s) => s.drawing)
  const setPenConfig = useUI((s) => s.setPenConfig)
  const savePen = useUI((s) => s.savePen)
  const config = drawing[tool]
  const set = (patch: Partial<PenConfig>) => setPenConfig(tool, patch)
  const saved = activePencilcasePen(drawing)
  const full = drawing.pencilcase.pens.length >= PENCILCASE_MAX_PENS

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{tool === 'pen' ? 'Pen' : 'Highlighter'}</span>
        <span className="text-xs text-muted-foreground">{colorName(config.color)}</span>
      </div>
      <div className="flex justify-center rounded-lg border bg-paper py-1">
        <PenPreview tool={tool} config={config} />
      </div>

      {tool === 'pen' ? (
        <>
          <Setting label="Thickness" value={config.size} display={`${config.size}px`} min={1} max={32} onChange={(size) => set({ size })} />
          <Setting
            label="Opacity"
            value={config.opacity}
            display={pct(config.opacity)}
            min={0.1}
            max={1}
            step={0.05}
            onChange={(opacity) => set({ opacity })}
          />
          <Setting
            label="Pressure sensitivity"
            value={config.thinning}
            display={config.thinning === 0 ? 'Off' : pct(config.thinning / 0.9)}
            min={0}
            max={0.9}
            step={0.05}
            onChange={(thinning) => set({ thinning })}
          />
          <Setting
            label="Smoothing"
            value={config.streamline}
            display={pct(config.streamline / 0.9)}
            min={0}
            max={0.9}
            step={0.05}
            onChange={(streamline) => set({ streamline })}
          />
        </>
      ) : (
        <>
          <Setting label="Thickness" value={config.size} display={`${config.size}px`} min={6} max={56} onChange={(size) => set({ size })} />
          <Setting
            label="Opacity"
            value={config.opacity}
            display={pct(config.opacity)}
            min={0.1}
            max={0.8}
            step={0.05}
            onChange={(opacity) => set({ opacity })}
          />
        </>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={!!saved || full}
        onClick={() => savePen()}
      >
        <PencilRuler />
        {saved ? 'Saved in Pencilcase' : full ? `Pencilcase is full (${PENCILCASE_MAX_PENS}/${PENCILCASE_MAX_PENS})` : 'Save to Pencilcase'}
      </Button>
    </div>
  )
}

export function EraserSettings() {
  const size = useUI((s) => s.drawing.eraserSize)
  const setDrawing = useUI((s) => s.setDrawing)
  return (
    <div className="space-y-4">
      <span className="text-sm font-semibold">Eraser</span>
      <div className="flex h-16 items-center justify-center rounded-lg border bg-paper">
        <span className="rounded-full border-[1.5px] border-dashed border-muted-foreground" style={{ width: size, height: size }} />
      </div>
      <Setting label="Size" value={size} display={`${size}px`} min={6} max={80} onChange={(eraserSize) => setDrawing({ eraserSize })} />
      <p className="text-xs text-muted-foreground">Erases whole strokes it touches. A stylus eraser button works too.</p>
    </div>
  )
}
