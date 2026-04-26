'use client'

import { useEffect, useRef, useState } from 'react'
import { toDateKey } from '@/lib/date'
import { CalendarDayColumn, type WeekDragPreview } from '@/components/tasks/CalendarDayColumn'
import { HOUR_GUIDE_GRADIENT, HOUR_HEIGHT, START_HOUR, TOTAL_HOURS, formatHour } from '@/lib/tasks-calendar'
import { cn } from '@/lib/utils'
import type { CalendarTask, PrayerTime } from '@/types'

function getWeekDates(date: Date): Date[] {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d)
    dd.setDate(d.getDate() + i)
    return dd
  })
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function WeekCalendarView({
  anchorDate,
  tasks,
  prayerTimesByDate,
  focusedTaskId,
  onFocusedTaskIdChange,
  addCalendarTask,
  updateCalendarTask,
  toggleCalendarTask,
  onOpenDay,
  onTimeBlockDragSessionChange,
  onGridCreate,
}: {
  anchorDate: Date
  tasks: CalendarTask[]
  prayerTimesByDate: Record<string, PrayerTime[]>
  focusedTaskId: string | null
  onFocusedTaskIdChange: (id: string | null) => void
  addCalendarTask: (task: Omit<CalendarTask, 'id'>) => string
  updateCalendarTask: (id: string, patch: Partial<Omit<CalendarTask, 'id'>>) => void
  toggleCalendarTask: (id: string) => void
  onOpenDay: (d: Date) => void
  onTimeBlockDragSessionChange?: (active: boolean) => void
  onGridCreate?: (date: string, time: string, anchorRect: DOMRect | null) => void
}) {
  const weekDates = getWeekDates(anchorDate)
  const today = new Date()
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const scrollRef = useRef<HTMLDivElement>(null)
  /** Shared across all day columns so a task can preview on another weekday while dragging. */
  const [weekDragPreview, setWeekDragPreview] = useState<WeekDragPreview | null>(null)
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  useEffect(() => {
    if (scrollRef.current) {
      const DEFAULT_START_HOUR = 7
      const timeBasedScroll = (currentMinutes / 60 - START_HOUR - 2) * HOUR_HEIGHT
      const scrollTo = Math.max((DEFAULT_START_HOUR - START_HOUR) * HOUR_HEIGHT, timeBasedScroll)
      scrollRef.current.scrollTop = scrollTo
    }
  }, [currentMinutes])

  return (
    <div
      className="flex h-full flex-col"
    >
      <div className="flex border-b border-surface-border">
        <div className="w-14 shrink-0" />
        {weekDates.map((d, i) => {
          const dayIsToday = isSameDay(d, today)
          return (
            <div
              key={i}
              className="min-w-0 flex-1 cursor-pointer py-2.5 text-center transition-colors hover:bg-surface-muted"
              onClick={() => onOpenDay(d)}
            >
              <p className={cn('text-[11px] font-medium uppercase tracking-wide', dayIsToday ? 'text-brand-400' : 'text-ink-ghost')}>
                {dayNames[i]}
              </p>
              <div className="mt-1 flex justify-center">
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full text-[22px] font-semibold',
                    dayIsToday ? 'bg-brand-400 text-white' : 'text-ink-primary',
                  )}
                >
                  {d.getDate()}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent_0,black_16px,black_calc(100%-24px),transparent_100%)]"
      >
        <div data-week-timeline-row className="relative flex" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
          <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
            {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
              <div
                key={`hg-${i}`}
                className="absolute"
                style={{
                  left: 'calc(3.5rem - 8px)',
                  right: 0,
                  top: i * HOUR_HEIGHT,
                  transform: 'translateY(-50%)',
                  height: 1,
                  background: HOUR_GUIDE_GRADIENT,
                }}
              />
            ))}
          </div>
          <div className="relative z-[1] w-14 shrink-0 border-r border-surface-border/80">
            {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
              <div
                key={i}
                className="absolute inset-x-0 flex justify-end pr-2"
                style={{ top: i * HOUR_HEIGHT, transform: 'translateY(-50%)' }}
              >
                <span className="text-[10px] tabular-nums text-ink-ghost">{formatHour(START_HOUR + i)}</span>
              </div>
            ))}
          </div>

          {weekDates.map((d, colIdx) => {
            const dateStr = toDateKey(d)
            const colIsToday = isSameDay(d, today)
            return (
              <div
                key={colIdx}
                data-calendar-column-date={dateStr}
                className={cn(
                  'relative z-[1] min-w-0 flex-1 border-l border-surface-border',
                  colIsToday && 'bg-brand-50/30',
                )}
              >
                <CalendarDayColumn
                  variant="week"
                  scrollParentRef={scrollRef}
                  dateStr={dateStr}
                  dayDate={d}
                  tasks={tasks}
                  prayerTimes={prayerTimesByDate[dateStr] ?? []}
                  focusedTaskId={focusedTaskId}
                  onFocusedTaskIdChange={onFocusedTaskIdChange}
                  addCalendarTask={addCalendarTask}
                  updateCalendarTask={updateCalendarTask}
                  toggleCalendarTask={toggleCalendarTask}
                  weekDragPreview={weekDragPreview}
                  setWeekDragPreview={setWeekDragPreview}
                  onTimeBlockDragSessionChange={onTimeBlockDragSessionChange}
                  onGridCreate={onGridCreate}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
