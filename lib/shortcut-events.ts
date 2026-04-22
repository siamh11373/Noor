'use client'

/**
 * Tiny window-event bus for shortcut → component actions that would otherwise
 * require threading state through many levels of props.
 *
 * Usage:
 *   dispatchShortcutEvent('fitness:open-food')
 *
 *   useEffect(() => {
 *     const off = onShortcutEvent('fitness:open-food', () => setOpen(true))
 *     return off
 *   }, [])
 */

export type ShortcutEventName =
  | 'fitness:open-food'
  | 'fitness:focus-note'
  | 'fitness:select-type'
  | 'circles:open-new'
  | 'circles:open-join'
  | 'circles:open-invite'
  | 'circles:shift-active'
  | 'timer:open'

const PREFIX = 'noor-shortcut:'

export function dispatchShortcutEvent<T = unknown>(name: ShortcutEventName, detail?: T) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(`${PREFIX}${name}`, { detail }))
}

export function onShortcutEvent<T = unknown>(
  name: ShortcutEventName,
  handler: (detail: T | undefined) => void
): () => void {
  if (typeof window === 'undefined') return () => {}
  const listener = (event: Event) => {
    handler((event as CustomEvent<T>).detail)
  }
  window.addEventListener(`${PREFIX}${name}`, listener)
  return () => window.removeEventListener(`${PREFIX}${name}`, listener)
}
