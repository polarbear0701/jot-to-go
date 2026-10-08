import { useCallback, useRef, useState } from 'react'

/**
 * Undo / redo for a value that is owned elsewhere (e.g. the store).
 * Call `commit(next)` instead of writing directly; it records the previous value.
 */
export function useHistory<T>(value: T, write: (next: T) => void, limit = 100) {
  const past = useRef<T[]>([])
  const future = useRef<T[]>([])
  const [depth, setDepth] = useState({ past: 0, future: 0 })
  const sync = () => setDepth({ past: past.current.length, future: future.current.length })

  const commit = useCallback(
    (next: T) => {
      past.current = [...past.current.slice(-(limit - 1)), value]
      future.current = []
      write(next)
      sync()
    },
    [value, write, limit],
  )

  const undo = useCallback(() => {
    const prev = past.current.pop()
    if (prev === undefined) return
    future.current.push(value)
    write(prev)
    sync()
  }, [value, write])

  const redo = useCallback(() => {
    const next = future.current.pop()
    if (next === undefined) return
    past.current.push(value)
    write(next)
    sync()
  }, [value, write])

  return { commit, undo, redo, canUndo: depth.past > 0, canRedo: depth.future > 0 }
}
