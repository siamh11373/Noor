'use client'

import { useStore } from 'zustand'
import { useTemporalStore } from '@/lib/store'

export interface UndoRedoApi {
  undo: () => void
  redo: () => void
  clear: () => void
  canUndo: boolean
  canRedo: boolean
}

/** Bridge to the zundo temporal store. Subscribes to can-undo/can-redo. */
export function useUndoRedo(): UndoRedoApi {
  const undo = useStore(useTemporalStore, (s) => s.undo)
  const redo = useStore(useTemporalStore, (s) => s.redo)
  const clear = useStore(useTemporalStore, (s) => s.clear)
  const canUndo = useStore(useTemporalStore, (s) => s.pastStates.length > 0)
  const canRedo = useStore(useTemporalStore, (s) => s.futureStates.length > 0)

  return { undo, redo, clear, canUndo, canRedo }
}
