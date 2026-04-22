'use client'

import { useShortcut } from '@/hooks/useShortcuts'
import { dispatchShortcutEvent } from '@/lib/shortcut-events'
import type { ExerciseType } from '@/types'

export interface FitnessShortcutHandlers {
  openExerciseDialog: () => void
  openHistoryDialog: () => void
  selectType: (type: ExerciseType) => void
}

/**
 * Fitness page shortcuts:
 *   e     → add exercise
 *   f     → log meal (via event bus since FoodLog owns its own state)
 *   h     → open history
 *   1..7  → select workout type
 *   s     → focus session note input (#fitness-session-note)
 */
export function useFitnessShortcuts(h: FitnessShortcutHandlers) {
  useShortcut('e', () => h.openExerciseDialog(), {}, [h.openExerciseDialog])
  useShortcut('h', () => h.openHistoryDialog(), {}, [h.openHistoryDialog])
  useShortcut('f', () => dispatchShortcutEvent('fitness:open-food'))

  useShortcut('s', () => {
    if (typeof document === 'undefined') return
    const el = document.getElementById('fitness-session-note') as HTMLInputElement | null
    el?.focus()
  })

  useShortcut('1', () => h.selectType('Gym'),        {}, [h.selectType])
  useShortcut('2', () => h.selectType('Run'),        {}, [h.selectType])
  useShortcut('3', () => h.selectType('Walk'),       {}, [h.selectType])
  useShortcut('4', () => h.selectType('Basketball'), {}, [h.selectType])
  useShortcut('5', () => h.selectType('Swim'),       {}, [h.selectType])
  useShortcut('6', () => h.selectType('Cycling'),    {}, [h.selectType])
  useShortcut('7', () => h.selectType('Other'),      {}, [h.selectType])
}
