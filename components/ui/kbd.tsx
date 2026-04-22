'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { isMac, renderKey } from '@/lib/shortcuts'

interface KbdProps {
  keys: string[]
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Keyboard key chip(s). Renders one rounded chip per key with a thin "+"
 * separator. Platform-aware: shows ⌘ on macOS and Ctrl elsewhere.
 *
 * SSR safety: first render always assumes non-mac so client + server output
 * agree; we swap to the correct label after mount.
 */
export function Kbd({ keys, size = 'sm', className }: KbdProps) {
  const [mac, setMac] = useState(false)
  useEffect(() => {
    setMac(isMac())
  }, [])

  const chipClass = cn(
    'inline-flex items-center justify-center rounded-md border border-surface-border bg-surface-muted font-mono text-ink-secondary shadow-control',
    size === 'sm' ? 'min-w-[22px] px-1.5 py-0.5 text-[11px]' : 'min-w-[26px] px-2 py-0.5 text-[12px]'
  )

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {keys.map((key, index) => (
        <span key={`${key}-${index}`} className="inline-flex items-center gap-1">
          {index > 0 && <span className="text-[10px] text-ink-ghost">+</span>}
          <kbd className={chipClass}>{renderKey(key, mac)}</kbd>
        </span>
      ))}
    </span>
  )
}
