'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { addMonths, isSameDay, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toDateKey } from '@/lib/date'
import { cn } from '@/lib/utils'

const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function monthGrid(view: Date): (Date | null)[] {
  const y = view.getFullYear()
  const m = view.getMonth()
  const first = new Date(y, m, 1)
  const pad = (first.getDay() + 6) % 7
  const dim = new Date(y, m + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < pad; i++) cells.push(null)
  for (let d = 1; d <= dim; d++) cells.push(new Date(y, m, d))
  while (cells.length % 7 !== 0) cells.push(null)
  while (cells.length < 42) cells.push(null)
  return cells
}

export function RecurrenceEndDatePicker({
  value,
  disabled,
  onChange,
  onClearToNever,
}: {
  value: string | undefined
  disabled?: boolean
  onChange: (isoDate: string) => void
  onClearToNever?: () => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => {
    if (value) return new Date(`${value}T12:00:00`)
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  })
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const syncViewFromValue = useCallback(() => {
    if (value) {
      const d = new Date(`${value}T12:00:00`)
      setView(new Date(d.getFullYear(), d.getMonth(), 1))
    } else {
      const n = new Date()
      setView(new Date(n.getFullYear(), n.getMonth(), 1))
    }
  }, [value])

  useLayoutEffect(() => {
    if (!open) return
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const pw = 280
    const ph = 300
    let left = Math.min(r.left, window.innerWidth - pw - 10)
    left = Math.max(10, left)
    const gap = 6
    const below = r.bottom + gap
    const above = r.top - ph - gap
    const flip = below + ph > window.innerHeight - 12 && above >= 12
    setPos({ top: flip ? above : below, left })
  }, [open, view])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function shouldIgnoreClose(target: EventTarget | null) {
      const el = target as HTMLElement | null
      if (!el?.closest) return false
      // Let calendar task drag / grid interaction run without stealing the gesture.
      if (el.closest('[data-task-block]') || el.closest('[data-task-day-grid]')) return true
      return false
    }
    function onDocPointer(e: PointerEvent) {
      const t = e.target as Node
      if (popRef.current?.contains(t) || triggerRef.current?.contains(t)) return
      if (shouldIgnoreClose(e.target)) return
      setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDocPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDocPointer)
    }
  }, [open])

  const cells = monthGrid(view)
  const selected = value ? new Date(`${value}T12:00:00`) : null
  const label = view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const displayLabel = value
    ? new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Choose date'

  const popover = open && typeof document !== 'undefined' && (
    <div
      ref={popRef}
      data-recurrence-date-popover
      className="fixed z-[100] w-[280px] rounded-xl border border-surface-border bg-surface-card p-3 shadow-[0_12px_40px_rgba(0,0,0,0.14)]"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setView((d) => addMonths(d, -1))}
          className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink-primary"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-0 flex-1 text-center text-[13px] font-semibold text-ink-primary">{label}</span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setView((d) => addMonths(d, 1))}
          className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink-primary"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEK_LABELS.map((w, i) => (
          <div key={i} className="pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-ghost">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} className="h-8" />
          const key = toDateKey(d)
          const isSel = selected && isSameDay(d, selected)
          const today = isToday(d)
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                onChange(key)
                setOpen(false)
              }}
              className={cn(
                'mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-medium transition-colors',
                isSel
                  ? 'bg-brand-400 text-white shadow-sm'
                  : today
                    ? 'text-brand-600 ring-1 ring-brand-400/45 hover:bg-brand-400/10'
                    : 'text-ink-primary hover:bg-surface-muted',
              )}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-surface-border pt-2.5">
        <button
          type="button"
          onClick={() => {
            onClearToNever?.()
            setOpen(false)
          }}
          className="text-[12px] font-medium text-brand-600 hover:text-brand-500 hover:underline"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => {
            const k = toDateKey(new Date())
            onChange(k)
            setOpen(false)
          }}
          className="text-[12px] font-medium text-brand-600 hover:text-brand-500 hover:underline"
        >
          Today
        </button>
      </div>
    </div>
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          syncViewFromValue()
          setOpen((o) => !o)
        }}
        className={cn(
          'input-base flex w-full items-center justify-between gap-2 text-left text-[12px] font-medium text-ink-primary',
          disabled && 'cursor-not-allowed opacity-45',
        )}
      >
        <span className="min-w-0 truncate">{displayLabel}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-ink-muted" aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
      {popover ? createPortal(popover, document.body) : null}
    </>
  )
}
