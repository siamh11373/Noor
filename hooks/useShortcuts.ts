'use client'

import { useHotkeys, type Options } from 'react-hotkeys-hook'
import type { DependencyList } from 'react'

type Keys = string | string[]

export interface ShortcutOptions {
  /** Allow shortcut while focus is in a text input / textarea / contenteditable. */
  allowInInputs?: boolean
  /** Prevent default for matched event. Default true. */
  preventDefault?: boolean
  /** Additional `enabled` flag. */
  enabled?: boolean
  /** Scope tag forwarded to react-hotkeys-hook. */
  scopes?: string | string[]
}

/**
 * Thin wrapper around react-hotkeys-hook that:
 * - Disables shortcuts while typing in form fields by default.
 * - Normalizes string[] keys into a comma-separated string.
 * - Exposes deps so stale-closure issues are obvious.
 */
export function useShortcut(
  keys: Keys,
  handler: (event: KeyboardEvent) => void,
  opts: ShortcutOptions = {},
  deps: DependencyList = []
): void {
  const hotkeys = Array.isArray(keys) ? keys.join(',') : keys

  const options: Options = {
    enableOnFormTags: opts.allowInInputs === true,
    enableOnContentEditable: opts.allowInInputs === true,
    preventDefault: opts.preventDefault !== false,
    enabled: opts.enabled !== false,
    ...(opts.scopes ? { scopes: opts.scopes } : {}),
  }

  useHotkeys(hotkeys, handler, options, deps)
}
