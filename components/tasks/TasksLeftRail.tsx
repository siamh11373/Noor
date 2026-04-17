'use client'

import { X } from 'lucide-react'
import { parseDateKey } from '@/lib/date'
import { TasksMiniMonth } from '@/components/tasks/TasksMiniMonth'
import { TasksMonthFocusCard } from '@/components/tasks/TasksMonthFocusCard'
import { TASK_PILLAR_STYLES } from '@/lib/tasks-calendar'
import { cn } from '@/lib/utils'
import type { CalendarTask, PrayerTime } from '@/types'

export function TasksLeftRail({
  variant,
  selectedDate,
  onSelectDay,
  onMonthNavigate,
  onGoToday,
  onQuickAdd,
  calendarTasksForAnchorMonth,
  anchorMonth,
  weekRangeLabel,
  todayTasks,
  nextPrayer,
  countdownLabel,
  prayerLoading,
  monthFocusKey,
  monthFocusLabel,
  mountMonthFocus,
  onClose,
}: {
  variant: 'sidebar' | 'drawer'
  selectedDate: Date
  onSelectDay: (d: Date) => void
  onMonthNavigate: (dir: -1 | 1) => void
  onGoToday: () => void
  onQuickAdd: () => void
  /** Tasks used to paint dots on the mini month (masters in visible month) */
  calendarTasksForAnchorMonth: CalendarTask[]
  /** Month shown in mini calendar (= month of selectedDate after navigation) */
  anchorMonth: Date
  weekRangeLabel: string | null
  todayTasks: CalendarTask[]
  nextPrayer: PrayerTime | null
  countdownLabel: string | null
  prayerLoading: boolean
  monthFocusKey: string
  monthFocusLabel: string
  /** Avoid two editors: hidden desktop sidebar rail vs mobile drawer. */
  mountMonthFocus: boolean
  onClose?: () => void
}) {
  const taskDateKeys = new Set<string>()
  for (const t of calendarTasksForAnchorMonth) {
    const d = parseDateKey(t.date)
    if (d.getFullYear() === anchorMonth.getFullYear() && d.getMonth() === anchorMonth.getMonth()) {
      taskDateKeys.add(t.date)
    }
  }

  const openTasks = todayTasks.filter((t) => !t.completed).slice(0, 3)
  const openCount = todayTasks.filter((t) => !t.completed).length

  const inner = (
    <div className="flex flex-col gap-5">
      {variant === 'drawer' ? (
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <p className="text-[15px] font-semibold tracking-tight text-ink-primary">Schedule</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink-primary"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <TasksMiniMonth
        anchorDate={anchorMonth}
        selectedDate={selectedDate}
        onSelectDay={(d) => {
          onSelectDay(d)
          onClose?.()
        }}
        onPrevMonth={() => onMonthNavigate(-1)}
        onNextMonth={() => onMonthNavigate(1)}
        taskDateKeys={taskDateKeys}
      />

      {weekRangeLabel ? (
        <p className="text-center text-[11px] leading-relaxed text-ink-muted">{weekRangeLabel}</p>
      ) : null}

      <div className="flex gap-2">
        <button type="button" onClick={() => { onGoToday(); onClose?.() }} className="btn-secondary min-h-[40px] flex-1 text-[12px] font-semibold">
          Today
        </button>
        <button type="button" onClick={() => { onQuickAdd(); onClose?.() }} className="btn-primary min-h-[40px] flex-1 text-[12px] font-semibold">
          + Add
        </button>
      </div>

      <div className="rounded-xl border border-faith-border/50 bg-faith-light/60 px-3 py-3 dark:border-faith-border/30 dark:bg-faith-light/10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-faith-text/80 dark:text-faith-text/70">Next prayer</p>
        {prayerLoading ? (
          <p className="mt-2 text-[13px] text-ink-muted">Loading…</p>
        ) : nextPrayer?.time ? (
          <>
            <p className="mt-1.5 text-[16px] font-semibold tracking-tight text-ink-primary">{nextPrayer.displayName}</p>
            <p className="mt-0.5 text-[13px] text-ink-secondary">
              {nextPrayer.formattedTime}
              {countdownLabel ? <span className="text-ink-muted"> · {countdownLabel}</span> : null}
            </p>
          </>
        ) : (
          <p className="mt-2 text-[13px] text-ink-muted">Set location in settings for prayer times.</p>
        )}
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-raised/80 px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-ghost">Today</p>
        <p className="mt-1 text-[22px] font-semibold tabular-nums tracking-tight text-ink-primary">{openCount}</p>
        <p className="text-[11px] text-ink-muted">{openCount === 1 ? 'open task' : 'open tasks'}</p>
        {openTasks.length > 0 ? (
          <ul className="mt-3 space-y-2 border-t border-surface-border pt-3">
            {openTasks.map((t) => {
              const colors = TASK_PILLAR_STYLES[t.pillar]
              return (
                <li key={t.id} className="flex min-w-0 items-start gap-2">
                  <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full border-2', colors.border)} aria-hidden />
                  <span className={cn('truncate text-[12px] font-medium leading-snug', colors.text)}>{t.title}</span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-2 text-[12px] text-ink-muted">Nothing scheduled for today yet.</p>
        )}
      </div>

      {mountMonthFocus ? <TasksMonthFocusCard monthKey={monthFocusKey} monthLabel={monthFocusLabel} /> : null}
    </div>
  )

  if (variant === 'drawer') {
    return <div className="p-4 pt-3">{inner}</div>
  }

  return (
    <aside className="flex w-[272px] shrink-0 flex-col border-r border-surface-border bg-surface-raised/50 p-4 dark:bg-surface-raised/30">
      {inner}
    </aside>
  )
}
