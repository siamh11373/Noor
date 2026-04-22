'use client'

import { useShortcut } from '@/hooks/useShortcuts'
import { useSalahStore } from '@/lib/store'
import { PRAYER_ORDER } from '@/lib/prayers'

export interface FaithShortcutHandlers {
  openFridayReview: () => void
  openDhikrLog: () => void
}

/**
 * Faith page shortcuts:
 *   1..5 → toggle Fajr / Dhuhr / Asr / Maghrib / Isha
 *   d    → open Dhikr log dialog
 *   r    → open Friday review dialog
 *   q    → focus Quran log input (#faith-quran-input)
 */
export function useFaithShortcuts(handlers: FaithShortcutHandlers) {
  const togglePrayer = useSalahStore((s) => s.togglePrayer)

  useShortcut('1', () => togglePrayer(PRAYER_ORDER[0]))
  useShortcut('2', () => togglePrayer(PRAYER_ORDER[1]))
  useShortcut('3', () => togglePrayer(PRAYER_ORDER[2]))
  useShortcut('4', () => togglePrayer(PRAYER_ORDER[3]))
  useShortcut('5', () => togglePrayer(PRAYER_ORDER[4]))

  useShortcut('d', () => handlers.openDhikrLog(), {}, [handlers.openDhikrLog])
  useShortcut('r', () => handlers.openFridayReview(), {}, [handlers.openFridayReview])

  useShortcut('q', () => {
    if (typeof document === 'undefined') return
    const el = document.getElementById('faith-quran-input') as HTMLInputElement | null
    el?.focus()
  })
}
