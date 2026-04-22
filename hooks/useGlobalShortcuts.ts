'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useKeySequence } from '@/hooks/useKeySequence'
import { useShortcutsUi } from '@/lib/shortcuts'
import { dispatchShortcutEvent } from '@/lib/shortcut-events'

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return false
}

/**
 * Global shortcuts: vim-style `g`-leader navigation plus `?` help toggle
 * and `Escape` to close the help overlay.
 *
 * We handle `?` with a raw keydown listener matching `event.key === '?'`
 * because `shift+/` parsing differs across keyboard layouts and some OSes.
 */
export function useGlobalShortcuts() {
  const router = useRouter()
  const toggleHelp = useShortcutsUi((s) => s.toggleHelp)
  const setHelpOpen = useShortcutsUi((s) => s.setHelpOpen)

  useKeySequence({
    g: {
      f: () => router.push('/faith'),
      t: () => router.push('/tasks'),
      i: () => router.push('/fitness'),
      c: () => router.push('/circles'),
      a: () => router.push('/account'),
    },
  })

  useEffect(() => {
    // Detects shift+/ as '?' across layouts & browsers.
    // Some layouts/IMEs don't produce event.key === '?' reliably, so we also
    // accept `event.code === 'Slash'` with shiftKey, and KeyboardEvent.which 191.
    function isQuestionMark(event: KeyboardEvent): boolean {
      if (event.key === '?') return true
      if (event.shiftKey && (event.code === 'Slash' || event.key === '/')) return true
      return false
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return

      if (isQuestionMark(event)) {
        if (isEditable(event.target)) return
        event.preventDefault()
        event.stopPropagation()
        toggleHelp()
        return
      }

      if (event.key === '.') {
        if (isEditable(event.target)) return
        event.preventDefault()
        dispatchShortcutEvent('timer:open')
        return
      }

      if (event.key === 'Escape') {
        setHelpOpen(false)
      }
    }

    // Capture phase so we fire before any component-level handlers that might
    // stopPropagation() (focus traps, dialog overlays, etc.).
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [toggleHelp, setHelpOpen])
}
