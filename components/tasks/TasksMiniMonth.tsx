'use client'

import { toDateKey } from '@/lib/date'
import { cn } from '@/lib/utils'

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Monday-first month grid cells (null = padding). */
export function buildMonthGridCells(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset = firstDay === 0 ? 6 : firstDay - 1
  const cells: (Date | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d, 12, 0, 0, 0))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function TasksMiniMonth({
  anchorDate,
  selectedDate,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  taskDateKeys,
}: {
  anchorDate: Date
  selectedDate: Date
  onSelectDay: (d: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  /** Dates (YYYY-MM-DD) in this month that have at least one task — for subtle markers */
  taskDateKeys: Set<string>
}) {
  const year = anchorDate.getFullYear()
  const month = anchorDate.getMonth()
  const cells = buildMonthGridCells(year, month)
  const today = new Date()
  const title = anchorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-3 shadow-control">
      <div className="flex items-center justify-between gap-2 pb-2">
        <p className="min-w-0 truncate text-[13px] font-semibold tracking-tight text-ink-primary">{title}</p>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onPrevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink-primary"
            aria-label="Previous month"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M8.5 3.5L5 7l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink-primary"
            aria-label="Next month"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M5.5 3.5L9 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={`${d}-${i}`} className="pb-1 text-center text-[9px] font-semibold tabular-nums text-ink-ghost">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((cell, i) => {
          if (!cell) {
            return <div key={`e-${i}`} className="h-9" aria-hidden />
          }
          const key = toDateKey(cell)
          const isToday = isSameDay(cell, today)
          const isSelected = isSameDay(cell, selectedDate)
          const hasTasks = taskDateKeys.has(key)

          return (
            <div key={key} className="flex h-9 flex-col items-center justify-center">
              <button
                type="button"
                onClick={() => onSelectDay(cell)}
                className={cn(
                  'relative flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-medium transition-[background-color,color,box-shadow] duration-150',
                  isSelected && 'bg-brand-400 text-white shadow-btn-primary',
                  !isSelected && isToday && 'bg-brand-50 text-brand-600 ring-1 ring-brand-400/35 dark:bg-brand-900/30 dark:text-brand-300',
                  !isSelected && !isToday && 'text-ink-primary hover:bg-surface-muted',
                )}
                aria-label={cell.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                aria-current={isSelected ? 'date' : undefined}
              >
                {cell.getDate()}
                {hasTasks && !isSelected ? (
                  <span
                    className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-400/80 dark:bg-brand-300/90"
                    aria-hidden
                  />
                ) : null}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
