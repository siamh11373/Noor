'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/kbd'
import {
  ALL_SHORTCUTS,
  GROUP_ACCENT,
  GROUP_LABELS,
  GROUP_ORDER,
  useShortcutsUi,
  type ShortcutDefinition,
  type ShortcutGroup,
} from '@/lib/shortcuts'
import { cn } from '@/lib/utils'

function currentPillarGroup(pathname: string): ShortcutGroup | null {
  if (pathname.startsWith('/faith')) return 'faith'
  if (pathname.startsWith('/tasks')) return 'tasks'
  if (pathname.startsWith('/fitness')) return 'fitness'
  if (pathname.startsWith('/circles')) return 'circles'
  return null
}

function shouldShow(shortcut: ShortcutDefinition, pathname: string) {
  if (!shortcut.pathPrefix) return true
  return pathname.startsWith(shortcut.pathPrefix)
}

export function ShortcutsHelpDialog() {
  const open = useShortcutsUi((s) => s.helpOpen)
  const setOpen = useShortcutsUi((s) => s.setHelpOpen)
  const pathname = usePathname() ?? ''
  const [query, setQuery] = useState('')

  const pillarGroup = currentPillarGroup(pathname)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ALL_SHORTCUTS.filter((s) => {
      if (!shouldShow(s, pathname)) return false
      if (!q) return true
      return (
        s.label.toLowerCase().includes(q) ||
        s.keys.some((k) => k.toLowerCase().includes(q))
      )
    })
  }, [query, pathname])

  const grouped = useMemo(() => {
    const map = new Map<ShortcutGroup, ShortcutDefinition[]>()
    for (const shortcut of filtered) {
      const list = map.get(shortcut.group) ?? []
      list.push(shortcut)
      map.set(shortcut.group, list)
    }

    const ordered = GROUP_ORDER
      .map((group) => {
        const items = map.get(group) ?? []
        return { group, items }
      })
      .filter((section) => section.items.length > 0)

    if (pillarGroup) {
      const idx = ordered.findIndex((section) => section.group === pillarGroup)
      if (idx > 0) {
        const [pulled] = ordered.splice(idx, 1)
        ordered.unshift(pulled)
      }
    }

    return ordered
  }, [filtered, pillarGroup])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[min(94vw,720px)] max-h-[84vh] overflow-hidden p-0">
        <div className="border-b border-surface-border px-5 pt-5 pb-4">
          <DialogHeader className="mb-2">
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>
              Press <Kbd keys={['Esc']} className="align-middle" /> to close.{' '}
              <Kbd keys={['alt', '1']} className="align-middle" />–
              <Kbd keys={['alt', '5']} className="align-middle" /> jump between main pages. Shortcuts are
              disabled while typing in text fields.
            </DialogDescription>
          </DialogHeader>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shortcuts…"
            autoFocus
            className="input-base w-full"
          />
        </div>

        <div className="max-h-[min(64vh,520px)] overflow-y-auto px-5 py-4">
          {grouped.length === 0 && (
            <p className="py-8 text-center text-[13px] text-ink-ghost">
              No shortcuts match &ldquo;{query}&rdquo;.
            </p>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            {grouped.map(({ group, items }) => (
              <section key={group}>
                <h3
                  className={cn(
                    'mb-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide shadow-control',
                    GROUP_ACCENT[group]
                  )}
                >
                  {GROUP_LABELS[group]}
                </h3>
                <ul className="space-y-1.5">
                  {items.map((shortcut) => (
                    <li
                      key={shortcut.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-muted"
                    >
                      <span className="text-[13px] text-ink-secondary">{shortcut.label}</span>
                      <Kbd keys={shortcut.keys} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <div className="border-t border-surface-border bg-surface-muted/60 px-5 py-3">
          <p className="text-[12px] text-ink-ghost">
            Tip: press <Kbd keys={['?']} className="align-middle" /> anywhere to reopen this.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
