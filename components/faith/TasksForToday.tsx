'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { parseDateKey, toDateKey } from '@/lib/date'
import { nextStartForAppend } from '@/lib/task-schedule-order'
import { formatTimeDisplay, timeToMinutes } from '@/lib/tasks-calendar'
import { useSalahStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { CalendarTask } from '@/types'

function pillarCaption(pillar: CalendarTask['pillar']) {
  return pillar === 'career' ? 'tasks' : pillar
}

/** Move a `YYYY-MM-DD` key by ±N days while staying in local time. */
function shiftDateKey(key: string, deltaDays: number): string {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + deltaDays)
  return toDateKey(d)
}

/** Compact "Today" / "Tomorrow" / "Wed, Apr 22" label for the date chip. */
function formatDateHeader(key: string, todayKey: string): string {
  if (key === todayKey) return 'Today'
  if (key === shiftDateKey(todayKey, 1)) return 'Tomorrow'
  if (key === shiftDateKey(todayKey, -1)) return 'Yesterday'
  const d = parseDateKey(key)
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function TasksForToday({ className }: { className?: string }) {
  const calendarTasks = useSalahStore((s) => s.calendarTasks)
  const addCalendarTask = useSalahStore((s) => s.addCalendarTask)
  const toggleCalendarTask = useSalahStore((s) => s.toggleCalendarTask)
  const deleteCalendarTask = useSalahStore((s) => s.deleteCalendarTask)

  const todayKey = toDateKey(new Date())
  const [dateKey, setDateKey] = useState<string>(todayKey)
  const [menuTaskId, setMenuTaskId] = useState<string | null>(null)

  const dayTasks = useMemo(() => {
    const list = calendarTasks.filter((t) => t.date === dateKey)
    list.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
    return list
  }, [calendarTasks, dateKey])

  const compact = dayTasks.length > 6
  const isToday = dateKey === todayKey
  const headerLabel = formatDateHeader(dateKey, todayKey)
  const fullDate = useMemo(() => {
    const d = parseDateKey(dateKey)
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }, [dateKey])

  useEffect(() => {
    if (!menuTaskId) return
    function onPointerDown(e: PointerEvent) {
      const el = document.querySelector(`[data-task-menu="${menuTaskId}"]`)
      if (el && !el.contains(e.target as Node)) setMenuTaskId(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuTaskId])

  // ←/→ step by one day while the panel is focused. Ignored while any text
  // input is active so typing in /tasks isn't hijacked.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (document.activeElement?.closest('[data-tasks-for-today]') == null) return
      if (e.key === 'ArrowLeft') { e.preventDefault(); setDateKey((k) => shiftDateKey(k, -1)) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setDateKey((k) => shiftDateKey(k, +1)) }
      else if (e.key === 't' || e.key === 'T') { e.preventDefault(); setDateKey(todayKey) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [todayKey])

  const handleAddTask = useCallback(() => {
    const startTime = nextStartForAppend(dayTasks)
    addCalendarTask({
      title: '(No title)',
      date: dateKey,
      startTime,
      duration: 60,
      pillar: 'career',
      completed: false,
    })
  }, [addCalendarTask, dateKey, dayTasks])

  return (
    <div
      data-tasks-for-today
      tabIndex={-1}
      className={cn('flex min-h-0 flex-col outline-none', dayTasks.length > 0 && 'flex-1', className)}
    >
      {/* Date navigator: prev · mini-calendar trigger · next.
          The chip in the middle is a real button → opens a month picker. */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <DateNavigator
          dateKey={dateKey}
          todayKey={todayKey}
          headerLabel={headerLabel}
          fullDate={fullDate}
          onStep={(delta) => setDateKey((k) => shiftDateKey(k, delta))}
          onPick={(k) => setDateKey(k)}
        />

        {!isToday && (
          <button
            type="button"
            onClick={() => setDateKey(todayKey)}
            className="rounded-md border border-surface-border bg-surface-card px-2 py-1 text-[11px] font-medium text-ink-secondary shadow-sm transition-colors hover:bg-surface-muted hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/30"
          >
            Today
          </button>
        )}
      </div>

      {dayTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border bg-surface-raised/40 px-4 py-6 text-center">
          <p className="text-[13px] text-ink-muted">
            {isToday ? 'No tasks for today' : `No tasks for ${headerLabel.toLowerCase()}`}
          </p>
          <p className="mt-1 text-[11px] text-ink-ghost">Add one below or plan on the Tasks page</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-surface-border bg-surface-raised/40">
          <ul className="min-h-0 flex-1 divide-y divide-surface-border overflow-y-auto overscroll-contain">
            {dayTasks.map((task) => (
              <li key={task.id} className="relative">
                <div
                  className={cn(
                    'group flex items-start gap-3 transition-colors hover:bg-surface-muted/45',
                    compact ? 'px-3 py-2' : 'px-3.5 py-2.5',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleCalendarTask(task.id)}
                    className={cn(
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all',
                      task.completed
                        ? 'border-faith bg-faith'
                        : 'border-surface-border hover:border-ink-ghost',
                    )}
                    aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {task.completed && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                        <path
                          d="M2 5l2 2 4-4"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>

                  <Link
                    href="/tasks"
                    className="min-w-0 flex-1 rounded-lg py-0.5 text-left outline-none ring-brand-400/30 focus-visible:ring-2"
                  >
                    <p
                      className={cn(
                        'text-[13px] font-medium leading-snug',
                        task.completed ? 'text-ink-ghost line-through' : 'text-ink-primary',
                      )}
                    >
                      {task.title.trim() === '' || task.title === '(No title)' ? '(No title)' : task.title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-ink-ghost">
                      {formatTimeDisplay(task.startTime)}
                      <span className="text-ink-faint"> · </span>
                      <span className="capitalize">{pillarCaption(task.pillar)}</span>
                    </p>
                  </Link>

                  <div className="relative shrink-0" data-task-menu={task.id}>
                    <button
                      type="button"
                      onClick={() => setMenuTaskId((id) => (id === task.id ? null : task.id))}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg text-ink-ghost transition-colors',
                        'opacity-50 hover:bg-surface-muted/60 hover:text-ink-secondary md:opacity-0 md:group-hover:opacity-100',
                        menuTaskId === task.id && 'bg-surface-muted/60 text-ink-secondary opacity-100',
                      )}
                      aria-expanded={menuTaskId === task.id}
                      aria-haspopup="menu"
                      aria-label="Task options"
                    >
                      <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                    {menuTaskId === task.id && (
                      <div
                        className="absolute right-0 top-full z-30 mt-1 min-w-[9.5rem] rounded-xl border border-surface-border bg-surface-card py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                        role="menu"
                      >
                        <Link
                          href="/tasks"
                          role="menuitem"
                          className="block px-3 py-2 text-[12px] text-ink-secondary transition-colors hover:bg-surface-muted/60"
                          onClick={() => setMenuTaskId(null)}
                        >
                          Open in Tasks
                        </Link>
                        <button
                          type="button"
                          role="menuitem"
                          className="w-full px-3 py-2 text-left text-[12px] text-ink-secondary transition-colors hover:bg-surface-muted/60"
                          onClick={() => {
                            deleteCalendarTask(task.id)
                            setMenuTaskId(null)
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={handleAddTask}
        className={cn(
          'mt-2 flex w-full shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors',
          'text-[13px] text-ink-muted hover:bg-surface-muted/50 hover:text-ink-secondary',
        )}
      >
        <span className="select-none text-[15px] font-light leading-none text-ink-ghost">+</span>
        <span>Add task</span>
      </button>
    </div>
  )
}

// ─── Date navigator (prev · chip → mini-calendar · next) ─────────────────────

const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** Monday-first 6×7 grid of Dates (null for padding cells). */
function monthGrid(view: Date): (Date | null)[] {
  const y = view.getFullYear()
  const m = view.getMonth()
  const first = new Date(y, m, 1)
  // getDay(): 0=Sun..6=Sat → remap so Monday=0.
  const pad = (first.getDay() + 6) % 7
  const dim = new Date(y, m + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < pad; i++) cells.push(null)
  for (let d = 1; d <= dim; d++) cells.push(new Date(y, m, d))
  while (cells.length < 42) cells.push(null)
  return cells
}

function DateNavigator({
  dateKey,
  todayKey,
  headerLabel,
  fullDate,
  onStep,
  onPick,
}: {
  dateKey: string
  todayKey: string
  headerLabel: string
  fullDate: string
  onStep: (delta: number) => void
  onPick: (key: string) => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => {
    const d = parseDateKey(dateKey)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [pos, setPos] = useState({ top: 0, left: 0 })

  // Re-anchor the month view to the current dateKey whenever we open the
  // popover, so users don't get "stuck" on a faraway month from last time.
  const syncViewToDateKey = useCallback(() => {
    const d = parseDateKey(dateKey)
    setView(new Date(d.getFullYear(), d.getMonth(), 1))
  }, [dateKey])

  useLayoutEffect(() => {
    if (!open) return
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const pw = 260
    const ph = 296
    let left = Math.min(r.left + r.width / 2 - pw / 2, window.innerWidth - pw - 10)
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
    function onDocPointer(e: PointerEvent) {
      const t = e.target as Node
      if (popRef.current?.contains(t) || triggerRef.current?.contains(t)) return
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
  const selectedKey = dateKey
  const monthLabel = view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const shortDate = parseDateKey(dateKey).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  const popover = open && typeof document !== 'undefined' && (
    <div
      ref={popRef}
      data-tasks-date-popover
      className="fixed z-[100] w-[260px] rounded-xl border border-surface-border bg-surface-card p-3 shadow-[0_12px_40px_rgba(0,0,0,0.14)]"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setView((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink-primary"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <span className="min-w-0 flex-1 text-center text-[13px] font-semibold text-ink-primary">
          {monthLabel}
        </span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setView((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink-primary"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
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
          const isSel = key === selectedKey
          const isToday = key === todayKey
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                onPick(key)
                setOpen(false)
              }}
              className={cn(
                'mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-medium transition-colors',
                isSel
                  ? 'bg-brand-400 text-white shadow-sm'
                  : isToday
                    ? 'text-brand-600 ring-1 ring-brand-400/45 hover:bg-brand-400/10'
                    : 'text-ink-primary hover:bg-surface-muted',
              )}
              aria-pressed={isSel}
              aria-label={d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-surface-border pt-2">
        <button
          type="button"
          onClick={() => {
            onPick(todayKey)
            setOpen(false)
          }}
          className="text-[12px] font-medium text-brand-600 transition-colors hover:text-brand-500 hover:underline"
        >
          Today
        </button>
        <span className="text-[11px] text-ink-ghost">Esc to close</span>
      </div>
    </div>
  )

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-surface-border bg-surface-card px-0.5 py-0.5 shadow-sm">
      <button
        type="button"
        onClick={() => onStep(-1)}
        aria-label="Previous day"
        className="flex h-6 w-6 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/30"
      >
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
      </button>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          syncViewToDateKey()
          setOpen((o) => !o)
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Change date. Current: ${fullDate}`}
        title={fullDate}
        className="flex select-none flex-col items-center justify-center rounded-md px-2 py-0.5 leading-none transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/30"
      >
        <span className="text-[11px] font-semibold tracking-tight text-ink-primary">
          {headerLabel}
        </span>
        <span
          className="text-[9.5px] tabular-nums text-ink-ghost"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {shortDate}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onStep(+1)}
        aria-label="Next day"
        className="flex h-6 w-6 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/30"
      >
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
      </button>

      {popover ? createPortal(popover, document.body) : null}
    </div>
  )
}
