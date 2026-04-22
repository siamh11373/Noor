'use client'

import { useShortcut } from '@/hooks/useShortcuts'

export interface CirclesShortcutHandlers {
  openNewCircle: () => void
  openJoinWithCode: () => void
  openPairingInvite: () => void
  shiftActiveCircle: (dir: -1 | 1) => void
}

/**
 * Circles page shortcuts:
 *   n     → new circle
 *   j     → join with code (pairing)
 *   i     → pairing invite
 *   [ / ] → previous / next circle tab
 */
export function useCirclesShortcuts(h: CirclesShortcutHandlers) {
  useShortcut('n', () => h.openNewCircle(), {}, [h.openNewCircle])
  useShortcut('j', () => h.openJoinWithCode(), {}, [h.openJoinWithCode])
  useShortcut('i', () => h.openPairingInvite(), {}, [h.openPairingInvite])
  useShortcut('[', () => h.shiftActiveCircle(-1), {}, [h.shiftActiveCircle])
  useShortcut(']', () => h.shiftActiveCircle(1), {}, [h.shiftActiveCircle])
}
