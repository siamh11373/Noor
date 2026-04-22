'use client'

import { useEffect, useRef } from 'react'

interface SequenceMap {
  [leader: string]: Record<string, () => void>
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return false
}

/**
 * Minimal leader-key sequence support (e.g. `g f` → go to faith).
 *
 * Press `leader` within an empty input focus, then press a follower within
 * `timeoutMs` to trigger. Any non-follower key or timeout resets state.
 */
export function useKeySequence(map: SequenceMap, timeoutMs = 900) {
  const pendingRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mapRef = useRef<SequenceMap>(map)

  mapRef.current = map

  useEffect(() => {
    function reset() {
      pendingRef.current = null
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isEditable(event.target)) return

      const key = event.key.toLowerCase()
      if (key.length !== 1 && key !== 'escape') return

      const pending = pendingRef.current
      if (pending) {
        const followers = mapRef.current[pending]
        const handler = followers?.[key]
        reset()
        if (handler) {
          event.preventDefault()
          handler()
        }
        return
      }

      if (mapRef.current[key]) {
        pendingRef.current = key
        timerRef.current = setTimeout(reset, timeoutMs)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      reset()
    }
  }, [timeoutMs])
}
