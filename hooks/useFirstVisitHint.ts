'use client'

import { useEffect } from 'react'
import { toast } from '@/components/ui/toast-host'
import { useShortcutsUi } from '@/lib/shortcuts'

const STORAGE_KEY = 'noor-shortcuts-hint-seen'

/**
 * Shows a one-time "Press ? for shortcuts" toast on the user's first visit
 * after auth settles. Persisted via localStorage so it never fires twice.
 */
export function useFirstVisitHint(ready: boolean) {
  const setHelpOpen = useShortcutsUi((s) => s.setHelpOpen)

  useEffect(() => {
    if (!ready) return
    if (typeof window === 'undefined') return
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === '1') return
    } catch {
      return
    }

    const timer = setTimeout(() => {
      toast.show('Tip: press ? to see keyboard shortcuts', {
        tone: 'neutral',
        durationMs: 6000,
        actionLabel: 'Show',
        onAction: () => setHelpOpen(true),
      })
      try {
        window.localStorage.setItem(STORAGE_KEY, '1')
      } catch {
        // ignore quota / privacy mode
      }
    }, 1200)

    return () => clearTimeout(timer)
  }, [ready, setHelpOpen])
}
