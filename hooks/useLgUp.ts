'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(min-width: 1024px)'

function getMatches() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(QUERY).matches
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

/** True at lg breakpoint and above (Tailwind `lg`). */
export function useLgUp() {
  return useSyncExternalStore(subscribe, getMatches, () => false)
}
